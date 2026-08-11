import {
  collection, doc, setDoc, updateDoc, getDocs, getDoc,
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
    userId: user.uid,
    userNameSnapshot: user.name,
    userEmailSnapshot: user.email,
    ...(user.phone ? { userPhoneSnapshot: user.phone } : {}),
    cocktailId: cocktail.id,
    cocktailNameSnapshot: cocktail.name,
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

  // Send push notification to all admins
  sendPushNotification({
    title: orderTitle,
    body: orderBody,
    url: `/board/orders?order=${ref.id}`,
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
    });
  }
}
