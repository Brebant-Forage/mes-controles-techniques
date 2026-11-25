
const CACHE = 'ct-app-firebase-v3';
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE)
          .map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (
    e.request.method === 'GET' &&
    new URL(e.request.url).origin === self.location.origin
  ) {
    e.respondWith(
      fetch(e.request)
        .catch(() => caches.match(e.request))
    );
  }
});

self.addEventListener('push', e => {
  let payload = {};

  try {
    payload = e.data ? e.data.json() : {};
  } catch {
    payload = {};
  }

  const data = payload.data || payload.notification || payload;

  e.waitUntil(
    self.registration.showNotification(
      data.title || 'Mes Contrôles Techniques',
      {
        body: data.body || 'Nouvelle notification',
        icon: './icon-192.png',
        badge: './icon-192.png',
        tag: data.tag || 'controle-technique',
        data: {
          url: self.registration.scope
        }
      }
    )
  );
});

self.addEventListener('notificationclick', e => {
  e.notification.close();

  e.waitUntil(
    self.clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    }).then(async clients => {
      for (const client of clients) {
        if (
          client.url.startsWith(self.registration.scope) &&
          'focus' in client
        ) {
          return client.focus();
        }
      }

      return self.clients.openWindow(
        self.registration.scope
      );
    })
  );
});
