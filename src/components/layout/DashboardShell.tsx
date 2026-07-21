import { type ReactNode, useEffect, useRef } from 'react';
import { useAuthStore } from '@/stores/auth';
import { updateLastActive } from '@/services/auth';
import { cn } from '@/lib/utils';
import { Topbar } from './Topbar';
import { BottomNav } from './BottomNav';
import { useLocation } from 'rasengan';

type DashboardShellProps = {
  children: ReactNode;
};

export function DashboardShell({ children }: DashboardShellProps) {
  const { user } = useAuthStore();
  const location = useLocation();
  const mainRef = useRef<HTMLElement>(null);

  useEffect(() => {
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    if (mainRef.current) mainRef.current.scrollTop = 0;
  }, [location.pathname]);

  useEffect(() => {
    if (!user) return;

    updateLastActive(user.uid).catch(console.error);

    const interval = setInterval(() => {
      updateLastActive(user.uid).catch(console.error);
    }, 3 * 60 * 1000);

    return () => clearInterval(interval);
  }, [user?.uid]);

  return (
    <div className="min-h-dvh bg-background overflow-x-clip">
      <Topbar />

      <main
        ref={mainRef}
        className={cn(
          'max-w-7xl mx-auto pt-topbar pb-bottom-nav lg:pt-24 lg:pb-0',
          'transition-all duration-300 ease-in-out',
        )}
      >
        <div className="w-full max-w-[1800px] mx-auto px-1 md:px-2 lg:px-4">
          {children}
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
