import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  query,
  where,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { COLLECTIONS, CocktailType } from '@/entities';
import type { Cocktail, AIAnalysis } from '@/entities';
import { uploadCocktailImage, deleteCocktailImage, isManagedImageUrl } from './storage';
import { notifyAdmins } from '@/services/notifications';

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

export async function getCocktailById(id: string): Promise<Cocktail | null> {
  const snap = await getDoc(doc(db, COLLECTIONS.COCKTAILS, id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Cocktail;
}

export async function getCocktails(): Promise<Cocktail[]> {
  const snap = await getDocs(collection(db, COLLECTIONS.COCKTAILS));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Cocktail));
}

export async function getPublicCocktails(): Promise<Cocktail[]> {
  const q = query(
    collection(db, COLLECTIONS.COCKTAILS),
    where('isActive', '==', true),
    where('isPublic', '==', true),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Cocktail));
}

export async function createCocktail(
  data: Omit<Cocktail, 'id' | 'createdAt' | 'updatedAt'>,
  imageFile?: File,
): Promise<string> {
  const ref = doc(collection(db, COLLECTIONS.COCKTAILS));

  let imageUrl = data.imageUrl;
  if (imageFile) {
    imageUrl = await uploadCocktailImage(ref.id, imageFile);
  }

  await setDoc(ref, stripUndefined({
    ...data,
    id: ref.id,
    imageUrl: imageUrl ?? null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }));

  return ref.id;
}

export async function updateCocktail(
  id: string,
  data: Partial<Omit<Cocktail, 'id' | 'createdAt' | 'updatedAt'>>,
  imageFile?: File,
): Promise<void> {
  let imageUrl = data.imageUrl;

  if (imageFile) {
    if (isManagedImageUrl(data.imageUrl)) {
      await deleteCocktailImage(data.imageUrl!);
    }
    imageUrl = await uploadCocktailImage(id, imageFile);
  }

  await updateDoc(doc(db, COLLECTIONS.COCKTAILS, id), stripUndefined({
    ...data,
    imageUrl: imageUrl ?? null,
    updatedAt: serverTimestamp(),
  }));
}

export async function toggleCocktailActive(id: string, isActive: boolean): Promise<void> {
  await updateDoc(doc(db, COLLECTIONS.COCKTAILS, id), {
    isActive,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteCocktail(id: string, imageUrl?: string): Promise<void> {
  if (isManagedImageUrl(imageUrl)) {
    await deleteCocktailImage(imageUrl!);
  }
  await deleteDoc(doc(db, COLLECTIONS.COCKTAILS, id));
}

export async function getUserCocktails(uid: string): Promise<Cocktail[]> {
  const q = query(
    collection(db, COLLECTIONS.COCKTAILS),
    where('createdBy', '==', uid),
    where('type', '==', CocktailType.CUSTOM),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Cocktail));
}

export async function toggleCocktailPublic(id: string, isPublic: boolean): Promise<void> {
  const cocktailRef = doc(db, COLLECTIONS.COCKTAILS, id);
  await updateDoc(cocktailRef, {
    isPublic,
    updatedAt: serverTimestamp(),
  });

  if (isPublic) {
    const snap = await getDoc(cocktailRef);
    if (snap.exists()) {
      const cocktail = snap.data() as Cocktail;
      notifyAdmins({
        title: 'Nouveau cocktail rendu public 🍹',
        message: `La recette « ${cocktail.name} » a été partagée dans le catalogue.`,
        link: '/board/cocktails',
      }).catch(console.error);
    }
  }
}

export async function cloneCocktailFromCatalogue(
  source: Cocktail,
  userId: string,
  aiAnalysis?: AIAnalysis,
): Promise<Cocktail> {
  const ref = doc(collection(db, COLLECTIONS.COCKTAILS));
  const now = Timestamp.now();
  const cloned: Cocktail = {
    id: ref.id,
    name: source.name,
    description: source.description,
    imageUrl: source.imageUrl,
    tag: source.tag,
    type: CocktailType.CUSTOM,
    createdBy: userId,
    isActive: true,
    isPublic: false,
    ingredients: source.ingredients,
    basePrice: source.basePrice,
    totalPrice: source.totalPrice,
    parentCocktailId: source.id,
    ...(aiAnalysis ? { aiAnalysis } : {}),
    createdAt: now,
    updatedAt: now,
  };
  await setDoc(ref, stripUndefined({
    ...cloned,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }));
  return cloned;
}
