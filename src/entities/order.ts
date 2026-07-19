import { Timestamp } from 'firebase/firestore';
import type { AIAnalysis } from './cocktail';
import type { BottleSize } from './settings';

export enum OrderStatus {
  PENDING   = 'pending',
  CONFIRMED = 'confirmed',
  PREPARING = 'preparing',
  READY     = 'ready',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled',
}

export interface Order {
  id: string;
  userId: string;
  userNameSnapshot: string;
  userEmailSnapshot: string;
  userPhoneSnapshot?: string;
  cocktailId: string;
  cocktailNameSnapshot: string;
  quantity: number;
  /** Contenant choisi — optionnel pour les commandes legacy */
  bottleSize?: BottleSize;
  bottleSizeLabel?: string;
  bottleBasePriceSnapshot?: number;
  cocktailPriceSnapshot: number;
  deliveryFee: number;
  totalPrice: number;
  status: OrderStatus;
  deliveryDetails?: {
    district: string;
    phone: string;
    instructions: string;
  };
  aiAnalysisSnapshot?: AIAnalysis;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
