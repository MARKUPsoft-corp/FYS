import { Timestamp } from 'firebase/firestore';

// ── Enums / union types ────────────────────────────────────────────────────

export type CocktailRole = 'acid' | 'sweet' | 'antioxidant' | 'mineral' | 'base';
export type DataStatus   = 'complete' | 'partial';
export type GlycemicBadge = 'low' | 'moderate' | 'high' | 'variable';

// ── Shared building blocks ─────────────────────────────────────────────────

/** A single measured nutrient with an optional NRV (Nutrient Reference Value) % */
export interface NutrientValue {
  value: number;
  nrvPercent?: number;
}

// ── Glycemic index ─────────────────────────────────────────────────────────

export interface GlycemicIndex {
  min?: number;
  max?: number;
  badge: GlycemicBadge;
  glycemicLoad?: number;
  note?: string;
}

// ── Nutrients (per 100g unless otherwise noted) ───────────────────────────

export interface FruitMacros {
  calories_kcal?: number;
  water_g?: number;
  carbs_g?: number;
  sugar_g?: number;
  fiber_g?: number;
  fat_g?: number;
  saturatedFat_g?: number;
  protein_g?: number;
}

export interface FruitVitamins {
  vitaminC_mg?: NutrientValue;
  vitaminA_ug?: NutrientValue;
  vitaminB1_mg?: NutrientValue;
  vitaminB2_mg?: NutrientValue;
  vitaminB3_mg?: NutrientValue;
  vitaminB5_mg?: NutrientValue;
  vitaminB6_mg?: NutrientValue;
  vitaminB9_ug?: NutrientValue;
  vitaminE_mg?: NutrientValue;
  vitaminK1_ug?: NutrientValue;
}

export interface FruitMinerals {
  calcium_mg?: NutrientValue;
  iron_mg?: NutrientValue;
  magnesium_mg?: NutrientValue;
  phosphorus_mg?: NutrientValue;
  potassium_mg?: NutrientValue;
  zinc_mg?: NutrientValue;
  copper_mg?: NutrientValue;
  manganese_mg?: NutrientValue;
  sodium_mg?: NutrientValue;
}

export interface FruitNutrients {
  macros: FruitMacros;
  vitamins: FruitVitamins;
  minerals: FruitMinerals;
}

// ── Bioactive compounds ────────────────────────────────────────────────────

export interface Bioactive {
  name: string;
  approximateValue?: string;
  description?: string;
}

// ── NutriFYS health profile ────────────────────────────────────────────────

export interface FruitHealthProfile {
  benefitBadges: string[];       // display labels, original language from nutritionist
  okRules?: string;              // best cocktail combinations
  precautions?: string;
  contraindications?: string;
  nutritionistNote?: string;
}

// ── Fruit document — collection: "fruits/{id}" ────────────────────────────
// Un même item peut servir de fruit principal ET/OU de supplément (Lab stepper).

export interface Fruit {
  id: string;
  name: string;
  scientificName?: string;
  price?: number;               // prix fixe d'ajout au cocktail (XAF)
  categoryIds: string[];         // many-to-many with Category
  imageUrl?: string;

  /**
   * Disponible à l'étape 1 du Lab (sélection fruits).
   * Défaut: true si le champ est absent (rétrocompatibilité).
   */
  isMainFruit?: boolean;
  /**
   * Disponible à l'étape 2 du Lab (suppléments).
   * Défaut: false si le champ est absent.
   */
  isSupplement?: boolean;

  // Quick-access summary (for listings and AI prompts)
  benefits: string[];            // English labels, e.g. ["Immunity", "Digestion"]
  warnings: string[];            // e.g. ["Avoid with kidney disease"]
  cocktailRole?: CocktailRole;
  avoidIf?: string[];
  timing?: string;

  // Rich scientific data
  glycemicIndex?: GlycemicIndex;
  nutrients: FruitNutrients;
  bioactives?: Bioactive[];

  // NutriFYS analysis profile
  healthProfile?: FruitHealthProfile;

  // Data quality
  dataStatus: DataStatus;
  sources?: string[];
  validatedByNutritionist: boolean;

  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ── Category document — collection: "categories/{id}" ─────────────────────

export interface Category {
  id: string;
  name: string;
}

/** Fruit principal (étape 1) — défaut true pour les docs sans le champ */
export function isUsableAsMainFruit(fruit: Fruit): boolean {
  return fruit.isMainFruit !== false;
}

/** Supplément (étape 2) — défaut false */
export function isUsableAsSupplement(fruit: Fruit): boolean {
  return fruit.isSupplement === true;
}
