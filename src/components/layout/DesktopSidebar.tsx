import { Link, useLocation, useNavigate } from 'rasengan';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth';
import { getNavItemsForRole } from '@/data/navigation';
import { LogOut, Globe } from 'lucide-react';
import { signOut } from '@/services/auth';
import { clearPendingAction } from '@/lib/pending-action';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';

export function DesktopSidebar() {
  const { t, i18n } = useTranslation();
  const { user } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();

  if (!user) return null;

  const navItems = getNavItemsForRole(user.role);

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

  return (
    <aside
      className={cn(
        'hidden lg:flex flex-col fixed left-0 top-0 h-full z-40',
        'bg-background/70 backdrop-blur-[48px] saturate-[180%]',
        'border-r border-white/40 dark:border-white/10',
        'shadow-[8px_0_32px_rgba(0,0,0,0.10)]',
        'w-64'
      )}
    >
      {/* Header - Logo */}
      <div className="h-20 flex items-center px-6 border-b border-white/10 shrink-0">
        <Link to="/board" className="flex items-center hover:opacity-80 transition-opacity">
          <img src="/logos/Logo_fys.png" alt="FYS Logo" className="h-12 w-auto object-contain dark:hidden" />
          <img src="/logos/Logo_fys_creme.png" alt="FYS Logo" className="h-12 w-auto object-contain hidden dark:block" />
        </Link>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-1.5 custom-scrollbar">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path || (item.path !== '/board' && location.pathname.startsWith(item.path));
          
          return (
            <Link
              key={item.key}
              to={item.path}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-300',
                isActive
                  ? 'bg-primary/15 text-primary font-bold'
                  : 'text-foreground/70 hover:text-foreground hover:bg-muted/60 font-medium'
              )}
            >
              <item.icon className={cn("size-5 shrink-0", isActive ? "text-primary" : "")} />
              <span className="text-sm truncate">
                {t(item.labelKey)}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Footer - Profile & Settings */}
      <div className="p-4 border-t border-white/10 space-y-4 shrink-0 bg-background/50">
        {/* Language Selection */}
        <div className="space-y-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 px-1">
            <Globe className="size-3 text-primary" />
            Langue / Language
          </span>
          <div className="grid grid-cols-2 gap-1 bg-muted/60 p-1 rounded-lg">
            <button
              type="button"
              onClick={() => i18n.changeLanguage('fr')}
              className={cn(
                "py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer",
                i18n.language?.startsWith('fr')
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              FR
            </button>
            <button
              type="button"
              onClick={() => i18n.changeLanguage('en')}
              className={cn(
                "py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer",
                i18n.language?.startsWith('en')
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              EN
            </button>
          </div>
        </div>

        <Separator className="bg-border/50" />

        {/* User Profile */}
        <Link to="/board/profile" className="flex items-center gap-3 px-1 py-1 group cursor-pointer rounded-xl hover:bg-muted/50 transition-colors">
          <Avatar className="size-10 border border-border/30">
            <AvatarFallback className="text-sm bg-primary/10 text-primary font-bold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col min-w-0 flex-1">
            <span className="font-bold text-foreground text-sm truncate group-hover:text-primary transition-colors">{user.name}</span>
            <span className="text-[11px] text-muted-foreground truncate">
              {user.email}
            </span>
          </div>
        </Link>

        {/* Logout */}
        <button
          onClick={handleSignOut}
          className="flex items-center gap-2 w-full px-2 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
        >
          <LogOut className="size-4" />
          {t('topbar.signOut')}
        </button>
      </div>
    </aside>
  );
}
