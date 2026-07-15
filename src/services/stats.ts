import {
  collection, getDocs, query, orderBy, where,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { COLLECTIONS, CocktailType, OrderStatus } from '@/entities';
import type { Order, User } from '@/entities';

export interface AdminStats {
  fruitsCount: number;
  catalogueCocktailsCount: number;
  ordersCount: number;
  ordersByStatus: Partial<Record<OrderStatus, number>>;
  usersCount: number;
  totalRevenue: number;
  recentOrders: Order[];
}

export async function getAdminStats(): Promise<AdminStats> {
  const [fruitsSnap, catalogueSnap, ordersSnap, usersSnap] = await Promise.all([
    getDocs(collection(db, COLLECTIONS.FRUITS)),
    getDocs(query(
      collection(db, COLLECTIONS.COCKTAILS),
      where('type', '==', CocktailType.CATALOG),
    )),
    getDocs(query(collection(db, COLLECTIONS.ORDERS), orderBy('createdAt', 'desc'))),
    getDocs(collection(db, COLLECTIONS.USERS)),
  ]);

  const orders = ordersSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Order));

  const ordersByStatus: Partial<Record<OrderStatus, number>> = {};
  let totalRevenue = 0;
  for (const order of orders) {
    ordersByStatus[order.status] = (ordersByStatus[order.status] ?? 0) + 1;
    if (order.status === OrderStatus.DELIVERED) {
      totalRevenue += order.totalPrice;
    }
  }

  return {
    fruitsCount: fruitsSnap.size,
    catalogueCocktailsCount: catalogueSnap.size,
    ordersCount: orders.length,
    ordersByStatus,
    usersCount: usersSnap.size,
    totalRevenue,
    recentOrders: orders.slice(0, 5),
  };
}

export async function getUsers(): Promise<User[]> {
  const snap = await getDocs(
    query(collection(db, COLLECTIONS.USERS), orderBy('createdAt', 'desc')),
  );
  return snap.docs.map((d) => ({ ...d.data() } as User));
}
