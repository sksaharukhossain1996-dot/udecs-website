/* UDECS PWA service worker - network-first pages, cache-first static assets.
   Version bump forces old caches out on next deploy. */
const CACHE = 'udecs-order-cutover-v2';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // never touch Firebase/API traffic

  if (request.mode === 'navigate') {
    event.respondWith(fetch(new Request(request, {cache: 'no-store'})).catch(() => new Response('You are offline. Reconnect before using checkout or viewing saved orders.', {status: 503, headers: {'Content-Type': 'text/plain'}})));
    return;
  }

  if (/\/(assets|icons)\//.test(url.pathname)) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((resp) => {
            if (resp.ok) {
              const clone = resp.clone();
              caches.open(CACHE).then((cache) => cache.put(request, clone));
            }
            return resp;
          })
      )
    );
  }
});
