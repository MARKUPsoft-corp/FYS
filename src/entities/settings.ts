import { Timestamp } from 'firebase/firestore';

/** Contenant proposé à la commande */
export type BottleSize = '500ml' | '1L';

export const BOTTLE_LABELS: Record<BottleSize, string> = {
  '500ml': 'Demi-litre',
  '1L': 'Un litre',
};

export const BOTTLE_VOLUME_LABELS: Record<BottleSize, string> = {
  '500ml': '50 cl',
  '1L': '1 L',
};

/** Document Firestore: settings/pricing */
export interface PricingSettings {
  /** Prix de base contenant 50 cl (hors fruits) */
  bottle500mlBase: number;
  /** Prix de base contenant 1 L (hors fruits) */
  bottle1LBase: number;
  deliveryFee: number;
  updatedAt?: Timestamp;
}

export const DEFAULT_PRICING: PricingSettings = {
  bottle500mlBase: 1500,
  bottle1LBase: 2500,
  deliveryFee: 500,
};

export const PRICING_DOC_ID = 'pricing';

export function getBottleBasePrice(
  settings: PricingSettings,
  size: BottleSize,
): number {
  return size === '500ml' ? settings.bottle500mlBase : settings.bottle1LBase;
}

/** Somme opaque des prix fruits/suppléments (jamais affichée au client) */
export function sumIngredientPrices(
  ingredients: { priceSnapshot: number }[],
): number {
  return ingredients.reduce((sum, ing) => sum + (ing.priceSnapshot ?? 0), 0);
}

/** Prix / bouteille = base contenant + mix fruits */
export function pricePerBottle(
  settings: PricingSettings,
  size: BottleSize,
  ingredients: { priceSnapshot: number }[],
): number {
  return getBottleBasePrice(settings, size) + sumIngredientPrices(ingredients);
}
