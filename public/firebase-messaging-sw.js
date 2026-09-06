importScripts("https://www.gstatic.com/firebasejs/10.12.3/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.3/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyDL48P3q7u82VBpygipAodSJAJ6DF4I6TE",
  authDomain: "fys-app-ee4dc.firebaseapp.com",
  projectId: "fys-app-ee4dc",
  storageBucket: "fys-app-ee4dc.firebasestorage.app",
  messagingSenderId: "557846880524",
  appId: "1:557846880524:web:1419be80dfe30964eae929",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Background message received:', payload);

  const title = payload.notification?.title || payload.data?.title || 'FYS — Fresh Your Style';
  const body = payload.notification?.body || payload.data?.body || '';
  const url = payload.data?.click_action || payload.data?.url || payload.fcmOptions?.link || '/';

  // Si le SDK Firebase ne l'a pas déjà affiché automatiquement via le payload notification,
  // ou pour garantir un affichage riche et cohérent dans la barre de notifications de l'OS :
  const notificationOptions = {
    body,
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    vibrate: [200, 100, 200],
    tag: payload.data?.tag || `fys-notif-${Date.now()}`,
    renotify: true,
    data: {
      url,
      timestamp: Date.now(),
    },
    actions: [
      { action: 'open', title: 'Voir' }
    ]
  };

  // Only display manually if notification wasn't auto-handled by SDK
  if (!payload.notification) {
    return self.registration.showNotification(title, notificationOptions);
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Si une fenêtre de l'application est déjà ouverte, lui donner le focus et naviguer
      for (const client of windowClients) {
        if ('focus' in client) {
          if (client.url && 'navigate' in client) {
            client.navigate(targetUrl);
          }
          return client.focus();
        }
      }
      // Sinon, ouvrir une nouvelle fenêtre
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
