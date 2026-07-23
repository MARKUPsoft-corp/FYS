import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  type Context,
  type ReactNode,
} from 'react';
import KageDemoContainer, { useKageDemo, type KageDemoStep } from '@rasenganjs/kage-demo';
import { useAuthStore } from '@/stores/auth';
import { UserRole } from '@/entities';
import {
  type TourPageId,
  TOUR_COMPLETED_EVENT,
  isPageTourCompleted,
  markPageTourCompleted,
} from '@/lib/client-tour-storage';

type PageTourContextValue = {
  startTour: () => void;
  isActive: boolean;
};

const pageTourContexts = new Map<TourPageId, Context<PageTourContextValue | null>>();

function getPageTourContext(pageId: TourPageId) {
  if (!pageTourContexts.has(pageId)) {
    pageTourContexts.set(pageId, createContext<PageTourContextValue | null>(null));
  }
  return pageTourContexts.get(pageId)!;
}

export function usePageTour(pageId: TourPageId): PageTourContextValue {
  const ctx = useContext(getPageTourContext(pageId));
  return ctx ?? { startTour: () => {}, isActive: false };
}

function wrapStepsWithCompletion(
  steps: KageDemoStep[],
  onComplete: () => void,
): KageDemoStep[] {
  return steps.map((s, index) => ({
    target: s.target,
    render: (props) => {
      const isLastStep = index === steps.length - 1;
      const end = () => {
        // Only mark as completed when the LAST step calls end()
        if (isLastStep) {
          onComplete();
        }
        props.end();
      };
      return s.render({ ...props, end });
    },
  }));
}

type PageTourProps = {
  pageId: TourPageId;
  steps: KageDemoStep[];
  /** Delay auto-start (ms) */
  autoStartDelay?: number;
  canAutoStart?: boolean;
  /** Wait until this tour is completed before auto-starting (e.g. home waits for app) */
  waitForTour?: TourPageId;
  children?: ReactNode;
};

export function PageTour({
  pageId,
  steps,
  autoStartDelay = 800,
  canAutoStart = true,
  waitForTour,
  children,
}: PageTourProps) {
  const { user } = useAuthStore();
  const isCustomer = user?.role === UserRole.CUSTOMER;
  const autoStartedRef = useRef(false);
  const PageTourContext = getPageTourContext(pageId);

  const handleComplete = useCallback(() => {
    if (user?.uid) markPageTourCompleted(user.uid, pageId);
  }, [user?.uid, pageId]);

  const wrappedSteps = useMemo(
    () => wrapStepsWithCompletion(steps, handleComplete),
    [steps, handleComplete],
  );

  const tour = useKageDemo(wrappedSteps);

  const startTour = useCallback(() => {
    requestAnimationFrame(() => tour.start());
  }, [tour]);

  const isActive = tour.currentIndex >= 0;

  const tryAutoStart = useCallback(() => {
    if (!user?.uid || !canAutoStart || autoStartedRef.current) return;
    if (isPageTourCompleted(user.uid, pageId)) return;

    autoStartedRef.current = true;
    const timer = window.setTimeout(startTour, autoStartDelay);
    return () => window.clearTimeout(timer);
  }, [user?.uid, canAutoStart, pageId, autoStartDelay, startTour]);

  useEffect(() => {
    if (!isCustomer || !user?.uid || !canAutoStart) return;
    if (isPageTourCompleted(user.uid, pageId)) return;

    if (waitForTour && !isPageTourCompleted(user.uid, waitForTour)) {
      const onPrereqDone = (e: Event) => {
        const detail = (e as CustomEvent<{ pageId: TourPageId }>).detail;
        if (detail.pageId !== waitForTour) return;
        tryAutoStart();
      };
      window.addEventListener(TOUR_COMPLETED_EVENT, onPrereqDone);
      return () => {
        window.removeEventListener(TOUR_COMPLETED_EVENT, onPrereqDone);
        // Reset flag on unmount (when leaving page) so it can restart next time
        autoStartedRef.current = false;
      };
    }

    const cleanup = tryAutoStart();
    
    // Reset flag on unmount (when leaving page) so it can restart next time
    return () => {
      cleanup?.();
      autoStartedRef.current = false;
    };
  }, [isCustomer, user?.uid, canAutoStart, pageId, waitForTour, tryAutoStart]);

  if (!isCustomer) {
    return <>{children}</>;
  }

  return (
    <PageTourContext.Provider value={{ startTour, isActive }}>
      <KageDemoContainer {...tour} />
      {children}
    </PageTourContext.Provider>
  );
}
