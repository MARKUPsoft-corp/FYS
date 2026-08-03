import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'rasengan';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { FlaskConical } from 'lucide-react';
import { useAuthStore } from '@/stores/auth';
import { getMobileNavItems, getGuestNavItems, type NavItem } from '@/data/navigation';

export function BottomNav() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const location = useLocation();
  const [bouncing, setBouncing] = useState(false);
  const bounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (bounceTimer.current) clearTimeout(bounceTimer.current);
    };
  }, []);

  const triggerBounce = () => {
    setBouncing(true);
    if (bounceTimer.current) clearTimeout(bounceTimer.current);
    bounceTimer.current = setTimeout(() => setBouncing(false), 650);
  };

  const items = user ? getMobileNavItems(user.role) : getGuestNavItems();

  // Masquer le BottomNav sur la page Lab (qui a sa propre barre fixe)
  if (location.pathname === '/lab') {
    return null;
  }

  const hasLabButton = items.some((i) => i.path === '/lab');
  const otherItems = items.filter((i) => i.path !== '/lab');
  const homeItem = otherItems.find((i) => i.path === '/board');
  const catalogueItem = otherItems.find((i) => i.path === '/board/catalogue');

  const renderItem = (item: NavItem) => {
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
  };

  const labButton = (
    <div className="flex flex-col items-center justify-end gap-1 -mt-7 w-full max-w-[6.5rem]">
      <div className="relative flex items-center justify-center">
        <Link
          to="/lab"
          aria-label={t('nav.fys-lab')}
          onClick={triggerBounce}
          className={cn(
            'flex items-center justify-center size-14 rounded-2xl bg-primary text-white',
            'shadow-[0_6px_20px_rgba(63,109,78,0.35)]',
            'hover:shadow-[0_8px_24px_rgba(63,109,78,0.45)] active:scale-95',
            'transition-all duration-200',
            bouncing && 'animate-bounce-pop',
          )}
        >
          <FlaskConical className="size-6" strokeWidth={2.2} />
        </Link>
        {/* Point d'activité */}
        <span className="absolute -top-1 -right-1 size-3 rounded-full bg-secondary border-2 border-background shadow-[0_2px_6px_rgba(0,0,0,0.25)]" />
      </div>
      <span className="text-[12px] font-black tracking-tight text-foreground/80">
        {t('nav.fys-lab')}
      </span>
    </div>
  );

  // Admin : barre classique sans gros bouton central
  if (!hasLabButton) {
    return (
      <nav
        className={cn(
          "fixed left-4 right-4 z-30 lg:hidden",
          "bottom-[env(safe-area-inset-bottom,16px)] mb-3",
          "bg-background/70 backdrop-blur-[48px] saturate-[180%]",
          "border border-white/40 border-b-white/20 dark:border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.15)] rounded-3xl",
        )}
      >
        <div className="flex p-2 items-center justify-evenly">
          {otherItems.map(renderItem)}
        </div>
      </nav>
    );
  }

  // 3 boutons : Accueil | FYS Lab (centre) | Catalogue
  return (
    <nav
      className={cn(
        "fixed left-4 right-4 z-30 lg:hidden",
        "bottom-[env(safe-area-inset-bottom,16px)] mb-3",
        "bg-background/70 backdrop-blur-[48px] saturate-[180%]",
        "border border-white/40 border-b-white/20 dark:border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.15)] rounded-3xl",
      )}
    >
      <div className="grid grid-cols-3 p-2 pb-1 items-center">
        <div className="flex items-center justify-center w-full min-w-0">
          {homeItem ? renderItem(homeItem) : null}
        </div>
        <div className="flex items-center justify-center w-full min-w-0">
          {labButton}
        </div>
        <div className="flex items-center justify-center w-full min-w-0">
          {catalogueItem ? renderItem(catalogueItem) : null}
        </div>
      </div>
    </nav>
  );
}
