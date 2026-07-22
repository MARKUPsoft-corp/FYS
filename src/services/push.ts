import { db, app } from '@/lib/firebase';
import { doc, setDoc, deleteDoc, getDoc } from 'firebase/firestore';
import { getMessaging, getToken, deleteToken } from 'firebase/messaging';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string;

/**
 * Requests permission and subscribes the user via FCM. Stores token in Firestore.
 * Returns 'granted' | 'denied' | 'unsupported'
 */
export async function subscribeToPush(uid: string): Promise<'granted' | 'denied' | 'unsupported'> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return 'unsupported';

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return 'denied';

  try {
    const messaging = getMessaging(app);
    let swRegistration = await navigator.serviceWorker.getRegistration();
    if (!swRegistration) {
      swRegistration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
    }
    const token = await getToken(messaging, { 
       vapidKey: VAPID_PUBLIC_KEY, 
       serviceWorkerRegistration: swRegistration 
    });
    if (!token) throw new Error('No registration token available.');

    // Enregistrer le token comme ID de document permet d'avoir plusieurs appareils pour le même utilisateur UID
    await setDoc(doc(db, 'fcm_tokens', token), {
      uid,
      token,
      createdAt: new Date().toISOString(),
    });

    return 'granted';
  } catch (err) {
    console.error('[push] subscribe error:', err);
    return 'denied';
  }
}

/** Unsubscribes and removes the FCM token from Firestore */
export async function unsubscribeFromPush(uid: string): Promise<void> {
  if (!('serviceWorker' in navigator)) return;

  try {
    const messaging = getMessaging(app);
    let swRegistration = await navigator.serviceWorker.getRegistration();
    if (!swRegistration) {
      swRegistration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
    }
    const currentToken = await getToken(messaging, { 
      vapidKey: VAPID_PUBLIC_KEY,
      serviceWorkerRegistration: swRegistration
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
    let swRegistration = await navigator.serviceWorker.getRegistration();
    if (!swRegistration) {
      swRegistration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
    }
    const token = await getToken(messaging, { 
       vapidKey: VAPID_PUBLIC_KEY,
       serviceWorkerRegistration: swRegistration
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
 * Programmatically triggers a push notification to a specific user or all users.
 * Requires VITE_NOTIFY_SECRET to be configured (admin privilege).
 */
export async function sendPushNotification(payload: {
  title: string;
  body: string;
  url?: string;
  targetUid?: string;
}): Promise<void> {
  const secret = import.meta.env.VITE_NOTIFY_SECRET;
  if (!secret) return; // Silent return if not configured
  
  try {
    await fetch('/api/send-notification', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret, ...payload }),
    });
  } catch (err) {
    console.error('[push] Failed to send automatic push:', err);
  }
}
