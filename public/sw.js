/* UDECS PWA service worker - network-first pages, cache-first static assets.
   Version bump forces old caches out on next deploy. */
const CACHE = 'udecs-v1';

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
    event.respondWith(fetch(request).catch(() => caches.match(request).then((r) => r || caches.match('/'))));
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
