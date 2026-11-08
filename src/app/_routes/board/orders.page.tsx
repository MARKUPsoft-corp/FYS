import { PageComponent, useNavigate, useSearchParams } from 'rasengan';
import {
  ShoppingBag, Package, Clock, Loader2, Phone,
  CheckCircle2, ChefHat, Truck, XCircle, ChevronRight, Sparkles, MapPin, MessageSquare, Download,
  CalendarDays, Calendar, Search, Navigation, Trash2, Printer, Plus, Minus,
  Apple, Leaf, User, Receipt, TrendingUp, AlertTriangle, Check, ExternalLink, MessageCircle, FileText,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useAuthStore } from '@/stores/auth';
import { UserRole, OrderStatus, partitionCocktailIngredients, formatIngredientsSummary, isTastingOrder, splitOrderCocktails } from '@/entities';
import type { Order, Cocktail, CocktailIngredient } from '@/entities';
import { getCocktailById, getPublicCocktails } from '@/services/cocktail';
import { getFruits } from '@/services/fruit';
import { updateOrderStatus, cancelOrder, deleteOrderCompletely } from '@/services/order';
import { useQuery } from '@tanstack/react-query';
import { useOrders, useOrder } from '@/hooks/useOrders';
import { VERDICT_CONFIG, getVerdictLabel, NutritionalView } from '@/components/features/cocktail/NutritionalView';
import { CocktailLabelExport } from '@/components/features/cocktail/CocktailLabelExport';
import { buildFruitVisuals } from '@/components/features/cocktail/CocktailBanner';
import {
  downloadVectorFacture,
  downloadVectorNutrition,
  printThermalQrStickers,
  downloadThermalQrPdf,
} from '@/lib/pdf';

import { InvoiceFormatDialog } from '@/components/features/admin/InvoiceFormatDialog';
import {
  PeriodCalendar,
  formatPeriodLabel,
  getPeriodBounds,
  type PeriodType,
} from '@/components/features/orders/PeriodCalendar';
import { BoardPageShell } from '@/components/layout/BoardPageShell';
import { pushHistoryParam, useCloseHistoryParam } from '@/hooks/useHistoryParam';
import { downloadSvgAsPng } from '@/lib/download';
import { useTranslation } from 'react-i18next';
import i18n from '@/i18n';
import { getPricingSettings } from '@/services/settings';

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
    label: i18n.t('orders.pending'),
    icon: Clock,
    bg: 'bg-amber-50 dark:bg-amber-950/30',
    text: 'text-amber-700 dark:text-amber-400',
    border: 'border-amber-200 dark:border-amber-700',
    dot: 'bg-amber-500',
  },
  [OrderStatus.CONFIRMED]: {
    label: i18n.t('orders.confirmed'),
    icon: CheckCircle2,
    bg: 'bg-sky-50 dark:bg-sky-950/30',
    text: 'text-sky-700 dark:text-sky-400',
    border: 'border-sky-200 dark:border-sky-700',
    dot: 'bg-sky-500',
  },
  [OrderStatus.PREPARING]: {
    label: i18n.t('orders.preparing'),
    icon: ChefHat,
    bg: 'bg-violet-50 dark:bg-violet-950/30',
    text: 'text-violet-700 dark:text-violet-400',
    border: 'border-violet-200 dark:border-violet-700',
    dot: 'bg-violet-500',
  },
  [OrderStatus.READY]: {
    label: i18n.t('orders.ready'),
    icon: Package,
    bg: 'bg-primary/8 dark:bg-primary/15',
    text: 'text-primary',
    border: 'border-primary/30',
    dot: 'bg-primary',
  },
  [OrderStatus.DELIVERED]: {
    label: i18n.t('orders.delivered'),
    icon: CheckCircle2,
    bg: 'bg-emerald-50 dark:bg-emerald-950/30',
    text: 'text-emerald-700 dark:text-emerald-400',
    border: 'border-emerald-200 dark:border-emerald-700',
    dot: 'bg-emerald-500',
  },
  [OrderStatus.CANCELLED]: {
    label: i18n.t('orders.canceled'),
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
  return new Date(ts.seconds * 1000).toLocaleString('fr-FR', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
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
  const { t } = useTranslation();
  const isProgram = order.type === 'program';
  const isTasting = isTastingOrder(order);
  const { data: fruits = [] } = useQuery({
    queryKey: ['fruits'],
    queryFn: getFruits,
    staleTime: 5 * 60_000,
  });
  const splittedCocktails = useMemo(() => splitOrderCocktails(order, fruits), [order, fruits]);

  return (
    <div
      onClick={onClick}
      className={`rounded-[2rem] p-5 shadow-sm flex flex-col gap-3 cursor-pointer hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group relative overflow-hidden ${
        isTasting
          ? 'bg-card border-2 border-[#E0982E]/55 dark:border-[#E0982E]/45 bg-gradient-to-br from-[#E0982E]/[0.08] via-card to-[#E0982E]/[0.02] dark:from-[#E0982E]/[0.10]'
          : 'bg-card border border-border/40'
      }`}
    >
      {/* Tasting Golden Top Stripe */}
      {isTasting && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#E0982E] via-amber-400 to-[#E0982E]" />
      )}

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-display font-bold text-foreground truncate">
              {isProgram
                ? (order.programTitleSnapshot || order.cocktailNameSnapshot || 'Cure FYS Programme')
                : order.cocktailNameSnapshot}
            </p>

            {/* DÉGUSTATION PRE-ORDER BADGE */}
            {isTasting && (
              <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-black border bg-[#E0982E]/15 text-[#b27218] dark:text-[#f8be68] border-[#E0982E]/40 shadow-xs uppercase tracking-wide">
                <Sparkles className="size-3 text-[#E0982E] animate-pulse" />
                Précommande Dégustation
              </span>
            )}

            {order.source === 'whatsapp' && (
              <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold border bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border-emerald-500/30">
                <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                WhatsApp
              </span>
            )}
            {isProgram && (
              <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold border bg-primary/10 text-primary border-primary/20">
                <Sparkles className="size-3" /> FYS Programme · {t('orders.program.days', { count: order.programDurationDays || 7 })}
              </span>
            )}
          </div>

          {showCustomer && (
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <p className="text-xs font-semibold text-primary truncate">{order.userNameSnapshot}</p>
              {order.userPhoneSnapshot && (
                <span className="text-[11px] text-muted-foreground font-medium">({order.userPhoneSnapshot})</span>
              )}
            </div>
          )}

          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
            <Clock className="size-3" />
            {formatDate(order.createdAt as unknown as { seconds: number })}
          </p>

          {/* Tasting Event Notice Strip */}
          {isTasting ? (
            <div className="mt-2.5 flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#E0982E]/12 border border-[#E0982E]/30 text-xs font-bold text-[#b27218] dark:text-[#f8be68]">
              <Calendar className="size-3.5 shrink-0 text-[#E0982E]" />
              <span className="truncate">Événement Privé 18 Octobre · Retrait sur place (Yaoundé)</span>
            </div>
          ) : (
            showCustomer && order.deliveryDetails?.district && (
              <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground font-medium">
                <MapPin className="size-3 text-primary shrink-0" />
                <span className="truncate">Livraison : {order.deliveryDetails.district}</span>
              </div>
            )
          )}

          {isProgram ? (
            <div className="flex items-center gap-2 mt-2 flex-wrap text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-muted font-medium text-[11px]">
                {t('orders.program.goal')} : {order.programGoal || t('orders.program.goalDefault')}
              </span>
              {order.startingDate && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-muted font-medium text-[11px]">
                  {t('orders.program.startDate')} : {order.startingDate}
                </span>
              )}
            </div>
          ) : (
            <>
              <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                {order.hasAddedSugar ? (
                  <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold border bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20">
                    <Sparkles className="size-3 text-amber-500" />
                    {t('orders.sugarAddedBadge', 'Avec sucre')}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold border bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20">
                    <Leaf className="size-3 text-emerald-500" />
                    {t('orders.sugarFreeBadge', '100% Naturel · Sans sucre')}
                  </span>
                )}
              </div>
              {(() => {
                if (splittedCocktails.length > 1) {
                  return (
                    <div className="space-y-1.5 mt-2.5 pt-2 border-t border-border/40">
                      {splittedCocktails.map((item) => (
                        <div key={item.id} className="text-[11px] text-muted-foreground flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-foreground">Cocktail {item.index} ({item.name}) :</span>
                          <span className="px-1.5 py-0.5 rounded-md bg-muted text-foreground text-[10px] font-bold border border-border/50">
                            {item.quantity}× {item.bottleSizeLabel}
                          </span>
                          {item.mainFruits.length > 0 && (
                            <span className="text-foreground/85 font-medium inline-flex items-center gap-1">
                              <Apple className="size-3 text-emerald-600 dark:text-emerald-400" />
                              {item.mainFruits.map((m) => m.fruitName).join(', ')}
                            </span>
                          )}
                          {item.supplements.length > 0 && (
                            <span className="text-amber-700 dark:text-amber-400 font-semibold inline-flex items-center gap-1">
                              <Sparkles className="size-3 text-amber-500" />
                              +{item.supplements.map((s) => s.fruitName).join(', ')}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  );
                }
                if (order.cocktailIngredientsSnapshot && order.cocktailIngredientsSnapshot.length > 0) {
                  const { mainFruits, supplements } = partitionCocktailIngredients(order.cocktailIngredientsSnapshot, fruits);
                  return (
                    <div className="flex flex-wrap items-center gap-1.5 text-[11px] mt-2">
                      {mainFruits.length > 0 && (
                        <span className="text-muted-foreground font-medium flex items-center gap-1">
                          <Apple className="size-3 text-emerald-600 dark:text-emerald-400" />
                          {mainFruits.map((m) => m.fruitName).join(', ')}
                        </span>
                      )}
                      {supplements.length > 0 && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 font-semibold text-[10px] border border-amber-500/20">
                          <Sparkles className="size-3 text-amber-500" />
                          + {supplements.map((s) => s.fruitName).join(', ')}
                        </span>
                      )}
                    </div>
                  );
                }
                return null;
              })()}
            </>
          )}
        </div>
        <StatusBadge status={order.status} />
      </div>

      <div className="text-sm text-muted-foreground">
        {isProgram ? (
          <span>
            {order.programJuiceItems && order.programJuiceItems.length > 0 ? (
              <>
                {t('orders.program.cureWithJuices', {
                  total: order.programJuiceItems.reduce((acc, j) => acc + j.quantity, 0),
                  count: order.programJuiceItems.length,
                })}
              </>
            ) : (
              <>{t('orders.program.cureComplete', { count: order.programBottlesTotal || order.quantity })}</>
            )}
          </span>
        ) : splittedCocktails.length > 1 ? (
          <div className="text-xs space-y-1">
            {splittedCocktails.map((item, i) => (
              <span key={item.id}>
                <span className="font-semibold text-foreground">Cocktail {item.index} :</span> {item.quantity}× {item.bottleSizeLabel} ({item.lineTotal.toLocaleString()} XAF)
                {i < splittedCocktails.length - 1 ? ' · ' : ''}
              </span>
            ))}
          </div>
        ) : order.orderLines?.length ? (
          <>
            {order.orderLines.map((line, i) => (
              <span key={i}>
                {t('orders.bottleCount', { count: line.quantity })} · {line.bottleSizeLabel}
                {i < order.orderLines.length - 1 ? ' + ' : ''}
              </span>
            ))}
            {' · '}
            {order.orderLines.map((line, i) => (
              <span key={i}>
                {line.pricePerBottle.toLocaleString()} XAF
                {i < order.orderLines.length - 1 ? ' + ' : ''}
              </span>
            ))}
          </>
        ) : (
          <>
            {t('orders.bottleCount', { count: order.quantity })}
            {order.bottleSizeLabel ? ` · ${order.bottleSizeLabel}` : ''}
            {' · '}
            {isTasting ? (
              <span className="font-semibold text-[#E0982E]">Tarif VIP Dégustation (1 000 XAF)</span>
            ) : (
              `${order.cocktailPriceSnapshot?.toLocaleString() || 0} XAF / u`
            )}
          </>
        )}
      </div>

      <div className="flex items-center justify-between pt-1 border-t border-border/40">
        <p className="font-bold text-foreground tabular-nums">{order.totalPrice.toLocaleString()} XAF</p>
        <span className="text-xs font-bold text-primary flex items-center gap-1 group-hover:gap-2 transition-all">
          {t('orders.details')} <ChevronRight className="size-3.5" />
        </span>
      </div>
    </div>
  );
}

// ── Program Info Block ────────────────────────────────────────────────────────

function ProgramInfoBlock({
  order,
  isAdmin,
}: {
  order: Order;
  isAdmin?: boolean;
}) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const hasJuiceItems = !!(order.programJuiceItems && order.programJuiceItems.length > 0);
  const totalJuicesCount = hasJuiceItems
    ? order.programJuiceItems!.reduce((acc, j) => acc + j.quantity, 0)
    : (order.programBottlesTotal || order.quantity);

  return (
    <div className="space-y-3">
      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
        {t('orders.program.detailsTitle')}
      </p>
      <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 space-y-3.5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary border border-primary/20 mb-1.5">
              <Sparkles className="size-3" /> FYS Programme
            </span>
            <h4 className="font-display font-bold text-base text-foreground">
              {order.programTitleSnapshot || order.cocktailNameSnapshot || 'Cure FYS Programme'}
            </h4>
          </div>
          <div className="text-right shrink-0">
            <span className="text-xs font-bold text-foreground block">
              {t('orders.program.days', { count: order.programDurationDays || 7 })}
            </span>
            <span className="text-[11px] text-muted-foreground block font-medium">
              {t(hasJuiceItems ? 'orders.program.bottlesOrdered' : 'orders.program.bottlesIncluded', { count: totalJuicesCount })}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="p-2.5 rounded-xl bg-background/80 border border-border/40">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase">{t('orders.program.goal')}</p>
            <p className="font-bold text-foreground mt-0.5 capitalize">{order.programGoal || t('orders.program.goalDefault')}</p>
          </div>
          <div className="p-2.5 rounded-xl bg-background/80 border border-border/40">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase">{t('orders.program.startDate')}</p>
            <p className="font-bold text-foreground mt-0.5">{order.startingDate || t('orders.program.startImmediate')}</p>
          </div>
        </div>

        {/* Liste des jus commandés pour ce programme */}
        {hasJuiceItems && (
          <div className="space-y-2 pt-2 border-t border-border/40">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                <ShoppingBag className="size-3.5 text-primary" />
                {t('orders.program.juicesOrdered', { count: order.programJuiceItems!.length })}
              </p>
              <span className="text-[11px] font-bold text-primary">
                {t('orders.program.bottlesTotal', { count: totalJuicesCount })}
              </span>
            </div>
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {order.programJuiceItems!.map((item, idx) => (
                <div
                  key={item.id || idx}
                  className="p-2.5 rounded-xl bg-background/90 border border-border/60 flex items-start justify-between gap-2.5 text-xs shadow-xs"
                >
                  <div className="space-y-0.5 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="px-1.5 py-0.5 rounded-md bg-primary/10 text-primary font-bold text-[10px]">
                        {t('orders.program.dayLabel', { day: item.dayNumber })}
                      </span>
                      <span className="font-bold text-foreground truncate">
                        {item.juiceName}
                      </span>
                      {item.timingLabel && (
                        <span className="text-[10px] text-muted-foreground">
                          · {item.timingLabel}
                        </span>
                      )}
                    </div>
                    {item.fruitNames && item.fruitNames.length > 0 && (
                      <p className="text-[10px] text-muted-foreground truncate">
                        {item.fruitNames.join(', ')}
                      </p>
                    )}
                    {item.orderedAt && (
                      <p className="text-[9px] text-muted-foreground">
                        {t('orders.program.addedOn', { date: new Date(item.orderedAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) })}
                      </p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-bold text-foreground block">
                      {item.totalPrice.toLocaleString()} XAF
                    </span>
                    <span className="text-[10px] text-muted-foreground block">
                      {item.quantity} × {item.pricePerBottle.toLocaleString()} XAF
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {isAdmin ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => navigate('/board/programs-admin')}
            className="w-full text-xs font-bold rounded-xl gap-1.5 border-primary/30 text-primary hover:bg-primary/10 cursor-pointer"
          >
            <Calendar className="size-3.5" />
            {t('orders.program.adminLink')}
          </Button>
        ) : (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => navigate('/board/programs')}
            className="w-full text-xs font-bold rounded-xl gap-1.5 border-primary/30 text-primary hover:bg-primary/10 cursor-pointer"
          >
            <Sparkles className="size-3.5" />
            {t('orders.program.clientLink')}
          </Button>
        )}
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
  hasAddedSugar,
  ingredientsSnapshot,
  orderAnalysisSnapshot,
}: {
  cocktail: Cocktail | null | undefined;
  loading: boolean;
  orderImageUrl?: string;
  orderFruitImages?: string[];
  clientName?: string;
  cocktailNameFallback?: string;
  hasAddedSugar?: boolean;
  ingredientsSnapshot?: CocktailIngredient[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  orderAnalysisSnapshot?: any;
}) {
  const { t } = useTranslation();
  const { data: fruits = [] } = useQuery({
    queryKey: ['fruits'],
    queryFn: getFruits,
    staleTime: 5 * 60_000,
  });

  const effectiveIngredients = useMemo(() => {
    if (ingredientsSnapshot && ingredientsSnapshot.length > 0) {
      return ingredientsSnapshot;
    }
    return cocktail?.ingredients ?? [];
  }, [ingredientsSnapshot, cocktail?.ingredients]);

  const { mainFruits, supplements } = useMemo(
    () => partitionCocktailIngredients(effectiveIngredients, fruits),
    [effectiveIngredients, fruits]
  );

  const fruitVisuals = useMemo(() => {
    if (effectiveIngredients.length) {
      return buildFruitVisuals(effectiveIngredients, fruits, orderFruitImages);
    }
    if (orderFruitImages?.length) {
      return orderFruitImages.map((url) => ({ imageUrl: url || null }));
    }
    return [];
  }, [orderFruitImages, effectiveIngredients, fruits]);

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="h-3 w-20 bg-muted rounded-full animate-pulse" />
        <div className="rounded-2xl bg-muted h-[200px] animate-pulse" />
      </div>
    );
  }
  if (!cocktail && !effectiveIngredients.length && !orderImageUrl && !fruitVisuals.length && !cocktailNameFallback) return null;

  const analysis = cocktail?.aiAnalysis ?? orderAnalysisSnapshot;
  const vcfg = analysis ? VERDICT_CONFIG[analysis.verdict as keyof typeof VERDICT_CONFIG] : null;
  const name = cocktail?.name ?? cocktailNameFallback ?? 'Cocktail';
  const fruitNames = effectiveIngredients.map((i) => i.fruitName);
  const sugarVal = hasAddedSugar !== undefined ? hasAddedSugar : (cocktail?.hasAddedSugar ?? false);

  return (
    <div className="space-y-3">
      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{t('orders.cocktailLabel')}</p>
      <div className="rounded-2xl border border-border/60 bg-card overflow-hidden">
        <CocktailLabelExport
            cocktailName={name}
            clientName={clientName}
            imageUrl={fruitVisuals.length ? undefined : (orderImageUrl ?? cocktail?.imageUrl)}
            fruits={fruitVisuals}
            fruitNames={fruitNames}
            badge={
              <div className="flex flex-col items-end gap-1.5">
                {sugarVal ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold shadow-md bg-amber-500 text-white border border-amber-400">
                    <Sparkles className="size-3" /> {t('orders.sugarAddedBadge', 'Avec sucre')}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold shadow-md bg-emerald-600 text-white border border-emerald-500">
                    <Leaf className="size-3" /> {t('orders.sugarFreeBadge', 'Sans sucre')}
                  </span>
                )}
                {vcfg && (
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold shadow-sm ${vcfg.chip}`}>
                    {vcfg.emoji} {getVerdictLabel(analysis!.verdict, t)}
                  </span>
                )}
              </div>
            }
          />

        {(cocktail || effectiveIngredients.length > 0) && (
          <div className="px-4 py-3.5 space-y-3">
            {cocktail?.description && (
              <p className="text-[13px] text-muted-foreground leading-relaxed">{cocktail.description}</p>
            )}

            {/* Formulation cuisine / atelier */}
            <div className="p-3 rounded-xl border flex items-center justify-between gap-2 bg-muted/40">
              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                {t('lab.sugarOption.title', 'Formulation')}
              </span>
              {sugarVal ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30">
                  <Sparkles className="size-3 text-amber-500" /> {t('orders.sugarAddedBadge', 'Avec sucre ajouté')}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
                  <Leaf className="size-3 text-emerald-500" /> {t('orders.sugarFreeBadge', '100% Naturel · Sans sucre')}
                </span>
              )}
            </div>

            {/* Ingrédients : distinction nette Fruits de base vs Suppléments */}
            {effectiveIngredients.length > 0 && (
              <div className="space-y-3 pt-1">
                {/* Fruits de base */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <Apple className="size-3.5 text-emerald-600 dark:text-emerald-400" /> {t('orders.mainFruits', 'Fruits de base')}
                      <span className="text-[10px] font-semibold opacity-75">({mainFruits.length})</span>
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {mainFruits.map((ing) => (
                      <span
                        key={ing.fruitId}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-500/10 text-emerald-900 dark:text-emerald-300 border border-emerald-500/25 text-[12px] font-semibold"
                      >
                        <span className="size-1.5 rounded-full bg-emerald-500" />
                        {ing.fruitName}
                        {ing.quantityGrams ? (
                          <span className="text-[10px] font-mono opacity-75 font-normal">({ing.quantityGrams}g)</span>
                        ) : null}
                      </span>
                    ))}
                    {mainFruits.length === 0 && (
                      <span className="text-xs text-muted-foreground italic">—</span>
                    )}
                  </div>
                </div>

                {/* Suppléments & Boosters */}
                {supplements.length > 0 && (
                  <div className="pt-2.5 border-t border-border/40">
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="text-[10px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                        <Sparkles className="size-3.5 text-amber-500" /> {t('orders.supplements', 'Suppléments & Boosters')}
                        <span className="text-[10px] font-semibold opacity-75">({supplements.length})</span>
                      </p>
                      <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30">
                        {t('orders.supplementBadge', 'Supplément')}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {supplements.map((ing) => (
                        <span
                          key={ing.fruitId}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-500/15 text-amber-900 dark:text-amber-200 border border-amber-500/35 text-[12px] font-semibold shadow-xs"
                        >
                          <span className="size-1.5 rounded-full bg-amber-500 animate-pulse" />
                          {ing.fruitName}
                          {ing.quantityGrams ? (
                            <span className="text-[10px] font-mono opacity-80 font-bold">({ing.quantityGrams}g)</span>
                          ) : null}
                          <span className="text-[9px] uppercase tracking-wider font-extrabold bg-amber-500/20 px-1 py-0.2 rounded text-amber-800 dark:text-amber-300">
                            {t('orders.supplementBadge', 'Supplément')}
                          </span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {analysis && vcfg && (
              <div className={`flex items-center justify-between px-3 py-2.5 rounded-xl border ${vcfg.bg} ${vcfg.border}`}>
                <span className={`text-[12px] font-bold ${vcfg.text}`}>
                  {vcfg.emoji} NutriFYS — {getVerdictLabel(analysis!.verdict, t)}
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
  const { t } = useTranslation();
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

  const { data: fruits = [] } = useQuery({
    queryKey: ['fruits'],
    queryFn: getFruits,
    staleTime: 5 * 60_000,
  });

  const { data: publicCocktails = [] } = useQuery({
    queryKey: ['public-cocktails'],
    queryFn: getPublicCocktails,
    staleTime: 5 * 60_000,
  });

  const splittedCocktails = useMemo(
    () => splitOrderCocktails(order, fruits, publicCocktails),
    [order, fruits, publicCocktails]
  );

  const { data: pricing } = useQuery({
    queryKey: ['pricing-settings'],
    queryFn: getPricingSettings,
  });

  const isNoticeActive = pricing ? pricing.launchNoticeActive !== false : true;
  const launchNoticeContent = (i18n.language.startsWith('en') ? pricing?.launchNoticeTextEn : pricing?.launchNoticeText)
    || pricing?.launchNoticeText
    || t('orders.launchDeliveryNotice');

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
          <SheetTitle className="font-display text-xl font-bold">{order.programTitleSnapshot || order.cocktailNameSnapshot}</SheetTitle>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <p className="text-[13px] text-muted-foreground">
              {t('orders.orderFrom', { date: formatDate(order.createdAt as unknown as { seconds: number }) })}
            </p>
            {order.type === 'program' ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border bg-primary/10 text-primary border-primary/20">
                <Sparkles className="size-3" /> FYS Programme · {t('orders.program.days', { count: order.programDurationDays || 7 })}
              </span>
            ) : order.hasAddedSugar ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20">
                <Sparkles className="size-3 text-amber-500" /> {t('orders.sugarAddedBadge', 'Avec sucre')}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20">
                <Leaf className="size-3 text-emerald-500" /> {t('orders.sugarFreeBadge', '100% Naturel · Sans sucre')}
              </span>
            )}
            {order.aiAnalysisSnapshot && (
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${VERDICT_CONFIG[order.aiAnalysisSnapshot.verdict].chip}`}>
                {VERDICT_CONFIG[order.aiAnalysisSnapshot.verdict].emoji} {getVerdictLabel(order.aiAnalysisSnapshot.verdict, t)}
              </span>
            )}
            {isTastingOrder(order) && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black border bg-[#E0982E]/15 text-[#b27218] dark:text-[#f8be68] border-[#E0982E]/40 uppercase tracking-wide">
                <Sparkles className="size-3 text-[#E0982E]" />
                Précommande Dégustation
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
                {t('orders.details')}
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
                {t('orders.nutrifysSheet')}
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
                   const ingList = order.cocktailIngredientsSnapshot || cocktail?.ingredients || [];
                   const ingStr = formatIngredientsSummary(ingList, fruits, { format: 'inline' });
                   await downloadVectorNutrition(order.aiAnalysisSnapshot!, order.cocktailNameSnapshot, order.userNameSnapshot, ingStr);
                   setDownloadingNutrition(false);
                }}
              >
                {downloadingNutrition ? (
                  <><Loader2 className="size-4 animate-spin" /> {t('common.generating')}</>
                ) : (
                  <><Download className="size-4" /> {t('orders.downloadPDF')}</>
                )}
              </Button>
            </div>
          </div>
        ) : (
        <div className="flex-1 overflow-y-auto flex flex-col">
          <div id={`pdf-facture-${order.id}`} className="px-6 py-6 pb-8 space-y-7 bg-background shrink-0">

          {/* Cocktail or Program info */}
          {order.type === 'program' ? (
            <ProgramInfoBlock order={order} isAdmin={false} />
          ) : (
            <CocktailInfoBlock
              cocktail={cocktail}
              loading={cocktailLoading}
              orderImageUrl={order.cocktailImageSnapshot}
              orderFruitImages={order.ingredientImageSnapshots}
              clientName={order.userNameSnapshot}
              cocktailNameFallback={order.cocktailNameSnapshot}
              hasAddedSugar={order.hasAddedSugar}
              ingredientsSnapshot={order.cocktailIngredientsSnapshot}
              orderAnalysisSnapshot={order.aiAnalysisSnapshot}
            />
          )}

          {/* Status actuel */}
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{t('orders.currentStatus')}</p>
            <StatusBadge status={order.status} size="lg" />
          </div>

          {/* Timeline */}
          {!isCancelled && (
            <div className="space-y-3">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{t('orders.progress')}</p>
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
                            <p className="text-[11px] text-muted-foreground mt-0.5">{t('orders.currentStep')}</p>
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
                {t('orders.cancelledNotice')}
              </p>
            </div>
          )}

          {/* Informations de Livraison */}
          {order.deliveryDetails && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{t('orders.deliveryAddress')}</p>
                {isNoticeActive && (
                  <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-400 flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/20 px-2.5 py-0.5 rounded-full">
                    <Clock className="size-3" />
                    {t('orders.deliveryDelayBadge')}
                  </span>
                )}
              </div>
              <div className="rounded-2xl border border-border/60 bg-card p-4 space-y-3">
                {isNoticeActive && !isCancelled && order.status !== OrderStatus.DELIVERED && (
                  <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 p-3 flex items-start gap-2.5 text-xs text-amber-900 dark:text-amber-200 animate-pop-in-cute">
                    <Clock className="size-3.5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    <span>{launchNoticeContent}</span>
                  </div>
                )}
                <div className="flex gap-3">
                  <MapPin className="size-4 text-primary shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[13px] font-bold text-foreground">{t('orders.district')}</p>
                    <p className="text-[12px] text-muted-foreground">{order.deliveryDetails.district}</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <Phone className="size-4 text-primary shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[13px] font-bold text-foreground">{t('orders.phoneDelivery')}</p>
                    <p className="text-[12px] text-muted-foreground">{order.deliveryDetails.phone}</p>
                  </div>
                </div>
                {order.deliveryDetails.instructions && (
                  <div className="flex gap-3">
                    <MessageSquare className="size-4 text-primary shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[13px] font-bold text-foreground">{t('orders.instructionsLabel')}</p>
                      <p className="text-[12px] text-muted-foreground">{order.deliveryDetails.instructions}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Résumé commande */}
          <div className="space-y-3">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{t('orders.summary')}</p>
            <div className="rounded-2xl border border-border/60 bg-card divide-y divide-border/40 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-[13px] text-muted-foreground">{order.type === 'program' ? t('orders.summary.programme') : t('orders.summary.cocktail')}</span>
                <span className="text-[13px] font-semibold text-foreground">{order.programTitleSnapshot || order.cocktailNameSnapshot}</span>
              </div>
              {order.type === 'program' ? (
                <>
                  <div className="flex items-center justify-between px-4 py-3">
                    <span className="text-[13px] text-muted-foreground">{t('orders.summary.orderType')}</span>
                    <span className="text-[13px] font-semibold text-primary">
                      {order.programJuiceItems?.length
                        ? t('orders.summary.cureJuiceOrders', { count: order.programJuiceItems.length })
                        : t('orders.summary.cureFullPack', { days: order.programDurationDays || 7 })}
                    </span>
                  </div>
                  {order.programJuiceItems && order.programJuiceItems.length > 0 ? (
                    <>
                      <div className="px-4 py-2 bg-muted/30 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                        {t('orders.summary.bottlesDetail')}
                      </div>
                      {order.programJuiceItems.map((j, idx) => (
                        <div key={j.id || idx} className="flex items-center justify-between px-4 py-3">
                          <div className="text-left space-y-0.5">
                            <p className="text-[13px] font-semibold text-foreground">
                              {t('orders.program.dayLabel', { day: j.dayNumber })} : {j.juiceName}
                            </p>
                            <p className="text-[11px] text-muted-foreground">
                              {j.quantity} × {j.pricePerBottle.toLocaleString()} XAF ({j.bottleSize || '500ml'}) {j.timingLabel ? `· ${j.timingLabel}` : ''}
                            </p>
                          </div>
                          <span className="text-[13px] font-semibold text-foreground">
                            {j.totalPrice.toLocaleString()} XAF
                          </span>
                        </div>
                      ))}
                    </>
                  ) : (
                    <div className="flex items-center justify-between px-4 py-3">
                      <span className="text-[13px] text-muted-foreground">{t('orders.summary.curePack')}</span>
                      <span className="text-[13px] font-semibold text-primary">{t('orders.summary.curePackDetail', { days: order.programDurationDays || 7, count: order.programBottlesTotal || order.quantity })}</span>
                    </div>
                  )}
                  {order.startingDate && (
                    <div className="flex items-center justify-between px-4 py-3">
                      <span className="text-[13px] text-muted-foreground">{t('orders.summary.startDate')}</span>
                      <span className="text-[13px] font-semibold text-foreground">{order.startingDate}</span>
                    </div>
                  )}
                </>
              ) : splittedCocktails.length > 1 ? (
                <>
                  <div className="px-4 py-2 bg-muted/30 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                    Détail des cocktails commandés ({splittedCocktails.length})
                  </div>
                  {splittedCocktails.map((c) => (
                    <div key={c.id} className="p-4 space-y-2 bg-card/60">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-primary">
                          Cocktail {c.index} : {c.name}
                        </span>
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-muted border border-border">
                          {c.quantity}× {c.bottleSizeLabel}
                        </span>
                      </div>
                      {c.mainFruits.length > 0 && (
                        <p className="text-[12px] text-foreground font-medium flex items-start gap-1.5">
                          <span className="text-muted-foreground shrink-0 inline-flex items-center gap-1">
                            <Apple className="size-3 text-emerald-600 dark:text-emerald-400" /> Fruits :
                          </span>
                          <span>{c.mainFruits.map((m) => `${m.fruitName}${m.quantityGrams ? ` (${m.quantityGrams}g)` : ''}`).join(', ')}</span>
                        </p>
                      )}
                      {c.supplements.length > 0 && (
                        <p className="text-[12px] text-amber-700 dark:text-amber-400 font-medium flex items-start gap-1.5">
                          <span className="font-semibold shrink-0 inline-flex items-center gap-1">
                            <Sparkles className="size-3 text-amber-500" /> Suppléments :
                          </span>
                          <span>{c.supplements.map((s) => `${s.fruitName}${s.quantityGrams ? ` (${s.quantityGrams}g)` : ''}`).join(', ')}</span>
                        </p>
                      )}
                      <div className="flex items-center justify-between text-xs pt-1 border-t border-border/30">
                        <span className="text-muted-foreground">
                          {c.quantity} × {c.pricePerBottle.toLocaleString()} XAF
                        </span>
                        <span className="font-bold text-foreground">
                          {c.lineTotal.toLocaleString()} XAF
                        </span>
                      </div>
                    </div>
                  ))}
                </>
              ) : (
                <>
                  {(() => {
                    const ings = order.cocktailIngredientsSnapshot || cocktail?.ingredients || [];
                    if (!ings.length) return null;
                    const { mainFruits, supplements } = partitionCocktailIngredients(ings, fruits);
                    return (
                      <div className="px-4 py-3 space-y-1.5 bg-muted/20">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                          {t('orders.ingredients', 'Composition')}
                        </span>
                        {mainFruits.length > 0 && (
                          <p className="text-[12px] text-foreground font-medium flex items-start gap-1.5">
                            <span className="text-muted-foreground shrink-0 inline-flex items-center gap-1">
                              <Apple className="size-3 text-emerald-600 dark:text-emerald-400" /> {t('orders.mainFruits', 'Fruits')} :
                            </span>
                            <span>{mainFruits.map((m) => `${m.fruitName}${m.quantityGrams ? ` (${m.quantityGrams}g)` : ''}`).join(', ')}</span>
                          </p>
                        )}
                        {supplements.length > 0 && (
                          <p className="text-[12px] text-amber-700 dark:text-amber-400 font-medium flex items-start gap-1.5">
                            <span className="font-semibold shrink-0 inline-flex items-center gap-1">
                              <Sparkles className="size-3 text-amber-500" /> {t('orders.supplements', 'Suppléments')} :
                            </span>
                            <span>{supplements.map((s) => `${s.fruitName}${s.quantityGrams ? ` (${s.quantityGrams}g)` : ''}`).join(', ')}</span>
                          </p>
                        )}
                      </div>
                    );
                  })()}
                  {order.orderLines?.length ? (
                    <>
                      <div className="flex items-center justify-between px-4 py-3">
                        <span className="text-[13px] text-muted-foreground">{t('orders.quantity')}</span>
                        <div className="text-right space-y-1">
                          {order.orderLines.map((line, i) => (
                            <p key={i} className="text-[13px] font-semibold text-foreground">
                              {t('orders.bottleCount', { count: line.quantity })} · {line.bottleSizeLabel}
                            </p>
                          ))}
                        </div>
                      </div>
                      {order.orderLines.map((line, i) => (
                        <div key={i} className="flex items-center justify-between px-4 py-3">
                          <span className="text-[13px] text-muted-foreground">
                            {line.quantity} × {line.pricePerBottle.toLocaleString()} XAF ({line.bottleSizeLabel})
                          </span>
                          <span className="text-[13px] font-semibold text-foreground">
                            {line.lineTotal.toLocaleString()} XAF
                          </span>
                        </div>
                      ))}
                    </>
                  ) : (
                    <>
                      <div className="flex items-center justify-between px-4 py-3">
                        <span className="text-[13px] text-muted-foreground">{t('orders.quantity')}</span>
                        <span className="text-[13px] font-semibold text-foreground">
                          {t('orders.bottleCount', { count: order.quantity })}
                          {order.bottleSizeLabel ? ` · ${order.bottleSizeLabel}` : ''}
                        </span>
                      </div>
                      <div className="flex items-center justify-between px-4 py-3">
                        <span className="text-[13px] text-muted-foreground">
                          {order.quantity} × {order.cocktailPriceSnapshot?.toLocaleString() || 0} XAF
                        </span>
                        <span className="text-[13px] font-semibold text-foreground">
                          {((order.cocktailPriceSnapshot || 0) * (order.quantity || 0)).toLocaleString()} XAF
                        </span>
                      </div>
                    </>
                  )}
                </>
              )}
              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-[13px] text-muted-foreground flex items-center gap-1.5">
                  <Truck className="size-3.5" /> {t('orders.delivery')}
                </span>
                <span className="text-[13px] font-semibold text-foreground">
                  {order.deliveryFee.toLocaleString()} XAF
                </span>
              </div>
              {!!order.discountAmount && order.discountAmount > 0 && (
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="text-[13px] font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                    <Sparkles className="size-3.5" /> Réduction appliquée {order.promoCodeApplied ? `(${order.promoCodeApplied})` : ''}
                  </span>
                  <span className="text-[13px] font-bold text-amber-600 dark:text-amber-400">
                    -{order.discountAmount.toLocaleString()} XAF
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between px-4 py-4 bg-primary/5">
                <span className="text-[14px] font-bold text-foreground">{t('orders.total')}</span>
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
                const ingList = order.cocktailIngredientsSnapshot || cocktail?.ingredients || [];
                const ingStr = formatIngredientsSummary(ingList, fruits, { format: 'separated' });
                await downloadVectorFacture(order, ingStr);
                setDownloadingFacture(false);
              }}
            >
              {downloadingFacture ? (
                <><Loader2 className="size-4 animate-spin px-0 mx-0 text-primary" /> {t('common.generating')}</>
              ) : (
                <><Download className="size-4 text-primary" /> {t('orders.downloadInvoice')}</>
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
              {cancelling ? <><Loader2 className="size-4 animate-spin" /> {t('orders.cancelling')}</> : <><XCircle className="size-4" /> {t('orders.cancel')}</>}
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
  onDelete,
}: {
  order: Order | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onStatusChange: (orderId: string, status: OrderStatus) => Promise<void>;
  onCancel: (orderId: string) => Promise<void>;
  onDelete: (orderId: string) => Promise<void>;
}) {
  const { t } = useTranslation();
  const [updating, setUpdating] = useState<OrderStatus | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [activeTab, setActiveTab] = useState<'order' | 'nutrition'>('order');
  const [downloadingNutrition, setDownloadingNutrition] = useState(false);
  const [showInvoiceFormatModal, setShowInvoiceFormatModal] = useState(false);
  const [origin, setOrigin] = useState('');
  const [qrStickerCount, setQrStickerCount] = useState<number>(1);
  const [downloadingQrPdf, setDownloadingQrPdf] = useState(false);

  useEffect(() => {
    setOrigin(window.location.origin);
    if (open) setActiveTab('order');
  }, [open]);

  useEffect(() => {
    if (order) {
      const count = order.orderLines?.length
        ? order.orderLines.reduce((sum, line) => sum + line.quantity, 0)
        : (order.quantity || 1);
      setQrStickerCount(count);
    }
  }, [order?.id, order?.orderLines, order?.quantity]);

  const { data: cocktail } = useQuery({
    queryKey: ['cocktail', order?.cocktailId],
    queryFn: () => getCocktailById(order!.cocktailId),
    enabled: !!order,
    staleTime: 5 * 60_000,
  });

  const { data: fruits = [] } = useQuery({
    queryKey: ['fruits'],
    queryFn: getFruits,
    staleTime: 5 * 60_000,
  });

  const { data: publicCocktails = [] } = useQuery({
    queryKey: ['public-cocktails'],
    queryFn: getPublicCocktails,
    staleTime: 5 * 60_000,
  });

  const splittedCocktails = useMemo(
    () => splitOrderCocktails(order, fruits, publicCocktails),
    [order, fruits, publicCocktails]
  );

  if (!order) return null;

  const totalBottles = order.orderLines?.length
    ? order.orderLines.reduce((sum, line) => sum + line.quantity, 0)
    : (order.quantity || 1);

  const bottleSummary = order.orderLines?.length
    ? order.orderLines.map((l) => `${l.quantity}× ${l.bottleSizeLabel || 'bouteille'}`).join(' · ')
    : `${order.quantity || 1}× ${order.bottleSizeLabel || 'bouteille'}`;

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

  async function handleDelete() {
    setDeleting(true);
    try {
      await onDelete(order!.id);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="w-[96vw] max-w-6xl max-h-[92vh] h-[92vh] p-0 flex flex-col overflow-hidden rounded-2xl md:rounded-3xl bg-background border border-border/80 shadow-2xl"
        showAfricanPattern={false}
      >
        {/* En-tête fixe de la modale */}
        <div className="px-6 py-5 border-b border-border/50 shrink-0 bg-card/70 backdrop-blur-sm">
          <div className="flex items-start justify-between gap-4 pr-8">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2.5 flex-wrap">
                {order.orderCode && (
                  <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-lg bg-primary/10 text-primary border border-primary/20">
                    #{order.orderCode}
                  </span>
                )}
                <h2 className="font-display text-xl md:text-2xl font-bold text-foreground truncate">
                  {order.programTitleSnapshot || order.cocktailNameSnapshot}
                </h2>
                <StatusBadge status={order.status} size="lg" />
                {order.source === 'whatsapp' && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30">
                    <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                    WhatsApp
                  </span>
                )}
                {isTastingOrder(order) && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black border bg-[#E0982E]/15 text-[#b27218] dark:text-[#f8be68] border-[#E0982E]/40 uppercase tracking-wide">
                    <Sparkles className="size-3 text-[#E0982E]" />
                    Précommande Dégustation
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3 mt-2 flex-wrap text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Clock className="size-3.5 text-muted-foreground" />
                  {formatDate(order.createdAt as unknown as { seconds: number })}
                </span>
                <span>·</span>
                <span className="font-bold text-foreground flex items-center gap-1.5">
                  <User className="size-3.5 text-primary" />
                  {order.userNameSnapshot}
                </span>
                {order.userPhoneSnapshot && (
                  <>
                    <span>·</span>
                    <a href={`tel:${order.userPhoneSnapshot}`} className="flex items-center gap-1.5 text-primary hover:underline font-mono font-semibold">
                      <Phone className="size-3.5" />
                      {order.userPhoneSnapshot}
                    </a>
                  </>
                )}
                <span>·</span>
                {order.hasAddedSugar ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                    <Sparkles className="size-3 text-amber-500" />
                    Avec sucre
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                    <Leaf className="size-3 text-emerald-500" />
                    100% Naturel · Sans sucre
                  </span>
                )}
                <span>·</span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-muted text-foreground border border-border">
                  <Package className="size-3.5 text-muted-foreground" />
                  {bottleSummary} ({totalBottles} bouteille{totalBottles > 1 ? 's' : ''})
                </span>
              </div>
            </div>

            <div className="text-right shrink-0 hidden sm:block">
              <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground block">
                Montant Total
              </span>
              <p className="text-xl md:text-2xl font-black text-primary font-mono tabular-nums">
                {order.totalPrice.toLocaleString()} XAF
              </p>
            </div>
          </div>

          {order.aiAnalysisSnapshot && (
            <div className="flex gap-2 bg-muted/80 rounded-xl p-1 mt-3 max-w-xs">
              <button
                type="button"
                onClick={() => setActiveTab('order')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === 'order'
                    ? 'bg-background shadow-xs text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Package className="size-3.5" />
                {t('orders.details', 'Détails')}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('nutrition')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === 'nutrition'
                    ? 'bg-background shadow-xs text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Sparkles className="size-3.5" />
                {t('orders.nutrifysSheet', 'Fiche NutriFYS')}
              </button>
            </div>
          )}
        </div>

        {/* Corps défilable de la modale */}
        {activeTab === 'nutrition' && order.aiAnalysisSnapshot ? (
          <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
            <div id={`pdf-nutrition-${order.id}`} className="p-6 bg-card rounded-2xl border border-border/60">
              <NutritionalView analysis={order.aiAnalysisSnapshot} />
            </div>
            <div className="flex justify-end">
              <Button
                variant="outline"
                className="h-11 px-6 rounded-xl font-bold gap-2 disabled:opacity-50"
                disabled={downloadingNutrition}
                onClick={async () => {
                  setDownloadingNutrition(true);
                  const ingList = order.cocktailIngredientsSnapshot || cocktail?.ingredients || [];
                  const ingStr = formatIngredientsSummary(ingList, fruits, { format: 'inline' });
                  await downloadVectorNutrition(order.aiAnalysisSnapshot!, order.cocktailNameSnapshot, order.userNameSnapshot, ingStr);
                  setDownloadingNutrition(false);
                }}
              >
                {downloadingNutrition ? (
                  <><Loader2 className="size-4 animate-spin" /> {t('common.generating')}</>
                ) : (
                  <><Download className="size-4" /> {t('orders.downloadPDF')}</>
                )}
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-6 md:p-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              
              {/* ── COLONNE GAUCHE (7/12) : BOISSONS SCINDÉES & DÉCOMPTE FINANCIER ── */}
              <div className="lg:col-span-7 space-y-6">
                
                {/* 1. En-tête de section boissons */}
                <div className="flex items-center justify-between pb-3 border-b border-border/50">
                  <div className="flex items-center gap-2.5">
                    <div className="size-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold">
                      <ChefHat className="size-4" />
                    </div>
                    <div>
                      <h3 className="font-display font-bold text-base md:text-lg text-foreground">
                        Boissons commandées
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        Détail précis de chaque boisson, fruits et suppléments
                      </p>
                    </div>
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-primary/10 text-primary border border-primary/25">
                    {splittedCocktails.length} boisson{splittedCocktails.length > 1 ? 's' : ''} scindée{splittedCocktails.length > 1 ? 's' : ''}
                  </span>
                </div>

                {/* Callout si précommande dégustation */}
                {isTastingOrder(order) && (
                  <div className="p-4 rounded-2xl bg-[#E0982E]/15 border-2 border-[#E0982E]/40 text-[#b27218] dark:text-[#f8be68] space-y-2 shadow-xs">
                    <div className="flex items-center gap-2 font-black text-sm uppercase tracking-wide">
                      <Sparkles className="size-4 text-[#E0982E] animate-pulse" />
                      <span>Précommande Dégustation Privée (18 Octobre)</span>
                    </div>
                    <p className="text-xs text-foreground/85 leading-relaxed font-medium flex items-start gap-2">
                      <AlertTriangle className="size-4 text-[#E0982E] shrink-0 mt-0.5" />
                      <span>
                        <b>Retrait sur place uniquement :</b> Cette commande est réservée pour l'événement dégustation privée du <b>Dimanche 18 Octobre 2026</b> à Yaoundé. Ne pas expédier par coursier classique à domicile.
                      </span>
                    </p>
                  </div>
                )}

                {/* Si commande Cure FYS Programme */}
                {order.type === 'program' ? (
                  <ProgramInfoBlock order={order} isAdmin={true} />
                ) : (
                  /* Affichage scindé de CHAQUE cocktail individuel */
                  <div className="space-y-4">
                    {splittedCocktails.map((item) => (
                      <div
                        key={item.id}
                        className="rounded-2xl border border-border/80 bg-card p-5 space-y-4 shadow-xs hover:border-primary/50 transition-all relative overflow-hidden"
                      >
                        {/* Barre supérieure du cocktail */}
                        <div className="flex items-start justify-between gap-3 flex-wrap">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-primary/15 text-primary font-bold text-xs uppercase tracking-wide border border-primary/25">
                                Cocktail #{item.index}
                              </span>
                              {item.isCatalog && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-muted text-muted-foreground border">
                                  Catalogue FYS
                                </span>
                              )}
                              {item.hasAddedSugar ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                                  <Sparkles className="size-3 text-amber-500" />
                                  Avec sucre
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                                  <Leaf className="size-3 text-emerald-500" />
                                  Sans sucre
                                </span>
                              )}
                            </div>
                            <h4 className="font-display text-base md:text-lg font-bold text-foreground">
                              {item.name}
                            </h4>
                          </div>

                          <div className="text-right shrink-0">
                            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-muted font-bold text-xs text-foreground border border-border/60">
                              <Package className="size-3.5 text-muted-foreground" />
                              {item.quantity} bouteille{item.quantity > 1 ? 's' : ''} · {item.bottleSizeLabel}
                            </div>
                            <p className="text-xs font-bold text-primary mt-1 tabular-nums font-mono">
                              {item.quantity} × {item.pricePerBottle.toLocaleString()} = {item.lineTotal.toLocaleString()} XAF
                            </p>
                          </div>
                        </div>

                        {/* Fruits de base scindés */}
                        <div className="space-y-1.5 pt-2 border-t border-border/40">
                          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                            <Apple className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                            Fruits de base ({item.mainFruits.length})
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {item.mainFruits.length > 0 ? (
                              item.mainFruits.map((ing) => (
                                <span
                                  key={ing.fruitId}
                                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-500/10 text-emerald-900 dark:text-emerald-300 border border-emerald-500/30 text-xs font-semibold shadow-2xs"
                                >
                                  <span className="size-1.5 rounded-full bg-emerald-500" />
                                  {ing.fruitName}
                                  {ing.quantityGrams ? (
                                    <span className="text-[10px] font-mono opacity-80">({ing.quantityGrams}g)</span>
                                  ) : null}
                                </span>
                              ))
                            ) : (
                              <span className="text-xs text-muted-foreground italic">
                                Fruits de la recette signature FYS
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Suppléments & Boosters scindés */}
                        <div className="space-y-1.5 pt-2 border-t border-border/40">
                          <div className="flex items-center justify-between">
                            <p className="text-[11px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                              <Sparkles className="size-3.5 text-amber-500" />
                              Suppléments & Boosters ({item.supplements.length})
                            </p>
                            {item.supplements.length > 0 && (
                              <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/30">
                                Supplément
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {item.supplements.length > 0 ? (
                              item.supplements.map((ing) => (
                                <span
                                  key={ing.fruitId}
                                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-500/15 text-amber-900 dark:text-amber-200 border border-amber-500/40 text-xs font-semibold shadow-2xs"
                                >
                                  <span className="size-1.5 rounded-full bg-amber-500 animate-pulse" />
                                  {ing.fruitName}
                                  {ing.quantityGrams ? (
                                    <span className="text-[10px] font-mono opacity-80">({ing.quantityGrams}g)</span>
                                  ) : null}
                                </span>
                              ))
                            ) : (
                              <span className="text-xs text-muted-foreground flex items-center gap-1.5 italic">
                                <Check className="size-3 text-muted-foreground" />
                                Aucun supplément (100% pur fruits)
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* 2. Récapitulatif financier scindé par cocktail (dans la colonne gauche, sous les boissons) */}
                <div className="rounded-2xl border border-border/80 bg-card p-5 space-y-4 shadow-xs">
                  <div className="flex items-center justify-between pb-2 border-b border-border/40">
                    <span className="font-display font-bold text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <Receipt className="size-4 text-primary" />
                      Décompte financier
                    </span>
                    <span className="text-xs text-muted-foreground font-semibold">
                      {totalBottles} bouteille{totalBottles > 1 ? 's' : ''} au total
                    </span>
                  </div>

                  <div className="space-y-2.5">
                    {splittedCocktails.map((item) => (
                      <div key={item.id} className="flex items-start justify-between gap-2 text-xs sm:text-sm">
                        <div className="min-w-0">
                          <p className="font-semibold text-foreground truncate" title={item.name}>
                            Cocktail {item.index} : {item.name}
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            {item.quantity} × {item.pricePerBottle.toLocaleString()} XAF ({item.bottleSizeLabel})
                          </p>
                        </div>
                        <span className="font-bold text-foreground shrink-0 tabular-nums font-mono">
                          {item.lineTotal.toLocaleString()} XAF
                        </span>
                      </div>
                    ))}

                    <div className="flex items-center justify-between text-xs sm:text-sm pt-2.5 border-t border-border/40">
                      <span className="text-muted-foreground font-medium flex items-center gap-1.5">
                        <Truck className="size-3.5 text-muted-foreground" />
                        Frais de livraison (Yaoundé)
                      </span>
                      <span className="font-semibold text-foreground tabular-nums font-mono">
                        {order.deliveryFee.toLocaleString()} XAF
                      </span>
                    </div>

                    {!!order.discountAmount && order.discountAmount > 0 && (
                      <div className="flex items-center justify-between text-xs sm:text-sm text-amber-600 dark:text-amber-400 font-bold">
                        <span>Remise appliquée {order.promoCodeApplied ? `(${order.promoCodeApplied})` : ''}</span>
                        <span className="tabular-nums font-mono">-{order.discountAmount.toLocaleString()} XAF</span>
                      </div>
                    )}

                    <div className="flex items-center justify-between p-3.5 rounded-xl bg-primary/10 border border-primary/25 mt-2">
                      <span className="font-bold text-foreground text-sm uppercase tracking-wide">
                        TOTAL À PAYER
                      </span>
                      <span className="font-extrabold text-primary text-xl tabular-nums font-mono">
                        {order.totalPrice.toLocaleString()} XAF
                      </span>
                    </div>
                  </div>
                </div>

              </div>

              {/* ── COLONNE DROITE (5/12) : GESTION, CLIENT & LOGISTIQUE ── */}
              <div className="lg:col-span-5 space-y-6">
                
                {/* 1. Faire avancer la commande (Opérations prioritaires) */}
                {!isCancelled && !isDelivered && (
                  <div className="rounded-2xl border border-border/80 bg-card p-5 space-y-3.5 shadow-xs">
                    <div className="flex items-center justify-between">
                      <p className="font-display font-bold text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                        <TrendingUp className="size-4 text-primary" />
                        Faire avancer la commande
                      </p>
                      {(order.userPhoneSnapshot || order.deliveryDetails?.phone) && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/25">
                          <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          WhatsApp
                        </span>
                      )}
                    </div>
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
                            className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all active:scale-98 disabled:opacity-50 ${cfg.bg} ${cfg.border} hover:opacity-90 cursor-pointer`}
                          >
                            {isLoading ? <Loader2 className="size-4 animate-spin shrink-0" /> : <Icon className={`size-4 shrink-0 ${cfg.text}`} />}
                            <span className={`text-xs sm:text-sm font-bold ${cfg.text}`}>
                              {t('orders.goToStatus', { label: cfg.label })}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 2. Client & Livraison */}
                <div className="rounded-2xl border border-border/80 bg-card p-5 space-y-3.5 shadow-xs">
                  <p className="font-display font-bold text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <MapPin className="size-4 text-primary" />
                    Destinataire & Livraison
                  </p>
                  <div className="space-y-2.5 text-xs sm:text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground flex items-center gap-1.5">
                        <User className="size-3.5 text-muted-foreground" />
                        Client :
                      </span>
                      <span className="font-bold text-foreground">{order.userNameSnapshot}</span>
                    </div>
                    {order.userPhoneSnapshot && (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground flex items-center gap-1.5">
                          <Phone className="size-3.5 text-muted-foreground" />
                          Téléphone :
                        </span>
                        <div className="flex items-center gap-2">
                          <a href={`tel:${order.userPhoneSnapshot}`} className="font-semibold text-primary hover:underline font-mono">
                            {order.userPhoneSnapshot}
                          </a>
                          <a
                            href={`tel:${order.userPhoneSnapshot}`}
                            className="px-2 py-0.5 rounded-full bg-primary/10 text-primary font-bold text-[10px]"
                          >
                            Appeler
                          </a>
                          <a
                            href={`https://wa.me/${order.userPhoneSnapshot.replace(/\D/g, '')}`}
                            target="_blank"
                            rel="noreferrer"
                            className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-bold text-[10px]"
                          >
                            WhatsApp
                          </a>
                        </div>
                      </div>
                    )}
                    {order.userEmailSnapshot && (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Email :</span>
                        <a href={`mailto:${order.userEmailSnapshot}`} className="text-muted-foreground hover:text-foreground truncate max-w-[200px]">
                          {order.userEmailSnapshot}
                        </a>
                      </div>
                    )}
                    {order.deliveryDetails && (
                      <div className="pt-2 border-t border-border/40 space-y-1.5">
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-muted-foreground shrink-0">Quartier :</span>
                          <span className="font-bold text-foreground text-right">{order.deliveryDetails.district}</span>
                        </div>
                        {order.deliveryDetails.instructions && (
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-muted-foreground shrink-0">Instructions :</span>
                            <span className="text-muted-foreground text-right italic text-xs">{order.deliveryDetails.instructions}</span>
                          </div>
                        )}
                        {order.deliveryDetails.coordinates && (
                          <div className="pt-2">
                            <a
                              href={`https://www.google.com/maps/dir/?api=1&destination=${order.deliveryDetails.coordinates.lat},${order.deliveryDetails.coordinates.lng}`}
                              target="_blank"
                              rel="noreferrer"
                              className="flex items-center justify-center gap-2 w-full h-9 bg-primary text-primary-foreground font-semibold rounded-xl text-xs hover:bg-primary/90 transition-colors"
                            >
                              <Navigation className="size-3.5" />
                              Ouvrir l'itinéraire Google Maps
                            </a>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* 3. Impression & Facture */}
                <div className="rounded-2xl border border-border/80 bg-card p-5 space-y-4 shadow-xs">
                  <div className="flex items-center justify-between pb-2 border-b border-border/40">
                    <p className="font-display font-bold text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <Printer className="size-4 text-primary" />
                      Impression & Facturation
                    </p>
                    <span className="text-[10px] font-bold bg-primary/10 text-primary px-2 py-0.5 rounded-full border border-primary/20">
                      Sticker 38×38 mm
                    </span>
                  </div>

                  {/* QRCode SVG caché pour génération canvas/PDF */}
                  <div className="hidden">
                    {origin ? (
                      <QRCodeSVG
                        id={`qr-reorder-${order.id}`}
                        value={`${origin}/lab?load=${order.cocktailId}&promo=REORDER`}
                        size={140}
                        level="M"
                        includeMargin={false}
                      />
                    ) : null}
                  </div>

                  {/* Sélecteur nombre de stickers */}
                  <div className="flex items-center justify-between bg-muted/60 rounded-xl p-3 border border-border/40">
                    <span className="text-xs font-semibold text-foreground">Nombre de stickers :</span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setQrStickerCount((prev) => Math.max(1, prev - 1))}
                        disabled={qrStickerCount <= 1}
                        className="size-7 rounded-lg bg-background border border-border flex items-center justify-center text-foreground hover:bg-accent disabled:opacity-40 transition-colors cursor-pointer"
                        title="Diminuer"
                      >
                        <Minus className="size-3.5" />
                      </button>
                      <span className="w-8 text-center font-bold text-xs font-mono">
                        {qrStickerCount}
                      </span>
                      <button
                        type="button"
                        onClick={() => setQrStickerCount((prev) => Math.min(50, prev + 1))}
                        disabled={qrStickerCount >= 50}
                        className="size-7 rounded-lg bg-background border border-border flex items-center justify-center text-foreground hover:bg-accent disabled:opacity-40 transition-colors cursor-pointer"
                        title="Augmenter"
                      >
                        <Plus className="size-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Button
                      type="button"
                      className="w-full h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-2 shadow-xs cursor-pointer"
                      onClick={() => printThermalQrStickers(`qr-reorder-${order.id}`, qrStickerCount)}
                    >
                      <Printer className="size-4" />
                      Imprimer stickers ({qrStickerCount}x · 58mm)
                    </Button>

                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-9 rounded-xl text-xs font-semibold gap-1.5 cursor-pointer"
                        disabled={downloadingQrPdf}
                        onClick={async () => {
                          setDownloadingQrPdf(true);
                          try {
                            await downloadThermalQrPdf(`qr-reorder-${order.id}`, order, qrStickerCount);
                          } finally {
                            setDownloadingQrPdf(false);
                          }
                        }}
                      >
                        {downloadingQrPdf ? <Loader2 className="size-3.5 animate-spin" /> : <Download className="size-3.5" />}
                        PDF 58mm
                      </Button>

                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-9 rounded-xl text-xs font-semibold gap-1.5 cursor-pointer"
                        onClick={() =>
                          downloadSvgAsPng(
                            `qr-reorder-${order.id}`,
                            `qr-bouteille-${order.cocktailNameSnapshot.replace(/\s+/g, '-')}-x${qrStickerCount}.png`
                          )
                        }
                      >
                        <Download className="size-3.5" />
                        PNG HD
                      </Button>
                    </div>

                    <Button
                      variant="outline"
                      className="w-full h-11 rounded-xl font-bold gap-2 text-foreground hover:border-primary/50 cursor-pointer mt-1"
                      onClick={() => setShowInvoiceFormatModal(true)}
                    >
                      <FileText className="size-4 text-primary" />
                      {t('orders.downloadInvoice', 'Télécharger la Facture (PDF)')}
                    </Button>
                  </div>
                </div>

                {/* 4. Actions d'annulation et suppression */}
                <div className="flex items-center gap-2 pt-1">
                  {!isCancelled && !isDelivered && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 h-10 rounded-xl border-border text-foreground hover:bg-accent font-semibold text-xs cursor-pointer"
                      disabled={cancelling || !!updating || deleting}
                      onClick={handleCancel}
                    >
                      {cancelling ? <Loader2 className="size-3.5 animate-spin" /> : <XCircle className="size-3.5" />}
                      {t('orders.cancel', 'Annuler')}
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 h-10 rounded-xl border-destructive/40 text-destructive hover:bg-destructive/10 font-semibold text-xs cursor-pointer"
                    disabled={cancelling || !!updating || deleting}
                    onClick={handleDelete}
                  >
                    {deleting ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
                    Supprimer définitivement
                  </Button>
                </div>

              </div>
            </div>
          </div>
        )}

        {/* Modal de sélection de format de facture (Standard A4 ou Ticket Thermique 58mm) */}
        <InvoiceFormatDialog
          open={showInvoiceFormatModal}
          onOpenChange={setShowInvoiceFormatModal}
          order={order}
          ingredientsStr={
            splittedCocktails.length > 1
              ? splittedCocktails.map((c) => `${c.name} : ${formatIngredientsSummary(c.allIngredients, fruits, { format: 'inline' })}`).join(' | ')
              : formatIngredientsSummary(order.cocktailIngredientsSnapshot || cocktail?.ingredients || [], fruits, { format: 'separated' })
          }
        />
      </DialogContent>
    </Dialog>
  );
}

// ── Period filters ────────────────────────────────────────────────────────────

const PERIOD_OPTIONS: { value: PeriodType; label: string }[] = [
  { value: 'all', label: i18n.t('orders.filterAll') },
  { value: 'day', label: i18n.t('orders.filterDay') },
  { value: 'week', label: i18n.t('orders.filterWeek') },
  { value: 'month', label: i18n.t('orders.filterMonth') },
  { value: 'year', label: i18n.t('orders.filterYear') },
];

const STATUS_FILTERS = [
  { value: 'all' as const, label: i18n.t('orders.filterAllStatus') },
  { value: OrderStatus.PENDING,   label: i18n.t('orders.pending') },
  { value: OrderStatus.CONFIRMED, label: i18n.t('orders.confirmed') },
  { value: OrderStatus.PREPARING, label: i18n.t('orders.preparing') },
  { value: OrderStatus.READY,     label: i18n.t('orders.ready') },
  { value: OrderStatus.DELIVERED, label: i18n.t('orders.delivered') },
  { value: OrderStatus.CANCELLED, label: i18n.t('orders.canceled') },
];

function orderCreatedMs(order: Order): number {
  const ts = order.createdAt as { toDate?: () => Date; seconds?: number } | undefined;
  if (!ts) return 0;
  if (typeof ts.toDate === 'function') return ts.toDate().getTime();
  if (typeof ts.seconds === 'number') return ts.seconds * 1000;
  return 0;
}

function orderInPeriod(order: Order, type: PeriodType, anchor: Date): boolean {
  const bounds = getPeriodBounds(type, anchor);
  if (!bounds) return true;
  const ms = orderCreatedMs(order);
  return ms >= bounds.start.getTime() && ms <= bounds.end.getTime();
}

// ── Page ──────────────────────────────────────────────────────────────────────

const Orders: PageComponent = () => {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const closeHistoryParam = useCloseHistoryParam();
  const isAdmin = user?.role === UserRole.ADMIN;

  const tabParam = searchParams.get('tab');
  // Flag de désactivation de l'écran pour la dégustation privée (code conservé)
  const SHOW_TASTING_TAB = false;
  const [orderTypeTab, setOrderTypeTab] = useState<'classic' | 'degustation' | 'program'>(
    tabParam === 'degustation' || tabParam === 'tasting'
      ? 'degustation'
      : tabParam === 'programs' || tabParam === 'program'
      ? 'program'
      : 'classic'
  );

  useEffect(() => {
    if (tabParam === 'degustation' || tabParam === 'tasting') {
      setOrderTypeTab('degustation');
    } else if (tabParam === 'programs' || tabParam === 'program') {
      setOrderTypeTab('program');
    } else if (tabParam === 'classic') {
      setOrderTypeTab('classic');
    }
  }, [tabParam]);

  function handleTabChange(tab: 'classic' | 'degustation' | 'program') {
    setOrderTypeTab(tab);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('tab', tab === 'program' ? 'programs' : tab === 'degustation' ? 'degustation' : 'classic');
      return next;
    }, { replace: true });
  }

  const sourceParam = searchParams.get('source');
  const [filterSource, setFilterSource] = useState<'all' | 'web' | 'whatsapp'>(
    sourceParam === 'whatsapp' ? 'whatsapp' : sourceParam === 'web' ? 'web' : 'all'
  );
  const [filterStatus, setFilterStatus] = useState<'all' | OrderStatus>('all');
  const [periodType, setPeriodType] = useState<PeriodType>('all');
  const [periodAnchor, setPeriodAnchor] = useState(() => new Date());
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const orderParam = searchParams.get('order');

  const phoneParam = searchParams.get('phone');
  const effectivePhone = user?.phone || (phoneParam ? phoneParam.replace(/\D/g, '') : undefined);

  const { orders, isLoading } = useOrders(user?.uid, isAdmin, effectivePhone);
  const { order: liveOrder } = useOrder(orderParam ?? undefined, !!orderParam);

  const selected = useMemo(() => {
    if (!orderParam) return null;
    return liveOrder ?? orders.find((o) => o.id === orderParam) ?? null;
  }, [orderParam, liveOrder, orders]);

  function openOrder(order: Order) {
    pushHistoryParam(setSearchParams, 'order', order.id);
  }

  function closeOrderSheet() {
    if (!closeHistoryParam('order')) {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.delete('order');
        return next;
      }, { replace: true });
    }
  }

  async function handleStatusChange(orderId: string, status: OrderStatus) {
    await updateOrderStatus(orderId, status);
  }

  async function handleCancel(orderId: string) {
    await cancelOrder(orderId);
  }

  async function handleDelete(orderId: string) {
    if (confirm(t('orders.confirmDelete', { defaultValue: 'Êtes-vous sûr de vouloir supprimer définitivement cette commande ?' }))) {
      await deleteOrderCompletely(orderId);
      closeOrderSheet();
    }
  }

  function handlePeriodTypeChange(type: PeriodType) {
    setPeriodType(type);
    if (type === 'all') {
      setCalendarOpen(false);
      return;
    }
    setPeriodAnchor(new Date());
    setCalendarOpen(true);
  }

  const periodOrders = useMemo(
    () => orders.filter((o) => orderInPeriod(o, periodType, periodAnchor)),
    [orders, periodType, periodAnchor],
  );

  const tastingOrdersCount = useMemo(
    () => periodOrders.filter((o) => isTastingOrder(o)).length,
    [periodOrders]
  );
  const classicOrdersCount = useMemo(
    () => periodOrders.filter((o) => o.type !== 'program' && !isTastingOrder(o)).length,
    [periodOrders]
  );
  const programOrdersCount = useMemo(
    () => periodOrders.filter((o) => o.type === 'program').length,
    [periodOrders]
  );

  const whatsappOrdersCount = useMemo(
    () => periodOrders.filter((o) => o.source === 'whatsapp').length,
    [periodOrders]
  );
  const webOrdersCount = useMemo(
    () => periodOrders.filter((o) => (o.source || 'web') === 'web').length,
    [periodOrders]
  );

  const visible = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return periodOrders.filter((o) => {
      const isProg = o.type === 'program';
      const isTasting = isTastingOrder(o);

      if (orderTypeTab === 'degustation') {
        if (!isTasting) return false;
      } else if (orderTypeTab === 'program') {
        if (!isProg) return false;
      } else {
        // Tab classique : commandes classiques hors précommandes dégustation
        if (isProg || isTasting) return false;
      }

      if (filterSource !== 'all' && (o.source || 'web') !== filterSource) return false;
      if (filterStatus !== 'all' && o.status !== filterStatus) return false;
      if (!q) return true;
      return (
        (o.cocktailNameSnapshot?.toLowerCase().includes(q) ?? false) ||
        (o.programTitleSnapshot?.toLowerCase().includes(q) ?? false) ||
        (o.userNameSnapshot?.toLowerCase().includes(q) ?? false) ||
        (o.userEmailSnapshot?.toLowerCase().includes(q) ?? false) ||
        (o.userPhoneSnapshot?.toLowerCase().includes(q) ?? false) ||
        (o.deliveryDetails?.district?.toLowerCase().includes(q) ?? false) ||
        (o.deliveryDetails?.phone?.toLowerCase().includes(q) ?? false) ||
        o.id.toLowerCase().includes(q)
      );
    });
  }, [periodOrders, orderTypeTab, filterSource, filterStatus, searchQuery]);

  const periodLabel = formatPeriodLabel(periodType, periodAnchor);

  const heroImageUrl = isAdmin
    ? 'https://images.pexels.com/photos/1267320/pexels-photo-1267320.jpeg?auto=compress&cs=tinysrgb&w=1200'
    : 'https://images.pexels.com/photos/4553031/pexels-photo-4553031.jpeg?auto=compress&cs=tinysrgb&w=1200';

  const heroExtra = isAdmin && !isLoading && orders.length > 0 ? (
    <div className="shrink-0 bg-white/15 backdrop-blur-md border border-white/20 rounded-2xl px-4 py-2.5 text-center mb-0.5">
      <p className="font-display font-extrabold text-xl text-white tabular-nums">{visible.length}</p>
      <p className="text-[9px] text-white/70 font-semibold uppercase tracking-wide">
        {periodType === 'all' && filterStatus === 'all' ? t('orders.total') : t('orders.showing')}
      </p>
    </div>
  ) : undefined;

  return (
    <>
      <BoardPageShell
        eyebrow={isAdmin ? t('orders.adminEyebrow') : t('orders.customerEyebrow')}
        titleBefore={isAdmin ? t('orders.titleBeforeAdmin') : t('orders.titleBeforeCustomer')}
        titleHighlight={t('orders.titleHighlight')}
        sectionBefore={isAdmin ? t('orders.sectionBeforeAdmin') : t('orders.sectionBeforeCustomer')}
        sectionHighlight={t('orders.sectionHighlight')}
        subtitle={
          isAdmin
            ? t('orders.adminSubtitle')
            : t('orders.customerSubtitle')
        }
        imageUrl={heroImageUrl}
        heroExtra={heroExtra}
      >
        <div className="space-y-6">
          {/* Tabs: Commandes classiques vs Dégustation (18 Oct.) vs Commandes programmes */}
          <div className="p-1.5 rounded-2xl bg-card/80 backdrop-blur-md border border-border/60 shadow-sm flex gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={() => handleTabChange('classic')}
              className={`flex-1 flex items-center justify-center gap-1.5 sm:gap-2 py-3 px-2 sm:px-4 rounded-xl font-display font-bold text-xs sm:text-sm transition-all cursor-pointer ${
                orderTypeTab === 'classic'
                  ? 'bg-primary text-primary-foreground shadow-md'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              <ShoppingBag className="size-4 shrink-0" />
              <span className="truncate">{t('orders.tabs.classic', 'Classiques')}</span>
              <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold shrink-0 ${
                orderTypeTab === 'classic'
                  ? 'bg-primary-foreground/20 text-primary-foreground'
                  : 'bg-muted text-muted-foreground'
              }`}>
                {classicOrdersCount}
              </span>
            </button>

            {(SHOW_TASTING_TAB || orderTypeTab === 'degustation') && (
              <button
                type="button"
                onClick={() => handleTabChange('degustation')}
                className={`flex-1 flex items-center justify-center gap-1.5 sm:gap-2 py-3 px-2 sm:px-4 rounded-xl font-display font-bold text-xs sm:text-sm transition-all cursor-pointer border ${
                  orderTypeTab === 'degustation'
                    ? 'bg-[#E0982E] text-white border-[#E0982E] shadow-md'
                    : 'border-transparent text-amber-700 dark:text-amber-400 hover:text-foreground hover:bg-amber-500/10'
                }`}
              >
                <Sparkles className="size-4 shrink-0" />
                <span className="truncate">Dégustation</span>
                <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold shrink-0 ${
                  orderTypeTab === 'degustation'
                    ? 'bg-white/25 text-white'
                    : 'bg-amber-500/15 text-amber-800 dark:text-amber-300'
                }`}>
                  {tastingOrdersCount}
                </span>
              </button>
            )}

            <button
              type="button"
              onClick={() => handleTabChange('program')}
              className={`flex-1 flex items-center justify-center gap-1.5 sm:gap-2 py-3 px-2 sm:px-4 rounded-xl font-display font-bold text-xs sm:text-sm transition-all cursor-pointer ${
                orderTypeTab === 'program'
                  ? 'bg-primary text-primary-foreground shadow-md'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              <Calendar className="size-4 shrink-0" />
              <span className="truncate">{t('orders.tabs.programs', 'Programmes')}</span>
              <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold shrink-0 ${
                orderTypeTab === 'program'
                  ? 'bg-primary-foreground/20 text-primary-foreground'
                  : 'bg-muted text-muted-foreground'
              }`}>
                {programOrdersCount}
              </span>
            </button>
          </div>
        <div  className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={isAdmin ? t('orders.searchPlaceholder') : t('orders.searchOrder')}
            className="w-full h-12 pl-11 pr-4 rounded-2xl bg-card border border-border/60 text-foreground placeholder:text-muted-foreground font-medium text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition-shadow"
          />
        </div>
        <div  className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
            <div className="flex items-center gap-1.5 shrink-0">
              <CalendarDays className="size-3.5 text-muted-foreground" />
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{t('orders.periodLabel')}</span>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-0.5" style={{ scrollbarWidth: 'none' }}>
              {PERIOD_OPTIONS.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => handlePeriodTypeChange(value)}
                  className={`shrink-0 px-3.5 py-2 rounded-full text-[12px] font-bold transition-all border ${
                    periodType === value
                      ? 'bg-secondary text-white border-secondary shadow-sm'
                      : 'bg-card text-muted-foreground border-border/60 hover:border-secondary/40 hover:text-foreground'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {periodType !== 'all' && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setCalendarOpen((v) => !v)}
                className="w-full flex items-center justify-between gap-2 rounded-2xl border border-border/50 bg-card hover:bg-muted/40 px-4 py-3 transition-colors text-left shadow-sm"
              >
                <div className="min-w-0">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-0.5">
                    {periodType === 'day' ? t('orders.daySelected')
                      : periodType === 'week' ? t('orders.weekSelected')
                      : periodType === 'month' ? t('orders.monthSelected')
                      : t('orders.yearSelected')}
                  </p>
                  <p className="text-[13px] font-semibold text-foreground capitalize truncate">
                    {periodLabel}
                  </p>
                </div>
                <CalendarDays className={`size-4 shrink-0 transition-colors ${calendarOpen ? 'text-secondary' : 'text-muted-foreground'}`} />
              </button>

              {calendarOpen && (
                <>
                  <button
                    type="button"
                    aria-label={t('orders.closeCalendar')}
                    className="fixed inset-0 z-30 cursor-default"
                    onClick={() => setCalendarOpen(false)}
                  />
                  <div className="absolute left-0 right-0 sm:left-auto sm:right-0 z-40 mt-2 rounded-2xl border border-border/60 bg-card shadow-xl overflow-hidden">
                    <PeriodCalendar
                      periodType={periodType}
                      value={periodAnchor}
                      onChange={setPeriodAnchor}
                      onClose={() => setCalendarOpen(false)}
                    />
                  </div>
                </>
              )}
            </div>
          )}

          {/* Canal / Source filter (Admin only) */}
          {isAdmin && (
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Canal</span>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-0.5" style={{ scrollbarWidth: 'none' }}>
                <button
                  type="button"
                  onClick={() => setFilterSource('all')}
                  className={`shrink-0 px-3.5 py-1.5 rounded-full text-[12px] font-bold transition-all border ${
                    filterSource === 'all'
                      ? 'bg-foreground text-background border-foreground shadow-sm'
                      : 'bg-card text-muted-foreground border-border/60 hover:text-foreground'
                  }`}
                >
                  Tous les canaux <span className="ml-1 opacity-60">({periodOrders.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFilterSource('web')}
                  className={`shrink-0 px-3.5 py-1.5 rounded-full text-[12px] font-bold transition-all border inline-flex items-center ${
                    filterSource === 'web'
                      ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                      : 'bg-card text-muted-foreground border-border/60 hover:text-foreground'
                  }`}
                >
                  <ShoppingBag className="size-3.5 mr-1.5" />
                  Web <span className="ml-1 opacity-60">({webOrdersCount})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFilterSource('whatsapp')}
                  className={`shrink-0 px-3.5 py-1.5 rounded-full text-[12px] font-bold transition-all border inline-flex items-center ${
                    filterSource === 'whatsapp'
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                      : 'bg-card text-emerald-700 dark:text-emerald-400 border-emerald-500/30 hover:border-emerald-500'
                  }`}
                >
                  <MessageCircle className="size-3.5 mr-1.5" />
                  WhatsApp <span className="ml-1 opacity-80">({whatsappOrdersCount})</span>
                </button>
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
            <div className="flex items-center gap-1.5 shrink-0">
              <Package className="size-3.5 text-muted-foreground" />
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{t('orders.statusLabel')}</span>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-0.5" style={{ scrollbarWidth: 'none' }}>
              {STATUS_FILTERS.map(({ value, label }) => (
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
                      {periodOrders.filter((o) => {
                        if (orderTypeTab === 'degustation') return isTastingOrder(o) && o.status === value;
                        if (orderTypeTab === 'program') return o.type === 'program' && o.status === value;
                        return o.type !== 'program' && !isTastingOrder(o) && o.status === value;
                      }).length}
                    </span>
                  )}
                  {value === 'all' && periodType !== 'all' && (
                    <span className="ml-1.5 opacity-60">
                      {orderTypeTab === 'degustation' ? tastingOrdersCount : orderTypeTab === 'program' ? programOrdersCount : classicOrdersCount}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

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
          <div  className="space-y-4">
            {visible.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                showCustomer={isAdmin}
                onClick={() => openOrder(order)}
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
              {filterStatus !== 'all' || periodType !== 'all'
                ? t('orders.emptyFilter')
                : orderTypeTab === 'degustation'
                ? 'Aucune précommande pour la dégustation trouvée'
                : orderTypeTab === 'program'
                ? 'Aucune commande de cure trouvée'
                : t('orders.emptyAll')}
            </p>
            {(filterStatus !== 'all' || periodType !== 'all') && (
              <p className="text-xs text-muted-foreground max-w-[260px]">
                {periodType !== 'all' && (
                  <span className="capitalize">{periodLabel}</span>
                )}
                {periodType !== 'all' && filterStatus !== 'all' && ' · '}
                {filterStatus !== 'all' && STATUS_CONFIG[filterStatus]?.label}
              </p>
            )}
            {!isAdmin && filterStatus === 'all' && periodType === 'all' && (
              <>
                <p className="text-xs text-muted-foreground max-w-[240px]">
                  {orderTypeTab === 'program'
                    ? 'Découvrez nos packs de cures détox, énergie et vitalité avec accompagnement quotidien.'
                    : t('orders.exploreText')}
                </p>
                {orderTypeTab === 'program' ? (
                  <Button
                    className="rounded-full bg-primary text-primary-foreground font-bold hover:bg-primary/90 px-8 mt-2 gap-2 cursor-pointer"
                    size="sm"
                    onClick={() => navigate('/board/programs')}
                  >
                    <Sparkles className="size-4" /> Découvrir FYS Programme
                  </Button>
                ) : (
                  <Button
                    className="rounded-full bg-secondary text-white font-bold hover:bg-secondary/90 px-8 mt-2 gap-2 cursor-pointer"
                    size="sm"
                    onClick={() => navigate('/board/catalogue')}
                  >
                    <ShoppingBag className="size-4" /> {t('orders.exploreButton')}
                  </Button>
                )}
              </>
            )}
            {(filterStatus !== 'all' || periodType !== 'all') && (
              <Button
                variant="outline"
                size="sm"
                className="rounded-full mt-1"
                onClick={() => {
                  setFilterStatus('all');
                  setPeriodType('all');
                }}
              >
                {t('orders.resetFilters')}
              </Button>
            )}
          </div>
        )}
        </div>
      </BoardPageShell>

      {/* Sheets */}
      {isAdmin ? (
        <AdminOrderSheet
          order={selected}
          open={!!orderParam}
          onOpenChange={(v) => { if (!v) closeOrderSheet(); }}
          onStatusChange={handleStatusChange}
          onCancel={handleCancel}
          onDelete={handleDelete}
        />
      ) : (
        <ClientOrderSheet
          order={selected}
          open={!!orderParam}
          onOpenChange={(v) => { if (!v) closeOrderSheet(); }}
          onCancel={handleCancel}
        />
      )}
    </>
  );
};

Orders.metadata = {
  title: i18n.t('orders.pageTitle'),
  description: i18n.t('orders.pageDescription'),
  metaTags: [{ name: 'robots', content: 'noindex, nofollow' }],
};

export default Orders;
