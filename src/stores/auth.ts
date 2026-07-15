import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { createStore } from '@rasenganjs/kurama';
import { auth, db } from '@/lib/firebase';
import { User, COLLECTIONS } from '@/entities';

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
          const snap = await getDoc(doc(db, COLLECTIONS.USERS, firebaseUser.uid));
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
