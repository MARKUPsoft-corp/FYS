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

/** Ligne de commande pour un format de bouteille spécifique */
export interface OrderLine {
  bottleSize: BottleSize;
  bottleSizeLabel: string;
  quantity: number;
  bottleBasePriceSnapshot: number;
  pricePerBottle: number;
  lineTotal: number;
}

export interface Order {
  id: string;
  userId: string;
  userNameSnapshot: string;
  userEmailSnapshot: string;
  userPhoneSnapshot?: string;
  cocktailId: string;
  cocktailNameSnapshot: string;
  
  /** Lignes de commande (500ml + 1L possibles dans la même commande) */
  orderLines: OrderLine[];
  
  /** Legacy fields for backward compatibility — optionnel pour les anciennes commandes */
  quantity?: number;
  bottleSize?: BottleSize;
  bottleSizeLabel?: string;
  bottleBasePriceSnapshot?: number;
  cocktailPriceSnapshot?: number;
  
  deliveryFee: number;
  totalPrice: number;
  status: OrderStatus;
  deliveryDetails?: {
    district: string;
    phone: string;
    instructions: string;
    coordinates?: { lat: number; lng: number };
  };
  aiAnalysisSnapshot?: AIAnalysis;
  /** Image figée à la commande (catalogue ou fruit principal / collage source) */
  cocktailImageSnapshot?: string;
  /** Photos fruits figées pour collage si pas d'image cocktail */
  ingredientImageSnapshots?: string[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
