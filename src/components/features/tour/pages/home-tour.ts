import type { KageDemoStep } from '@rasenganjs/kage-demo';
import { buildTourSteps } from '../tour-step-builder';

const STEPS = [
  {
    target: '#tour-home-hero',
    content: {
      title: 'Votre accueil FYS',
      description: 'Découvrez les nouveautés, l’inspiration du moment et les accès rapides vers vos espaces préférés.',
      nextLabel: 'Continuer',
    },
  },
  {
    target: '#tour-home-lab',
    content: {
      title: 'Le FYS Lab',
      description: 'Composez un cocktail sur mesure : choisissez vos fruits, ajoutez des suppléments, puis laissez NutriFYS analyser votre recette.',
      hint: 'C’est le cœur de l’expérience FYS — un tap et vous y êtes.',
    },
  },
  {
    target: '#tour-home-creations',
    content: {
      title: 'Nos créations',
      description: 'Parcourez des idées de mélanges et inspirez-vous avant de créer le vôtre dans le Lab ou le catalogue.',
      isLast: true,
    },
  },
] as const;

export function buildHomeTourSteps(): KageDemoStep[] {
  return buildTourSteps(STEPS.length, [...STEPS]);
}
