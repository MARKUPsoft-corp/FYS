import type { ComponentProps } from 'react';
import type { KageDemoStep } from '@rasenganjs/kage-demo';
import { TourStepCard, type TourStepCallbacks } from './TourStepCard';

const TOTAL = 6;

function step(
  n: number,
  props: TourStepCallbacks,
  content: Omit<ComponentProps<typeof TourStepCard>, keyof TourStepCallbacks | 'step' | 'total'>,
) {
  return (
    <TourStepCard
      step={n}
      total={TOTAL}
      showPrev={n > 1}
      {...content}
      {...props}
    />
  );
}

export function buildMobileTourSteps(): KageDemoStep[] {
  return [
    {
      target: '#tour-logo',
      render: (props) =>
        step(1, props, {
          title: 'Bienvenue sur FYS',
          description:
            'Votre espace pour composer des cocktails de fruits sur mesure, avec l’analyse NutriFYS adaptée à votre profil.',
          nextLabel: 'Découvrir',
        }),
    },
    {
      target: '#tour-bottom-nav',
      render: (props) =>
        step(2, props, {
          title: 'Naviguez en un geste',
          description: 'La barre du bas vous mène partout.',
          hint: 'Accueil · FYS Lab pour composer · Catalogue · Mes cocktails',
        }),
    },
    {
      target: '#tour-notifications',
      render: (props) =>
        step(3, props, {
          title: 'Restez informé',
          description:
            'La cloche vous alerte en temps réel : commandes, validations et mises à jour importantes.',
        }),
    },
    {
      target: '#tour-orders',
      render: (props) =>
        step(4, props, {
          title: 'Suivez vos commandes',
          description:
            'Consultez l’état de vos commandes et la progression de la préparation, sans recharger la page.',
        }),
    },
    {
      target: '#tour-avatar',
      render: (props) =>
        step(5, props, {
          title: 'Votre profil santé',
          description:
            'Complétez vos conditions, allergies et objectifs pour des recommandations NutriFYS vraiment personnalisées.',
        }),
    },
    {
      target: '#tour-logo',
      render: (props) =>
        step(6, props, {
          title: 'Vous êtes prêt·e',
          description:
            'Commencez par le FYS Lab pour créer votre premier cocktail, ou explorez le catalogue.',
          isLast: true,
        }),
    },
  ];
}

export function buildDesktopTourSteps(): KageDemoStep[] {
  return [
    {
      target: '#tour-logo',
      render: (props) =>
        step(1, props, {
          title: 'Bienvenue sur FYS',
          description:
            'Votre espace pour composer des cocktails de fruits sur mesure, avec l’analyse NutriFYS adaptée à votre profil.',
          nextLabel: 'Découvrir',
        }),
    },
    {
      target: '#tour-desktop-nav',
      render: (props) =>
        step(2, props, {
          title: 'Tout est dans le menu',
          description: 'Accédez à l’accueil, au Lab, au catalogue et à vos créations depuis la barre centrale.',
        }),
    },
    {
      target: '#tour-notifications',
      render: (props) =>
        step(3, props, {
          title: 'Restez informé',
          description:
            'La cloche vous alerte en temps réel : commandes, validations et mises à jour importantes.',
        }),
    },
    {
      target: '#tour-orders',
      render: (props) =>
        step(4, props, {
          title: 'Suivez vos commandes',
          description:
            'Consultez l’état de vos commandes et la progression de la préparation, sans recharger la page.',
        }),
    },
    {
      target: '#tour-avatar',
      render: (props) =>
        step(5, props, {
          title: 'Votre profil santé',
          description:
            'Complétez vos conditions, allergies et objectifs pour des recommandations NutriFYS vraiment personnalisées.',
        }),
    },
    {
      target: '#tour-logo',
      render: (props) =>
        step(6, props, {
          title: 'Vous êtes prêt·e',
          description:
            'Commencez par le FYS Lab pour créer votre premier cocktail, ou explorez le catalogue.',
          isLast: true,
        }),
    },
  ];
}
