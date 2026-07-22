// ── FYS Custom Service Worker — handles push events ───────────────────────────
// This file is merged with the auto-generated Workbox SW via VitePWA importScripts.

self.addEventListener('push', (event) => {
  if (!event.data) return;

  let data = { title: 'FYS', body: 'Vous avez une nouvelle notification.', url: '/' };
  try {
    data = { ...data, ...event.data.json() };
  } catch (_) {
    data.body = event.data.text();
  }

  const options = {
    body: data.body,
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    vibrate: [100, 50, 100],
    data: { url: data.url },
    actions: [{ action: 'open', title: 'Voir' }],
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url ?? '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus();
          client.navigate(url);
          return;
        }
      }
      if (clients.openWindow) return clients.openWindow(url);
    }),
  );
});
