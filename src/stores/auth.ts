import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { createStore } from '@rasenganjs/kurama';
import { auth, db } from '@/lib/firebase';
import { User, COLLECTIONS } from '@/entities';
import { consumeGoogleRedirect } from '@/services/auth';

type AuthState = {
  user: User | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  init: () => () => void;
};

export const useAuthStore = createStore<AuthState>((set) => ({
  user: null,
  firebaseUser: null,
  loading: true,

  init: () => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          let snap = await getDoc(doc(db, COLLECTIONS.USERS, firebaseUser.uid));
          if (!snap.exists()) {
            // Nouvel utilisateur Google revenant d'un sign-in par redirection :
            // le document n'existe pas encore — consomme le résultat du
            // redirect (crée le doc) puis recharge.
            await consumeGoogleRedirect();
            snap = await getDoc(doc(db, COLLECTIONS.USERS, firebaseUser.uid));
          }
          set({
            firebaseUser,
            user: snap.exists() ? (snap.data() as User) : null,
            loading: false,
          });
        } catch (error) {
          console.error(error);
          set({
            loading: false
          })
        }
      } else {
        set({ firebaseUser: null, user: null, loading: false });
      }
    });

    return unsubscribe;
  },
}));
