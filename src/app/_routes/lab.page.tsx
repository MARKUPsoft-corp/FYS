import { useTranslation } from 'react-i18next';
import i18n from '@/i18n';
import { PageComponent, useNavigate, useSearchParams } from 'rasengan';
import { Save, Sparkles } from 'lucide-react';
import { useState, useMemo, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { LabHeader, type LabTab } from '@/components/features/lab/LabHeader';
import { ComposeTab, type ComposeStep } from '@/components/features/lab/ComposeTab';
import { OrderSheet } from '@/components/features/cocktail/OrderSheet';
import { SaveCocktailDialog } from '@/components/features/lab/SaveCocktailDialog';
import { NutrifysComposeTab } from '@/components/features/lab/NutrifysComposeTab';
import type { CocktailProposal } from '@/data/nutrifys-chat';
import type { CocktailIngredient, AIAnalysis, Cocktail } from '@/entities';
import { CocktailType, isUsableAsMainFruit, isUsableAsSupplement, isUsableFruit, areFruitsIncompatible, sumIngredientPrices, pricePerBottle, MAX_LAB_MAIN_FRUITS, MAX_LAB_SUPPLEMENTS } from '@/entities';
import { getPricingSettings } from '@/services/settings';
import { createCocktail, getCocktailById } from '@/services/cocktail';
import { analyzeCocktail, recommendSupplements } from '@/services/ai';
import type { AIRecommendation } from '@/services/ai.shared';
import { useAuthStore } from '@/stores/auth';
import { trackEvent } from '@/lib/analytics';
import { useProfileStore, isProfileComplete } from '@/stores/profile';
import { pushHistoryParam, useCloseHistoryParam } from '@/hooks/useHistoryParam';
import { useFruitsRealtime } from '@/hooks/useFruitsRealtime';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { consumePendingAction, saveLabMix, loadLabMix } from '@/lib/pending-action';
import { OnboardingModal } from '@/components/features/onboarding/OnboardingModal';
import { UserRole } from '@/entities/user';

import { labSounds } from '@/services/lab-sounds';

const FysLab: PageComponent = () => {
  const { t } = useTranslation();
  const { user, loading } = useAuthStore();
  const { profile, fetch: fetchProfile, loading: profileLoading, save: saveProfile } = useProfileStore();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const closeHistoryParam = useCloseHistoryParam();
  const queryClient = useQueryClient();
  const requireAuth = useRequireAuth();

  // ── Scroll to top whenever we land on this page or switch tabs ──
  useEffect(() => {
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, []);

  // ── S'assurer que le profil de santé est chargé pour l'analyse IA ──
  useEffect(() => {
    if (user && !profile && !profileLoading) {
      fetchProfile(user.uid);
    }
  }, [user, profile, profileLoading, fetchProfile]);


  const tabParam = searchParams.get('tab');
  const stepParam = searchParams.get('step');
  const sheetParam = searchParams.get('sheet');
  const loadParam = searchParams.get('load');
  const promoParam = searchParams.get('promo');

  const activeTab: LabTab = tabParam === 'nutrifys' ? 'nutrifys' : 'compose';
  const composeStep: ComposeStep = stepParam === '2' ? 2 : 1;
  const showRenameSheet = sheetParam === 'rename';
  const showOrderSheet = sheetParam === 'order';

  const [selectedIngredients, setSelectedIngredients] = useState<Map<string, number>>(new Map());
  const [selectedSupplements, setSelectedSupplements] = useState<Map<string, number>>(new Map());
  const [cocktailName, setCocktailName] = useState('');
  const nameTouchedRef = useRef(false);
  const pendingRestoredRef = useRef(false);
  const [saving, setSaving] = useState(false);
  const [analysis, setAnalysis] = useState<AIAnalysis | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [showOnboardingForAnalysis, setShowOnboardingForAnalysis] = useState(false);

  const [aiRecommendation, setAiRecommendation] = useState<AIRecommendation | null>(null);
  const [loadingAI, setLoadingAI] = useState(false);
  const recommendKeyRef = useRef<string>('');

  const { fruits, isLoading: fruitsLoading } = useFruitsRealtime();

  const { data: pricing } = useQuery({
    queryKey: ['pricing-settings'],
    queryFn: getPricingSettings,
  });

  const { data: loadedCocktail } = useQuery({
    queryKey: ['cocktail', loadParam],
    queryFn: () => loadParam ? getCocktailById(loadParam) : null,
    enabled: !!loadParam,
  });

  const loadedRef = useRef(false);
  useEffect(() => {
    if (loadedCocktail && fruits.length > 0 && !loadedRef.current) {
      const mains = new Map<string, number>();
      const supps = new Map<string, number>();
      for (const ing of loadedCocktail.ingredients) {
        if (ing.role === 'supplement') {
          supps.set(ing.fruitId, ing.quantityGrams);
        } else {
          mains.set(ing.fruitId, ing.quantityGrams);
        }
      }
      setSelectedIngredients(mains);
      setSelectedSupplements(supps);
      setCocktailName(loadedCocktail.name);
      nameTouchedRef.current = true;
      if (loadedCocktail.aiAnalysis) {
        setAnalysis(loadedCocktail.aiAnalysis);
      }
      loadedRef.current = true;
    }
  }, [loadedCocktail, fruits.length]);

  const supplements = useMemo(
    () => fruits.filter((f) => isUsableAsSupplement(f) && isUsableFruit(f)),
    [fruits],
  );

  // ── Temps réel : retire du mélange en cours les fruits/suppléments que
  //    l'admin vient de rendre indisponibles OU qui ne sont plus autorisés
  //    dans leur rôle (ex : fruit passé en « uniquement supplément ») ──
  const availableMainIds = useMemo(
    () => new Set(fruits.filter((f) => isUsableAsMainFruit(f) && isUsableFruit(f)).map((f) => f.id)),
    [fruits],
  );

  const availableSupplementIds = useMemo(
    () => new Set(fruits.filter((f) => isUsableAsSupplement(f) && isUsableFruit(f)).map((f) => f.id)),
    [fruits],
  );

  useEffect(() => {
    const prune = (prev: Map<string, number>) => {
      const stale = [...prev.keys()].some((id) => !availableMainIds.has(id));
      if (!stale) return prev;
      const next = new Map(prev);
      for (const id of [...next.keys()]) {
        if (!availableMainIds.has(id)) {
          next.delete(id);
          labSounds.fruitDeselect();
        }
      }
      return next;
    };
    setSelectedIngredients(prune);
    const pruneSupps = (prev: Map<string, number>) => {
      const stale = [...prev.keys()].some((id) => !availableSupplementIds.has(id));
      if (!stale) return prev;
      const next = new Map(prev);
      for (const id of [...next.keys()]) {
        if (!availableSupplementIds.has(id)) {
          next.delete(id);
          labSounds.fruitDeselect();
        }
      }
      return next;
    };
    setSelectedSupplements(pruneSupps);
  }, [availableMainIds, availableSupplementIds]);

  // ── Reprise d'action après connexion : rejoue automatiquement l'action
  //    qui avait été interrompue (analyser, commander, sauvegarder, tab IA) ──
  useEffect(() => {
    // Attendre que l'auth ET le profil soient chargés avant de rejouer
    if (loading || !user || fruitsLoading || fruits.length === 0) return;
    // Si le profil est encore en cours de chargement, on attend
    if (profileLoading) return;

    const action = consumePendingAction();
    if (!action) return;

    const mix = loadLabMix();
    if (mix) {
      setSelectedIngredients(mix.mains);
      setSelectedSupplements(mix.supps);
      if (mix.name) {
        setCocktailName(mix.name);
        nameTouchedRef.current = true;
      }
      pendingRestoredRef.current = true;
    }

    if (action === 'analyze' && mix) {
      setTimeout(() => handleAnalyze(mix.mains, mix.supps), 150);
    } else if (action === 'order' && mix) {
      setTimeout(() => pushHistoryParam(setSearchParams, 'sheet', 'order'), 150);
    } else if (action === 'save' && mix) {
      setTimeout(() => handleSave(), 150);
    } else if (action === 'nutrifys') {
      setTimeout(() => handleTabChange('nutrifys'), 150);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, user, fruitsLoading, fruits.length, profileLoading]);


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
    if (names.length === 1) return t('lab.singleName', { name: names[0] });
    if (names.length === 2) return t('lab.pairName', { a: names[0], b: names[1] });
    return t('lab.multiName', { a: names[0], b: names[1] });
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
        // 🎵 Play deselect sound
        labSounds.fruitDeselect();
      } else if (next.size < MAX_LAB_MAIN_FRUITS) {
        // Retire automatiquement les fruits incompatibles déjà sélectionnés
        const newFruit = fruits.find((f) => f.id === id);
        if (newFruit) {
          for (const [fid] of [...next.keys()]) {
            const existing = fruits.find((f) => f.id === fid);
            if (existing && areFruitsIncompatible(newFruit, existing)) {
              next.delete(fid);
              labSounds.fruitDeselect();
            }
          }
        }
        next.set(id, 100);
        // 🎵 Play fruit selection sound
        labSounds.fruitSelect();
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
        // 🎵 Play deselect sound
        labSounds.fruitDeselect();
      } else if (next.size < MAX_LAB_SUPPLEMENTS) {
        next.set(id, 20);
        // 🎵 Play fruit selection sound
        labSounds.fruitSelect();
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
    // L'analyse NutriFYS nécessite une connexion (profil santé)
    if (!user) {
      setAiRecommendation(null);
      return;
    }
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
      // NutriFYS = analyse IA → connexion requise
      if (!user) {
        requireAuth('nutrifys');
        return;
      }
      pushHistoryParam(setSearchParams, 'tab', 'nutrifys');
      return;
    }
    // Retour vers "Je compose"
    // NB : on ne pop pas l'historique (navigate(-1)) car le tab NutriFYS est souvent
    // atteint via une entrée depuis l'accueil — un back enverrait sinon le visiteur
    // tout droit à la page d'accueil. On supprime simplement le paramètre (replace).
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete('tab');
      return next;
    }, { replace: true });
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
    // Commander nécessite une connexion
    if (!user) {
      saveLabMix({
        mains: selectedIngredients,
        supps: selectedSupplements,
        name: cocktailName,
      });
      requireAuth('order');
      return;
    }
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
    // L'analyse NutriFYS nécessite une connexion (profil santé)
    if (!user) {
      saveLabMix({
        mains: forcedMains ?? selectedIngredients,
        supps: forcedSupps ?? selectedSupplements,
        name: cocktailName,
      });
      requireAuth('analyze');
      return;
    }

    // Si le profil de santé est incomplet (et bien chargé), afficher l'onboarding d'abord.
    // Ne pas déclencher l'onboarding si le profil est encore en cours de chargement
    // (profileLoading = true) car le profil pourrait être complet mais pas encore arrivé.
    if (user.role === UserRole.CUSTOMER && !profileLoading && !isProfileComplete(profile)) {
      // Mémoriser le mix pour ne pas perdre la sélection
      saveLabMix({
        mains: forcedMains ?? selectedIngredients,
        supps: forcedSupps ?? selectedSupplements,
        name: cocktailName,
      });
      setShowOnboardingForAnalysis(true);
      return;
    }
    // Si le profil est encore en chargement, on attend qu'il soit prêt
    if (user.role === UserRole.CUSTOMER && profileLoading) {
      // Sauvegarder le mix et réessayer quand le profil sera chargé
      saveLabMix({
        mains: forcedMains ?? selectedIngredients,
        supps: forcedSupps ?? selectedSupplements,
        name: cocktailName,
      });
      return; // Le useEffect sur profileLoading reprendra l'action
    }
    const mains = forcedMains ?? selectedIngredients;
    const combined = buildCombinedMap(mains, forcedSupps ?? selectedSupplements);
    if (combined.size === 0) return;
    
    // 🎵 Play analysis start sound + ambient loop
    labSounds.analysisStart();
    labSounds.analysisAmbient();
    
    setAnalyzing(true);
    try {
      const ingredients = [...combined.entries()].map(([fruitId, grams]) => ({
        fruit: fruits.find((f) => f.id === fruitId)!,
        grams,
      })).filter((i) => i.fruit);
      const result = await analyzeCocktail(ingredients, profile);
      setAnalysis(result);
      trackEvent('generate_custom_mix', {
        item_count: ingredients.length,
        items: ingredients.map(i => ({ item_id: i.fruit.id, item_category: 'fruit' })),
      });
      if (!nameTouchedRef.current && result.suggestedName?.trim()) {
        setCocktailName(result.suggestedName.trim());
      }
      
      // 🎵 Play completion sound
      labSounds.analysisComplete();
    } catch (err) {
      // Stop ambient on error
      labSounds.stopAmbient();
      throw err;
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
      name: cocktailName.trim() || provisionalNameFromIds(selectedIngredients.keys()) || t('lab.defaultName'),
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
    if (!user) {
      saveLabMix({
        mains: selectedIngredients,
        supps: selectedSupplements,
        name: cocktailName,
      });
      requireAuth('save');
      return;
    }
    if (!cocktailName.trim() || selectedIngredients.size === 0) return;
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
      navigate(`/board/catalogue?cocktail=${cocktailId}`);
    } finally {
      setSaving(false);
    }
  }

  /** Après commande : réinitialiser le lab quand le sheet se ferme */
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
    // Filtre de sécurité : ne garde que les fruits actifs et non incompatibles entre eux
    const next = new Map<string, number>();
    for (const id of proposal.fruitIds.slice(0, MAX_LAB_MAIN_FRUITS)) {
      const newFruit = fruits.find((f) => f.id === id);
      if (!newFruit || !isUsableFruit(newFruit)) continue;
      const conflicts = [...next.keys()].some((fid) => {
        const existing = fruits.find((f) => f.id === fid);
        return existing ? areFruitsIncompatible(newFruit, existing) : false;
      });
      if (!conflicts) next.set(id, 100);
    }
    const nextSupps = new Map<string, number>();
    proposal.supplementIds.slice(0, MAX_LAB_SUPPLEMENTS).forEach((id) => {
      // `supplements` n'expose déjà que les suppléments actifs
      if (supplements.some((s) => s.id === id) && !next.has(id)) nextSupps.set(id, 20);
    });
    if (next.size === 0) return; // tout était incompatible : on ne compose rien
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
    <>
      <div className="min-h-dvh bg-background overflow-x-clip page-transition-wrapper">
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
              : 'max-w-[1480px] px-4 lg:px-16 pb-lab-bar lg:pb-12',
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
              onSaveClick={openRenameSheet}
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

        {/* Modale d'enregistrement du cocktail */}
        <SaveCocktailDialog
          open={showRenameSheet}
          onOpenChange={closeRenameSheet}
          cocktailName={cocktailName}
          onNameChange={setCocktailNameFromUser}
          selectedFruits={fruits.filter((f) => selectedIngredients.has(f.id))}
          selectedSupplements={fruits.filter((f) => selectedSupplements.has(f.id))}
          analysis={analysis}
          saving={saving}
          onSave={() => handleSave()}
        />

        {draftCocktail && user && (
          <OrderSheet
            cocktail={draftCocktail}
            open={showOrderSheet}
            onOpenChange={closeOrderSheet}
            user={{ uid: user.uid, name: (user as any).displayName || (user as any).name || '', email: user.email || '' }}
            onOrderSuccess={handleOrderSuccess}
            promoCode={promoParam || undefined}
          />
        )}
      </div>

      {/* Onboarding modal déclenché par l'analyse si profil incomplet */}
      {user && (
        <OnboardingModal
          open={showOnboardingForAnalysis}
          onSkip={() => setShowOnboardingForAnalysis(false)}
          onComplete={async (data) => {
            if (!user) return;
            await saveProfile(user.uid, data);
            await fetchProfile(user.uid);
            setShowOnboardingForAnalysis(false);
            // Reprendre l'analyse avec le mix sauvegardé
            const mix = loadLabMix();
            if (mix) {
              setSelectedIngredients(mix.mains);
              setSelectedSupplements(mix.supps);
              if (mix.name) setCocktailName(mix.name);
              setTimeout(() => handleAnalyze(mix.mains, mix.supps), 200);
            } else {
              setTimeout(() => handleAnalyze(), 200);
            }
          }}
        />
      )}

      {/* ── Mobile sticky bottom bar (OUTSIDE main container) ─────────────────────────────────────────── */}
      {activeTab === 'compose' && (
        <div  className="fixed bottom-0 left-0 right-0 w-full bg-background/95 backdrop-blur-md border-t border-border/50 p-4 fixed-bottom-safe z-50 rounded-t-3xl lg:hidden">
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
                  {t('lab.noFruitSelected')}
                </span>
              )}
            </div>

            {composeStep === 1 ? (
              analysis ? (
                <Button
                  size="lg"
                  className="w-full h-14 rounded-full font-bold text-[17px] active:scale-95 transition-all gap-3"
                  style={{ background: '#3F6D4E', color: '#fff', boxShadow: '0 8px 25px rgba(63,109,78,0.3)' }}
                  onClick={openRenameSheet}
                >
                  <Save className="size-5" /> {t('common.save')}
                </Button>
              ) : (
                <div className="space-y-2">
                  <Button
                    size="lg"
                    className="w-full h-14 rounded-full font-bold text-[17px] active:scale-95 transition-all gap-3"
                    style={{ background: '#E0982E', color: '#fff', boxShadow: '0 8px 25px rgba(224,152,46,0.3)' }}
                    disabled={selectedIngredients.size === 0 || analyzing}
                    onClick={() => handleAnalyze()}
                  >
                    {analyzing
                      ? <><span className="size-5 border-2 border-white/40 border-t-white rounded-full animate-spin inline-block" /> {t('lab.analyzingShort')}</>
                      : <><Sparkles className="size-5" /> {t('lab.analyzeWith')}</>
                    }
                  </Button>
                </div>
              )
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
                  ? <><span className="size-5 border-2 border-white/40 border-t-white rounded-full animate-spin inline-block" /> {t('lab.analyzingShort')}</>
                  : analysis
                  ? <><Save className="size-5" /> {t('common.save')}</>
                  : <><Sparkles className="size-5" /> {t('lab.analyzeWith')}</>
                }
              </Button>
            )}
          </div>
        </div>
      )}
    </>
  );
};

FysLab.metadata = {
  title: i18n.t('lab.pageTitle'),
  description: i18n.t('lab.pageDesc'),
};

export default FysLab;
