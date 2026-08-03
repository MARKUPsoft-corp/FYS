import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  getAdditionalUserInfo,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  updateProfile,
} from 'firebase/auth';
import type { User as FirebaseUser, UserCredential } from 'firebase/auth';
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

/** Crée le doc Firestore uniquement pour un tout premier compte Google. */
async function createGoogleUserDocIfNew(credential: UserCredential) {
  const { user } = credential;
  const additionalUserInfo = getAdditionalUserInfo(credential);
  if (additionalUserInfo?.isNewUser) {
    await createUserDoc(
      user.uid,
      user.displayName ?? 'Utilisateur',
      user.email ?? '',
    );
  }
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

/**
 * Connexion Google : POPUP d'abord, avec bascule automatique vers la
 * REDIRECTION si le popup est bloqué (mobile, bloqueur, partitionnement).
 * Chaque méthode a ses limites (popup bloqué / sessionStorage partitionné),
 * donc on combine les deux pour couvrir tous les navigateurs.
 */
export async function loginWithGoogle() {
  // Nettoie un éventuel état de redirection résiduel (sinon le popup échoue
  // avec "redirect-operation-pending").
  await getRedirectResult(auth).catch(() => {});

  try {
    const credential = await signInWithPopup(auth, googleProvider);
    await createGoogleUserDocIfNew(credential);
    return credential.user;
  } catch (err) {
    const code = (err as { code?: string })?.code ?? '';
    const popupBlocked =
      code === 'auth/popup-blocked' ||
      code === 'auth/cancelled-popup-request' ||
      code === 'auth/operation-not-supported-in-this-environment' ||
      code === 'auth/unauthorized-domain' ||
      code === 'auth/redirect-operation-pending';

    if (popupBlocked) {
      // Popup impossible dans cet environnement → redirection classique
      await signInWithRedirect(auth, googleProvider);
      return null; // la page va être redirigée vers Google
    }
    throw err;
  }
}

/**
 * À appeler au retour de la redirection Google : crée le document Firestore
 * `users/{uid}` la première fois. Ne fait rien s'il n'y a pas de redirection
 * en attente. Si l'état de redirection a été perdu (sessionStorage
 * partitionné/vidé), on l'ignore proprement pour ne pas bloquer l'app.
 */
export async function consumeGoogleRedirect(): Promise<FirebaseUser | null> {
  let credential: UserCredential | null = null;
  try {
    credential = await getRedirectResult(auth);
  } catch {
    // "Unable to process request due to missing initial state" : l'état de
    // redirection est inaccessible — on ne peut pas récupérer le résultat.
    // L'utilisateur peut retenter (popup) ou utiliser email/mot de passe.
    return null;
  }
  if (!credential) return null;
  await createGoogleUserDocIfNew(credential);
  return credential.user;
}

export async function signOut() {
  await firebaseSignOut(auth);
}

export async function updateLastActive(uid: string) {
  const ref = doc(db, COLLECTIONS.USERS, uid);
  await setDoc(ref, { lastActiveAt: serverTimestamp() }, { merge: true });
}
