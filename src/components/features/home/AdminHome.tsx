import { Link } from 'rasengan';
import {
  GlassWater, Apple, ShoppingBag, Users, Tag, ArrowRight,
  TrendingUp, Loader2, Clock, CheckCircle2, Truck, Package,
  XCircle, AlertCircle, Wallet, Image,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { getAdminStats } from '@/services/stats';
import { OrderStatus } from '@/entities';
import type { Order } from '@/entities';
import { BoardPageShell } from '@/components/layout/BoardPageShell';

type Props = { name: string };

// ── Status config (subset for activity feed) ─────────────────────────────────

const STATUS_CONFIG: Record<OrderStatus, { label: string; dot: string; icon: React.ElementType }> = {
  [OrderStatus.PENDING]:   { label: 'En attente',   dot: 'bg-amber-400',  icon: Clock },
  [OrderStatus.CONFIRMED]: { label: 'Confirmée',    dot: 'bg-blue-400',   icon: CheckCircle2 },
  [OrderStatus.PREPARING]: { label: 'En préparation', dot: 'bg-violet-400', icon: Package },
  [OrderStatus.READY]:     { label: 'Prête',        dot: 'bg-teal-400',   icon: Truck },
  [OrderStatus.DELIVERED]: { label: 'Livrée',       dot: 'bg-primary',    icon: CheckCircle2 },
  [OrderStatus.CANCELLED]: { label: 'Annulée',      dot: 'bg-rose-400',   icon: XCircle },
};

const STATUS_ORDER: OrderStatus[] = [
  OrderStatus.PENDING,
  OrderStatus.CONFIRMED,
  OrderStatus.PREPARING,
  OrderStatus.READY,
  OrderStatus.DELIVERED,
  OrderStatus.CANCELLED,
];

function StatusBadge({ status }: { status: OrderStatus }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-foreground">
      <span className={`size-2 rounded-full ${cfg.dot} shrink-0`} />
      {cfg.label}
    </span>
  );
}

function RecentOrderRow({ order }: { order: Order }) {
  const date = order.createdAt?.toDate?.();
  const dateStr = date
    ? date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
    : '—';

  return (
    <div className="flex items-center gap-3 min-w-0">
      <div className="size-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
        <span className="text-primary font-bold text-sm">
          {order.userNameSnapshot.slice(0, 1).toUpperCase()}
        </span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-foreground truncate">{order.userNameSnapshot}</p>
        <p className="text-xs text-muted-foreground truncate">{order.cocktailNameSnapshot}</p>
      </div>
      <div className="shrink-0 text-right space-y-0.5 hidden sm:block">
        <StatusBadge status={order.status} />
        <p className="text-xs text-muted-foreground">{dateStr}</p>
      </div>
      <div className="shrink-0 text-right">
        <p className="text-sm font-bold text-foreground tabular-nums">
          {order.totalPrice.toLocaleString()} XAF
        </p>
        <div className="sm:hidden mt-0.5">
          <StatusBadge status={order.status} />
        </div>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

const quickActions = [
  {
    label: 'Fruits',
    description: 'Gérez votre catalogue de fruits et leurs nutriments.',
    icon: Apple,
    iconBg: 'bg-orange-50 dark:bg-orange-950/30',
    iconColor: 'text-orange-500',
    path: '/board/fruits',
    cta: 'Gérer les fruits',
  },
  {
    label: 'Hero slides',
    description: 'Images et textes de la page d’accueil client.',
    icon: Image,
    iconBg: 'bg-sky-50 dark:bg-sky-950/30',
    iconColor: 'text-sky-600',
    path: '/board/hero',
    cta: 'Modifier les slides',
  },
  {
    label: 'Tarifs',
    description: 'Prix de base des contenants 50 cl / 1 L et livraison.',
    icon: Wallet,
    iconBg: 'bg-amber-50 dark:bg-amber-950/30',
    iconColor: 'text-amber-600',
    path: '/board/pricing',
    cta: 'Configurer les tarifs',
  },
  {
    label: 'Catégories',
    description: 'Organisez vos fruits par catégories (citrus, tropical…).',
    icon: Tag,
    iconBg: 'bg-primary/5',
    iconColor: 'text-primary',
    path: '/board/categories',
    cta: 'Gérer les catégories',
  },
];

export function AdminHome({ name }: Props) {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: getAdminStats,
    staleTime: 60_000,
  });

  const statCards = [
    {
      label: 'Fruits',
      value: stats?.fruitsCount ?? 0,
      icon: Apple,
      path: '/board/fruits',
      color: 'text-orange-500',
      bg: 'bg-orange-50 dark:bg-orange-950/30 border-orange-100',
    },
    {
      label: 'Cocktails',
      value: stats?.catalogueCocktailsCount ?? 0,
      icon: GlassWater,
      path: '/board/cocktails',
      color: 'text-primary',
      bg: 'bg-primary/10 border-primary/20',
    },
    {
      label: 'Commandes',
      value: stats?.ordersCount ?? 0,
      icon: ShoppingBag,
      path: '/board/orders',
      color: 'text-secondary',
      bg: 'bg-secondary/10 border-secondary/20',
    },
    {
      label: 'Utilisateurs',
      value: stats?.usersCount ?? 0,
      icon: Users,
      path: '/board/users',
      color: 'text-violet-500',
      bg: 'bg-violet-50 dark:bg-violet-950/30 border-violet-100',
    },
  ];

  return (
    <BoardPageShell
      eyebrow="Tableau de bord"
      titleBefore="Bonjour,"
      titleHighlight={name}
      sectionBefore="Centre de"
      sectionHighlight="contrôle"
      subtitle="Vue d'ensemble de l'activité FYS."
      imageUrl="https://images.pexels.com/photos/1267320/pexels-photo-1267320.jpeg?auto=compress&cs=tinysrgb&w=1200"
    >
      <div className="space-y-10 max-w-7xl mx-auto w-full overflow-x-hidden">
      {/* ── KPI CARDS ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {statCards.map((s) => {
          const Icon = s.icon;
          return (
            <Link key={s.label} to={s.path} className="block group min-w-0">
              <div className="bg-card rounded-[2rem] p-5 md:p-6 border border-border/40 shadow-sm transition-all duration-300 group-hover:shadow-lg group-hover:-translate-y-1.5 flex flex-col justify-between h-full relative overflow-hidden">
                <div className={`absolute -right-4 -top-4 size-24 rounded-full ${s.bg} blur-2xl opacity-50 pointer-events-none transition-opacity group-hover:opacity-100`} />
                <div className={`size-12 rounded-[1rem] ${s.bg} border flex items-center justify-center mb-6 relative z-10`}>
                  <Icon className={`size-6 ${s.color}`} strokeWidth={2.5} />
                </div>
                <div className="relative z-10 mt-auto min-w-0">
                  {isLoading ? (
                    <Loader2 className="size-6 text-muted-foreground animate-spin mb-1" />
                  ) : (
                    <p className="font-display font-extrabold text-3xl md:text-4xl text-foreground mb-1 truncate">{s.value}</p>
                  )}
                  <p className="text-sm font-semibold text-muted-foreground">{s.label}</p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* ── CHARTS & STATUS ── */}
      <div className="grid lg:grid-cols-3 gap-6">
        
        {/* BIG REVENUE METRIC */}
        <div className="lg:col-span-1 bg-card rounded-[2rem] border border-border/40 shadow-sm p-6 md:p-8 flex flex-col justify-center relative overflow-hidden group min-w-0">
          <div className="absolute right-0 bottom-0 size-48 rounded-full bg-emerald-500/5 blur-3xl pointer-events-none group-hover:bg-emerald-500/10 transition-colors" />
          <div className="flex items-center gap-3 mb-6 relative z-10">
            <div className="size-12 rounded-[1rem] bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0">
               <TrendingUp className="size-6 text-emerald-500" strokeWidth={2.5} />
            </div>
            <p className="font-semibold text-muted-foreground uppercase tracking-widest text-xs">Chiffre d&apos;Affaires</p>
          </div>
          <div className="relative z-10 min-w-0">
            {isLoading ? (
              <Loader2 className="size-8 text-muted-foreground animate-spin" />
            ) : (
              <p className="font-display font-extrabold text-3xl md:text-4xl lg:text-5xl text-foreground break-words">
                {(stats?.totalRevenue ?? 0).toLocaleString()}{' '}
                <span className="text-xl md:text-2xl text-muted-foreground font-medium">XAF</span>
              </p>
            )}
            <p className="text-sm text-emerald-600 font-medium mt-3 bg-emerald-50 inline-flex px-3 py-1 rounded-full border border-emerald-100">
               Commandes livrées uniquement
            </p>
          </div>
        </div>

        {/* ORDERS BY STATUS */}
        <div className="lg:col-span-2 bg-card rounded-[2rem] border border-border/40 shadow-sm p-6 md:p-8 min-w-0 overflow-hidden">
           <h3 className="font-display font-bold text-xl text-foreground mb-6">Répartition des Commandes</h3>
           <div className="space-y-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="size-8 text-muted-foreground animate-spin" />
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 gap-x-8 gap-y-4">
                 {STATUS_ORDER.map((status) => {
                  const cfg = STATUS_CONFIG[status];
                  const count = stats?.ordersByStatus?.[status] ?? 0;
                  const total = stats?.ordersCount ?? 0;
                  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                  if (count === 0 && total > 0) return null;
                  
                  return (
                    <div key={status} className="flex items-center gap-3 bg-muted/30 p-3 rounded-2xl border border-border/30 min-w-0">
                      <div className="size-10 rounded-xl bg-background border flex items-center justify-center shrink-0 shadow-sm">
                         <cfg.icon className="size-5 text-muted-foreground drop-shadow-sm" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className={`size-2 rounded-full ${cfg.dot} shrink-0`} />
                          <span className="text-sm font-semibold text-foreground truncate">{cfg.label}</span>
                        </div>
                        <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                           <div className={`h-full ${cfg.dot}`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                         <span className="block text-lg font-bold text-foreground leading-none">{count}</span>
                         <span className="text-xs font-semibold text-muted-foreground">{pct}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            {!isLoading && stats?.ordersCount === 0 && (
              <p className="text-sm font-medium text-muted-foreground text-center py-4 bg-muted/50 rounded-2xl">
                 Aucune donnée de commande.
              </p>
            )}
           </div>
        </div>
      </div>

      {/* ── BOTTOM SECTION: RECENT ACTIVITY & QUICK ACTIONS ── */}
      <div className="grid lg:grid-cols-3 gap-6 items-start">
        
        {/* RECENT ORDERS LIST */}
        <div className="lg:col-span-2 bg-card rounded-[2.5rem] border border-border/40 shadow-sm p-5 md:p-8 min-w-0 overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 md:mb-8">
             <div className="min-w-0">
               <h3 className="font-display font-bold text-xl md:text-2xl text-foreground">Activité Récente</h3>
               <p className="text-muted-foreground font-medium mt-1 text-sm">Vos 5 dernières commandes reçues.</p>
             </div>
             <Button asChild size="sm" className="rounded-full bg-secondary/10 text-secondary hover:bg-secondary hover:text-white font-bold transition-colors shrink-0 self-start sm:self-auto">
                <Link to="/board/orders" className="inline-flex items-center gap-1.5">
                  Voir tout <ArrowRight className="size-4" />
                </Link>
             </Button>
          </div>

          <div className="min-w-0">
             {isLoading ? (
               <div className="flex items-center justify-center py-12">
                 <Loader2 className="size-8 text-muted-foreground animate-spin" />
               </div>
             ) : stats?.recentOrders?.length ? (
               <div className="space-y-2">
                 {stats.recentOrders.map((order) => (
                   <div key={order.id} className="bg-muted/20 hover:bg-muted/40 transition-colors rounded-2xl p-3 border border-border/30 min-w-0 overflow-hidden">
                     <RecentOrderRow order={order} />
                   </div>
                 ))}
               </div>
             ) : (
               <div className="flex flex-col items-center justify-center py-16 gap-4 text-center bg-muted/20 rounded-3xl border border-dashed border-border/60">
                 <div className="size-16 rounded-full bg-background border flex items-center justify-center shadow-sm">
                   <AlertCircle className="size-6 text-muted-foreground" />
                 </div>
                 <p className="text-base font-semibold text-muted-foreground">Aucune commande pour le moment.</p>
               </div>
             )}
          </div>
        </div>

        {/* QUICK ACTIONS */}
        <div className="space-y-4 min-w-0">
           <h3 className="font-display font-bold text-xl text-foreground mb-2">Actions Rapides</h3>
           {quickActions.map((a) => {
            const Icon = a.icon;
            return (
              <div key={a.label} className="bg-card rounded-[2rem] border border-border/40 p-5 shadow-sm group hover:shadow-md transition-shadow min-w-0 overflow-hidden">
                <div className="flex gap-4 min-w-0">
                  <div className={`size-12 rounded-[1rem] ${a.iconBg} border border-border/50 flex items-center justify-center shrink-0`}>
                    <Icon className={`size-5 ${a.iconColor}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="font-bold text-foreground text-lg">{a.label}</h4>
                    <p className="text-sm font-medium text-muted-foreground leading-snug mt-1 mb-4">{a.description}</p>
                    <Link to={a.path} className="inline-flex items-center text-sm font-bold text-primary hover:text-primary/80 transition-colors">
                      {a.cta} <ArrowRight className="size-3.5 ml-1.5 transition-transform group-hover:translate-x-1" />
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

      </div>
      </div>
    </BoardPageShell>
  );
}
