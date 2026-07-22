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

  const title = payload.notification?.title ?? payload.data?.title ?? 'FYS';
  const body  = payload.notification?.body  ?? payload.data?.body  ?? '';
  const url   = payload.data?.click_action ?? '/';

  self.registration.showNotification(title, {
    body,
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    data: { url },
  });
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url ?? '/';
  event.waitUntil(clients.openWindow(url));
});
