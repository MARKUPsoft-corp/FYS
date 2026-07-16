import {
  collection, doc, getDocs, setDoc, query, where, onSnapshot,
  updateDoc, serverTimestamp, writeBatch, deleteDoc,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { AppNotification, CreateNotificationPayload } from '@/entities/notification';
import { UserRole } from '@/entities/user';

const COLLECTION_NAME = 'notifications';

export async function createNotification(payload: CreateNotificationPayload): Promise<string> {
  const ref = doc(collection(db, COLLECTION_NAME));
  const data: AppNotification = {
    ...payload,
    id: ref.id,
    isRead: false,
    createdAt: serverTimestamp() as any,
  };
  await setDoc(ref, data);
  return ref.id;
}

export async function markNotificationAsRead(id: string): Promise<void> {
  const ref = doc(db, COLLECTION_NAME, id);
  await updateDoc(ref, { isRead: true });
}

export async function markAllNotificationsAsRead(userId: string): Promise<void> {
  const q = query(
    collection(db, COLLECTION_NAME),
    where('userId', '==', userId),
    where('isRead', '==', false)
  );
  const snapshot = await getDocs(q);
  if (snapshot.empty) return;
  const batch = writeBatch(db);
  snapshot.forEach((docSnap) => {
    batch.update(docSnap.ref, { isRead: true });
  });
  await batch.commit();
}

/**
 * Notifies all users with the ADMIN role.
 */
export async function notifyAdmins(payload: Omit<CreateNotificationPayload, 'userId'>): Promise<void> {
  const usersRef = collection(db, 'users');
  const adminsQuery = query(usersRef, where('role', '==', UserRole.ADMIN));
  const adminsSnap = await getDocs(adminsQuery);
  if (adminsSnap.empty) return;

  const batch = writeBatch(db);
  adminsSnap.forEach((adminDoc) => {
    const ref = doc(collection(db, COLLECTION_NAME));
    const data: AppNotification = {
      ...payload,
      userId: adminDoc.id,
      id: ref.id,
      isRead: false,
      createdAt: serverTimestamp() as any,
    };
    batch.set(ref, data);
  });

  await batch.commit();
}

/**
 * Real-time listener for user notifications.
 * Sorts manually client-side so we don't have to require a composite index immediately.
 */
export function subscribeToNotifications(userId: string, callback: (notifications: AppNotification[]) => void) {
  const q = query(
    collection(db, COLLECTION_NAME),
    where('userId', '==', userId)
  );

  return onSnapshot(q, (snapshot) => {
    const notifications: AppNotification[] = [];
    snapshot.forEach((docSnap) => {
      notifications.push(docSnap.data() as AppNotification);
    });
    
    // Sort descending by time
    notifications.sort((a, b) => {
      const aTime = a.createdAt && (a.createdAt as any).seconds ? (a.createdAt as any).seconds : 0;
      const bTime = b.createdAt && (b.createdAt as any).seconds ? (b.createdAt as any).seconds : 0;
      return bTime - aTime;
    });

    callback(notifications);
  }, (err) => {
    console.error('Failed to subscribe to notifications:', err);
  });
}

export async function deleteNotification(id: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTION_NAME, id));
}

export async function deleteAllNotifications(userId: string): Promise<void> {
  const q = query(collection(db, COLLECTION_NAME), where('userId', '==', userId));
  const snapshot = await getDocs(q);
  if (snapshot.empty) return;
  const batch = writeBatch(db);
  snapshot.forEach((docSnap) => batch.delete(docSnap.ref));
  await batch.commit();
}
