import {
  Plus, Loader2, Minus, ShoppingBag, Truck, Sparkles,
} from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from '@/components/ui/sheet';
import { DELIVERY_FEE } from '@/entities';
import type { Cocktail } from '@/entities';
import { createOrder } from '@/services/order';
import { NutritionalView, VERDICT_CONFIG } from '@/components/features/cocktail/NutritionalView';
import { createCocktail } from '@/services/cocktail';

// ── Order Sheet ───────────────────────────────────────────────────────────────

type SheetTab = 'order' | 'nutrition';

type UserInfo = { uid: string; name: string; email: string; phone?: string };

export function OrderSheet({
  cocktail,
  open,
  onOpenChange,
  user,
  onOrderSuccess,
}: {
  cocktail: Cocktail;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  user: UserInfo;
  onOrderSuccess?: () => void;
}) {
  const [activeTab, setActiveTab] = useState<SheetTab>('order');
  const [quantity, setQuantity] = useState(1);
  const [ordering, setOrdering] = useState(false);
  const [ordered, setOrdered] = useState(false);

  const hasAnalysis = !!cocktail.aiAnalysis;
  const analysis = cocktail.aiAnalysis;
  const verdictCfg = analysis ? VERDICT_CONFIG[analysis.verdict] : null;

  const perBottle = cocktail.totalPrice;
  const subtotal = perBottle * quantity;
  const total = subtotal + DELIVERY_FEE;

  async function handleOrder() {
    setOrdering(true);
    try {
      if (cocktail.id === "draft") {
        const cocktailId = await createCocktail({
          ...cocktail,
          createdBy: user.uid,
        });
        await createOrder(user, { ...cocktail, id: cocktailId }, quantity);
      } else {
        await createOrder(user, cocktail, quantity);
      }
      setOrdered(true);
      onOrderSuccess?.();
    } finally {
      setOrdering(false);
    }
  }

  function handleClose(v: boolean) {
    if (!v) {
      setQuantity(1);
      setOrdered(false);
      setActiveTab('order');
    }
    onOpenChange(v);
  }

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent side="right" className="w-full max-w-[500px] p-0 flex flex-col">

        {/* Header */}
        <SheetHeader className="px-6 pt-6 pb-0 shrink-0">
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

          {/* Tab switcher — only when analysis exists */}
          {hasAnalysis && (
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
            </div>
          )}
        </SheetHeader>

        {/* Separator */}
        <div className="border-b border-border/40 mx-0 mt-4 shrink-0" />

        {ordered ? (
          /* ── Success state ── */
          <div className="flex-1 flex flex-col items-center justify-center gap-4 px-8 text-center">
            <div className="size-20 rounded-full bg-primary/10 flex items-center justify-center">
              <ShoppingBag className="size-9 text-primary" />
            </div>
            <h3 className="font-display font-bold text-2xl text-foreground">Commande passée !</h3>
            <p className="text-muted-foreground text-sm leading-relaxed max-w-[260px]">
              Votre commande de <strong>{quantity} bouteille{quantity > 1 ? 's' : ''}</strong> de{' '}
              <strong>{cocktail.name}</strong> a été enregistrée. Vous serez notifié de sa progression.
            </p>
            <p className="text-primary font-bold text-lg">{total.toLocaleString()} XAF</p>
            <Button variant="outline" className="rounded-2xl px-8 mt-2" onClick={() => handleClose(false)}>
              Fermer
            </Button>
          </div>
        ) : activeTab === 'nutrition' && analysis ? (
          /* ── Nutrition tab ── */
          <div className="flex-1 overflow-y-auto px-6 py-5">
            <NutritionalView analysis={analysis} />
          </div>
        ) : (
          /* ── Order tab ── */
          <>
            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">

              {/* Prix par bouteille */}
              <div className="space-y-3">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                  Détail des prix
                </p>
                <div className="rounded-2xl border border-border/60 bg-card divide-y divide-border/40 overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3">
                    <span className="text-[13px] text-muted-foreground">Base 50cl</span>
                    <span className="text-[13px] font-semibold text-foreground">
                      {cocktail.basePrice.toLocaleString()} XAF
                    </span>
                  </div>
                  {cocktail.ingredients.map((ing) => (
                    <div key={ing.fruitId} className="flex items-center justify-between px-4 py-3">
                      <span className="text-[13px] text-muted-foreground">{ing.fruitName}</span>
                      <span className="text-[13px] font-semibold text-foreground">
                        + {ing.priceSnapshot.toLocaleString()} XAF
                      </span>
                    </div>
                  ))}
                  <div className="flex items-center justify-between px-4 py-3.5 bg-primary/5">
                    <span className="text-[13px] font-bold text-foreground">Prix / bouteille</span>
                    <span className="text-[15px] font-bold text-primary">
                      {perBottle.toLocaleString()} XAF
                    </span>
                  </div>
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
            </div>

            {/* Footer CTA */}
            <div className="shrink-0 border-t border-border/40 px-6 py-5">
              <Button
                size="lg"
                className="w-full h-14 rounded-2xl bg-primary hover:bg-primary/90 text-white font-bold text-base gap-2 shadow-[0_8px_25px_rgba(63,109,78,0.3)] active:scale-95 transition-all"
                disabled={ordering}
                onClick={handleOrder}
              >
                {ordering ? (
                  <><Loader2 className="size-5 animate-spin" /> Commande en cours…</>
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