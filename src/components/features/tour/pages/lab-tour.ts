import type { KageDemoStep } from '@rasenganjs/kage-demo';
import { buildTourSteps } from '../tour-step-builder';

const COMMON = [
  {
    target: '#tour-lab-title',
    content: {
      title: 'Bienvenue au FYS Lab',
      description: 'L’atelier où vous créez votre cocktail fruité, étape par étape, avec l’aide de NutriFYS.',
      nextLabel: 'C’est parti',
    },
  },
  {
    target: '#tour-lab-tabs',
    content: {
      title: 'Deux façons de composer',
      description: '« Je compose » pour choisir vos fruits vous-même. « NutriFYS compose » pour être guidé par le chat intelligent.',
      hint: 'Vous pouvez basculer entre les deux à tout moment.',
    },
  },
  {
    target: '#tour-lab-stepper',
    content: {
      title: 'Fruits puis suppléments',
      description: 'Étape 1 : sélectionnez jusqu’à 3 fruits de base. Étape 2 : affinez avec des suppléments adaptés à votre mélange.',
    },
  },
  {
    target: '#tour-lab-fruits',
    content: {
      title: 'Choisissez vos fruits',
      description: 'Tapez sur un fruit pour l’ajouter. Le compteur en haut à droite vous indique combien il vous reste.',
      hint: 'Au moins un fruit est nécessaire pour passer à l’étape suivante.',
    },
  },
] as const;

const MOBILE_FINISH = [
  {
    target: '#tour-lab-mobile-bar',
    content: {
      title: 'Analyser et sauvegarder',
      description: 'Une fois vos fruits choisis, appuyez sur « Suivant » puis « Analyser avec NutriFYS ». Vous pourrez ensuite sauvegarder et commander.',
    },
  },
  {
    target: '#tour-lab-notifications',
    content: {
      title: 'Restez connecté',
      description: 'La cloche vous prévient quand votre commande avance ou quand une analyse est prête.',
      isLast: true,
    },
  },
] as const;

const DESKTOP_FINISH = [
  {
    target: '#tour-lab-save-panel',
    content: {
      title: 'Panneau NutriFYS',
      description: 'Ici : nom du cocktail, analyse IA, sauvegarde et commande. Lancez l’analyse une fois votre mélange prêt.',
      isLast: true,
    },
  },
] as const;

export function buildLabTourSteps(isDesktop: boolean): KageDemoStep[] {
  const defs = isDesktop
    ? [...COMMON, ...DESKTOP_FINISH]
    : [...COMMON, ...MOBILE_FINISH];
  return buildTourSteps(defs.length, defs);
}
