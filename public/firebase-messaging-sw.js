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

// Forcer la prise de contrôle immédiate du Service Worker sans attendre la fermeture de tous les onglets
self.addEventListener('install', () => {
  console.log('[firebase-messaging-sw.js] Service Worker installed');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[firebase-messaging-sw.js] Service Worker activated');
  event.waitUntil(self.clients.claim());
});

// ── Affichage de la notification en arrière-plan (App fermée ou onglet inactif) ──
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Background message received:', payload);

  // Si le message contient déjà un bloc 'notification', le SDK Firebase WebPush
  // l'affiche déjà automatiquement dans l'OS. Ré-appeler showNotification créerait un doublon.
  if (payload.notification) {
    console.log('[firebase-messaging-sw.js] Notification payload automatically displayed by FCM SDK');
    return;
  }

  const title =
    payload.webpush?.notification?.title ||
    payload.data?.title ||
    'FYS — Fresh Your Style';

  const body =
    payload.webpush?.notification?.body ||
    payload.data?.body ||
    '';

  const url =
    payload.data?.click_action ||
    payload.data?.url ||
    payload.fcmOptions?.link ||
    '/';

  const tag = payload.data?.tag || payload.webpush?.notification?.tag || `fys-${Date.now()}`;

  const notificationOptions = {
    body,
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    vibrate: [200, 100, 200],
    tag,
    renotify: false,
    requireInteraction: true,
    data: {
      url,
      timestamp: Date.now(),
    },
    actions: [
      { action: 'open', title: 'Voir' }
    ]
  };

  return self.registration.showNotification(title, notificationOptions);
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
