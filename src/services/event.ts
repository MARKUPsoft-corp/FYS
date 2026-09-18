import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  serverTimestamp,
  query,
  where,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import {
  COLLECTIONS,
  type FysEvent,
  type FysEventStatus,
  type FysEventPricingSettings,
  type FysEventJuiceItem,
  type FysEventLogistics,
  type EventVolumeDiscountTier,
  DEFAULT_FYS_EVENT_PRICING,
  FYS_EVENT_STATUS_LABELS,
  type UserInfo,
} from '@/entities';
import { notifyAdmins, createNotification } from '@/services/notifications';
import { sendPushNotification } from '@/services/push';

const SETTINGS_DOC_ID = 'events_pricing';

/**
 * Récupère les paramètres de tarification et remises de volume pour FYS Event
 */
export async function getFysEventPricingSettings(): Promise<FysEventPricingSettings> {
  try {
    const snap = await getDoc(doc(db, COLLECTIONS.SETTINGS, SETTINGS_DOC_ID));
    if (!snap.exists()) {
      return DEFAULT_FYS_EVENT_PRICING;
    }
    const data = snap.data() as Partial<FysEventPricingSettings>;
    return {
      volumeDiscounts: Array.isArray(data.volumeDiscounts) && data.volumeDiscounts.length > 0
        ? data.volumeDiscounts
        : DEFAULT_FYS_EVENT_PRICING.volumeDiscounts,
      coolerBoxUnitPrice: data.coolerBoxUnitPrice ?? DEFAULT_FYS_EVENT_PRICING.coolerBoxUnitPrice,
      ecoCupUnitPrice: data.ecoCupUnitPrice ?? DEFAULT_FYS_EVENT_PRICING.ecoCupUnitPrice,
      bartenderHalfDayRate: data.bartenderHalfDayRate ?? DEFAULT_FYS_EVENT_PRICING.bartenderHalfDayRate,
      baseEventDeliveryFee: data.baseEventDeliveryFee ?? DEFAULT_FYS_EVENT_PRICING.baseEventDeliveryFee,
      updatedAt: data.updatedAt,
    };
  } catch (error) {
    console.error('[getFysEventPricingSettings] Error:', error);
    return DEFAULT_FYS_EVENT_PRICING;
  }
}

/**
 * Met à jour les paramètres de tarification et remises de volume pour FYS Event
 */
export async function updateFysEventPricingSettings(
  settings: Partial<FysEventPricingSettings>
): Promise<void> {
  const ref = doc(db, COLLECTIONS.SETTINGS, SETTINGS_DOC_ID);
  await setDoc(ref, {
    ...settings,
    updatedAt: serverTimestamp(),
  }, { merge: true });
}

/**
 * Calcule le pourcentage de remise de volume applicable selon le nombre total de bouteilles
 */
export function calculateVolumeDiscountPercent(
  totalBottles: number,
  tiers: EventVolumeDiscountTier[]
): number {
  if (!tiers || tiers.length === 0 || totalBottles <= 0) return 0;

  // Trier par minBottles décroissant pour trouver le palier le plus haut atteint
  const sortedTiers = [...tiers].sort((a, b) => b.minBottles - a.minBottles);
  for (const tier of sortedTiers) {
    if (totalBottles >= tier.minBottles) {
      return tier.discountPercent;
    }
  }
  return 0;
}

/**
 * Calcule la décomposition financière complète d'un événement
 */
export function calculateEventFinancials(
  juices: FysEventJuiceItem[],
  logistics: Omit<FysEventLogistics, 'logisticsFee'>,
  pricingSettings: FysEventPricingSettings
): {
  totalBottles: number;
  subtotalJuices: number;
  volumeDiscountPercent: number;
  volumeDiscountAmount: number;
  logisticsFee: number;
  deliveryFee: number;
  totalPrice: number;
} {
  const totalBottles = juices.reduce((acc, j) => acc + (j.quantity || 0), 0);
  const subtotalJuices = juices.reduce((acc, j) => acc + (j.lineTotal || 0), 0);

  const volumeDiscountPercent = calculateVolumeDiscountPercent(
    totalBottles,
    pricingSettings.volumeDiscounts
  );
  const volumeDiscountAmount = Math.round(subtotalJuices * (volumeDiscountPercent / 100));

  let logisticsFee = 0;
  if (logistics.coolerBoxesNeeded) {
    logisticsFee += (logistics.coolerBoxesCount || 0) * pricingSettings.coolerBoxUnitPrice;
  }
  if (logistics.ecoCupsNeeded) {
    logisticsFee += (logistics.ecoCupsCount || 0) * pricingSettings.ecoCupUnitPrice;
  }
  if (logistics.bartenderServiceNeeded) {
    logisticsFee += pricingSettings.bartenderHalfDayRate;
  }

  const deliveryFee = pricingSettings.baseEventDeliveryFee;
  const totalPrice = Math.max(0, subtotalJuices - volumeDiscountAmount + logisticsFee + deliveryFee);

  return {
    totalBottles,
    subtotalJuices,
    volumeDiscountPercent,
    volumeDiscountAmount,
    logisticsFee,
    deliveryFee,
    totalPrice,
  };
}

/**
 * Crée un nouvel événement et passe la commande directement
 */
export async function createFysEvent(
  user: UserInfo,
  eventInput: Omit<FysEvent, 'id' | 'userId' | 'userEmail' | 'userName' | 'userPhone' | 'status' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  const ref = doc(collection(db, COLLECTIONS.EVENTS));
  const nowIso = new Date().toISOString();

  const newEvent: Omit<FysEvent, 'createdAt' | 'updatedAt'> = {
    ...eventInput,
    id: ref.id,
    userId: user.uid,
    userEmail: user.email,
    userName: user.name,
    ...(user.phone ? { userPhone: user.phone } : {}),
    status: 'submitted',
    statusHistory: [
      {
        status: 'submitted',
        timestamp: nowIso,
        note: 'Commande d’événement créée par l’entreprise',
      },
    ],
  };

  await setDoc(ref, {
    ...newEvent,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  // Notifications Administrateurs
  const adminTitle = 'Nouvel événement FYS Event !';
  const adminBody = `${eventInput.companyName} a commandé ${eventInput.totalBottles} bouteilles pour "${eventInput.eventName}" (${eventInput.totalPrice.toLocaleString()} XAF).`;

  notifyAdmins({
    title: adminTitle,
    message: adminBody,
    link: `/board/events-admin?event=${ref.id}`,
  }).catch(console.error);

  sendPushNotification({
    title: adminTitle,
    body: adminBody,
    url: `/board/events-admin?event=${ref.id}`,
    audience: 'admins',
    tag: `fys-event-new-${ref.id}`,
    skipInApp: true,
  }).catch(console.error);

  // Notification Client
  createNotification({
    userId: user.uid,
    title: 'Commande FYS Event reçue !',
    message: `Votre commande pour l'événement "${eventInput.eventName}" (${eventInput.totalBottles} flacons) est bien enregistrée. Notre équipe prépare votre livraison.`,
    link: `/board/events?id=${ref.id}`,
  }).catch(console.error);

  return ref.id;
}

/**
 * Récupère tous les événements d'un utilisateur / entreprise
 */
export async function getUserFysEvents(userId: string): Promise<FysEvent[]> {
  const q = query(
    collection(db, COLLECTIONS.EVENTS),
    where('userId', '==', userId)
  );
  const snap = await getDocs(q);
  const events = snap.docs.map((d) => ({ id: d.id, ...d.data() } as FysEvent));
  return events.sort((a, b) => {
    const aTime = a.createdAt?.toMillis?.() || 0;
    const bTime = b.createdAt?.toMillis?.() || 0;
    return bTime - aTime;
  });
}

/**
 * Écoute en temps réel les événements d'un utilisateur
 */
export function subscribeToUserFysEvents(
  userId: string,
  callback: (events: FysEvent[]) => void
): () => void {
  const q = query(
    collection(db, COLLECTIONS.EVENTS),
    where('userId', '==', userId)
  );
  return onSnapshot(q, (snap) => {
    const events = snap.docs.map((d) => ({ id: d.id, ...d.data() } as FysEvent));
    events.sort((a, b) => {
      const aTime = a.createdAt?.toMillis?.() || 0;
      const bTime = b.createdAt?.toMillis?.() || 0;
      return bTime - aTime;
    });
    callback(events);
  }, (err) => {
    console.error('[subscribeToUserFysEvents] Error:', err);
  });
}

/**
 * Récupère un événement spécifique par son ID
 */
export async function getFysEventById(eventId: string): Promise<FysEvent | null> {
  const snap = await getDoc(doc(db, COLLECTIONS.EVENTS, eventId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as FysEvent;
}

/**
 * Récupère tous les événements (réservé admin)
 */
export async function getAllFysEvents(): Promise<FysEvent[]> {
  const snap = await getDocs(collection(db, COLLECTIONS.EVENTS));
  const events = snap.docs.map((d) => ({ id: d.id, ...d.data() } as FysEvent));
  return events.sort((a, b) => {
    const aTime = a.createdAt?.toMillis?.() || 0;
    const bTime = b.createdAt?.toMillis?.() || 0;
    return bTime - aTime;
  });
}

/**
 * Écoute en temps réel tous les événements (réservé admin)
 */
export function subscribeToAllFysEvents(
  callback: (events: FysEvent[]) => void
): () => void {
  const q = collection(db, COLLECTIONS.EVENTS);
  return onSnapshot(q, (snap) => {
    const events = snap.docs.map((d) => ({ id: d.id, ...d.data() } as FysEvent));
    events.sort((a, b) => {
      const aTime = a.createdAt?.toMillis?.() || 0;
      const bTime = b.createdAt?.toMillis?.() || 0;
      return bTime - aTime;
    });
    callback(events);
  }, (err) => {
    console.error('[subscribeToAllFysEvents] Error:', err);
  });
}

/**
 * Met à jour le statut d'un événement par l'administrateur
 */
export async function updateFysEventStatus(
  eventId: string,
  newStatus: FysEventStatus,
  adminNotes?: string
): Promise<void> {
  const eventRef = doc(db, COLLECTIONS.EVENTS, eventId);
  const snap = await getDoc(eventRef);
  if (!snap.exists()) throw new Error('Événement introuvable.');

  const eventData = snap.data() as FysEvent;
  const history = eventData.statusHistory || [];
  const statusLabel = FYS_EVENT_STATUS_LABELS[newStatus] || newStatus;

  const updatedHistory = [
    ...history,
    {
      status: newStatus,
      timestamp: new Date().toISOString(),
      note: adminNotes || `Statut passé à "${statusLabel}"`,
    },
  ];

  await updateDoc(eventRef, {
    status: newStatus,
    statusHistory: updatedHistory,
    ...(adminNotes !== undefined ? { adminNotes } : {}),
    updatedAt: serverTimestamp(),
  });

  // Notifier l'entreprise / l'utilisateur
  if (eventData.userId) {
    createNotification({
      userId: eventData.userId,
      title: `Événement FYS Event : ${statusLabel}`,
      message: `Votre événement "${eventData.eventName}" est désormais : ${statusLabel}.${adminNotes ? ` Note : ${adminNotes}` : ''}`,
      link: `/board/events?id=${eventId}`,
    }).catch(console.error);

    sendPushNotification({
      title: `Événement FYS Event : ${statusLabel}`,
      body: `Votre événement "${eventData.eventName}" est passé à : ${statusLabel}.`,
      targetUid: eventData.userId,
      url: `/board/events?id=${eventId}`,
      tag: `event-status-${eventId}`,
    }).catch(console.error);
  }
}
