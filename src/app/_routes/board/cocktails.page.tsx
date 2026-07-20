import { PageComponent, useNavigate, useSearchParams } from 'rasengan';
import { FlaskConical, Plus } from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogDescription,
  DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { useAuthStore } from '@/stores/auth';
import { UserRole } from '@/entities';
import type { Cocktail } from '@/entities';
import {
  getUserCocktails,
  getPublicCocktails,
  deleteCocktail,
  toggleCocktailPublic,
  getCocktailById,
} from '@/services/cocktail';
import { CocktailCard } from '@/components/features/catalogue/CocktailCard';
import { OrderSheet } from '@/components/features/cocktail/OrderSheet';
import { BoardPageShell } from '@/components/layout/BoardPageShell';
import { pushHistoryParam, useCloseHistoryParam } from '@/hooks/useHistoryParam';

const Cocktails: PageComponent = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const closeHistoryParam = useCloseHistoryParam();
  const queryClient = useQueryClient();
  const isAdmin = user?.role === UserRole.ADMIN;

  const [toDelete, setToDelete] = useState<Cocktail | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [orderTarget, setOrderTarget] = useState<Cocktail | null>(null);
  const [listTab, setListTab] = useState<'mine' | 'public'>('mine');
  const [publishError, setPublishError] = useState<string | null>(null);

  const { data: myCocktails = [], isLoading: myLoading } = useQuery({
    queryKey: ['user-cocktails', user?.uid],
    queryFn: () => getUserCocktails(user!.uid),
    enabled: !!user?.uid && !isAdmin,
  });

  const { data: publicCocktails = [], isLoading: publicLoading } = useQuery({
    queryKey: ['cocktails', 'public'],
    queryFn: getPublicCocktails,
    enabled: !!user?.uid,
  });

  const isLoading = isAdmin ? publicLoading : (myLoading || publicLoading);

  const cocktailParam = searchParams.get('cocktail');

  useEffect(() => {
    if (!cocktailParam) {
      setOrderTarget(null);
      return;
    }
    if (orderTarget?.id === cocktailParam) return;
    getCocktailById(cocktailParam).then((c) => {
      if (c) setOrderTarget(c);
    });
  }, [cocktailParam]); // eslint-disable-line react-hooks/exhaustive-deps

  function openCocktail(cocktail: Cocktail) {
    setOrderTarget(cocktail);
    pushHistoryParam(setSearchParams, 'cocktail', cocktail.id);
  }

  function closeCocktailSheet(open: boolean) {
    if (open) return;
    if (!closeHistoryParam('cocktail')) {
      setOrderTarget(null);
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.delete('cocktail');
        return next;
      }, { replace: true });
    }
  }

  async function handleTogglePublish(cocktail: Cocktail) {
    setPublishError(null);
    try {
      await toggleCocktailPublic(cocktail.id, !cocktail.isPublic);
      queryClient.invalidateQueries({ queryKey: ['user-cocktails', user?.uid] });
      queryClient.invalidateQueries({ queryKey: ['cocktails', 'public'] });
    } catch (e) {
      setPublishError(e instanceof Error ? e.message : 'Impossible de publier ce mélange.');
    }
  }

  async function handleDelete() {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await deleteCocktail(toDelete.id, toDelete.imageUrl);
      queryClient.invalidateQueries({ queryKey: ['user-cocktails', user?.uid] });
      queryClient.invalidateQueries({ queryKey: ['cocktails', 'public'] });
    } finally {
      setDeleting(false);
      setToDelete(null);
    }
  }

  const communityPublic = useMemo(() => {
    if (isAdmin) return publicCocktails;
    const mineIds = new Set(myCocktails.map((c) => c.id));
    return publicCocktails.filter((c) => !mineIds.has(c.id));
  }, [isAdmin, publicCocktails, myCocktails]);

  // ── Admin: all public cocktails ──
  if (isAdmin) {
    return (
      <BoardPageShell
        eyebrow="Communauté"
        titleBefore="Cocktails"
        titleHighlight="publics"
        sectionBefore="Toutes les"
        sectionHighlight="créations"
        subtitle="Tous les cocktails publiés par les clients de l'application."
        imageUrl="https://images.pexels.com/photos/1638280/pexels-photo-1638280.jpeg?auto=compress&cs=tinysrgb&w=1200"
        actions={
          <Button
            size="lg"
            onClick={() => navigate('/board/catalogue')}
            className="w-full rounded-[2rem] h-14 bg-primary text-white font-bold text-base gap-3 shadow-[0_8px_30px_rgba(63,109,78,0.25)] hover:bg-primary/90"
          >
            <FlaskConical className="size-5" />
            Gérer le catalogue officiel
          </Button>
        }
      >
        {isLoading && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 pb-8">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex flex-col gap-3">
                <div className="w-full aspect-[4/5] rounded-[1.75rem] border border-border/50 bg-muted/30 animate-pulse" />
                <div className="px-2 space-y-2">
                  <div className="h-4 w-2/3 rounded bg-muted animate-pulse" />
                  <div className="h-3 w-1/3 rounded bg-muted animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!isLoading && publicCocktails.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 pb-8">
            {publicCocktails.map((c) => (
              <CocktailCard
                key={c.id}
                cocktail={c}
                onView={openCocktail}
              />
            ))}
          </div>
        )}

        {!isLoading && publicCocktails.length === 0 && (
          <div className="rounded-[2.5rem] border-2 border-dashed border-border/40 flex flex-col items-center justify-center py-16 gap-3 text-center">
            <FlaskConical className="size-8 text-muted-foreground/40" />
            <p className="text-sm font-semibold text-foreground">Aucun cocktail public pour le moment</p>
            <p className="text-xs text-muted-foreground max-w-[240px]">
              Les créations publiées par les clients apparaîtront ici.
            </p>
          </div>
        )}

        {orderTarget && user && (
          <OrderSheet
            cocktail={orderTarget}
            open={!!orderTarget}
            onOpenChange={closeCocktailSheet}
            user={user}
          />
        )}
      </BoardPageShell>
    );
  }

  // ── Client: mes créations + publics ──
  return (
    <>
      <BoardPageShell
        eyebrow="Mes mélanges"
        titleBefore="Mes"
        titleHighlight="Cocktails"
        sectionBefore={listTab === 'mine' ? 'Mes' : 'Créations'}
        sectionHighlight={listTab === 'mine' ? 'Créations' : 'publiques'}
        subtitle={
          listTab === 'mine'
            ? 'Vos mélanges personnalisés sauvegardés.'
            : 'Les créations partagées par la communauté FYS.'
        }
        imageUrl="https://images.pexels.com/photos/1638280/pexels-photo-1638280.jpeg?auto=compress&cs=tinysrgb&w=1200"
        actions={
          <div className="space-y-4">
            <Button
              size="lg"
              onClick={() => navigate('/lab')}
              className="w-full rounded-[2rem] h-16 bg-primary text-white font-bold text-base gap-3 shadow-[0_8px_30px_rgba(63,109,78,0.25)] hover:bg-primary/90 active:scale-95 transition-all"
            >
              <Plus className="size-5" />
              Créer un nouveau cocktail
            </Button>
            <div className="flex p-1 rounded-full bg-muted/50 border border-border/50 max-w-md mx-auto">
              {(
                [
                  { id: 'mine' as const, label: 'Mes cocktails' },
                  { id: 'public' as const, label: 'Publics' },
                ]
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setListTab(tab.id)}
                  className={`flex-1 rounded-full py-2.5 text-[13px] font-bold transition-all ${
                    listTab === tab.id
                      ? 'bg-card text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            {publishError && (
              <p className="text-sm font-semibold text-destructive bg-destructive/10 border border-destructive/20 rounded-2xl px-4 py-3 text-center">
                {publishError}
              </p>
            )}
          </div>
        }
      >
        {isLoading && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 pb-8">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex flex-col gap-3">
                <div className="w-full aspect-[4/5] rounded-[1.75rem] border border-border/50 bg-muted/30 animate-pulse" />
                <div className="px-2 space-y-2">
                  <div className="h-4 w-2/3 rounded bg-muted animate-pulse" />
                  <div className="h-3 w-1/3 rounded bg-muted animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!isLoading && listTab === 'mine' && myCocktails.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 pb-8">
            {myCocktails.map((c) => (
              <CocktailCard
                key={c.id}
                cocktail={c}
                showActions
                onTogglePublish={handleTogglePublish}
                onDelete={setToDelete}
                onView={openCocktail}
              />
            ))}
          </div>
        )}

        {!isLoading && listTab === 'mine' && myCocktails.length === 0 && (
          <div
            onClick={() => navigate('/lab')}
            className="rounded-[2.5rem] border-2 border-dashed border-border/40 flex flex-col items-center justify-center py-16 gap-4 text-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all group"
          >
            <div className="size-16 rounded-full bg-primary/5 group-hover:bg-primary/10 flex items-center justify-center transition-colors">
              <FlaskConical className="size-7 text-primary/50 group-hover:text-primary transition-colors" />
            </div>
            <p className="text-sm font-semibold text-foreground">Créer votre premier mélange</p>
            <p className="text-xs text-muted-foreground max-w-[200px]">
              Sélectionnez vos fruits préférés et composez votre recette unique dans le FYS Lab.
            </p>
          </div>
        )}

        {!isLoading && listTab === 'public' && communityPublic.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 pb-8">
            {communityPublic.map((c) => (
              <CocktailCard
                key={c.id}
                cocktail={c}
                onView={openCocktail}
              />
            ))}
          </div>
        )}

        {!isLoading && listTab === 'public' && communityPublic.length === 0 && (
          <div className="rounded-[2.5rem] border border-dashed border-border/40 flex flex-col items-center justify-center py-12 gap-2 text-center">
            <p className="text-sm font-semibold text-muted-foreground">
              Aucun autre cocktail public pour l&apos;instant
            </p>
          </div>
        )}
      </BoardPageShell>

      {orderTarget && user && (
        <OrderSheet
          cocktail={orderTarget}
          open={!!orderTarget}
          onOpenChange={closeCocktailSheet}
          user={user}
        />
      )}

      <Dialog open={!!toDelete} onOpenChange={(open: boolean) => !open && setToDelete(null)}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Supprimer ce cocktail ?</DialogTitle>
            <DialogDescription>
              <strong>{toDelete?.name}</strong> sera définitivement supprimé. Cette action est irréversible.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" disabled={deleting} onClick={() => setToDelete(null)}>
              Annuler
            </Button>
            <Button
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            >
              {deleting ? 'Suppression…' : 'Supprimer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

Cocktails.metadata = {
  title: 'FYS — Cocktails',
  description: 'Créations personnelles et cocktails publics FYS.',
};

export default Cocktails;
