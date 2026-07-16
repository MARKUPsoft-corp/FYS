import { Link } from 'rasengan';
import {
  GlassWater, Apple, ShoppingBag, Users, Tag, ArrowRight,
  TrendingUp, Loader2, Clock, CheckCircle2, Truck, Package,
  XCircle, AlertCircle,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getAdminStats } from '@/services/stats';
import { OrderStatus } from '@/entities';
import type { Order } from '@/entities';

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
    <div className="flex items-center gap-3 py-3 border-b border-border/40 last:border-0">
      <div className="size-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
        <span className="text-primary font-bold text-sm">
          {order.userNameSnapshot.slice(0, 1).toUpperCase()}
        </span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-foreground truncate">{order.userNameSnapshot}</p>
        <p className="text-xs text-muted-foreground truncate">{order.cocktailNameSnapshot}</p>
      </div>
      <div className="shrink-0 text-right space-y-0.5">
        <StatusBadge status={order.status} />
        <p className="text-xs text-muted-foreground">{dateStr}</p>
      </div>
      <div className="shrink-0 text-right">
        <p className="text-sm font-bold text-foreground tabular-nums">
          {order.totalPrice.toLocaleString()} XAF
        </p>
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
      bg: 'bg-orange-50 dark:bg-orange-950/30',
    },
    {
      label: 'Cocktails',
      value: stats?.catalogueCocktailsCount ?? 0,
      icon: GlassWater,
      path: '/board/cocktails',
      color: 'text-primary',
      bg: 'bg-primary/5',
    },
    {
      label: 'Commandes',
      value: stats?.ordersCount ?? 0,
      icon: ShoppingBag,
      path: '/board/orders',
      color: 'text-secondary',
      bg: 'bg-secondary/10',
    },
    {
      label: 'Utilisateurs',
      value: stats?.usersCount ?? 0,
      icon: Users,
      path: '/board/users',
      color: 'text-violet-500',
      bg: 'bg-violet-50 dark:bg-violet-950/30',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <p className="text-sm text-muted-foreground">Bonjour,</p>
        <h2 className="font-display font-semibold text-3xl text-foreground mt-0.5">{name} 👋</h2>
        <p className="text-muted-foreground mt-1 text-sm">Voici un aperçu de votre application.</p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((s) => {
          const Icon = s.icon;
          return (
            <Link key={s.label} to={s.path} className="block group">
              <Card className="transition-all duration-200 group-hover:shadow-md group-hover:-translate-y-0.5">
                <CardContent className="pt-5 pb-4">
                  <div className={`size-10 rounded-xl ${s.bg} flex items-center justify-center mb-3`}>
                    <Icon className={`size-5 ${s.color}`} />
                  </div>
                  {isLoading ? (
                    <Loader2 className="size-5 text-muted-foreground animate-spin mb-1" />
                  ) : (
                    <p className="font-display font-bold text-3xl text-foreground">{s.value}</p>
                  )}
                  <p className="text-sm text-muted-foreground mt-0.5">{s.label}</p>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      {/* Revenue + Orders by status */}
      <div className="grid sm:grid-cols-2 gap-4">
        {/* Revenue */}
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="size-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center mb-3">
              <TrendingUp className="size-5 text-emerald-500" />
            </div>
            {isLoading ? (
              <Loader2 className="size-5 text-muted-foreground animate-spin mb-1" />
            ) : (
              <p className="font-display font-bold text-2xl text-foreground">
                {(stats?.totalRevenue ?? 0).toLocaleString()} XAF
              </p>
            )}
            <p className="text-sm text-muted-foreground mt-0.5">Chiffre d'affaires (livré)</p>
          </CardContent>
        </Card>

        {/* Orders by status */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="font-display text-sm text-muted-foreground font-semibold uppercase tracking-wider">
              Commandes par statut
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-2">
            {isLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="size-5 text-muted-foreground animate-spin" />
              </div>
            ) : (
              STATUS_ORDER.map((status) => {
                const cfg = STATUS_CONFIG[status];
                const count = stats?.ordersByStatus?.[status] ?? 0;
                const total = stats?.ordersCount ?? 0;
                const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                if (count === 0) return null;
                return (
                  <div key={status} className="flex items-center gap-2">
                    <span className={`size-2 rounded-full ${cfg.dot} shrink-0`} />
                    <span className="text-xs text-muted-foreground flex-1">{cfg.label}</span>
                    <span className="text-xs font-bold text-foreground tabular-nums">{count}</span>
                    <span className="text-xs text-muted-foreground w-7 text-right">{pct}%</span>
                  </div>
                );
              })
            )}
            {!isLoading && stats?.ordersCount === 0 && (
              <p className="text-xs text-muted-foreground text-center py-2">Aucune commande</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick actions */}
      <div className="grid sm:grid-cols-2 gap-4">
        {quickActions.map((a) => {
          const Icon = a.icon;
          return (
            <Card key={a.label}>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <div className={`size-8 rounded-lg ${a.iconBg} flex items-center justify-center`}>
                    <Icon className={`size-4 ${a.iconColor}`} />
                  </div>
                  <CardTitle className="text-base font-display">{a.label}</CardTitle>
                </div>
                <CardDescription>{a.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild size="sm" variant="outline" className="w-full">
                  <Link to={a.path}>
                    {a.cta}
                    <ArrowRight className="size-3" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Recent orders */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div>
            <CardTitle className="font-display text-base">Activité récente</CardTitle>
            <CardDescription>Les 5 dernières commandes passées sur la plateforme.</CardDescription>
          </div>
          <Button asChild size="sm" variant="ghost" className="text-primary hover:text-primary/80 gap-1">
            <Link to="/board/orders">
              Voir tout <ArrowRight className="size-3" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="size-6 text-muted-foreground animate-spin" />
            </div>
          ) : stats?.recentOrders?.length ? (
            <div>
              {stats.recentOrders.map((order) => (
                <RecentOrderRow key={order.id} order={order} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 gap-3 text-center">
              <div className="size-12 rounded-full bg-muted flex items-center justify-center">
                <AlertCircle className="size-5 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">Aucune commande pour le moment.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
