self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'FIRE_NOTIFICATION') {
    self.registration.showNotification(event.data.title, {
      body: event.data.body,
      icon: '/icon-192.png',
      tag: event.data.tag || 'workpacker-notification',
    });
  }
});

// Push del servidor: llega aunque la app esté cerrada
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { body: event.data ? event.data.text() : '' };
  }

  event.waitUntil(
    self.registration.showNotification(data.title || 'WorkPacker', {
      body: data.body || '',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: data.tag || 'workpacker-reminder',
      renotify: true,
      requireInteraction: true,
      vibrate: [300, 100, 300, 100, 300],
      data: { url: data.url || '/' },
    })
  );
});

// Tocar la notificación abre la app (o la trae al frente si ya estaba abierta)
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) return client.focus();
      }
      return self.clients.openWindow(url);
    })
  );
});
