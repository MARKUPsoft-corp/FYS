import { type ReactNode, useEffect, useRef } from 'react';
import { useAuthStore } from '@/stores/auth';
import { updateLastActive } from '@/services/auth';
import { cn } from '@/lib/utils';
import { Topbar } from './Topbar';
import { BottomNav } from './BottomNav';
import { DesktopSidebar } from './DesktopSidebar';
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
      <DesktopSidebar />
      <Topbar />

      <main
        ref={mainRef}
        className={cn(
          'w-full pt-[calc(env(safe-area-inset-top,0px)+5rem)] pb-[calc(env(safe-area-inset-bottom,0px)+4.5rem)] lg:pt-0 lg:pb-0',
          'transition-all duration-300 ease-in-out',
          user ? 'lg:ml-64 lg:w-[calc(100%-16rem)]' : 'lg:ml-0 lg:w-full'
        )}
      >
        <div key={location.pathname} className="w-full page-transition-wrapper">
          {children}
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
