import { useTranslation, Trans } from 'react-i18next';
import {
  Plus, Loader2, Minus, ShoppingBag, Truck, Sparkles, Pencil,
  MapPin, Phone, MessageSquare, TimerOff, Smartphone, Banknote,
} from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { YaoundeDistrictPicker } from '@/components/features/orders/YaoundeDistrictPicker';
import { GeolocationButton } from '@/components/features/orders/GeolocationButton';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from '@/components/ui/sheet';
import {
  BOTTLE_LABELS,
  getBottleBasePrice,
  pricePerBottle,
  type BottleSize,
  type Cocktail,
  type AIAnalysis,
  type Fruit,
} from '@/entities';
import { createOrder } from '@/services/order';
import { getPricingSettings } from '@/services/settings';
import { getFruits } from '@/services/fruit';
import { NutritionalView, VERDICT_CONFIG, getVerdictLabel } from '@/components/features/cocktail/NutritionalView';
import { createCocktail, cloneCocktailFromCatalogue } from '@/services/cocktail';
import { analyzeCocktail } from '@/services/ai';
import { buildFruitVisuals, pickCocktailCoverUrl } from '@/components/features/cocktail/CocktailBanner';
import { CameroonMap } from '@/components/features/cocktail/CameroonMap';
import { useAuthStore } from '@/stores/auth';
import { useProfileStore, isProfileComplete } from '@/stores/profile';
import { trackEvent } from '@/lib/analytics';
import { OnboardingModal } from '@/components/features/onboarding/OnboardingModal';

type Tab = 'order' | 'nutrition';

function detectOperator(phone: string): 'MTN' | 'ORANGE' | null {
  const num = phone.replace(/[^0-9]/g, '').replace(/^(237|00237)/, '');
  if (num.length !== 9) return null;
  if (/^6(7|80|81|82|83|50|51|52|53|54)/.test(num)) return 'MTN';
  if (/^6(9|55|56|57|58|59)/.test(num)) return 'ORANGE';
  return null;
}

type Props = {
  cocktail: Cocktail | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  user?: { uid: string; name: string; email: string; phone?: string };
  onOrderSuccess?: () => void;
  promoCode?: string;
};

export function OrderSheet({ cocktail, open, onOpenChange, user: externalUser, onOrderSuccess, promoCode }: Props) {
  const { t } = useTranslation();
  const { user: storeUser } = useAuthStore();
  const { profile, fetched: profileFetched, fetch: fetchProfile, save: saveProfile } = useProfileStore();
  const contentRef = useRef<HTMLDivElement>(null);

  const user = externalUser || storeUser;

  const [activeTab, setActiveTab] = useState<Tab>('order');
  const [localAnalysis, setLocalAnalysis] = useState<AIAnalysis | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [quantity500ml, setQuantity500ml] = useState(0);
  const [quantity1L, setQuantity1L] = useState(0);
  const [ordering, setOrdering] = useState(false);
  const [ordered, setOrdered] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'cod' | 'momo'>('cod');
  const [waitingForPayment, setWaitingForPayment] = useState(false);

  const [showOnboarding, setShowOnboarding] = useState(false);
  const [actionToResume, setActionToResume] = useState<'analyze' | 'order' | null>(null);

  const [customName, setCustomName] = useState(cocktail?.name || '');
  const [isEditingName, setIsEditingName] = useState(false);

  // Delivery details
  const [district, setDistrict] = useState('');
  const [phone, setPhone] = useState(user?.phone || '');
  const [instructions, setInstructions] = useState('');
  const [coordinates, setCoordinates] = useState<{ lat: number; lng: number }>();

  const { data: fruits = [] } = useQuery({
    queryKey: ['fruits'],
    queryFn: getFruits,
  });

  const { data: pricing } = useQuery({
    queryKey: ['pricing-settings'],
    queryFn: getPricingSettings,
  });

  const fruitVisuals = cocktail ? buildFruitVisuals(cocktail.ingredients, fruits) : [];
  const fruitImageUrls = fruitVisuals
    .map((f) => f.imageUrl)
    .filter((u): u is string => !!u);
  const coverUrl = cocktail ? pickCocktailCoverUrl(cocktail, fruitImageUrls) : undefined;

  useEffect(() => {
    if (cocktail) {
      setCustomName(cocktail.name);
    }
  }, [cocktail?.name]);

  useEffect(() => {
    if (ordered && contentRef.current) {
      contentRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [ordered]);

  useEffect(() => {
    if (open && cocktail) {
      trackEvent('begin_checkout', { items: [{ item_name: cocktail.name, item_category: cocktail.type }] });
    }
  }, [open, cocktail?.id]);

  if (!cocktail || !user) return null;

  const isOwner = cocktail.createdBy === user.uid;
  const isDraft = cocktail.id === 'draft';

  // Public/non-owned cocktails get a fresh analysis in the current app language
  const forceFreshAnalysis = !isOwner && !isDraft;
  const hasLocalAnalysis = !!localAnalysis;
  const hasAnalysis = hasLocalAnalysis || (!forceFreshAnalysis && !!cocktail.aiAnalysis);
  const analysis = hasLocalAnalysis ? localAnalysis : (!forceFreshAnalysis ? cocktail.aiAnalysis : null);
  const verdictCfg = analysis ? VERDICT_CONFIG[analysis.verdict] : null;

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
  const totalBottles = quantity500ml + quantity1L;

  const isFlyer = promoCode?.toUpperCase() === 'FLYER';
  const isReorder = promoCode?.toUpperCase() === 'REORDER';

  // Vérifie si une promo est actuellement valide (active + non expirée)
  function isPromoValid(active?: boolean, expiresAt?: { toDate: () => Date } | null): boolean {
    if (!active) return false;
    if (!expiresAt) return true; // Pas de date = valide indéfiniment
    return expiresAt.toDate() > new Date();
  }

  const flyerValid = isFlyer && isPromoValid(pricing?.promoFlyerActive, pricing?.promoFlyerExpiresAt);
  const reorderValid = isReorder && isPromoValid(pricing?.promoReorderActive, pricing?.promoReorderExpiresAt);

  const discountAmount = totalBottles > 0 && pricing
    ? (flyerValid ? pricing.promoFlyerDiscount
       : reorderValid ? pricing.promoReorderDiscount
       : 0) || 0
    : 0;

  const total = Math.max(0, subtotal + deliveryFee - discountAmount);

  const deliveryOk = district.trim().length > 0 && phone.trim().length > 0;

  async function runAnalysis(): Promise<AIAnalysis | null> {
    if (fruits.length === 0) return null;
    if (!cocktail) return null;
    const ingredients = cocktail.ingredients
      .map((ing) => {
        const fruit = fruits.find((f: Fruit) => f.id === ing.fruitId);
        return fruit ? { fruit, grams: ing.quantityGrams } : null;
      })
      .filter((x): x is { fruit: Fruit; grams: number } => x !== null);
    return analyzeCocktail(ingredients, profile);
  }

  async function handleAnalyze() {
    if (!cocktail) return;
    if (user && profileFetched && !isProfileComplete(profile)) {
      setActionToResume('analyze');
      setShowOnboarding(true);
      return;
    }
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
    if (!pricing || totalBottles === 0) return;
    if (!cocktail || !user) return;
    if (user && profileFetched && !isProfileComplete(profile)) {
      setActionToResume('order');
      setShowOnboarding(true);
      return;
    }
    setOrdering(true);
    try {
      let analysisResult: AIAnalysis | null = null;
      if (isOwner || isDraft) {
        analysisResult = analysis ?? null;
        if (!analysisResult) {
          try {
            analysisResult = await runAnalysis();
            if (analysisResult) setLocalAnalysis(analysisResult);
          } catch {
            // analysis is optional — don't block the order
          }
        }
      } else {
        try {
          analysisResult = await runAnalysis();
          if (analysisResult) setLocalAnalysis(analysisResult);
        } catch {
          // analysis is optional — don't block the order
        }
      }

      const deliveryDetails = district.trim()
        ? { district: district.trim(), phone: phone.trim(), instructions: instructions.trim(), ...(coordinates ? { coordinates } : {}) }
        : undefined;

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
          bottleBasePrice: getBottleBasePrice(pricing, '500ml'),
          pricePerBottle: price500,
        });
      }

      if (quantity1L > 0) {
        orderLines.push({
          bottleSize: '1L',
          quantity: quantity1L,
          bottleBasePrice: getBottleBasePrice(pricing, '1L'),
          pricePerBottle: price1L,
        });
      }

      const isOwnerCheck = isOwner;
      const isDraftCheck = isDraft;
      let finalOrderId = '';

      if (isDraftCheck) {
        const newCocktailId = await createCocktail({
          ...cocktail,
          name: customName,
          createdBy: user.uid,
          basePrice: pricing.bottle500mlBase,
          totalPrice: price500,
          ...(coverUrl ? { imageUrl: coverUrl } : {}),
        });

        finalOrderId = await createOrder(
          user,
          { ...cocktail, name: customName, id: newCocktailId, totalPrice: price500, imageUrl: coverUrl },
          orderLines,
          deliveryFee,
          deliveryDetails,
          {
            cocktailImageSnapshot: coverUrl,
            ingredientImageSnapshots: fruitVisuals.map((f) => f.imageUrl ?? ''),
            discountAmount,
            promoCodeApplied: discountAmount > 0 ? promoCode : undefined,
          },
        );
      } else if (!isOwnerCheck && !isDraftCheck) {
        const cloned = await cloneCocktailFromCatalogue(cocktail, user.uid, analysisResult ?? undefined);

        finalOrderId = await createOrder(
          user,
          { ...cloned, totalPrice: price500 },
          orderLines,
          deliveryFee,
          deliveryDetails,
          {
            cocktailImageSnapshot: cocktail.imageUrl,
            ingredientImageSnapshots: cocktail.ingredients.map(
              (ing) => fruits.find((f: Fruit) => f.id === ing.fruitId)?.imageUrl ?? '',
            ),
            discountAmount,
            promoCodeApplied: discountAmount > 0 ? promoCode : undefined,
          },
        );
      } else {
        finalOrderId = await createOrder(
          user,
          { ...cocktail, name: isOwnerCheck ? customName : cocktail.name, totalPrice: price500, imageUrl: coverUrl ?? cocktail.imageUrl },
          orderLines,
          deliveryFee,
          deliveryDetails,
          {
            cocktailImageSnapshot: coverUrl ?? cocktail.imageUrl,
            ingredientImageSnapshots: fruitVisuals.map((f) => f.imageUrl ?? ''),
            discountAmount,
            promoCodeApplied: discountAmount > 0 ? promoCode : undefined,
          },
        );
      }

      trackEvent('purchase', {
        value: total,
        currency: 'XAF',
        items: [
          {
            item_id: cocktail.id,
            item_name: customName || cocktail.name,
            item_category: cocktail.type,
            quantity: totalBottles,
            price: price500,
          }
        ]
      });

      // Traitement du paiement
      if (paymentMethod === 'momo' && finalOrderId) {
        setWaitingForPayment(true);
        const operator = detectOperator(phone);
        
        try {
          const res = await fetch('/api/kpay-init', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              amount: total,
              phone: phone.trim(),
              provider: operator,
              orderId: finalOrderId,
              customerName: user.name,
            })
          });
          
          if (!res.ok) {
            console.error('[OrderSheet] Error K-Pay init:', await res.json());
            // Même si erreur d'initiation K-Pay, la commande est créée (PENDING)
            // L'utilisateur pourra payer plus tard dans "Mes commandes" ou à la livraison
          }
        } catch (e) {
          console.error('[OrderSheet] Failed to contact K-Pay init API', e);
        }
      }

      setOrdered(true);
    } catch (error) {
      console.error('[OrderSheet] Error creating order:', error);
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
      setWaitingForPayment(false);
      setPaymentMethod('momo');
      setDistrict('');
      setPhone(user?.phone || '');
      setInstructions('');
      setCoordinates(undefined);

      if (ordered) {
        onOrderSuccess?.();
      }
    }
    onOpenChange(v);
  }

  const drinkName = isOwner ? customName : cocktail.name;

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent side="right" className="w-full max-w-[500px] p-0 flex flex-col">

        {/* Header */}
        <SheetHeader className="px-6 pt-5 pb-0 shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <SheetTitle className="font-display text-xl font-bold leading-tight flex items-center gap-2"
                style={isOwner && !isDraft ? { color: '#F2694A' } : undefined}
              >
                {isOwner && !isDraft ? (
                  <>
                    {customName}
                    <button
                      type="button"
                      onClick={() => setIsEditingName(true)}
                      className="p-1.5 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                      title={t('orders.renameTitle')}
                    >
                      <Pencil className="size-4" />
                    </button>
                  </>
                ) : isDraft ? (
                  isEditingName ? (
                    <input
                      type="text"
                      value={customName}
                      onChange={(e) => setCustomName(e.target.value)}
                      onBlur={() => setIsEditingName(false)}
                      onKeyDown={(e) => e.key === 'Enter' && setIsEditingName(false)}
                      autoFocus
                      className="bg-transparent border-b-2 border-primary outline-none px-1 py-0.5 w-full font-display text-xl font-bold"
                      style={{ color: '#F2694A' }}
                    />
                  ) : (
                    <>
                      <span style={{ color: '#F2694A' }}>{customName}</span>
                      <button
                        type="button"
                        onClick={() => setIsEditingName(true)}
                        className="p-1.5 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                        title={t('orders.renameTitle')}
                      >
                        <Pencil className="size-4" />
                      </button>
                    </>
                  )
                ) : (
                  cocktail.name
                )}
              </SheetTitle>
              <p className="text-[13px] text-muted-foreground mt-0.5 truncate">
                {cocktail.ingredients.map((i) => i.fruitName).join(' · ')}
              </p>
            </div>
            {hasAnalysis && verdictCfg && (
              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold shrink-0 mt-0.5 ${verdictCfg.chip}`}>
                {verdictCfg.emoji} {getVerdictLabel(analysis!.verdict, t)}
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
              {t('orders.orderTab')}
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
                {t('orders.nutrifysSheet')}
              </button>
            ) : (
              <button
                type="button"
                onClick={handleAnalyze}
                disabled={analyzing}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[12px] font-semibold transition-all text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30 disabled:opacity-60"
              >
                {analyzing ? (
                  <><Loader2 className="size-3.5 animate-spin" /> {t('orders.analyzing')}</>
                ) : (
                  <><Sparkles className="size-3.5" /> {t('orders.analyze')}</>
                )}
              </button>
            )}
          </div>
        </SheetHeader>

        <div className="border-b border-border/40 mt-4 shrink-0" />

        {/* ── Success state ── */}
        {ordered ? (
          <>
            <div ref={contentRef} className="flex-1 overflow-y-auto">
              {/* Success Header - Split Layout */}
              <div className="px-6 pt-6 pb-6 border-b border-border/20">
                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 sm:gap-6 text-center sm:text-left">
                  {/* Left: Bravo */}
                  <div className="flex flex-col items-center gap-3">
                    {waitingForPayment ? (
                      <div className="size-20 rounded-full bg-amber-500/10 flex items-center justify-center relative">
                        <Smartphone className="size-10 text-amber-500 animate-pulse" />
                        <Loader2 className="absolute -bottom-1 -right-1 size-6 text-amber-500 animate-spin bg-background rounded-full" />
                      </div>
                    ) : (
                      <div className="size-20 rounded-full bg-primary/10 flex items-center justify-center">
                        <ShoppingBag className="size-10 text-primary" />
                      </div>
                    )}
                    <h3 className={cn("font-display font-bold text-2xl md:text-3xl", waitingForPayment ? "text-amber-500 text-center" : "text-primary")}>
                      {waitingForPayment ? "Paiement en attente" : t('orders.bravo')}
                    </h3>
                  </div>

                  {/* Right: Order Details */}
                  <div className="flex-1 space-y-4 pt-2">
                    {waitingForPayment ? (
                      <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-700/50 rounded-xl p-4 space-y-3">
                        <p className="text-sm font-semibold text-amber-800 dark:text-amber-400">
                          Veuillez consulter votre téléphone !
                        </p>
                        <p className="text-xs text-amber-700/80 dark:text-amber-400/80 leading-relaxed">
                          Un menu s'est affiché sur votre écran. Entrez votre code secret <b>Mobile Money</b> pour confirmer le paiement de <b>{total.toLocaleString()} XAF</b>.
                        </p>
                        <p className="text-[11px] text-amber-700/60 dark:text-amber-400/60 italic">
                          Une fois le paiement validé sur votre téléphone, votre commande sera automatiquement confirmée.
                        </p>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {t('orders.successMessage')}
                      </p>
                    )}

                    {/* Order Summary Card */}
                    <div className="bg-muted/30 rounded-xl p-4 space-y-2">
                      <p className="text-sm font-bold text-foreground">{drinkName}</p>
                      <div className="space-y-1">
                        {quantity500ml > 0 && (
                          <p className="text-xs text-muted-foreground">
                            {t('orders.bottleCount', { count: quantity500ml })} · {BOTTLE_LABELS['500ml']}
                          </p>
                        )}
                        {quantity1L > 0 && (
                          <p className="text-xs text-muted-foreground">
                            {t('orders.bottleCount', { count: quantity1L })} · {BOTTLE_LABELS['1L']}
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
                    {t('orders.originTitle')}
                  </h4>
                </div>

                <CameroonMap ingredients={cocktail.ingredients} />

                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    <Trans
                      i18nKey="orders.originDescriptionHtml"
                      components={{ strong: <strong className="text-foreground font-semibold" /> }}
                    >
                      Chaque ingrédient de votre cocktail provient du{' '}
                      <strong className="text-foreground font-semibold">terroir camerounais</strong>.
                      Une fierté nationale dans chaque gorgée, cultivée par nos producteurs locaux
                      avec passion et savoir-faire.
                    </Trans>
                  </p>

                  <div className="flex justify-center pt-2">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/5 border border-primary/20">
                      <span className="text-lg">🇨🇲</span>
                      <span className="text-xs font-bold text-primary">{t('orders.cameroonFruits')}</span>
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
                {t('common.close')}
              </Button>
            </div>
          </>

        ) : activeTab === 'nutrition' && analysis ? (
          /* ── Fiche NutriFYS tab ── */
          <div ref={contentRef} className="flex-1 overflow-y-auto px-6 py-5">
            {(forceFreshAnalysis || hasLocalAnalysis) && (
              <div className="mb-4 px-3 py-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-700/40">
                <p className="text-[11px] text-amber-700 dark:text-amber-400 font-semibold leading-relaxed">
                  {t('orders.localAnalysisNote')}
                </p>
              </div>
            )}
            <NutritionalView analysis={analysis} />
          </div>

        ) : (
          /* ── Commander tab ── */
          <>
            <div ref={contentRef} className="flex-1 overflow-y-auto px-6 py-6 space-y-8">
              {/* Bannière promo active ou expirée */}
              {(isFlyer || isReorder) && pricing && (
                flyerValid || reorderValid ? (
                  <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-700/40 rounded-xl p-3.5 flex items-start gap-3 shadow-sm animate-in fade-in slide-in-from-bottom-2">
                    <div className="p-2 bg-amber-500/20 dark:bg-amber-500/10 rounded-lg text-amber-600 dark:text-amber-500 shrink-0 mt-0.5">
                      <Sparkles className="size-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-amber-700 dark:text-amber-500">
                        Lien promotionnel activé
                      </h4>
                      <p className="text-[12px] text-amber-700/80 dark:text-amber-500/80 mt-1 leading-relaxed">
                        Vous bénéficiez d'une réduction de <strong className="font-bold">{(flyerValid ? pricing.promoFlyerDiscount : pricing.promoReorderDiscount)?.toLocaleString()} XAF</strong> sur votre commande grâce à votre {isFlyer ? 'flyer' : "code d'étiquette"}. La réduction sera déduite du montant total.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="bg-red-50 dark:bg-red-950/20 border border-red-200/60 dark:border-red-700/30 rounded-xl p-3.5 flex items-start gap-3">
                    <div className="p-2 bg-red-500/10 rounded-lg text-red-500 shrink-0 mt-0.5">
                      <TimerOff className="size-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-red-600 dark:text-red-400">
                        Lien promotionnel expiré
                      </h4>
                      <p className="text-[12px] text-red-600/80 dark:text-red-400/80 mt-1 leading-relaxed">
                        Ce lien promotionnel n'est plus actif. Votre commande sera traitée au tarif normal.
                      </p>
                    </div>
                  </div>
                )
              )}

              <div className="space-y-3">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                  {t('orders.chooseContainer')}
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
                        <path d="M28 52 Q18 58 16 72 L14 138 Q14 150 40 152 Q66 150 66 138 L64 72 Q62 58 52 52 Z" fill="url(#glassGrad-500ml-order)" stroke={quantity500ml > 0 ? '#28422F' : '#9CA3AF'} strokeWidth="1.8" />
                        <path d="M18 95 L16 138 Q16 148 40 150 Q64 148 64 138 L62 95 Q40 100 18 95 Z" fill={quantity500ml > 0 ? '#3F6D4E' : '#AECBB2'} opacity="0.92" />
                        <ellipse cx="40" cy="96" rx="22" ry="4" fill="#fff" opacity="0.25" />
                        <path d="M24 70 L22 130" stroke="#fff" strokeWidth="3" strokeLinecap="round" opacity="0.35" />
                        <defs>
                          <linearGradient id="glassGrad-500ml-order" x1="0" y1="0" x2="1" y2="1">
                            <stop offset="0%" stopColor="#F7FAF7" />
                            <stop offset="100%" stopColor="#D5E6D9" />
                          </linearGradient>
                        </defs>
                      </svg>
                    </div>

                    <div className="mt-2 text-center space-y-0.5">
                      <p className={`text-sm font-bold ${quantity500ml > 0 ? 'text-primary' : 'text-foreground'}`}>
                        {t('settings.halfLiter')}
                      </p>
                      <p className="text-[11px] text-muted-foreground font-medium">{t('settings.volume50cl')}</p>
                      <p className={`text-[15px] font-bold tabular-nums pt-1 ${quantity500ml > 0 ? 'text-primary' : 'text-foreground'}`}>
                        {price500.toLocaleString()} <span className="text-[11px] font-semibold">XAF</span>
                      </p>
                      <p className="text-[10px] text-muted-foreground">{t('pricing.perBottle')}</p>

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
                          <p className="text-[11px] text-muted-foreground">{t('orders.subtotal')}</p>
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
                        <path d="M28 52 Q18 58 16 72 L14 138 Q14 150 40 152 Q66 150 66 138 L64 72 Q62 58 52 52 Z" fill="url(#glassGrad-1L-order)" stroke={quantity1L > 0 ? '#28422F' : '#9CA3AF'} strokeWidth="1.8" />
                        <path d="M17 78 L15 138 Q15 148 40 150 Q65 148 65 138 L63 78 Q40 84 17 78 Z" fill={quantity1L > 0 ? '#3F6D4E' : '#AECBB2'} opacity="0.92" />
                        <ellipse cx="40" cy="80" rx="22" ry="4" fill="#fff" opacity="0.25" />
                        <path d="M24 70 L22 130" stroke="#fff" strokeWidth="3" strokeLinecap="round" opacity="0.35" />
                        <defs>
                          <linearGradient id="glassGrad-1L-order" x1="0" y1="0" x2="1" y2="1">
                            <stop offset="0%" stopColor="#F7FAF7" />
                            <stop offset="100%" stopColor="#D5E6D9" />
                          </linearGradient>
                        </defs>
                      </svg>
                    </div>

                    <div className="mt-2 text-center space-y-0.5">
                      <p className={`text-sm font-bold ${quantity1L > 0 ? 'text-primary' : 'text-foreground'}`}>
                        {t('settings.oneLiter')}
                      </p>
                      <p className="text-[11px] text-muted-foreground font-medium">{t('settings.volume1L')}</p>
                      <p className={`text-[15px] font-bold tabular-nums pt-1 ${quantity1L > 0 ? 'text-primary' : 'text-foreground'}`}>
                        {price1L.toLocaleString()} <span className="text-[11px] font-semibold">XAF</span>
                      </p>
                      <p className="text-[10px] text-muted-foreground">{t('pricing.perBottle')}</p>

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
                          <p className="text-[11px] text-muted-foreground">{t('orders.subtotal')}</p>
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
                  {t('orders.delivery')}
                </p>
                <div className="rounded-2xl border border-border/60 bg-card p-4 space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-foreground flex items-center gap-1.5 uppercase">
                      <MapPin className="size-3.5 text-primary" /> {t('orders.districtExact')}
                    </label>
                    <YaoundeDistrictPicker
                      value={district}
                      onChange={setDistrict}
                    />
                    <GeolocationButton
                      onLocation={({ address, ...coords }) => {
                        setCoordinates(coords);
                        if (address) setDistrict(address);
                      }}
                      className="mt-2"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-foreground flex items-center gap-1.5 uppercase">
                      <Phone className="size-3.5 text-primary" /> {t('orders.phone')}
                    </label>
                    <div className="relative">
                      <input
                        type="tel"
                        className="w-full h-10 px-3 bg-muted/60 border border-border/40 rounded-xl text-sm focus:outline-none focus:border-primary/50 transition-colors pr-24"
                        placeholder={t('orders.phonePlaceholder')}
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                      />
                      {phone.length >= 8 && (
                        <div className="absolute right-2 top-1/2 -translate-y-1/2">
                          {detectOperator(phone) === 'MTN' && (
                            <span className="flex items-center gap-1.5 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 text-[10px] font-bold text-yellow-800 dark:text-yellow-400 px-2 py-1 rounded">
                              <img src="/logos/mtn-1.jpg" alt="MTN" className="size-3 object-cover rounded-sm" />
                              MTN
                            </span>
                          )}
                          {detectOperator(phone) === 'ORANGE' && (
                            <span className="flex items-center gap-1.5 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700 text-[10px] font-bold text-orange-800 dark:text-orange-400 px-2 py-1 rounded">
                              <img src="/logos/orange-money.jpg" alt="Orange" className="size-3 object-cover rounded-sm" />
                              Orange
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-foreground flex items-center gap-1.5 uppercase">
                      <MessageSquare className="size-3.5 text-primary" /> {t('orders.instructions')}
                    </label>
                    <textarea
                      className="w-full h-20 p-3 bg-muted/60 border border-border/40 rounded-xl text-sm focus:outline-none focus:border-primary/50 transition-colors resize-none"
                      placeholder={t('orders.instructionsPlaceholder')}
                      value={instructions}
                      onChange={(e) => setInstructions(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Mode de paiement */}
              <div className="space-y-3">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                  Mode de paiement
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    disabled
                    className={cn(
                      "flex flex-col items-center justify-center gap-2 p-3 rounded-2xl border-2 transition-all h-[90px] opacity-50 cursor-not-allowed",
                      paymentMethod === 'momo'
                        ? "border-amber-500 bg-amber-50 dark:bg-amber-950/20 shadow-sm"
                        : "border-border/60 bg-card hover:border-border"
                    )}
                  >
                    <Smartphone className={cn("size-6", paymentMethod === 'momo' ? "text-amber-500" : "text-muted-foreground")} />
                    <span className={cn("text-xs font-bold", paymentMethod === 'momo' ? "text-amber-700 dark:text-amber-500" : "text-muted-foreground")}>
                      Mobile Money (Bientôt)
                    </span>
                    {paymentMethod === 'momo' && detectOperator(phone) === null && phone.length > 8 && (
                      <span className="text-[9px] text-red-500 font-semibold absolute bottom-1">Numéro invalide</span>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('cod')}
                    className={cn(
                      "flex flex-col items-center justify-center gap-2 p-3 rounded-2xl border-2 transition-all h-[90px]",
                      paymentMethod === 'cod'
                        ? "border-primary bg-primary/5 shadow-sm"
                        : "border-border/60 bg-card hover:border-border"
                    )}
                  >
                    <Banknote className={cn("size-6", paymentMethod === 'cod' ? "text-primary" : "text-muted-foreground")} />
                    <span className={cn("text-xs font-bold", paymentMethod === 'cod' ? "text-primary" : "text-muted-foreground")}>
                      À la livraison
                    </span>
                  </button>
                </div>
              </div>

              {/* Récap total */}
              <div className="rounded-2xl border border-border/60 bg-card divide-y divide-border/40 overflow-hidden">
                {quantity500ml > 0 && (
                  <div className="flex items-center justify-between px-4 py-3">
                    <span className="text-[13px] text-muted-foreground">
                      {quantity500ml} × {t('settings.halfLiter')} · {price500.toLocaleString()} XAF
                    </span>
                    <span className="text-[13px] font-semibold text-foreground">
                      {(price500 * quantity500ml).toLocaleString()} XAF
                    </span>
                  </div>
                )}
                {quantity1L > 0 && (
                  <div className="flex items-center justify-between px-4 py-3">
                    <span className="text-[13px] text-muted-foreground">
                      {quantity1L} × {t('settings.oneLiter')} · {price1L.toLocaleString()} XAF
                    </span>
                    <span className="text-[13px] font-semibold text-foreground">
                      {(price1L * quantity1L).toLocaleString()} XAF
                    </span>
                  </div>
                )}
                {totalBottles > 0 && (
                  <div className="flex items-center justify-between px-4 py-3">
                    <span className="text-[13px] text-muted-foreground flex items-center gap-1.5">
                      <Truck className="size-3.5" /> {t('orders.delivery')}
                    </span>
                    <span className="text-[13px] font-semibold text-foreground">
                      {deliveryFee.toLocaleString()} XAF
                    </span>
                  </div>
                )}
                {totalBottles > 0 && discountAmount > 0 && (
                  <div className="flex items-center justify-between px-4 py-3">
                    <span className="text-[13px] font-bold text-amber-600 flex items-center gap-1.5">
                      <Sparkles className="size-3.5" /> Lien de réduction utilisé ({isFlyer ? 'Flyer' : 'Étiquette'})
                    </span>
                    <span className="text-[13px] font-bold text-amber-600">
                      -{discountAmount.toLocaleString()} XAF
                    </span>
                  </div>
                )}
                {totalBottles > 0 && (
                  <div className="flex items-center justify-between px-4 py-4 bg-primary/5">
                    <span className="text-[15px] font-bold text-foreground">{t('orders.total')}</span>
                    <span className="text-[18px] font-bold text-primary tabular-nums">
                      {total.toLocaleString()} XAF
                    </span>
                  </div>
                )}
                {totalBottles === 0 && (
                  <div className="px-4 py-4 text-center text-sm text-muted-foreground">
                    {t('orders.selectBottle')}
                  </div>
                )}
              </div>

              {/* Info analyse auto */}
              {!hasAnalysis && (
                <div className="flex items-start gap-3 px-4 py-3 rounded-2xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-700/40">
                  <Sparkles className="size-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <p className="text-[12px] text-amber-700 dark:text-amber-400 font-medium leading-relaxed">
                    {t('orders.nutrifysNote')}
                  </p>
                </div>
              )}
            </div>

            {/* Footer CTA */}
            <div className="shrink-0 border-t border-border/40 px-6 py-5">
              <Button
                size="lg"
                className="w-full h-14 rounded-2xl bg-primary hover:bg-primary/90 text-white font-bold text-base gap-2 shadow-[0_8px_25px_rgba(63,109,78,0.3)] disabled:opacity-50 active:scale-95 transition-all"
                disabled={ordering || !deliveryOk || !pricing || totalBottles === 0 || (paymentMethod === 'momo' && detectOperator(phone) === null)}
                onClick={handleOrder}
              >
                {ordering ? (
                  <><Loader2 className="size-5 animate-spin" /> {t('orders.ordering')}</>
                ) : !deliveryOk ? (
                  <>{t('orders.fillAddress')}</>
                ) : totalBottles === 0 ? (
                  <>{t('orders.selectBottle')}</>
                ) : paymentMethod === 'momo' && detectOperator(phone) === null ? (
                  <>Vérifiez votre numéro (MTN/Orange)</>
                ) : (
                  paymentMethod === 'momo' 
                    ? <><Smartphone className="size-5" /> Payer {total.toLocaleString()} XAF</>
                    : <><ShoppingBag className="size-5" /> {t('orders.orderWithPrice', { total: total.toLocaleString() })}</>
                )}
              </Button>
            </div>
          </>
        )}
      </SheetContent>

      {/* Modale d'Onboarding Santé si nécessaire */}
      {user && (
        <OnboardingModal
          open={showOnboarding}
          onSkip={() => setShowOnboarding(false)}
          onComplete={async (data) => {
            if (!user) return;
            await saveProfile(user.uid, data);
            await fetchProfile(user.uid);
            setShowOnboarding(false);
            // Reprendre l'action
            if (actionToResume === 'analyze') {
              setTimeout(() => handleAnalyze(), 200);
            } else if (actionToResume === 'order') {
              setTimeout(() => handleOrder(), 200);
            }
            setActionToResume(null);
          }}
        />
      )}
    </Sheet>
  );
}
