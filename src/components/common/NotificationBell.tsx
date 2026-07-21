import { Bell, CheckCheck, Trash2, X } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'rasengan';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth';
import {
  subscribeToNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  deleteAllNotifications,
} from '@/services/notifications';
import type { AppNotification } from '@/entities';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
} from '@/components/ui/sheet';

const playNotificationSound = () => {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.5, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.2);
  } catch (e) {
    console.warn("Audio generation failed", e);
  }
};

export function NotificationBell() {
  const { user } = useAuthStore();
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
          const now = Date.now();
          const createdMs = unreadNew.createdAt && (unreadNew.createdAt as any).seconds 
            ? (unreadNew.createdAt as any).seconds * 1000 
            : now;
          if (now - createdMs < 10000) {
            playNotificationSound();
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
    setIsNotifOpen(false);
    setShowToast(null);
    if (n.link) navigate(n.link);
  }

  if (!user) return null;

  return (
    <>
      <Sheet open={isNotifOpen} onOpenChange={setIsNotifOpen}>
        <SheetTrigger asChild>
          <button
            id="tour-notifications"
            type="button"
            className="relative flex items-center justify-center size-10 rounded-xl transition-all text-muted-foreground hover:text-foreground hover:bg-muted/60 focus:outline-none"
          >
            <Bell className="size-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold leading-none flex items-center justify-center border-2 border-background tabular-nums">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>
        </SheetTrigger>
        <SheetContent side="right" showCloseButton={false} className="w-full max-w-[400px] p-0 flex flex-col gap-0">
          <SheetHeader className="px-6 py-4 border-b border-border/40 shrink-0 text-left flex flex-row items-center justify-between space-y-0">
            <SheetTitle className="font-display text-lg">Notifications</SheetTitle>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={() => markAllNotificationsAsRead(user.uid)}
                  className="text-[11px] font-semibold text-primary hover:underline flex items-center gap-1 mt-0"
                >
                  <CheckCheck className="size-3" />
                  Tout lu
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  type="button"
                  onClick={() => deleteAllNotifications(user.uid)}
                  className="text-[11px] font-semibold text-destructive hover:underline flex items-center gap-1 mt-0 bg-destructive/10 px-2 py-1.5 rounded-md transition-colors hover:bg-destructive/20"
                >
                  <Trash2 className="size-3" />
                  Vider
                </button>
              )}
              
              <div className="w-px h-4 bg-border mx-1" />
              
              <SheetClose asChild>
                <button
                  type="button"
                  className="flex items-center justify-center size-8 rounded-xl bg-muted/60 hover:bg-muted border border-border/40 text-foreground transition-colors mt-0"
                >
                  <X className="size-4" />
                </button>
              </SheetClose>
            </div>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto w-full flex flex-col relative">
            {notifications.length === 0 ? (
              <div className="text-center py-10 flex flex-col items-center gap-3">
                <Bell className="size-8 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">Aucune notification.</p>
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  className={cn(
                    'flex flex-col gap-1.5 px-6 py-4 text-left transition-colors border-b border-border/40 last:border-0 hover:bg-muted/50 w-full group relative',
                    !n.isRead && 'bg-primary/5'
                  )}
                >
                  <div className="flex items-center justify-between gap-2 w-full pr-6 cursor-pointer" onClick={() => handleNotifClick(n)}>
                    <span className={cn('text-sm font-bold truncate', !n.isRead ? 'text-foreground' : 'text-foreground/70')}>
                      {n.title}
                    </span>
                    {!n.isRead && <span className="size-2 rounded-full bg-primary shrink-0" />}
                  </div>
                  <span className={cn('text-[12px] leading-relaxed cursor-pointer pr-6', !n.isRead ? 'text-muted-foreground' : 'text-muted-foreground/60')} onClick={() => handleNotifClick(n)}>
                    {n.message}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteNotification(n.id);
                    }}
                    className="absolute right-4 top-1/2 -translate-y-1/2 size-8 rounded-full flex items-center justify-center text-destructive/80 hover:bg-destructive/10 hover:text-destructive transition-all"
                    title="Supprimer la notification"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </SheetContent>
      </Sheet>

      {showToast && (
        <div className="fixed top-[calc(var(--sat)+5rem)] right-4 z-50 animate-in slide-in-from-right-4 fade-in duration-300">
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
                    handleNotifClick(showToast.notif);
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
    </>
  );
}
