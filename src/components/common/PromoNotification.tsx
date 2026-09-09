import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Sparkles, X, ArrowRight, TimerOff } from 'lucide-react';
import { getPricingSettings } from '@/services/settings';
import { capturePromoCodeFromUrl, getStoredPromoCode, validatePromoCode } from '@/utils/promo';

export function PromoNotification() {
  const [mounted, setMounted] = useState(false);
  const [promoCode, setPromoCode] = useState<string | null>(null);
  const [justCaptured, setJustCaptured] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const { data: pricing } = useQuery({
    queryKey: ['pricing-settings'],
    queryFn: getPricingSettings,
  });

  useEffect(() => {
    setMounted(true);
    // 1. Détecte si un code promo est présent dans l'URL
    const fromUrl = capturePromoCodeFromUrl();
    if (fromUrl) {
      setPromoCode(fromUrl);
      setJustCaptured(true);
      return;
    }

    // 2. Sinon, récupère le code mémorisé dans la session
    const stored = getStoredPromoCode();
    if (stored) {
      // Vérifie si l'utilisateur l'a déjà fermé dans cette session
      const isDismissed = sessionStorage.getItem(`fys_promo_dismissed_${stored}`);
      if (!isDismissed) {
        setPromoCode(stored);
      }
    }

    // 3. Écoute les mises à jour dynamiques du code promo
    const handleUpdate = (e: Event) => {
      const custom = e as CustomEvent<{ code: string | null }>;
      if (custom.detail?.code) {
        setPromoCode(custom.detail.code);
        setDismissed(false);
      } else {
        setPromoCode(null);
      }
    };

    window.addEventListener('fys:promo-updated', handleUpdate);
    return () => window.removeEventListener('fys:promo-updated', handleUpdate);
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    if (promoCode) {
      try {
        sessionStorage.setItem(`fys_promo_dismissed_${promoCode}`, 'true');
      } catch {
        // Ignore
      }
    }
  };

  // Disparaît automatiquement après 7 secondes pour ne jamais gêner la navigation
  useEffect(() => {
    if (promoCode && !dismissed) {
      const timer = setTimeout(() => {
        handleDismiss();
      }, 7000);
      return () => clearTimeout(timer);
    }
  }, [promoCode, dismissed]);

  if (!mounted || !promoCode || dismissed || !pricing) return null;

  const validation = validatePromoCode(promoCode, pricing);
  if (!validation) return null;

  // Ne pas afficher de message d'erreur persistant si le code n'a pas été capturé à l'instant dans l'URL
  if (!validation.isValid && !justCaptured) {
    return null;
  }

  return (
    <aside
      role="status"
      aria-label="Notification de réduction"
      className="fixed top-3 sm:top-4 left-1/2 -translate-x-1/2 z-50 max-w-[94vw] sm:max-w-lg pointer-events-auto transition-all duration-300 animate-in fade-in slide-in-from-top-4"
    >
      {validation.isValid ? (
        <div className="rounded-full border border-amber-500/40 bg-background/90 dark:bg-card/90 backdrop-blur-xl px-3.5 py-1.5 sm:py-2 shadow-[0_8px_30px_rgba(245,158,11,0.18)] flex items-center gap-2.5 text-foreground">
          <div className="size-6 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <Sparkles className="size-3.5 animate-spin-slow" />
          </div>

          <div className="flex items-center gap-1.5 min-w-0 text-xs sm:text-sm font-semibold truncate">
            <span>
              Réduction de <strong className="text-amber-600 dark:text-amber-400 font-bold">{validation.discountAmount.toLocaleString()} XAF</strong> activée !
            </span>
            <span className="font-mono font-bold text-[10px] bg-amber-500/20 text-amber-800 dark:text-amber-300 px-1.5 py-0.5 rounded-md hidden sm:inline-block shrink-0">
              {promoCode}
            </span>
          </div>

          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Fermer la notification"
            className="size-6 rounded-full hover:bg-muted/80 flex items-center justify-center text-muted-foreground hover:text-foreground shrink-0 transition-colors ml-1"
          >
            <X className="size-3.5" />
          </button>
        </div>
      ) : (
        <div className="rounded-full border border-red-500/40 bg-background/95 dark:bg-card/95 backdrop-blur-xl px-3.5 py-1.5 sm:py-2 shadow-lg flex items-center gap-2.5 text-foreground">
          <div className="size-6 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center shrink-0">
            <TimerOff className="size-3.5" />
          </div>

          <span className="text-xs font-semibold text-muted-foreground truncate">
            {validation.description}
          </span>

          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Fermer la notification"
            className="size-6 rounded-full hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground shrink-0 transition-colors ml-1"
          >
            <X className="size-3.5" />
          </button>
        </div>
      )}
    </aside>
  );
}
