const CACHE_NAME = 'heycoach-v1';

// Add all static assets to cache
const urlsToCache = [
  '/',
  '/offline',
  '/icon-192x192.png',
  '/icon-512x512.png',
  '/manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// Network first, falling back to cache
self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request)
      .catch(() => {
        return caches.match(event.request) || caches.match('/offline');
      })
  );
});

// Push notification handling
self.addEventListener('push', (event) => {
  const data = event.data.json();
  const options = {
    body: data.body,
    icon: '/icon-192x192.png',
    badge: '/icon-192x192.png',
    data: data.url,
    actions: data.actions || [],
    vibrate: [200, 100, 200]
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Notification click handling
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  if (event.action) {
    // Handle action button clicks
    const actionUrl = event.action;
    event.waitUntil(clients.openWindow(actionUrl));
  } else {
    // Handle notification click
    event.waitUntil(
      clients.matchAll({ type: 'window' })
        .then((clientList) => {
          const hadWindowToFocus = clientList.some((client) => {
            if (client.url === event.notification.data) {
              return client.focus();
            }
            return false;
          });

          if (!hadWindowToFocus) {
            clients.openWindow(event.notification.data || '/');
          }
        })
    );
  }
});
