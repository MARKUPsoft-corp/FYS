import type { KageDemoStep } from '@rasenganjs/kage-demo';
import { buildTourSteps } from '../tour-step-builder';

const STEPS = [
  {
    target: '#tour-catalogue-grid',
    content: {
      title: 'Le catalogue FYS',
      description: 'Cocktails prêts à commander, créés et validés par l’équipe et la communauté.',
      nextLabel: 'Voir',
    },
  },
  {
    target: '#tour-catalogue-search',
    content: {
      title: 'Recherche rapide',
      description: 'Tapez le nom d’un cocktail pour filtrer la liste instantanément.',
    },
  },
  {
    target: '#tour-catalogue-grid',
    content: {
      title: 'Commander en un tap',
      description: 'Ouvrez une fiche pour voir les ingrédients, l’analyse NutriFYS et passer commande.',
      isLast: true,
    },
  },
] as const;

export function buildCatalogueTourSteps(): KageDemoStep[] {
  return buildTourSteps(STEPS.length, [...STEPS]);
}
