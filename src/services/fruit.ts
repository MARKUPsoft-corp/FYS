import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { COLLECTIONS } from '@/entities';
import type { Fruit } from '@/entities';
import { isUsableAsMainFruit, isUsableAsSupplement } from '@/entities';
import { uploadFruitImage, deleteFruitImage, isManagedImageUrl } from './storage';
import { sendPushNotification } from './push';
import i18n from '@/i18n';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function stripUndefined(obj: any): any {
  if (Array.isArray(obj)) return obj.map(stripUndefined);
  if (obj !== null && typeof obj === 'object') {
    return Object.fromEntries(
      Object.entries(obj)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => [k, stripUndefined(v)]),
    );
  }
  return obj;
}

export async function getFruits(): Promise<Fruit[]> {
  const snap = await getDocs(collection(db, COLLECTIONS.FRUITS));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Fruit));
}

/** Écoute en temps réel le catalogue fruits (Firestore onSnapshot). */
export function subscribeToFruits(onData: (fruits: Fruit[]) => void): () => void {
  return onSnapshot(collection(db, COLLECTIONS.FRUITS), (snap) => {
    onData(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Fruit)));
  });
}

export async function getMainFruits(): Promise<Fruit[]> {
  const all = await getFruits();
  return all.filter(isUsableAsMainFruit);
}

export async function getSupplementFruits(): Promise<Fruit[]> {
  const all = await getFruits();
  return all.filter(isUsableAsSupplement);
}

export async function getFruitById(id: string): Promise<Fruit | null> {
  const snap = await getDoc(doc(db, COLLECTIONS.FRUITS, id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Fruit;
}

export async function createFruit(
  data: Omit<Fruit, 'id' | 'createdAt' | 'updatedAt'>,
  imageFile?: File,
): Promise<string> {
  const fruitRef = doc(collection(db, COLLECTIONS.FRUITS));

  let imageUrl = data.imageUrl;
  if (imageFile) {
    imageUrl = await uploadFruitImage(fruitRef.id, imageFile);
  }

  await setDoc(fruitRef, stripUndefined({
    ...data,
    id: fruitRef.id,
    imageUrl: imageUrl ?? null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }));

  sendPushNotification({
    title: i18n.t('notifications.newFruit'),
    body: i18n.t('notifications.fruitAddedBody', { name: data.name }),
    url: '/board/catalogue',
  });

  return fruitRef.id;
}

export async function updateFruit(
  id: string,
  data: Partial<Omit<Fruit, 'id' | 'createdAt' | 'updatedAt'>>,
  imageFile?: File,
): Promise<void> {
  let imageUrl = data.imageUrl;

  if (imageFile) {
    if (isManagedImageUrl(data.imageUrl)) {
      await deleteFruitImage(data.imageUrl!);
    }
    imageUrl = await uploadFruitImage(id, imageFile);
  }

  const payload: Record<string, unknown> = {
    ...data,
    updatedAt: serverTimestamp(),
  };

  // N'écrire imageUrl que si elle est explicitement fournie : un update
  // partiel (ex: toggle Disponibilité) ne doit pas écraser l'image existante.
  if (imageFile || typeof data.imageUrl === 'string' || data.imageUrl === null) {
    payload.imageUrl = imageUrl ?? null;
  }

  await updateDoc(doc(db, COLLECTIONS.FRUITS, id), stripUndefined(payload));
}

export async function deleteFruit(id: string, imageUrl?: string): Promise<void> {
  const snap = await getDoc(doc(db, COLLECTIONS.FRUITS, id));
  let fruitName = i18n.t('fruit.fallbackName');
  if (snap.exists()) fruitName = snap.data().name;

  if (isManagedImageUrl(imageUrl)) {
    await deleteFruitImage(imageUrl!);
  }
  await deleteDoc(doc(db, COLLECTIONS.FRUITS, id));

  sendPushNotification({
    title: i18n.t('notifications.fruitUpdate'),
    body: i18n.t('notifications.fruitRemovedBody', { name: fruitName }),
    url: '/board/catalogue',
  });
}
