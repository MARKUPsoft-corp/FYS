import { PageComponent } from 'rasengan';
import { Users as UsersIcon, ShieldCheck, User } from 'lucide-react';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
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
    <div className="space-y-8 max-w-7xl mx-auto px-3 md:px-4 lg:px-6 pt-6 lg:pt-10 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
           <p className="text-sm text-muted-foreground font-semibold uppercase tracking-widest pl-1 mb-2">Communauté</p>
          <h2 className="font-display font-bold text-4xl text-foreground leading-[1.1]">Utilisateurs</h2>
          <p className="text-muted-foreground text-lg font-medium mt-3">
            Gérez vos clients et administrateurs.
          </p>
        </div>
        {!isLoading && users.length > 0 && (
          <div className="flex flex-col gap-3 shrink-0 items-end">
            <div className="flex items-center gap-3">
              <div className="text-center bg-card rounded-2xl border border-border/40 p-3 shadow-sm min-w-[80px]">
                <p className="font-display font-extrabold text-2xl text-primary">{adminCount}</p>
                <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wide mt-0.5">Admins</p>
              </div>
              <div className="text-center bg-card rounded-2xl border border-border/40 p-3 shadow-sm min-w-[80px]">
                <p className="font-display font-extrabold text-2xl text-violet-500">{customerCount}</p>
                <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wide mt-0.5">Clients</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs font-semibold text-muted-foreground mr-1">Afficher:</span>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as any)}
                className="h-10 px-4 rounded-xl border border-border/40 bg-card shadow-sm text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all hover:bg-accent cursor-pointer appearance-none"
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
      <div className="bg-card rounded-[2rem] border border-border/40 shadow-sm overflow-hidden">
        <div>
          {isLoading ? (
            <div className="px-5 divide-y divide-border/40">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="py-4 flex gap-4 w-full items-center">
                  <div className="size-10 rounded-full bg-muted animate-pulse shrink-0" />
                  <div className="space-y-2 flex-1">
                    <div className="h-4 w-1/3 bg-muted animate-pulse rounded" />
                    <div className="h-3 w-1/4 bg-muted animate-pulse rounded" />
                  </div>
                  <div className="h-6 w-20 rounded-full bg-muted animate-pulse shrink-0" />
                </div>
              ))}
            </div>
          ) : visibleUsers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
              <div className="size-16 rounded-full bg-violet-50 dark:bg-violet-950/30 border border-violet-100 flex items-center justify-center">
                <UsersIcon className="size-6 text-violet-400" />
              </div>
              <p className="text-lg font-bold text-foreground mt-2">Aucun utilisateur</p>
              <p className="text-sm text-muted-foreground font-medium max-w-[280px]">
                {filterType === 'online' ? "Personne n'est en ligne actuellement." : "Les utilisateurs inscrits apparaîtront ici."}
              </p>
            </div>
          ) : (
            <div className="px-2 pb-2">
              {visibleUsers.map((user) => (
                <UserCard key={user.uid} user={user} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

Users.metadata = {
  title: 'FYS — Utilisateurs',
  description: 'Gestion des utilisateurs FYS.',
};

export default Users;
