import {
  collection,
  addDoc,
  serverTimestamp,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import {
  COLLECTIONS,
  isTastingOrder,
  TASTING_SETTINGS_DOC_ID,
  DEFAULT_TASTING_SETTINGS,
  type TastingSettings,
} from '@/entities';
import type { Order } from '@/entities';

export interface TastingRSVP {
  id: string;
  name: string;
  whatsapp: string;
  guests: number;
  preferences?: string;
  invitationDownloaded?: boolean;
  downloadedAt?: any;
  status?: 'confirmed' | 'attended' | 'cancelled';
  createdAt?: any;
}

export interface TastingVisit {
  id?: string;
  userId?: string | null;
  userName?: string | null;
  userPhone?: string | null;
  visitedAt?: any;
}

export interface TastingDownload {
  id?: string;
  ticketId?: string | null;
  whatsapp?: string | null;
  downloadedAt?: any;
}

export async function submitTastingRSVP(data: {
  name: string;
  whatsapp: string;
  guests: number;
  preferences?: string;
}): Promise<string> {
  const colRef = collection(db, 'fys_tasting_rsvps');
  const docRef = await addDoc(colRef, {
    name: data.name.trim(),
    whatsapp: data.whatsapp.trim(),
    guests: Math.max(1, data.guests || 1),
    preferences: data.preferences?.trim() || '',
    invitationDownloaded: false,
    status: 'confirmed',
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function trackInvitationDownload(ticketId?: string | null, whatsapp?: string | null): Promise<void> {
  try {
    if (ticketId) {
      const rsvpDoc = doc(db, 'fys_tasting_rsvps', ticketId);
      await updateDoc(rsvpDoc, {
        invitationDownloaded: true,
        downloadedAt: serverTimestamp(),
      });
    }
  } catch (err) {
    console.warn('[tasting] Could not update RSVP invitationDownloaded flag:', err);
  }

  try {
    await addDoc(collection(db, 'fys_tasting_downloads'), {
      ticketId: ticketId || null,
      whatsapp: whatsapp || null,
      downloadedAt: serverTimestamp(),
    });
  } catch (err) {
    console.warn('[tasting] Could not log download entry:', err);
  }
}

export async function trackTastingVisit(visitor?: {
  uid?: string;
  name?: string;
  phone?: string;
  email?: string;
}): Promise<void> {
  try {
    // Éviter de logger les visites multiples en moins de 1 heure pour la même session
    const storageKey = 'fys_tasting_visited_recently';
    const lastVisit = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem(storageKey) : null;
    if (lastVisit && Date.now() - Number(lastVisit) < 60 * 60 * 1000) {
      return;
    }
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem(storageKey, String(Date.now()));
    }

    await addDoc(collection(db, 'fys_tasting_visits'), {
      userId: visitor?.uid || null,
      userName: visitor?.name || null,
      userPhone: visitor?.phone || null,
      userEmail: visitor?.email || null,
      visitedAt: serverTimestamp(),
    });
  } catch (err) {
    console.warn('[tasting] Could not log visit entry:', err);
  }
}

export function subscribeToTastingRSVPs(
  callback: (rsvps: TastingRSVP[]) => void,
  onError?: (err: Error) => void,
): Unsubscribe {
  const colRef = collection(db, 'fys_tasting_rsvps');
  const q = query(colRef, orderBy('createdAt', 'desc'));

  return onSnapshot(
    q,
    (snap) => {
      const items = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as TastingRSVP[];
      callback(items);
    },
    (err) => {
      console.warn('[tasting] subscribeToTastingRSVPs with orderBy failed, falling back to unordered:', err);
      // Fallback si l'index n'est pas encore prêt
      return onSnapshot(
        colRef,
        (snap) => {
          const items = snap.docs.map((d) => ({
            id: d.id,
            ...d.data(),
          })) as TastingRSVP[];
          items.sort((a, b) => {
            const tA = (a.createdAt as any)?.seconds ?? 0;
            const tB = (b.createdAt as any)?.seconds ?? 0;
            return tB - tA;
          });
          callback(items);
        },
        onError,
      );
    },
  );
}

export async function updateRSVPStatus(
  rsvpId: string,
  status: 'confirmed' | 'attended' | 'cancelled',
): Promise<void> {
  await updateDoc(doc(db, 'fys_tasting_rsvps', rsvpId), { status });
}

export async function deleteRSVP(rsvpId: string): Promise<void> {
  await deleteDoc(doc(db, 'fys_tasting_rsvps', rsvpId));
}

export function subscribeToTastingDownloads(
  callback: (downloads: TastingDownload[]) => void,
): Unsubscribe {
  const colRef = collection(db, 'fys_tasting_downloads');
  return onSnapshot(
    colRef,
    (snap) => {
      const items = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as TastingDownload[];
      callback(items);
    },
    (err) => console.warn('[tasting] subscribeToTastingDownloads warning:', err),
  );
}

export function subscribeToTastingVisits(
  callback: (visits: TastingVisit[]) => void,
): Unsubscribe {
  const colRef = collection(db, 'fys_tasting_visits');
  return onSnapshot(
    colRef,
    (snap) => {
      const items = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as TastingVisit[];
      callback(items);
    },
    (err) => console.warn('[tasting] subscribeToTastingVisits warning:', err),
  );
}

export function subscribeToTastingOrders(
  callback: (orders: Order[]) => void,
): Unsubscribe {
  const colRef = collection(db, COLLECTIONS.ORDERS);
  return onSnapshot(
    colRef,
    (snap) => {
      const allOrders = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as Order[];

      const tastingOrders = allOrders.filter((o) => isTastingOrder(o));

      tastingOrders.sort((a, b) => {
        const tA = (a.createdAt as any)?.seconds ?? 0;
        const tB = (b.createdAt as any)?.seconds ?? 0;
        return tB - tA;
      });

      callback(tastingOrders);
    },
    (err) => console.warn('[tasting] subscribeToTastingOrders warning:', err),
  );
}

// ── Tasting Lab Ingredients Settings ──────────────────────────────────────────

export async function getTastingSettings(): Promise<TastingSettings> {
  try {
    const snap = await getDoc(doc(db, COLLECTIONS.SETTINGS, TASTING_SETTINGS_DOC_ID));
    if (!snap.exists()) {
      return { ...DEFAULT_TASTING_SETTINGS };
    }
    const data = snap.data() as Partial<TastingSettings>;
    const mainIds = data.tastingMainFruitIds ?? DEFAULT_TASTING_SETTINGS.tastingMainFruitIds;
    const suppIds = data.tastingSupplementIds ?? DEFAULT_TASTING_SETTINGS.tastingSupplementIds;
    return {
      tastingMainFruitIds: mainIds,
      tastingSupplementIds: suppIds,
      tastingFruitIds: data.tastingFruitIds ?? [...new Set([...mainIds, ...suppIds])],
      ...(data.updatedAt ? { updatedAt: data.updatedAt } : {}),
    };
  } catch (err) {
    console.warn('[tasting] getTastingSettings fallback to defaults:', err);
    return { ...DEFAULT_TASTING_SETTINGS };
  }
}

export function subscribeToTastingSettings(
  callback: (settings: TastingSettings) => void,
): Unsubscribe {
  const docRef = doc(db, COLLECTIONS.SETTINGS, TASTING_SETTINGS_DOC_ID);
  return onSnapshot(
    docRef,
    (snap) => {
      if (!snap.exists()) {
        callback({ ...DEFAULT_TASTING_SETTINGS });
        return;
      }
      const data = snap.data() as Partial<TastingSettings>;
      const mainIds = data.tastingMainFruitIds ?? DEFAULT_TASTING_SETTINGS.tastingMainFruitIds;
      const suppIds = data.tastingSupplementIds ?? DEFAULT_TASTING_SETTINGS.tastingSupplementIds;
      callback({
        tastingMainFruitIds: mainIds,
        tastingSupplementIds: suppIds,
        tastingFruitIds: data.tastingFruitIds ?? [...new Set([...mainIds, ...suppIds])],
        ...(data.updatedAt ? { updatedAt: data.updatedAt } : {}),
      });
    },
    (err) => {
      console.warn('[tasting] subscribeToTastingSettings warning:', err);
      callback({ ...DEFAULT_TASTING_SETTINGS });
    },
  );
}

export async function updateTastingSettings(
  data: Partial<TastingSettings>,
): Promise<void> {
  const docRef = doc(db, COLLECTIONS.SETTINGS, TASTING_SETTINGS_DOC_ID);
  const mainIds = data.tastingMainFruitIds;
  const suppIds = data.tastingSupplementIds;
  const combined = data.tastingFruitIds ?? (
    mainIds && suppIds ? [...new Set([...mainIds, ...suppIds])] : undefined
  );

  await setDoc(
    docRef,
    {
      ...(mainIds ? { tastingMainFruitIds: mainIds } : {}),
      ...(suppIds ? { tastingSupplementIds: suppIds } : {}),
      ...(combined ? { tastingFruitIds: combined } : {}),
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}

export async function resetTastingSettingsToDefault(): Promise<void> {
  const docRef = doc(db, COLLECTIONS.SETTINGS, TASTING_SETTINGS_DOC_ID);
  await setDoc(docRef, {
    ...DEFAULT_TASTING_SETTINGS,
    updatedAt: serverTimestamp(),
  });
}
