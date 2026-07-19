import { PageComponent, useNavigate } from 'rasengan';
import {
  ShoppingBag, Package, Clock, Loader2, Phone, Mail,
  CheckCircle2, ChefHat, Truck, XCircle, Circle, ChevronRight, Sparkles, MapPin, MessageSquare, Download
} from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useAuthStore } from '@/stores/auth';
import { UserRole, OrderStatus } from '@/entities';
import type { Order, Cocktail } from '@/entities';
import { getUserOrders, getAllOrders, updateOrderStatus, cancelOrder } from '@/services/order';
import { getCocktailById } from '@/services/cocktail';
import { getFruits } from '@/services/fruit';
import { VERDICT_CONFIG, NutritionalView } from '@/components/features/cocktail/NutritionalView';
import { CocktailLabelExport } from '@/components/features/cocktail/CocktailLabelExport';
import { buildFruitVisuals } from '@/components/features/cocktail/CocktailBanner';
import { downloadVectorFacture, downloadVectorNutrition } from '@/lib/pdf';

// ── Status display config ─────────────────────────────────────────────────────

const STATUS_CONFIG: Record<OrderStatus, {
  label: string;
  icon: React.ElementType;
  bg: string;
  text: string;
  border: string;
  dot: string;
}> = {
  [OrderStatus.PENDING]: {
    label: 'En attente',
    icon: Clock,
    bg: 'bg-amber-50 dark:bg-amber-950/30',
    text: 'text-amber-700 dark:text-amber-400',
    border: 'border-amber-200 dark:border-amber-700',
    dot: 'bg-amber-500',
  },
  [OrderStatus.CONFIRMED]: {
    label: 'Confirmée',
    icon: CheckCircle2,
    bg: 'bg-sky-50 dark:bg-sky-950/30',
    text: 'text-sky-700 dark:text-sky-400',
    border: 'border-sky-200 dark:border-sky-700',
    dot: 'bg-sky-500',
  },
  [OrderStatus.PREPARING]: {
    label: 'En préparation',
    icon: ChefHat,
    bg: 'bg-violet-50 dark:bg-violet-950/30',
    text: 'text-violet-700 dark:text-violet-400',
    border: 'border-violet-200 dark:border-violet-700',
    dot: 'bg-violet-500',
  },
  [OrderStatus.READY]: {
    label: 'Prête',
    icon: Package,
    bg: 'bg-primary/8 dark:bg-primary/15',
    text: 'text-primary',
    border: 'border-primary/30',
    dot: 'bg-primary',
  },
  [OrderStatus.DELIVERED]: {
    label: 'Livrée',
    icon: CheckCircle2,
    bg: 'bg-emerald-50 dark:bg-emerald-950/30',
    text: 'text-emerald-700 dark:text-emerald-400',
    border: 'border-emerald-200 dark:border-emerald-700',
    dot: 'bg-emerald-500',
  },
  [OrderStatus.CANCELLED]: {
    label: 'Annulée',
    icon: XCircle,
    bg: 'bg-muted',
    text: 'text-muted-foreground',
    border: 'border-border/60',
    dot: 'bg-muted-foreground/40',
  },
};

// Timeline steps for client view (all except cancelled)
const TIMELINE_STEPS: OrderStatus[] = [
  OrderStatus.PENDING,
  OrderStatus.CONFIRMED,
  OrderStatus.PREPARING,
  OrderStatus.READY,
  OrderStatus.DELIVERED,
];

// Statuses the admin can transition to (in order)
const ADMIN_STATUS_FLOW: OrderStatus[] = [
  OrderStatus.PENDING,
  OrderStatus.CONFIRMED,
  OrderStatus.PREPARING,
  OrderStatus.READY,
  OrderStatus.DELIVERED,
];

// Statuses a client can cancel from
const CLIENT_CANCELLABLE: OrderStatus[] = [OrderStatus.PENDING, OrderStatus.CONFIRMED];

function formatDate(ts: { seconds: number } | null | undefined): string {
  if (!ts) return '—';
  return new Date(ts.seconds * 1000).toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

function StatusBadge({ status, size = 'sm' }: { status: OrderStatus; size?: 'sm' | 'lg' }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full font-bold border ${cfg.bg} ${cfg.text} ${cfg.border} ${
      size === 'lg' ? 'px-3 py-1.5 text-[12px]' : 'px-2.5 py-1 text-[11px]'
    }`}>
      <span className={`size-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

// ── Order card (shared) ───────────────────────────────────────────────────────

function OrderCard({
  order,
  showCustomer,
  onClick,
}: {
  order: Order;
  showCustomer?: boolean;
  onClick: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className="bg-card rounded-[2rem] border border-border/40 p-5 shadow-sm flex flex-col gap-3 cursor-pointer hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group relative overflow-hidden"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-display font-bold text-foreground truncate">{order.cocktailNameSnapshot}</p>
          {showCustomer && (
            <p className="text-xs font-semibold text-primary truncate mt-0.5">{order.userNameSnapshot}</p>
          )}
          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
            <Clock className="size-3" />
            {formatDate(order.createdAt as unknown as { seconds: number })}
          </p>
        </div>
        <StatusBadge status={order.status} />
      </div>

      <p className="text-sm text-muted-foreground">
        {order.quantity} bouteille{order.quantity > 1 ? 's' : ''}
        {order.bottleSizeLabel ? ` · ${order.bottleSizeLabel}` : ''}
        {' · '}{order.cocktailPriceSnapshot.toLocaleString()} XAF / u
      </p>

      <div className="flex items-center justify-between pt-1 border-t border-border/40">
        <p className="font-bold text-foreground tabular-nums">{order.totalPrice.toLocaleString()} XAF</p>
        <span className="text-xs font-bold text-primary flex items-center gap-1 group-hover:gap-2 transition-all">
          Détails <ChevronRight className="size-3.5" />
        </span>
      </div>
    </div>
  );
}

// ── Cocktail info block ───────────────────────────────────────────────────────

function CocktailInfoBlock({
  cocktail,
  loading,
  orderImageUrl,
  orderFruitImages,
  clientName,
  cocktailNameFallback,
}: {
  cocktail: Cocktail | null | undefined;
  loading: boolean;
  orderImageUrl?: string;
  orderFruitImages?: string[];
  clientName?: string;
  cocktailNameFallback?: string;
}) {
  const { data: fruits = [] } = useQuery({
    queryKey: ['fruits'],
    queryFn: getFruits,
    staleTime: 5 * 60_000,
  });

  const fruitVisuals = useMemo(() => {
    if (cocktail?.ingredients?.length) {
      return buildFruitVisuals(cocktail.ingredients, fruits, orderFruitImages);
    }
    if (orderFruitImages?.length) {
      return orderFruitImages.map((url) => ({ imageUrl: url || null }));
    }
    return [];
  }, [orderFruitImages, cocktail, fruits]);

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="h-3 w-20 bg-muted rounded-full animate-pulse" />
        <div className="rounded-2xl bg-muted h-[200px] animate-pulse" />
      </div>
    );
  }
  if (!cocktail && !orderImageUrl && !fruitVisuals.length && !cocktailNameFallback) return null;

  const analysis = cocktail?.aiAnalysis;
  const vcfg = analysis ? VERDICT_CONFIG[analysis.verdict] : null;
  const name = cocktail?.name ?? cocktailNameFallback ?? 'Cocktail';
  const fruitNames = cocktail?.ingredients.map((i) => i.fruitName) ?? [];

  return (
    <div className="space-y-3">
      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Cocktail</p>
      <div className="rounded-2xl border border-border/60 bg-card overflow-hidden">
        <CocktailLabelExport
            cocktailName={name}
            clientName={clientName}
            imageUrl={fruitVisuals.length ? undefined : (orderImageUrl ?? cocktail?.imageUrl)}
            fruits={fruitVisuals}
            fruitNames={fruitNames}
            badge={
              vcfg ? (
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold shadow-sm ${vcfg.chip}`}>
                  {vcfg.emoji} {vcfg.label}
                </span>
              ) : undefined
            }
          />

        {cocktail && (
          <div className="px-4 py-3.5 space-y-3">
            {cocktail.description && (
              <p className="text-[13px] text-muted-foreground leading-relaxed">{cocktail.description}</p>
            )}

            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">
                Ingrédients
              </p>
              <div className="flex flex-wrap gap-1.5">
                {cocktail.ingredients.map((ing) => (
                  <span
                    key={ing.fruitId}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-accent/40 text-accent-foreground text-[12px] font-semibold"
                  >
                    {ing.fruitName}
                  </span>
                ))}
              </div>
            </div>

            {analysis && vcfg && (
              <div className={`flex items-center justify-between px-3 py-2.5 rounded-xl border ${vcfg.bg} ${vcfg.border}`}>
                <span className={`text-[12px] font-bold ${vcfg.text}`}>
                  {vcfg.emoji} NutriFYS — {vcfg.label}
                </span>
                <span className={`text-[12px] font-bold tabular-nums ${vcfg.text}`}>
                  {analysis.score} / 100
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Client order detail sheet ─────────────────────────────────────────────────

function ClientOrderSheet({
  order,
  open,
  onOpenChange,
  onCancel,
}: {
  order: Order | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCancel: (orderId: string) => Promise<void>;
}) {
  const [cancelling, setCancelling] = useState(false);
  const [activeTab, setActiveTab] = useState<'order' | 'nutrition'>('order');
  const [downloadingNutrition, setDownloadingNutrition] = useState(false);
  const [downloadingFacture, setDownloadingFacture] = useState(false);

  useEffect(() => {
    if (open) setActiveTab('order');
  }, [open]);

  const { data: cocktail, isLoading: cocktailLoading } = useQuery({
    queryKey: ['cocktail', order?.cocktailId],
    queryFn: () => getCocktailById(order!.cocktailId),
    enabled: !!order,
    staleTime: 5 * 60_000,
  });

  if (!order) return null;

  const stepIndex = TIMELINE_STEPS.indexOf(order.status);
  const isCancelled = order.status === OrderStatus.CANCELLED;
  const canCancel = CLIENT_CANCELLABLE.includes(order.status);

  async function handleCancel() {
    setCancelling(true);
    try {
      await onCancel(order!.id);
    } finally {
      setCancelling(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full max-w-[500px] p-0 flex flex-col">

        <SheetHeader className="px-6 pt-6 pb-0 shrink-0">
          <SheetTitle className="font-display text-xl font-bold">{order.cocktailNameSnapshot}</SheetTitle>
          <div className="flex items-center gap-2 mt-0.5">
            <p className="text-[13px] text-muted-foreground">
              Commande du {formatDate(order.createdAt as unknown as { seconds: number })}
            </p>
            {order.aiAnalysisSnapshot && (
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${VERDICT_CONFIG[order.aiAnalysisSnapshot.verdict].chip}`}>
                {VERDICT_CONFIG[order.aiAnalysisSnapshot.verdict].emoji} {VERDICT_CONFIG[order.aiAnalysisSnapshot.verdict].label}
              </span>
            )}
          </div>
          
          {order.aiAnalysisSnapshot && (
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
                <Package className="size-3.5" />
                Détails commande
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

        <div className="border-b border-border/40 mt-4 shrink-0" />

        {activeTab === 'nutrition' && order.aiAnalysisSnapshot ? (
          <div className="flex-1 overflow-y-auto flex flex-col">
            <div id={`pdf-nutrition-${order.id}`} className="px-6 py-5 pb-8 bg-background shrink-0">
              <NutritionalView analysis={order.aiAnalysisSnapshot} />
            </div>
            <div className="px-6 pb-6 pt-2 shrink-0 border-t border-border/40 mt-auto">
              <Button
                variant="outline"
                className="w-full h-12 rounded-2xl font-bold gap-2 disabled:opacity-50"
                disabled={downloadingNutrition}
                onClick={async () => {
                   setDownloadingNutrition(true);
                   const ingStr = cocktail?.ingredients?.map((i) => i.fruitName).join(' · ');
                   await downloadVectorNutrition(order.aiAnalysisSnapshot!, order.cocktailNameSnapshot, order.userNameSnapshot, ingStr);
                   setDownloadingNutrition(false);
                }}
              >
                {downloadingNutrition ? (
                  <><Loader2 className="size-4 animate-spin" /> Génération en cours…</>
                ) : (
                  <><Download className="size-4" /> Télécharger la Fiche (PDF)</>
                )}
              </Button>
            </div>
          </div>
        ) : (
        <div className="flex-1 overflow-y-auto flex flex-col">
          <div id={`pdf-facture-${order.id}`} className="px-6 py-6 pb-8 space-y-7 bg-background shrink-0">

          {/* Cocktail info */}
          <CocktailInfoBlock
            cocktail={cocktail}
            loading={cocktailLoading}
            orderImageUrl={order.cocktailImageSnapshot}
            orderFruitImages={order.ingredientImageSnapshots}
            clientName={order.userNameSnapshot}
            cocktailNameFallback={order.cocktailNameSnapshot}
          />

          {/* Status actuel */}
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Statut actuel</p>
            <StatusBadge status={order.status} size="lg" />
          </div>

          {/* Timeline */}
          {!isCancelled && (
            <div className="space-y-3">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Progression</p>
              <div className="relative">
                {/* Connecting line */}
                <div className="absolute left-[15px] top-4 bottom-4 w-0.5 bg-border/50" />
                <div className="space-y-0">
                  {TIMELINE_STEPS.map((step, i) => {
                    const cfg = STATUS_CONFIG[step];
                    const Icon = cfg.icon;
                    const isDone = i < stepIndex;
                    const isActive = i === stepIndex;
                    const isFuture = i > stepIndex;
                    return (
                      <div key={step} className="flex items-center gap-4 py-2.5 relative">
                        <div className={`size-8 rounded-full flex items-center justify-center shrink-0 z-10 border-2 transition-all ${
                          isActive
                            ? `${cfg.border} ${cfg.bg}`
                            : isDone
                            ? 'border-primary/40 bg-primary/10'
                            : 'border-border bg-background'
                        }`}>
                          {isDone ? (
                            <CheckCircle2 className="size-4 text-primary" />
                          ) : (
                            <Icon className={`size-4 ${isActive ? cfg.text : 'text-muted-foreground/40'}`} />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className={`text-[13px] font-semibold ${
                            isActive ? 'text-foreground' : isFuture ? 'text-muted-foreground/50' : 'text-muted-foreground'
                          }`}>
                            {cfg.label}
                          </p>
                          {isActive && (
                            <p className="text-[11px] text-muted-foreground mt-0.5">Étape en cours</p>
                          )}
                        </div>
                        {isActive && (
                          <span className={`ml-auto size-2 rounded-full animate-pulse shrink-0 ${cfg.dot}`} />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {isCancelled && (
            <div className="rounded-2xl bg-muted/60 border border-border/50 px-5 py-4 flex items-center gap-3">
              <XCircle className="size-5 text-muted-foreground shrink-0" />
              <p className="text-[13px] text-muted-foreground font-medium">
                Cette commande a été annulée.
              </p>
            </div>
          )}

          {/* Informations de Livraison */}
          {order.deliveryDetails && (
            <div className="space-y-3">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Informations de Livraison</p>
              <div className="rounded-2xl border border-border/60 bg-card p-4 space-y-3">
                <div className="flex gap-3">
                  <MapPin className="size-4 text-primary shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[13px] font-bold text-foreground">Quartier</p>
                    <p className="text-[12px] text-muted-foreground">{order.deliveryDetails.district}</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <Phone className="size-4 text-primary shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[13px] font-bold text-foreground">Téléphone (Livraison)</p>
                    <p className="text-[12px] text-muted-foreground">{order.deliveryDetails.phone}</p>
                  </div>
                </div>
                {order.deliveryDetails.instructions && (
                  <div className="flex gap-3">
                    <MessageSquare className="size-4 text-primary shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[13px] font-bold text-foreground">Indications</p>
                      <p className="text-[12px] text-muted-foreground">{order.deliveryDetails.instructions}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Résumé commande */}
          <div className="space-y-3">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Récapitulatif</p>
            <div className="rounded-2xl border border-border/60 bg-card divide-y divide-border/40 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-[13px] text-muted-foreground">Cocktail</span>
                <span className="text-[13px] font-semibold text-foreground">{order.cocktailNameSnapshot}</span>
              </div>
              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-[13px] text-muted-foreground">Quantité</span>
                <span className="text-[13px] font-semibold text-foreground">
                  {order.quantity} bouteille{order.quantity > 1 ? 's' : ''}
                  {order.bottleSizeLabel ? ` · ${order.bottleSizeLabel}` : ''}
                </span>
              </div>
              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-[13px] text-muted-foreground">
                  {order.quantity} × {order.cocktailPriceSnapshot.toLocaleString()} XAF
                </span>
                <span className="text-[13px] font-semibold text-foreground">
                  {(order.cocktailPriceSnapshot * order.quantity).toLocaleString()} XAF
                </span>
              </div>
              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-[13px] text-muted-foreground flex items-center gap-1.5">
                  <Truck className="size-3.5" /> Livraison
                </span>
                <span className="text-[13px] font-semibold text-foreground">
                  {order.deliveryFee.toLocaleString()} XAF
                </span>
              </div>
              <div className="flex items-center justify-between px-4 py-4 bg-primary/5">
                <span className="text-[14px] font-bold text-foreground">Total</span>
                <span className="text-[16px] font-bold text-primary tabular-nums">
                  {order.totalPrice.toLocaleString()} XAF
                </span>
              </div>
            </div>
          </div>
          </div>
          <div className="px-6 pb-6 pt-2 shrink-0 border-t border-border/40 mt-auto">
            <Button
              variant="outline"
              className="w-full h-12 rounded-2xl font-bold gap-2 disabled:opacity-50"
              disabled={downloadingFacture}
              onClick={async () => {
                setDownloadingFacture(true);
                const ingStr = cocktail?.ingredients?.map(i => i.fruitName).join(' · ');
                await downloadVectorFacture(order, ingStr);
                setDownloadingFacture(false);
              }}
            >
              {downloadingFacture ? (
                <><Loader2 className="size-4 animate-spin px-0 mx-0 text-primary" /> Génération en cours…</>
              ) : (
                <><Download className="size-4 text-primary" /> Télécharger la Facture (PDF)</>
              )}
            </Button>
          </div>
        </div>
        )}

        {/* Footer — cancel */}
        {canCancel && (
          <div className="shrink-0 border-t border-border/40 px-6 py-5">
            <Button
              variant="outline"
              size="lg"
              className="w-full h-12 rounded-2xl border-destructive/40 text-destructive hover:bg-destructive/5 font-bold gap-2"
              disabled={cancelling}
              onClick={handleCancel}
            >
              {cancelling ? <><Loader2 className="size-4 animate-spin" /> Annulation…</> : <><XCircle className="size-4" /> Annuler la commande</>}
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

// ── Admin order detail sheet ──────────────────────────────────────────────────

function AdminOrderSheet({
  order,
  open,
  onOpenChange,
  onStatusChange,
  onCancel,
}: {
  order: Order | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onStatusChange: (orderId: string, status: OrderStatus) => Promise<void>;
  onCancel: (orderId: string) => Promise<void>;
}) {
  const [updating, setUpdating] = useState<OrderStatus | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [activeTab, setActiveTab] = useState<'order' | 'nutrition'>('order');
  const [downloadingNutrition, setDownloadingNutrition] = useState(false);
  const [downloadingFacture, setDownloadingFacture] = useState(false);

  useEffect(() => {
    if (open) setActiveTab('order');
  }, [open]);

  const { data: cocktail, isLoading: cocktailLoading } = useQuery({
    queryKey: ['cocktail', order?.cocktailId],
    queryFn: () => getCocktailById(order!.cocktailId),
    enabled: !!order,
    staleTime: 5 * 60_000,
  });

  if (!order) return null;

  const isCancelled = order.status === OrderStatus.CANCELLED;
  const isDelivered = order.status === OrderStatus.DELIVERED;
  const currentIndex = ADMIN_STATUS_FLOW.indexOf(order.status);

  async function handleStatus(status: OrderStatus) {
    setUpdating(status);
    try {
      await onStatusChange(order!.id, status);
    } finally {
      setUpdating(null);
    }
  }

  async function handleCancel() {
    setCancelling(true);
    try {
      await onCancel(order!.id);
    } finally {
      setCancelling(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full max-w-[500px] p-0 flex flex-col">

        <SheetHeader className="px-6 pt-6 pb-0 shrink-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <SheetTitle className="font-display text-xl font-bold">{order.cocktailNameSnapshot}</SheetTitle>
              <div className="flex items-center gap-2 mt-0.5">
                <p className="text-[13px] text-muted-foreground">
                  {formatDate(order.createdAt as unknown as { seconds: number })}
                </p>
                {order.aiAnalysisSnapshot && (
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${VERDICT_CONFIG[order.aiAnalysisSnapshot.verdict].chip}`}>
                    {VERDICT_CONFIG[order.aiAnalysisSnapshot.verdict].emoji} {VERDICT_CONFIG[order.aiAnalysisSnapshot.verdict].label}
                  </span>
                )}
              </div>
            </div>
            <StatusBadge status={order.status} size="lg" />
          </div>

          {order.aiAnalysisSnapshot && (
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
                <Package className="size-3.5" />
                Détails commande
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

        <div className="border-b border-border/40 mt-4 shrink-0" />

        {activeTab === 'nutrition' && order.aiAnalysisSnapshot ? (
          <div className="flex-1 overflow-y-auto flex flex-col">
            <div id={`pdf-nutrition-${order.id}`} className="px-6 py-5 pb-8 bg-background shrink-0">
              <NutritionalView analysis={order.aiAnalysisSnapshot} />
            </div>
            <div className="px-6 pb-6 pt-2 shrink-0 border-t border-border/40 mt-auto">
              <Button
                variant="outline"
                className="w-full h-12 rounded-2xl font-bold gap-2 disabled:opacity-50"
                disabled={downloadingNutrition}
                onClick={async () => {
                   setDownloadingNutrition(true);
                   const ingStr = cocktail?.ingredients?.map((i) => i.fruitName).join(' · ');
                   await downloadVectorNutrition(order.aiAnalysisSnapshot!, order.cocktailNameSnapshot, order.userNameSnapshot, ingStr);
                   setDownloadingNutrition(false);
                }}
              >
                {downloadingNutrition ? (
                  <><Loader2 className="size-4 animate-spin" /> Génération en cours…</>
                ) : (
                  <><Download className="size-4" /> Télécharger la Fiche (PDF)</>
                )}
              </Button>
            </div>
          </div>
        ) : (
        <div className="flex-1 overflow-y-auto flex flex-col">
          <div id={`pdf-facture-${order.id}`} className="px-6 py-6 pb-8 space-y-7 bg-background shrink-0">

          {/* Cocktail info */}
          <CocktailInfoBlock
            cocktail={cocktail}
            loading={cocktailLoading}
            orderImageUrl={order.cocktailImageSnapshot}
            orderFruitImages={order.ingredientImageSnapshots}
            clientName={order.userNameSnapshot}
            cocktailNameFallback={order.cocktailNameSnapshot}
          />

          {/* Contact client */}
          <div className="space-y-3">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Client</p>
            <div className="rounded-2xl border border-border/60 bg-card overflow-hidden divide-y divide-border/40">
              <div className="flex items-center gap-3 px-4 py-3.5">
                <div className="size-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="text-[13px] font-bold text-primary">
                    {order.userNameSnapshot.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)}
                  </span>
                </div>
                <div className="min-w-0">
                  <p className="text-[13px] font-bold text-foreground">{order.userNameSnapshot}</p>
                  <p className="text-[11px] text-muted-foreground">{order.quantity} bouteille{order.quantity > 1 ? 's' : ''} commandée{order.quantity > 1 ? 's' : ''}</p>
                </div>
              </div>
              <a
                href={`mailto:${order.userEmailSnapshot}`}
                className="flex items-center gap-3 px-4 py-3 hover:bg-accent/50 transition-colors"
              >
                <Mail className="size-4 text-muted-foreground shrink-0" />
                <span className="text-[13px] text-foreground truncate">{order.userEmailSnapshot}</span>
              </a>
              {order.userPhoneSnapshot && (
                <a
                  href={`tel:${order.userPhoneSnapshot}`}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-accent/50 transition-colors"
                >
                  <Phone className="size-4 text-primary shrink-0" />
                  <span className="text-[13px] font-semibold text-primary">{order.userPhoneSnapshot}</span>
                  <span className="ml-auto text-[11px] text-primary font-bold px-2 py-0.5 bg-primary/10 rounded-full">Appeler</span>
                </a>
              )}
              {order.deliveryDetails && (
                <div className="p-4 bg-muted/10">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3">
                    Adresse de Livraison
                  </p>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <MapPin className="size-4 text-primary shrink-0 mt-0.5" />
                      <span className="text-[13px] font-semibold text-foreground leading-snug">
                        {order.deliveryDetails.district}
                      </span>
                    </div>
                    <div className="flex items-start gap-3">
                      <Phone className="size-4 text-primary shrink-0 mt-0.5" />
                      <span className="text-[13px] font-semibold text-foreground leading-snug">
                        {order.deliveryDetails.phone}
                      </span>
                    </div>
                    {order.deliveryDetails.instructions && (
                      <div className="flex items-start gap-3">
                        <MessageSquare className="size-4 text-primary shrink-0 mt-0.5" />
                        <span className="text-[12px] text-muted-foreground leading-relaxed">
                          {order.deliveryDetails.instructions}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Changer le statut */}
          {!isCancelled && !isDelivered && (
            <div className="space-y-3">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                Faire avancer la commande
              </p>
              <div className="flex flex-col gap-2">
                {ADMIN_STATUS_FLOW.filter((_, i) => i > currentIndex).map((status) => {
                  const cfg = STATUS_CONFIG[status];
                  const Icon = cfg.icon;
                  const isLoading = updating === status;
                  return (
                    <button
                      key={status}
                      type="button"
                      onClick={() => handleStatus(status)}
                      disabled={!!updating || cancelling}
                      className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl border text-left transition-all active:scale-95 disabled:opacity-50 ${cfg.bg} ${cfg.border} hover:opacity-90`}
                    >
                      {isLoading
                        ? <Loader2 className="size-4 animate-spin shrink-0 text-muted-foreground" />
                        : <Icon className={`size-4 shrink-0 ${cfg.text}`} />
                      }
                      <span className={`text-[13px] font-bold ${cfg.text}`}>
                        Passer à : {cfg.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {(isCancelled || isDelivered) && (
            <div className={`rounded-2xl border px-5 py-4 flex items-center gap-3 ${STATUS_CONFIG[order.status].bg} ${STATUS_CONFIG[order.status].border}`}>
              <Circle className={`size-4 shrink-0 ${STATUS_CONFIG[order.status].text}`} />
              <p className={`text-[13px] font-semibold ${STATUS_CONFIG[order.status].text}`}>
                {isCancelled ? 'Commande annulée.' : 'Commande livrée — terminée.'}
              </p>
            </div>
          )}

          {/* Détail commande */}
          <div className="space-y-3">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Détail</p>
            <div className="rounded-2xl border border-border/60 bg-card divide-y divide-border/40 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-[13px] text-muted-foreground">Quantité</span>
                <span className="text-[13px] font-semibold text-foreground">
                  {order.quantity} bouteille{order.quantity > 1 ? 's' : ''}
                  {order.bottleSizeLabel ? ` · ${order.bottleSizeLabel}` : ''}
                </span>
              </div>
              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-[13px] text-muted-foreground">
                  {order.quantity} × {order.cocktailPriceSnapshot.toLocaleString()} XAF
                </span>
                <span className="text-[13px] font-semibold text-foreground">
                  {(order.cocktailPriceSnapshot * order.quantity).toLocaleString()} XAF
                </span>
              </div>
              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-[13px] text-muted-foreground">Livraison</span>
                <span className="text-[13px] font-semibold text-foreground">
                  {order.deliveryFee.toLocaleString()} XAF
                </span>
              </div>
              <div className="flex items-center justify-between px-4 py-4 bg-primary/5">
                <span className="text-[14px] font-bold text-foreground">Total</span>
                <span className="text-[16px] font-bold text-primary tabular-nums">
                  {order.totalPrice.toLocaleString()} XAF
                </span>
              </div>
            </div>
          </div>
          </div>
          <div className="px-6 pb-6 pt-2 shrink-0 border-t border-border/40 mt-auto">
            <Button
              variant="outline"
              className="w-full h-12 rounded-2xl font-bold gap-2 disabled:opacity-50"
              disabled={downloadingFacture}
              onClick={async () => {
                setDownloadingFacture(true);
                const ingStr = cocktail?.ingredients?.map(i => i.fruitName).join(' · ');
                await downloadVectorFacture(order, ingStr);
                setDownloadingFacture(false);
              }}
            >
              {downloadingFacture ? (
                <><Loader2 className="size-4 animate-spin px-0 mx-0 text-primary" /> Génération en cours…</>
              ) : (
                <><Download className="size-4 text-primary" /> Télécharger la Facture (PDF)</>
              )}
            </Button>
          </div>
        </div>
        )}

        {/* Footer — cancel (admin) */}
        {!isCancelled && !isDelivered && (
          <div className="shrink-0 border-t border-border/40 px-6 py-5">
            <Button
              variant="outline"
              size="lg"
              className="w-full h-12 rounded-2xl border-destructive/40 text-destructive hover:bg-destructive/5 font-bold gap-2"
              disabled={cancelling || !!updating}
              onClick={handleCancel}
            >
              {cancelling
                ? <><Loader2 className="size-4 animate-spin" /> Annulation…</>
                : <><XCircle className="size-4" /> Annuler la commande</>
              }
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

const ADMIN_FILTER_STATUSES = [
  { value: 'all', label: 'Toutes' },
  { value: OrderStatus.PENDING,   label: 'En attente' },
  { value: OrderStatus.CONFIRMED, label: 'Confirmées' },
  { value: OrderStatus.PREPARING, label: 'En préparation' },
  { value: OrderStatus.READY,     label: 'Prêtes' },
  { value: OrderStatus.DELIVERED, label: 'Livrées' },
  { value: OrderStatus.CANCELLED, label: 'Annulées' },
] as const;

const Orders: PageComponent = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isAdmin = user?.role === UserRole.ADMIN;

  const [selected, setSelected] = useState<Order | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | OrderStatus>('all');

  const { data: orders = [], isLoading } = useQuery({
    queryKey: isAdmin ? ['orders', 'all'] : ['orders', 'user', user?.uid],
    queryFn: isAdmin ? getAllOrders : async () => {
      return await getUserOrders(user!.uid);
    },
    enabled: !!user?.uid,
  });

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['orders'] });
  }

  async function handleStatusChange(orderId: string, status: OrderStatus) {
    await updateOrderStatus(orderId, status);
    invalidate();
    // Update selected order in-place so the sheet reflects the new status
    if (selected?.id === orderId) setSelected((prev) => prev ? { ...prev, status } : prev);
  }

  async function handleCancel(orderId: string) {
    await cancelOrder(orderId);
    invalidate();
    if (selected?.id === orderId) {
      setSelected((prev) => prev ? { ...prev, status: OrderStatus.CANCELLED } : prev);
    }
  }

  const visible = orders.filter((o) => filterStatus === 'all' || o.status === filterStatus);

  const heroBg = isAdmin
    ? "url('https://images.pexels.com/photos/1267320/pexels-photo-1267320.jpeg?auto=compress&cs=tinysrgb&w=1200')"
    : "url('https://images.pexels.com/photos/4553031/pexels-photo-4553031.jpeg?auto=compress&cs=tinysrgb&w=1200')";

  return (
    <div className={`min-h-screen bg-background pb-20 ${isAdmin ? 'space-y-8 max-w-7xl mx-auto px-3 md:px-4 lg:px-6 pt-6 lg:pt-10' : ''}`}>

      {/* Hero Banner (Customer Only) */}
      {!isAdmin && (
        <div
          className="relative w-full h-[220px] flex items-end px-3 md:px-6 pb-8 mb-12 overflow-hidden"
          style={{ backgroundImage: heroBg, backgroundSize: 'cover', backgroundPosition: 'center' }}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
          <div className="relative z-10">
            <p className="text-white/70 text-xs font-bold uppercase tracking-[0.2em] mb-1">Suivi</p>
            <h1 className="font-display font-extrabold text-4xl text-white">
              Mes <span className="text-secondary italic">Commandes</span>
            </h1>
          </div>
        </div>
      )}

      {/* Admin Header */}
      {isAdmin && (
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground font-semibold uppercase tracking-widest pl-1 mb-2">Historique</p>
            <h2 className="font-display font-bold text-4xl text-foreground leading-[1.1]">Commandes</h2>
            <p className="text-muted-foreground text-lg font-medium mt-3">
              Supervisez la flotte de commandes.
            </p>
          </div>
          {!isLoading && orders.length > 0 && (
            <div className="flex items-center gap-3 shrink-0">
              <div className="bg-card rounded-2xl border border-border/40 p-3 px-5 shadow-sm min-w-[100px] text-center">
                <p className="font-display font-extrabold text-2xl text-foreground">{orders.length}</p>
                <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wide mt-0.5">Total</p>
              </div>
            </div>
          )}
        </div>
      )}

      <div className={isAdmin ? 'bg-card rounded-[2rem] border border-border/40 shadow-sm overflow-hidden p-6' : 'px-3 md:px-4 space-y-6'}>
        {/* Section title (Customer Only) */}
        {!isAdmin && (
          <div className="text-center">
            <h3 className="font-display font-bold text-3xl">
              <span className="text-foreground">Mes </span>
              <span className="text-primary">Commandes</span>
            </h3>
            <p className="text-muted-foreground mt-2 font-medium text-sm">
              Suivez l'état de vos commandes en temps réel.
            </p>
          </div>
        )}

        {/* Admin filter bar */}
        {isAdmin && (
          <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
            {ADMIN_FILTER_STATUSES.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => setFilterStatus(value)}
                className={`shrink-0 px-3.5 py-2 rounded-full text-[12px] font-bold transition-all border ${
                  filterStatus === value
                    ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                    : 'bg-card text-muted-foreground border-border/60 hover:border-primary/40 hover:text-foreground'
                }`}
              >
                {label}
                {value !== 'all' && (
                  <span className="ml-1.5 opacity-60">
                    {orders.filter((o) => o.status === value).length}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}

        {/* Loading */}
        {isLoading && (
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-32 rounded-3xl border border-border/60 bg-card p-4 flex gap-4 animate-pulse">
                <div className="size-20 rounded-2xl bg-muted/70 shrink-0" />
                <div className="flex-1 space-y-3 mt-1">
                  <div className="h-4 w-1/2 bg-muted rounded" />
                  <div className="h-3 w-1/3 bg-muted rounded" />
                </div>
                <div className="size-8 rounded-full bg-muted shrink-0" />
              </div>
            ))}
          </div>
        )}

        {/* Order list */}
        {!isLoading && visible.length > 0 && (
          <div className="space-y-4">
            {visible.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                showCustomer={isAdmin}
                onClick={() => setSelected(order)}
              />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!isLoading && visible.length === 0 && (
          <div className="rounded-[2.5rem] border-2 border-dashed border-border/40 flex flex-col items-center justify-center py-16 gap-4 text-center">
            <div className="size-16 rounded-full bg-secondary/5 flex items-center justify-center">
              <Package className="size-7 text-secondary/50" />
            </div>
            <p className="text-sm font-semibold text-foreground">
              {filterStatus !== 'all'
                ? `Aucune commande "${STATUS_CONFIG[filterStatus as OrderStatus]?.label}"`
                : 'Aucune commande pour le moment'}
            </p>
            {!isAdmin && filterStatus === 'all' && (
              <>
                <p className="text-xs text-muted-foreground max-w-[200px]">
                  Explorez le catalogue et passez votre première commande.
                </p>
                <Button
                  className="rounded-full bg-secondary text-white font-bold hover:bg-secondary/90 px-8 mt-2 gap-2"
                  size="sm"
                  onClick={() => navigate('/board/catalogue')}
                >
                  <ShoppingBag className="size-4" /> Explorer le catalogue
                </Button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Sheets */}
      {isAdmin ? (
        <AdminOrderSheet
          order={selected}
          open={!!selected}
          onOpenChange={(v) => !v && setSelected(null)}
          onStatusChange={handleStatusChange}
          onCancel={handleCancel}
        />
      ) : (
        <ClientOrderSheet
          order={selected}
          open={!!selected}
          onOpenChange={(v) => !v && setSelected(null)}
          onCancel={handleCancel}
        />
      )}
    </div>
  );
};

Orders.metadata = {
  title: 'FYS — Commandes',
  description: 'Suivi et gestion des commandes FYS.',
};

export default Orders;
