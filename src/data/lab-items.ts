export type LabItem = {
  id: string;
  emoji: string;
  name: string;
  nameEn?: string;
};

export type LabSupplement = LabItem & {
  why: string;
  whyEn?: string;
};

export const LAB_FRUITS: LabItem[] = [
  { id: 'ananas', emoji: '🍍', name: 'Ananas', nameEn: 'Pineapple' },
  { id: 'pasteque', emoji: '🍉', name: 'Pastèque', nameEn: 'Watermelon' },
  { id: 'mangue', emoji: '🥭', name: 'Mangue', nameEn: 'Mango' },
  { id: 'papaye', emoji: '🍈', name: 'Papaye', nameEn: 'Papaya' },
  { id: 'banane', emoji: '🍌', name: 'Banane', nameEn: 'Banana' },
  { id: 'citron', emoji: '🍋', name: 'Citron', nameEn: 'Lemon' },
  { id: 'corossol', emoji: '🌺', name: 'Corossol', nameEn: 'Soursop' },
  { id: 'baobab', emoji: '🌿', name: 'Baobab', nameEn: 'Baobab' },
  { id: 'orange', emoji: '🍊', name: 'Orange', nameEn: 'Orange' },
  { id: 'pomme', emoji: '🍎', name: 'Pomme', nameEn: 'Apple' },
  { id: 'folere', emoji: '🌸', name: 'Foléré', nameEn: 'Foléré' },
  { id: 'goyave', emoji: '🥝', name: 'Goyave', nameEn: 'Guava' },
];

export const LAB_SUPPLEMENTS: LabSupplement[] = [
  {
    id: 'gingembre',
    emoji: '🫚',
    name: 'Gingembre',
    nameEn: 'Ginger',
    why: "Il renforce l'effet anti-inflammatoire de l'ananas et stimule la digestion. Idéal pour compléter un cocktail Immunité.",
    whyEn: "It enhances pineapple's anti-inflammatory effect and stimulates digestion. Ideal to complement an Immunity cocktail.",
  },
  {
    id: 'noix_de_coco',
    emoji: '🥥',
    name: 'Coco',
    nameEn: 'Coconut',
    why: "Apporte des électrolytes naturels et adoucit l'acidité du citron pour un cocktail plus équilibré.",
    whyEn: "Provides natural electrolytes and softens lemon's acidity for a more balanced cocktail.",
  },
  {
    id: 'menthe',
    emoji: '🌿',
    name: 'Menthe',
    nameEn: 'Mint',
    why: "Favorise la fraîcheur et la digestion. Parfait en fin de composition pour une note tonique légère.",
    whyEn: "Promotes freshness and digestion. Perfect as a finishing touch for a light tonic note.",
  },
];

export type CocktailRecommendation = {
  profileLabel: string;
  recommendedIds: string[];
  highlightedSupplementId: string;
};

const IMMUNITY_FRUITS = new Set(['ananas', 'mangue', 'citron']);

export function getCocktailRecommendation(fruitIds: string[]): CocktailRecommendation {
  const isImmunity =
    fruitIds.length >= 2 &&
    fruitIds.every((id) => IMMUNITY_FRUITS.has(id)) &&
    fruitIds.includes('ananas') &&
    fruitIds.includes('mangue') &&
    fruitIds.includes('citron');

  if (isImmunity) {
    return {
      profileLabel: 'Immunité',
      recommendedIds: ['gingembre', 'noix_de_coco', 'menthe'],
      highlightedSupplementId: 'gingembre',
    };
  }

  return {
    profileLabel: 'Équilibre',
    recommendedIds: ['gingembre', 'menthe'],
    highlightedSupplementId: 'gingembre',
  };
}

export function getLabItemById(id: string): LabItem | LabSupplement | undefined {
  return LAB_FRUITS.find((f) => f.id === id) ?? LAB_SUPPLEMENTS.find((s) => s.id === id);
}
