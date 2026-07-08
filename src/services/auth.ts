import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  getAdditionalUserInfo,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  updateProfile,
} from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { COLLECTIONS } from '@/entities';
import { UserRole } from '@/entities';

const googleProvider = new GoogleAuthProvider();

// Creates the Firestore user document at users/{uid}
async function createUserDoc(uid: string, name: string, email: string) {
  await setDoc(doc(db, COLLECTIONS.USERS, uid), {
    uid,
    name,
    email,
    role: UserRole.CUSTOMER,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function registerWithEmail(name: string, email: string, password: string) {
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(credential.user, { displayName: name });
  await createUserDoc(credential.user.uid, name, email);
  return credential.user;
}

export async function loginWithEmail(email: string, password: string) {
  const credential = await signInWithEmailAndPassword(auth, email, password);
  return credential.user;
}

export async function loginWithGoogle() {
  const credential = await signInWithPopup(auth, googleProvider);
  const { user } = credential;
  const additionalUserInfo = getAdditionalUserInfo(credential);

  // Only create the Firestore doc the first time
  if (additionalUserInfo?.isNewUser) {
    await createUserDoc(
      user.uid,
      user.displayName ?? 'Utilisateur',
      user.email ?? '',
    );
  }

  return user;
}

export async function signOut() {
  await firebaseSignOut(auth);
}
