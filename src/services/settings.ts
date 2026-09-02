import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import {
  COLLECTIONS,
  DEFAULT_HERO_SLIDES,
  DEFAULT_PRICING,
  DEFAULT_LANDING_IMAGES,
  HERO_SLIDES_DOC_ID,
  PRICING_DOC_ID,
  LANDING_IMAGES_DOC_ID,
  type HeroSlide,
  type HeroSlidesSettings,
  type PricingSettings,
  type LandingImagesSettings,
} from '@/entities';

export async function getPricingSettings(): Promise<PricingSettings> {
  const snap = await getDoc(doc(db, COLLECTIONS.SETTINGS, PRICING_DOC_ID));
  if (!snap.exists()) return { ...DEFAULT_PRICING };
  const data = snap.data() as Partial<PricingSettings>;
  return {
    bottle500mlBase: data.bottle500mlBase ?? DEFAULT_PRICING.bottle500mlBase,
    bottle1LBase: data.bottle1LBase ?? DEFAULT_PRICING.bottle1LBase,
    deliveryFee: data.deliveryFee ?? DEFAULT_PRICING.deliveryFee,
    promoFlyerDiscount: data.promoFlyerDiscount ?? 0,
    promoFlyerActive: data.promoFlyerActive ?? false,
    promoFlyerExpiresAt: data.promoFlyerExpiresAt ?? null,
    promoReorderDiscount: data.promoReorderDiscount ?? 0,
    promoReorderActive: data.promoReorderActive ?? false,
    promoReorderExpiresAt: data.promoReorderExpiresAt ?? null,
    maxMainFruits: data.maxMainFruits ?? DEFAULT_PRICING.maxMainFruits,
    maxSupplements: data.maxSupplements ?? DEFAULT_PRICING.maxSupplements,
    ...(data.updatedAt ? { updatedAt: data.updatedAt } : {}),
  };
}

export async function updatePricingSettings(
  data: Omit<PricingSettings, 'updatedAt'>,
): Promise<void> {
  await setDoc(
    doc(db, COLLECTIONS.SETTINGS, PRICING_DOC_ID),
    {
      bottle500mlBase: data.bottle500mlBase,
      bottle1LBase: data.bottle1LBase,
      deliveryFee: data.deliveryFee,
      promoFlyerDiscount: data.promoFlyerDiscount ?? 0,
      promoFlyerActive: data.promoFlyerActive ?? false,
      promoFlyerExpiresAt: data.promoFlyerExpiresAt ?? null,
      promoReorderDiscount: data.promoReorderDiscount ?? 0,
      promoReorderActive: data.promoReorderActive ?? false,
      promoReorderExpiresAt: data.promoReorderExpiresAt ?? null,
      maxMainFruits: data.maxMainFruits ?? DEFAULT_PRICING.maxMainFruits,
      maxSupplements: data.maxSupplements ?? DEFAULT_PRICING.maxSupplements,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}

export async function getHeroSlides(): Promise<HeroSlide[]> {
  const snap = await getDoc(doc(db, COLLECTIONS.SETTINGS, HERO_SLIDES_DOC_ID));
  if (!snap.exists()) return DEFAULT_HERO_SLIDES.map((s) => ({ ...s }));
  const data = snap.data() as Partial<HeroSlidesSettings>;
  const slides = Array.isArray(data.slides) ? data.slides : [];
  if (slides.length === 0) return DEFAULT_HERO_SLIDES.map((s) => ({ ...s }));
  return [...slides].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

export async function updateHeroSlides(slides: HeroSlide[]): Promise<void> {
  const normalized = slides.map((s, i) => ({ ...s, order: i }));
  await setDoc(
    doc(db, COLLECTIONS.SETTINGS, HERO_SLIDES_DOC_ID),
    {
      slides: normalized,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}

export async function getLandingImagesSettings(): Promise<LandingImagesSettings> {
  const snap = await getDoc(doc(db, COLLECTIONS.SETTINGS, LANDING_IMAGES_DOC_ID));
  if (!snap.exists()) return { ...DEFAULT_LANDING_IMAGES };
  const data = snap.data() as Partial<LandingImagesSettings>;
  return {
    hero: data.hero ?? DEFAULT_LANDING_IMAGES.hero,
    featureNutrify: data.featureNutrify ?? DEFAULT_LANDING_IMAGES.featureNutrify,
    featureCatalog: data.featureCatalog ?? DEFAULT_LANDING_IMAGES.featureCatalog,
    nutrifysAssistant: data.nutrifysAssistant ?? DEFAULT_LANDING_IMAGES.nutrifysAssistant,
    gallery1: data.gallery1 ?? DEFAULT_LANDING_IMAGES.gallery1,
    gallery2: data.gallery2 ?? DEFAULT_LANDING_IMAGES.gallery2,
    gallery3: data.gallery3 ?? DEFAULT_LANDING_IMAGES.gallery3,
    step1: data.step1 ?? DEFAULT_LANDING_IMAGES.step1,
    step2: data.step2 ?? DEFAULT_LANDING_IMAGES.step2,
    step3: data.step3 ?? DEFAULT_LANDING_IMAGES.step3,
    creation1Image: data.creation1Image ?? DEFAULT_LANDING_IMAGES.creation1Image,
    creation1Label: data.creation1Label ?? DEFAULT_LANDING_IMAGES.creation1Label,
    creation2Image: data.creation2Image ?? DEFAULT_LANDING_IMAGES.creation2Image,
    creation2Label: data.creation2Label ?? DEFAULT_LANDING_IMAGES.creation2Label,
    creation3Image: data.creation3Image ?? DEFAULT_LANDING_IMAGES.creation3Image,
    creation3Label: data.creation3Label ?? DEFAULT_LANDING_IMAGES.creation3Label,
    creation4Image: data.creation4Image ?? DEFAULT_LANDING_IMAGES.creation4Image,
    creation4Label: data.creation4Label ?? DEFAULT_LANDING_IMAGES.creation4Label,
  };
}

export async function updateLandingImagesSettings(
  data: Partial<Omit<LandingImagesSettings, 'updatedAt'>>,
): Promise<void> {
  await setDoc(
    doc(db, COLLECTIONS.SETTINGS, LANDING_IMAGES_DOC_ID),
    {
      ...data,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}
