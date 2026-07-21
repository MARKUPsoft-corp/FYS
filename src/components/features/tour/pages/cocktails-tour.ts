import type { KageDemoStep } from '@rasenganjs/kage-demo';
import { buildTourSteps } from '../tour-step-builder';

const STEPS = [
  {
    target: '#tour-cocktails-create',
    content: {
      title: 'Vos cocktails',
      description: 'Retrouvez ici toutes vos créations personnelles et celles partagées par la communauté.',
      nextLabel: 'Explorer',
    },
  },
  {
    target: '#tour-cocktails-tabs',
    content: {
      title: 'Mes cocktails / Publics',
      description: '« Mes cocktails » : vos sauvegardes privées. « Publics » : les mélanges publiés par d’autres utilisateurs.',
    },
  },
  {
    target: '#tour-cocktails-create',
    content: {
      title: 'Créer un nouveau mélange',
      description: 'Ce bouton vous envoie directement au FYS Lab pour composer une nouvelle recette.',
    },
  },
  {
    target: '#tour-cocktails-grid',
    content: {
      title: 'Gérer vos créations',
      description: 'Ouvrez une carte pour commander, publier votre mélange ou le supprimer.',
      isLast: true,
    },
  },
] as const;

export function buildCocktailsTourSteps(): KageDemoStep[] {
  return buildTourSteps(STEPS.length, [...STEPS]);
}
