interface Fetcher {
  fetch(request: Request): Promise<Response>;
}

interface Env {
  ASSETS: Fetcher;
  VISITS: { idFromName(name: string): unknown; get(id: unknown): Fetcher };
}

interface CounterState {
  storage: { get(key: string): Promise<number | undefined>; put(key: string, value: number): Promise<void> };
}

const HOST = 'mithun.fyi';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
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

    return env.ASSETS.fetch(request);
  },
};
