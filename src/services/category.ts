import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { COLLECTIONS } from '@/entities';
import type { Category } from '@/entities';

export async function getCategories(): Promise<Category[]> {
  const snap = await getDocs(collection(db, COLLECTIONS.CATEGORIES));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Category));
}

export async function createCategory(name: string): Promise<string> {
  const ref = await addDoc(collection(db, COLLECTIONS.CATEGORIES), {
    name,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateCategory(id: string, name: string): Promise<void> {
  await updateDoc(doc(db, COLLECTIONS.CATEGORIES, id), { name });
}

export async function deleteCategory(id: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTIONS.CATEGORIES, id));
}
