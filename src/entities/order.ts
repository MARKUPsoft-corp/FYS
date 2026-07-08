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
  totalPrice: number;           // figé au moment de la commande
  status: OrderStatus;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
