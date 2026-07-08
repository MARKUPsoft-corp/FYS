import { Link, useNavigate, useLocation } from 'rasengan';
import { Leaf, ChevronLeft, ChevronRight, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/stores';
import { useAuthStore } from '@/stores/auth';
import { getNavItemsForRole } from '@/data/navigation';
import { signOut } from '@/services/auth';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';

export function Sidebar() {
  const { sidebarOpen, toggleSidebar } = useAppStore();
  const { user } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();

  const navItems = user ? getNavItemsForRole(user.role) : [];

  const initials = user?.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) ?? '?';

  async function handleSignOut() {
    await signOut();
    navigate('/auth/login');
  }

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 h-full z-30',
        'hidden lg:flex flex-col',
        'bg-card border-r border-border',
        'transition-all duration-300 ease-in-out',
        sidebarOpen ? 'w-60' : 'w-16',
      )}
    >
      {/* Logo */}
      <div className="h-16 flex items-center px-4 border-b border-border shrink-0 overflow-hidden">
        <div className="size-8 rounded-full bg-primary flex items-center justify-center shrink-0">
          <Leaf className="size-4 text-primary-foreground" />
        </div>
        <span
          className={cn(
            'ml-3 font-display font-semibold text-lg text-foreground whitespace-nowrap',
            'transition-all duration-300',
            sidebarOpen ? 'opacity-100 w-auto' : 'opacity-0 w-0',
          )}
        >
          FYS
        </span>
      </div>

      {/* Nav items */}
      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.key}
              to={item.path}
              title={!sidebarOpen ? item.label : undefined}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium',
                'transition-all duration-150 group relative',
                isActive
                  ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/20'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                !sidebarOpen && 'justify-center px-0',
              )}
            >
              {/* Active left bar */}
              {isActive && sidebarOpen && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-r-full bg-primary-foreground/40" />
              )}
              <Icon className="size-4 shrink-0" />
              <span
                className={cn(
                  'whitespace-nowrap transition-all duration-300 overflow-hidden',
                  sidebarOpen ? 'opacity-100 max-w-full' : 'hidden opacity-0 max-w-0',
                )}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* User section */}
      <div className="border-t border-border p-3 shrink-0">
        <div
          className={cn(
            'flex items-center gap-3 overflow-hidden',
            !sidebarOpen && 'flex-col gap-2',
          )}
        >
          <Avatar className="size-8 shrink-0">
            <AvatarFallback className="text-xs bg-primary/10 text-primary font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div
            className={cn(
              'flex-1 min-w-0 transition-all duration-300',
              sidebarOpen ? 'opacity-100 w-auto' : 'opacity-0 w-0 hidden',
            )}
          >
            <p className="text-sm font-medium text-foreground truncate">{user?.name}</p>
            <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleSignOut}
            title="Se déconnecter"
            className="shrink-0 size-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
          >
            <LogOut className="size-4" />
          </Button>
        </div>
      </div>

      {/* Collapse toggle */}
      <button
        onClick={toggleSidebar}
        className={cn(
          'absolute -right-3 top-[4.5rem]',
          'size-6 rounded-full bg-card border border-border shadow-md',
          'flex items-center justify-center',
          'text-muted-foreground hover:text-foreground',
          'transition-all duration-150 hover:scale-110',
          'cursor-pointer',
        )}
      >
        {sidebarOpen
          ? <ChevronLeft className="size-3" />
          : <ChevronRight className="size-3" />
        }
      </button>
    </aside>
  );
}
