import { type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Topbar } from './Topbar';
import { BottomNav } from './BottomNav';

type DashboardShellProps = {
  children: ReactNode;
};

export function DashboardShell({ children }: DashboardShellProps) {

  return (
    <div className="min-h-screen bg-background">
      <Topbar />

      <main
        className={cn(
          'min-h-screen pt-20 pb-[4.25rem] lg:pb-0',
          'transition-all duration-300 ease-in-out',
        )}
      >
        <div className="lg:p-6 lg:max-w-7xl lg:mx-auto">
          {children}
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
