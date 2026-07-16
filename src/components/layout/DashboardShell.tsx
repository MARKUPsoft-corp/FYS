import { type ReactNode, useEffect } from 'react';
import { useAuthStore } from '@/stores/auth';
import { updateLastActive } from '@/services/auth';
import { cn } from '@/lib/utils';
import { Topbar } from './Topbar';
import { BottomNav } from './BottomNav';

type DashboardShellProps = {
  children: ReactNode;
};

export function DashboardShell({ children }: DashboardShellProps) {
  const { user } = useAuthStore();

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
        className={cn(
          'min-h-screen max-w-7xl mx-auto pt-20 pb-[4.25rem] lg:pt-24',
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
