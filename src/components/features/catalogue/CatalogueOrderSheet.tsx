import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import {
  Plus, Loader2, Minus, ShoppingBag, Truck, CheckCircle2,
  MapPin, Phone, MessageSquare, Sparkles,
} from 'lucide-react';
import { DELIVERY_FEE } from '@/entities';
import type { Cocktail, AIAnalysis } from '@/entities';
import type { Fruit } from '@/entities';
import { analyzeCocktail } from '@/services/ai';
import { cloneCocktailFromCatalogue } from '@/services/cocktail';
import { createOrder } from '@/services/order';
import { getFruits } from '@/services/fruit';
import { useAuthStore } from '@/stores/auth';
import { useProfileStore } from '@/stores/profile';
import { NutritionalView, VERDICT_CONFIG } from '@/components/features/cocktail/NutritionalView';

type Tab = 'order' | 'nutrition';

type Props = {
  cocktail: Cocktail | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
};

export function CatalogueOrderSheet({ cocktail, open, onOpenChange }: Props) {
  const { user } = useAuthStore();
  const { profile } = useProfileStore();

  const [activeTab, setActiveTab] = useState<Tab>('order');
  const [localAnalysis, setLocalAnalysis] = useState<AIAnalysis | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [ordering, setOrdering] = useState(false);
  const [ordered, setOrdered] = useState(false);

  // Delivery details
  const [district, setDistrict] = useState('');
  const [phone, setPhone] = useState(user?.phone || '');
  const [instructions, setInstructions] = useState('');

  // Fruits cached from react-query — needed for AI analysis
  const { data: fruits = [] } = useQuery({
    queryKey: ['fruits'],
    queryFn: getFruits,
  });

  if (!cocktail) return null;

  const hasAnalysis = !!localAnalysis;
  const verdictCfg = localAnalysis ? VERDICT_CONFIG[localAnalysis.verdict] : null;
  const perBottle = cocktail.totalPrice;
  const subtotal = perBottle * quantity;
  const total = subtotal + DELIVERY_FEE;

  async function runAnalysis(): Promise<AIAnalysis | null> {
    if (fruits.length === 0) return null;
    const ingredients = cocktail!.ingredients
      .map((ing) => {
        const fruit = fruits.find((f: Fruit) => f.id === ing.fruitId);
        return fruit ? { fruit, grams: ing.quantityGrams } : null;
      })
      .filter((x): x is { fruit: Fruit; grams: number } => x !== null);
    return analyzeCocktail(ingredients, profile);
  }

  async function handleAnalyze() {
    setAnalyzing(true);
    try {
      const result = await runAnalysis();
      if (result) {
        setLocalAnalysis(result);
        setActiveTab('nutrition');
      }
    } finally {
      setAnalyzing(false);
    }
  }

  async function handleOrder() {
    if (!user) return;
    setOrdering(true);
    try {
      // Run AI analysis in background if not already done
      let analysis = localAnalysis;
      if (!analysis) {
        try {
          analysis = await runAnalysis();
          if (analysis) setLocalAnalysis(analysis);
        } catch {
          // analysis is optional — don't block the order
        }
      }

      const deliveryDetails = district.trim()
        ? { district: district.trim(), phone: phone.trim(), instructions: instructions.trim() }
        : undefined;

      const cloned = await cloneCocktailFromCatalogue(
        cocktail!,
        user.uid,
        analysis ?? undefined,
      );
      await createOrder(user, cloned, quantity, deliveryDetails);
      setOrdered(true);
    } finally {
      setOrdering(false);
    }
  }

  function handleClose(v: boolean) {
    if (!v) {
      setActiveTab('order');
      setLocalAnalysis(null);
      setQuantity(1);
      setOrdered(false);
      setDistrict('');
      setPhone(user?.phone || '');
      setInstructions('');
    }
    onOpenChange(v);
  }

  const deliveryOk = district.trim().length > 0;

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent side="right" className="w-full max-w-[500px] p-0 flex flex-col">

        {/* Cocktail image banner */}
        {cocktail.imageUrl && (
          <div className="relative h-44 shrink-0 overflow-hidden">
            <div
              className="absolute inset-0 bg-cover bg-center scale-100 transition-transform duration-700"
              style={{ backgroundImage: `url('${cocktail.imageUrl}')` }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
            {cocktail.tag && (
              <div className="absolute top-4 left-4 bg-secondary text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full shadow">
                {cocktail.tag}
              </div>
            )}
          </div>
        )}

        {/* Header */}
        <SheetHeader className="px-6 pt-5 pb-0 shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <SheetTitle className="font-display text-xl font-bold text-foreground leading-tight">
                {cocktail.name}
              </SheetTitle>
              <p className="text-[13px] text-muted-foreground mt-0.5 truncate">
                {cocktail.ingredients.map((i) => i.fruitName).join(' · ')}
              </p>
            </div>
            {hasAnalysis && verdictCfg && (
              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold shrink-0 mt-0.5 ${verdictCfg.chip}`}>
                {verdictCfg.emoji} {verdictCfg.label}
              </span>
            )}
          </div>

          {/* Tab bar */}
          <div className="flex gap-1 bg-muted rounded-xl p-1 mt-4">
            <button
              type="button"
              onClick={() => setActiveTab('order')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[12px] font-semibold transition-all ${
                activeTab === 'order'
                  ? 'bg-background shadow-sm text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <ShoppingBag className="size-3.5" />
              Commander
            </button>
            {hasAnalysis ? (
              <button
                type="button"
                onClick={() => setActiveTab('nutrition')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[12px] font-semibold transition-all ${
                  activeTab === 'nutrition'
                    ? 'bg-background shadow-sm text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Sparkles className="size-3.5" />
                Fiche NutriFYS
              </button>
            ) : (
              <button
                type="button"
                onClick={handleAnalyze}
                disabled={analyzing}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[12px] font-semibold transition-all text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30 disabled:opacity-60"
              >
                {analyzing ? (
                  <><Loader2 className="size-3.5 animate-spin" /> Analyse…</>
                ) : (
                  <><Sparkles className="size-3.5" /> Analyser IA</>
                )}
              </button>
            )}
          </div>
        </SheetHeader>

        <div className="border-b border-border/40 mt-4 shrink-0" />

        {/* ── Success state ── */}
        {ordered ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 px-8 text-center">
            <div className="size-20 rounded-full bg-primary/10 flex items-center justify-center">
              <CheckCircle2 className="size-9 text-primary" />
            </div>
            <h3 className="font-display font-bold text-2xl text-foreground">Commande passée !</h3>
            <p className="text-muted-foreground text-sm leading-relaxed max-w-[260px]">
              Votre commande de <strong>{quantity} bouteille{quantity > 1 ? 's' : ''}</strong> de{' '}
              <strong>{cocktail.name}</strong> a été enregistrée.
              {hasAnalysis && ' La fiche nutritionnelle a été sauvegardée avec votre commande.'}
            </p>
            <p className="text-primary font-bold text-lg">{total.toLocaleString()} XAF</p>
            <Button variant="outline" className="rounded-2xl px-8 mt-2" onClick={() => handleClose(false)}>
              Fermer
            </Button>
          </div>

        ) : activeTab === 'nutrition' && localAnalysis ? (
          /* ── Fiche NutriFYS tab ── */
          <div className="flex-1 overflow-y-auto px-6 py-5">
            <div className="mb-4 px-3 py-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-700/40">
              <p className="text-[11px] text-amber-700 dark:text-amber-400 font-semibold leading-relaxed">
                ✦ Analyse locale — sera sauvegardée automatiquement à la validation de votre commande.
              </p>
            </div>
            <NutritionalView analysis={localAnalysis} />
          </div>

        ) : (
          /* ── Commander tab ── */
          <>
            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">

              {/* Description */}
              {cocktail.description && (
                <p className="text-[13px] text-muted-foreground leading-relaxed">
                  {cocktail.description}
                </p>
              )}

              {/* Ingrédients avec grammage */}
              <div className="space-y-3">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                  Composition
                </p>
                <div className="rounded-2xl border border-border/60 bg-card divide-y divide-border/40 overflow-hidden">
                  {cocktail.ingredients.map((ing) => (
                    <div key={ing.fruitId} className="flex items-center justify-between px-4 py-3">
                      <span className="text-[13px] font-semibold text-foreground">{ing.fruitName}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-[12px] text-muted-foreground">{ing.quantityGrams}g</span>
                        <span className="text-[13px] font-bold text-foreground tabular-nums">
                          {ing.priceSnapshot.toLocaleString()} XAF
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Nombre de bouteilles */}
              <div className="space-y-3">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                  Nombre de bouteilles
                </p>
                <div className="flex items-center justify-between rounded-2xl border border-border/60 bg-card px-5 py-4">
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    disabled={quantity <= 1}
                    className="size-10 rounded-full bg-muted hover:bg-muted/80 flex items-center justify-center disabled:opacity-30 active:scale-90 transition-all"
                  >
                    <Minus className="size-4" />
                  </button>
                  <div className="text-center">
                    <span className="font-display font-bold text-3xl text-foreground tabular-nums">
                      {quantity}
                    </span>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      bouteille{quantity > 1 ? 's' : ''}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => q + 1)}
                    className="size-10 rounded-full bg-primary/10 hover:bg-primary/20 text-primary flex items-center justify-center active:scale-90 transition-all"
                  >
                    <Plus className="size-4" />
                  </button>
                </div>
              </div>

              {/* Informations de livraison */}
              <div className="space-y-3">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                  Livraison
                </p>
                <div className="rounded-2xl border border-border/60 bg-card p-4 space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-foreground flex items-center gap-1.5 uppercase">
                      <MapPin className="size-3.5 text-primary" /> Quartier exact
                    </label>
                    <input
                      type="text"
                      className="w-full h-10 px-3 bg-muted/60 border border-border/40 rounded-xl text-sm focus:outline-none focus:border-primary/50 transition-colors"
                      placeholder="Ex: Bonamoussadi, Carrefour..."
                      value={district}
                      onChange={(e) => setDistrict(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-foreground flex items-center gap-1.5 uppercase">
                      <Phone className="size-3.5 text-primary" /> Téléphone
                    </label>
                    <input
                      type="tel"
                      className="w-full h-10 px-3 bg-muted/60 border border-border/40 rounded-xl text-sm focus:outline-none focus:border-primary/50 transition-colors"
                      placeholder="Ex: 6 90 00 00 00"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-foreground flex items-center gap-1.5 uppercase">
                      <MessageSquare className="size-3.5 text-primary" /> Indications supplémentaires
                    </label>
                    <textarea
                      className="w-full h-20 p-3 bg-muted/60 border border-border/40 rounded-xl text-sm focus:outline-none focus:border-primary/50 transition-colors resize-none"
                      placeholder="Ex: Derrière la pharmacie, portail noir..."
                      value={instructions}
                      onChange={(e) => setInstructions(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Récap total */}
              <div className="rounded-2xl border border-border/60 bg-card divide-y divide-border/40 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="text-[13px] text-muted-foreground">
                    {quantity} × {perBottle.toLocaleString()} XAF
                  </span>
                  <span className="text-[13px] font-semibold text-foreground">
                    {subtotal.toLocaleString()} XAF
                  </span>
                </div>
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="text-[13px] text-muted-foreground flex items-center gap-1.5">
                    <Truck className="size-3.5" /> Livraison
                  </span>
                  <span className="text-[13px] font-semibold text-foreground">
                    {DELIVERY_FEE.toLocaleString()} XAF
                  </span>
                </div>
                <div className="flex items-center justify-between px-4 py-4 bg-primary/5">
                  <span className="text-[15px] font-bold text-foreground">Total</span>
                  <span className="text-[18px] font-bold text-primary tabular-nums">
                    {total.toLocaleString()} XAF
                  </span>
                </div>
              </div>

              {/* Info analyse auto */}
              {!hasAnalysis && (
                <div className="flex items-start gap-3 px-4 py-3 rounded-2xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-700/40">
                  <Sparkles className="size-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <p className="text-[12px] text-amber-700 dark:text-amber-400 font-medium leading-relaxed">
                    L'analyse NutriFYS sera lancée automatiquement à la validation de votre commande.
                  </p>
                </div>
              )}
            </div>

            {/* Footer CTA */}
            <div className="shrink-0 border-t border-border/40 px-6 py-5">
              <Button
                size="lg"
                className="w-full h-14 rounded-2xl bg-primary hover:bg-primary/90 text-white font-bold text-base gap-2 shadow-[0_8px_25px_rgba(63,109,78,0.3)] active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={ordering || !deliveryOk}
                onClick={handleOrder}
              >
                {ordering ? (
                  <><Loader2 className="size-5 animate-spin" /> Commande en cours…</>
                ) : !deliveryOk ? (
                  <>Remplissez l'adresse de livraison</>
                ) : (
                  <><ShoppingBag className="size-5" /> Commander · {total.toLocaleString()} XAF</>
                )}
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
