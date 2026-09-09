import { Timestamp } from 'firebase/firestore';
import type { Fruit } from './fruit';

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
  /** Rôle dans le Lab : fruit principal (étape 1) ou supplément (étape 2) */
  role?: 'fruit' | 'supplement';
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
  /** Nom créatif suggéré par l'IA (éditable par l'utilisateur) */
  suggestedName?: string;
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
  /** Option d'ajout de sucre (false ou undefined = 100% naturel sans sucre) */
  hasAddedSugar?: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ── Ingrédients Helpers (Fruits principaux vs Suppléments) ───────────────────

/**
 * Détermine si un ingrédient est un supplément (vs fruit principal de base).
 * 1. Priorité absolue : rôle explicite (`ing.role === 'supplement'`).
 * 2. Fallback rétrocompatible : si le rôle n'est pas défini (ex: cocktails historiques),
 *    vérifie la configuration du fruit (`isSupplement`, catégorie d'herbes/suppléments, ou grammage $\le 30$g).
 */
export function isIngredientSupplement(
  ing: CocktailIngredient,
  fruits?: Fruit[]
): boolean {
  if (ing.role === 'supplement') return true;
  if (ing.role === 'fruit') return false;

  if (fruits?.length) {
    const fruit = fruits.find((f) => f.id === ing.fruitId);
    if (fruit) {
      if (fruit.isSupplement === true) return true;
      if (fruit.isMainFruit === false && fruit.categoryIds?.includes('supplement_herbe')) return true;
    }
  }

  // Seuil usuel pour les épices / herbes / boosters FYS
  return ing.quantityGrams > 0 && ing.quantityGrams <= 30;
}

/**
 * Sépare une liste d'ingrédients en fruits principaux et suppléments/boosters.
 */
export function partitionCocktailIngredients(
  ingredients: CocktailIngredient[] = [],
  fruits?: Fruit[]
): {
  mainFruits: CocktailIngredient[];
  supplements: CocktailIngredient[];
} {
  const mainFruits: CocktailIngredient[] = [];
  const supplements: CocktailIngredient[] = [];

  for (const ing of ingredients) {
    if (isIngredientSupplement(ing, fruits)) {
      supplements.push(ing);
    } else {
      mainFruits.push(ing);
    }
  }

  return { mainFruits, supplements };
}

/**
 * Formate un résumé texte clair différenciant les fruits principaux et les suppléments.
 * - 'separated' : "Fruits : Mangue, Ananas · Supplément(s) : Gingembre"
 * - 'ticket' : "Fruits : Mangue, Ananas\nSupplément(s) : Gingembre"
 * - 'inline' (défaut) : "Mangue, Ananas (+ Gingembre)"
 */
export function formatIngredientsSummary(
  ingredients: CocktailIngredient[] = [],
  fruits?: Fruit[],
  options?: { format?: 'inline' | 'separated' | 'ticket' }
): string {
  const { mainFruits, supplements } = partitionCocktailIngredients(ingredients, fruits);
  const mainStr = mainFruits.map((i) => i.fruitName).join(', ');
  const suppStr = supplements.map((i) => i.fruitName).join(', ');

  if (!supplements.length) return mainStr;
  if (!mainFruits.length) return suppStr;

  if (options?.format === 'separated') {
    return `${mainStr} · Supplément(s) : ${suppStr}`;
  }
  if (options?.format === 'ticket') {
    return `${mainStr}\nSupplément(s) : ${suppStr}`;
  }
  return `${mainStr} (+ ${suppStr})`;
}
