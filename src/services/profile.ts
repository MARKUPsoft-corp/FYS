import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { COLLECTIONS, PROFILE_DOC_ID } from '@/entities';
import type { HealthProfile } from '@/entities';

function profilePath(uid: string) {
  return doc(db, COLLECTIONS.USERS, uid, 'profile', PROFILE_DOC_ID);
}

export async function getProfile(uid: string): Promise<HealthProfile | null> {
  const snap = await getDoc(profilePath(uid));
  if (!snap.exists()) return null;
  return snap.data() as HealthProfile;
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
