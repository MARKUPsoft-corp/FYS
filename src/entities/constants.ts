export const COLLECTIONS = {
  USERS: 'users',
  FRUITS: 'fruits',
  CATEGORIES: 'categories',
  COCKTAILS: 'cocktails',
  ORDERS: 'orders',
  CHATS: 'chats',
  CONVERSATIONS: 'conversations',
  SETTINGS: 'settings',
} as const;

// Sous-collection profil santé, chemin: users/{uid}/profile/main
export const PROFILE_DOC_ID = 'main';

// ── Pricing defaults (XAF) — surchargés par settings/pricing en Firestore ─────
/** @deprecated Préférer PricingSettings.bottle500mlBase via getPricingSettings() */
export const BASE_COCKTAIL_PRICE = 1500;
/** @deprecated Préférer PricingSettings.deliveryFee via getPricingSettings() */
export const DELIVERY_FEE = 500;

/** Limites composition FYS Lab (client) */
export const MAX_LAB_MAIN_FRUITS = 5;
export const MAX_LAB_SUPPLEMENTS = 3;
