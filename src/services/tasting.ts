import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export interface TastingRSVP {
  id?: string;
  name: string;
  whatsapp: string;
  guests: number;
  preferences: string;
  createdAt?: any;
}

export async function submitTastingRSVP(data: Omit<TastingRSVP, 'createdAt'>) {
  const colRef = collection(db, 'fys_tasting_rsvps');
  const docRef = await addDoc(colRef, {
    ...data,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}
