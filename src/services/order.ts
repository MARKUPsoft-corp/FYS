import { collection, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { COLLECTIONS, DELIVERY_FEE, OrderStatus } from '@/entities';
import type { Cocktail, Order } from '@/entities';

export async function createOrder(
  userId: string,
  cocktail: Cocktail,
  quantity: number,
): Promise<string> {
  const ref = doc(collection(db, COLLECTIONS.ORDERS));
  const order: Omit<Order, 'createdAt' | 'updatedAt'> = {
    id: ref.id,
    userId,
    cocktailId: cocktail.id,
    cocktailNameSnapshot: cocktail.name,
    quantity,
    cocktailPriceSnapshot: cocktail.totalPrice,
    deliveryFee: DELIVERY_FEE,
    totalPrice: cocktail.totalPrice * quantity + DELIVERY_FEE,
    status: OrderStatus.PENDING,
  };
  await setDoc(ref, {
    ...order,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}
