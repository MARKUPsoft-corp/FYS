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
          'min-h-screen max-w-7xl mx-auto pt-20 pb-[4.25rem] lg:pt-24',
          'transition-all duration-300 ease-in-out',
        )}
      >
        <div className="w-full max-w-[1800px] mx-auto lg:px-6">
          {children}
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
