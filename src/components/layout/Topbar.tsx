import { useLocation } from 'rasengan';
import { Menu } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/stores';
import { useAuthStore } from '@/stores/auth';
import { getNavItemsForRole } from '@/data/navigation';
import { ButtonTheme } from '@/components/common/atoms/ButtonTheme';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';

export function Topbar() {
  const { sidebarOpen, toggleSidebar } = useAppStore();
  const { user } = useAuthStore();
  const location = useLocation();

  const navItems = user ? getNavItemsForRole(user.role) : [];
  const currentItem = navItems.find((item) => item.path === location.pathname);
  const pageTitle = currentItem?.label ?? 'FYS';

  const initials = user?.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) ?? '?';

  return (
    <header
      className={cn(
        'fixed top-0 right-0 h-16 z-20',
        'flex items-center gap-4 px-4',
        'bg-background/80 backdrop-blur-md border-b border-border',
        'transition-all duration-300 ease-in-out',
        'left-0 lg:left-0',
        sidebarOpen ? 'lg:left-60' : 'lg:left-16',
      )}
    >
      {/* Toggle */}
      <Button
        variant="ghost"
        size="icon"
        onClick={toggleSidebar}
        className="shrink-0 text-muted-foreground hover:text-foreground"
      >
        <Menu className="size-4" />
      </Button>

      {/* Page title */}
      <h1 className="font-display font-semibold text-lg text-foreground flex-1 truncate">
        {pageTitle}
      </h1>

      {/* Actions */}
      <div className="flex items-center gap-2 shrink-0">
        <ButtonTheme />
        <Avatar className="size-8">
          <AvatarFallback className="text-xs bg-primary/10 text-primary font-semibold">
            {initials}
          </AvatarFallback>
        </Avatar>
      </div>
    </header>
  );
}
