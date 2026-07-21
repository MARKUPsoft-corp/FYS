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

  // ── Scroll to top on every page change ─────────────────────────────────────
  useEffect(() => {
    // Scroll all possible scroll containers to the top
    // (Safari PWA may use different containers than standard browsers)
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    if (mainRef.current) mainRef.current.scrollTop = 0;
  }, [location.pathname]);

  useEffect(() => {
    if (!user) return;
    
    // Mettre à jour immédiatement
    updateLastActive(user.uid).catch(console.error);
    
    // Puis toutes les 3 minutes
    const interval = setInterval(() => {
      updateLastActive(user.uid).catch(console.error);
    }, 3 * 60 * 1000);

    return () => clearInterval(interval);
  }, [user?.uid]);  return (
    <div className="min-h-screen bg-background">
      <Topbar />

      <main
        ref={mainRef}
        className={cn(
          'min-h-screen max-w-7xl mx-auto lg:pt-24',
          'transition-all duration-300 ease-in-out',
        )}
        // Dynamic top padding = notch height + 80px topbar height
        // Dynamic bottom padding = home-bar height + 68px bottom nav height
        style={{
          paddingTop: 'calc(env(safe-area-inset-top) + 5rem)',
          paddingBottom: 'calc(env(safe-area-inset-bottom) + 4.5rem)',
        }}
      >
        <div className="w-full max-w-[1800px] mx-auto px-1 md:px-2 lg:px-4">
          {children}
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
