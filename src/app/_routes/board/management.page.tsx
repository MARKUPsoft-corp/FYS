import React, { useState, useEffect, useMemo } from 'react';
import { PageComponent, Link } from 'rasengan';
import {
  CircleDollarSign,
  TrendingUp,
  TrendingDown,
  Search,
  CheckCircle2,
  AlertCircle,
  Clock,
  Wine,
  Filter,
  ArrowUpDown,
  Calculator,
  RotateCcw,
  Sparkles,
  ShoppingBag,
  SlidersHorizontal,
  FileSpreadsheet,
  ChevronRight,
  Package,
  CalendarCheck,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { BoardPageShell } from '@/components/layout/BoardPageShell';
import { subscribeToAllOrders } from '@/services/order';
import { getFruits } from '@/services/fruit';
import { getPricingSettings } from '@/services/settings';
import { OrderStatus, type Order } from '@/entities/order';
import { OrderExpensesDialog } from '@/components/features/management/OrderExpensesDialog';
import { formatIngredientsSummary } from '@/entities/cocktail';
import { cn } from '@/lib/utils';
import i18n from '@/i18n';

type FilterTab = 'all' | 'filled' | 'pending';
type SortField = 'date' | 'revenue' | 'profit' | 'margin';

const ManagementPage: PageComponent = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortAsc, setSortAsc] = useState(false);

  // Selected order for the expenses dialog
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Query fruits and pricing settings
  const { data: fruits = [] } = useQuery({
    queryKey: ['fruits'],
    queryFn: getFruits,
  });

  const { data: pricingSettings } = useQuery({
    queryKey: ['pricing-settings'],
    queryFn: getPricingSettings,
  });

  // Real-time orders subscription
  useEffect(() => {
    setLoading(true);
    const unsubscribe = subscribeToAllOrders(
      (newOrders) => {
        setOrders(newOrders);
        setLoading(false);
      },
      (err) => {
        console.error('Erreur chargement commandes:', err);
        setError('Impossible de charger les commandes.');
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, []);

  // Seules les commandes livrées apparaissent dans FYS Management
  const deliveredOrders = useMemo(() => {
    return orders.filter((o) => o.status === OrderStatus.DELIVERED);
  }, [orders]);

  const selectedOrder = useMemo(() => {
    if (!selectedOrderId) return null;
    return deliveredOrders.find((o) => o.id === selectedOrderId) ?? null;
  }, [selectedOrderId, deliveredOrders]);

  // Global KPI Calculations (sur les commandes livrées uniquement)
  const globalKpis = useMemo(() => {
    const totalOrdersCount = deliveredOrders.length;
    let totalRevenue = 0;
    let totalExpenses = 0;
    let totalNetProfit = 0;
    let filledOrdersCount = 0;

    deliveredOrders.forEach((o) => {
      totalRevenue += o.totalPrice ?? 0;
      if (o.expenses && typeof o.expenses.totalExpenses === 'number') {
        filledOrdersCount += 1;
        totalExpenses += o.expenses.totalExpenses;
        totalNetProfit += o.expenses.netProfit ?? (o.totalPrice - o.expenses.totalExpenses);
      }
    });

    const completionRate =
      totalOrdersCount > 0 ? Math.round((filledOrdersCount / totalOrdersCount) * 100) : 0;

    const overallMargin =
      totalRevenue > 0 ? Math.round((totalNetProfit / totalRevenue) * 100) : 0;

    return {
      totalOrdersCount,
      filledOrdersCount,
      pendingOrdersCount: totalOrdersCount - filledOrdersCount,
      totalRevenue,
      totalExpenses,
      totalNetProfit,
      completionRate,
      overallMargin,
    };
  }, [deliveredOrders]);

  // Filtering & Sorting (sur les commandes livrées uniquement)
  const filteredOrders = useMemo(() => {
    return deliveredOrders
      .filter((order) => {
        // Tab filter
        const isFilled = Boolean(order.expenses && typeof order.expenses.totalExpenses === 'number');
        if (activeTab === 'filled' && !isFilled) return false;
        if (activeTab === 'pending' && isFilled) return false;

        // Search query
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase().trim();
        const client = (order.userNameSnapshot || '').toLowerCase();
        const phone = (order.userPhoneSnapshot || order.deliveryDetails?.phone || '').toLowerCase();
        const cocktail = (order.cocktailNameSnapshot || '').toLowerCase();
        const id = order.id.toLowerCase();
        return (
          client.includes(q) ||
          phone.includes(q) ||
          cocktail.includes(q) ||
          id.includes(q)
        );
      })
      .sort((a, b) => {
        let diff = 0;
        if (sortField === 'date') {
          const tA = a.createdAt?.toMillis?.() ?? 0;
          const tB = b.createdAt?.toMillis?.() ?? 0;
          diff = tA - tB;
        } else if (sortField === 'revenue') {
          diff = (a.totalPrice ?? 0) - (b.totalPrice ?? 0);
        } else if (sortField === 'profit') {
          const pA = a.expenses?.netProfit ?? -Infinity;
          const pB = b.expenses?.netProfit ?? -Infinity;
          diff = pA - pB;
        } else if (sortField === 'margin') {
          const mA = a.expenses?.marginPercentage ?? -Infinity;
          const mB = b.expenses?.marginPercentage ?? -Infinity;
          diff = mA - mB;
        }
        return sortAsc ? diff : -diff;
      });
  }, [deliveredOrders, activeTab, searchQuery, sortField, sortAsc]);

  const handleOpenOrder = (orderId: string) => {
    setSelectedOrderId(orderId);
    setDialogOpen(true);
  };

  return (
    <BoardPageShell
      eyebrow="Rentabilité & Gestion Financière"
      titleBefore="FYS"
      titleHighlight="Management"
      sectionBefore="Suivi des"
      sectionHighlight="Coûts & Bénéfices"
      subtitle="Calculez au centime près les dépenses réelles par commande livrée (ingrédients, bouteilles vides avec étiquettes, frais annexes) et la marge nette dégagée."
      imageUrl="https://images.pexels.com/photos/1267320/pexels-photo-1267320.jpeg?auto=compress&cs=tinysrgb&w=1200"
      actions={
        <div className="flex justify-end pb-2">
          <Link
            to="/board/programs-admin"
            className="inline-flex items-center gap-1.5 h-10 px-4 rounded-2xl bg-secondary text-secondary-foreground font-bold text-xs shadow-sm hover:bg-secondary/90 transition-all cursor-pointer"
          >
            <CalendarCheck className="size-4" />
            Gestion FYS Programme
          </Link>
        </div>
      }
    >
      <div className="space-y-8 max-w-7xl mx-auto w-full pb-16">
        {/* ── 1. GLOBAL KPI DASHBOARD ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
          {/* Card 1: Chiffre d'affaires */}
          <div className="bg-card rounded-[2rem] p-5 md:p-6 border border-border/40 shadow-sm relative overflow-hidden flex flex-col justify-between group">
            <div className="absolute -right-3 -top-3 size-28 rounded-full bg-primary/10 blur-2xl pointer-events-none group-hover:bg-primary/15 transition-colors" />
            <div>
              <div className="flex items-center justify-between gap-3 mb-4">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Recettes Totales (CA)
                </span>
                <div className="size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <ShoppingBag className="size-5" />
                </div>
              </div>
              <p className="font-display font-extrabold text-2xl md:text-3xl lg:text-4xl text-foreground break-words">
                {globalKpis.totalRevenue.toLocaleString()}{' '}
                <span className="text-lg md:text-xl font-semibold text-muted-foreground">XAF</span>
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-border/30 flex items-center justify-between text-xs text-muted-foreground font-medium">
              <span>{globalKpis.totalOrdersCount} commandes livrées</span>
              <span className="font-semibold text-foreground">Encaissé</span>
            </div>
          </div>

          {/* Card 2: Dépenses Totales */}
          <div className="bg-card rounded-[2rem] p-5 md:p-6 border border-border/40 shadow-sm relative overflow-hidden flex flex-col justify-between group">
            <div className="absolute -right-3 -top-3 size-28 rounded-full bg-amber-500/10 blur-2xl pointer-events-none group-hover:bg-amber-500/15 transition-colors" />
            <div>
              <div className="flex items-center justify-between gap-3 mb-4">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Dépenses Engagées
                </span>
                <div className="size-10 rounded-xl bg-amber-50 dark:bg-amber-950/30 text-amber-600 border border-amber-200/50 flex items-center justify-center">
                  <Calculator className="size-5" />
                </div>
              </div>
              <p className="font-display font-extrabold text-2xl md:text-3xl lg:text-4xl text-foreground break-words">
                {globalKpis.totalExpenses.toLocaleString()}{' '}
                <span className="text-lg md:text-xl font-semibold text-muted-foreground">XAF</span>
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-border/30 flex items-center justify-between text-xs text-muted-foreground font-medium">
              <span>Fruits, bouteilles, extras</span>
              <span className="text-amber-600 dark:text-amber-400 font-semibold">
                {globalKpis.filledOrdersCount} calculées
              </span>
            </div>
          </div>

          {/* Card 3: Bénéfice Dégagé Total */}
          <div className="bg-card rounded-[2rem] p-5 md:p-6 border border-border/40 shadow-sm relative overflow-hidden flex flex-col justify-between group">
            <div className="absolute -right-3 -top-3 size-28 rounded-full bg-emerald-500/10 blur-2xl pointer-events-none group-hover:bg-emerald-500/20 transition-colors" />
            <div>
              <div className="flex items-center justify-between gap-3 mb-4">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Bénéfice Net Total
                </span>
                <div className="size-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 border border-emerald-200/50 flex items-center justify-center">
                  <TrendingUp className="size-5" strokeWidth={2.5} />
                </div>
              </div>
              <p
                className={cn(
                  'font-display font-black text-2xl md:text-3xl lg:text-4xl break-words',
                  globalKpis.totalNetProfit >= 0
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-rose-600 dark:text-rose-400',
                )}
              >
                {globalKpis.totalNetProfit.toLocaleString()}{' '}
                <span className="text-lg md:text-xl font-semibold text-muted-foreground">XAF</span>
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-border/30 flex items-center justify-between text-xs font-medium">
              <span className="text-muted-foreground">Marge brute globale</span>
              <span
                className={cn(
                  'px-2.5 py-0.5 rounded-full font-bold text-[11px]',
                  globalKpis.overallMargin >= 30
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                    : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
                )}
              >
                {globalKpis.overallMargin >= 0
                  ? `+${globalKpis.overallMargin}%`
                  : `${globalKpis.overallMargin}%`}
              </span>
            </div>
          </div>

          {/* Card 4: Suivi de complétude */}
          <div className="bg-card rounded-[2rem] p-5 md:p-6 border border-border/40 shadow-sm relative overflow-hidden flex flex-col justify-between group">
            <div className="absolute -right-3 -top-3 size-28 rounded-full bg-sky-500/10 blur-2xl pointer-events-none group-hover:bg-sky-500/15 transition-colors" />
            <div>
              <div className="flex items-center justify-between gap-3 mb-4">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Suivi des Dépenses
                </span>
                <div className="size-10 rounded-xl bg-sky-50 dark:bg-sky-950/30 text-sky-600 border border-sky-200/50 flex items-center justify-center">
                  <CheckCircle2 className="size-5" />
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <p className="font-display font-extrabold text-3xl md:text-4xl text-foreground">
                  {globalKpis.filledOrdersCount}
                </p>
                <span className="text-sm font-semibold text-muted-foreground">
                  / {globalKpis.totalOrdersCount} commandes
                </span>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-border/30 space-y-1.5">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-muted-foreground">Complétées</span>
                <span className="text-sky-600 dark:text-sky-400">{globalKpis.completionRate}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-sky-500 rounded-full transition-all duration-500"
                  style={{ width: `${globalKpis.completionRate}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* ── 2. FILTERS, SEARCH & SORT CONTROLS ── */}
        <div className="bg-card rounded-[2rem] p-4 md:p-5 border border-border/40 shadow-xs space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Filter Tabs */}
            <div className="flex items-center gap-1.5 p-1 bg-muted/40 rounded-2xl border border-border/40 self-start overflow-x-auto max-w-full">
              <button
                type="button"
                onClick={() => setActiveTab('all')}
                className={cn(
                  'px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0',
                  activeTab === 'all'
                    ? 'bg-card text-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                Toutes ({deliveredOrders.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('filled')}
                className={cn(
                  'px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5',
                  activeTab === 'filled'
                    ? 'bg-card text-emerald-600 shadow-xs'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <span className="size-2 rounded-full bg-emerald-500" />
                Renseignées ({globalKpis.filledOrdersCount})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('pending')}
                className={cn(
                  'px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5',
                  activeTab === 'pending'
                    ? 'bg-card text-amber-600 shadow-xs'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <span className="size-2 rounded-full bg-amber-500" />
                À renseigner ({globalKpis.pendingOrdersCount})
              </button>
            </div>

            {/* Search Input & Sort trigger */}
            <div className="flex items-center gap-2.5 flex-1 max-w-md self-stretch md:self-auto">
              <div className="relative flex-1">
                <Search className="size-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Rechercher client, cocktail, ID..."
                  className="pl-9 h-10 rounded-xl bg-background text-xs font-medium"
                />
              </div>

              {/* Sort Switcher */}
              <div className="flex items-center gap-1 shrink-0">
                <select
                  value={sortField}
                  onChange={(e) => setSortField(e.target.value as SortField)}
                  className="h-10 px-3 rounded-xl border border-border/60 bg-background text-xs font-semibold text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20"
                >
                  <option value="date">Date</option>
                  <option value="revenue">Prix (CA)</option>
                  <option value="profit">Bénéfice</option>
                  <option value="margin">Marge %</option>
                </select>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setSortAsc((prev) => !prev)}
                  className="size-10 rounded-xl shrink-0"
                  title={sortAsc ? 'Ordre croissant' : 'Ordre décroissant'}
                >
                  <ArrowUpDown className="size-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* ── 3. ORDERS LIST / TABLE ── */}
        {loading ? (
          <div className="p-16 text-center bg-card rounded-[2rem] border border-border/40 shadow-xs">
            <div className="size-10 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm font-semibold text-muted-foreground">Chargement des commandes et dépenses...</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="p-16 text-center bg-card rounded-[2rem] border border-dashed border-border/60">
            <div className="size-16 rounded-full bg-muted/30 border border-border/50 flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="size-7 text-muted-foreground" />
            </div>
            <h3 className="font-display font-bold text-lg text-foreground">
              {deliveredOrders.length === 0
                ? 'Aucune commande livrée pour le moment'
                : 'Aucune commande trouvée'}
            </h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1">
              {deliveredOrders.length === 0
                ? 'Seuls les cocktails livrés apparaissent dans FYS Management pour le suivi de la rentabilité.'
                : 'Aucune commande livrée ne correspond aux filtres ou à votre recherche actuelle.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* ── DESKTOP TABLE VIEW (HIDDEN ON MOBILE) ── */}
            <div className="hidden lg:block bg-card rounded-[2rem] border border-border/40 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-border/40 bg-muted/20 text-[11px] font-bold uppercase tracking-wider text-muted-foreground select-none">
                      <th className="py-4 px-6">Commande</th>
                      <th className="py-4 px-6">Client</th>
                      <th className="py-4 px-6">Composition</th>
                      <th className="py-4 px-6 text-right">CA (Prix payé)</th>
                      <th className="py-4 px-6 text-right">Dépenses réelles</th>
                      <th className="py-4 px-6 text-right">Bénéfice net</th>
                      <th className="py-4 px-6 text-center">Marge</th>
                      <th className="py-4 px-6 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/30 text-xs">
                    {filteredOrders.map((order) => {
                      const date = order.createdAt?.toDate?.();
                      const dateStr = date
                        ? date.toLocaleDateString('fr-FR', {
                            day: '2-digit',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : '—';

                      const hasExpenses = Boolean(
                        order.expenses && typeof order.expenses.totalExpenses === 'number',
                      );
                      const totalExpenses = order.expenses?.totalExpenses ?? 0;
                      const netProfit = order.expenses?.netProfit ?? (order.totalPrice - totalExpenses);
                      const margin = order.expenses?.marginPercentage ?? 0;

                      // Bottle formats summary
                      const formats = order.orderLines?.length
                        ? order.orderLines.map((l) => `${l.quantity}× ${l.bottleSize}`).join(', ')
                        : `${order.quantity || 1}× ${order.bottleSize || '500ml'}`;

                      return (
                        <tr
                          key={order.id}
                          onClick={() => handleOpenOrder(order.id)}
                          className="hover:bg-muted/30 transition-colors cursor-pointer group"
                        >
                          {/* Commande / Date */}
                          <td className="py-4 px-6 whitespace-nowrap">
                            <div className="font-mono font-black text-foreground group-hover:text-primary transition-colors">
                              #{order.id.slice(0, 7).toUpperCase()}
                            </div>
                            <div className="text-[11px] text-muted-foreground mt-0.5">{dateStr}</div>
                          </td>

                          {/* Client */}
                          <td className="py-4 px-6">
                            <div className="font-bold text-foreground truncate max-w-[160px]">
                              {order.userNameSnapshot}
                            </div>
                            <div className="text-[11px] text-muted-foreground truncate max-w-[160px]">
                              {order.userPhoneSnapshot || order.deliveryDetails?.phone || order.userEmailSnapshot}
                            </div>
                          </td>

                          {/* Composition & Formats */}
                          <td className="py-4 px-6 max-w-[220px]">
                            <p className="font-semibold text-foreground truncate">
                              {order.cocktailNameSnapshot}
                            </p>
                            <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-muted-foreground truncate">
                              <Wine className="size-3 shrink-0" />
                              <span className="truncate">{formats}</span>
                            </div>
                          </td>

                          {/* CA */}
                          <td className="py-4 px-6 text-right whitespace-nowrap font-mono font-extrabold text-foreground text-sm">
                            {order.totalPrice.toLocaleString()} XAF
                          </td>

                          {/* Dépenses réelles */}
                          <td className="py-4 px-6 text-right whitespace-nowrap">
                            {hasExpenses ? (
                              <div className="font-mono font-bold text-amber-700 dark:text-amber-400">
                                {totalExpenses.toLocaleString()} XAF
                                <span className="block text-[10px] font-normal text-muted-foreground">
                                  {order.expenses?.items?.length || 0} poste(s)
                                </span>
                              </div>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200/50">
                                À renseigner
                              </span>
                            )}
                          </td>

                          {/* Bénéfice net */}
                          <td className="py-4 px-6 text-right whitespace-nowrap">
                            {hasExpenses ? (
                              <div
                                className={cn(
                                  'font-mono font-black text-sm flex items-center justify-end gap-1',
                                  netProfit >= 0
                                    ? 'text-emerald-600 dark:text-emerald-400'
                                    : 'text-rose-600 dark:text-rose-400',
                                )}
                              >
                                {netProfit >= 0 ? '+' : ''}
                                {netProfit.toLocaleString()} XAF
                              </div>
                            ) : (
                              <span className="text-muted-foreground font-mono">—</span>
                            )}
                          </td>

                          {/* Marge % */}
                          <td className="py-4 px-6 text-center whitespace-nowrap">
                            {hasExpenses ? (
                              <span
                                className={cn(
                                  'inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-black',
                                  margin >= 40
                                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300'
                                    : margin > 0
                                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300'
                                    : 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300',
                                )}
                              >
                                {margin >= 0 ? `+${margin}%` : `${margin}%`}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>

                          {/* Action Button */}
                          <td className="py-4 px-6 text-center whitespace-nowrap">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenOrder(order.id);
                              }}
                              className={cn(
                                'rounded-full h-8 text-xs font-bold gap-1.5 transition-all',
                                hasExpenses
                                  ? 'border-emerald-200 text-emerald-700 dark:border-emerald-800 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                                  : 'bg-primary text-white hover:bg-primary/90',
                              )}
                            >
                              <Calculator className="size-3.5" />
                              <span>{hasExpenses ? 'Éditer' : 'Remplir'}</span>
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* ── MOBILE CARDS VIEW (HIDDEN ON DESKTOP) ── */}
            <div className="lg:hidden space-y-3">
              {filteredOrders.map((order) => {
                const date = order.createdAt?.toDate?.();
                const dateStr = date
                  ? date.toLocaleDateString('fr-FR', {
                      day: '2-digit',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : '—';

                const hasExpenses = Boolean(
                  order.expenses && typeof order.expenses.totalExpenses === 'number',
                );
                const totalExpenses = order.expenses?.totalExpenses ?? 0;
                const netProfit = order.expenses?.netProfit ?? (order.totalPrice - totalExpenses);
                const margin = order.expenses?.marginPercentage ?? 0;

                const formats = order.orderLines?.length
                  ? order.orderLines.map((l) => `${l.quantity}× ${l.bottleSize}`).join(', ')
                  : `${order.quantity || 1}× ${order.bottleSize || '500ml'}`;

                return (
                  <div
                    key={order.id}
                    onClick={() => handleOpenOrder(order.id)}
                    className="bg-card rounded-[1.75rem] border border-border/40 p-4 shadow-xs active:scale-[0.99] transition-all space-y-3 cursor-pointer"
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-black text-xs px-2.5 py-0.5 rounded-full bg-primary/10 text-primary">
                          #{order.id.slice(0, 7).toUpperCase()}
                        </span>
                        <span className="text-[11px] text-muted-foreground">{dateStr}</span>
                      </div>

                      {hasExpenses ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                          <CheckCircle2 className="size-3" />
                          Renseigné
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                          <Clock className="size-3" />
                          À renseigner
                        </span>
                      )}
                    </div>

                    {/* Customer & Cocktail */}
                    <div>
                      <h4 className="font-bold text-foreground text-sm truncate">{order.userNameSnapshot}</h4>
                      <p className="text-xs text-muted-foreground font-medium truncate mt-0.5">
                        {order.cocktailNameSnapshot} • <span className="text-foreground">{formats}</span>
                      </p>
                    </div>

                    {/* Financial 3-box Grid */}
                    <div className="grid grid-cols-3 gap-2 p-2.5 rounded-2xl bg-muted/30 border border-border/40 text-center">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                          CA
                        </span>
                        <span className="font-mono font-bold text-xs text-foreground truncate block">
                          {order.totalPrice.toLocaleString()} XAF
                        </span>
                      </div>

                      <div>
                        <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                          Dépenses
                        </span>
                        <span className="font-mono font-bold text-xs text-amber-600 truncate block">
                          {hasExpenses ? `${totalExpenses.toLocaleString()} XAF` : '—'}
                        </span>
                      </div>

                      <div>
                        <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                          Bénéfice
                        </span>
                        <span
                          className={cn(
                            'font-mono font-black text-xs truncate block',
                            hasExpenses
                              ? netProfit >= 0
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-rose-600 dark:text-rose-400'
                              : 'text-muted-foreground',
                          )}
                        >
                          {hasExpenses ? `${netProfit.toLocaleString()} XAF` : '—'}
                        </span>
                      </div>
                    </div>

                    {/* Footer with edit trigger */}
                    <div className="flex items-center justify-between pt-1">
                      {hasExpenses ? (
                        <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                          Marge : {margin >= 0 ? `+${margin}%` : `${margin}%`}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">Cliquez pour chiffrer</span>
                      )}

                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs font-bold text-primary gap-1 p-0 hover:bg-transparent"
                      >
                        <span>Gérer</span>
                        <ChevronRight className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── EXPENSES MODAL / DIALOG ── */}
      <OrderExpensesDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        order={selectedOrder}
        fruits={fruits}
        pricingSettings={pricingSettings}
      />
    </BoardPageShell>
  );
};

ManagementPage.metadata = {
  title: 'FYS Management — Rentabilité & Dépenses',
  description: 'Suivi détaillé des coûts de revient, ingrédients, emballages et bénéfices par commande.',
};

export default ManagementPage;
