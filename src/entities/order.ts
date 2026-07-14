import { Timestamp } from 'firebase/firestore';

export enum OrderStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled',
}

export interface Order {
  id: string;
  userId: string;               // FK vers User.uid
  cocktailId: string;           // FK vers Cocktail.id
  cocktailNameSnapshot: string; // dénormalisé pour affichage rapide
  quantity: number;
  cocktailPriceSnapshot: number; // Cocktail.totalPrice figé à la commande
  deliveryFee: number;           // DELIVERY_FEE (500) ou 0 si retrait
  totalPrice: number;            // cocktailPriceSnapshot + deliveryFee
  status: OrderStatus;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
