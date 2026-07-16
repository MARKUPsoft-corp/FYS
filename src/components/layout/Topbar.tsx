import { Link, useLocation, useNavigate } from 'rasengan';
import { LogOut, Settings, User, ShoppingBag } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth';
import { signOut } from '@/services/auth';
import { getNavItemsForRole } from '@/data/navigation';
import { ButtonTheme } from '@/components/common/atoms/ButtonTheme';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { UserRole } from '@/entities/user';

export function Topbar() {
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
    <header
      className={cn(
        'fixed top-0 left-0 right-0 h-20 z-20',
        'flex items-center justify-between px-3 md:px-6 lg:px-12',
        'bg-background/90 backdrop-blur-xl border-b border-border/40',
        'transition-all duration-300 ease-in-out',
      )}
    >
      {/* Left: Brand logo */}
      <div className="flex shrink-0">
        <Link to="/board" className="font-display font-extrabold text-3xl tracking-tighter text-primary hover:text-primary/80 transition-colors">
          FYS<span className="text-secondary">.</span>
        </Link>
      </div>

      {/* Center: Desktop navigation */}
      <nav className="hidden lg:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 items-center gap-10">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path || (item.path !== '/board' && location.pathname.startsWith(item.path));
          return (
            <Link
              key={item.key}
              to={item.path}
              className={cn(
                'relative py-2 text-[15px] font-semibold transition-colors duration-300 group',
                isActive
                  ? 'text-primary'
                  : 'text-foreground/70 hover:text-foreground',
              )}
            >
              <span>{item.label}</span>
              <span
                className={cn(
                  'absolute -bottom-1 left-0 h-[2px] bg-primary transition-all duration-300 rounded-full',
                  isActive ? 'w-full' : 'w-0 group-hover:w-full',
                )}
              />
            </Link>
          );
        })}
      </nav>

      {/* Right: Actions */}
      <div className="flex items-center gap-3 shrink-0">
        <ButtonTheme />

        {/* Orders shortcut — customers only */}
        {user?.role === UserRole.CUSTOMER && (
          <Link
            to="/board/orders"
            className={cn(
              'relative flex items-center justify-center size-10 rounded-xl transition-all',
              location.pathname.startsWith('/board/orders')
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/60',
            )}
            aria-label="Mes commandes"
          >
            <ShoppingBag className="size-5" />
          </Link>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Avatar className="size-11 shadow-sm border-2 border-transparent hover:border-primary/40 cursor-pointer transition-all select-none">
              <AvatarFallback className="text-sm bg-primary/10 text-primary font-bold">
                {initials}
              </AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-56">
            {/* User info */}
            <DropdownMenuLabel className="flex flex-col gap-0.5 py-2">
              <span className="text-sm font-semibold text-foreground truncate">{user?.name}</span>
              <span className="text-xs text-muted-foreground font-normal truncate">{user?.email}</span>
            </DropdownMenuLabel>

            <DropdownMenuSeparator />

            <DropdownMenuItem onClick={() => navigate('/board/profile')} className="gap-2 cursor-pointer">
              <User className="size-4" />
              Profile
            </DropdownMenuItem>

            <DropdownMenuItem onClick={() => navigate('/board/profile')} className="gap-2 cursor-pointer">
              <Settings className="size-4" />
              Settings
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuItem
              onClick={handleSignOut}
              className="gap-2 cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10"
            >
              <LogOut className="size-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
