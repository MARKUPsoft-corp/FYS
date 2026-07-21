import { useEffect, useState } from 'react';
import type { Order } from '@/entities';
import {
  subscribeToAllOrders,
  subscribeToOrder,
  subscribeToUserOrders,
} from '@/services/order';

export function useOrders(userId: string | undefined, isAdmin: boolean) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setOrders([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const unsubscribe = isAdmin
      ? subscribeToAllOrders((data) => {
          setOrders(data);
          setIsLoading(false);
        })
      : subscribeToUserOrders(userId, (data) => {
          setOrders(data);
          setIsLoading(false);
        });

    return unsubscribe;
  }, [userId, isAdmin]);

  return { orders, isLoading };
}

export function useUserOrders(userId: string | undefined, enabled = true) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!userId || !enabled) {
      setOrders([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    return subscribeToUserOrders(userId, (data) => {
      setOrders(data);
      setIsLoading(false);
    });
  }, [userId, enabled]);

  return { orders, isLoading };
}

/** Live document listener — keeps an open detail sheet in sync instantly. */
export function useOrder(orderId: string | undefined, enabled = true) {
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(!!orderId && enabled);

  useEffect(() => {
    if (!orderId || !enabled) {
      setOrder(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    return subscribeToOrder(orderId, (data) => {
      setOrder(data);
      setIsLoading(false);
    });
  }, [orderId, enabled]);

  return { order, isLoading };
}
