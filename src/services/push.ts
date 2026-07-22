import { db } from '@/lib/firebase';
import { doc, setDoc, deleteDoc, getDoc } from 'firebase/firestore';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string;

/** Convert base64 VAPID public key to Uint8Array for the Push API */
function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const buffer = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) buffer[i] = rawData.charCodeAt(i);
  return buffer.buffer;
}

/** Stable doc ID from subscription endpoint (safe for Firestore) */
function subId(sub: PushSubscription): string {
  return btoa(sub.endpoint).replace(/[^a-zA-Z0-9]/g, '').slice(0, 40);
}

/**
 * Requests permission and subscribes the user. Stores subscription in Firestore.
 * Returns 'granted' | 'denied' | 'unsupported'
 */
export async function subscribeToPush(uid: string): Promise<'granted' | 'denied' | 'unsupported'> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return 'unsupported';

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return 'denied';

  try {
    const registration = await navigator.serviceWorker.ready;
    const sub = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });

    await setDoc(doc(db, 'push_subscriptions', `${uid}_${subId(sub)}`), {
      uid,
      subscription: JSON.parse(JSON.stringify(sub)),
      createdAt: new Date().toISOString(),
    });

    return 'granted';
  } catch (err) {
    console.error('[push] subscribe error:', err);
    return 'denied';
  }
}

/** Unsubscribes and removes the subscription from Firestore */
export async function unsubscribeFromPush(uid: string): Promise<void> {
  if (!('serviceWorker' in navigator)) return;

  const registration = await navigator.serviceWorker.ready;
  const sub = await registration.pushManager.getSubscription();
  if (!sub) return;

  await sub.unsubscribe();
  const ref = doc(db, 'push_subscriptions', `${uid}_${subId(sub)}`);
  const snap = await getDoc(ref);
  if (snap.exists()) await deleteDoc(ref);
}

/** Returns true if this browser is already subscribed for this user */
export async function isPushSubscribed(uid: string): Promise<boolean> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false;
  const registration = await navigator.serviceWorker.ready;
  const sub = await registration.pushManager.getSubscription();
  if (!sub) return false;
  const snap = await getDoc(doc(db, 'push_subscriptions', `${uid}_${subId(sub)}`));
  return snap.exists();
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
