import { Link, useLocation, useNavigate } from 'rasengan';
import {
  LogIn,
  LogOut,
  ShoppingBag,
  Wallet,
  Image,
  CircleDollarSign,
  CalendarCheck,
  Settings,
  Globe,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth';
import { signOut } from '@/services/auth';
import { clearPendingAction } from '@/lib/pending-action';
import { getNavItemsForRole, getGuestNavItems } from '@/data/navigation';
import { NotificationBell } from '@/components/common/NotificationBell';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { UserRole } from '@/entities/user';

export function Topbar() {
  const { t, i18n } = useTranslation();
  const { user } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();

  const navItems = user ? getNavItemsForRole(user.role) : getGuestNavItems();

  const initials = user?.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) ?? '?';

  async function handleSignOut() {
    clearPendingAction();
    await signOut();
    navigate('/');
  }

  const signInButton = (
    <Link
      to="/auth/login"
      className="flex items-center gap-2 h-10 px-4 rounded-full bg-primary text-white text-sm font-bold shadow-[0_4px_14px_rgba(63,109,78,0.25)] hover:bg-primary/90 active:scale-95 transition-all"
    >
      <LogIn className="size-4" />
      {t('topbar.signIn')}
    </Link>
  );

  return (
    <header
      className={cn(
        'fixed top-0 left-0 right-0 z-30 pt-safe',
        'bg-background/70 backdrop-blur-[48px] saturate-[180%]',
        'border-b border-white/40 dark:border-white/10',
        'shadow-[0_8px_32px_rgba(0,0,0,0.10)]',
        'transition-all duration-300 ease-in-out',
      )}
    >
      <div className="h-20 flex items-center justify-between px-3 md:px-6 lg:px-12">
        <div className="flex shrink-0">
          <Link to="/board" className="flex items-center hover:opacity-80 transition-opacity">
            <img src="/logos/fys_logo.png" alt="FYS Logo" className="h-10 w-auto object-contain" />
          </Link>
        </div>

        <nav  className="hidden lg:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 items-center gap-10">
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
                  <span>{t(item.labelKey)}</span>
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

        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Accès rapide à la gestion de FYS Programme */}
          {user?.role === UserRole.ADMIN ? (
            <Link
              to="/board/programs-admin"
              className={cn(
                'relative flex items-center gap-1.5 h-10 px-3 rounded-xl font-bold text-xs transition-all shadow-xs shrink-0',
                location.pathname.startsWith('/board/programs-admin')
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-primary/10 text-primary hover:bg-primary/20 border border-primary/25',
              )}
              aria-label="Gestion FYS Programme"
              title="Gestion FYS Programme"
            >
              <CalendarCheck className="size-4 shrink-0" />
              <span className="hidden sm:inline">Gestion Cures</span>
            </Link>
          ) : (
            <Link
              to="/board/programs"
              className={cn(
                'relative flex items-center gap-1.5 h-10 px-3 rounded-xl font-bold text-xs transition-all shadow-xs shrink-0',
                location.pathname.startsWith('/board/programs')
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-primary/10 text-primary hover:bg-primary/20 border border-primary/25',
              )}
              aria-label="FYS Programme"
              title="FYS Programme"
            >
              <CalendarCheck className="size-4 shrink-0" />
              <span className="hidden sm:inline">FYS Programme</span>
            </Link>
          )}

          <NotificationBell />

          {user?.role === UserRole.CUSTOMER && (
            <Link
              to="/board/orders"
              className={cn(
                'relative flex items-center justify-center size-10 rounded-xl transition-all',
                location.pathname.startsWith('/board/orders')
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/60',
              )}
              aria-label={t('nav.orders')}
              title={t('nav.orders')}
            >
              <ShoppingBag className="size-5" />
            </Link>
          )}

          {user?.role === UserRole.ADMIN && (
            <>
              <Link
                to="/board/management"
                className={cn(
                  'relative flex items-center justify-center size-10 rounded-xl transition-all',
                  location.pathname.startsWith('/board/management')
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/60',
                )}
                aria-label="FYS Management"
                title="FYS Management"
              >
                <CircleDollarSign className="size-5" />
              </Link>
              <Link
                to="/board/pricing"
                className={cn(
                  'relative flex items-center justify-center size-10 rounded-xl transition-all',
                  location.pathname.startsWith('/board/pricing')
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/60',
                )}
                aria-label={t('topbar.pricing')}
                title={t('topbar.pricing')}
              >
                <Wallet className="size-5" />
              </Link>
            </>
          )}

          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Avatar  className="size-11 shadow-sm border-2 border-transparent hover:border-primary/40 cursor-pointer transition-all select-none">
                  <AvatarFallback className="text-sm bg-primary/10 text-primary font-bold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </DropdownMenuTrigger>

              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem
                  onClick={() => navigate('/board/profile')}
                  className="flex items-center gap-3 cursor-pointer py-2"
                >
                  <Avatar className="size-10 border border-border/30">
                    <AvatarFallback className="text-sm bg-primary/10 text-primary font-bold">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col min-w-0">
                    <span className="font-semibold text-foreground truncate">{user.name}</span>
                    <span className="text-xs text-muted-foreground truncate">
                      {user.email}
                    </span>
                  </div>
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                <DropdownMenuItem
                  onClick={() => navigate('/board/profile')}
                  className="gap-2.5 cursor-pointer text-xs font-semibold"
                >
                  <Settings className="size-4 text-muted-foreground" />
                  Paramètres & Profil
                </DropdownMenuItem>

                {user.role === UserRole.ADMIN && (
                  <DropdownMenuItem
                    onClick={() => navigate('/board/programs-admin')}
                    className="gap-2.5 cursor-pointer text-xs font-semibold text-primary"
                  >
                    <CalendarCheck className="size-4 text-primary" />
                    Gestion FYS Programme
                  </DropdownMenuItem>
                )}

                <DropdownMenuSeparator />

                {/* Changement de Langue dans les Paramètres */}
                <div className="px-2 py-1.5 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 px-1">
                    <Globe className="size-3 text-primary" />
                    Langue / Language
                  </span>
                  <div className="grid grid-cols-2 gap-1 bg-muted/60 p-1 rounded-lg">
                    <button
                      type="button"
                      onClick={() => i18n.changeLanguage('fr')}
                      className={`py-1 text-xs font-bold rounded-md transition-all cursor-pointer ${
                        i18n.language?.startsWith('fr')
                          ? 'bg-primary text-primary-foreground shadow-xs'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      Français
                    </button>
                    <button
                      type="button"
                      onClick={() => i18n.changeLanguage('en')}
                      className={`py-1 text-xs font-bold rounded-md transition-all cursor-pointer ${
                        i18n.language?.startsWith('en')
                          ? 'bg-primary text-primary-foreground shadow-xs'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      English
                    </button>
                  </div>
                </div>

                <DropdownMenuSeparator />

                <DropdownMenuItem
                  onClick={handleSignOut}
                  className="gap-2 cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10"
                >
                  <LogOut className="size-4" />
                  {t('topbar.signOut')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            signInButton
          )}
        </div>
      </div>
    </header>
  );
}
