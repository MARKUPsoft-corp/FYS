import { getLabItemById, type LabItem } from './lab-items';

export type ProposalVerdict = 'beneficial' | 'neutral' | 'caution' | 'not_recommended';

export type CocktailProposal = {
  name: string;
  profileLabel: string;
  fruitIds: string[];
  supplementIds: string[];
  benefits: string[];
  explanation: string;
  score: number;
  verdict: ProposalVerdict;
};

export type NutriFYSReply = {
  text: string;
  proposal?: CocktailProposal;
};

const PROPOSALS: Record<string, CocktailProposal> = {
  energy: {
    name: 'Sunrise Boost',
    profileLabel: 'Énergie',
    fruitIds: ['orange', 'banane'],
    supplementIds: ['gingembre'],
    benefits: ['Vitamine C', 'Énergie durable', 'Circulation'],
    explanation:
      "L'orange apporte un coup de vitamine C, la banane des glucides à libération progressive et le gingembre stimule naturellement la circulation.",
    score: 88,
    verdict: 'beneficial',
  },
  immunity: {
    name: 'Bouclier Tropical',
    profileLabel: 'Immunité',
    fruitIds: ['ananas', 'mangue', 'citron'],
    supplementIds: ['gingembre'],
    benefits: ['Immunité', 'Antioxydants', 'Anti-inflammatoire'],
    explanation:
      "Ce trio combine vitamine C, bromélaïne et antioxydants. Le gingembre renforce l'effet anti-inflammatoire pour un cocktail Immunité complet.",
    score: 92,
    verdict: 'beneficial',
  },
  digestion: {
    name: 'Zen Digest',
    profileLabel: 'Digestion',
    fruitIds: ['papaye', 'citron'],
    supplementIds: ['menthe'],
    benefits: ['Digestion', 'Apaisement', 'Légèreté'],
    explanation:
      "La papaye contient de la papaïne pour faciliter la digestion, le citron aide l'assimilation et la menthe apaise l'estomac.",
    score: 85,
    verdict: 'beneficial',
  },
  sleep: {
    name: 'Moon Calm',
    profileLabel: 'Détente',
    fruitIds: ['pasteque', 'baobab'],
    supplementIds: ['menthe'],
    benefits: ['Hydratation', 'Apaisement', 'Minéraux'],
    explanation:
      "Un mélange léger et peu sucré, idéal en soirée. La pastèque hydrate, le baobab apporte des minéraux et la menthe favorise la détente.",
    score: 79,
    verdict: 'neutral',
  },
  diabetes: {
    name: 'Glycémie Douce',
    profileLabel: 'Équilibre',
    fruitIds: ['goyave', 'pomme', 'baobab'],
    supplementIds: [],
    benefits: ['Index glycémique modéré', 'Fibres', 'Minéraux'],
    explanation:
      "Fruits à index glycémique modéré, mieux consommés le matin. Consultez votre médecin pour toute adaptation à votre traitement.",
    score: 72,
    verdict: 'caution',
  },
  sport: {
    name: 'Recovery Pro',
    profileLabel: 'Récupération',
    fruitIds: ['banane', 'baobab'],
    supplementIds: ['gingembre'],
    benefits: ['Potassium', 'Minéraux', 'Anti-inflammatoire'],
    explanation:
      "Banane et baobab rechargent en potassium et minéraux, le gingembre soutient la récupération musculaire après l'effort.",
    score: 90,
    verdict: 'beneficial',
  },
};

export function getNutriFYSReply(input: string): NutriFYSReply {
  const text = input.toLowerCase();

  if (text.includes('énergi') || text.includes('matin') || text.includes('fatigue')) {
    return {
      text: "Voici ma proposition pour un boost énergétique ce matin :",
      proposal: PROPOSALS.energy,
    };
  }
  if (text.includes('immunit') || text.includes('défense')) {
    return {
      text: "Pour renforcer vos défenses, je vous compose ce cocktail Immunité :",
      proposal: PROPOSALS.immunity,
    };
  }
  if (text.includes('digest') || text.includes('repas') || text.includes('léger')) {
    return {
      text: "Pour une digestion légère après le repas, voici ce que je recommande :",
      proposal: PROPOSALS.digestion,
    };
  }
  if (text.includes('soir') || text.includes('détente') || text.includes('coucher') || text.includes('apais')) {
    return {
      text: "Pour le soir, privilégiez cette composition apaisante :",
      proposal: PROPOSALS.sleep,
    };
  }
  if (text.includes('diabét') || text.includes('sucre')) {
    return {
      text: "Si vous êtes sensible au sucre, voici une composition prudente à consommer de préférence le matin :",
      proposal: PROPOSALS.diabetes,
    };
  }
  if (text.includes('sport') || text.includes('récup')) {
    return {
      text: "Pour la récupération sportive, je vous propose ce mélange :",
      proposal: PROPOSALS.sport,
    };
  }

  return {
    text: "Pour vous proposer un cocktail visuel adapté, précisez votre objectif : énergie, immunité, digestion, détente ou récupération sportive. Utilisez les suggestions ci-dessous.",
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
  switch (verdict) {
    case 'beneficial':
      return 'Bénéfique';
    case 'neutral':
      return 'Neutre';
    case 'caution':
      return 'Prudence';
    case 'not_recommended':
      return 'Déconseillé';
  }
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
