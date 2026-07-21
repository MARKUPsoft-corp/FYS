import type { KageDemoStep } from '@rasenganjs/kage-demo';
import { buildMobileTourSteps, buildDesktopTourSteps } from '../client-tour-steps';

export function buildAppTourSteps(isDesktop: boolean): KageDemoStep[] {
  return isDesktop ? buildDesktopTourSteps() : buildMobileTourSteps();
}
