export type LabItem = {
  id: string;
  emoji: string;
  name: string;
};

export type LabSupplement = LabItem & {
  why: string;
};

export const LAB_FRUITS: LabItem[] = [
  { id: 'ananas', emoji: '🍍', name: 'Ananas' },
  { id: 'pasteque', emoji: '🍉', name: 'Pastèque' },
  { id: 'mangue', emoji: '🥭', name: 'Mangue' },
  { id: 'papaye', emoji: '🍈', name: 'Papaye' },
  { id: 'banane', emoji: '🍌', name: 'Banane' },
  { id: 'citron', emoji: '🍋', name: 'Citron' },
  { id: 'corossol', emoji: '🌺', name: 'Corossol' },
  { id: 'baobab', emoji: '🌿', name: 'Baobab' },
  { id: 'orange', emoji: '🍊', name: 'Orange' },
  { id: 'pomme', emoji: '🍎', name: 'Pomme' },
  { id: 'folere', emoji: '🌸', name: 'Foléré' },
  { id: 'goyave', emoji: '🥝', name: 'Goyave' },
];

export const LAB_SUPPLEMENTS: LabSupplement[] = [
  {
    id: 'gingembre',
    emoji: '🫚',
    name: 'Gingembre',
    why: "Il renforce l'effet anti-inflammatoire de l'ananas et stimule la digestion. Idéal pour compléter un cocktail Immunité.",
  },
  {
    id: 'noix_de_coco',
    emoji: '🥥',
    name: 'Coco',
    why: "Apporte des électrolytes naturels et adoucit l'acidité du citron pour un cocktail plus équilibré.",
  },
  {
    id: 'menthe',
    emoji: '🌿',
    name: 'Menthe',
    why: "Favorise la fraîcheur et la digestion. Parfait en fin de composition pour une note tonique légère.",
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
