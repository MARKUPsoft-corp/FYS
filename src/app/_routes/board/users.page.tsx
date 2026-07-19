import { PageComponent } from 'rasengan';
import { Users as UsersIcon } from 'lucide-react';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getUsers } from '@/services/stats';
import { UserRole } from '@/entities';
import type { User as UserType } from '@/entities';
import { UserDetailSheet, UserMonitoringCard } from '@/components/features/users/UserDetailSheet';
import { BoardPageShell } from '@/components/layout/BoardPageShell';

const FILTER_OPTIONS = [
  { value: 'recent' as const, label: 'Récents' },
  { value: 'online' as const, label: 'En ligne' },
  { value: 'alpha' as const, label: 'A → Z' },
];

const Users: PageComponent = () => {
  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: getUsers,
    staleTime: 60_000,
  });

  const [filterType, setFilterType] = useState<'recent' | 'online' | 'alpha'>('recent');
  const [selectedUser, setSelectedUser] = useState<UserType | null>(null);

  const adminCount = users.filter((u) => u.role === UserRole.ADMIN).length;
  const customerCount = users.filter((u) => u.role === UserRole.CUSTOMER).length;

  const visibleUsers = [...users]
    .sort((a, b) => {
      if (filterType === 'alpha') return a.name.localeCompare(b.name);
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
    <>
      <BoardPageShell
        eyebrow="Communauté"
        titleBefore="Les"
        titleHighlight="Utilisateurs"
        sectionBefore="Suivi"
        sectionHighlight="clients"
        subtitle="Cliquez sur un utilisateur pour voir son profil, ses commandes et son suivi santé."
        imageUrl="https://images.pexels.com/photos/3184418/pexels-photo-3184418.jpeg?auto=compress&cs=tinysrgb&w=1200"
        heroExtra={
          !isLoading && users.length > 0 ? (
            <div className="flex items-center gap-2 shrink-0 mb-0.5">
              <div className="bg-white/15 backdrop-blur-md border border-white/20 rounded-2xl px-3.5 py-2 text-center">
                <p className="font-display font-extrabold text-lg text-white tabular-nums">{adminCount}</p>
                <p className="text-[9px] text-white/70 font-semibold uppercase tracking-wide">Admins</p>
              </div>
              <div className="bg-white/15 backdrop-blur-md border border-white/20 rounded-2xl px-3.5 py-2 text-center">
                <p className="font-display font-extrabold text-lg text-white tabular-nums">{customerCount}</p>
                <p className="text-[9px] text-white/70 font-semibold uppercase tracking-wide">Clients</p>
              </div>
            </div>
          ) : undefined
        }
      >
        <div className="bg-card rounded-[2rem] border border-border/40 shadow-sm overflow-hidden">
          {/* Toolbar tri discret */}
          <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-border/40 bg-muted/20">
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">
              {visibleUsers.length} utilisateur{visibleUsers.length !== 1 ? 's' : ''}
            </p>
            <div className="inline-flex items-center rounded-full border border-border/50 bg-background p-0.5">
              {FILTER_OPTIONS.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setFilterType(value)}
                  className={`px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all ${
                    filterType === value
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {isLoading ? (
            <div className="px-4 divide-y divide-border/40">
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
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-center px-4">
              <div className="size-16 rounded-full bg-violet-50 dark:bg-violet-950/30 border border-violet-100 flex items-center justify-center">
                <UsersIcon className="size-6 text-violet-400" />
              </div>
              <p className="text-lg font-bold text-foreground mt-2">Aucun utilisateur</p>
              <p className="text-sm text-muted-foreground font-medium max-w-[280px]">
                {filterType === 'online' ? "Personne n'est en ligne actuellement." : 'Les utilisateurs inscrits apparaîtront ici.'}
              </p>
            </div>
          ) : (
            <div>
              {visibleUsers.map((user) => (
                <UserMonitoringCard
                  key={user.uid}
                  user={user}
                  onClick={() => setSelectedUser(user)}
                />
              ))}
            </div>
          )}
        </div>
      </BoardPageShell>

      <UserDetailSheet
        user={selectedUser}
        open={!!selectedUser}
        onOpenChange={(v) => { if (!v) setSelectedUser(null); }}
      />
    </>
  );
};

Users.metadata = {
  title: 'FYS — Utilisateurs',
  description: 'Gestion et monitoring des utilisateurs FYS.',
};

export default Users;
