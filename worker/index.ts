interface Fetcher {
  fetch(request: Request): Promise<Response>;
}

interface Namespace {
  idFromName(name: string): unknown;
  get(id: unknown): Fetcher;
}

interface Env {
  ASSETS: Fetcher;
  VISITS: Namespace;
}

interface CounterState {
  storage: { get<T>(key: string): Promise<T | undefined>; put(key: string, value: unknown): Promise<void> };
}

/** Where a visit came from, as Cloudflare reports it: a city and a two-letter country code, never the address */
interface Place {
  city?: string;
  country?: string;
}

// The Workers runtime pieces this file uses, declared here so the project needs no extra type package
declare const caches: { default: { match(key: Request): Promise<Response | undefined>; put(key: Request, res: Response): Promise<void> } };

const HOST = 'mithun.fyi';

const json = (body: unknown, status = 200, cache = 'no-store') =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': cache },
  });

const PLACE_HEADER = 'x-visit-place';

/** The visitor's city and country from Cloudflare's request data, trimmed so nothing odd gets stored */
function visitPlace(request: Request): Place | null {
  const cf = (request as Request & { cf?: { city?: unknown; country?: unknown } }).cf;
  const city = typeof cf?.city === 'string' ? cf.city.trim().slice(0, 60) : '';
  // XX is "unknown" and T1 is Tor: neither names a place
  const country = typeof cf?.country === 'string' && /^[A-Z]{2}$/.test(cf.country) && !['XX', 'T1'].includes(cf.country) ? cf.country : '';
  if (!city && !country) return null;
  return { ...(city && { city }), ...(country && { country }) };
}

/**
 * One counter for the whole site; a Durable Object handles one request at a time, so no visit is lost.
 * It also keeps where the latest counted visit came from (city and country only). A new visit is told
 * where the one before it came from, then becomes the one the next visitor hears about
 */
export class VisitCounter {
  constructor(private state: CounterState) {}

  async fetch(request: Request): Promise<Response> {
    let total = (await this.state.storage.get<number>('total')) ?? 0;
    const last = (await this.state.storage.get<Place>('last')) ?? null;
    if (request.method === 'POST') {
      total += 1;
      await this.state.storage.put('total', total);
      const header = request.headers.get(PLACE_HEADER);
      if (header) await this.state.storage.put('last', JSON.parse(header) as Place);
    }
    return json({ total, last });
  }
}

// Hyderabad, the same place the walker's sky keeps time for
const WEATHER_URL =
  'https://api.open-meteo.com/v1/forecast?latitude=17.385&longitude=78.4867&timezone=Asia%2FKolkata&current=temperature_2m,weather_code,is_day,wind_speed_10m';
const WEATHER_TTL = 30 * 60;

/** WMO weather codes, folded into the few kinds the walker draws */
function weatherKind(code: number): string {
  if (code <= 1) return 'clear';
  if (code <= 3) return 'clouds';
  if (code === 45 || code === 48) return 'fog';
  if (code >= 51 && code <= 57) return 'drizzle';
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) return 'rain';
  if (code >= 95) return 'storm';
  return 'clouds';
}

/** Current Hyderabad weather from Open-Meteo, shared by every visitor through the edge cache for half an hour */
async function weather(): Promise<Response> {
  const key = new Request('https://mithun.fyi/api/weather/v1');
  const hit = await caches.default.match(key);
  if (hit) return hit;
  try {
    const upstream = await fetch(WEATHER_URL);
    if (!upstream.ok) throw new Error(String(upstream.status));
    const data = (await upstream.json()) as { current?: { temperature_2m?: number; weather_code?: number; wind_speed_10m?: number } };
    const now = data.current;
    if (!now || typeof now.weather_code !== 'number' || typeof now.temperature_2m !== 'number') throw new Error('shape');
    const res = json(
      { kind: weatherKind(now.weather_code), temp: Math.round(now.temperature_2m), wind: Math.round(now.wind_speed_10m ?? 0) },
      200,
      `public, max-age=${WEATHER_TTL}`,
    );
    await caches.default.put(key, res.clone());
    return res;
  } catch {
    // No weather is better than wrong weather: the walker just goes without
    return json({ error: 'weather unavailable' }, 503);
  }
}

const GITHUB_USER = 'mithunreddyy';
const GITHUB_URL = `https://api.github.com/users/${GITHUB_USER}/repos?per_page=100&type=owner&sort=pushed`;
const GITHUB_TTL = 30 * 60;
// GitHub allows 60 unsigned requests an hour per address, and Cloudflare shares addresses, so a refused
// refresh falls back to the last good list for up to a week
const GITHUB_STALE_TTL = 7 * 24 * 60 * 60;

/** When each of the site owner's own public repos was last pushed to, keyed by lowercase repo name */
async function repos(): Promise<Response> {
  const fresh = new Request('https://mithun.fyi/api/github/v1');
  const stale = new Request('https://mithun.fyi/api/github/v1-stale');
  const hit = await caches.default.match(fresh);
  if (hit) return hit;
  try {
    const upstream = await fetch(GITHUB_URL, { headers: { 'user-agent': HOST, accept: 'application/vnd.github+json' } });
    if (!upstream.ok) throw new Error(String(upstream.status));
    const list = (await upstream.json()) as { name?: unknown; pushed_at?: unknown; fork?: unknown }[];
    if (!Array.isArray(list)) throw new Error('shape');
    const pushed: Record<string, string> = {};
    for (const repo of list) {
      if (repo.fork === true || typeof repo.name !== 'string' || typeof repo.pushed_at !== 'string') continue;
      pushed[repo.name.toLowerCase()] = repo.pushed_at;
    }
    const res = json({ pushed }, 200, `public, max-age=${GITHUB_TTL}`);
    await Promise.all([
      caches.default.put(fresh, res.clone()),
      caches.default.put(stale, json({ pushed }, 200, `public, max-age=${GITHUB_STALE_TTL}`)),
    ]);
    return res;
  } catch {
    const old = await caches.default.match(stale);
    if (old) return json(await old.json(), 200, 'public, max-age=300');
    // Nothing to show: the project rows keep their months
    return json({ error: 'github unavailable' }, 503);
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // One address for the site: www and anything else land on the bare domain
    if (url.hostname === `www.${HOST}`) {
      url.hostname = HOST;
      return Response.redirect(url.toString(), 301);
    }

    if (url.pathname === '/api/visits') {
      if (request.method !== 'GET' && request.method !== 'POST') return json({ error: 'method not allowed' }, 405);
      // Only the site itself may count a visit, so other pages can't inflate the total from a browser
      if (request.method === 'POST' && request.headers.get('origin') !== `https://${HOST}`) {
        return json({ error: 'forbidden' }, 403);
      }
      // The place travels as a header the worker sets itself; one sent by a browser is dropped first
      const headers = new Headers(request.headers);
      headers.delete(PLACE_HEADER);
      const place = request.method === 'POST' ? visitPlace(request) : null;
      if (place) headers.set(PLACE_HEADER, JSON.stringify(place));
      const counter = env.VISITS.get(env.VISITS.idFromName('site'));
      return counter.fetch(new Request(request.url, { method: request.method, headers }));
    }

    if (url.pathname === '/api/github') {
      if (request.method !== 'GET') return json({ error: 'method not allowed' }, 405);
      return repos();
    }

    if (url.pathname === '/api/weather') {
      if (request.method !== 'GET') return json({ error: 'method not allowed' }, 405);
      return weather();
    }

    return env.ASSETS.fetch(request);
  },
};
