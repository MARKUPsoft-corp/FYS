import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Mail, Phone, ShieldCheck, User, Clock, HeartPulse,
  ShoppingBag, FlaskConical, Globe, Lock, Loader2,
  AlertCircle, Calendar, Activity, Wallet, ChevronRight,
} from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { UserRole, OrderStatus } from '@/entities';
import type { User as UserType, Order, Cocktail } from '@/entities';
import { getProfile } from '@/services/profile';
import { getUserOrders } from '@/services/order';
import { getUserCocktails } from '@/services/cocktail';
import { isProfileComplete } from '@/stores/profile';

type Tab = 'overview' | 'health' | 'orders' | 'cocktails';

const ORDER_STATUS: Record<OrderStatus, { label: string; className: string }> = {
  [OrderStatus.PENDING]: { label: 'En attente', className: 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400' },
  [OrderStatus.CONFIRMED]: { label: 'Confirmée', className: 'bg-sky-100 text-sky-800 dark:bg-sky-950/40 dark:text-sky-400' },
  [OrderStatus.PREPARING]: { label: 'En préparation', className: 'bg-violet-100 text-violet-800 dark:bg-violet-950/40 dark:text-violet-400' },
  [OrderStatus.READY]: { label: 'Prête', className: 'bg-primary/15 text-primary' },
  [OrderStatus.DELIVERED]: { label: 'Livrée', className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400' },
  [OrderStatus.CANCELLED]: { label: 'Annulée', className: 'bg-muted text-muted-foreground' },
};

function formatTs(ts: { toDate?: () => Date; seconds?: number } | null | undefined): string {
  if (!ts) return '—';
  const d = ts.toDate?.() ?? (ts.seconds ? new Date(ts.seconds * 1000) : null);
  if (!d) return '—';
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatDateTime(ts: { toDate?: () => Date; seconds?: number } | null | undefined): string {
  if (!ts) return '—';
  const d = ts.toDate?.() ?? (ts.seconds ? new Date(ts.seconds * 1000) : null);
  if (!d) return '—';
  return d.toLocaleString('fr-FR', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

function isUserOnline(user: UserType): boolean {
  if (!user.lastActiveAt) return false;
  const d = user.lastActiveAt.toDate?.();
  if (!d) return false;
  return Date.now() - d.getTime() < 5 * 60 * 1000;
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2.5">
      {children}
    </p>
  );
}

function EmptyBlock({ icon: Icon, message }: { icon: React.ElementType; message: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border/50 bg-muted/20 px-4 py-8 flex flex-col items-center text-center gap-2">
      <Icon className="size-6 text-muted-foreground/50" />
      <p className="text-[13px] text-muted-foreground font-medium max-w-[240px]">{message}</p>
    </div>
  );
}

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-2xl border border-border/50 bg-card p-3.5">
      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className="font-display font-bold text-xl text-foreground mt-1 tabular-nums">{value}</p>
      {sub && <p className="text-[11px] text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}

function ProfileTags({ items, emptyLabel }: { items: string[]; emptyLabel: string }) {
  if (!items.length) {
    return <p className="text-[13px] text-muted-foreground italic">{emptyLabel}</p>;
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((item) => (
        <span
          key={item}
          className="inline-flex px-2.5 py-1 rounded-full bg-primary/10 text-primary text-[12px] font-semibold"
        >
          {item}
        </span>
      ))}
    </div>
  );
}

function OrderRow({ order }: { order: Order }) {
  const cfg = ORDER_STATUS[order.status];
  return (
    <div className="rounded-2xl border border-border/50 bg-card p-4 space-y-2">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold text-foreground truncate">{order.cocktailNameSnapshot}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1">
            <Clock className="size-3 shrink-0" />
            {formatDateTime(order.createdAt)}
          </p>
        </div>
        <span className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold ${cfg.className}`}>
          {cfg.label}
        </span>
      </div>
      <div className="flex items-center justify-between text-[12px]">
        <span className="text-muted-foreground">
          {order.quantity}× {order.bottleSizeLabel ?? '50 cl'}
        </span>
        <span className="font-bold text-foreground tabular-nums">
          {order.totalPrice.toLocaleString()} XAF
        </span>
      </div>
      {order.deliveryDetails && (
        <p className="text-[11px] text-muted-foreground truncate">
          📍 {order.deliveryDetails.district} · {order.deliveryDetails.phone}
        </p>
      )}
    </div>
  );
}

function CocktailRow({ cocktail }: { cocktail: Cocktail }) {
  const verdict = cocktail.aiAnalysis?.verdict;
  return (
    <div className="rounded-2xl border border-border/50 bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold text-foreground truncate">{cocktail.name}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">
            {cocktail.ingredients.map((i) => i.fruitName).join(' · ')}
          </p>
        </div>
        {cocktail.isPublic ? (
          <span className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400 text-[10px] font-bold">
            <Globe className="size-3" /> Public
          </span>
        ) : (
          <span className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-[10px] font-bold">
            <Lock className="size-3" /> Privé
          </span>
        )}
      </div>
      <div className="flex items-center justify-between mt-2 text-[12px]">
        <span className="text-muted-foreground">
          {cocktail.ingredients.length} ingrédient{cocktail.ingredients.length > 1 ? 's' : ''}
          {verdict ? ` · NutriFYS ${verdict}` : ''}
        </span>
        <span className="font-bold text-primary tabular-nums">
          {cocktail.totalPrice > 0 ? `${cocktail.totalPrice.toLocaleString()} XAF` : '—'}
        </span>
      </div>
    </div>
  );
}

type Props = {
  user: UserType | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function UserDetailSheet({ user, open, onOpenChange }: Props) {
  const [tab, setTab] = useState<Tab>('overview');

  const { data: healthProfile, isLoading: healthLoading } = useQuery({
    queryKey: ['admin-profile', user?.uid],
    queryFn: () => getProfile(user!.uid),
    enabled: !!user && open,
    staleTime: 30_000,
  });

  const { data: orders = [], isLoading: ordersLoading } = useQuery({
    queryKey: ['admin-user-orders', user?.uid],
    queryFn: () => getUserOrders(user!.uid),
    enabled: !!user && open,
    staleTime: 30_000,
  });

  const { data: cocktails = [], isLoading: cocktailsLoading } = useQuery({
    queryKey: ['admin-user-cocktails', user?.uid],
    queryFn: () => getUserCocktails(user!.uid),
    enabled: !!user && open,
    staleTime: 30_000,
  });

  if (!user) return null;

  const initials = user.name.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase();
  const online = isUserOnline(user);
  const isAdmin = user.role === UserRole.ADMIN;
  const profileComplete = isProfileComplete(healthProfile ?? null);

  const deliveredOrders = orders.filter((o) => o.status === OrderStatus.DELIVERED);
  const totalSpent = deliveredOrders.reduce((s, o) => s + o.totalPrice, 0);
  const activeOrders = orders.filter((o) => o.status !== OrderStatus.CANCELLED && o.status !== OrderStatus.DELIVERED);
  const publicCocktails = cocktails.filter((c) => c.isPublic).length;

  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: 'overview', label: 'Aperçu' },
    { id: 'health', label: 'Santé' },
    { id: 'orders', label: 'Commandes', count: orders.length },
    { id: 'cocktails', label: 'Cocktails', count: cocktails.length },
  ];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full max-w-[520px] p-0 flex flex-col">
        <SheetHeader className="px-6 pt-6 pb-4 shrink-0 border-b border-border/40">
          <div className="flex items-start gap-4">
            <div className="relative shrink-0">
              <div className={`size-14 rounded-2xl flex items-center justify-center font-bold text-lg ${
                isAdmin
                  ? 'bg-primary/15 text-primary'
                  : 'bg-violet-100 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400'
              }`}>
                {initials}
              </div>
              {online && (
                <span className="absolute -bottom-0.5 -right-0.5 size-3.5 rounded-full bg-emerald-500 border-2 border-background" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <SheetTitle className="font-display text-xl font-bold text-foreground leading-tight">
                {user.name}
              </SheetTitle>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                {isAdmin ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold">
                    <ShieldCheck className="size-2.5" /> Admin
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-violet-100 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400 text-[10px] font-bold">
                    <User className="size-2.5" /> Client
                  </span>
                )}
                {online ? (
                  <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">En ligne</span>
                ) : (
                  <span className="text-[10px] text-muted-foreground">Hors ligne</span>
                )}
              </div>
            </div>
          </div>

          <div className="flex gap-1 bg-muted rounded-xl p-1 mt-4 overflow-x-auto">
            {tabs.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`flex-1 min-w-0 flex items-center justify-center gap-1 py-2 px-2 rounded-lg text-[11px] font-semibold transition-all whitespace-nowrap ${
                  tab === t.id
                    ? 'bg-background shadow-sm text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {t.label}
                {t.count !== undefined && t.count > 0 && (
                  <span className="text-[9px] font-bold bg-primary/15 text-primary px-1.5 py-0.5 rounded-full">
                    {t.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {tab === 'overview' && (
            <>
              <div>
                <SectionLabel>Coordonnées</SectionLabel>
                <div className="rounded-2xl border border-border/50 bg-card divide-y divide-border/40 overflow-hidden">
                  <a href={`mailto:${user.email}`} className="flex items-center gap-3 px-4 py-3.5 hover:bg-accent/30 transition-colors">
                    <Mail className="size-4 text-muted-foreground shrink-0" />
                    <span className="text-[13px] text-foreground truncate">{user.email}</span>
                  </a>
                  {user.phone ? (
                    <a href={`tel:${user.phone}`} className="flex items-center gap-3 px-4 py-3.5 hover:bg-accent/30 transition-colors">
                      <Phone className="size-4 text-primary shrink-0" />
                      <span className="text-[13px] font-semibold text-primary">{user.phone}</span>
                    </a>
                  ) : (
                    <div className="flex items-center gap-3 px-4 py-3.5 text-muted-foreground">
                      <Phone className="size-4 shrink-0" />
                      <span className="text-[13px] italic">Téléphone non renseigné</span>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <SectionLabel>Activité</SectionLabel>
                <div className="grid grid-cols-2 gap-3">
                  <StatCard label="Commandes" value={orders.length} sub={`${activeOrders.length} en cours`} />
                  <StatCard label="CA livré" value={`${totalSpent.toLocaleString()} XAF`} sub={`${deliveredOrders.length} livrée(s)`} />
                  <StatCard label="Cocktails" value={cocktails.length} sub={`${publicCocktails} public(s)`} />
                  <StatCard
                    label="Profil santé"
                    value={profileComplete ? 'Complet' : healthProfile ? 'Partiel' : 'Absent'}
                    sub={healthProfile ? `MAJ ${formatTs(healthProfile.updatedAt)}` : 'Non renseigné'}
                  />
                </div>
              </div>

              <div>
                <SectionLabel>Historique compte</SectionLabel>
                <div className="rounded-2xl border border-border/50 bg-card p-4 space-y-3">
                  <div className="flex items-center gap-3 text-[13px]">
                    <Calendar className="size-4 text-muted-foreground shrink-0" />
                    <span className="text-muted-foreground">Inscription</span>
                    <span className="ml-auto font-semibold text-foreground">{formatTs(user.createdAt)}</span>
                  </div>
                  <div className="flex items-center gap-3 text-[13px]">
                    <Activity className="size-4 text-muted-foreground shrink-0" />
                    <span className="text-muted-foreground">Dernière activité</span>
                    <span className="ml-auto font-semibold text-foreground">{formatDateTime(user.lastActiveAt)}</span>
                  </div>
                </div>
              </div>

              {orders[0] && (
                <div>
                  <SectionLabel>Dernière commande</SectionLabel>
                  <OrderRow order={orders[0]} />
                </div>
              )}
            </>
          )}

          {tab === 'health' && (
            <>
              {healthLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="size-6 animate-spin text-primary" />
                </div>
              ) : !healthProfile ? (
                <EmptyBlock
                  icon={HeartPulse}
                  message="Ce client n'a pas encore renseigné son profil de santé."
                />
              ) : (
                <div className="space-y-5">
                  {!profileComplete && (
                    <div className="rounded-2xl border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800 px-4 py-3 flex gap-3">
                      <AlertCircle className="size-4 text-amber-600 shrink-0 mt-0.5" />
                      <p className="text-[12px] text-amber-800 dark:text-amber-300 font-medium">
                        Profil incomplet — les recommandations NutriFYS restent génériques.
                      </p>
                    </div>
                  )}

                  <div>
                    <SectionLabel>Conditions de santé</SectionLabel>
                    <ProfileTags
                      items={healthProfile.healthConditions}
                      emptyLabel="Aucune condition renseignée"
                    />
                  </div>

                  <div>
                    <SectionLabel>Allergies</SectionLabel>
                    <ProfileTags
                      items={healthProfile.allergies}
                      emptyLabel="Aucune allergie renseignée"
                    />
                  </div>

                  <div>
                    <SectionLabel>Objectifs</SectionLabel>
                    <ProfileTags
                      items={healthProfile.goals ?? []}
                      emptyLabel="Aucun objectif renseigné"
                    />
                  </div>

                  <p className="text-[11px] text-muted-foreground text-center">
                    Dernière mise à jour : {formatDateTime(healthProfile.updatedAt)}
                  </p>
                </div>
              )}
            </>
          )}

          {tab === 'orders' && (
            <>
              {ordersLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="size-6 animate-spin text-primary" />
                </div>
              ) : orders.length === 0 ? (
                <EmptyBlock icon={ShoppingBag} message="Aucune commande pour cet utilisateur." />
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between rounded-2xl bg-primary/5 border border-primary/20 px-4 py-3">
                    <span className="text-[12px] font-semibold text-foreground flex items-center gap-2">
                      <Wallet className="size-4 text-primary" />
                      Total livré
                    </span>
                    <span className="font-bold text-primary tabular-nums">
                      {totalSpent.toLocaleString()} XAF
                    </span>
                  </div>
                  {orders.map((order) => (
                    <OrderRow key={order.id} order={order} />
                  ))}
                </div>
              )}
            </>
          )}

          {tab === 'cocktails' && (
            <>
              {cocktailsLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="size-6 animate-spin text-primary" />
                </div>
              ) : cocktails.length === 0 ? (
                <EmptyBlock icon={FlaskConical} message="Aucun cocktail personnalisé créé." />
              ) : (
                <div className="space-y-3">
                  {cocktails.map((c) => (
                    <CocktailRow key={c.id} cocktail={c} />
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        <div className="shrink-0 border-t border-border/40 px-6 py-4">
          <Button variant="outline" className="w-full rounded-2xl" onClick={() => onOpenChange(false)}>
            Fermer
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export function UserMonitoringCard({
  user,
  onClick,
}: {
  user: UserType;
  onClick: () => void;
}) {
  const initials = user.name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

  const joinedDate = user.createdAt?.toDate?.();
  const joinedStr = joinedDate
    ? joinedDate.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
    : '—';

  const isAdmin = user.role === UserRole.ADMIN;
  const online = isUserOnline(user);

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center gap-4 py-4 border-b border-border/40 last:border-0 hover:bg-accent/30 px-4 rounded-xl -mx-4 transition-colors text-left group"
    >
      <div className="relative shrink-0">
        <div className={`size-11 rounded-full flex items-center justify-center font-bold text-sm ${
          isAdmin
            ? 'bg-primary/15 text-primary'
            : 'bg-violet-100 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400'
        }`}>
          {initials}
        </div>
        {online && (
          <span className="absolute bottom-0 right-0 size-3 rounded-full bg-emerald-500 border-2 border-background ring-1 ring-emerald-500 shadow-sm" title="En ligne" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-semibold text-foreground truncate">{user.name}</p>
          {isAdmin ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold">
              <ShieldCheck className="size-2.5" /> Admin
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-violet-100 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400 text-[10px] font-bold">
              <User className="size-2.5" /> Client
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground truncate mt-0.5">{user.email}</p>
        {user.phone && (
          <p className="text-xs text-muted-foreground mt-0.5">{user.phone}</p>
        )}
      </div>

      <div className="shrink-0 flex items-center gap-3">
        <div className="text-right hidden sm:block">
          <p className="text-xs text-muted-foreground">Inscrit le</p>
          <p className="text-xs font-medium text-foreground">{joinedStr}</p>
        </div>
        <ChevronRight className="size-4 text-muted-foreground group-hover:text-primary transition-colors" />
      </div>
    </button>
  );
}
