import { type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/stores';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { BottomNav } from './BottomNav';

type DashboardShellProps = {
  children: ReactNode;
};

export function DashboardShell({ children }: DashboardShellProps) {
  const { sidebarOpen } = useAppStore();

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <Topbar />

      <main
        className={cn(
          'min-h-screen pt-16 pb-[4.25rem] lg:pb-0',
          'transition-all duration-300 ease-in-out',
          sidebarOpen ? 'lg:pl-60' : 'lg:pl-16',
        )}
      >
        <div className="p-4 lg:p-6 max-w-7xl mx-auto">
          {children}
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
