importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyAFlnin3lIQQO98GUnsmI0eKvtCZDKzcKQ",
  authDomain: "mes-controles-techniques.firebaseapp.com",
  projectId: "mes-controles-techniques",
  storageBucket: "mes-controles-techniques.firebasestorage.app",
  messagingSenderId: "276327665680",
  appId: "1:276327665680:web:6c50fd94c04f6ef27ffa95"
});

const messaging = firebase.messaging();
const CACHE = 'ct-app-v3';

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
  if (new URL(event.request.url).origin !== self.location.origin) return;

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
    } catch (err) {
      const cached = await cache.match(event.request);
      if (cached) return cached;
      return Response.error();
    }
  })());
});

messaging.onBackgroundMessage(payload => {
  if (payload.notification) return;

  const data = payload.data || {};

  return self.registration.showNotification(
    data.title || 'Mes Contrôles Techniques',
    {
      body: data.body || 'Une échéance approche.',
      tag: data.tag || 'controle-technique',
      data: {
        url: 'https://brebant-forage.github.io/mes-controles-techniques/'
      }
    }
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    self.clients.openWindow(
      'https://brebant-forage.github.io/mes-controles-techniques/'
    )
  );
});
