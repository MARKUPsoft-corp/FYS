import {
  collection, doc, setDoc, updateDoc, getDocs, getDoc,
  serverTimestamp, query, where, orderBy,
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
    link: '/board/orders',
  }).catch(console.error);

  return ref.id;
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
      link: '/board/orders',
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
      link: '/board/orders',
    }).catch(console.error);
  }
}
