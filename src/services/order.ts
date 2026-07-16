import {
  collection, doc, setDoc, updateDoc, getDocs,
  serverTimestamp, query, where, orderBy,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { COLLECTIONS, DELIVERY_FEE, OrderStatus } from '@/entities';
import type { Cocktail, Order } from '@/entities';

type UserInfo = {
  uid: string;
  name: string;
  email: string;
  phone?: string;
};

export async function createOrder(
  user: UserInfo,
  cocktail: Cocktail,
  quantity: number,
): Promise<string> {
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
    cocktailPriceSnapshot: cocktail.totalPrice,
    deliveryFee: DELIVERY_FEE,
    totalPrice: cocktail.totalPrice * quantity + DELIVERY_FEE,
    status: OrderStatus.PENDING,
    ...(cocktail.aiAnalysis ? { aiAnalysisSnapshot: cocktail.aiAnalysis } : {}),
  };
  await setDoc(ref, {
    ...order,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function getUserOrders(userId: string): Promise<Order[]> {
  console.log({ userId })

  try {
    const q = query(
      collection(db, COLLECTIONS.ORDERS),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Order));
  } catch (error) {
    console.error(error)
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
  await updateDoc(doc(db, COLLECTIONS.ORDERS, orderId), {
    status,
    updatedAt: serverTimestamp(),
  });
}

export async function cancelOrder(orderId: string): Promise<void> {
  await updateDoc(doc(db, COLLECTIONS.ORDERS, orderId), {
    status: OrderStatus.CANCELLED,
    updatedAt: serverTimestamp(),
  });
}
