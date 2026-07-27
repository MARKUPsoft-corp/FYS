import {
  Plus, Loader2, Minus, ShoppingBag, Truck, Sparkles, Pencil,
  MapPin, Phone, MessageSquare,
} from 'lucide-react';
import { YaoundeDistrictPicker, YAOUNDE_DISTRICTS } from '@/components/features/orders/YaoundeDistrictPicker';
import { GeolocationButton } from '@/components/features/orders/GeolocationButton';
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
import { CameroonMap } from '@/components/features/cocktail/CameroonMap';

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
  const [quantity500ml, setQuantity500ml] = useState(0);
  const [quantity1L, setQuantity1L] = useState(0);
  const [ordering, setOrdering] = useState(false);
  const [ordered, setOrdered] = useState(false);

  const [customName, setCustomName] = useState(cocktail.name);
  const [isEditingName, setIsEditingName] = useState(false);

  const [district, setDistrict] = useState('');
  const [phone, setPhone] = useState(user.phone || '');
  const [instructions, setInstructions] = useState('');
  const [coordinates, setCoordinates] = useState<{ lat: number; lng: number }>();

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

  const coverUrl = pickCocktailCoverUrl(cocktail, fruitImageUrls);

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

  const deliveryFee = pricing?.deliveryFee ?? 500;
  const subtotal = (price500 * quantity500ml) + (price1L * quantity1L);
  const total = subtotal + deliveryFee;
  const totalBottles = quantity500ml + quantity1L;

  async function handleOrder() {
    if (!pricing) return;
    setOrdering(true);
    console.log('[OrderSheet] Starting order...');
    try {
      const details = { district, phone, instructions, ...(coordinates ? { coordinates } : {}) };
      
      // Créer des lignes de commande pour chaque format avec quantité > 0
      const orderLines: Array<{
        bottleSize: BottleSize;
        quantity: number;
        bottleBasePrice: number;
        pricePerBottle: number;
      }> = [];
      
      if (quantity500ml > 0) {
        orderLines.push({
          bottleSize: '500ml',
          quantity: quantity500ml,
          bottleBasePrice: pricing.bottle500mlBase,
          pricePerBottle: price500,
        });
      }
      
      if (quantity1L > 0) {
        orderLines.push({
          bottleSize: '1L',
          quantity: quantity1L,
          bottleBasePrice: pricing.bottle1LBase,
          pricePerBottle: price1L,
        });
      }

      if (cocktail.id === 'draft') {
        console.log('[OrderSheet] Creating draft cocktail...');
        const cocktailId = await createCocktail({
          ...cocktail,
          name: customName,
          createdBy: user.uid,
          basePrice: pricing.bottle500mlBase,
          totalPrice: price500, // Prix de référence
          ...(coverUrl ? { imageUrl: coverUrl } : {}),
        });
        console.log('[OrderSheet] Draft cocktail created:', cocktailId);
        
        // Créer une seule commande avec toutes les lignes
        await createOrder(
          user,
          { ...cocktail, name: customName, id: cocktailId, totalPrice: price500, imageUrl: coverUrl },
          orderLines,
          deliveryFee,
          details,
          {
            cocktailImageSnapshot: coverUrl,
            ingredientImageSnapshots: fruitVisuals.map((f) => f.imageUrl ?? ''),
          },
        );
      } else {
        console.log('[OrderSheet] Creating order for existing cocktail:', cocktail.id);
        await createOrder(
          user,
          { ...cocktail, name: customName, totalPrice: price500, imageUrl: coverUrl ?? cocktail.imageUrl },
          orderLines,
          deliveryFee,
          details,
          {
            cocktailImageSnapshot: coverUrl ?? cocktail.imageUrl,
            ingredientImageSnapshots: fruitVisuals.map((f) => f.imageUrl ?? ''),
          },
        );
      }
      console.log('[OrderSheet] Order created successfully, setting ordered=true');
      setOrdered(true);
      // NE PAS appeler onOrderSuccess ici - on l'appellera seulement quand l'utilisateur fermera le sheet
    } catch (error) {
      console.error('[OrderSheet] Error creating order:', error);
      alert('Erreur lors de la création de la commande. Vérifiez la console.');
    } finally {
      setOrdering(false);
    }
  }

  function handleClose(v: boolean) {
    if (!v) {
      // Reset tous les états quand on ferme le sheet
      setQuantity500ml(0);
      setQuantity1L(0);
      setOrdered(false);
      setActiveTab('order');
      setDistrict('');
      setPhone(user.phone || '');
      setInstructions('');
      setCoordinates(undefined);
      
      // Si on vient de passer commande, informer le parent pour réinitialiser le lab
      if (ordered) {
        onOrderSuccess?.();
      }
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
          <>
            <div className="flex-1 overflow-y-auto">
              {/* Success Header - Split Layout */}
              <div className="px-6 pt-6 pb-6 border-b border-border/20">
                <div className="flex items-start gap-6">
                  {/* Left: Bravo */}
                  <div className="flex flex-col items-center gap-3">
                    <div className="size-20 rounded-full bg-primary/10 flex items-center justify-center">
                      <ShoppingBag className="size-10 text-primary" />
                    </div>
                    <h3 className="font-display font-bold text-3xl text-primary">Bravo !</h3>
                  </div>
                  
                  {/* Right: Order Details */}
                  <div className="flex-1 space-y-4 pt-2">
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Votre commande a été enregistrée avec succès.
                    </p>
                    
                    {/* Order Summary Card */}
                    <div className="bg-muted/30 rounded-xl p-4 space-y-2">
                      <p className="text-sm font-bold text-foreground">{customName}</p>
                      <div className="space-y-1">
                        {quantity500ml > 0 && (
                          <p className="text-xs text-muted-foreground">
                            {quantity500ml} bouteille{quantity500ml > 1 ? 's' : ''} · {BOTTLE_LABELS['500ml']}
                          </p>
                        )}
                        {quantity1L > 0 && (
                          <p className="text-xs text-muted-foreground">
                            {quantity1L} bouteille{quantity1L > 1 ? 's' : ''} · {BOTTLE_LABELS['1L']}
                          </p>
                        )}
                      </div>
                      <div className="pt-2">
                        <div className="inline-flex px-4 py-1.5 rounded-lg bg-primary/10 border border-primary/20">
                          <p className="text-lg font-bold text-primary tabular-nums">{total.toLocaleString()} XAF</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Cameroon Map Section */}
              <div className="px-6 py-6 space-y-5 pb-24">
                <div className="space-y-3">
                  <h4 className="font-display font-bold text-xl text-foreground">
                    Découvrez l'origine de vos fruits
                  </h4>
                </div>
                
                <CameroonMap ingredients={cocktail.ingredients} />

                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Chaque ingrédient de votre cocktail provient du{' '}
                    <strong className="text-foreground font-semibold">terroir camerounais</strong>. 
                    Une fierté nationale dans chaque gorgée, cultivée par nos producteurs locaux 
                    avec passion et savoir-faire.
                  </p>

                  <div className="flex justify-center pt-2">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/5 border border-primary/20">
                      <span className="text-lg">🇨🇲</span>
                      <span className="text-xs font-bold text-primary">100% fruits du Cameroun</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Fixed Close Button at Bottom */}
            <div className="shrink-0 border-t border-border/40 px-6 py-4 bg-background">
              <Button 
                variant="outline" 
                size="lg"
                className="w-full rounded-2xl h-14 font-bold text-base border-2 hover:bg-muted" 
                onClick={() => handleClose(false)}
              >
                Fermer
              </Button>
            </div>
          </>
        ) : activeTab === 'nutrition' && analysis ? (
          <div className="flex-1 overflow-y-auto px-6 py-5">
            <NutritionalView analysis={analysis} />
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-8">

              <div className="space-y-3">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                  Choisissez votre contenant
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {/* Card 500ml */}
                  <div className={`relative rounded-2xl border-2 p-3 pt-4 transition-all ${
                    quantity500ml > 0 
                      ? 'border-primary bg-primary/5 shadow-[0_8px_24px_rgba(63,109,78,0.18)]' 
                      : 'border-border/60 bg-card'
                  }`}>
                    {quantity500ml > 0 && (
                      <span className="absolute top-2 right-2 size-5 rounded-full bg-primary text-white flex items-center justify-center text-[10px] font-bold">
                        ✓
                      </span>
                    )}
                    
                    {/* Bottle SVG */}
                    <div className="relative flex items-end justify-center h-[130px] sm:h-[150px] transform scale-[0.88]">
                      {quantity500ml > 0 && (
                        <div className="absolute bottom-2 inset-x-4 h-8 rounded-full bg-primary/20 blur-xl" />
                      )}
                      <svg viewBox="0 0 80 160" className="h-full w-auto drop-shadow-md relative z-10" aria-hidden>
                        <rect x="30" y="4" width="20" height="14" rx="3" fill={quantity500ml > 0 ? '#F2694A' : '#C4B5A8'} />
                        <rect x="28" y="16" width="24" height="6" rx="2" fill={quantity500ml > 0 ? '#F2694A' : '#C4B5A8'} opacity="0.85" />
                        <path d="M32 22 L32 42 Q32 48 28 52 L52 52 Q48 48 48 42 L48 22 Z" fill="#E8F0EA" stroke={quantity500ml > 0 ? '#28422F' : '#9CA3AF'} strokeWidth="1.5" />
                        <path d="M28 52 Q18 58 16 72 L14 138 Q14 150 40 152 Q66 150 66 138 L64 72 Q62 58 52 52 Z" fill="url(#glassGrad-500ml)" stroke={quantity500ml > 0 ? '#28422F' : '#9CA3AF'} strokeWidth="1.8" />
                        <path d="M18 95 L16 138 Q16 148 40 150 Q64 148 64 138 L62 95 Q40 100 18 95 Z" fill={quantity500ml > 0 ? '#3F6D4E' : '#AECBB2'} opacity="0.92" />
                        <ellipse cx="40" cy="96" rx="22" ry="4" fill="#fff" opacity="0.25" />
                        <path d="M24 70 L22 130" stroke="#fff" strokeWidth="3" strokeLinecap="round" opacity="0.35" />
                        <defs>
                          <linearGradient id="glassGrad-500ml" x1="0" y1="0" x2="1" y2="1">
                            <stop offset="0%" stopColor="#F7FAF7" />
                            <stop offset="100%" stopColor="#D5E6D9" />
                          </linearGradient>
                        </defs>
                      </svg>
                    </div>

                    <div className="mt-2 text-center space-y-0.5">
                      <p className={`text-sm font-bold ${quantity500ml > 0 ? 'text-primary' : 'text-foreground'}`}>
                        Demi-litre
                      </p>
                      <p className="text-[11px] text-muted-foreground font-medium">50 cl</p>
                      <p className={`text-[15px] font-bold tabular-nums pt-1 ${quantity500ml > 0 ? 'text-primary' : 'text-foreground'}`}>
                        {price500.toLocaleString()} <span className="text-[11px] font-semibold">XAF</span>
                      </p>
                      <p className="text-[10px] text-muted-foreground">/ bouteille</p>
                      
                      {/* Counter */}
                      <div className="flex items-center justify-center gap-2 pt-3">
                        <button
                          type="button"
                          onClick={() => setQuantity500ml(q => Math.max(0, q - 1))}
                          disabled={quantity500ml === 0}
                          className="size-8 rounded-lg bg-muted hover:bg-muted/80 flex items-center justify-center disabled:opacity-30 transition-all"
                        >
                          <Minus className="size-3.5" />
                        </button>
                        <span className="font-bold text-lg tabular-nums min-w-[2ch] text-center">{quantity500ml}</span>
                        <button
                          type="button"
                          onClick={() => setQuantity500ml(q => q + 1)}
                          className="size-8 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary flex items-center justify-center transition-all"
                        >
                          <Plus className="size-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Card 1L */}
                  <div className={`relative rounded-2xl border-2 p-3 pt-4 transition-all ${
                    quantity1L > 0 
                      ? 'border-primary bg-primary/5 shadow-[0_8px_24px_rgba(63,109,78,0.18)]' 
                      : 'border-border/60 bg-card'
                  }`}>
                    {quantity1L > 0 && (
                      <span className="absolute top-2 right-2 size-5 rounded-full bg-primary text-white flex items-center justify-center text-[10px] font-bold">
                        ✓
                      </span>
                    )}
                    
                    {/* Bottle SVG */}
                    <div className="relative flex items-end justify-center h-[130px] sm:h-[150px]">
                      {quantity1L > 0 && (
                        <div className="absolute bottom-2 inset-x-4 h-8 rounded-full bg-primary/20 blur-xl" />
                      )}
                      <svg viewBox="0 0 80 160" className="h-full w-auto drop-shadow-md relative z-10" aria-hidden>
                        <rect x="30" y="4" width="20" height="14" rx="3" fill={quantity1L > 0 ? '#F2694A' : '#C4B5A8'} />
                        <rect x="28" y="16" width="24" height="6" rx="2" fill={quantity1L > 0 ? '#F2694A' : '#C4B5A8'} opacity="0.85" />
                        <path d="M32 22 L32 42 Q32 48 28 52 L52 52 Q48 48 48 42 L48 22 Z" fill="#E8F0EA" stroke={quantity1L > 0 ? '#28422F' : '#9CA3AF'} strokeWidth="1.5" />
                        <path d="M28 52 Q18 58 16 72 L14 138 Q14 150 40 152 Q66 150 66 138 L64 72 Q62 58 52 52 Z" fill="url(#glassGrad-1L)" stroke={quantity1L > 0 ? '#28422F' : '#9CA3AF'} strokeWidth="1.8" />
                        <path d="M17 78 L15 138 Q15 148 40 150 Q65 148 65 138 L63 78 Q40 84 17 78 Z" fill={quantity1L > 0 ? '#3F6D4E' : '#AECBB2'} opacity="0.92" />
                        <ellipse cx="40" cy="80" rx="22" ry="4" fill="#fff" opacity="0.25" />
                        <path d="M24 70 L22 130" stroke="#fff" strokeWidth="3" strokeLinecap="round" opacity="0.35" />
                        <defs>
                          <linearGradient id="glassGrad-1L" x1="0" y1="0" x2="1" y2="1">
                            <stop offset="0%" stopColor="#F7FAF7" />
                            <stop offset="100%" stopColor="#D5E6D9" />
                          </linearGradient>
                        </defs>
                      </svg>
                    </div>

                    <div className="mt-2 text-center space-y-0.5">
                      <p className={`text-sm font-bold ${quantity1L > 0 ? 'text-primary' : 'text-foreground'}`}>
                        Un litre
                      </p>
                      <p className="text-[11px] text-muted-foreground font-medium">1 L</p>
                      <p className={`text-[15px] font-bold tabular-nums pt-1 ${quantity1L > 0 ? 'text-primary' : 'text-foreground'}`}>
                        {price1L.toLocaleString()} <span className="text-[11px] font-semibold">XAF</span>
                      </p>
                      <p className="text-[10px] text-muted-foreground">/ bouteille</p>
                      
                      {/* Counter */}
                      <div className="flex items-center justify-center gap-2 pt-3">
                        <button
                          type="button"
                          onClick={() => setQuantity1L(q => Math.max(0, q - 1))}
                          disabled={quantity1L === 0}
                          className="size-8 rounded-lg bg-muted hover:bg-muted/80 flex items-center justify-center disabled:opacity-30 transition-all"
                        >
                          <Minus className="size-3.5" />
                        </button>
                        <span className="font-bold text-lg tabular-nums min-w-[2ch] text-center">{quantity1L}</span>
                        <button
                          type="button"
                          onClick={() => setQuantity1L(q => q + 1)}
                          className="size-8 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary flex items-center justify-center transition-all"
                        >
                          <Plus className="size-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
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
                    <YaoundeDistrictPicker
                      value={district}
                      onChange={setDistrict}
                    />
                    <GeolocationButton 
                      onLocation={(data) => {
                        setCoordinates(data);
                        if (data.address) setDistrict(data.address);
                      }} 
                      className="mt-2" 
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
                {quantity500ml > 0 && (
                  <div className="flex items-center justify-between px-4 py-3">
                    <span className="text-[13px] text-muted-foreground">
                      {quantity500ml} × Demi-litre · {price500.toLocaleString()} XAF
                    </span>
                    <span className="text-[13px] font-semibold text-foreground">
                      {(price500 * quantity500ml).toLocaleString()} XAF
                    </span>
                  </div>
                )}
                {quantity1L > 0 && (
                  <div className="flex items-center justify-between px-4 py-3">
                    <span className="text-[13px] text-muted-foreground">
                      {quantity1L} × Un litre · {price1L.toLocaleString()} XAF
                    </span>
                    <span className="text-[13px] font-semibold text-foreground">
                      {(price1L * quantity1L).toLocaleString()} XAF
                    </span>
                  </div>
                )}
                {totalBottles > 0 && (
                  <div className="flex items-center justify-between px-4 py-3">
                    <span className="text-[13px] text-muted-foreground flex items-center gap-1.5">
                      <Truck className="size-3.5" /> Livraison
                    </span>
                    <span className="text-[13px] font-semibold text-foreground">
                      {deliveryFee.toLocaleString()} XAF
                    </span>
                  </div>
                )}
                {totalBottles > 0 && (
                  <div className="flex items-center justify-between px-4 py-4 bg-primary/5">
                    <span className="text-[15px] font-bold text-foreground">Total</span>
                    <span className="text-[18px] font-bold text-primary tabular-nums">
                      {total.toLocaleString()} XAF
                    </span>
                  </div>
                )}
                {totalBottles === 0 && (
                  <div className="px-4 py-4 text-center text-sm text-muted-foreground">
                    Sélectionnez au moins une bouteille
                  </div>
                )}
              </div>
            </div>

            <div className="shrink-0 border-t border-border/40 px-6 py-5">
              <Button
                size="lg"
                className="w-full h-14 rounded-2xl bg-primary hover:bg-primary/90 text-white font-bold text-base gap-2 shadow-[0_8px_25px_rgba(63,109,78,0.3)] disabled:opacity-50 active:scale-95 transition-all"
                disabled={ordering || !canOrder || !pricing || totalBottles === 0}
                onClick={handleOrder}
              >
                {ordering ? (
                  <><Loader2 className="size-5 animate-spin" /> Commande en cours…</>
                ) : !canOrder ? (
                  <>Remplissez l&apos;adresse de livraison</>
                ) : totalBottles === 0 ? (
                  <>Sélectionnez au moins une bouteille</>
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
