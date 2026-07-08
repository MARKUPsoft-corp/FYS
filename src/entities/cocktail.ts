import { Timestamp } from 'firebase/firestore';

export enum CocktailType {
  CATALOG = 'catalog', // créé par un admin, visible publiquement
  CUSTOM = 'custom',   // créé par un utilisateur
}

export enum AIVerdict {
  BENEFICIAL = 'beneficial',
  NEUTRAL = 'neutral',
  CAUTION = 'caution',           // acceptable mais avec réserve
  NOT_RECOMMENDED = 'not_recommended',
}

export interface CocktailIngredient {
  fruitId: string;
  fruitName: string;            // dénormalisé pour éviter une lecture supplémentaire
  quantityGrams: number;
  pricePerGramSnapshot: number; // figé au moment de la création du cocktail
}

export interface AIAnalysis {
  verdict: AIVerdict;
  score: number; // 0-100
  notes: string; // explication générée par l'IA
  analyzedAt: Timestamp;
}

export interface Cocktail {
  id: string;
  name: string;
  description?: string;
  imageUrl?: string;
  type: CocktailType;
  createdBy: string;      // uid du créateur (admin ou utilisateur)
  isActive: boolean;      // permet de retirer du catalogue sans supprimer
  isPublic: boolean;      // visible par d'autres utilisateurs ou strictement privé
  ingredients: CocktailIngredient[];
  totalPrice: number;     // calculé à partir des ingredients
  aiAnalysis?: AIAnalysis; // absent tant que l'IA n'a pas encore analysé
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
