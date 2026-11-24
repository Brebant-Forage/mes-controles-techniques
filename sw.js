const CACHE = 'ct-app-v2';

self.addEventListener('install', event => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys.filter(key =>
        key.startsWith('ct-app-') && key !== CACHE
      ).map(key => caches.delete(key))
    );
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  if (new URL(event.request.url).origin !==
      self.location.origin) return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    try {
      const response = await fetch(event.request, {
        cache: 'no-store'
      });
      if (response.ok) {
        await cache.put(event.request, response.clone());
      }
      return response;
    } catch {
      return await cache.match(event.request)
        || Response.error();
    }
  })());
});
