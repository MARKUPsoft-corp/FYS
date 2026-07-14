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
  fruitName: string;      // dénormalisé pour éviter une lecture supplémentaire
  quantityGrams: number;  // utile pour l'analyse nutritionnelle et l'IA
  priceSnapshot: number;  // snapshot de Fruit.price au moment de la création
}

export interface NutrientInfo {
  pourcentage: number; // % AJR (apport journalier recommandé) couvert par ce cocktail
  valeur: string;      // valeur absolue estimée, ex. "45 mg", "2.3 g"
}

export type NiveauBenefice = 'faible' | 'modéré' | 'élevé';

export interface BeneficeCible {
  nom: string;           // ex. "immunité", "énergie", "digestion"
  niveau: NiveauBenefice;
}

export interface AIAnalysis {
  verdict: AIVerdict;
  score: number; // 0-100
  notes: string; // explication générée par l'IA
  profilNutritionnel: {
    vitamineC?: NutrientInfo;
    vitamineA?: NutrientInfo;
    fibres?: NutrientInfo;
    potassium?: NutrientInfo;
    sucresNaturels?: NutrientInfo;
    antioxydants?: NutrientInfo;
  };
  beneficesCibles: BeneficeCible[];
  interactionsFruits: string[]; // synergies et effets produits par le mélange (2-3 points)
  conseil: string;              // conseils de consommation pour maximiser les bénéfices
  analyzedAt: Timestamp;
}

export interface Cocktail {
  id: string;
  name: string;
  description?: string;
  imageUrl?: string;
  tag?: string;           // display label shown on the card (e.g. "New", "Popular")
  type: CocktailType;
  createdBy: string;      // uid du créateur (admin ou utilisateur)
  isActive: boolean;      // permet de retirer du catalogue sans supprimer
  isPublic: boolean;      // visible par d'autres utilisateurs ou strictement privé
  ingredients: CocktailIngredient[];
  basePrice: number;      // prix de base 50cl — BASE_COCKTAIL_PRICE (1500 XAF)
  totalPrice: number;     // basePrice + sum(ingredients[].priceSnapshot)
  aiAnalysis?: AIAnalysis; // absent tant que l'IA n'a pas encore analysé
  parentCocktailId?: string; // présent si ce cocktail est un clone d'un cocktail du catalogue
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
