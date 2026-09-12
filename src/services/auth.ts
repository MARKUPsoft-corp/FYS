import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  getAdditionalUserInfo,
  GoogleAuthProvider,
  OAuthProvider,
  signOut as firebaseSignOut,
  updateProfile,
} from 'firebase/auth';
import type { User as FirebaseUser, UserCredential } from 'firebase/auth';
import { doc, setDoc, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { COLLECTIONS } from '@/entities';
import { UserRole } from '@/entities';
import { trackEvent } from '@/lib/analytics';

const googleProvider = new GoogleAuthProvider();
const appleProvider = new OAuthProvider('apple.com');
appleProvider.addScope('email');
appleProvider.addScope('name');

// Creates the Firestore user document at users/{uid}
export async function createUserDoc(uid: string, name: string, email: string) {
  await setDoc(doc(db, COLLECTIONS.USERS, uid), {
    uid,
    name,
    email,
    role: UserRole.CUSTOMER,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

/** Crée le doc Firestore uniquement pour un tout premier compte OAuth (Google / Apple). */
async function createOAuthUserDocIfNew(credential: UserCredential, method: 'google' | 'apple') {
  const { user } = credential;
  const additionalUserInfo = getAdditionalUserInfo(credential);
  if (additionalUserInfo?.isNewUser) {
    await createUserDoc(
      user.uid,
      user.displayName ?? 'Utilisateur',
      user.email ?? '',
    );
    trackEvent('sign_up', { method });
  } else {
    trackEvent('login', { method });
  }
}

export async function registerWithEmail(name: string, email: string, password: string) {
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(credential.user, { displayName: name });
  await createUserDoc(credential.user.uid, name, email);
  trackEvent('sign_up', { method: 'email' });
  return credential.user;
}

export async function loginWithEmail(email: string, password: string) {
  const credential = await signInWithEmailAndPassword(auth, email, password);
  trackEvent('login', { method: 'email' });
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
    await createOAuthUserDocIfNew(credential, 'google');
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
 * Connexion Apple : POPUP d'abord, avec bascule automatique vers la
 * REDIRECTION si le popup est bloqué.
 */
export async function loginWithApple() {
  await getRedirectResult(auth).catch(() => {});

  try {
    const credential = await signInWithPopup(auth, appleProvider);
    await createOAuthUserDocIfNew(credential, 'apple');
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
      await signInWithRedirect(auth, appleProvider);
      return null;
    }
    throw err;
  }
}

/**
 * À appeler au retour de la redirection OAuth (Google ou Apple) : crée le document
 * Firestore `users/{uid}` la première fois. Ne fait rien s'il n'y a pas de redirection
 * en attente.
 */
export async function consumeOAuthRedirect(): Promise<FirebaseUser | null> {
  let credential: UserCredential | null = null;
  try {
    credential = await getRedirectResult(auth);
  } catch {
    return null;
  }
  if (!credential) return null;
  const providerId = credential.providerId || '';
  const method = providerId.includes('apple') ? 'apple' : 'google';
  await createOAuthUserDocIfNew(credential, method);
  return credential.user;
}

export const consumeGoogleRedirect = consumeOAuthRedirect;

export async function signOut() {
  await firebaseSignOut(auth);
}

export async function updateLastActive(uid: string) {
  const ref = doc(db, COLLECTIONS.USERS, uid);
  await setDoc(ref, { lastActiveAt: serverTimestamp() }, { merge: true });
}

import { getUserOrders, deleteOrderCompletely } from './order';
import { getUserCocktails, deleteCocktail } from './cocktail';
import { deleteAllSessions } from './chat';

export async function deleteUserCompletely(uid: string): Promise<void> {
  // 1. Delete all user orders
  const orders = await getUserOrders(uid);
  for (const order of orders) {
    await deleteOrderCompletely(order.id);
  }

  // 2. Delete all user cocktails
  const cocktails = await getUserCocktails(uid);
  for (const cocktail of cocktails) {
    await deleteCocktail(cocktail.id, cocktail.imageUrl);
  }

  // 3. Delete all chat sessions and messages
  await deleteAllSessions(uid);

  // 4. Delete user profile
  await deleteDoc(doc(db, COLLECTIONS.USERS, uid, 'profile', 'main'));

  // 5. Delete user main document
  await deleteDoc(doc(db, COLLECTIONS.USERS, uid));
}
