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
export const HERO_SLIDES_DOC_ID = 'heroSlides';

/** Slide de la hero page d'accueil client */
export interface HeroSlide {
  id: string;
  imageUrl: string;
  breakoutImageUrl?: string;
  label: string;
  title: string;
  highlight: string;
  titleEnd: string;
  cta: string;
  ctaLink: string;
  order: number;
}

export interface HeroSlidesSettings {
  slides: HeroSlide[];
  updatedAt?: Timestamp;
}

export const DEFAULT_HERO_SLIDES: HeroSlide[] = [
  {
    id: 'slide-1',
    imageUrl: 'https://images.pexels.com/photos/158053/fresh-orange-juice-squeezed-refreshing-citrus-158053.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1',
    breakoutImageUrl: 'https://images.pexels.com/photos/338713/pexels-photo-338713.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1',
    label: 'Notre signature',
    title: 'Créez votre',
    highlight: 'élixir',
    titleEnd: 'de vie.',
    cta: 'Composer un jus',
    ctaLink: '/lab',
    order: 0,
  },
  {
    id: 'slide-2',
    imageUrl: 'https://images.pexels.com/photos/1337825/pexels-photo-1337825.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1',
    breakoutImageUrl: 'https://images.pexels.com/photos/42059/citrus-diet-food-fresh-42059.jpeg?auto=compress&cs=tinysrgb&w=600',
    label: 'Fruits frais du jour',
    title: 'Boost ton',
    highlight: 'énergie',
    titleEnd: 'dès maintenant.',
    cta: 'Voir le catalogue',
    ctaLink: '/board/catalogue',
    order: 1,
  },
  {
    id: 'slide-3',
    imageUrl: 'https://images.pexels.com/photos/109275/pexels-photo-109275.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1',
    breakoutImageUrl: 'https://images.pexels.com/photos/1603901/pexels-photo-1603901.jpeg?auto=compress&cs=tinysrgb&w=600',
    label: 'NutriFYS actif',
    title: 'Prends soin de',
    highlight: 'toi',
    titleEnd: 'chaque jour.',
    cta: 'Mon profil santé',
    ctaLink: '/board/profile',
    order: 2,
  },
];

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
