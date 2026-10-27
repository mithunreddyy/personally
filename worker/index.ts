interface Env {
  ASSETS: { fetch(request: Request): Promise<Response> };
}

const HOST = 'mithun.fyi';

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // One address for the site: www and anything else land on the bare domain
    if (url.hostname === `www.${HOST}`) {
      url.hostname = HOST;
      return Response.redirect(url.toString(), 301);
    }

    return env.ASSETS.fetch(request);
  },
};
