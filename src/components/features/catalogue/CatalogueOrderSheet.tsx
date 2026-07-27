import { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { YaoundeDistrictPicker } from '@/components/features/orders/YaoundeDistrictPicker';
import { GeolocationButton } from '@/components/features/orders/GeolocationButton';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import {
  Plus, Loader2, Minus, ShoppingBag, Truck, CheckCircle2,
  MapPin, Phone, MessageSquare, Sparkles,
} from 'lucide-react';
import {
  BOTTLE_LABELS,
  getBottleBasePrice,
  pricePerBottle,
  type BottleSize,
  type Cocktail,
  type AIAnalysis,
  type Fruit,
  CocktailType,
} from '@/entities';
import { analyzeCocktail } from '@/services/ai';
import { cloneCocktailFromCatalogue } from '@/services/cocktail';
import { createOrder } from '@/services/order';
import { getFruits } from '@/services/fruit';
import { getPricingSettings } from '@/services/settings';
import { useAuthStore } from '@/stores/auth';
import { useProfileStore } from '@/stores/profile';
import { NutritionalView, VERDICT_CONFIG } from '@/components/features/cocktail/NutritionalView';
import { BottleSizePicker } from '@/components/features/cocktail/BottleSizePicker';
import { CameroonMap } from '@/components/features/cocktail/CameroonMap';

type Tab = 'order' | 'nutrition';

type Props = {
  cocktail: Cocktail | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
};

export function CatalogueOrderSheet({ cocktail, open, onOpenChange }: Props) {
  const { user } = useAuthStore();
  const { profile } = useProfileStore();
  const contentRef = useRef<HTMLDivElement>(null);

  const [activeTab, setActiveTab] = useState<Tab>('order');
  const [localAnalysis, setLocalAnalysis] = useState<AIAnalysis | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [quantity500ml, setQuantity500ml] = useState(0);
  const [quantity1L, setQuantity1L] = useState(0);
  const [ordering, setOrdering] = useState(false);
  const [ordered, setOrdered] = useState(false);

  // Delivery details
  const [district, setDistrict] = useState('');
  const [phone, setPhone] = useState(user?.phone || '');
  const [instructions, setInstructions] = useState('');
  const [coordinates, setCoordinates] = useState<{ lat: number; lng: number }>();

  // Scroll to top when ordered state changes
  useEffect(() => {
    if (ordered && contentRef.current) {
      contentRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [ordered]);

  // Fruits cached from react-query — needed for AI analysis
  const { data: fruits = [] } = useQuery({
    queryKey: ['fruits'],
    queryFn: getFruits,
  });

  const { data: pricing } = useQuery({
    queryKey: ['pricing-settings'],
    queryFn: getPricingSettings,
  });

  if (!cocktail) return null;

  const hasAnalysis = !!localAnalysis;
  const verdictCfg = localAnalysis ? VERDICT_CONFIG[localAnalysis.verdict] : null;

  const price500 = pricing
    ? pricePerBottle(pricing, '500ml', cocktail.ingredients)
    : cocktail.totalPrice;
  const price1L = pricing
    ? pricePerBottle(pricing, '1L', cocktail.ingredients)
    : Math.round(cocktail.totalPrice * 1.6);

  const deliveryFee = pricing?.deliveryFee ?? 500;
  const subtotal500 = price500 * quantity500ml;
  const subtotal1L = price1L * quantity1L;
  const subtotal = subtotal500 + subtotal1L;
  const total = subtotal + deliveryFee;
  const totalBottles = quantity500ml + quantity1L;

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
    if (!user || !pricing || totalBottles === 0) return;
    setOrdering(true);
    try {
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
        ? { district: district.trim(), phone: phone.trim(), instructions: instructions.trim(), ...(coordinates ? { coordinates } : {}) }
        : undefined;

      const cloned = await cloneCocktailFromCatalogue(
        cocktail!,
        user.uid,
        analysis ?? undefined,
      );
      
      // Créer les lignes de commande pour chaque format sélectionné
      const orderLines = [];
      
      if (quantity500ml > 0) {
        orderLines.push({
          bottleSize: '500ml' as BottleSize,
          quantity: quantity500ml,
          bottleBasePrice: getBottleBasePrice(pricing, '500ml'),
          pricePerBottle: price500,
        });
      }
      
      if (quantity1L > 0) {
        orderLines.push({
          bottleSize: '1L' as BottleSize,
          quantity: quantity1L,
          bottleBasePrice: getBottleBasePrice(pricing, '1L'),
          pricePerBottle: price1L,
        });
      }
      
      await createOrder(
        user,
        { ...cloned, totalPrice: price500 }, // totalPrice pour référence (legacy)
        orderLines,
        deliveryFee,
        deliveryDetails,
        {
          cocktailImageSnapshot:
            cocktail!.type === CocktailType.CATALOG ? cocktail!.imageUrl : undefined,
          ingredientImageSnapshots: cocktail!.ingredients.map(
            (ing) => fruits.find((f) => f.id === ing.fruitId)?.imageUrl ?? '',
          ),
        },
      );
      setOrdered(true);
    } finally {
      setOrdering(false);
    }
  }

  function handleClose(v: boolean) {
    if (!v) {
      setActiveTab('order');
      setLocalAnalysis(null);
      setQuantity500ml(0);
      setQuantity1L(0);
      setOrdered(false);
      setDistrict('');
      setPhone(user?.phone || '');
      setInstructions('');
      setCoordinates(undefined);
    }
    onOpenChange(v);
  }

  const deliveryOk = district.trim().length > 0 && phone.trim().length > 0;

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent side="right" className="w-full max-w-[500px] p-0 flex flex-col">

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
                      <p className="text-sm font-bold text-foreground">{cocktail.name}</p>
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

        ) : activeTab === 'nutrition' && localAnalysis ? (
          /* ── Fiche NutriFYS tab ── */
          <div ref={contentRef} className="flex-1 overflow-y-auto px-6 py-5">
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
            <div ref={contentRef} className="flex-1 overflow-y-auto px-6 py-6 space-y-8">

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
                        <path d="M28 52 Q18 58 16 72 L14 138 Q14 150 40 152 Q66 150 66 138 L64 72 Q62 58 52 52 Z" fill="url(#glassGrad-500ml-cat)" stroke={quantity500ml > 0 ? '#28422F' : '#9CA3AF'} strokeWidth="1.8" />
                        <path d="M18 95 L16 138 Q16 148 40 150 Q64 148 64 138 L62 95 Q40 100 18 95 Z" fill={quantity500ml > 0 ? '#3F6D4E' : '#AECBB2'} opacity="0.92" />
                        <ellipse cx="40" cy="96" rx="22" ry="4" fill="#fff" opacity="0.25" />
                        <path d="M24 70 L22 130" stroke="#fff" strokeWidth="3" strokeLinecap="round" opacity="0.35" />
                        <defs>
                          <linearGradient id="glassGrad-500ml-cat" x1="0" y1="0" x2="1" y2="1">
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
                      
                      {/* Subtotal */}
                      {quantity500ml > 0 && (
                        <div className="pt-2 mt-2 border-t border-border/40">
                          <p className="text-[11px] text-muted-foreground">Sous-total</p>
                          <p className="text-[14px] font-bold text-primary tabular-nums">
                            {(price500 * quantity500ml).toLocaleString()} XAF
                          </p>
                        </div>
                      )}
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
                        <path d="M28 52 Q18 58 16 72 L14 138 Q14 150 40 152 Q66 150 66 138 L64 72 Q62 58 52 52 Z" fill="url(#glassGrad-1L-cat)" stroke={quantity1L > 0 ? '#28422F' : '#9CA3AF'} strokeWidth="1.8" />
                        <path d="M17 78 L15 138 Q15 148 40 150 Q65 148 65 138 L63 78 Q40 84 17 78 Z" fill={quantity1L > 0 ? '#3F6D4E' : '#AECBB2'} opacity="0.92" />
                        <ellipse cx="40" cy="80" rx="22" ry="4" fill="#fff" opacity="0.25" />
                        <path d="M24 70 L22 130" stroke="#fff" strokeWidth="3" strokeLinecap="round" opacity="0.35" />
                        <defs>
                          <linearGradient id="glassGrad-1L-cat" x1="0" y1="0" x2="1" y2="1">
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
                      
                      {/* Subtotal */}
                      {quantity1L > 0 && (
                        <div className="pt-2 mt-2 border-t border-border/40">
                          <p className="text-[11px] text-muted-foreground">Sous-total</p>
                          <p className="text-[14px] font-bold text-primary tabular-nums">
                            {(price1L * quantity1L).toLocaleString()} XAF
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
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

              {/* Récap total */}
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
                className="w-full h-14 rounded-2xl bg-primary hover:bg-primary/90 text-white font-bold text-base gap-2 shadow-[0_8px_25px_rgba(63,109,78,0.3)] disabled:opacity-50 active:scale-95 transition-all"
                disabled={ordering || !deliveryOk || !pricing || totalBottles === 0}
                onClick={handleOrder}
              >
                {ordering ? (
                  <><Loader2 className="size-5 animate-spin" /> Commande en cours…</>
                ) : !deliveryOk ? (
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
