import { Link, useLocation } from 'rasengan';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth';
import { getMobileNavItems } from '@/data/navigation';

export function BottomNav() {
  const { user } = useAuthStore();
  const location = useLocation();

  const items = user ? getMobileNavItems(user.role) : [];

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 bg-card/90 backdrop-blur-md border-t border-border z-30 lg:hidden pb-safe"
    >
      <div className="flex h-[4.25rem] items-stretch">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.key}
              to={item.path}
              className={cn(
                'flex-1 flex flex-col items-center justify-center gap-1 pt-1',
                'text-[11px] font-medium transition-colors duration-150',
                isActive ? 'text-primary' : 'text-muted-foreground',
              )}
            >
              <div
                className={cn(
                  'relative flex items-center justify-center size-9 rounded-xl',
                  'transition-all duration-200',
                  isActive && 'bg-primary/10',
                )}
              >
                {isActive && (
                  <span className="absolute -top-1 left-1/2 -translate-x-1/2 w-5 h-0.5 rounded-full bg-primary" />
                )}
                <Icon className="size-[18px]" />
              </div>
              <span className="leading-none">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
