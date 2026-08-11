import { Timestamp } from 'firebase/firestore';
import i18n from '@/i18n';

/** Contenant proposé à la commande */
export type BottleSize = '500ml' | '1L';

export const BOTTLE_LABELS: Record<BottleSize, string> = {
  '500ml': i18n.t('settings.halfLiter'),
  '1L': i18n.t('settings.oneLiter'),
};

export const BOTTLE_VOLUME_LABELS: Record<BottleSize, string> = {
  '500ml': i18n.t('settings.volume50cl'),
  '1L': i18n.t('settings.volume1L'),
};

/** Document Firestore: settings/pricing */
export interface PricingSettings {
  /** Prix de base contenant 50 cl (hors fruits) */
  bottle500mlBase: number;
  /** Prix de base contenant 1 L (hors fruits) */
  bottle1LBase: number;
  deliveryFee: number;
  promoFlyerDiscount?: number;
  /** Promo Flyer activée ou non par l'admin */
  promoFlyerActive?: boolean;
  /** Date d'expiration du QR Flyer (null = pas d'expiration) */
  promoFlyerExpiresAt?: Timestamp | null;
  promoReorderDiscount?: number;
  /** Promo Étiquette activée ou non par l'admin */
  promoReorderActive?: boolean;
  /** Date d'expiration du QR Étiquette (null = pas d'expiration) */
  promoReorderExpiresAt?: Timestamp | null;
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
  label: string;
  title: string;
  highlight: string;
  titleEnd: string;
  cta: string;
  ctaLink: string;
  order: number;
  labelEn?: string;
  titleEn?: string;
  highlightEn?: string;
  titleEndEn?: string;
  ctaEn?: string;
}

export interface HeroSlidesSettings {
  slides: HeroSlide[];
  updatedAt?: Timestamp;
}

export const DEFAULT_HERO_SLIDES: HeroSlide[] = [
  {
    id: 'slide-1',
    imageUrl: 'https://images.pexels.com/photos/158053/fresh-orange-juice-squeezed-refreshing-citrus-158053.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1',
    label: 'Notre signature',
    title: 'Créez votre',
    highlight: 'élixir',
    titleEnd: 'de vie.',
    cta: 'Composer un jus',
    ctaLink: '/lab',
    order: 0,
    labelEn: 'Our Signature',
    titleEn: 'Create your',
    highlightEn: 'elixir',
    titleEndEn: 'of life.',
    ctaEn: 'Mix a juice',
  },
  {
    id: 'slide-2',
    imageUrl: 'https://images.pexels.com/photos/1337825/pexels-photo-1337825.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1',
    label: 'Fruits frais du jour',
    title: 'Boost ton',
    highlight: 'énergie',
    titleEnd: 'dès maintenant.',
    cta: 'Voir le catalogue',
    ctaLink: '/board/catalogue',
    order: 1,
    labelEn: 'Fresh Fruits',
    titleEn: 'Boost your',
    highlightEn: 'energy',
    titleEndEn: 'right now.',
    ctaEn: 'Browse catalogue',
  },
  {
    id: 'slide-3',
    imageUrl: 'https://images.pexels.com/photos/109275/pexels-photo-109275.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1',
    label: 'NutriFYS actif',
    title: 'Prends soin de',
    highlight: 'toi',
    titleEnd: 'chaque jour.',
    cta: 'Mon profil santé',
    ctaLink: '/board/profile',
    order: 2,
    labelEn: 'NutriFYS Active',
    titleEn: 'Take care of',
    highlightEn: 'yourself',
    titleEndEn: 'every day.',
    ctaEn: 'My health profile',
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
