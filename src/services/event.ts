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
    const rawTiers = Array.isArray(data.volumeDiscountTiers) && data.volumeDiscountTiers.length > 0
      ? data.volumeDiscountTiers
      : (Array.isArray(data.volumeDiscounts) && data.volumeDiscounts.length > 0
        ? data.volumeDiscounts
        : DEFAULT_FYS_EVENT_PRICING.volumeDiscounts);

    const coolerUnitPrice = data.coolerBoxPricePerUnit ?? data.coolerBoxUnitPrice ?? DEFAULT_FYS_EVENT_PRICING.coolerBoxUnitPrice;
    const ecoUnitPrice = data.ecoCupPricePerUnit ?? data.ecoCupUnitPrice ?? DEFAULT_FYS_EVENT_PRICING.ecoCupUnitPrice;
    const hourlyRate = data.bartenderServiceHourlyRate ?? (data.bartenderHalfDayRate ? Math.round(data.bartenderHalfDayRate / 4) : DEFAULT_FYS_EVENT_PRICING.bartenderServiceHourlyRate);
    const halfDayRate = data.bartenderHalfDayRate ?? hourlyRate * 4;
    const deliveryFee = data.baseEventDeliveryFee ?? DEFAULT_FYS_EVENT_PRICING.baseEventDeliveryFee;

    return {
      volumeDiscounts: rawTiers,
      volumeDiscountTiers: rawTiers,
      coolerBoxUnitPrice: coolerUnitPrice,
      coolerBoxPricePerUnit: coolerUnitPrice,
      ecoCupUnitPrice: ecoUnitPrice,
      ecoCupPricePerUnit: ecoUnitPrice,
      bartenderHalfDayRate: halfDayRate,
      bartenderServiceHourlyRate: hourlyRate,
      baseEventDeliveryFee: deliveryFee,
      whatsappNumber: data.whatsappNumber || DEFAULT_FYS_EVENT_PRICING.whatsappNumber,
      updatedAt: data.updatedAt,
    };
  } catch (error) {
    console.error('[getFysEventPricingSettings] Error:', error);
    return DEFAULT_FYS_EVENT_PRICING;
  }
}

/**
 * Écoute en temps réel les paramètres de tarification et configuration FYS Event (y compris WhatsApp)
 */
export function subscribeToFysEventPricingSettings(
  callback: (settings: FysEventPricingSettings) => void
): () => void {
  const ref = doc(db, COLLECTIONS.SETTINGS, SETTINGS_DOC_ID);
  return onSnapshot(ref, (snap) => {
    if (!snap.exists()) {
      callback(DEFAULT_FYS_EVENT_PRICING);
      return;
    }
    const data = snap.data() as Partial<FysEventPricingSettings>;
    const rawTiers = Array.isArray(data.volumeDiscountTiers) && data.volumeDiscountTiers.length > 0
      ? data.volumeDiscountTiers
      : (Array.isArray(data.volumeDiscounts) && data.volumeDiscounts.length > 0
        ? data.volumeDiscounts
        : DEFAULT_FYS_EVENT_PRICING.volumeDiscounts);

    const coolerUnitPrice = data.coolerBoxPricePerUnit ?? data.coolerBoxUnitPrice ?? DEFAULT_FYS_EVENT_PRICING.coolerBoxUnitPrice;
    const ecoUnitPrice = data.ecoCupPricePerUnit ?? data.ecoCupUnitPrice ?? DEFAULT_FYS_EVENT_PRICING.ecoCupUnitPrice;
    const hourlyRate = data.bartenderServiceHourlyRate ?? (data.bartenderHalfDayRate ? Math.round(data.bartenderHalfDayRate / 4) : DEFAULT_FYS_EVENT_PRICING.bartenderServiceHourlyRate);
    const halfDayRate = data.bartenderHalfDayRate ?? hourlyRate * 4;
    const deliveryFee = data.baseEventDeliveryFee ?? DEFAULT_FYS_EVENT_PRICING.baseEventDeliveryFee;

    callback({
      volumeDiscounts: rawTiers,
      volumeDiscountTiers: rawTiers,
      coolerBoxUnitPrice: coolerUnitPrice,
      coolerBoxPricePerUnit: coolerUnitPrice,
      ecoCupUnitPrice: ecoUnitPrice,
      ecoCupPricePerUnit: ecoUnitPrice,
      bartenderHalfDayRate: halfDayRate,
      bartenderServiceHourlyRate: hourlyRate,
      baseEventDeliveryFee: deliveryFee,
      whatsappNumber: data.whatsappNumber || DEFAULT_FYS_EVENT_PRICING.whatsappNumber,
      updatedAt: data.updatedAt,
    });
  }, (err) => {
    console.error('[subscribeToFysEventPricingSettings] Error:', err);
  });
}

/**
 * Normalise un numéro de téléphone pour WhatsApp (ex: +237 699 00 00 00 ou 699000000 -> 237699000000)
 */
export function normalizeWhatsAppNumber(phone?: string): string {
  if (!phone) return '237699000000';
  let cleaned = phone.replace(/[^0-9]/g, '');
  if (!cleaned) return '237699000000';
  if (cleaned.startsWith('00')) {
    cleaned = cleaned.slice(2);
  }
  if (cleaned.length === 9 && (cleaned.startsWith('6') || cleaned.startsWith('2'))) {
    return `237${cleaned}`;
  }
  return cleaned;
}

/**
 * Met à jour les paramètres de tarification et remises de volume pour FYS Event
 */
export async function updateFysEventPricingSettings(
  settings: Partial<FysEventPricingSettings>
): Promise<void> {
  const ref = doc(db, COLLECTIONS.SETTINGS, SETTINGS_DOC_ID);
  const tiers = settings.volumeDiscountTiers || settings.volumeDiscounts || DEFAULT_FYS_EVENT_PRICING.volumeDiscounts;
  const coolerPrice = settings.coolerBoxPricePerUnit ?? settings.coolerBoxUnitPrice ?? DEFAULT_FYS_EVENT_PRICING.coolerBoxUnitPrice;
  const ecoPrice = settings.ecoCupPricePerUnit ?? settings.ecoCupUnitPrice ?? DEFAULT_FYS_EVENT_PRICING.ecoCupUnitPrice;
  const hourlyRate = settings.bartenderServiceHourlyRate ?? (settings.bartenderHalfDayRate ? Math.round(settings.bartenderHalfDayRate / 4) : DEFAULT_FYS_EVENT_PRICING.bartenderServiceHourlyRate);
  const halfDayRate = settings.bartenderHalfDayRate ?? hourlyRate * 4;
  const deliveryFee = settings.baseEventDeliveryFee ?? DEFAULT_FYS_EVENT_PRICING.baseEventDeliveryFee;
  const whatsappNumber = (settings.whatsappNumber || '').trim() || DEFAULT_FYS_EVENT_PRICING.whatsappNumber || '+237699000000';

  await setDoc(ref, {
    ...settings,
    volumeDiscounts: tiers,
    volumeDiscountTiers: tiers,
    coolerBoxUnitPrice: coolerPrice,
    coolerBoxPricePerUnit: coolerPrice,
    ecoCupUnitPrice: ecoPrice,
    ecoCupPricePerUnit: ecoPrice,
    bartenderHalfDayRate: halfDayRate,
    bartenderServiceHourlyRate: hourlyRate,
    baseEventDeliveryFee: deliveryFee,
    whatsappNumber,
    updatedAt: serverTimestamp(),
  }, { merge: true });
}

/**
 * Calcule le pourcentage de remise de volume applicable selon le nombre total de bouteilles
 */
export function calculateVolumeDiscountPercent(
  totalBottles: number,
  tiers?: EventVolumeDiscountTier[]
): number {
  const safeTiers = Array.isArray(tiers) && tiers.length > 0 ? tiers : DEFAULT_FYS_EVENT_PRICING.volumeDiscounts;
  if (!safeTiers || safeTiers.length === 0 || totalBottles <= 0) return 0;

  // Trier par minBottles décroissant pour trouver le palier le plus haut atteint
  const sortedTiers = [...safeTiers].sort((a, b) => b.minBottles - a.minBottles);
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
  logistics: any,
  pricingSettings?: FysEventPricingSettings
) {
  const safeSettings = pricingSettings || DEFAULT_FYS_EVENT_PRICING;
  const safeJuices = Array.isArray(juices) ? juices : [];

  const totalBottles = safeJuices.reduce((acc, j) => acc + (j.quantity || 0), 0);
  const totalLiters = safeJuices.reduce((acc, j) => {
    const vol = j.bottleVolume || j.bottleSize || '500ml';
    return acc + (vol === '1L' ? (j.quantity || 0) * 1.0 : (j.quantity || 0) * 0.5);
  }, 0);

  const rawJuiceTotal = safeJuices.reduce((acc, j) => {
    const total = j.totalPrice ?? j.lineTotal ?? ((j.unitPrice || 0) * (j.quantity || 0));
    return acc + total;
  }, 0);

  const tiers = safeSettings.volumeDiscountTiers || safeSettings.volumeDiscounts || DEFAULT_FYS_EVENT_PRICING.volumeDiscounts;
  const discountPercent = calculateVolumeDiscountPercent(totalBottles, tiers);
  const discountAmount = Math.round(rawJuiceTotal * (discountPercent / 100));

  const coolerUnitPrice = safeSettings.coolerBoxPricePerUnit ?? safeSettings.coolerBoxUnitPrice ?? DEFAULT_FYS_EVENT_PRICING.coolerBoxUnitPrice;
  const ecoUnitPrice = safeSettings.ecoCupPricePerUnit ?? safeSettings.ecoCupUnitPrice ?? DEFAULT_FYS_EVENT_PRICING.ecoCupUnitPrice;
  const bartenderRate = safeSettings.bartenderServiceHourlyRate ?? (safeSettings.bartenderHalfDayRate ? Math.round(safeSettings.bartenderHalfDayRate / 4) : 5000);

  let totalLogisticsFee = 0;
  if (logistics?.needCoolerBoxes || logistics?.coolerBoxesNeeded) {
    totalLogisticsFee += (logistics.coolerBoxesCount || 0) * coolerUnitPrice;
  }
  if (logistics?.needEcoCups || logistics?.ecoCupsNeeded) {
    totalLogisticsFee += (logistics.ecoCupsCount || 0) * ecoUnitPrice;
  }
  if (logistics?.needBartenderService || logistics?.bartenderServiceNeeded) {
    const hours = logistics.bartenderHours || 4;
    totalLogisticsFee += hours * bartenderRate;
  }

  const deliveryFee = safeSettings.baseEventDeliveryFee ?? 0;
  const totalAmount = Math.max(0, rawJuiceTotal - discountAmount + totalLogisticsFee);

  return {
    totalBottles,
    totalLiters,
    rawJuiceTotal,
    subtotalJuices: rawJuiceTotal,
    discountPercent,
    volumeDiscountPercent: discountPercent,
    discountAmount,
    volumeDiscountAmount: discountAmount,
    totalLogisticsFee,
    logisticsFee: totalLogisticsFee,
    deliveryFee,
    totalAmount,
    totalPrice: totalAmount,
  };
}

/**
 * Crée un nouvel événement et passe la commande directement
 */
export async function createFysEvent(
  userOrData: any,
  maybeEventInput?: any
): Promise<string> {
  const ref = doc(collection(db, COLLECTIONS.EVENTS));
  const nowIso = new Date().toISOString();

  let user: { uid: string; email: string; name: string; phone?: string };
  let eventInput: any;

  if (maybeEventInput) {
    user = userOrData;
    eventInput = maybeEventInput;
  } else {
    eventInput = userOrData;
    user = {
      uid: eventInput.userId,
      email: eventInput.userEmail,
      name: eventInput.userName,
      phone: eventInput.userPhone,
    };
  }

  const newEvent = {
    ...eventInput,
    id: ref.id,
    userId: user.uid,
    userEmail: user.email,
    userName: user.name,
    userPhone: user.phone || eventInput.userPhone || eventInput.contactPhone,
    companyName: eventInput.companyName,
    eventName: eventInput.eventName || eventInput.eventTitle,
    eventTitle: eventInput.eventTitle || eventInput.eventName,
    location: eventInput.location || eventInput.locationAddress,
    locationAddress: eventInput.locationAddress || eventInput.location,
    items: eventInput.items || eventInput.selectedJuices || [],
    selectedJuices: eventInput.selectedJuices || eventInput.items || [],
    status: eventInput.status || 'submitted',
    statusHistory: [
      {
        status: eventInput.status || 'submitted',
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

  const eventTitle = newEvent.eventTitle || newEvent.eventName || 'Événement';
  const totalAmount = newEvent.totalAmount ?? newEvent.totalPrice ?? 0;
  const totalBottles = newEvent.totalBottles ?? 0;

  // Notifications Administrateurs
  const adminTitle = 'Nouvel événement FYS Event !';
  const adminBody = `${newEvent.companyName} a commandé ${totalBottles} bouteilles pour "${eventTitle}" (${totalAmount.toLocaleString()} XAF).`;

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
    message: `Votre commande pour l'événement "${eventTitle}" (${totalBottles} flacons) est bien enregistrée. Notre équipe prépare votre livraison.`,
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
    const eventTitle = eventData.eventTitle || eventData.eventName || 'Événement';
    createNotification({
      userId: eventData.userId,
      title: `Événement FYS Event : ${statusLabel}`,
      message: `Votre événement "${eventTitle}" est désormais : ${statusLabel}.${adminNotes ? ` Note : ${adminNotes}` : ''}`,
      link: `/board/events?id=${eventId}`,
    }).catch(console.error);

    sendPushNotification({
      title: `Événement FYS Event : ${statusLabel}`,
      body: `Votre événement "${eventTitle}" est passé à : ${statusLabel}.`,
      targetUid: eventData.userId,
      url: `/board/events?id=${eventId}`,
      tag: `event-status-${eventId}`,
    }).catch(console.error);
  }
}

/**
 * Met à jour une commande d'événement existante par l'utilisateur ou l'administrateur
 */
export async function updateFysEvent(
  eventId: string,
  eventData: Partial<FysEvent>
): Promise<void> {
  const eventRef = doc(db, COLLECTIONS.EVENTS, eventId);
  const snap = await getDoc(eventRef);
  if (!snap.exists()) throw new Error('Événement introuvable.');

  const existing = snap.data() as FysEvent;
  const history = existing.statusHistory || [];
  const nowIso = new Date().toISOString();

  const updatedHistory = [
    ...history,
    {
      status: existing.status,
      timestamp: nowIso,
      note: 'Détails de l’événement mis à jour par l’organisateur',
    },
  ];

  // Nettoyer les champs undefined pour Firestore
  const cleanData: Record<string, any> = {};
  for (const [key, value] of Object.entries(eventData)) {
    if (value !== undefined) {
      cleanData[key] = value;
    }
  }

  await updateDoc(eventRef, {
    ...cleanData,
    statusHistory: updatedHistory,
    updatedAt: serverTimestamp(),
  });

  // Notifier les admins de la modification
  const title = eventData.eventTitle || existing.eventTitle || 'Événement';
  const company = eventData.companyName || existing.companyName || 'Une entreprise';
  notifyAdmins({
    title: 'Commande FYS Event modifiée',
    message: `${company} a mis à jour sa commande pour "${title}".`,
    link: `/board/events-admin?event=${eventId}`,
  }).catch(console.error);
}
