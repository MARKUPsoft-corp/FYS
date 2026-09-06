import { db, app } from '@/lib/firebase';
import { doc, setDoc, deleteDoc, getDoc } from 'firebase/firestore';
import { getMessaging, getToken, deleteToken, onMessage } from 'firebase/messaging';

const DEFAULT_VAPID_PUBLIC_KEY = 'BJC-rURTAmCZx4ZMVs8OQ2BdUk7c-iGxo0cwWUcejLyGow5FpNvNbECLsfUNRcqL3v_rgQAIuMBwcrlh_ZvcPgs';
const VAPID_PUBLIC_KEY = (
  (import.meta.env.RASENGAN_VAPID_PUBLIC_KEY as string) ||
  (import.meta.env.VITE_VAPID_PUBLIC_KEY as string) ||
  DEFAULT_VAPID_PUBLIC_KEY
);

/**
 * Récupère ou enregistre le Service Worker de façon sûre
 */
export async function getOrRegisterServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !window.isSecureContext) {
    return null;
  }
  let reg = await navigator.serviceWorker.getRegistration();
  if (!reg) {
    reg = await navigator.serviceWorker.register('/firebase-messaging-sw.js', { scope: '/' });
  } else {
    // Forcer la mise à jour du Service Worker dès l'ouverture de l'application
    reg.update().catch(() => {});
  }
  await navigator.serviceWorker.ready;
  return reg;
}

/**
 * Requests permission and subscribes the user via FCM. Stores token in Firestore.
 * Returns 'granted' | 'denied' | 'unsupported'
 */
export async function subscribeToPush(uid: string): Promise<'granted' | 'denied' | 'unsupported'> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return 'unsupported';
  if (!window.isSecureContext) return 'unsupported';

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return 'denied';

  let token: string | null = null;
  try {
    const messaging = getMessaging(app);
    const swRegistration = await getOrRegisterServiceWorker();
    if (!swRegistration) throw new Error('Could not register Service Worker.');

    token = await getToken(messaging, { 
       vapidKey: VAPID_PUBLIC_KEY, 
       serviceWorkerRegistration: swRegistration 
    });
    if (!token) throw new Error('No registration token available.');

    // Enregistrer le token comme ID de document permet d'avoir plusieurs appareils pour le même utilisateur UID
    await setDoc(doc(db, 'fcm_tokens', token), {
      uid,
      token,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    return 'granted';
  } catch (err) {
    const code = (err as { code?: string })?.code;
    console.error(
      `[push] subscribe error (${code}) — opération : getToken ou écriture fcm_tokens/${token ? token : '?'} :`,
      err,
    );
    return 'denied';
  }
}

/** Unsubscribes and removes the FCM token from Firestore */
export async function unsubscribeFromPush(_uid: string): Promise<void> {
  if (!('serviceWorker' in navigator)) return;

  try {
    const messaging = getMessaging(app);
    const swRegistration = await getOrRegisterServiceWorker();
    const currentToken = await getToken(messaging, { 
      vapidKey: VAPID_PUBLIC_KEY,
      serviceWorkerRegistration: swRegistration ?? undefined,
    }).catch(() => null);
    if (currentToken) {
      await deleteDoc(doc(db, 'fcm_tokens', currentToken));
    }
    await deleteToken(messaging);
  } catch (err) {
    console.error('[push] unsubscribe error:', err);
  }
}

/** Returns true if this exact browser is already subscribed */
export async function isPushSubscribed(uid: string): Promise<boolean> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false;
  if (Notification.permission !== 'granted') return false;
  
  try {
    const messaging = getMessaging(app);
    const swRegistration = await getOrRegisterServiceWorker();
    const token = await getToken(messaging, { 
       vapidKey: VAPID_PUBLIC_KEY,
       serviceWorkerRegistration: swRegistration ?? undefined,
    });
    if (!token) return false;
    
    // Check if this specific device's token is saved in DB
    const snap = await getDoc(doc(db, 'fcm_tokens', token));
    // Verify it belongs to the current user (in case they switched accounts)
    return snap.exists() && snap.data()?.uid === uid;
  } catch {
    return false;
  }
}

/**
 * Configure la réception des notifications au PREMIER PLAN (quand l'application est ouverte sous les yeux de l'utilisateur).
 * Affiche la notification dans la barre de notifications système de l'OS ET émet un événement pour l'interface in-app.
 */
export function setupForegroundNotifications(onReceive?: (payload: any) => void): (() => void) | null {
  if (typeof window === 'undefined') return null;
  if (!('Notification' in window)) return null;

  try {
    const messaging = getMessaging(app);
    const unsubscribe = onMessage(messaging, async (payload) => {
      console.log('[push] Foreground notification received:', payload);

      const title = payload.notification?.title || payload.data?.title || 'FYS — Fresh Your Style';
      const body = payload.notification?.body || payload.data?.body || '';
      const url = payload.data?.click_action || payload.data?.url || '/';

      // 1. Déclencher l'affichage dans la barre de notifications système de l'OS
      if (Notification.permission === 'granted') {
        try {
          const swReg = await navigator.serviceWorker.getRegistration();
          const notifOptions: NotificationOptions = {
            body,
            icon: '/icons/icon-192.png',
            badge: '/icons/icon-192.png',
            tag: payload.data?.tag || `fys-fg-${Date.now()}`,
            data: { url },
          };
          if (swReg && 'showNotification' in swReg) {
            await swReg.showNotification(title, notifOptions);
          } else {
            new Notification(title, notifOptions);
          }
        } catch (e) {
          console.warn('[push] Could not show foreground system notification:', e);
        }
      }

      // 2. Émettre un événement personnalisé pour réveiller la cloche et afficher un toast visuel in-app
      window.dispatchEvent(
        new CustomEvent('fys:foreground-notification', {
          detail: { title, body, url, payload },
        })
      );

      if (onReceive) onReceive(payload);
    });

    return unsubscribe;
  } catch (err) {
    console.warn('[push] Foreground messaging not initialized:', err);
    return null;
  }
}

/**
 * Déclenche une notification push.
 * Fonctionne avec l'API Serverless Vercel /api/send-notification.
 */
export async function sendPushNotification(payload: {
  title: string;
  body: string;
  url?: string;
  targetUid?: string;
  audience?: 'all' | 'admins' | 'user';
  tag?: string;
  skipInApp?: boolean;
}): Promise<void> {
  try {
    const res = await fetch('/api/send-notification', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...payload,
        audience: payload.audience || (payload.targetUid ? 'user' : 'admins'),
      }),
    });
    if (!res.ok) {
      const errText = await res.text();
      console.warn('[push] API returned status:', res.status, errText);
    }
  } catch (err) {
    if (import.meta.env.DEV) {
      console.log('[push] Local dev note: /api/send-notification payload:', payload);
    } else {
      console.error('[push] Failed to send push:', err);
    }
  }
}
