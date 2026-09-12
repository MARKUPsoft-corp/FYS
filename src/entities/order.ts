import { Timestamp } from 'firebase/firestore';
import type { AIAnalysis, CocktailIngredient } from './cocktail';
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

/** Dépense individuelle enregistrée pour une commande */
export interface OrderExpenseItem {
  id: string;
  label: string;
  type: 'fruit' | 'supplement' | 'packaging' | 'other';
  quantity?: number;
  unit?: string;
  cost: number; // en XAF
}

/** Bilan des dépenses réelles et rentabilité de la commande */
export interface OrderExpenses {
  items: OrderExpenseItem[];
  totalExpenses: number; // Somme des coûts en XAF
  netProfit: number; // totalPrice - totalExpenses
  marginPercentage: number; // (netProfit / totalPrice) * 100
  updatedAt?: Timestamp;
  updatedBy?: string;
}

export interface Order {
  id: string;
  userId: string;
  userNameSnapshot: string;
  userEmailSnapshot: string;
  userPhoneSnapshot?: string;
  cocktailId: string;
  cocktailNameSnapshot: string;
  /** Ingrédients figés à la commande avec grammage et rôles (fruits vs suppléments) */
  cocktailIngredientsSnapshot?: CocktailIngredient[];
  
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
  discountAmount?: number;
  promoCodeApplied?: string;
  status: OrderStatus;
  deliveryDetails?: {
    district: string;
    phone: string;
    instructions: string;
    coordinates?: { lat: number; lng: number };
  };
  aiAnalysisSnapshot?: AIAnalysis;
  /** Option sucre (false ou undefined = 100% naturel sans sucre) */
  hasAddedSugar?: boolean;
  /** Type de commande : 'classic' (cocktails à la carte) ou 'program' (cure FYS Programme) */
  type?: 'classic' | 'program';
  /** Référence du programme si type === 'program' */
  programId?: string;
  programTitleSnapshot?: string;
  programGoal?: string;
  programDurationDays?: number;
  programBottlesTotal?: number;
  userProgramId?: string;
  startingDate?: string;

  /** Image figée à la commande (catalogue ou fruit principal / collage source) */
  cocktailImageSnapshot?: string;
  /** Photos fruits figées pour collage si pas d'image cocktail */
  ingredientImageSnapshots?: string[];
  /** Dépenses réelles et bénéfice calculé pour la commande */
  expenses?: OrderExpenses;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

