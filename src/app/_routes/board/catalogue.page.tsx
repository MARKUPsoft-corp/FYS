import { useState, useEffect, useMemo } from 'react';
import { PageComponent, useNavigate, useSearchParams } from 'rasengan';
import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Search, FlaskConical, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogDescription,
  DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { useAuthStore } from '@/stores/auth';
import { UserRole, type Cocktail } from '@/entities';
import { 
  getCocktails, 
  getPublicCocktails, 
  getUserCocktails,
  createCocktail, 
  updateCocktail, 
  deleteCocktail, 
  toggleCocktailActive,
  toggleCocktailPublic,
  getCocktailById,
} from '@/services/cocktail';
import { getFruits } from '@/services/fruit';
import { getCategories } from '@/services/category';
import { CocktailCard } from '@/components/features/catalogue/CocktailCard';
import { OrderSheet } from '@/components/features/cocktail/OrderSheet';
import { AdminCatalogue } from '@/components/features/catalogue/AdminCatalogue';
import { CocktailFormDrawer } from '@/components/features/catalogue/CocktailFormDrawer';
import { BoardPageShell } from '@/components/layout/BoardPageShell';
import i18n from '@/i18n';
import { pushHistoryParam, useCloseHistoryParam } from '@/hooks/useHistoryParam';

type CatalogueTab = 'official' | 'public' | 'mine';

const Catalogue: PageComponent = () => {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isAdmin = user?.role === UserRole.ADMIN;
  const [searchParams, setSearchParams] = useSearchParams();
  const closeHistoryParam = useCloseHistoryParam();

  // États pour admin
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<Cocktail | null>(null);

  // États pour client
  const [tab, setTab] = useState<CatalogueTab>('official');
  const [query, setQuery] = useState('');
  const [orderTarget, setOrderTarget] = useState<Cocktail | null>(null);
  const [toDelete, setToDelete] = useState<Cocktail | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);

  // Fetch données
  const { data: officialCocktails = [], isLoading: officialLoading } = useQuery({
    queryKey: ['cocktails', isAdmin ? 'all' : 'public'],
    queryFn: isAdmin ? getCocktails : getPublicCocktails,
  });

  const { data: publicCocktails = [], isLoading: publicLoading } = useQuery({
    queryKey: ['cocktails', 'public'],
    queryFn: getPublicCocktails,
    enabled: !isAdmin,
  });

  const { data: myCocktails = [], isLoading: myLoading } = useQuery({
    queryKey: ['user-cocktails', user?.uid],
    queryFn: () => getUserCocktails(user!.uid),
    enabled: !!user?.uid && !isAdmin,
  });

  const { data: fruits = [] } = useQuery({
    queryKey: ['fruits'],
    queryFn: getFruits,
    enabled: isAdmin,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: getCategories,
    enabled: isAdmin,
  });

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

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['cocktails'] });
    queryClient.invalidateQueries({ queryKey: ['user-cocktails'] });
  }

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

  // Admin handlers
  function openCreate() {
    setEditing(null);
    setDrawerOpen(true);
  }

  function openEdit(cocktail: Cocktail) {
    setEditing(cocktail);
    setDrawerOpen(true);
  }

  async function handleDeleteAdmin(cocktail: Cocktail) {
    if (!confirm(`Delete "${cocktail.name}"?`)) return;
    await deleteCocktail(cocktail.id, cocktail.imageUrl);
    invalidate();
  }

  async function handleToggleActive(cocktail: Cocktail) {
    await toggleCocktailActive(cocktail.id, !cocktail.isActive);
    invalidate();
  }

  async function handleSave(
    data: Omit<Cocktail, 'id' | 'createdAt' | 'updatedAt'>,
    imageFile: File | null,
    cocktailId?: string,
  ) {
    if (cocktailId) {
      await updateCocktail(cocktailId, data, imageFile ?? undefined);
    } else {
      await createCocktail(data, imageFile ?? undefined);
    }
    invalidate();
  }

  // Client handlers
  async function handleTogglePublish(cocktail: Cocktail) {
    setPublishError(null);
    try {
      await toggleCocktailPublic(cocktail.id, !cocktail.isPublic);
      invalidate();
    } catch (e) {
      setPublishError(e instanceof Error ? e.message : t('catalogue.publishError'));
    }
  }

  async function handleDelete() {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await deleteCocktail(toDelete.id, toDelete.imageUrl);
      invalidate();
    } finally {
      setDeleting(false);
      setToDelete(null);
    }
  }

  // Filtrage par période
  // Filtrage cocktails pour chaque onglet
  const sortByDate = (a: Cocktail, b: Cocktail) => {
    const aTime = a.createdAt?.toMillis?.() ?? a.createdAt?.seconds ?? 0;
    const bTime = b.createdAt?.toMillis?.() ?? b.createdAt?.seconds ?? 0;
    const diff = bTime - aTime;
    if (diff !== 0) return diff;
    return (a.id ?? '').localeCompare(b.id ?? '');
  };

  const visibleOfficial = useMemo(() => {
    return [...officialCocktails]
      .filter((c) => c.isActive && c.isPublic && c.name.toLowerCase().includes(query.toLowerCase()))
      .sort(sortByDate);
  }, [officialCocktails, query]);

  const communityPublic = useMemo(() => {
    if (isAdmin) return [];
    const mineIds = new Set(myCocktails.map((c) => c.id));
    const officialIds = new Set(officialCocktails.map((c) => c.id));
    return [...publicCocktails]
      .filter((c) => !mineIds.has(c.id) && !officialIds.has(c.id) && c.name.toLowerCase().includes(query.toLowerCase()))
      .sort(sortByDate);
  }, [isAdmin, publicCocktails, myCocktails, officialCocktails, query]);

  const visibleMine = useMemo(() => {
    return [...myCocktails]
      .filter((c) => c.name.toLowerCase().includes(query.toLowerCase()))
      .sort(sortByDate);
  }, [myCocktails, query]);

  const isLoading = tab === 'official' ? publicLoading : tab === 'public' ? officialLoading : myLoading;
  const currentCocktails = tab === 'official' ? communityPublic : tab === 'public' ? visibleOfficial : visibleMine;

  const sortedOfficial = useMemo(() => [...officialCocktails].sort(sortByDate), [officialCocktails]);

  // Rendu Admin
  if (isAdmin) {
    return (
      <>
        <AdminCatalogue
          cocktails={sortedOfficial}
          loading={officialLoading}
          onEdit={openEdit}
          onDelete={handleDeleteAdmin}
          onToggleActive={handleToggleActive}
          onAdd={openCreate}
        />
        <CocktailFormDrawer
          open={drawerOpen}
          cocktail={editing}
          fruits={fruits}
          categories={categories}
          createdBy={user!.uid}
          onClose={() => setDrawerOpen(false)}
          onSave={handleSave}
        />
      </>
    );
  }

  // Rendu Client avec 3 onglets
  const tabConfig = {
    official: { label: t('catalogue.customerEyebrow'), subtitle: t('catalogue.tab_official_subtitle') },
    public: { label: t('catalogue.public'), subtitle: t('catalogue.customerSubtitle') },
    mine: { label: t('catalogue.mine'), subtitle: t('catalogue.tab_mine_subtitle') },
  };

  return (
    <>
      <BoardPageShell
        eyebrow={t('catalogue.eyebrow_customer')}
        titleBefore={t('catalogue.title_before')}
        titleHighlight={t('catalogue.title')}
        sectionBefore={tab === 'official' ? t('catalogue.section_before_official') : tab === 'public' ? t('catalogue.section_before_public') : t('catalogue.section_before_mine')}
        sectionHighlight={tab === 'official' ? t('catalogue.section_highlight_official') : tab === 'public' ? t('catalogue.section_highlight_public') : t('catalogue.section_highlight_mine')}
        subtitle={tabConfig[tab].subtitle}
        imageUrl="https://images.pexels.com/photos/1638280/pexels-photo-1638280.jpeg?auto=compress&cs=tinysrgb&w=1200"
        actions={
          <div className="space-y-4">
            {/* Barre de recherche */}
            <div  className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-muted-foreground" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t('catalogue.search')}
                className="w-full h-14 pl-12 pr-4 rounded-[2rem] bg-card border border-border/60 text-foreground placeholder:text-muted-foreground font-medium text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition-shadow"
              />
            </div>

            {/* Bouton Créer (onglet "Mes cocktails") */}
            {tab === 'mine' && (
              <Button
                size="lg"
                onClick={() => navigate('/lab')}
                className="w-full rounded-[2rem] h-16 bg-primary text-white font-bold text-base gap-3 shadow-[0_8px_30px_rgba(63,109,78,0.25)] hover:bg-primary/90 active:scale-95 transition-all"
              >
                <Plus className="size-5" />
                {t('catalogue.createCocktail')}
              </Button>
            )}

            {/* Tabs */}
            <div  className="flex p-1.5 rounded-full bg-background/40 backdrop-blur-xl border border-white/20 dark:border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.12)] max-w-md mx-auto">
              {(['official', 'public', 'mine'] as CatalogueTab[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTab(t)}
                  className={`flex-1 rounded-full py-2.5 px-3 text-[13px] font-bold transition-all duration-300 whitespace-nowrap ${
                    tab === t
                      ? 'bg-card/90 backdrop-blur-md text-foreground shadow-[0_4px_16px_rgba(0,0,0,0.1)] scale-[0.98]'
                      : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
                  }`}
                >
                  {tabConfig[t].label}
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
        <div >
        {isLoading ? (
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
        ) : currentCocktails.length === 0 ? (
          tab === 'mine' ? (
            <div
              onClick={() => navigate('/lab')}
              className="rounded-[2.5rem] border-2 border-dashed border-border/40 flex flex-col items-center justify-center py-16 gap-4 text-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all group"
            >
              <div className="size-16 rounded-full bg-primary/5 group-hover:bg-primary/10 flex items-center justify-center transition-colors">
                <FlaskConical className="size-7 text-primary/50 group-hover:text-primary transition-colors" />
              </div>
              <p className="text-sm font-semibold text-foreground">{t('catalogue.createFirst')}</p>
              <p className="text-xs text-muted-foreground max-w-[200px]">
                {t('catalogue.emptyDescription')}
              </p>
            </div>
          ) : (
            <p className="text-center text-sm text-muted-foreground py-12">
              {query ? t('catalogue.noSearchResults') : t('catalogue.noCocktails')}
            </p>
          )
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 pb-8">
            {currentCocktails.map((cocktail) => (
              <CocktailCard
                key={cocktail.id}
                cocktail={cocktail}
                onView={openCocktail}
                showActions={tab === 'mine'}
                onTogglePublish={tab === 'mine' ? handleTogglePublish : undefined}
                onDelete={tab === 'mine' ? setToDelete : undefined}
              />
            ))}
          </div>
        )}
        </div>
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
            <DialogTitle>{t('catalogue.deleteTitle')}</DialogTitle>
            <DialogDescription>
              {t('catalogue.deleteDescription', { name: toDelete?.name })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" disabled={deleting} onClick={() => setToDelete(null)}>
              {t('common.cancel')}
            </Button>
            <Button
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            >
              {deleting ? t('common.deleting') : t('common.delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

Catalogue.metadata = {
  title: `FYS — ${i18n.t('catalogue.title')}`,
  description: i18n.t('catalogue.pageDescription'),
};

export default Catalogue;
