import { PageComponent, useNavigate, useSearchParams } from 'rasengan';
import { FlaskConical, Plus, Loader2, Minus, ShoppingBag, Truck } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogDescription,
  DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from '@/components/ui/sheet';
import { useAuthStore } from '@/stores/auth';
import { UserRole, DELIVERY_FEE } from '@/entities';
import type { Cocktail } from '@/entities';
import {
  getUserCocktails, deleteCocktail, toggleCocktailPublic, getCocktailById,
} from '@/services/cocktail';
import { createOrder } from '@/services/order';
import { CocktailCard } from '@/components/features/catalogue/CocktailCard';

// ── Order Sheet ───────────────────────────────────────────────────────────────

function OrderSheet({
  cocktail,
  open,
  onOpenChange,
  userId,
}: {
  cocktail: Cocktail;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  userId: string;
}) {
  const [quantity, setQuantity] = useState(1);
  const [ordering, setOrdering] = useState(false);
  const [ordered, setOrdered] = useState(false);

  const perBottle = cocktail.totalPrice;
  const subtotal = perBottle * quantity;
  const total = subtotal + DELIVERY_FEE;

  async function handleOrder() {
    setOrdering(true);
    try {
      await createOrder(userId, cocktail, quantity);
      setOrdered(true);
    } finally {
      setOrdering(false);
    }
  }

  function handleClose(v: boolean) {
    if (!v) {
      setQuantity(1);
      setOrdered(false);
    }
    onOpenChange(v);
  }

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent side="right" className="w-full max-w-[500px] p-0 flex flex-col">

        {/* Header */}
        <SheetHeader className="px-6 pt-6 pb-4 border-b border-border/40 shrink-0">
          <SheetTitle className="font-display text-xl font-bold text-foreground">
            {cocktail.name}
          </SheetTitle>
          <p className="text-[13px] text-muted-foreground">
            {cocktail.ingredients.map((i) => i.fruitName).join(' · ')}
          </p>
        </SheetHeader>

        {ordered ? (
          /* ── Success state ── */
          <div className="flex-1 flex flex-col items-center justify-center gap-4 px-8 text-center">
            <div className="size-20 rounded-full bg-primary/10 flex items-center justify-center">
              <ShoppingBag className="size-9 text-primary" />
            </div>
            <h3 className="font-display font-bold text-2xl text-foreground">Commande passée !</h3>
            <p className="text-muted-foreground text-sm leading-relaxed max-w-[260px]">
              Votre commande de <strong>{quantity} bouteille{quantity > 1 ? 's' : ''}</strong> de{' '}
              <strong>{cocktail.name}</strong> a été enregistrée. Vous serez notifié de sa progression.
            </p>
            <p className="text-primary font-bold text-lg">{total.toLocaleString()} XAF</p>
            <Button
              variant="outline"
              className="rounded-2xl px-8 mt-2"
              onClick={() => handleClose(false)}
            >
              Fermer
            </Button>
          </div>
        ) : (
          <>
            {/* ── Scrollable body ── */}
            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">

              {/* Prix par bouteille */}
              <div className="space-y-3">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                  Détail des prix
                </p>
                <div className="rounded-2xl border border-border/60 bg-card divide-y divide-border/40 overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3">
                    <span className="text-[13px] text-muted-foreground">Base 50cl</span>
                    <span className="text-[13px] font-semibold text-foreground">
                      {cocktail.basePrice.toLocaleString()} XAF
                    </span>
                  </div>
                  {cocktail.ingredients.map((ing) => (
                    <div key={ing.fruitId} className="flex items-center justify-between px-4 py-3">
                      <span className="text-[13px] text-muted-foreground">{ing.fruitName}</span>
                      <span className="text-[13px] font-semibold text-foreground">
                        + {ing.priceSnapshot.toLocaleString()} XAF
                      </span>
                    </div>
                  ))}
                  <div className="flex items-center justify-between px-4 py-3.5 bg-primary/5">
                    <span className="text-[13px] font-bold text-foreground">Prix / bouteille</span>
                    <span className="text-[15px] font-bold text-primary">
                      {perBottle.toLocaleString()} XAF
                    </span>
                  </div>
                </div>
              </div>

              {/* Nombre de bouteilles */}
              <div className="space-y-3">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                  Nombre de bouteilles
                </p>
                <div className="flex items-center justify-between rounded-2xl border border-border/60 bg-card px-5 py-4">
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    disabled={quantity <= 1}
                    className="size-10 rounded-full bg-muted hover:bg-muted/80 flex items-center justify-center disabled:opacity-30 active:scale-90 transition-all"
                  >
                    <Minus className="size-4" />
                  </button>
                  <div className="text-center">
                    <span className="font-display font-bold text-3xl text-foreground tabular-nums">
                      {quantity}
                    </span>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      bouteille{quantity > 1 ? 's' : ''}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => q + 1)}
                    className="size-10 rounded-full bg-primary/10 hover:bg-primary/20 text-primary flex items-center justify-center active:scale-90 transition-all"
                  >
                    <Plus className="size-4" />
                  </button>
                </div>
              </div>

              {/* Récap total */}
              <div className="rounded-2xl border border-border/60 bg-card divide-y divide-border/40 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="text-[13px] text-muted-foreground">
                    {quantity} × {perBottle.toLocaleString()} XAF
                  </span>
                  <span className="text-[13px] font-semibold text-foreground">
                    {subtotal.toLocaleString()} XAF
                  </span>
                </div>
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="text-[13px] text-muted-foreground flex items-center gap-1.5">
                    <Truck className="size-3.5" /> Livraison
                  </span>
                  <span className="text-[13px] font-semibold text-foreground">
                    {DELIVERY_FEE.toLocaleString()} XAF
                  </span>
                </div>
                <div className="flex items-center justify-between px-4 py-4 bg-primary/5">
                  <span className="text-[15px] font-bold text-foreground">Total</span>
                  <span className="text-[18px] font-bold text-primary tabular-nums">
                    {total.toLocaleString()} XAF
                  </span>
                </div>
              </div>
            </div>

            {/* Footer CTA */}
            <div className="shrink-0 border-t border-border/40 px-6 py-5">
              <Button
                size="lg"
                className="w-full h-14 rounded-2xl bg-primary hover:bg-primary/90 text-white font-bold text-base gap-2 shadow-[0_8px_25px_rgba(63,109,78,0.3)] active:scale-95 transition-all"
                disabled={ordering}
                onClick={handleOrder}
              >
                {ordering ? (
                  <><Loader2 className="size-5 animate-spin" /> Commande en cours…</>
                ) : (
                  <><ShoppingBag className="size-5" /> Commander · {total.toLocaleString()} XAF</>
                )}
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

const Cocktails: PageComponent = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const isAdmin = user?.role === UserRole.ADMIN;

  const [toDelete, setToDelete] = useState<Cocktail | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [orderTarget, setOrderTarget] = useState<Cocktail | null>(null);

  // Fetch user's cocktails
  const { data: cocktails = [], isLoading } = useQuery({
    queryKey: ['user-cocktails', user?.uid],
    queryFn: () => getUserCocktails(user!.uid),
    enabled: !!user?.uid && !isAdmin,
  });

  // If ?cocktail=<id> is in the URL, fetch that cocktail and open the order sheet
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

  // Admins manage the catalogue, not this page
  if (isAdmin) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 px-4">
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
        className="relative w-full h-[220px] flex items-end px-6 pb-8 mb-16 overflow-hidden"
        style={{
          backgroundImage: "url('https://images.pexels.com/photos/1638280/pexels-photo-1638280.jpeg?auto=compress&cs=tinysrgb&w=1200')",
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
        <div className="relative z-10 flex-1">
          <p className="text-white/70 text-xs font-bold uppercase tracking-[0.2em] mb-1">
            Mes mélanges
          </p>
          <h1 className="font-display font-extrabold text-4xl text-white">
            Mes <span className="text-secondary italic">Cocktails</span>
          </h1>
        </div>
      </div>

      <div className="px-4 space-y-10">

        {/* Create CTA */}
        <Button
          size="lg"
          onClick={() => navigate('/lab')}
          className="w-full rounded-[2rem] h-16 bg-primary text-white font-bold text-base gap-3 shadow-[0_8px_30px_rgba(63,109,78,0.25)] hover:bg-primary/90 active:scale-95 transition-all"
        >
          <Plus className="size-5" />
          Créer un nouveau cocktail
        </Button>

        {/* Section header */}
        <div className="text-center">
          <h3 className="font-display font-bold text-3xl">
            <span className="text-foreground">Mes </span>
            <span className="text-primary">Créations</span>
          </h3>
          <p className="text-muted-foreground mt-2 font-medium">
            Vos mélanges personnalisés sauvegardés.
          </p>
        </div>

        {/* Loading state */}
        {isLoading && (
          <div className="flex justify-center py-16">
            <Loader2 className="size-8 animate-spin text-primary" />
          </div>
        )}

        {/* Cocktail cards */}
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

        {/* Empty state */}
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

      {/* Order sheet */}
      {orderTarget && user && (
        <OrderSheet
          cocktail={orderTarget}
          open={!!orderTarget}
          onOpenChange={(v) => {
            if (!v) {
              setOrderTarget(null);
              // Clear the URL param without full navigation
              window.history.replaceState(null, '', '/board/cocktails');
            }
          }}
          userId={user.uid}
        />
      )}

      {/* Delete confirmation dialog */}
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
