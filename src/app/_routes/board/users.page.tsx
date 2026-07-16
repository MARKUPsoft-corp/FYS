import { PageComponent } from 'rasengan';
import { Users as UsersIcon, Loader2, ShieldCheck, User } from 'lucide-react';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { getUsers } from '@/services/stats';
import { UserRole } from '@/entities';
import type { User as UserType } from '@/entities';

// ── User card ────────────────────────────────────────────────────────────────

function UserCard({ user }: { user: UserType }) {
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
  
  const isOnline = user.lastActiveAt
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ? Date.now() - (user.lastActiveAt as any).toDate().getTime() < 5 * 60 * 1000
    : false;

  return (
    <div className="flex items-center gap-4 py-4 border-b border-border/40 last:border-0 hover:bg-accent/20 px-4 rounded-xl -mx-4 transition-colors">
      {/* Avatar */}
      <div className="relative shrink-0">
        <div className={`size-11 rounded-full flex items-center justify-center font-bold text-sm ${
          isAdmin
            ? 'bg-primary/15 text-primary'
            : 'bg-violet-100 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400'
        }`}>
          {initials}
        </div>
        {isOnline && (
          <span className="absolute bottom-0 right-0 size-3 rounded-full bg-emerald-500 border-2 border-background ring-1 ring-emerald-500 shadow-sm" title="En ligne" />
        )}
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-semibold text-foreground truncate">{user.name}</p>
          <RoleBadge role={user.role} />
        </div>
        <p className="text-xs text-muted-foreground truncate mt-0.5">{user.email}</p>
        {user.phone && (
          <p className="text-xs text-muted-foreground mt-0.5">{user.phone}</p>
        )}
      </div>

      {/* Date */}
      <div className="shrink-0 text-right">
        <p className="text-xs text-muted-foreground">Inscrit le</p>
        <p className="text-xs font-medium text-foreground">{joinedStr}</p>
      </div>
    </div>
  );
}

function RoleBadge({ role }: { role: UserRole }) {
  if (role === UserRole.ADMIN) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold">
        <ShieldCheck className="size-2.5" />
        Admin
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-violet-100 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400 text-[10px] font-bold">
      <User className="size-2.5" />
      Client
    </span>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

const Users: PageComponent = () => {
  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: getUsers,
    staleTime: 60_000,
  });

  const [filterType, setFilterType] = useState<'all' | 'recent' | 'online' | 'alpha'>('recent');

  const adminCount = users.filter((u) => u.role === UserRole.ADMIN).length;
  const customerCount = users.filter((u) => u.role === UserRole.CUSTOMER).length;

  const visibleUsers = [...users]
    .sort((a, b) => {
      if (filterType === 'alpha') return a.name.localeCompare(b.name);
      // default recent
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const dateA = (a.createdAt as any)?.seconds || 0;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const dateB = (b.createdAt as any)?.seconds || 0;
      return dateB - dateA;
    })
    .filter((u) => {
      if (filterType === 'online') {
        return u.lastActiveAt && 
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          Date.now() - (u.lastActiveAt as any).toDate().getTime() < 5 * 60 * 1000;
      }
      return true;
    });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-display font-semibold text-2xl text-foreground">Utilisateurs</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Liste des comptes clients et administrateurs.
          </p>
        </div>
        {!isLoading && users.length > 0 && (
          <div className="flex flex-col gap-3 shrink-0 items-end">
            <div className="flex items-center gap-3">
              <div className="text-center">
                <p className="font-display font-bold text-xl text-primary">{adminCount}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Admins</p>
              </div>
              <div className="w-px h-8 bg-border" />
              <div className="text-center">
                <p className="font-display font-bold text-xl text-violet-500">{customerCount}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Clients</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs font-semibold text-muted-foreground mr-1">Afficher:</span>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as any)}
                className="h-9 px-3 rounded-xl border border-border/60 bg-card text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all hover:bg-accent cursor-pointer appearance-none"
              >
                <option value="recent">Plus récents</option>
                <option value="online">En ligne actuellement</option>
                <option value="alpha">Ordre alphabétique</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground">
              <Loader2 className="size-5 animate-spin" />
              <span className="text-sm">Chargement des utilisateurs…</span>
            </div>
          ) : visibleUsers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
              <div className="size-14 rounded-full bg-violet-50 dark:bg-violet-950/30 flex items-center justify-center">
                <UsersIcon className="size-6 text-violet-300" />
              </div>
              <p className="text-sm font-medium text-foreground">Aucun utilisateur</p>
              <p className="text-xs text-muted-foreground max-w-[220px]">
                {filterType === 'online' ? "Personne n'est en ligne actuellement." : "Les utilisateurs inscrits apparaîtront ici."}
              </p>
            </div>
          ) : (
            <div className="px-5">
              {visibleUsers.map((user) => (
                <UserCard key={user.uid} user={user} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

Users.metadata = {
  title: 'FYS — Utilisateurs',
  description: 'Gestion des utilisateurs FYS.',
};

export default Users;
