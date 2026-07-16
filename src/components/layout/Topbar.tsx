import { Link, useLocation, useNavigate } from 'rasengan';
import { LogOut, Settings, User, ShoppingBag, Bell, X, CheckCheck } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth';
import { signOut } from '@/services/auth';
import { subscribeToNotifications, markNotificationAsRead, markAllNotificationsAsRead } from '@/services/notifications';
import type { AppNotification } from '@/entities';
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

  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [showToast, setShowToast] = useState<{ notif: AppNotification } | null>(null);
  const toastedIds = useRef<Set<string>>(new Set());
  const [isNotifOpen, setIsNotifOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    const unsubscribe = subscribeToNotifications(user.uid, (data) => {
      setNotifications(data);
      if (data.length > 0) {
        const unreadNew = data.find(n => !n.isRead && !toastedIds.current.has(n.id));
        if (unreadNew) {
          toastedIds.current.add(unreadNew.id);
          // Only show toast if it's very recent (less than 10 seconds ago)
          const now = Date.now();
          const createdMs = unreadNew.createdAt && (unreadNew.createdAt as any).seconds 
            ? (unreadNew.createdAt as any).seconds * 1000 
            : now;
          if (now - createdMs < 10000) {
            setShowToast({ notif: unreadNew });
            setTimeout(() => setShowToast(null), 5000);
          }
        }
      }
    });
    return () => unsubscribe();
  }, [user]);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  function handleNotifClick(n: AppNotification) {
    if (!n.isRead) markNotificationAsRead(n.id);
    if (n.link) navigate(n.link);
    setIsNotifOpen(false);
  }

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

        {/* Notifications Bell */}
        {user && (
          <DropdownMenu open={isNotifOpen} onOpenChange={setIsNotifOpen}>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="relative flex items-center justify-center size-10 rounded-xl transition-all text-muted-foreground hover:text-foreground hover:bg-muted/60 focus:outline-none"
              >
                <Bell className="size-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-2 right-2 size-2.5 rounded-full bg-red-500 border-2 border-background" />
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[320px] p-0">
              <div className="flex items-center justify-between px-4 py-3 border-b border-border/40 bg-muted/20">
                <p className="font-display font-bold text-sm">Notifications</p>
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={() => markAllNotificationsAsRead(user.uid)}
                    className="text-[11px] font-semibold text-primary hover:underline flex items-center gap-1"
                  >
                    <CheckCheck className="size-3" />
                    Tout marquer lu
                  </button>
                )}
              </div>
              <div className="max-h-[360px] overflow-y-auto w-full flex flex-col">
                {notifications.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    Aucune notification.
                  </p>
                ) : (
                  notifications.map((n) => (
                    <button
                      key={n.id}
                      type="button"
                      onClick={() => handleNotifClick(n)}
                      className={cn(
                        'flex flex-col gap-1 px-4 py-3 text-left transition-colors border-b border-border/40 last:border-0 hover:bg-muted/50 w-full',
                        !n.isRead && 'bg-primary/5'
                      )}
                    >
                      <div className="flex items-center justify-between gap-2 w-full">
                        <span className={cn('text-xs font-bold truncate', !n.isRead ? 'text-foreground' : 'text-foreground/70')}>
                          {n.title}
                        </span>
                        {!n.isRead && <span className="size-1.5 rounded-full bg-primary shrink-0" />}
                      </div>
                      <span className={cn('text-[11px] leading-relaxed line-clamp-2', !n.isRead ? 'text-muted-foreground' : 'text-muted-foreground/60')}>
                        {n.message}
                      </span>
                    </button>
                  ))
                )}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        )}

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

      {/* Toast Overlay */}
      {showToast && (
        <div className="fixed top-24 right-4 z-50 animate-in slide-in-from-right-4 fade-in duration-300">
          <div className="bg-card border border-border/60 shadow-xl rounded-2xl p-4 w-72 md:w-80 flex items-start gap-3 relative">
            <button
              type="button"
              onClick={() => setShowToast(null)}
              className="absolute top-2 right-2 p-1 rounded-full text-muted-foreground hover:bg-muted transition-colors"
            >
              <X className="size-3" />
            </button>
            <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
              <Bell className="size-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0 pr-4">
              <p className="text-sm font-bold text-foreground truncate">{showToast.notif.title}</p>
              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed line-clamp-2">
                {showToast.notif.message}
              </p>
              {showToast.notif.link && (
                <button
                  type="button"
                  onClick={() => {
                    navigate(showToast.notif.link!);
                    setShowToast(null);
                  }}
                  className="mt-2 text-[11px] font-bold text-primary hover:underline"
                >
                  Voir les détails &rarr;
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
