import {
  collection, doc, setDoc, updateDoc, getDocs, getDoc, deleteDoc,
  serverTimestamp, query, where, orderBy, onSnapshot,
  type Unsubscribe,
  type QuerySnapshot,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import {
  COLLECTIONS,
  OrderStatus,
  BOTTLE_LABELS,
  type BottleSize,
  type Cocktail,
  type Order,
  type OrderLine,
  type OrderExpenses,
  type Program,
  type ProgramJuiceOrderItem,
  type UserProgram,
  type ProgramDayItem,
  PROGRAM_TIMING_LABELS,
} from '@/entities';
import { createNotification, notifyAdmins } from '@/services/notifications';
import { sendPushNotification } from '@/services/push';
import i18n from '@/i18n';

const statusLabel = (status: OrderStatus): string => i18n.t(`orders.${status === OrderStatus.CANCELLED ? 'canceled' : status}`);

type UserInfo = {
  uid: string;
  name: string;
  email: string;
  phone?: string;
};

export type CreateOrderLine = {
  bottleSize: BottleSize;
  quantity: number;
  bottleBasePrice: number;
  pricePerBottle: number;
};

export type CreateOrderVisuals = {
  cocktailImageSnapshot?: string;
  ingredientImageSnapshots?: string[];
  discountAmount?: number;
  promoCodeApplied?: string;
};

export async function createOrder(
  user: UserInfo,
  cocktail: Cocktail,
  orderLines: CreateOrderLine[],
  deliveryFee: number,
  deliveryDetails?: { district: string; phone: string; instructions: string; coordinates?: { lat: number; lng: number } },
  visuals?: CreateOrderVisuals,
): Promise<string> {
  if (orderLines.length === 0) {
    throw new Error('Au moins une ligne de commande est requise.');
  }

  const cover =
    visuals?.cocktailImageSnapshot ??
    cocktail.imageUrl ??
    visuals?.ingredientImageSnapshots?.[0];

  const fruitImgs = visuals?.ingredientImageSnapshots;

  if (deliveryDetails && !deliveryDetails.district.trim()) {
    throw new Error('Le quartier de livraison est requis.');
  }

  // Clean undefined values from deliveryDetails (Firestore doesn't allow undefined)
  const cleanedDeliveryDetails = deliveryDetails ? {
    district: deliveryDetails.district,
    phone: deliveryDetails.phone,
    instructions: deliveryDetails.instructions,
    ...(deliveryDetails.coordinates?.lat != null && deliveryDetails.coordinates?.lng != null
      ? { coordinates: { lat: deliveryDetails.coordinates.lat, lng: deliveryDetails.coordinates.lng } }
      : {}
    ),
  } : undefined;

  // Calculate totals
  const subtotal = orderLines.reduce((sum, line) => sum + (line.pricePerBottle * line.quantity), 0);
  const totalPrice = Math.max(0, subtotal + deliveryFee - (visuals?.discountAmount ?? 0));

  // Build order lines with labels
  const orderLinesWithLabels = orderLines.map(line => ({
    bottleSize: line.bottleSize,
    bottleSizeLabel: BOTTLE_LABELS[line.bottleSize],
    quantity: line.quantity,
    bottleBasePriceSnapshot: line.bottleBasePrice,
    pricePerBottle: line.pricePerBottle,
    lineTotal: line.pricePerBottle * line.quantity,
  }));

  const ref = doc(collection(db, COLLECTIONS.ORDERS));
  const order: Omit<Order, 'createdAt' | 'updatedAt'> = {
    id: ref.id,
    type: 'classic',
    userId: user.uid,
    userNameSnapshot: user.name,
    userEmailSnapshot: user.email,
    ...(user.phone ? { userPhoneSnapshot: user.phone } : {}),
    cocktailId: cocktail.id,
    cocktailNameSnapshot: cocktail.name,
    cocktailIngredientsSnapshot: cocktail.ingredients ?? [],
    hasAddedSugar: cocktail.hasAddedSugar ?? false,
    orderLines: orderLinesWithLabels,
    deliveryFee,
    totalPrice,
    status: OrderStatus.PENDING,
    ...(cleanedDeliveryDetails ? { deliveryDetails: cleanedDeliveryDetails } : {}),
    ...(cocktail.aiAnalysis ? { aiAnalysisSnapshot: cocktail.aiAnalysis } : {}),
    ...(cover ? { cocktailImageSnapshot: cover } : {}),
    ...(fruitImgs?.length ? { ingredientImageSnapshots: fruitImgs } : {}),
    ...(visuals?.discountAmount ? { discountAmount: visuals.discountAmount } : {}),
    ...(visuals?.promoCodeApplied ? { promoCodeApplied: visuals.promoCodeApplied } : {}),
  };
  
  await setDoc(ref, {
    ...order,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  // Build notification message
  const quantityText = orderLines.map(line => 
    `${line.quantity}× ${BOTTLE_LABELS[line.bottleSize]}`
  ).join(' + ');

  const orderTitle = i18n.t('notifications.newOrder');
  const receivedTitle = i18n.t('notifications.orderReceived');
  const orderBody = i18n.t('notifications.adminNewOrderBody', { userName: user.name, cocktailName: cocktail.name, quantityText });
  const customerBody = i18n.t('notifications.customerNewOrderBody', { cocktailName: cocktail.name, quantityText });

  // Notify admins in-app
  notifyAdmins({
    title: orderTitle,
    message: orderBody,
    link: `/board/orders?order=${ref.id}`,
  }).catch(console.error);

  // Send push notification to all admins (skipInApp: true car notifyAdmins a déjà créé la notif in-app)
  sendPushNotification({
    title: orderTitle,
    body: orderBody,
    url: `/board/orders?order=${ref.id}`,
    audience: 'admins',
    tag: `order-new-${ref.id}`,
    skipInApp: true,
  }).catch(console.error);

  // Notify customer in-app
  createNotification({
    userId: user.uid,
    title: receivedTitle,
    message: customerBody,
    link: `/board/orders?order=${ref.id}`,
  }).catch(console.error);

  return ref.id;
}

export async function createProgramOrder(
  user: UserInfo,
  program: Program,
  deliveryFee: number,
  startingDate: string,
  deliveryDetails?: { district: string; phone: string; instructions: string; coordinates?: { lat: number; lng: number } },
  visuals?: { discountAmount?: number; promoCodeApplied?: string },
  userProgramId?: string,
): Promise<string> {
  if (deliveryDetails && !deliveryDetails.district.trim()) {
    throw new Error('Le quartier de livraison est requis.');
  }

  const cleanedDeliveryDetails = deliveryDetails ? {
    district: deliveryDetails.district,
    phone: deliveryDetails.phone,
    instructions: deliveryDetails.instructions,
    ...(deliveryDetails.coordinates?.lat != null && deliveryDetails.coordinates?.lng != null
      ? { coordinates: { lat: deliveryDetails.coordinates.lat, lng: deliveryDetails.coordinates.lng } }
      : {}
    ),
  } : undefined;

  const bottleSize: BottleSize = (program.bottleSize as BottleSize) || '500ml';
  const bottlesCount = program.bottlesTotal || program.durationDays || 3;
  const pricePerBottle = Math.round(program.price / bottlesCount);

  const orderLinesWithLabels: OrderLine[] = [
    {
      bottleSize,
      bottleSizeLabel: BOTTLE_LABELS[bottleSize] || '500ml',
      quantity: bottlesCount,
      bottleBasePriceSnapshot: pricePerBottle,
      pricePerBottle,
      lineTotal: program.price,
    },
  ];

  const totalPrice = Math.max(0, program.price + deliveryFee - (visuals?.discountAmount ?? 0));

  const ref = doc(collection(db, COLLECTIONS.ORDERS));
  const order: Omit<Order, 'createdAt' | 'updatedAt'> = {
    id: ref.id,
    type: 'program',
    userId: user.uid,
    userNameSnapshot: user.name,
    userEmailSnapshot: user.email,
    ...(user.phone ? { userPhoneSnapshot: user.phone } : {}),
    cocktailId: program.id,
    cocktailNameSnapshot: `Cure ${program.title} (${program.durationDays} jours)`,
    programId: program.id,
    programTitleSnapshot: program.title,
    programGoal: program.goal,
    programDurationDays: program.durationDays,
    programBottlesTotal: bottlesCount,
    ...(userProgramId ? { userProgramId } : {}),
    startingDate,
    hasAddedSugar: false,
    orderLines: orderLinesWithLabels,
    deliveryFee,
    totalPrice,
    status: OrderStatus.PENDING,
    ...(cleanedDeliveryDetails ? { deliveryDetails: cleanedDeliveryDetails } : {}),
    ...(program.imageUrl ? { cocktailImageSnapshot: program.imageUrl } : {}),
    ...(visuals?.discountAmount ? { discountAmount: visuals.discountAmount } : {}),
    ...(visuals?.promoCodeApplied ? { promoCodeApplied: visuals.promoCodeApplied } : {}),
  };

  await setDoc(ref, {
    ...order,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  const orderTitle = 'Nouvelle commande de cure !';
  const receivedTitle = 'Commande de cure reçue !';
  const orderBody = `${user.name} a commandé la cure "${program.title}" (${program.durationDays} jours - ${program.price.toLocaleString()} XAF).`;
  const customerBody = `Votre commande pour la cure "${program.title}" (${program.durationDays} jours) a bien été enregistrée.`;

  notifyAdmins({
    title: orderTitle,
    message: orderBody,
    link: `/board/orders?tab=programs&order=${ref.id}`,
  }).catch(console.error);

  sendPushNotification({
    title: orderTitle,
    body: orderBody,
    url: `/board/orders?tab=programs&order=${ref.id}`,
    audience: 'admins',
    tag: `order-new-${ref.id}`,
    skipInApp: true,
  }).catch(console.error);

  createNotification({
    userId: user.uid,
    title: receivedTitle,
    message: customerBody,
    link: `/board/orders?tab=programs&order=${ref.id}`,
  }).catch(console.error);

  return ref.id;
}

/**
 * Recherche une commande de programme active (non terminée/non annulée) pour un utilisateur et une cure donnés.
 */
export async function getActiveProgramOrder(
  userId: string,
  programId: string,
  userProgramId?: string
): Promise<Order | null> {
  const q = query(
    collection(db, COLLECTIONS.ORDERS),
    where('userId', '==', userId),
    where('type', '==', 'program'),
    where('programId', '==', programId)
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;

  const orders = snap.docs
    .map((d) => ({ id: d.id, ...d.data() } as Order))
    .filter((o) => o.status !== OrderStatus.CANCELLED && o.status !== OrderStatus.DELIVERED);

  if (!orders.length) return null;

  // Si on a un userProgramId, on privilégie la commande qui correspond exactement à cette instance
  if (userProgramId) {
    const exact = orders.find((o) => o.userProgramId === userProgramId);
    if (exact) return exact;
  }

  // Sinon la plus récente
  return orders.sort((a, b) => {
    const aTime = a.createdAt?.toMillis?.() || 0;
    const bTime = b.createdAt?.toMillis?.() || 0;
    return bTime - aTime;
  })[0];
}

/**
 * Commande un jus individuel d'un programme.
 * Si une commande de ce programme existe déjà (en cours), le jus s'ajoute ou s'incrémente dans celle-ci.
 * Sinon, une nouvelle commande de programme est initiée avec ce jus comme première ligne.
 */
export async function orderProgramJuice(
  user: UserInfo,
  userProgram: UserProgram,
  dayItem: ProgramDayItem,
  deliveryDetails?: { district: string; phone: string; instructions: string; coordinates?: { lat: number; lng: number } },
  deliveryFee: number = 1000,
): Promise<{ orderId: string; isNewOrder: boolean; updatedJuiceCount: number; juiceName: string }> {
  const dayNumber = dayItem.dayNumber || dayItem.day;
  const juiceName = dayItem.cocktailName || dayItem.juiceName || `Jus Jour ${dayNumber}`;
  const timingLabel = dayItem.timingLabel || PROGRAM_TIMING_LABELS[dayItem.timing] || 'Au réveil';
  const fruitNames = dayItem.fruitNames || dayItem.fruits || [];

  // Calcul du prix unitaire du flacon (500ml)
  const duration = userProgram.durationDays || userProgram.programSnapshot?.durationDays || 3;
  const bottlesTotal = userProgram.programSnapshot?.bottlesTotal || duration;
  const programPrice = userProgram.programSnapshot?.price || 0;
  const pricePerBottle = programPrice > 0 ? Math.round(programPrice / bottlesTotal) : 2500;

  const existingOrder = await getActiveProgramOrder(user.uid, userProgram.programId, userProgram.id);

  if (existingOrder) {
    // ── CAS 1 : Une commande ouverte existe déjà pour ce programme ──
    // On regroupe / incrémente le jus dans cette commande existante
    const currentJuiceItems: ProgramJuiceOrderItem[] = existingOrder.programJuiceItems || [];
    const existingIndex = currentJuiceItems.findIndex(
      (it) => it.dayNumber === dayNumber && it.juiceName.toLowerCase() === juiceName.toLowerCase()
    );

    let updatedJuiceItems: ProgramJuiceOrderItem[];
    if (existingIndex >= 0) {
      updatedJuiceItems = currentJuiceItems.map((item, idx) => {
        if (idx === existingIndex) {
          const newQty = item.quantity + 1;
          return {
            ...item,
            quantity: newQty,
            totalPrice: newQty * item.pricePerBottle,
            orderedAt: new Date().toISOString(),
          };
        }
        return item;
      });
    } else {
      const newItem: ProgramJuiceOrderItem = {
        id: `${dayNumber}-${Date.now()}`,
        dayNumber,
        juiceName,
        timingLabel,
        fruitNames,
        quantity: 1,
        bottleSize: '500ml',
        pricePerBottle,
        totalPrice: pricePerBottle,
        orderedAt: new Date().toISOString(),
      };
      updatedJuiceItems = [...currentJuiceItems, newItem];
    }

    const totalJuiceBottles = updatedJuiceItems.reduce((acc, it) => acc + it.quantity, 0);
    const juicesSubtotal = updatedJuiceItems.reduce((acc, it) => acc + it.totalPrice, 0);
    const fee = existingOrder.deliveryFee ?? deliveryFee;
    const newTotalPrice = juicesSubtotal + fee;

    const updatedOrderLines: OrderLine[] = [
      {
        bottleSize: '500ml',
        bottleSizeLabel: '500ml',
        quantity: totalJuiceBottles,
        bottleBasePriceSnapshot: pricePerBottle,
        pricePerBottle,
        lineTotal: juicesSubtotal,
      },
    ];

    const orderRef = doc(db, COLLECTIONS.ORDERS, existingOrder.id);
    await updateDoc(orderRef, {
      programJuiceItems: updatedJuiceItems,
      orderLines: updatedOrderLines,
      totalPrice: newTotalPrice,
      programBottlesTotal: totalJuiceBottles,
      cocktailNameSnapshot: `Cure ${userProgram.programTitle} (${totalJuiceBottles} jus)`,
      updatedAt: serverTimestamp(),
    });

    // Notifications
    const orderTitle = 'Jus ajouté à la cure !';
    const orderBody = `${user.name} a ajouté le jus Jour ${dayNumber} (« ${juiceName} ») à sa commande de cure "${userProgram.programTitle}" (${totalJuiceBottles} flacons au total).`;
    const customerBody = `Le jus Jour ${dayNumber} (« ${juiceName} ») a été ajouté à votre commande de cure "${userProgram.programTitle}".`;

    notifyAdmins({
      title: orderTitle,
      message: orderBody,
      link: `/board/orders?tab=programs&order=${existingOrder.id}`,
    }).catch(console.error);

    sendPushNotification({
      title: orderTitle,
      body: orderBody,
      url: `/board/orders?tab=programs&order=${existingOrder.id}`,
      audience: 'admins',
      tag: `order-update-${existingOrder.id}`,
      skipInApp: true,
    }).catch(console.error);

    createNotification({
      userId: user.uid,
      title: 'Jus ajouté à votre commande de cure !',
      message: customerBody,
      link: `/board/orders?tab=programs&order=${existingOrder.id}`,
    }).catch(console.error);

    return {
      orderId: existingOrder.id,
      isNewOrder: false,
      updatedJuiceCount: totalJuiceBottles,
      juiceName,
    };
  } else {
    // ── CAS 2 : Pas encore de commande ouverte pour cette cure ──
    // On initialise la commande de cure avec ce premier jus
    if (deliveryDetails && !deliveryDetails.district.trim()) {
      throw new Error('Le quartier de livraison est requis pour initialiser la commande.');
    }

    const cleanedDeliveryDetails = deliveryDetails ? {
      district: deliveryDetails.district,
      phone: deliveryDetails.phone,
      instructions: deliveryDetails.instructions,
      ...(deliveryDetails.coordinates?.lat != null && deliveryDetails.coordinates?.lng != null
        ? { coordinates: { lat: deliveryDetails.coordinates.lat, lng: deliveryDetails.coordinates.lng } }
        : {}
      ),
    } : undefined;

    const newItem: ProgramJuiceOrderItem = {
      id: `${dayNumber}-${Date.now()}`,
      dayNumber,
      juiceName,
      timingLabel,
      fruitNames,
      quantity: 1,
      bottleSize: '500ml',
      pricePerBottle,
      totalPrice: pricePerBottle,
      orderedAt: new Date().toISOString(),
    };

    const initialOrderLines: OrderLine[] = [
      {
        bottleSize: '500ml',
        bottleSizeLabel: '500ml',
        quantity: 1,
        bottleBasePriceSnapshot: pricePerBottle,
        pricePerBottle,
        lineTotal: pricePerBottle,
      },
    ];

    const ref = doc(collection(db, COLLECTIONS.ORDERS));
    const newOrder: Omit<Order, 'createdAt' | 'updatedAt'> = {
      id: ref.id,
      type: 'program',
      userId: user.uid,
      userNameSnapshot: user.name,
      userEmailSnapshot: user.email,
      ...(user.phone ? { userPhoneSnapshot: user.phone } : {}),
      cocktailId: userProgram.programId,
      cocktailNameSnapshot: `Cure ${userProgram.programTitle} - Jus Jour ${dayNumber}`,
      programId: userProgram.programId,
      programTitleSnapshot: userProgram.programTitle,
      programGoal: userProgram.programGoal,
      programDurationDays: userProgram.durationDays,
      programBottlesTotal: 1,
      userProgramId: userProgram.id,
      startingDate: userProgram.startDate,
      hasAddedSugar: false,
      programJuiceItems: [newItem],
      orderLines: initialOrderLines,
      deliveryFee,
      totalPrice: pricePerBottle + deliveryFee,
      status: OrderStatus.PENDING,
      ...(cleanedDeliveryDetails ? { deliveryDetails: cleanedDeliveryDetails } : {}),
      ...(userProgram.programSnapshot?.imageUrl ? { cocktailImageSnapshot: userProgram.programSnapshot.imageUrl } : {}),
    };

    await setDoc(ref, {
      ...newOrder,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    const orderTitle = 'Nouvelle commande de jus de cure !';
    const receivedTitle = 'Commande de cure reçue !';
    const orderBody = `${user.name} a commandé le jus Jour ${dayNumber} (« ${juiceName} ») pour sa cure "${userProgram.programTitle}".`;
    const customerBody = `Votre commande pour le jus Jour ${dayNumber} (« ${juiceName} ») de votre cure "${userProgram.programTitle}" a bien été enregistrée.`;

    notifyAdmins({
      title: orderTitle,
      message: orderBody,
      link: `/board/orders?tab=programs&order=${ref.id}`,
    }).catch(console.error);

    sendPushNotification({
      title: orderTitle,
      body: orderBody,
      url: `/board/orders?tab=programs&order=${ref.id}`,
      audience: 'admins',
      tag: `order-new-${ref.id}`,
      skipInApp: true,
    }).catch(console.error);

    createNotification({
      userId: user.uid,
      title: receivedTitle,
      message: customerBody,
      link: `/board/orders?tab=programs&order=${ref.id}`,
    }).catch(console.error);

    return {
      orderId: ref.id,
      isNewOrder: true,
      updatedJuiceCount: 1,
      juiceName,
    };
  }
}

function mapOrderSnapshot(snapshot: QuerySnapshot): Order[] {
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Order));
}

export function subscribeToUserOrders(
  userId: string,
  callback: (orders: Order[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  const q = query(
    collection(db, COLLECTIONS.ORDERS),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc'),
  );
  return onSnapshot(
    q,
    (snapshot) => callback(mapOrderSnapshot(snapshot)),
    (err) => {
      console.error('subscribeToUserOrders failed:', err);
      onError?.(err);
    },
  );
}

export function subscribeToAllOrders(
  callback: (orders: Order[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  const q = query(
    collection(db, COLLECTIONS.ORDERS),
    orderBy('createdAt', 'desc'),
  );
  return onSnapshot(
    q,
    (snapshot) => callback(mapOrderSnapshot(snapshot)),
    (err) => {
      console.error('subscribeToAllOrders failed:', err);
      onError?.(err);
    },
  );
}

export function subscribeToOrder(
  orderId: string,
  callback: (order: Order | null) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  const orderRef = doc(db, COLLECTIONS.ORDERS, orderId);
  return onSnapshot(
    orderRef,
    (snapshot) => {
      if (!snapshot.exists()) {
        callback(null);
        return;
      }
      callback({ id: snapshot.id, ...snapshot.data() } as Order);
    },
    (err) => {
      console.error('subscribeToOrder failed:', err);
      onError?.(err);
    },
  );
}

export async function getUserOrders(userId: string): Promise<Order[]> {
  try {
    const q = query(
      collection(db, COLLECTIONS.ORDERS),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Order));
  } catch (error) {
    console.error(error);
    return [];
  }
}

export async function getAllOrders(): Promise<Order[]> {
  const q = query(
    collection(db, COLLECTIONS.ORDERS),
    orderBy('createdAt', 'desc'),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Order));
}

export async function updateOrderStatus(orderId: string, status: OrderStatus): Promise<void> {
  const orderRef = doc(db, COLLECTIONS.ORDERS, orderId);
  const snap = await getDoc(orderRef);

  await updateDoc(orderRef, {
    status,
    updatedAt: serverTimestamp(),
  });

  if (snap.exists()) {
    const order = snap.data() as Order;
    const label = statusLabel(status);
    const updateBody = i18n.t('notifications.customerOrderUpdateBody', { cocktailName: order.cocktailNameSnapshot, statusLabel: label });
    const updateTitle = i18n.t('notifications.orderUpdate');
    const pushTitle = i18n.t('notifications.orderUpdatePushTitle');

    createNotification({
      userId: order.userId,
      title: updateTitle,
      message: updateBody,
      link: `/board/orders?order=${orderId}`,
    }).catch(console.error);

    sendPushNotification({
      targetUid: order.userId,
      title: pushTitle,
      body: updateBody,
      url: `/board/orders?order=${orderId}`,
      tag: `order-update-${orderId}`,
      skipInApp: true,
    });
  }
}

export async function cancelOrder(orderId: string): Promise<void> {
  const orderRef = doc(db, COLLECTIONS.ORDERS, orderId);
  const snap = await getDoc(orderRef);

  await updateDoc(orderRef, {
    status: OrderStatus.CANCELLED,
    updatedAt: serverTimestamp(),
  });

  if (snap.exists()) {
    const order = snap.data() as Order;
    const canceledTitle = i18n.t('notifications.orderCanceled');
    const adminCancelBody = i18n.t('notifications.adminCancelOrderBody', { userName: order.userNameSnapshot, cocktailName: order.cocktailNameSnapshot });
    const customerCancelBody = i18n.t('notifications.customerCancelOrderBody', { cocktailName: order.cocktailNameSnapshot });

    notifyAdmins({
      title: canceledTitle,
      message: adminCancelBody,
      link: `/board/orders?order=${orderId}`,
    }).catch(console.error);

    createNotification({
      userId: order.userId,
      title: canceledTitle,
      message: customerCancelBody,
      link: `/board/orders?order=${orderId}`,
    }).catch(console.error);

    sendPushNotification({
      targetUid: order.userId,
      title: canceledTitle,
      body: customerCancelBody,
      url: `/board/orders?order=${orderId}`,
      tag: `order-cancel-${orderId}`,
      skipInApp: true,
    });
  }
}

export async function deleteOrderCompletely(orderId: string): Promise<void> {
  const orderRef = doc(db, COLLECTIONS.ORDERS, orderId);
  await deleteDoc(orderRef);
}

/** Enregistre ou met à jour les dépenses réelles et le bénéfice pour une commande */
export async function updateOrderExpenses(
  orderId: string,
  expenses: OrderExpenses,
): Promise<void> {
  const orderRef = doc(db, COLLECTIONS.ORDERS, orderId);
  await updateDoc(orderRef, {
    expenses,
    updatedAt: serverTimestamp(),
  });
}


