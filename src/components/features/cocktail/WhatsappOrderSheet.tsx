import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sparkles, MessageCircle, ArrowRight, ShieldCheck, HeartPulse, Check, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { Cocktail, Fruit, AIAnalysis } from '@/entities';
import { createWhatsappDraftOrder } from '@/services/order';

interface WhatsappOrderSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cocktail: Cocktail;
  fruits: Fruit[];
  analysis?: AIAnalysis | null;
  healthProfile?: {
    healthConditions: string[];
    allergies: string[];
    goals: string[];
  } | null;
  hasAddedSugar?: boolean;
  promoCode?: string;
  whatsappSupportNumber?: string;
}

export function WhatsappOrderSheet({
  open,
  onOpenChange,
  cocktail,
  fruits,
  analysis,
  healthProfile,
  hasAddedSugar = false,
  promoCode,
  whatsappSupportNumber = '237691850125',
}: WhatsappOrderSheetProps) {
  const { t } = useTranslation();

  // Initialisation avec les valeurs mémorisées dans le navigateur si existantes
  const [name, setName] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('fys_guest_name') || '';
    }
    return '';
  });

  const [phone, setPhone] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('fys_guest_phone') || '';
    }
    return '';
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Normalisation du numéro pour affichage et validation
  const cleanDigits = phone.replace(/\D/g, '');
  const isValidPhone = cleanDigits.length >= 9;

  async function handleContinueToWhatsApp() {
    if (!name.trim()) {
      setError('Veuillez entrer votre prénom.');
      return;
    }
    if (!isValidPhone) {
      setError('Veuillez entrer un numéro WhatsApp valide (ex: 691 85 01 25).');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      // 1. Mémoriser dans le navigateur pour les prochaines visites
      if (typeof window !== 'undefined') {
        localStorage.setItem('fys_guest_name', name.trim());
        localStorage.setItem('fys_guest_phone', phone.trim());
      }

      // 2. Création de la commande draft et de l'utilisateur dans Firestore
      const { orderCode } = await createWhatsappDraftOrder({
        customerName: name.trim(),
        customerPhone: phone.trim(),
        cocktail,
        healthProfile: healthProfile || undefined,
        aiAnalysis: analysis || undefined,
        hasAddedSugar,
        estimatedPrice: cocktail.totalPrice || 2000,
        promoCode,
      });

      // 3. Préparation du message prérempli WhatsApp
      const cocktailName = cocktail.name || 'Mon Jus FYS';
      const cleanWaNumber = whatsappSupportNumber.replace(/\D/g, '');
      const message = `Bonjour NutriFYS ! Je viens de composer mon jus "${cocktailName}" sur le site FYS. Voici le numéro de ma commande : #${orderCode} 🍍`;
      const waUrl = `https://wa.me/${cleanWaNumber}?text=${encodeURIComponent(message)}`;

      // 4. Fermer la sheet et rediriger vers WhatsApp
      onOpenChange(false);
      window.open(waUrl, '_blank') || (window.location.href = waUrl);
    } catch (err: any) {
      console.error('Erreur redirection WhatsApp:', err);
      setError(err?.message || 'Une erreur est survenue lors de la création de la commande.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg p-0 flex flex-col bg-background border-l border-border/40 shadow-2xl">
        <SheetHeader className="px-6 pt-6 pb-4 border-b border-border/40 shrink-0">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wider bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
              <Sparkles className="size-3.5 text-emerald-600 dark:text-emerald-400 animate-pulse" />
              Commande sans inscription
            </span>
          </div>
          <SheetTitle className="text-xl sm:text-2xl font-bold font-display text-foreground text-left">
            Finaliser avec NutriFYS sur WhatsApp
          </SheetTitle>
        </SheetHeader>

        {/* Corps défilable */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {/* 1. Résumé du jus composé */}
          <div className="p-4 rounded-2xl bg-card border border-border/60 shadow-xs space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Votre création</p>
                <h4 className="text-lg font-bold font-display text-foreground">{cocktail.name || 'Mon Jus Personnalisé'}</h4>
              </div>
              <span className="text-xs font-extrabold px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
                100% Naturel {hasAddedSugar ? '+ Sucre de canne' : 'Sans sucre ajouté'}
              </span>
            </div>

            {/* Ingrédients */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {cocktail.ingredients.map((ing) => {
                const f = fruits.find((fruit) => fruit.id === ing.fruitId);
                return (
                  <span
                    key={ing.fruitId}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-muted text-foreground"
                  >
                    <span>{f?.name || ing.fruitId}</span>
                    {ing.percentage > 0 && <span className="text-[10px] text-muted-foreground font-bold">({ing.percentage}%)</span>}
                  </span>
                );
              })}
            </div>
          </div>

          {/* 2. Analyse NutriFYS personnalisée */}
          {analysis && (
            <div className="p-4 rounded-2xl bg-gradient-to-br from-[#3F6D4E]/10 via-[#3F6D4E]/5 to-transparent border border-[#3F6D4E]/25 space-y-3">
              <div className="flex items-center gap-2">
                <HeartPulse className="size-4.5 text-[#3F6D4E] dark:text-[#AECBB2]" />
                <h5 className="text-sm font-bold text-foreground">Bilan NutriFYS adapté à votre santé</h5>
              </div>

              {analysis.punchline && (
                <p className="text-xs text-foreground/90 font-medium leading-relaxed italic">
                  « {analysis.punchline} »
                </p>
              )}

              {analysis.benefits && analysis.benefits.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  {analysis.benefits.slice(0, 3).map((benefit, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                      <Check className="size-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                      <span>{benefit}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 3. Formulaire Client : Prénom + WhatsApp */}
          <div className="p-5 rounded-2xl bg-muted/40 border border-border/60 space-y-4">
            <div className="space-y-1">
              <h5 className="text-sm font-bold text-foreground flex items-center gap-2">
                <ShieldCheck className="size-4 text-emerald-600" />
                Vos coordonnées pour la livraison
              </h5>
              <p className="text-xs text-muted-foreground">
                NutriFYS vous répondra directement sur WhatsApp pour confirmer l'adresse et le format.
              </p>
            </div>

            <div className="space-y-3 pt-1">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground uppercase tracking-wider">
                  Votre Prénom
                </label>
                <Input
                  type="text"
                  placeholder="Ex : Samuel, Marie, Alex..."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-11 rounded-xl bg-background border-border/80 focus:border-emerald-500 font-medium text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground uppercase tracking-wider">
                  Votre Numéro WhatsApp
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-3 text-xs font-bold text-muted-foreground select-none">
                    🇨🇲 +237
                  </span>
                  <Input
                    type="tel"
                    placeholder="6XX XX XX XX"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="h-11 pl-20 rounded-xl bg-background border-border/80 focus:border-emerald-500 font-medium text-sm tracking-wide"
                  />
                </div>
              </div>

              {error && (
                <div className="p-2.5 rounded-xl bg-destructive/10 text-destructive text-xs font-semibold">
                  {error}
                </div>
              )}
            </div>
          </div>

          {/* 4. Ce qui va se passer ensuite */}
          <div className="px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-800 dark:text-amber-300 space-y-1">
            <p className="font-bold flex items-center gap-1.5">
              <span>💬</span> Sur WhatsApp, NutriFYS va :
            </p>
            <ul className="list-disc list-inside space-y-0.5 text-[11px] text-amber-900/80 dark:text-amber-300/80">
              <li>Vous proposer le format souhaité (500 ml ou 1 Litre)</li>
              <li>Calculer vos frais de livraison selon votre quartier</li>
              <li>Valider votre commande en 1 minute chrono</li>
            </ul>
          </div>
        </div>

        {/* Footer avec bouton WhatsApp */}
        <div className="p-5 border-t border-border/40 shrink-0 bg-background space-y-2">
          <Button
            onClick={handleContinueToWhatsApp}
            disabled={loading}
            size="lg"
            className="w-full h-14 rounded-2xl bg-[#25D366] hover:bg-[#20ba59] text-white font-display font-extrabold text-base shadow-lg shadow-[#25D366]/25 transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2.5"
          >
            {loading ? (
              <>
                <Loader2 className="size-5 animate-spin" />
                <span>Préparation de votre commande...</span>
              </>
            ) : (
              <>
                <MessageCircle className="size-5 fill-current" />
                <span>Continuer sur WhatsApp avec NutriFYS</span>
                <ArrowRight className="size-4.5" />
              </>
            )}
          </Button>
          <p className="text-[11px] text-center text-muted-foreground font-medium">
            Aucun mot de passe requis. Votre compte est créé automatiquement avec votre numéro.
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}
