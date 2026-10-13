import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { COLLECTIONS, PROFILE_DOC_ID } from '@/entities';
import type { HealthProfile } from '@/entities';

function profilePath(uid: string) {
  return doc(db, COLLECTIONS.USERS, uid, 'profile', PROFILE_DOC_ID);
}

export async function getProfile(uid: string): Promise<HealthProfile | null> {
  if (!uid) return null;
  const snap = await getDoc(profilePath(uid));
  if (snap.exists()) {
    return snap.data() as HealthProfile;
  }
  // Fallback : vérifier sur le document utilisateur racine (ex: WhatsApp ou profil direct)
  const userSnap = await getDoc(doc(db, COLLECTIONS.USERS, uid));
  if (userSnap.exists()) {
    const data = userSnap.data();
    if (data?.healthConditions?.length || data?.allergies?.length || data?.goals?.length) {
      return {
        userId: uid,
        healthConditions: data.healthConditions || [],
        allergies: data.allergies || [],
        goals: data.goals || [],
        updatedAt: data.updatedAt || data.createdAt,
      } as HealthProfile;
    }
  }
  return null;
}

export async function saveProfile(
  uid: string,
  data: Pick<HealthProfile, 'healthConditions' | 'allergies' | 'goals'>,
): Promise<void> {
  await setDoc(profilePath(uid), {
    userId: uid,
    healthConditions: data.healthConditions,
    allergies: data.allergies,
    goals: data.goals ?? [],
    updatedAt: serverTimestamp(),
  });
}
