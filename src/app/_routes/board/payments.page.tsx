import { useState, useMemo } from 'react';
import { PageComponent } from 'rasengan';
import {
  CreditCard,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  Phone,
  Smartphone,
  ExternalLink,
  RefreshCw,
  TrendingUp,
  AlertCircle,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'rasengan';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { BoardPageShell } from '@/components/layout/BoardPageShell';
import { getKPayTransactions } from '@/services/kpay';
import type { KPayTransaction, KPayStatus } from '@/entities/kpay';
import { cn } from '@/lib/utils';

// ── Statut config ─────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<KPayStatus, { label: string; icon: React.ElementType; bg: string; text: string; border: string; dot: string }> = {
  COMPLETED: {
    label: 'Payé',
    icon: CheckCircle2,
    bg: 'bg-emerald-50 dark:bg-emerald-950/30',
    text: 'text-emerald-700 dark:text-emerald-400',
    border: 'border-emerald-200 dark:border-emerald-700',
    dot: 'bg-emerald-500',
  },
  FAILED: {
    label: 'Échoué',
    icon: XCircle,
    bg: 'bg-red-50 dark:bg-red-950/30',
    text: 'text-red-700 dark:text-red-400',
    border: 'border-red-200 dark:border-red-700',
    dot: 'bg-red-500',
  },
  CANCELLED: {
    label: 'Annulé',
    icon: XCircle,
    bg: 'bg-gray-50 dark:bg-gray-950/30',
    text: 'text-gray-600 dark:text-gray-400',
    border: 'border-gray-200 dark:border-gray-700',
    dot: 'bg-gray-400',
  },
  PENDING: {
    label: 'En attente',
    icon: Clock,
    bg: 'bg-amber-50 dark:bg-amber-950/30',
    text: 'text-amber-700 dark:text-amber-400',
    border: 'border-amber-200 dark:border-amber-700',
    dot: 'bg-amber-500',
  },
  PROCESSING: {
    label: 'En cours',
    icon: Clock,
    bg: 'bg-sky-50 dark:bg-sky-950/30',
    text: 'text-sky-700 dark:text-sky-400',
    border: 'border-sky-200 dark:border-sky-700',
    dot: 'bg-sky-500',
  },
};

// ── Provider badge ────────────────────────────────────────────────────────────

function ProviderBadge({ provider }: { provider?: string }) {
  if (!provider) return (
    <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-muted-foreground">
      <Smartphone className="size-3" />
      Mobile Money
    </span>
  );

  const isMtn = provider.includes('MTN');

  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 text-[11px] font-bold px-2 py-1 rounded-lg border',
      isMtn
        ? 'bg-yellow-50 border-yellow-200 text-yellow-900 dark:bg-yellow-900/20 dark:border-yellow-700 dark:text-yellow-300'
        : 'bg-orange-50 border-orange-200 text-orange-900 dark:bg-orange-900/20 dark:border-orange-700 dark:text-orange-300',
    )}>
      <img
        src={isMtn ? '/logos/mtn-1.jpg' : '/logos/orange-money.jpg'}
        alt={isMtn ? 'MTN MoMo' : 'Orange Money'}
        className="size-4 rounded object-cover shrink-0"
      />
      {isMtn ? 'MTN MoMo' : 'Orange Money'}
    </span>
  );
}

// ── Status badge ──────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: KPayStatus }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.PENDING;
  const Icon = cfg.icon;
  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full border',
      cfg.bg, cfg.text, cfg.border,
    )}>
      <Icon className="size-3" />
      {cfg.label}
    </span>
  );
}

// ── Stat card — même style que les KPI de l'AdminHome ─────────────────────────

function StatCard({ label, value, sub, icon: Icon, color, bg }: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ElementType;
  color: string;  // ex: 'text-emerald-500'
  bg: string;     // ex: 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-100'
}) {
  return (
    <div className="bg-card rounded-[2rem] p-5 md:p-6 border border-border/40 shadow-sm flex flex-col justify-between h-full relative overflow-hidden min-w-0">
      {/* Glow background */}
      <div className={`absolute -right-4 -top-4 size-24 rounded-full ${bg} blur-2xl opacity-50 pointer-events-none`} />
      {/* Icon */}
      <div className={`size-12 rounded-[1rem] ${bg} border flex items-center justify-center mb-6 relative z-10`}>
        <Icon className={`size-6 ${color}`} strokeWidth={2.5} />
      </div>
      {/* Value + label */}
      <div className="relative z-10 mt-auto min-w-0">
        <p className="font-display font-extrabold text-3xl md:text-4xl text-foreground mb-1 truncate">{value}</p>
        <p className="text-sm font-semibold text-muted-foreground">{label}</p>
        {sub && <p className="text-[11px] text-muted-foreground mt-1">{sub}</p>}
      </div>
    </div>
  );
}

// ── Formatters ────────────────────────────────────────────────────────────────

function formatAmount(amount: number) {
  return new Intl.NumberFormat('fr-CM', { style: 'currency', currency: 'XAF', maximumFractionDigits: 0 }).format(amount);
}

function formatDate(ts: { toDate?: () => Date } | string | null) {
  if (!ts) return '—';
  const d = typeof ts === 'string' ? new Date(ts) : ts.toDate?.() ?? new Date();
  return d.toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function formatPhone(phone: string) {
  // "237670000001" → "+237 670 000 001"
  if (phone.startsWith('237') && phone.length >= 12) {
    return `+237 ${phone.slice(3, 6)} ${phone.slice(6, 9)} ${phone.slice(9)}`;
  }
  return phone;
}

// ── Main page ─────────────────────────────────────────────────────────────────

const STATUS_FILTERS: { label: string; value: KPayStatus | 'ALL' }[] = [
  { label: 'Tous', value: 'ALL' },
  { label: 'Payés', value: 'COMPLETED' },
  { label: 'En attente', value: 'PENDING' },
  { label: 'Échoués', value: 'FAILED' },
  { label: 'Annulés', value: 'CANCELLED' },
];

const Payments: PageComponent = () => {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<KPayStatus | 'ALL'>('ALL');
  const [search, setSearch] = useState('');

  const { data: transactions = [], isLoading, refetch, isFetching } = useQuery({
    queryKey: ['kpay-transactions'],
    queryFn: () => getKPayTransactions(200),
    staleTime: 30_000,
  });

  // Stats
  const stats = useMemo(() => {
    const completed = transactions.filter((t) => t.status === 'COMPLETED');
    const failed = transactions.filter((t) => t.status === 'FAILED' || t.status === 'CANCELLED');
    const pending = transactions.filter((t) => t.status === 'PENDING' || t.status === 'PROCESSING');
    const total = completed.reduce((acc, t) => acc + t.amount, 0);
    return { completed: completed.length, failed: failed.length, pending: pending.length, total };
  }, [transactions]);

  // Filtrage
  const filtered = useMemo(() => {
    let list = transactions;
    if (statusFilter !== 'ALL') list = list.filter((t) => t.status === statusFilter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (t) =>
          t.phoneNumber.includes(q) ||
          t.id.toLowerCase().includes(q) ||
          (t.externalId ?? '').toLowerCase().includes(q) ||
          (t.reference ?? '').toLowerCase().includes(q),
      );
    }
    return list;
  }, [transactions, statusFilter, search]);

  return (
    <BoardPageShell
      eyebrow="Administration"
      titleBefore="Paiements"
      titleHighlight="K-Pay"
      sectionBefore="Historique des"
      sectionHighlight="Transactions"
      subtitle="Toutes les transactions Mobile Money reçues via K-Pay en temps réel"
      imageUrl="https://images.pexels.com/photos/4386431/pexels-photo-4386431.jpeg?auto=compress&cs=tinysrgb&w=1200"
      heroExtra={
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isFetching}
          className="gap-2 text-sm font-semibold bg-white/10 border-white/30 text-white hover:bg-white/20"
        >
          <RefreshCw className={cn('size-4', isFetching && 'animate-spin')} />
          Actualiser
        </Button>
      }
    >
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-6">
        <StatCard
          label="Volume total encaissé"
          value={formatAmount(stats.total)}
          sub={`${stats.completed} transaction(s) réussie(s)`}
          icon={TrendingUp}
          color="text-emerald-500"
          bg="bg-emerald-50 dark:bg-emerald-950/30 border-emerald-100"
        />
        <StatCard
          label="Paiements réussis"
          value={stats.completed}
          icon={CheckCircle2}
          color="text-primary"
          bg="bg-primary/10 border-primary/20"
        />
        <StatCard
          label="En attente"
          value={stats.pending}
          icon={Clock}
          color="text-amber-500"
          bg="bg-amber-50 dark:bg-amber-950/30 border-amber-100"
        />
        <StatCard
          label="Échoués / Annulés"
          value={stats.failed}
          icon={AlertCircle}
          color="text-red-500"
          bg="bg-red-50 dark:bg-red-950/30 border-red-100"
        />
      </div>

      {/* Filtres & Recherche */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setStatusFilter(f.value)}
              className={cn(
                'shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border',
                statusFilter === f.value
                  ? 'bg-primary text-white border-primary shadow-sm'
                  : 'bg-card text-muted-foreground border-border/60 hover:border-primary/40',
              )}
            >
              {f.label}
              {f.value !== 'ALL' && (
                <span className="ml-1.5 opacity-60">
                  ({transactions.filter((t) => t.status === f.value).length})
                </span>
              )}
            </button>
          ))}
        </div>
        <div className="relative flex-1 max-w-sm ml-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher par téléphone, ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-sm rounded-xl"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-card border border-border/60 rounded-2xl overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <RefreshCw className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
            <CreditCard className="size-10 opacity-20" />
            <p className="text-sm font-medium">
              {transactions.length === 0
                ? 'Aucune transaction reçue pour le moment'
                : 'Aucun résultat pour ce filtre'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50 bg-muted/30">
                  <th className="text-left text-[11px] font-bold text-muted-foreground uppercase tracking-widest px-4 py-3">Date</th>
                  <th className="text-left text-[11px] font-bold text-muted-foreground uppercase tracking-widest px-4 py-3">Montant</th>
                  <th className="text-left text-[11px] font-bold text-muted-foreground uppercase tracking-widest px-4 py-3">Opérateur</th>
                  <th className="text-left text-[11px] font-bold text-muted-foreground uppercase tracking-widest px-4 py-3">Téléphone</th>
                  <th className="text-left text-[11px] font-bold text-muted-foreground uppercase tracking-widest px-4 py-3">Statut</th>
                  <th className="text-left text-[11px] font-bold text-muted-foreground uppercase tracking-widest px-4 py-3">Commande</th>
                  <th className="text-left text-[11px] font-bold text-muted-foreground uppercase tracking-widest px-4 py-3">Référence</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {filtered.map((tx) => (
                  <TransactionRow
                    key={tx.id}
                    tx={tx}
                    onViewOrder={(id) => navigate(`/board/orders?orderId=${id}`)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="text-xs text-muted-foreground mt-3 text-right">
        {filtered.length} transaction(s) affichée(s) · URL Webhook :{' '}
        <code className="bg-muted px-1.5 py-0.5 rounded text-[11px]">
          https://fys-app.com/api/webhooks/kpay
        </code>
      </p>
    </BoardPageShell>
  );
};

// ── Transaction row ───────────────────────────────────────────────────────────

function TransactionRow({ tx, onViewOrder }: { tx: KPayTransaction; onViewOrder: (id: string) => void }) {
  return (
    <tr className="hover:bg-muted/20 transition-colors group">
      <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
        {formatDate(tx.receivedAt as any)}
      </td>
      <td className="px-4 py-3">
        <span className={cn(
          'font-bold tabular-nums',
          tx.status === 'COMPLETED' ? 'text-emerald-600 dark:text-emerald-400' : 'text-foreground',
        )}>
          {formatAmount(tx.amount)}
        </span>
      </td>
      <td className="px-4 py-3">
        <ProviderBadge provider={tx.provider} />
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1.5 text-xs">
          <Phone className="size-3 text-muted-foreground shrink-0" />
          <span className="font-mono">{formatPhone(tx.phoneNumber)}</span>
        </div>
      </td>
      <td className="px-4 py-3">
        <StatusBadge status={tx.status} />
        {tx.failureReason && (
          <p className="text-[10px] text-red-500 mt-1">{tx.failureReason}</p>
        )}
      </td>
      <td className="px-4 py-3">
        {tx.externalId ? (
          <button
            type="button"
            onClick={() => onViewOrder(tx.externalId!)}
            className="flex items-center gap-1 text-xs text-primary hover:underline font-semibold"
          >
            {tx.externalId.slice(0, 8)}…
            <ExternalLink className="size-3" />
          </button>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </td>
      <td className="px-4 py-3">
        <span className="text-[11px] text-muted-foreground font-mono">{tx.reference ?? tx.id}</span>
      </td>
    </tr>
  );
}

Payments.metadata = {
  title: 'Paiements K-Pay — FYS Admin',
  description: 'Suivi des transactions Mobile Money reçues via K-Pay',
};

export default Payments;
