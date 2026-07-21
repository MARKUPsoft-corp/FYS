import { PageComponent, useNavigate, useSearchParams } from 'rasengan';
import { Save, Loader2, ChevronRight, Sparkles } from 'lucide-react';
import { useState, useMemo, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { LabHeader, type LabTab } from '@/components/features/lab/LabHeader';
import { ComposeTab, type ComposeStep } from '@/components/features/lab/ComposeTab';
import { OrderSheet } from '@/components/features/cocktail/OrderSheet';
import { NutrifysComposeTab } from '@/components/features/lab/NutrifysComposeTab';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import type { CocktailProposal } from '@/data/nutrifys-chat';
import type { CocktailIngredient, AIAnalysis, Cocktail } from '@/entities';
import { CocktailType, isUsableAsSupplement, sumIngredientPrices, pricePerBottle, MAX_LAB_MAIN_FRUITS, MAX_LAB_SUPPLEMENTS } from '@/entities';
import { getFruits } from '@/services/fruit';
import { getPricingSettings } from '@/services/settings';
import { createCocktail } from '@/services/cocktail';
import { analyzeCocktail, recommendSupplements } from '@/services/ai';
import type { AIRecommendation } from '@/services/ai.shared';
import { useAuthStore } from '@/stores/auth';
import { useProfileStore } from '@/stores/profile';
import { pushHistoryParam, useCloseHistoryParam } from '@/hooks/useHistoryParam';
import { PageTour, useIsDesktop } from '@/components/features/tour/ClientTour';
import { buildLabTourSteps } from '@/components/features/tour/pages/lab-tour';

const FysLab: PageComponent = () => {
  const { user } = useAuthStore();
  const { profile } = useProfileStore();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const closeHistoryParam = useCloseHistoryParam();
  const queryClient = useQueryClient();

  // ── Scroll to top whenever we land on this page or switch tabs ──
  useEffect(() => {
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, []);


  const tabParam = searchParams.get('tab');
  const stepParam = searchParams.get('step');
  const sheetParam = searchParams.get('sheet');

  const activeTab: LabTab = tabParam === 'nutrifys' ? 'nutrifys' : 'compose';
  const composeStep: ComposeStep = stepParam === '2' ? 2 : 1;
  const showRenameSheet = sheetParam === 'rename';
  const showOrderSheet = sheetParam === 'order';

  const [selectedIngredients, setSelectedIngredients] = useState<Map<string, number>>(new Map());
  const [selectedSupplements, setSelectedSupplements] = useState<Map<string, number>>(new Map());
  const [cocktailName, setCocktailName] = useState('');
  const nameTouchedRef = useRef(false);
  const [saving, setSaving] = useState(false);
  const [analysis, setAnalysis] = useState<AIAnalysis | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  const [aiRecommendation, setAiRecommendation] = useState<AIRecommendation | null>(null);
  const [loadingAI, setLoadingAI] = useState(false);
  const recommendKeyRef = useRef<string>('');
  const isDesktop = useIsDesktop();
  const labTourSteps = useMemo(() => buildLabTourSteps(isDesktop), [isDesktop]);

  const { data: fruits = [], isLoading: fruitsLoading } = useQuery({
    queryKey: ['fruits'],
    queryFn: getFruits,
  });

  const { data: pricing } = useQuery({
    queryKey: ['pricing-settings'],
    queryFn: getPricingSettings,
  });

  const supplements = useMemo(
    () => fruits.filter(isUsableAsSupplement),
    [fruits],
  );

  function buildCombinedMap(
    mains = selectedIngredients,
    supps = selectedSupplements,
  ) {
    const combined = new Map(mains);
    for (const [id, grams] of supps) {
      if (!combined.has(id)) combined.set(id, grams);
    }
    return combined;
  }

  function buildIngredients(
    mains = selectedIngredients,
    supps = selectedSupplements,
  ): CocktailIngredient[] {
    const list: CocktailIngredient[] = [];
    for (const [fruitId, quantityGrams] of mains) {
      const fruit = fruits.find((f) => f.id === fruitId);
      if (!fruit) continue;
      list.push({
        fruitId,
        fruitName: fruit.name,
        quantityGrams,
        priceSnapshot: fruit.price ?? 0,
        role: 'fruit',
      });
    }
    for (const [fruitId, quantityGrams] of supps) {
      if (mains.has(fruitId)) continue;
      const fruit = fruits.find((f) => f.id === fruitId);
      if (!fruit) continue;
      list.push({
        fruitId,
        fruitName: fruit.name,
        quantityGrams,
        priceSnapshot: fruit.price ?? 0,
        role: 'supplement',
      });
    }
    return list;
  }

  function provisionalNameFromIds(ids: Iterable<string>): string {
    const names = [...ids]
      .map((id) => fruits.find((f) => f.id === id)?.name)
      .filter((n): n is string => !!n);
    if (names.length === 0) return '';
    if (names.length === 1) return `Élixir ${names[0]}`;
    if (names.length === 2) return `${names[0]} & ${names[1]}`;
    return `${names[0]}, ${names[1]} & cie`;
  }

  function setCocktailNameFromUser(name: string) {
    nameTouchedRef.current = true;
    setCocktailName(name);
  }

  function toggleFruit(id: string) {
    setAnalysis(null);
    setAiRecommendation(null);
    setSelectedSupplements((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Map(prev);
      next.delete(id);
      return next;
    });
    setSelectedIngredients((prev) => {
      const next = new Map(prev);
      if (next.has(id)) {
        next.delete(id);
      } else if (next.size < MAX_LAB_MAIN_FRUITS) {
        next.set(id, 100);
      }
      return next;
    });
  }

  useEffect(() => {
    if (nameTouchedRef.current) return;
    setCocktailName(provisionalNameFromIds(selectedIngredients.keys()));
  }, [selectedIngredients, fruits]);

  function toggleSupplement(id: string) {
    setAnalysis(null);
    setSelectedIngredients((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Map(prev);
      next.delete(id);
      return next;
    });
    setSelectedSupplements((prev) => {
      const next = new Map(prev);
      if (next.has(id)) {
        next.delete(id);
      } else if (next.size < MAX_LAB_SUPPLEMENTS) {
        next.set(id, 20);
      }
      return next;
    });
  }

  function changeQuantity(fruitId: string, grams: number) {
    setAnalysis(null);
    setSelectedIngredients((prev) => {
      const next = new Map(prev);
      next.set(fruitId, grams);
      return next;
    });
  }

  async function fetchSupplementRecommendations(mains: Map<string, number>) {
    if (mains.size === 0 || supplements.length === 0) {
      setAiRecommendation(null);
      return;
    }
    const key = [...mains.keys()].sort().join(',') + '|' + supplements.map((s) => s.id).sort().join(',');
    if (key === recommendKeyRef.current && aiRecommendation) return;
    recommendKeyRef.current = key;

    setLoadingAI(true);
    try {
      const ingredients = [...mains.entries()].map(([fruitId, grams]) => ({
        fruit: fruits.find((f) => f.id === fruitId)!,
        grams,
      })).filter((i) => i.fruit);

      const result = await recommendSupplements(ingredients, profile, supplements);
      setAiRecommendation(result);

      // Pré-sélectionner uniquement les suggestions NutriFYS (remplace l'ancienne sélection)
      setSelectedSupplements(() => {
        const next = new Map<string, number>();
        for (const id of result.recommendedIds.slice(0, MAX_LAB_SUPPLEMENTS)) {
          if (!mains.has(id)) next.set(id, 20);
        }
        return next;
      });
    } catch (err) {
      console.error(err);
      setAiRecommendation(null);
    } finally {
      setLoadingAI(false);
    }
  }

  function handleTabChange(tab: LabTab) {
    if (tab === activeTab) return;
    if (tab === 'nutrifys') {
      pushHistoryParam(setSearchParams, 'tab', 'nutrifys');
      return;
    }
    // Retour vers "Je compose"
    if (!closeHistoryParam('tab')) {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.delete('tab');
        return next;
      }, { replace: true });
    }
  }

  function handleStepChange(step: ComposeStep) {
    if (step === 2 && selectedIngredients.size === 0) return;
    if (step === composeStep) return;
    if (step === 2) {
      pushHistoryParam(setSearchParams, 'step', '2');
      return;
    }
    if (!closeHistoryParam('step')) {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.delete('step');
        return next;
      }, { replace: true });
    }
  }

  // Charger les suggestions suppléments à l'arrivée sur l'étape 2 (y compris via retour historique)
  useEffect(() => {
    if (composeStep === 2 && selectedIngredients.size > 0) {
      fetchSupplementRecommendations(selectedIngredients);
    }
  }, [composeStep]); // eslint-disable-line react-hooks/exhaustive-deps

  function openRenameSheet() {
    pushHistoryParam(setSearchParams, 'sheet', 'rename');
  }

  function closeRenameSheet(open: boolean) {
    if (open) return;
    if (!closeHistoryParam('sheet')) {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.delete('sheet');
        return next;
      }, { replace: true });
    }
  }

  function openOrderSheet() {
    pushHistoryParam(setSearchParams, 'sheet', 'order');
  }

  function closeOrderSheet(open: boolean) {
    if (open) return;
    if (!closeHistoryParam('sheet')) {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.delete('sheet');
        return next;
      }, { replace: true });
    }
  }

  async function handleAnalyze(forcedMains?: Map<string, number>, forcedSupps?: Map<string, number>) {
    const mains = forcedMains ?? selectedIngredients;
    const combined = buildCombinedMap(mains, forcedSupps ?? selectedSupplements);
    if (combined.size === 0) return;
    setAnalyzing(true);
    try {
      const ingredients = [...combined.entries()].map(([fruitId, grams]) => ({
        fruit: fruits.find((f) => f.id === fruitId)!,
        grams,
      })).filter((i) => i.fruit);
      const result = await analyzeCocktail(ingredients, profile);
      setAnalysis(result);
      if (!nameTouchedRef.current && result.suggestedName?.trim()) {
        setCocktailName(result.suggestedName.trim());
      }
    } finally {
      setAnalyzing(false);
    }
  }

  const ingredientsOnlyTotal = useMemo(() => {
    const ingredients = buildIngredients();
    return sumIngredientPrices(ingredients);
  }, [selectedIngredients, selectedSupplements, fruits]);

  const defaultBottleTotal = pricing
    ? pricePerBottle(pricing, '500ml', buildIngredients())
    : ingredientsOnlyTotal + 1500;

  const draftCocktail = useMemo(() => {
    if (!user || selectedIngredients.size === 0) return null;
    const ingredients = buildIngredients();
    const base = pricing?.bottle500mlBase ?? 1500;
    return {
      id: 'draft',
      name: cocktailName.trim() || provisionalNameFromIds(selectedIngredients.keys()) || 'Création FYS',
      type: CocktailType.CUSTOM,
      createdBy: user.uid,
      isActive: true,
      isPublic: false,
      ingredients,
      basePrice: base,
      totalPrice: defaultBottleTotal,
      ...(analysis ? { aiAnalysis: analysis } : {}),
    } as Cocktail;
  }, [user, fruits, selectedIngredients, selectedSupplements, cocktailName, defaultBottleTotal, analysis, pricing]);

  async function handleSave() {
    if (!user || !cocktailName.trim() || selectedIngredients.size === 0) return;
    setSaving(true);
    try {
      const ingredients = buildIngredients();
      const base = pricing?.bottle500mlBase ?? 1500;
      const cocktailId = await createCocktail({
        name: cocktailName.trim(),
        type: CocktailType.CUSTOM,
        createdBy: user.uid,
        isActive: true,
        isPublic: false,
        ingredients,
        basePrice: base,
        totalPrice: defaultBottleTotal,
        ...(analysis ? { aiAnalysis: analysis } : {}),
      });
      queryClient.invalidateQueries({ queryKey: ['user-cocktails'] });
      setSelectedIngredients(new Map());
      setSelectedSupplements(new Map());
      setCocktailName('');
      nameTouchedRef.current = false;
      setAnalysis(null);
      setAiRecommendation(null);
      setSearchParams({}, { replace: true });
      navigate(`/board/cocktails?cocktail=${cocktailId}`);
    } finally {
      setSaving(false);
    }
  }

  /** Après commande : OrderSheet a déjà persisté le cocktail (draft) — pas de second createCocktail. */
  function handleOrderSuccess() {
    queryClient.invalidateQueries({ queryKey: ['user-cocktails'] });
    setSelectedIngredients(new Map());
    setSelectedSupplements(new Map());
    setCocktailName('');
    nameTouchedRef.current = false;
    setAnalysis(null);
    setAiRecommendation(null);
    setSearchParams({}, { replace: true });
  }

  function handleAnalyzeFromProposal(proposal: CocktailProposal) {
    const next = new Map<string, number>();
    proposal.fruitIds.slice(0, MAX_LAB_MAIN_FRUITS).forEach((id) => next.set(id, 100));
    const nextSupps = new Map<string, number>();
    proposal.supplementIds.slice(0, MAX_LAB_SUPPLEMENTS).forEach((id) => {
      if (!next.has(id)) nextSupps.set(id, 20);
    });
    setSelectedIngredients(next);
    setSelectedSupplements(nextSupps);
    setCocktailName(proposal.name);
    nameTouchedRef.current = true;
    // Remplacer la vue chatbot par l'étape 2 compose
    setSearchParams({ step: '2' }, { replace: true });
    setTimeout(() => handleAnalyze(next, nextSupps), 50);
  }

  // Si plus de fruits et qu'on est sur step 2 dans l'URL, revenir à l'étape 1
  useEffect(() => {
    if (selectedIngredients.size === 0 && stepParam === '2') {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.delete('step');
        return next;
      }, { replace: true });
    }
  }, [selectedIngredients.size, stepParam, setSearchParams]);

  return (
    <PageTour
      pageId="lab"
      steps={labTourSteps}
      canAutoStart={activeTab === 'compose' && !fruitsLoading}
      autoStartDelay={1000}
    >
    <div className="min-h-dvh bg-background overflow-x-clip">
      <LabHeader
        activeTab={activeTab}
        onTabChange={handleTabChange}
        compact={activeTab === 'nutrifys'}
      />

      <div
        className={cn(
          'mx-auto w-full',
          activeTab === 'nutrifys'
            ? 'max-w-[1480px] px-2 lg:px-5 pb-4 lg:pb-12'
            : 'max-w-6xl px-4 lg:px-16 pb-lab-bar lg:pb-12',
        )}
      >
        {activeTab === 'compose' && (
          <ComposeTab
            fruits={fruits}
            supplements={supplements}
            loading={fruitsLoading}
            composeStep={composeStep}
            onStepChange={handleStepChange}
            selectedIngredients={selectedIngredients}
            selectedSupplements={selectedSupplements}
            onToggleFruit={toggleFruit}
            onToggleSupplement={toggleSupplement}
            onChangeQuantity={changeQuantity}
            cocktailName={cocktailName}
            onNameChange={setCocktailNameFromUser}
            onSave={() => handleSave()}
            saving={saving}
            analysis={analysis}
            onAnalyze={() => handleAnalyze()}
            analyzing={analyzing}
            onOrderRequest={openOrderSheet}
            aiRecommendation={aiRecommendation}
            loadingAI={loadingAI}
          />
        )}

        {activeTab === 'nutrifys' && (
          <NutrifysComposeTab
            onAnalyzeProposal={handleAnalyzeFromProposal}
          />
        )}
      </div>

      {/* ── Mobile sticky bottom bar ─────────────────────────────────────────── */}
      {activeTab === 'compose' && (
        <div id="tour-lab-mobile-bar" className="fixed bottom-0 left-0 w-full bg-background/95 backdrop-blur-md border-t border-border/50 p-4 fixed-bottom-safe z-50 rounded-t-3xl lg:hidden">
          <div className="max-w-lg mx-auto space-y-3">
            <div className="flex items-center gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
              {[...selectedIngredients.keys()].map((fruitId) => {
                const fruit = fruits.find((f) => f.id === fruitId);
                return fruit ? (
                  <div
                    key={fruitId}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 rounded-full border border-primary/20 text-xs font-bold text-primary whitespace-nowrap"
                  >
                    {fruit.name}
                  </div>
                ) : null;
              })}
              {[...selectedSupplements.keys()].map((id) => {
                const item = fruits.find((f) => f.id === id);
                return item ? (
                  <div
                    key={id}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-secondary/10 rounded-full border border-secondary/20 text-xs font-bold text-secondary whitespace-nowrap"
                  >
                    {item.name}
                  </div>
                ) : null;
              })}
              {selectedIngredients.size === 0 && (
                <span className="text-xs font-medium text-muted-foreground">
                  Aucun fruit sélectionné
                </span>
              )}
            </div>

            {composeStep === 1 ? (
              <Button
                size="lg"
                className="w-full h-14 rounded-full font-bold text-[17px] active:scale-95 transition-all gap-3 bg-primary hover:bg-primary/90 text-white shadow-[0_8px_25px_rgba(63,109,78,0.3)]"
                disabled={selectedIngredients.size === 0}
                onClick={() => handleStepChange(2)}
              >
                Suivant · Suppléments
                <ChevronRight className="size-5" />
              </Button>
            ) : (
              <Button
                size="lg"
                className="w-full h-14 rounded-full font-bold text-[17px] active:scale-95 transition-all gap-3"
                style={analysis
                  ? { background: '#3F6D4E', color: '#fff', boxShadow: '0 8px 25px rgba(63,109,78,0.3)' }
                  : { background: '#E0982E', color: '#fff', boxShadow: '0 8px 25px rgba(224,152,46,0.3)' }
                }
                disabled={selectedIngredients.size === 0 || analyzing}
                onClick={analysis ? openRenameSheet : () => handleAnalyze()}
              >
                {analyzing
                  ? <><span className="size-5 border-2 border-white/40 border-t-white rounded-full animate-spin inline-block" /> Analyse…</>
                  : analysis
                  ? <><Save className="size-5" /> Sauvegarder</>
                  : <><Sparkles className="size-5" /> Analyser avec NutriFYS</>
                }
              </Button>
            )}
          </div>
        </div>
      )}

      <Sheet open={showRenameSheet} onOpenChange={closeRenameSheet}>
        <SheetContent side="bottom" className="rounded-t-3xl border-border/40 p-6 flex flex-col gap-6 lg:hidden">
          <SheetHeader>
            <SheetTitle className="font-display text-xl text-center">Nommez votre création</SheetTitle>
            <SheetDescription className="text-center text-xs">
              Donnez un nom unique à votre cocktail avant de le sauvegarder.
            </SheetDescription>
          </SheetHeader>
          <div className="space-y-4">
            <Input
              value={cocktailName}
              onChange={(e) => setCocktailNameFromUser(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && cocktailName.trim() && !saving) {
                  closeRenameSheet(false);
                  handleSave();
                }
              }}
              placeholder="Nom suggéré par NutriFYS…"
              className="h-12 rounded-xl text-base px-4 bg-muted/30 focus-visible:ring-primary/40"
              autoFocus
            />
            <Button
              size="lg"
              className="w-full h-12 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold gap-2 text-base shadow-[0_8px_25px_rgba(63,109,78,0.3)] active:scale-95"
              disabled={!cocktailName.trim() || saving}
              onClick={() => {
                closeRenameSheet(false);
                handleSave();
              }}
            >
              {saving ? <><Loader2 className="size-4 animate-spin" /> Enregistrement…</> : <><Save className="size-4" /> Enregistrer le cocktail</>}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {draftCocktail && user && (
        <OrderSheet
          cocktail={draftCocktail}
          open={showOrderSheet}
          onOpenChange={closeOrderSheet}
          user={{ uid: user.uid, name: (user as any).displayName || (user as any).name || '', email: user.email || '' }}
          onOrderSuccess={handleOrderSuccess}
        />
      )}
    </div>
    </PageTour>
  );
};

FysLab.metadata = {
  title: 'FYS Lab — Créateur de Cocktail',
  description: 'Créez et validez votre cocktail santé avec NutriFYS',
};

export default FysLab;
