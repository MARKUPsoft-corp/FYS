import { renderApp } from 'rasengan/client';
import App from './main';
import AppRouter from '@/app/app.router';
import { auth } from '@/lib/firebase';
import { subscribeToPush } from '@/services/push';

renderApp(App, AppRouter, { reactStrictMode: true });

// Auto-request notification permission when user is authenticated
auth.onAuthStateChanged(async (user) => {
  if (user && 'Notification' in window) {
    // Only ask if permission hasn't been decided yet
    if (Notification.permission === 'default') {
      try {
        await subscribeToPush(user.uid);
        console.log('[FYS] ✅ Push notifications enabled');
      } catch (err) {
        console.log('[FYS] User declined push notifications or browser doesn\'t support them');
      }
    } else if (Notification.permission === 'granted') {
      // User already granted permission, ensure token is registered
      await subscribeToPush(user.uid);
    }
  }
});

// Register service worker — runs after the app shell is mounted
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then((reg) => {
        // Auto-update: when a new SW is waiting, activate it immediately
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          if (!newWorker) return;
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New content is available — trigger a page reload after SW takes control
              newWorker.postMessage({ type: 'SKIP_WAITING' });
            }
          });
        });
      })
      .catch((err) => {
        // SW registration failure is non-fatal — app still works online
        console.warn('[FYS] Service Worker registration failed:', err);
      });

    // Reload the page when the new SW takes control
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!refreshing) {
        refreshing = true;
        window.location.reload();
      }
    });
  });
}
