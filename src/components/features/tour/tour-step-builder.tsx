import type { ComponentProps } from 'react';
import type { KageDemoStep } from '@rasenganjs/kage-demo';
import { TourStepCard, type TourStepCallbacks } from './TourStepCard';

export function buildTourSteps(
  total: number,
  definitions: Array<{
    target: string;
    content: Omit<ComponentProps<typeof TourStepCard>, keyof TourStepCallbacks | 'step' | 'total'>;
  }>,
): KageDemoStep[] {
  return definitions.map((def, index) => ({
    target: def.target,
    render: (props: TourStepCallbacks) => (
      <TourStepCard
        step={index + 1}
        total={total}
        showPrev={index > 0}
        {...def.content}
        {...props}
      />
    ),
  }));
}
