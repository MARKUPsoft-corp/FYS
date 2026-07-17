import { PageComponent, useNavigate, useSearchParams } from 'rasengan';
import {
  FlaskConical, Plus
} from 'lucide-react';
import { useState, useEffect } from 'react';
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
  getUserCocktails, deleteCocktail, toggleCocktailPublic, getCocktailById,
} from '@/services/cocktail';
import { CocktailCard } from '@/components/features/catalogue/CocktailCard';
import { OrderSheet } from '@/components/features/cocktail/OrderSheet';


const Cocktails: PageComponent = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const isAdmin = user?.role === UserRole.ADMIN;

  const [toDelete, setToDelete] = useState<Cocktail | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [orderTarget, setOrderTarget] = useState<Cocktail | null>(null);

  const { data: cocktails = [], isLoading } = useQuery({
    queryKey: ['user-cocktails', user?.uid],
    queryFn: () => getUserCocktails(user!.uid),
    enabled: !!user?.uid && !isAdmin,
  });

  const cocktailParam = searchParams.get('cocktail');
  useEffect(() => {
    if (!cocktailParam || !user?.uid) return;
    getCocktailById(cocktailParam).then((c) => {
      if (c) setOrderTarget(c);
    });
  }, [cocktailParam, user?.uid]);

  async function handleTogglePublish(cocktail: Cocktail) {
    await toggleCocktailPublic(cocktail.id, !cocktail.isPublic);
    queryClient.invalidateQueries({ queryKey: ['user-cocktails', user?.uid] });
  }

  async function handleDelete() {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await deleteCocktail(toDelete.id, toDelete.imageUrl);
      queryClient.invalidateQueries({ queryKey: ['user-cocktails', user?.uid] });
    } finally {
      setDeleting(false);
      setToDelete(null);
    }
  }

  if (isAdmin) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 px-3 md:px-4">
        <FlaskConical className="size-12 text-primary/40" />
        <h2 className="font-display font-bold text-2xl text-foreground">Gestion des cocktails</h2>
        <p className="text-muted-foreground text-center max-w-xs">
          Les cocktails du catalogue sont gérés depuis la page Catalogue.
        </p>
        <Button onClick={() => navigate('/catalogue')} className="rounded-full px-8">
          Aller au catalogue
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">

      {/* Hero Banner */}
      <div
        className="relative w-full h-[220px] flex items-end px-3 md:px-6 pb-8 mb-16 overflow-hidden"
        style={{
          backgroundImage: "url('https://images.pexels.com/photos/1638280/pexels-photo-1638280.jpeg?auto=compress&cs=tinysrgb&w=1200')",
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
        <div className="relative z-10 flex-1">
          <p className="text-white/70 text-xs font-bold uppercase tracking-[0.2em] mb-1">Mes mélanges</p>
          <h1 className="font-display font-extrabold text-4xl text-white">
            Mes <span className="text-secondary italic">Cocktails</span>
          </h1>
        </div>
      </div>

      <div className="px-3 md:px-4 space-y-10">

        <Button
          size="lg"
          onClick={() => navigate('/lab')}
          className="w-full rounded-[2rem] h-16 bg-primary text-white font-bold text-base gap-3 shadow-[0_8px_30px_rgba(63,109,78,0.25)] hover:bg-primary/90 active:scale-95 transition-all"
        >
          <Plus className="size-5" />
          Créer un nouveau cocktail
        </Button>

        <div className="text-center">
          <h3 className="font-display font-bold text-3xl">
            <span className="text-foreground">Mes </span>
            <span className="text-primary">Créations</span>
          </h3>
          <p className="text-muted-foreground mt-2 font-medium">
            Vos mélanges personnalisés sauvegardés.
          </p>
        </div>

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

        {!isLoading && cocktails.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 pb-8">
            {cocktails.map((c) => (
              <CocktailCard
                key={c.id}
                cocktail={c}
                showActions
                onTogglePublish={handleTogglePublish}
                onDelete={setToDelete}
                onView={(cocktail) => setOrderTarget(cocktail)}
              />
            ))}
          </div>
        )}

        {!isLoading && cocktails.length === 0 && (
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
      </div>

      {/* Order + nutrition sheet */}
      {orderTarget && user && (
        <OrderSheet
          cocktail={orderTarget}
          open={!!orderTarget}
          onOpenChange={(v) => {
            if (!v) {
              setOrderTarget(null);
              window.history.replaceState(null, '', '/board/cocktails');
            }
          }}
          user={user}
        />
      )}

      {/* Delete confirmation */}
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
    </div>
  );
};

Cocktails.metadata = {
  title: 'FYS — Mes Cocktails',
  description: 'Vos créations personnalisées.',
};

export default Cocktails;
