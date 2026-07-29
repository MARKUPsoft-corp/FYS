import { Link, useLocation } from 'rasengan';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth';
import { getMobileNavItems } from '@/data/navigation';

export function BottomNav() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const location = useLocation();

  const items = user ? getMobileNavItems(user.role) : [];

  // Masquer le BottomNav sur la page Lab (qui a sa propre barre fixe)
  if (location.pathname === '/lab') {
    return null;
  }

  return (
    <nav
      
      className={cn(
        "fixed left-4 right-4 z-30 lg:hidden overflow-hidden",
        "bottom-[env(safe-area-inset-bottom,16px)] mb-3",
        "bg-background/70 backdrop-blur-[48px] saturate-[180%]",
        "border border-white/40 border-b-white/20 dark:border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.15)] rounded-3xl"
      )}
    >
      <div className="flex p-2 items-center justify-evenly">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          const label = t(item.labelKey);
          return (
            <Link
              key={item.key}
              to={item.path}
              className={cn(
                'flex flex-col items-center justify-center gap-1 min-w-[3.5rem] w-full max-w-[5.5rem]',
                'transition-all duration-300 group',
                isActive ? 'text-foreground' : 'text-foreground/70 hover:text-foreground',
              )}
            >
              <div
                className={cn(
                  'relative flex items-center justify-center size-10 rounded-2xl',
                  'transition-all duration-300',
                  isActive ? 'bg-primary/20 text-primary shadow-sm' : 'group-hover:bg-foreground/5',
                )}
              >
                {isActive && (
                  <span className="absolute -top-1 left-1/2 -translate-x-1/2 w-4 h-[3px] rounded-full bg-primary shadow-[0_0_8px_rgba(var(--primary),0.5)]" />
                )}
                <Icon className={cn('size-5', isActive && 'scale-110 transition-transform')} strokeWidth={isActive ? 2.5 : 2} />
              </div>
              <span className={cn(
                'text-[11px] sm:text-[12px] tracking-tight leading-tight text-center truncate w-full px-0.5',
                isActive ? 'font-black' : 'font-bold'
              )}>
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
