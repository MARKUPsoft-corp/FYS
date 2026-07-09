import { Link, useLocation } from 'rasengan';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth';
import { getNavItemsForRole } from '@/data/navigation';
import { ButtonTheme } from '@/components/common/atoms/ButtonTheme';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

export function Topbar() {
  const { user } = useAuthStore();
  const location = useLocation();

  const navItems = user ? getNavItemsForRole(user.role) : [];

  const initials = user?.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) ?? '?';

  return (
    <header
      className={cn(
        'fixed top-0 left-0 right-0 h-20 z-20',
        'flex items-center justify-between px-6 lg:px-12',
        'bg-background/90 backdrop-blur-xl border-b border-border/40',
        'transition-all duration-300 ease-in-out',
      )}
    >
      {/* Removed Menu Toggle */}

      {/* Left: Brand logo */}
      <div className="flex shrink-0">
        <Link to="/board" className="font-display font-extrabold text-3xl tracking-tighter text-primary hover:text-primary/80 transition-colors">
          FYS<span className="text-secondary">.</span>
        </Link>
      </div>

      {/* Center: Sleek Desktop Navigation */}
      <nav className="hidden lg:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 items-center gap-10">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path || (item.path !== '/board' && location.pathname.startsWith(item.path));
          return (
            <Link 
              key={item.key} 
              to={item.path}
              className={cn(
                "relative py-2 text-[15px] font-semibold transition-colors duration-300 group",
                isActive 
                  ? "text-primary" 
                  : "text-foreground/70 hover:text-foreground"
              )}
            >
              <span>{item.label}</span>
              <span 
                className={cn(
                  "absolute -bottom-1 left-0 h-[2px] bg-primary transition-all duration-300 rounded-full",
                  isActive ? "w-full" : "w-0 group-hover:w-full"
                )} 
              />
            </Link>
          )
        })}
      </nav>

      {/* Right: Actions */}
      <div className="flex items-center gap-4 shrink-0">
        <ButtonTheme />
        <Avatar className="size-11 shadow-sm border-2 border-transparent hover:border-primary/20 cursor-pointer transition-all">
          <AvatarFallback className="text-sm bg-primary/10 text-primary font-bold">
            {initials}
          </AvatarFallback>
        </Avatar>
      </div>
    </header>
  );
}
