import { Timestamp } from 'firebase/firestore';

export enum OrderStatus {
  PENDING   = 'pending',    // reçue, en attente de confirmation admin
  CONFIRMED = 'confirmed',  // confirmée par l'admin
  PREPARING = 'preparing',  // en cours de préparation
  READY     = 'ready',      // prête à être livrée / récupérée
  DELIVERED = 'delivered',  // livrée au client
  CANCELLED = 'cancelled',  // annulée
}

import type { AIAnalysis } from './cocktail';

export interface Order {
  id: string;
  userId: string;
  userNameSnapshot: string;
  userEmailSnapshot: string;
  userPhoneSnapshot?: string;
  cocktailId: string;
  cocktailNameSnapshot: string;
  quantity: number;
  cocktailPriceSnapshot: number; // Cocktail.totalPrice figé à la commande
  deliveryFee: number;
  totalPrice: number;            // cocktailPriceSnapshot * quantity + deliveryFee
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
