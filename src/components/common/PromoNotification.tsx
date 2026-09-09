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

  if (!mounted || !promoCode || dismissed || !pricing) return null;

  const validation = validatePromoCode(promoCode, pricing);
  if (!validation) return null;

  // Ne pas afficher de message d'erreur persistant si le code n'a pas été capturé à l'instant dans l'URL
  if (!validation.isValid && !justCaptured) {
    return null;
  }

  const handleNavigate = (path: string) => {
    handleDismiss();
    window.location.assign(path);
  };

  return (
    <aside
      role="status"
      aria-label="Notification de réduction"
      className="fixed bottom-4 left-4 right-4 md:bottom-6 md:right-6 md:left-auto md:max-w-md z-50 animate-pop-in-cute shadow-2xl"
    >
      {validation.isValid ? (
        <div className="rounded-2xl border border-amber-500/40 bg-gradient-to-r from-amber-500/15 via-background to-background backdrop-blur-md p-4 flex items-start gap-3.5 text-foreground">
          <div className="size-9 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
            <Sparkles className="size-4 animate-spin-slow" />
          </div>

          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                Offre Spéciale Activée
              </span>
              <span className="text-[10px] font-mono font-bold bg-amber-500/20 text-amber-800 dark:text-amber-300 px-1.5 py-0.5 rounded-md">
                {promoCode}
              </span>
            </div>

            <p className="text-sm font-semibold leading-snug">
              Bénéficiez de <span className="text-amber-600 dark:text-amber-400 font-bold">{validation.discountAmount.toLocaleString()} XAF</span> de réduction déduits de votre commande !
            </p>

            <div className="pt-1.5 flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleNavigate('/lab')}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline"
              >
                <span>Composer un jus</span>
                <ArrowRight className="size-3" />
              </button>
              <span className="text-muted-foreground/40 text-xs">•</span>
              <button
                type="button"
                onClick={() => handleNavigate('/board/catalogue')}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
              >
                <span>Voir le catalogue</span>
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Fermer la notification"
            className="size-7 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground shrink-0 transition-colors"
          >
            <X className="size-4" />
          </button>
        </div>
      ) : (
        <div className="rounded-2xl border border-red-500/40 bg-background/95 backdrop-blur-md p-4 flex items-start gap-3 text-foreground">
          <div className="size-8 rounded-xl bg-red-500/10 text-red-500 flex items-center justify-center shrink-0 mt-0.5">
            <TimerOff className="size-4" />
          </div>

          <div className="flex-1 min-w-0 space-y-0.5">
            <p className="text-xs font-bold text-red-600 dark:text-red-400">
              Lien promotionnel inactif ou expiré
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {validation.description} Votre commande sera traitée aux tarifs standards.
            </p>
          </div>

          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Fermer la notification"
            className="size-7 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground shrink-0 transition-colors"
          >
            <X className="size-4" />
          </button>
        </div>
      )}
    </aside>
  );
}
