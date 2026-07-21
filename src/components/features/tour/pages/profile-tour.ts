import type { KageDemoStep } from '@rasenganjs/kage-demo';
import { buildTourSteps } from '../tour-step-builder';

const STEPS = [
  {
    target: '#tour-profile-identity',
    content: {
      title: 'Votre espace profil',
      description: 'Vos informations personnelles et votre profil santé NutriFYS, au même endroit.',
      nextLabel: 'Continuer',
    },
  },
  {
    target: '#tour-profile-health',
    content: {
      title: 'Profil santé',
      description: 'Conditions, allergies et objectifs : plus c’est complet, plus l’analyse NutriFYS est précise pour vous.',
    },
  },
  {
    target: '#tour-profile-app-tour',
    content: {
      title: 'Revoir la visite',
      description: 'Vous pouvez relancer la visite de l’app ou des pages à tout moment depuis cette section.',
      isLast: true,
    },
  },
] as const;

export function buildProfileTourSteps(): KageDemoStep[] {
  return buildTourSteps(STEPS.length, [...STEPS]);
}
