import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import {
  COLLECTIONS,
  DEFAULT_PRICING,
  PRICING_DOC_ID,
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
