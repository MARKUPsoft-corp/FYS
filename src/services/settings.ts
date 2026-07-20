import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import {
  COLLECTIONS,
  DEFAULT_HERO_SLIDES,
  DEFAULT_PRICING,
  HERO_SLIDES_DOC_ID,
  PRICING_DOC_ID,
  type HeroSlide,
  type HeroSlidesSettings,
  type PricingSettings,
} from '@/entities';

export async function getPricingSettings(): Promise<PricingSettings> {
  const snap = await getDoc(doc(db, COLLECTIONS.SETTINGS, PRICING_DOC_ID));
  if (!snap.exists()) return { ...DEFAULT_PRICING };
  const data = snap.data() as Partial<PricingSettings>;
  return {
    bottle500mlBase: data.bottle500mlBase ?? DEFAULT_PRICING.bottle500mlBase,
    bottle1LBase: data.bottle1LBase ?? DEFAULT_PRICING.bottle1LBase,
    deliveryFee: data.deliveryFee ?? DEFAULT_PRICING.deliveryFee,
    ...(data.updatedAt ? { updatedAt: data.updatedAt } : {}),
  };
}

export async function updatePricingSettings(
  data: Pick<PricingSettings, 'bottle500mlBase' | 'bottle1LBase' | 'deliveryFee'>,
): Promise<void> {
  await setDoc(
    doc(db, COLLECTIONS.SETTINGS, PRICING_DOC_ID),
    {
      bottle500mlBase: data.bottle500mlBase,
      bottle1LBase: data.bottle1LBase,
      deliveryFee: data.deliveryFee,
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
