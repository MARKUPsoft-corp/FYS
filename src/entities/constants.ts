export const COLLECTIONS = {
  USERS: 'users',
  FRUITS: 'fruits',
  CATEGORIES: 'categories',
  COCKTAILS: 'cocktails',
  ORDERS: 'orders',
  CHATS: 'chats',
  CONVERSATIONS: 'conversations',
} as const;

// Sous-collection profil santé, chemin: users/{uid}/profile/main
export const PROFILE_DOC_ID = 'main';

// ── Pricing constants (XAF) ───────────────────────────────────────────────────
export const BASE_COCKTAIL_PRICE = 1500; // base 50cl (eau, sucre, etc.)
export const DELIVERY_FEE = 500;         // supplément livraison
