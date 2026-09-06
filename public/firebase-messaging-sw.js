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

  const title =
    payload.notification?.title ||
    payload.webpush?.notification?.title ||
    payload.data?.title ||
    'FYS — Fresh Your Style';

  const body =
    payload.notification?.body ||
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
    renotify: true,
    requireInteraction: true,
    data: {
      url,
      timestamp: Date.now(),
    },
    actions: [
      { action: 'open', title: 'Voir' }
    ]
  };

  // TOUJOURS afficher la notification système dans l'OS quand l'app est fermée
  return self.registration.showNotification(title, notificationOptions);
});

// ── Écouteur natif de secours (garantit la réception même si le SDK Firebase n'a pas intercepté) ──
self.addEventListener('push', (event) => {
  console.log('[firebase-messaging-sw.js] Native push event received:', event);

  let rawData = null;
  try {
    rawData = event.data ? event.data.json() : null;
  } catch (e) {
    try {
      rawData = { data: { title: event.data.text() } };
    } catch {}
  }

  if (rawData) {
    const title =
      rawData.notification?.title ||
      rawData.data?.title ||
      'FYS — Fresh Your Style';

    const body =
      rawData.notification?.body ||
      rawData.data?.body ||
      '';

    const url =
      rawData.data?.click_action ||
      rawData.data?.url ||
      rawData.fcmOptions?.link ||
      '/';

    const tag = rawData.data?.tag || `fys-${Date.now()}`;

    event.waitUntil(
      self.registration.showNotification(title, {
        body,
        icon: '/icons/icon-192.png',
        badge: '/icons/icon-192.png',
        vibrate: [200, 100, 200],
        tag,
        renotify: true,
        requireInteraction: true,
        data: {
          url,
          timestamp: Date.now(),
        },
        actions: [
          { action: 'open', title: 'Voir' }
        ]
      })
    );
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
