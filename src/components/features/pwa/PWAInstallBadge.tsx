import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Smartphone, Download, X, Share, PlusSquare, CheckCircle2, Sparkles } from 'lucide-react';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function PWAInstallBadge() {
  const { t } = useTranslation();
  const [pathname, setPathname] = useState('');
  const { canInstall, isIOS, showIOSModal, setShowIOSModal, install, dismiss } = usePWAInstall();

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setPathname(window.location.pathname);
    const handleUrlChange = () => setPathname(window.location.pathname);
    window.addEventListener('popstate', handleUrlChange);
    // Interval check to track client-side pushState/replaceState smoothly
    const interval = setInterval(handleUrlChange, 1000);
    return () => {
      window.removeEventListener('popstate', handleUrlChange);
      clearInterval(interval);
    };
  }, []);

  if (!canInstall) return null;

  // Positionnement dynamique selon la route pour ne jamais chevaucher les barres de navigation
  const isBoardRoute = pathname.startsWith('/board');
  const isLabRoute = pathname === '/lab';

  const positionClass = isBoardRoute
    ? 'bottom-[96px] right-4 lg:bottom-6 lg:right-6'
    : isLabRoute
    ? 'bottom-[115px] right-4 lg:bottom-6 lg:right-6'
    : 'bottom-6 right-4 sm:bottom-6 sm:right-6';

  return (
    <>
      {/* ── Badge Pilule Flottant ── */}
      <aside
        aria-label={t('pwa.installAppFull')}
        className={cn(
          'fixed z-40 flex items-center gap-2 sm:gap-2.5 p-1.5 sm:p-2 pl-2 sm:pl-2.5 rounded-full',
          'bg-background/95 dark:bg-[#1A2E20]/95 backdrop-blur-xl',
          'border border-primary/25 dark:border-primary/40',
          'shadow-[0_8px_32px_rgba(63,109,78,0.22)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.5)]',
          'animate-in fade-in slide-in-from-bottom-5 duration-500',
          'transition-all duration-300 group',
          positionClass,
        )}
      >
        {/* Icône smartphone avec beacon vert pulsant */}
        <div className="relative size-8 rounded-full bg-primary/10 dark:bg-primary/25 border border-primary/20 flex items-center justify-center text-primary shrink-0">
          <Smartphone className="size-4" />
          <span className="absolute -top-0.5 -right-0.5 size-2 rounded-full bg-emerald-500 animate-ping" />
          <span className="absolute -top-0.5 -right-0.5 size-2 rounded-full bg-emerald-500" />
        </div>

        {/* Textes descriptifs */}
        <div className="flex flex-col text-left pr-1 select-none">
          <span className="text-xs font-bold text-foreground leading-tight">
            {t('pwa.installApp')}
          </span>
          <span className="hidden sm:inline text-[10px] text-muted-foreground font-medium truncate max-w-[140px]">
            {t('pwa.installDesc')}
          </span>
        </div>

        {/* Bouton d'action principal */}
        <button
          type="button"
          onClick={install}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary hover:bg-primary/90 active:scale-95 text-white font-bold text-xs shadow-xs transition-all cursor-pointer"
        >
          <Download className="size-3.5 shrink-0" />
          <span>{t('common.install', 'Installer')}</span>
        </button>

        {/* Bouton de fermeture (masquer pour la session) */}
        <button
          type="button"
          onClick={dismiss}
          title={t('pwa.dismiss')}
          className="size-6 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors cursor-pointer"
        >
          <X className="size-3.5" />
        </button>
      </aside>

      {/* ── Modale d'instructions pour iPhone & iPad (iOS Safari) ── */}
      {isIOS && (
        <Dialog open={showIOSModal} onOpenChange={setShowIOSModal}>
          <DialogContent className="max-w-sm rounded-3xl p-6">
            <DialogHeader className="text-left space-y-2">
              <div className="size-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mb-1">
                <Sparkles className="size-6" />
              </div>
              <DialogTitle className="font-display text-lg font-bold text-foreground">
                {t('pwa.iosTitle')}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
                {t('pwa.iosSubtitle')}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3.5 my-3">
              {/* Étape 1 */}
              <div className="flex items-start gap-3 p-3 rounded-2xl bg-muted/40 border border-border/50">
                <div className="size-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                  <Share className="size-4" />
                </div>
                <div className="text-xs">
                  <p className="font-bold text-foreground">{t('pwa.iosStep1')}</p>
                  <p className="text-muted-foreground mt-0.5">{t('pwa.iosStep1Desc')}</p>
                </div>
              </div>

              {/* Étape 2 */}
              <div className="flex items-start gap-3 p-3 rounded-2xl bg-muted/40 border border-border/50">
                <div className="size-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                  <PlusSquare className="size-4" />
                </div>
                <div className="text-xs">
                  <p className="font-bold text-foreground">
                    {t('pwa.iosStep2')}{' '}
                    <span className="text-primary font-bold">{t('pwa.iosStep2Bold')}</span>
                  </p>
                </div>
              </div>

              {/* Étape 3 */}
              <div className="flex items-start gap-3 p-3 rounded-2xl bg-muted/40 border border-border/50">
                <div className="size-8 rounded-xl bg-emerald-500/15 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
                  <CheckCircle2 className="size-4" />
                </div>
                <div className="text-xs">
                  <p className="font-bold text-foreground">{t('pwa.iosStep3')}</p>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                className="w-full rounded-xl bg-primary text-white font-bold h-11"
                onClick={() => setShowIOSModal(false)}
              >
                {t('pwa.iosGotIt')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
