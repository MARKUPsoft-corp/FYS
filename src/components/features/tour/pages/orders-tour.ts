import type { KageDemoStep } from '@rasenganjs/kage-demo';
import { buildTourSteps } from '../tour-step-builder';

const STEPS = [
  {
    target: '#tour-orders-search',
    content: {
      title: 'Suivi des commandes',
      description: 'Toutes vos commandes en un seul endroit, mises à jour en temps réel.',
      nextLabel: 'Voir',
    },
  },
  {
    target: '#tour-orders-filters',
    content: {
      title: 'Filtres intelligents',
      description: 'Filtrez par période (jour, semaine, mois…) et par statut : en attente, en préparation, livrée…',
    },
  },
  {
    target: '#tour-orders-filters',
    content: {
      title: 'Détail et progression',
      description: 'Ouvrez une commande pour voir la timeline de préparation, la facture et la fiche NutriFYS.',
      isLast: true,
    },
  },
] as const;

export function buildOrdersTourSteps(): KageDemoStep[] {
  return buildTourSteps(STEPS.length, [...STEPS]);
}
