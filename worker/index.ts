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
  PRESENCE: Namespace;
}

interface CounterState {
  storage: { get(key: string): Promise<number | undefined>; put(key: string, value: number): Promise<void> };
}

// The Workers runtime pieces this file uses, declared here so the project needs no extra type package
interface WorkerSocket {
  send(message: string): void;
  close(code?: number, reason?: string): void;
  serializeAttachment(value: unknown): void;
  deserializeAttachment(): unknown;
}
interface PresenceState {
  acceptWebSocket(socket: WorkerSocket): void;
  getWebSockets(): WorkerSocket[];
  setWebSocketAutoResponse(pair: unknown): void;
  getWebSocketAutoResponseTimestamp(socket: WorkerSocket): Date | null;
  storage: { getAlarm(): Promise<number | null>; setAlarm(at: number): Promise<void> };
}
declare const WebSocketPair: { new (): { 0: WorkerSocket; 1: WorkerSocket } };
declare const WebSocketRequestResponsePair: { new (request: string, response: string): unknown };
declare const caches: { default: { match(key: Request): Promise<Response | undefined>; put(key: Request, res: Response): Promise<void> } };

const HOST = 'mithun.fyi';

/** Whether a request comes from a page on this same site (wrangler dev rewrites both to the route's host) */
function sameSite(request: Request, url: URL) {
  try {
    return new URL(request.headers.get('origin') ?? '').host === url.host;
  } catch {
    return false;
  }
}

const json = (body: unknown, status = 200, cache = 'no-store') =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': cache },
  });

/** One counter for the whole site; a Durable Object handles one request at a time, so no visit is lost */
export class VisitCounter {
  constructor(private state: CounterState) {}

  async fetch(request: Request): Promise<Response> {
    let total = (await this.state.storage.get('total')) ?? 0;
    if (request.method === 'POST') {
      total += 1;
      await this.state.storage.put('total', total);
    }
    return json({ total });
  }
}

// Enough company for the path, and a ceiling so a flood of sockets can't run up the bill
const MAX_PRESENT = 200;
// Pages ping every 25 seconds; one silent for 70 has gone (a crashed tab sends no goodbye)
const SWEEP_MS = 30_000;
const SILENT_MS = 70_000;

/**
 * Who is on the home page right now. Each open page holds a WebSocket; on every join and leave the
 * object tells everyone the new count. It stores nothing and reads nothing the pages send. Hibernatable
 * sockets mean an idle room costs nothing between joins and leaves
 */
export class Presence {
  constructor(private ctx: PresenceState) {
    // Answered by the runtime itself, so a ping never wakes the object
    this.ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair('ping', 'pong'));
  }

  /** Tells everyone the count. Sockets on their way out still appear in the list, so they're left out */
  private broadcast(leaving: WorkerSocket[] = []) {
    const sockets = this.ctx.getWebSockets().filter(socket => !leaving.includes(socket));
    const message = JSON.stringify({ here: sockets.length });
    for (const socket of sockets) {
      try {
        socket.send(message);
      } catch {
        // A socket mid-close; the close handler will recount
      }
    }
  }

  async fetch(request: Request): Promise<Response> {
    if (request.headers.get('upgrade') !== 'websocket') return json({ error: 'expected a websocket' }, 426);
    if (this.ctx.getWebSockets().length >= MAX_PRESENT) return json({ error: 'full' }, 503);
    const pair = new WebSocketPair();
    this.ctx.acceptWebSocket(pair[1]);
    pair[1].serializeAttachment({ at: Date.now() });
    if ((await this.ctx.storage.getAlarm()) === null) await this.ctx.storage.setAlarm(Date.now() + SWEEP_MS);
    this.broadcast();
    return new Response(null, { status: 101, webSocket: pair[0] } as ResponseInit);
  }

  // Pages never need to say anything; whatever they send is ignored
  async webSocketMessage() {}

  async webSocketClose(socket: WorkerSocket) {
    try {
      socket.close(1000, 'bye');
    } catch {
      // Already closed
    }
    this.broadcast([socket]);
  }

  async webSocketError(socket: WorkerSocket) {
    this.broadcast([socket]);
  }

  /** Every 30 seconds while anyone is here: let go of pages that have stopped pinging */
  async alarm() {
    const now = Date.now();
    const dropped: WorkerSocket[] = [];
    for (const socket of this.ctx.getWebSockets()) {
      const pinged = this.ctx.getWebSocketAutoResponseTimestamp(socket)?.getTime();
      const joined = (socket.deserializeAttachment() as { at?: number } | null)?.at ?? now;
      if (now - (pinged ?? joined) > SILENT_MS) {
        try {
          socket.close(1001, 'gone quiet');
        } catch {
          // Already gone
        }
        dropped.push(socket);
      }
    }
    if (dropped.length) this.broadcast(dropped);
    if (this.ctx.getWebSockets().length > dropped.length) await this.ctx.storage.setAlarm(now + SWEEP_MS);
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
      const counter = env.VISITS.get(env.VISITS.idFromName('site'));
      return counter.fetch(request);
    }

    if (url.pathname === '/api/weather') {
      if (request.method !== 'GET') return json({ error: 'method not allowed' }, 405);
      return weather();
    }

    if (url.pathname === '/api/presence') {
      // Only the site's own pages may join, so the count can't be inflated from elsewhere
      if (!sameSite(request, url)) return json({ error: 'forbidden' }, 403);
      return env.PRESENCE.get(env.PRESENCE.idFromName('home')).fetch(request);
    }

    return env.ASSETS.fetch(request);
  },
};
