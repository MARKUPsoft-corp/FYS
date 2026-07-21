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

const STATUS_NAMES = {
  [OrderStatus.PENDING]: 'mise en attente',
  [OrderStatus.CONFIRMED]: 'confirmée',
  [OrderStatus.PREPARING]: 'mise en préparation',
  [OrderStatus.READY]: 'prête pour livraison',
  [OrderStatus.DELIVERED]: 'livrée',
  [OrderStatus.CANCELLED]: 'annulée',
};

type UserInfo = {
  uid: string;
  name: string;
  email: string;
  phone?: string;
};

export type CreateOrderPricing = {
  bottleSize: BottleSize;
  bottleBasePrice: number;
  pricePerBottle: number;
  deliveryFee: number;
};

export type CreateOrderVisuals = {
  cocktailImageSnapshot?: string;
  ingredientImageSnapshots?: string[];
};

export async function createOrder(
  user: UserInfo,
  cocktail: Cocktail,
  quantity: number,
  pricing: CreateOrderPricing,
  deliveryDetails?: { district: string; phone: string; instructions: string },
  visuals?: CreateOrderVisuals,
): Promise<string> {
  const cover =
    visuals?.cocktailImageSnapshot ??
    cocktail.imageUrl ??
    visuals?.ingredientImageSnapshots?.[0];

  const fruitImgs = visuals?.ingredientImageSnapshots;

  const ref = doc(collection(db, COLLECTIONS.ORDERS));
  const order: Omit<Order, 'createdAt' | 'updatedAt'> = {
    id: ref.id,
    userId: user.uid,
    userNameSnapshot: user.name,
    userEmailSnapshot: user.email,
    ...(user.phone ? { userPhoneSnapshot: user.phone } : {}),
    cocktailId: cocktail.id,
    cocktailNameSnapshot: cocktail.name,
    quantity,
    bottleSize: pricing.bottleSize,
    bottleSizeLabel: BOTTLE_LABELS[pricing.bottleSize],
    bottleBasePriceSnapshot: pricing.bottleBasePrice,
    cocktailPriceSnapshot: pricing.pricePerBottle,
    deliveryFee: pricing.deliveryFee,
    totalPrice: pricing.pricePerBottle * quantity + pricing.deliveryFee,
    status: OrderStatus.PENDING,
    ...(deliveryDetails ? { deliveryDetails } : {}),
    ...(cocktail.aiAnalysis ? { aiAnalysisSnapshot: cocktail.aiAnalysis } : {}),
    ...(cover ? { cocktailImageSnapshot: cover } : {}),
    ...(fruitImgs?.length ? { ingredientImageSnapshots: fruitImgs } : {}),
  };
  await setDoc(ref, {
    ...order,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  notifyAdmins({
    title: 'Nouvelle commande 🎉',
    message: `${user.name} a commandé ${quantity}× ${cocktail.name} (${BOTTLE_LABELS[pricing.bottleSize]}).`,
    link: `/board/orders?order=${ref.id}`,
  }).catch(console.error);

  createNotification({
    userId: user.uid,
    title: 'Commande enregistrée 🎉',
    message: `Votre commande de ${quantity}× ${cocktail.name} (${BOTTLE_LABELS[pricing.bottleSize]}) a bien été reçue.`,
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
    const label = STATUS_NAMES[status] || status;
    createNotification({
      userId: order.userId,
      title: 'Mise à jour commande',
      message: `Votre commande de ${order.cocktailNameSnapshot} est ${label}.`,
      link: `/board/orders?order=${orderId}`,
    }).catch(console.error);
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
    notifyAdmins({
      title: 'Commande annulée ❌',
      message: `${order.userNameSnapshot} a annulé sa commande de ${order.cocktailNameSnapshot}.`,
      link: `/board/orders?order=${orderId}`,
    }).catch(console.error);

    createNotification({
      userId: order.userId,
      title: 'Commande annulée',
      message: `Votre commande de ${order.cocktailNameSnapshot} a été annulée.`,
      link: `/board/orders?order=${orderId}`,
    }).catch(console.error);
  }
}
