import {
  Plus, Loader2, Minus, ShoppingBag, Truck, Sparkles, Pencil,
  MapPin, Phone, MessageSquare,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from '@/components/ui/sheet';
import {
  BOTTLE_LABELS,
  getBottleBasePrice,
  pricePerBottle,
  type BottleSize,
  type Cocktail,
} from '@/entities';
import { createOrder } from '@/services/order';
import { getPricingSettings } from '@/services/settings';
import { getFruits } from '@/services/fruit';
import { NutritionalView } from '@/components/features/cocktail/NutritionalView';
import { createCocktail } from '@/services/cocktail';
import { BottleSizePicker } from '@/components/features/cocktail/BottleSizePicker';
import { buildFruitVisuals, pickCocktailCoverUrl } from '@/components/features/cocktail/CocktailBanner';

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
  const [bottleSize, setBottleSize] = useState<BottleSize>('500ml');
  const [ordering, setOrdering] = useState(false);
  const [ordered, setOrdered] = useState(false);

  const [customName, setCustomName] = useState(cocktail.name);
  const [isEditingName, setIsEditingName] = useState(false);

  const [district, setDistrict] = useState('');
  const [phone, setPhone] = useState(user.phone || '');
  const [instructions, setInstructions] = useState('');

  const { data: pricing } = useQuery({
    queryKey: ['pricing-settings'],
    queryFn: getPricingSettings,
  });

  const { data: fruits = [] } = useQuery({
    queryKey: ['fruits'],
    queryFn: getFruits,
  });

  const fruitVisuals = buildFruitVisuals(cocktail.ingredients, fruits);
  const fruitImageUrls = fruitVisuals
    .map((f) => f.imageUrl)
    .filter((u): u is string => !!u);

  const coverUrl = pickCocktailCoverUrl(cocktail.imageUrl, fruitImageUrls);

  useEffect(() => {
    setCustomName(cocktail.name);
  }, [cocktail.name]);

  const canOrder = district.trim().length > 0 && phone.trim().length > 0;

  const hasAnalysis = !!cocktail.aiAnalysis;
  const analysis = cocktail.aiAnalysis;

  const price500 = pricing
    ? pricePerBottle(pricing, '500ml', cocktail.ingredients)
    : cocktail.totalPrice;
  const price1L = pricing
    ? pricePerBottle(pricing, '1L', cocktail.ingredients)
    : Math.round(cocktail.totalPrice * 1.6);

  const perBottle = bottleSize === '500ml' ? price500 : price1L;
  const deliveryFee = pricing?.deliveryFee ?? 500;
  const subtotal = perBottle * quantity;
  const total = subtotal + deliveryFee;

  async function handleOrder() {
    if (!pricing) return;
    setOrdering(true);
    try {
      const details = { district, phone, instructions };
      const pricingPayload = {
        bottleSize,
        bottleBasePrice: getBottleBasePrice(pricing, bottleSize),
        pricePerBottle: perBottle,
        deliveryFee,
      };

      if (cocktail.id === 'draft') {
        const cocktailId = await createCocktail({
          ...cocktail,
          name: customName,
          createdBy: user.uid,
          basePrice: pricingPayload.bottleBasePrice,
          totalPrice: perBottle,
          ...(coverUrl ? { imageUrl: coverUrl } : {}),
        });
        await createOrder(
          user,
          { ...cocktail, name: customName, id: cocktailId, totalPrice: perBottle, imageUrl: coverUrl },
          quantity,
          pricingPayload,
          details,
          {
            cocktailImageSnapshot: coverUrl,
            ingredientImageSnapshots: fruitVisuals.map((f) => f.imageUrl ?? ''),
          },
        );
      } else {
        await createOrder(
          user,
          { ...cocktail, name: customName, totalPrice: perBottle, imageUrl: coverUrl ?? cocktail.imageUrl },
          quantity,
          pricingPayload,
          details,
          {
            cocktailImageSnapshot: coverUrl ?? cocktail.imageUrl,
            ingredientImageSnapshots: fruitVisuals.map((f) => f.imageUrl ?? ''),
          },
        );
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
      setBottleSize('500ml');
      setOrdered(false);
      setActiveTab('order');
    }
    onOpenChange(v);
  }

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent side="right" className="w-full max-w-[500px] p-0 flex flex-col">

        <SheetHeader className="px-6 pt-5 pb-0 shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <SheetTitle className="font-display text-xl font-bold leading-tight flex items-center gap-2 text-[#F2694A]">
                {isEditingName ? (
                  <input
                    type="text"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    onBlur={() => setIsEditingName(false)}
                    onKeyDown={(e) => e.key === 'Enter' && setIsEditingName(false)}
                    autoFocus
                    className="bg-transparent border-b-2 border-primary outline-none px-1 py-0.5 w-full font-display text-xl font-bold"
                  />
                ) : (
                  <>
                    {customName}
                    <button
                      type="button"
                      onClick={() => setIsEditingName(true)}
                      className="p-1.5 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                      title="Renommer le cocktail"
                    >
                      <Pencil className="size-4" />
                    </button>
                  </>
                )}
              </SheetTitle>
              <p className="text-[13px] text-muted-foreground mt-0.5 truncate">
                {cocktail.ingredients.map((i) => i.fruitName).join(' · ')}
              </p>
            </div>
          </div>

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

        <div className="border-b border-border/40 mx-0 mt-4 shrink-0" />

        {ordered ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 px-8 text-center">
            <div className="size-20 rounded-full bg-primary/10 flex items-center justify-center">
              <ShoppingBag className="size-9 text-primary" />
            </div>
            <h3 className="font-display font-bold text-2xl text-foreground">Commande passée !</h3>
            <p className="text-muted-foreground text-sm leading-relaxed max-w-[260px]">
              Votre commande de <strong>{quantity} bouteille{quantity > 1 ? 's' : ''}</strong>{' '}
              <strong>{BOTTLE_LABELS[bottleSize]}</strong> de <strong>{customName}</strong> a été enregistrée.
            </p>
            <p className="text-primary font-bold text-lg">{total.toLocaleString()} XAF</p>
            <Button variant="outline" className="rounded-2xl px-8 mt-2" onClick={() => handleClose(false)}>
              Fermer
            </Button>
          </div>
        ) : activeTab === 'nutrition' && analysis ? (
          <div className="flex-1 overflow-y-auto px-6 py-5">
            <NutritionalView analysis={analysis} />
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">

              <BottleSizePicker
                selected={bottleSize}
                onSelect={setBottleSize}
                price500ml={price500}
                price1L={price1L}
              />

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
                      × {BOTTLE_LABELS[bottleSize].toLowerCase()}
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

              <div className="rounded-2xl border border-border/60 bg-card divide-y divide-border/40 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="text-[13px] text-muted-foreground">
                    {quantity} × {BOTTLE_LABELS[bottleSize]} · {perBottle.toLocaleString()} XAF
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
                    {deliveryFee.toLocaleString()} XAF
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

            <div className="shrink-0 border-t border-border/40 px-6 py-5">
              <Button
                size="lg"
                className="w-full h-14 rounded-2xl bg-primary hover:bg-primary/90 text-white font-bold text-base gap-2 shadow-[0_8px_25px_rgba(63,109,78,0.3)] disabled:opacity-50 active:scale-95 transition-all"
                disabled={ordering || !canOrder || !pricing}
                onClick={handleOrder}
              >
                {ordering ? (
                  <><Loader2 className="size-5 animate-spin" /> Commande en cours…</>
                ) : !canOrder ? (
                  <>Remplissez l&apos;adresse de livraison</>
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
