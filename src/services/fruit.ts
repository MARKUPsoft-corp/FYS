import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { COLLECTIONS } from '@/entities';
import type { Fruit } from '@/entities';
import { uploadFruitImage, deleteFruitImage } from './storage';

export async function getFruits(): Promise<Fruit[]> {
  const snap = await getDocs(collection(db, COLLECTIONS.FRUITS));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Fruit));
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

  await setDoc(fruitRef, {
    ...data,
    id: fruitRef.id,
    imageUrl: imageUrl ?? null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
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
    // Delete old image if it was from Storage
    if (data.imageUrl?.includes('firebasestorage')) {
      await deleteFruitImage(data.imageUrl);
    }
    imageUrl = await uploadFruitImage(id, imageFile);
  }

  await updateDoc(doc(db, COLLECTIONS.FRUITS, id), {
    ...data,
    imageUrl: imageUrl ?? null,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteFruit(id: string, imageUrl?: string): Promise<void> {
  if (imageUrl?.includes('firebasestorage')) {
    await deleteFruitImage(imageUrl);
  }
  await deleteDoc(doc(db, COLLECTIONS.FRUITS, id));
}
