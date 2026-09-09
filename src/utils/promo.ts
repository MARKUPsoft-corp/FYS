import type { PricingSettings } from '@/entities/settings';

export const PROMO_STORAGE_KEY = 'fys_promo_code';

/**
 * Récupère le code promo actif enregistré dans la session ou le stockage local.
 */
export function getStoredPromoCode(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const code = sessionStorage.getItem(PROMO_STORAGE_KEY) || localStorage.getItem(PROMO_STORAGE_KEY);
    return code ? code.trim().toUpperCase() : null;
  } catch {
    return null;
  }
}

/**
 * Enregistre un code promo dans la session et le stockage local,
 * et émet un événement 'fys:promo-updated' pour que tous les composants soient synchronisés.
 */
export function setStoredPromoCode(code: string): void {
  if (typeof window === 'undefined' || !code) return;
  const cleanCode = code.trim().toUpperCase();
  try {
    sessionStorage.setItem(PROMO_STORAGE_KEY, cleanCode);
    localStorage.setItem(PROMO_STORAGE_KEY, cleanCode);
    window.dispatchEvent(new CustomEvent('fys:promo-updated', { detail: { code: cleanCode } }));
  } catch {
    // Ignore les restrictions de stockage (navigation privée)
  }
}

/**
 * Efface le code promo stocké (ex: après utilisation ou expiration).
 */
export function clearStoredPromoCode(): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(PROMO_STORAGE_KEY);
    localStorage.removeItem(PROMO_STORAGE_KEY);
    window.dispatchEvent(new CustomEvent('fys:promo-updated', { detail: { code: null } }));
  } catch {
    // Ignore
  }
}

/**
 * Capture le code promo depuis les paramètres d'URL (?promo=... ou ?code=...)
 * et l'enregistre dans le stockage.
 */
export function capturePromoCodeFromUrl(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const params = new URLSearchParams(window.location.search);
    const promoParam = params.get('promo') || params.get('code');
    if (promoParam && promoParam.trim()) {
      const clean = promoParam.trim().toUpperCase();
      setStoredPromoCode(clean);
      return clean;
    }
  } catch {
    // Ignore
  }
  return null;
}

/**
 * Vérifie si la date d'expiration d'une promotion est encore valide.
 */
export function isPromoDateValid(expiresAt?: { toDate?: () => Date } | null): boolean {
  if (!expiresAt) return true;
  try {
    if (typeof expiresAt.toDate === 'function') {
      return expiresAt.toDate().getTime() > Date.now();
    }
    return true;
  } catch {
    return true;
  }
}

export interface PromoValidationResult {
  code: string;
  isValid: boolean;
  isExpired: boolean;
  isActive: boolean;
  discountAmount: number;
  type: 'public' | 'reorder' | null;
  description: string;
}

/**
 * Valide un code promo contre les paramètres de tarification Firestore.
 */
export function validatePromoCode(
  rawCode: string | null | undefined,
  pricing: PricingSettings | null | undefined,
): PromoValidationResult | null {
  if (!rawCode || !pricing) return null;
  const code = rawCode.trim().toUpperCase();
  const publicCode = (pricing.promoPublicCode || 'FLYER').trim().toUpperCase();

  // 1. Promo publique / Flyer
  const isPublicMatch = code === publicCode || code === 'FLYER' || code === 'PROMO';
  if (isPublicMatch) {
    const isActive = pricing.promoFlyerActive ?? false;
    const isExpired = !isPromoDateValid(pricing.promoFlyerExpiresAt);
    const isValid = isActive && !isExpired;
    const discountAmount = isValid ? (pricing.promoFlyerDiscount ?? 0) : 0;
    return {
      code,
      isValid,
      isExpired,
      isActive,
      discountAmount,
      type: 'public',
      description: isValid
        ? `Réduction de ${discountAmount.toLocaleString()} XAF`
        : isExpired
        ? 'Ce lien promotionnel a expiré.'
        : 'Ce lien promotionnel est actuellement désactivé.',
    };
  }

  // 2. Promo fidélité étiquette / Re-commande
  if (code === 'REORDER') {
    const isActive = pricing.promoReorderActive ?? false;
    const isExpired = !isPromoDateValid(pricing.promoReorderExpiresAt);
    const isValid = isActive && !isExpired;
    const discountAmount = isValid ? (pricing.promoReorderDiscount ?? 0) : 0;
    return {
      code,
      isValid,
      isExpired,
      isActive,
      discountAmount,
      type: 'reorder',
      description: isValid
        ? `Réduction fidélité de ${discountAmount.toLocaleString()} XAF`
        : isExpired
        ? 'Ce lien promotionnel a expiré.'
        : 'Ce lien promotionnel est actuellement désactivé.',
    };
  }

  return {
    code,
    isValid: false,
    isExpired: false,
    isActive: false,
    discountAmount: 0,
    type: null,
    description: 'Code promotionnel non reconnu.',
  };
}

/**
 * Construit l'URL complète d'un lien promotionnel.
 */
export function generatePublicPromoUrl(origin: string, targetPath = '/lab', promoCode = 'FLYER'): string {
  const cleanOrigin = (origin || '').replace(/\/+$/, '');
  const cleanPath = targetPath.startsWith('/') ? targetPath : `/${targetPath}`;
  const separator = cleanPath.includes('?') ? '&' : '?';
  return `${cleanOrigin}${cleanPath}${separator}promo=${encodeURIComponent(promoCode.trim().toUpperCase())}`;
}
