import { useState, useMemo } from 'react';
import { Link } from 'rasengan';
import {
  Sparkles,
  Search,
  ExternalLink,
  RefreshCw,
  CheckCircle2,
  ImageOff,
  Check,
  Plus,
  Minus,
  Info,
  SlidersHorizontal,
  ChevronRight,
  Filter,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useFruitsRealtime } from '@/hooks/useFruitsRealtime';
import { useTastingSettings } from '@/hooks/useTastingSettings';
import { updateTastingSettings, resetTastingSettingsToDefault } from '@/services/tasting';
import { DEFAULT_TASTING_SETTINGS, isUsableFruit, type Fruit } from '@/entities';

type FilterType = 'all' | 'active' | 'main' | 'supplement' | 'inactive';

export function TastingIngredientsManager() {
  const { fruits, isLoading: fruitsLoading } = useFruitsRealtime();
  const { settings, isLoading: settingsLoading } = useTastingSettings();

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');
  const [saving, setSaving] = useState(false);
  const [lastAction, setLastAction] = useState<string | null>(null);

  const mainFruitIds = useMemo(
    () => new Set(settings.tastingMainFruitIds || []),
    [settings.tastingMainFruitIds],
  );

  const supplementIds = useMemo(
    () => new Set(settings.tastingSupplementIds || []),
    [settings.tastingSupplementIds],
  );

  // Active tasting fruits (either main or supplement)
  const activeTastingIds = useMemo(() => {
    return new Set([...mainFruitIds, ...supplementIds]);
  }, [mainFruitIds, supplementIds]);

  // Handle toggling main fruit role
  async function handleToggleMain(fruitId: string, fruitName: string) {
    setSaving(true);
    try {
      const nextMain = new Set(mainFruitIds);
      let wasAdded = false;
      if (nextMain.has(fruitId)) {
        nextMain.delete(fruitId);
      } else {
        nextMain.add(fruitId);
        wasAdded = true;
      }
      const newMainList = Array.from(nextMain);
      await updateTastingSettings({
        tastingMainFruitIds: newMainList,
        tastingFruitIds: Array.from(new Set([...newMainList, ...supplementIds])),
      });
      setLastAction(
        wasAdded
          ? `🍓 « ${fruitName} » ajouté comme fruit principal au Lab dégustation.`
          : `« ${fruitName} » retiré des fruits principaux.`
      );
      setTimeout(() => setLastAction(null), 3500);
    } catch (err) {
      console.error('Erreur toggle main fruit:', err);
    } finally {
      setSaving(false);
    }
  }

  // Handle toggling supplement role
  async function handleToggleSupplement(fruitId: string, fruitName: string) {
    setSaving(true);
    try {
      const nextSupp = new Set(supplementIds);
      let wasAdded = false;
      if (nextSupp.has(fruitId)) {
        nextSupp.delete(fruitId);
      } else {
        nextSupp.add(fruitId);
        wasAdded = true;
      }
      const newSuppList = Array.from(nextSupp);
      await updateTastingSettings({
        tastingSupplementIds: newSuppList,
        tastingFruitIds: Array.from(new Set([...mainFruitIds, ...newSuppList])),
      });
      setLastAction(
        wasAdded
          ? `🌿 « ${fruitName} » ajouté comme supplément au Lab dégustation.`
          : `« ${fruitName} » retiré des suppléments.`
      );
      setTimeout(() => setLastAction(null), 3500);
    } catch (err) {
      console.error('Erreur toggle supplement:', err);
    } finally {
      setSaving(false);
    }
  }

  // Reset to default preset
  async function handleResetDefaults() {
    if (
      !confirm(
        'Réinitialiser la sélection du Lab dégustation avec les ingrédients par défaut (Ananas, Papaye, Orange, Gingembre, Menthe, Foléré) ?'
      )
    ) {
      return;
    }
    setSaving(true);
    try {
      await resetTastingSettingsToDefault();
      setLastAction('✨ Configuration d’origine rétablie avec succès.');
      setTimeout(() => setLastAction(null), 3500);
    } catch (err) {
      console.error('Erreur reset defaults:', err);
    } finally {
      setSaving(false);
    }
  }

  // Batch: Include all catalog fruits as main fruits
  async function handleIncludeAllAsMains() {
    if (!confirm('Ajouter tous les fruits du catalogue comme fruits principaux pour la dégustation ?')) return;
    setSaving(true);
    try {
      const allIds = fruits.map((f) => f.id);
      await updateTastingSettings({
        tastingMainFruitIds: allIds,
        tastingFruitIds: Array.from(new Set([...allIds, ...supplementIds])),
      });
      setLastAction('Tous les fruits ont été ajoutés comme fruits principaux.');
      setTimeout(() => setLastAction(null), 3500);
    } catch (err) {
      console.error('Erreur include all mains:', err);
    } finally {
      setSaving(false);
    }
  }

  // Batch: Remove all ingredients from tasting
  async function handleDisableAll() {
    if (!confirm('Retirer tous les ingrédients du Lab dégustation ? Aucun fruit ne sera sélectionnable.')) return;
    setSaving(true);
    try {
      await updateTastingSettings({
        tastingMainFruitIds: [],
        tastingSupplementIds: [],
        tastingFruitIds: [],
      });
      setLastAction('Tous les ingrédients ont été retirés du Lab dégustation.');
      setTimeout(() => setLastAction(null), 3500);
    } catch (err) {
      console.error('Erreur disable all:', err);
    } finally {
      setSaving(false);
    }
  }

  // Filtered fruits list
  const filteredFruits = useMemo(() => {
    const q = search.trim().toLowerCase();
    return fruits.filter((f) => {
      const isMain = mainFruitIds.has(f.id);
      const isSupp = supplementIds.has(f.id);
      const isActiveInTasting = isMain || isSupp;

      if (filter === 'active' && !isActiveInTasting) return false;
      if (filter === 'main' && !isMain) return false;
      if (filter === 'supplement' && !isSupp) return false;
      if (filter === 'inactive' && isActiveInTasting) return false;

      if (!q) return true;
      return (
        f.name.toLowerCase().includes(q) ||
        (f.scientificName && f.scientificName.toLowerCase().includes(q)) ||
        (f.region && f.region.toLowerCase().includes(q))
      );
    });
  }, [fruits, mainFruitIds, supplementIds, filter, search]);

  const isLoading = fruitsLoading || settingsLoading;

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* ── BANNIÈRE D'INFORMATION & LIEN LAB ── */}
      <div className="rounded-2xl border-2 border-[#E0982E]/30 bg-gradient-to-r from-[#E0982E]/10 via-card to-[#E0982E]/5 p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1.5 max-w-2xl">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider bg-[#E0982E]/20 text-[#b27218] dark:text-[#f8be68] border border-[#E0982E]/30">
            <Sparkles className="size-3 text-[#E0982E]" />
            Personnalisation en Temps Réel
          </div>
          <h3 className="font-display font-bold text-base sm:text-lg text-foreground">
            Ingrédients & Suppléments du Lab Dégustation
          </h3>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            Configurez précisément les ingrédients proposés aux invités VIP lors de la composition
            de leur bouteille personnalisée. Tout changement est appliqué instantanément dans le Lab
            de la dégustation (<code className="px-1.5 py-0.5 rounded bg-muted font-mono text-[11px]">/lab?mode=degustation</code>).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <Button
            asChild
            variant="outline"
            className="rounded-xl font-bold text-xs h-10 border-[#E0982E]/40 text-[#b27218] dark:text-[#f8be68] hover:bg-[#E0982E]/15 gap-2"
          >
            <Link to="/lab?mode=degustation" target="_blank">
              <ExternalLink className="size-3.5" />
              Tester le Lab VIP
            </Link>
          </Button>

          <Button
            type="button"
            variant="ghost"
            onClick={handleResetDefaults}
            disabled={saving}
            className="rounded-xl text-xs font-bold text-muted-foreground hover:text-foreground h-10 gap-1.5 cursor-pointer"
            title="Rétablir Ananas, Papaye, Orange, Gingembre, Menthe, Foléré"
          >
            <RefreshCw className="size-3.5" />
            Par défaut
          </Button>
        </div>
      </div>

      {/* ── NOTIFICATION DE SUCCÈS ── */}
      {lastAction && (
        <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 text-xs font-bold flex items-center gap-2 animate-in fade-in slide-in-from-top-1">
          <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
          <span>{lastAction}</span>
        </div>
      )}

      {/* ── KPI COMPTEURS ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-card border border-border/50 shadow-xs flex items-center gap-3">
          <div className="size-10 rounded-xl bg-[#E0982E]/15 text-[#E0982E] flex items-center justify-center shrink-0">
            <Sparkles className="size-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Total Inclus</p>
            <p className="font-display font-extrabold text-xl text-foreground mt-0.5">
              {activeTastingIds.size} <span className="text-xs font-normal text-muted-foreground">/ {fruits.length}</span>
            </p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border/50 shadow-xs flex items-center gap-3">
          <div className="size-10 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <span className="text-base font-black">🍓</span>
          </div>
          <div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Fruits (Étape 1)</p>
            <p className="font-display font-extrabold text-xl text-emerald-600 dark:text-emerald-400 mt-0.5">
              {mainFruitIds.size}
            </p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border/50 shadow-xs flex items-center gap-3">
          <div className="size-10 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <span className="text-base font-black">🌿</span>
          </div>
          <div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Suppléments (Étape 2)</p>
            <p className="font-display font-extrabold text-xl text-amber-600 dark:text-amber-400 mt-0.5">
              {supplementIds.size}
            </p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border/50 shadow-xs flex items-center gap-3">
          <div className="size-10 rounded-xl bg-muted text-muted-foreground flex items-center justify-center shrink-0">
            <Minus className="size-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Non Inclus</p>
            <p className="font-display font-extrabold text-xl text-foreground mt-0.5">
              {Math.max(0, fruits.length - activeTastingIds.size)}
            </p>
          </div>
        </div>
      </div>

      {/* ── BARRE DE RECHERCHE & FILTRES ── */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un fruit (ananas, gingembre, papaye...)"
            className="pl-10 rounded-xl bg-background border-border/50 text-xs h-10"
          />
        </div>

        {/* Filtres par état */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
          <button
            type="button"
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 cursor-pointer ${
              filter === 'all'
                ? 'bg-foreground text-background shadow-xs'
                : 'bg-muted/50 text-muted-foreground hover:text-foreground'
            }`}
          >
            Tous ({fruits.length})
          </button>

          <button
            type="button"
            onClick={() => setFilter('active')}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 cursor-pointer ${
              filter === 'active'
                ? 'bg-[#E0982E] text-white shadow-xs'
                : 'bg-muted/50 text-muted-foreground hover:text-foreground'
            }`}
          >
            ✨ Actifs ({activeTastingIds.size})
          </button>

          <button
            type="button"
            onClick={() => setFilter('main')}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 cursor-pointer ${
              filter === 'main'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-muted/50 text-muted-foreground hover:text-foreground'
            }`}
          >
            🍓 Fruits ({mainFruitIds.size})
          </button>

          <button
            type="button"
            onClick={() => setFilter('supplement')}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 cursor-pointer ${
              filter === 'supplement'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-muted/50 text-muted-foreground hover:text-foreground'
            }`}
          >
            🌿 Suppléments ({supplementIds.size})
          </button>

          <button
            type="button"
            onClick={() => setFilter('inactive')}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 cursor-pointer ${
              filter === 'inactive'
                ? 'bg-muted-foreground text-background shadow-xs'
                : 'bg-muted/50 text-muted-foreground hover:text-foreground'
            }`}
          >
            ⚪ Non inclus ({Math.max(0, fruits.length - activeTastingIds.size)})
          </button>
        </div>
      </div>

      {/* ── GRILLE DES INGRÉDIENTS ── */}
      {isLoading ? (
        <div className="py-16 text-center text-sm font-semibold text-muted-foreground animate-pulse">
          Chargement des ingrédients du catalogue…
        </div>
      ) : filteredFruits.length === 0 ? (
        <div className="py-16 text-center rounded-2xl border border-dashed border-border/60 bg-muted/20 space-y-2">
          <p className="font-bold text-foreground text-sm">Aucun ingrédient correspondant</p>
          <p className="text-xs text-muted-foreground">
            Essayez de modifier votre recherche ou de changer de filtre.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
          {filteredFruits.map((fruit) => {
            const isMain = mainFruitIds.has(fruit.id);
            const isSupp = supplementIds.has(fruit.id);
            const isIncluded = isMain || isSupp;

            return (
              <div
                key={fruit.id}
                className={`p-4 rounded-2xl border transition-all duration-200 flex flex-col justify-between gap-3 ${
                  isIncluded
                    ? 'bg-card border-[#E0982E]/50 shadow-sm ring-1 ring-[#E0982E]/20'
                    : 'bg-card/70 border-border/50 hover:border-border hover:bg-card'
                }`}
              >
                {/* Header de la carte */}
                <div className="flex items-start gap-3">
                  <div className="size-12 rounded-xl bg-muted/60 overflow-hidden flex items-center justify-center shrink-0 border border-border/40">
                    {fruit.imageUrl ? (
                      <img
                        src={fruit.imageUrl}
                        alt={fruit.name}
                        className="size-full object-cover"
                      />
                    ) : (
                      <ImageOff className="size-5 text-muted-foreground/40" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h4 className="font-display font-bold text-sm text-foreground truncate">
                        {fruit.name}
                      </h4>
                      {isIncluded && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.2 rounded-full text-[9px] font-black uppercase tracking-wider bg-[#E0982E]/15 text-[#b27218] dark:text-[#f8be68] border border-[#E0982E]/30 shrink-0">
                          <Sparkles className="size-2.5 text-[#E0982E]" />
                          VIP
                        </span>
                      )}
                    </div>

                    {fruit.scientificName && (
                      <p className="text-[11px] text-muted-foreground italic truncate">
                        {fruit.scientificName}
                      </p>
                    )}

                    <div className="flex items-center gap-2 mt-1 text-[11px] text-muted-foreground flex-wrap">
                      {fruit.nutrients?.macros?.calories_kcal != null && (
                        <span>{fruit.nutrients.macros.calories_kcal} kcal</span>
                      )}
                      {fruit.region && (
                        <span>· Région : {fruit.region}</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Boutons d'activation des rôles dans la dégustation */}
                <div className="pt-2 border-t border-border/40 grid grid-cols-2 gap-2">
                  {/* Toggle Fruit Principal (Étape 1) */}
                  <button
                    type="button"
                    onClick={() => handleToggleMain(fruit.id, fruit.name)}
                    disabled={saving}
                    className={`px-2.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer border ${
                      isMain
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : 'bg-muted/40 text-muted-foreground hover:text-foreground border-border/50 hover:bg-muted'
                    }`}
                  >
                    {isMain ? (
                      <>
                        <Check className="size-3.5 shrink-0" />
                        <span>Fruit (Étape 1)</span>
                      </>
                    ) : (
                      <>
                        <Plus className="size-3.5 shrink-0" />
                        <span>+ Fruit (Étp 1)</span>
                      </>
                    )}
                  </button>

                  {/* Toggle Supplément (Étape 2) */}
                  <button
                    type="button"
                    onClick={() => handleToggleSupplement(fruit.id, fruit.name)}
                    disabled={saving}
                    className={`px-2.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer border ${
                      isSupp
                        ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                        : 'bg-muted/40 text-muted-foreground hover:text-foreground border-border/50 hover:bg-muted'
                    }`}
                  >
                    {isSupp ? (
                      <>
                        <Check className="size-3.5 shrink-0" />
                        <span>Suppl. (Étape 2)</span>
                      </>
                    ) : (
                      <>
                        <Plus className="size-3.5 shrink-0" />
                        <span>+ Suppl. (Étp 2)</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── ACTIONS GROUPÉES DE SECOURS ── */}
      <div className="pt-4 border-t border-border/40 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
        <p className="flex items-center gap-1.5">
          <Info className="size-3.5 text-[#E0982E] shrink-0" />
          Astuce : vous pouvez activer un même ingrédient à la fois en fruit principal et en supplément.
        </p>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleIncludeAllAsMains}
            disabled={saving}
            className="text-xs font-semibold rounded-lg h-8"
          >
            Tout inclure en fruits
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleDisableAll}
            disabled={saving}
            className="text-xs font-semibold text-destructive hover:text-destructive rounded-lg h-8"
          >
            Tout retirer
          </Button>
        </div>
      </div>
    </div>
  );
}
