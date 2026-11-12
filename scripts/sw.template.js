// Service worker for mithun.fyi. scripts/prerender.mjs fills in the version, base path and precache list
// on every build, so this file only describes how requests are answered.
const VERSION = '__VERSION__';
const BASE = '__BASE__';
const CACHE = `site-${VERSION}`;
const PRECACHE = [/* __PRECACHE__ */];

self.addEventListener('install', event => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then(cache => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  );
});

// A new deploy takes over at once and drops every older cache it left behind
self.addEventListener('activate', event => {
  event.waitUntil(
    caches
      .keys()
      .then(keys => Promise.all(keys.filter(key => key.startsWith('site-') && key !== CACHE).map(key => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  // Only this site, and never the live visit count
  if (url.origin !== self.location.origin || url.pathname.startsWith(`${BASE}api/`)) return;

  // Pages: the network first so a new post shows up at once; the cached copy when offline
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(response => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE).then(cache => cache.put(request, copy));
          }
          return response;
        })
        .catch(async () => (await caches.match(request, { ignoreSearch: true })) ?? (await caches.match(BASE)) ?? Response.error()),
    );
    return;
  }

  // Built files carry a content hash in their name, so a cached copy is always the right one
  if (url.pathname.startsWith(`${BASE}assets/`)) {
    event.respondWith(
      caches.match(request).then(
        cached =>
          cached ??
          fetch(request).then(response => {
            if (response.ok) {
              const copy = response.clone();
              caches.open(CACHE).then(cache => cache.put(request, copy));
            }
            return response;
          }),
      ),
    );
    return;
  }

  // Everything else (icons, images, the feed): answer from the cache when possible and refresh it behind
  event.respondWith(
    caches.match(request).then(cached => {
      const fresh = fetch(request)
        .then(response => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE).then(cache => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => cached ?? Response.error());
      return cached ?? fresh;
    }),
  );
});
