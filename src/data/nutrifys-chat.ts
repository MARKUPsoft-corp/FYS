import i18n from '@/i18n';
import { getLabItemById, type LabItem } from './lab-items';

export type ProposalVerdict = 'beneficial' | 'neutral' | 'caution' | 'not_recommended';

export type CocktailProposal = {
  name: string;
  profileLabel: string;
  profileLabelEn?: string;
  fruitIds: string[];
  supplementIds: string[];
  benefits: string[];
  benefitsEn?: string[];
  explanation: string;
  explanationEn?: string;
  score: number;
  verdict: ProposalVerdict;
};

export type NutriFYSReply = {
  text: string;
  textEn?: string;
  proposal?: CocktailProposal;
};

const PROPOSALS: Record<string, CocktailProposal> = {
  energy: {
    name: 'Sunrise Boost',
    profileLabel: 'Énergie',
    profileLabelEn: 'Energy',
    fruitIds: ['orange', 'banane'],
    supplementIds: ['gingembre'],
    benefits: ['Vitamine C', 'Énergie durable', 'Circulation'],
    benefitsEn: ['Vitamin C', 'Sustainable Energy', 'Circulation'],
    explanation:
      "L'orange apporte un coup de vitamine C, la banane des glucides à libération progressive et le gingembre stimule naturellement la circulation.",
    explanationEn:
      "Orange provides a Vitamin C boost, banana offers slow-release carbs, and ginger naturally stimulates circulation.",
    score: 88,
    verdict: 'beneficial',
  },
  immunity: {
    name: 'Bouclier Tropical',
    profileLabel: 'Immunité',
    profileLabelEn: 'Immunity',
    fruitIds: ['ananas', 'mangue', 'citron'],
    supplementIds: ['gingembre'],
    benefits: ['Immunité', 'Antioxydants', 'Anti-inflammatoire'],
    benefitsEn: ['Immunity', 'Antioxidants', 'Anti-inflammatory'],
    explanation:
      "Ce trio combine vitamine C, bromélaïne et antioxydants. Le gingembre renforce l'effet anti-inflammatoire pour un cocktail Immunité complet.",
    explanationEn:
      "This trio combines Vitamin C, bromelain, and antioxidants. Ginger boosts the anti-inflammatory effect for a complete Immunity cocktail.",
    score: 92,
    verdict: 'beneficial',
  },
  digestion: {
    name: 'Zen Digest',
    profileLabel: 'Digestion',
    profileLabelEn: 'Digestion',
    fruitIds: ['papaye', 'citron'],
    supplementIds: ['menthe'],
    benefits: ['Digestion', 'Apaisement', 'Légèreté'],
    benefitsEn: ['Digestion', 'Soothing', 'Lightness'],
    explanation:
      "La papaye contient de la papaïne pour faciliter la digestion, le citron aide l'assimilation et la menthe apaise l'estomac.",
    explanationEn:
      "Papaya contains papain to aid digestion, lemon helps assimilation, and mint soothes the stomach.",
    score: 85,
    verdict: 'beneficial',
  },
  sleep: {
    name: 'Moon Calm',
    profileLabel: 'Détente',
    profileLabelEn: 'Relaxation',
    fruitIds: ['pasteque', 'baobab'],
    supplementIds: ['menthe'],
    benefits: ['Hydratation', 'Apaisement', 'Minéraux'],
    benefitsEn: ['Hydration', 'Calm', 'Minerals'],
    explanation:
      "Un mélange léger et peu sucré, idéal en soirée. La pastèque hydrate, le baobab apporte des minéraux et la menthe favorise la détente.",
    explanationEn:
      "A light, low-sugar blend ideal for the evening. Watermelon hydrates, baobab provides minerals, and mint promotes relaxation.",
    score: 79,
    verdict: 'neutral',
  },
  diabetes: {
    name: 'Glycémie Douce',
    profileLabel: 'Équilibre',
    profileLabelEn: 'Balance',
    fruitIds: ['goyave', 'pomme', 'baobab'],
    supplementIds: [],
    benefits: ['Index glycémique modéré', 'Fibres', 'Minéraux'],
    benefitsEn: ['Moderate Glycemic Index', 'Fiber', 'Minerals'],
    explanation:
      "Fruits à index glycémique modéré, mieux consommés le matin. Consultez votre médecin pour toute adaptation à votre traitement.",
    explanationEn:
      "Fruits with a moderate glycemic index, best consumed in the morning. Consult your doctor for any adjustments to your treatment.",
    score: 72,
    verdict: 'caution',
  },
  sport: {
    name: 'Recovery Pro',
    profileLabel: 'Récupération',
    profileLabelEn: 'Recovery',
    fruitIds: ['banane', 'baobab'],
    supplementIds: ['gingembre'],
    benefits: ['Potassium', 'Minéraux', 'Anti-inflammatoire'],
    benefitsEn: ['Potassium', 'Minerals', 'Anti-inflammatory'],
    explanation:
      "Banane et baobab rechargent en potassium et minéraux, le gingembre soutient la récupération musculaire après l'effort.",
    explanationEn:
      "Banana and baobab replenish potassium and minerals, while ginger supports muscle recovery after exercise.",
    score: 90,
    verdict: 'beneficial',
  },
};

export function getNutriFYSReply(input: string): NutriFYSReply {
  const text = input.toLowerCase();

  if (text.includes('énergi') || text.includes('matin') || text.includes('fatigue') || text.includes('energy')) {
    return {
      text: "Voici ma proposition pour un boost énergétique ce matin :",
      textEn: "Here's my proposal for an energy boost this morning:",
      proposal: PROPOSALS.energy,
    };
  }
  if (text.includes('immunit') || text.includes('défense') || text.includes('immun')) {
    return {
      text: "Pour renforcer vos défenses, je vous compose ce cocktail Immunité :",
      textEn: "To boost your defenses, I've put together this Immunity cocktail:",
      proposal: PROPOSALS.immunity,
    };
  }
  if (text.includes('digest') || text.includes('repas') || text.includes('léger')) {
    return {
      text: "Pour une digestion légère après le repas, voici ce que je recommande :",
      textEn: "For light digestion after a meal, here's what I recommend:",
      proposal: PROPOSALS.digestion,
    };
  }
  if (text.includes('soir') || text.includes('détente') || text.includes('coucher') || text.includes('apais')) {
    return {
      text: "Pour le soir, privilégiez cette composition apaisante :",
      textEn: "For the evening, try this soothing blend:",
      proposal: PROPOSALS.sleep,
    };
  }
  if (text.includes('diabét') || text.includes('sucre')) {
    return {
      text: "Si vous êtes sensible au sucre, voici une composition prudente à consommer de préférence le matin :",
      textEn: "If you're sensitive to sugar, here's a careful blend to enjoy preferably in the morning:",
      proposal: PROPOSALS.diabetes,
    };
  }
  if (text.includes('sport') || text.includes('récup')) {
    return {
      text: "Pour la récupération sportive, je vous propose ce mélange :",
      textEn: "For sports recovery, I recommend this blend:",
      proposal: PROPOSALS.sport,
    };
  }

  return {
    text: "Pour vous proposer un cocktail visuel adapté, précisez votre objectif : énergie, immunité, digestion, détente ou récupération sportive. Utilisez les suggestions ci-dessous.",
    textEn: "To suggest a tailored cocktail, tell me your goal: energy, immunity, digestion, relaxation, or sports recovery. Use the suggestions below.",
  };
}

export function resolveProposalItems(proposal: CocktailProposal): {
  fruits: LabItem[];
  supplements: LabItem[];
} {
  const fruits = proposal.fruitIds
    .map((id) => getLabItemById(id))
    .filter((item): item is LabItem => !!item);
  const supplements = proposal.supplementIds
    .map((id) => getLabItemById(id))
    .filter((item): item is LabItem => !!item);
  return { fruits, supplements };
}

export function getVerdictLabel(verdict: ProposalVerdict): string {
  const lang = i18n.language?.startsWith('en') ? 'en' : 'fr';
  const labels = {
    fr: { beneficial: 'Bénéfique', neutral: 'Neutre', caution: 'Prudence', not_recommended: 'Déconseillé' },
    en: { beneficial: 'Beneficial', neutral: 'Neutral', caution: 'Caution', not_recommended: 'Not Recommended' },
  };
  return labels[lang][verdict];
}

export function getVerdictColor(verdict: ProposalVerdict): string {
  switch (verdict) {
    case 'beneficial':
      return '#3F6D4E';
    case 'neutral':
      return '#E0982E';
    case 'caution':
    case 'not_recommended':
      return '#C9463C';
  }
}
