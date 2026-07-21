import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { PageTour, usePageTour } from './PageTour';
import { buildAppTourSteps } from './pages/app-tour';

function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches,
  );

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const onChange = () => setIsDesktop(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  return isDesktop;
}

type ClientTourProps = {
  children: ReactNode;
  canAutoStart?: boolean;
};

/** Global app shell tour (navigation, notifications, etc.) */
export function ClientTour({ children, canAutoStart = true }: ClientTourProps) {
  const isDesktop = useIsDesktop();
  const steps = useMemo(() => buildAppTourSteps(isDesktop), [isDesktop]);

  return (
    <PageTour pageId="app" steps={steps} canAutoStart={canAutoStart} autoStartDelay={1200}>
      {children}
    </PageTour>
  );
}

export function useClientTour() {
  return usePageTour('app');
}

export { PageTour, usePageTour, useIsDesktop };
