import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from 'firebase/storage';
import { storage } from '@/lib/firebase';

export async function uploadFruitImage(fruitId: string, file: File): Promise<string> {
  const ext = file.name.split('.').pop() ?? 'jpg';
  const storageRef = ref(storage, `fruits/${fruitId}/image.${ext}`);
  await uploadBytes(storageRef, file);
  return getDownloadURL(storageRef);
}

export async function deleteFruitImage(url: string): Promise<void> {
  try {
    await deleteObject(ref(storage, url));
  } catch {
    // Ignore — image may already be deleted or URL may be external
  }
}

export async function uploadCocktailImage(cocktailId: string, file: File): Promise<string> {
  const ext = file.name.split('.').pop() ?? 'jpg';
  const storageRef = ref(storage, `cocktails/${cocktailId}/image.${ext}`);
  await uploadBytes(storageRef, file);
  return getDownloadURL(storageRef);
}

export async function deleteCocktailImage(url: string): Promise<void> {
  try {
    await deleteObject(ref(storage, url));
  } catch {
    // Ignore
  }
}
