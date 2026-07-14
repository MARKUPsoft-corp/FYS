import { PageComponent, useNavigate } from 'rasengan';
import { Sparkles, Save, ShoppingBag } from 'lucide-react';
import { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { LabHeader, type LabTab } from '@/components/features/lab/LabHeader';
import { ComposeTab } from '@/components/features/lab/ComposeTab';
import { OrderSheet } from '@/components/features/cocktail/OrderSheet';
import {
  SupplementsTab,
  getSupplementsSummaryItems,
} from '@/components/features/lab/SupplementsTab';
import { NutrifysComposeTab } from '@/components/features/lab/NutrifysComposeTab';
import { LAB_FRUITS } from '@/data/lab-items';
import type { CocktailProposal } from '@/data/nutrifys-chat';
import type { LabItem } from '@/data/lab-items';
import type { CocktailIngredient, AIAnalysis, Cocktail } from '@/entities';
import { CocktailType, BASE_COCKTAIL_PRICE } from '@/entities';
import { getFruits } from '@/services/fruit';
import { createCocktail } from '@/services/cocktail';
import { analyzeCocktail, recommendSupplements } from '@/services/ai';
import { useAuthStore } from '@/stores/auth';
import { useProfileStore } from '@/stores/profile';

// ── Mobile save sheet ─────────────────────────────────────────────────────────

function MobileSaveSheet({
  cocktailName,
  onNameChange,
  canSave,
  saving,
  onSave,
}: {
  cocktailName: string;
  onNameChange: (v: string) => void;
  canSave: boolean;
  saving: boolean;
  onSave: () => Promise<void>;
}) {
  return (
    <div className="px-6 pt-6 pb-8 space-y-4">
      <div className="w-12 h-1 bg-border rounded-full mx-auto mb-6" />
      <h2 className="font-display font-bold text-xl text-foreground">Sauvegarder le cocktail</h2>
      <p className="text-sm text-muted-foreground">
        Donnez un nom à votre recette pour la retrouver dans vos créations.
      </p>
      <Input
        value={cocktailName}
        onChange={(e) => onNameChange(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && canSave && !saving && onSave()}
        placeholder="Nom de mon cocktail…"
        className="h-12 rounded-2xl text-base"
        autoFocus
      />
      <Button
        size="lg"
        className="w-full h-14 rounded-2xl bg-primary hover:bg-primary/90 text-white font-bold text-base shadow-[0_8px_25px_rgba(63,109,78,0.3)] active:scale-95 transition-all gap-2"
        disabled={(!canSave || saving) ? true : undefined}
        onClick={onSave}
      >
        {saving ? 'Sauvegarde…' : <><Save className="size-5" /> Sauvegarder la recette</>}
      </Button>
    </div>
  );
}

const FysLab: PageComponent = () => {
  const { user } = useAuthStore();
  const { profile } = useProfileStore();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<LabTab>('compose');

  // ── Compose tab state ──────────────────────────────────────────────────────
  const [selectedIngredients, setSelectedIngredients] = useState<Map<string, number>>(new Map());
  const [cocktailName, setCocktailName] = useState('');
  const [saving, setSaving] = useState(false);
  const [showMobileSave, setShowMobileSave] = useState(false);
  const [analysis, setAnalysis] = useState<AIAnalysis | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [showOrderSheet, setShowOrderSheet] = useState(false);

  // ── Supplements tab state (still mock-based) ───────────────────────────────
  const [selectedSupplements, setSelectedSupplements] = useState<string[]>([]);

  // ── Load real fruits from Firestore ───────────────────────────────────────
  const { data: fruits = [], isLoading: fruitsLoading } = useQuery({
    queryKey: ['fruits'],
    queryFn: getFruits,
  });

  // ── AI Supplements Recommendation ──────────────────────────────────────────
  const { data: aiRecommendation, isLoading: supplementsLoading } = useQuery({
    queryKey: ['supplements-recommendation', [...selectedIngredients.entries()]],
    queryFn: () => {
      const ingredients = [...selectedIngredients.entries()].map(([fruitId, grams]) => ({
        fruit: fruits.find((f) => f.id === fruitId)!,
        grams,
      }));
      return recommendSupplements(ingredients, profile);
    },
    enabled: activeTab === 'supplements' && selectedIngredients.size > 0 && fruits.length > 0,
    staleTime: Infinity,
  });

  // ── Handlers ──────────────────────────────────────────────────────────────

  function toggleFruit(id: string) {
    setAnalysis(null); // reset analysis when composition changes
    setSelectedIngredients((prev) => {
      const next = new Map(prev);
      if (next.has(id)) next.delete(id);
      else next.set(id, 100);
      return next;
    });
  }

  function changeQuantity(fruitId: string, grams: number) {
    setAnalysis(null); // reset analysis when quantities change
    setSelectedIngredients((prev) => {
      const next = new Map(prev);
      next.set(fruitId, grams);
      return next;
    });
  }

  async function handleAnalyze(forcedIngredients?: Map<string, number>) {
    const ingrMap = forcedIngredients || selectedIngredients;
    if (ingrMap.size === 0) return;
    setAnalyzing(true);
    try {
      const ingredients = [...ingrMap.entries()].map(([fruitId, grams]) => ({
        fruit: fruits.find((f) => f.id === fruitId)!,
        grams,
      }));
      const result = await analyzeCocktail(ingredients, profile);
      setAnalysis(result);
      // On mobile: open the save Sheet to show the verdict
      setShowMobileSave(true);
    } finally {
      setAnalyzing(false);
    }
  }

  const totalPrice =
    BASE_COCKTAIL_PRICE +
    [...selectedIngredients.keys()].reduce((sum, fruitId) => {
      const fruit = fruits.find((f) => f.id === fruitId);
      return sum + (fruit?.price ?? 0);
    }, 0);

  const draftCocktail = useMemo(() => {
    if (!user || selectedIngredients.size === 0) return null;
    const ingredients: CocktailIngredient[] = [...selectedIngredients.entries()].map(
      ([fruitId, quantityGrams]) => {
        const fruit = fruits.find((f) => f.id === fruitId)!;
        return {
          fruitId,
          fruitName: fruit.name,
          quantityGrams,
          priceSnapshot: fruit.price ?? 0,
        };
      },
    );
    return {
      id: 'draft',
      name: cocktailName.trim() || 'Mon Cocktail Personnalisé',
      type: CocktailType.CUSTOM,
      createdBy: user.uid,
      isActive: true,
      isPublic: false,
      ingredients,
      basePrice: BASE_COCKTAIL_PRICE,
      totalPrice,
      ...(analysis ? { aiAnalysis: analysis } : {}),
    } as Cocktail;
  }, [user, fruits, selectedIngredients, cocktailName, totalPrice, analysis]);

  async function handleSave(silent = false) {
    if (!user || !cocktailName.trim() || selectedIngredients.size === 0) return;
    setSaving(true);
    try {
      const ingredients: CocktailIngredient[] = [...selectedIngredients.entries()].map(
        ([fruitId, quantityGrams]) => {
          const fruit = fruits.find((f) => f.id === fruitId)!;
          return {
            fruitId,
            fruitName: fruit.name,
            quantityGrams,
            priceSnapshot: fruit.price ?? 0,
          };
        },
      );
      const cocktailId = await createCocktail({
        name: cocktailName.trim(),
        type: CocktailType.CUSTOM,
        createdBy: user.uid,
        isActive: true,
        isPublic: false,
        ingredients,
        basePrice: BASE_COCKTAIL_PRICE,
        totalPrice,
        ...(analysis ? { aiAnalysis: analysis } : {}),
      });
      queryClient.invalidateQueries({ queryKey: ['user-cocktails'] });
      
      if (!silent) {
        setSelectedIngredients(new Map());
        setCocktailName('');
        setAnalysis(null);
        setShowMobileSave(false);
        navigate(`/board/cocktails?cocktail=${cocktailId}`);
      }
    } finally {
      setSaving(false);
    }
  }

  // ── Map to LabItem for supplements tab ─────────────────────────────────────
  const selectedFruitLabItems: LabItem[] = fruits
    .filter((f) => selectedIngredients.has(f.id))
    .map((f) => {
      const labItem = LAB_FRUITS.find(
        (lf) => lf.name.toLowerCase() === f.name.toLowerCase(),
      );
      return { id: f.id, emoji: labItem?.emoji ?? '🍓', name: f.name };
    });

  function toggleSupplement(id: string) {
    setSelectedSupplements((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id],
    );
  }

  // ── Supplements mobile bar items ───────────────────────────────────────────
  const supplementSummaryItems = getSupplementsSummaryItems(selectedFruitLabItems, selectedSupplements);
  const supplementsCountLabel = `${supplementSummaryItems.length} élément${supplementSummaryItems.length > 1 ? 's' : ''}`;

  function handleAnalyzeFromProposal(proposal: CocktailProposal) {
    const next = new Map<string, number>();
    proposal.fruitIds.forEach((id) => next.set(id, 100));
    setSelectedIngredients(next);
    setSelectedSupplements(proposal.supplementIds);
    setActiveTab('compose');
    // Using setTimeout to guarantee React batched state update allows it to seamlessly render Assemble panel
    setTimeout(() => handleAnalyze(next), 50);
  }

  const canSave = selectedIngredients.size > 0 && cocktailName.trim().length > 0;

  return (
    <div className="min-h-screen bg-background">
      <LabHeader
        activeTab={activeTab}
        onTabChange={setActiveTab}
        compact={activeTab === 'nutrifys'}
      />

      <div
        className={cn(
          'mx-auto w-full',
          activeTab === 'nutrifys'
            ? 'max-w-[1480px] px-2 lg:px-5 pb-4 lg:pb-12'
            : 'max-w-6xl px-4 lg:px-16 pb-36 lg:pb-12',
        )}
      >
        {activeTab === 'compose' && (
          <ComposeTab
            fruits={fruits}
            loading={fruitsLoading}
            selectedIngredients={selectedIngredients}
            onToggleFruit={toggleFruit}
            onChangeQuantity={changeQuantity}
            cocktailName={cocktailName}
            onNameChange={setCocktailName}
            totalPrice={totalPrice}
            onSave={() => handleSave()}
            saving={saving}
            analysis={analysis}
            onAnalyze={() => handleAnalyze()}
            analyzing={analyzing}
            onOrderRequest={() => setShowOrderSheet(true)}
          />
        )}

        {activeTab === 'supplements' && (
          <SupplementsTab
            selectedFruits={selectedFruitLabItems}
            selectedSupplements={selectedSupplements}
            onToggleSupplement={toggleSupplement}
            onAnalyze={() => {}}
            aiRecommendation={aiRecommendation}
            loadingAI={supplementsLoading}
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
        <div className="fixed bottom-0 left-0 w-full bg-background/95 backdrop-blur-md border-t border-border/50 p-4 pb-6 z-50 rounded-t-3xl lg:hidden">
          <div className="max-w-lg mx-auto space-y-3">
            {/* Selected fruit chips + price */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
              {[...selectedIngredients.keys()].map((fruitId) => {
                const fruit = fruits.find((f) => f.id === fruitId);
                return fruit ? (
                  <div
                    key={fruitId}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 rounded-full border border-primary/20 text-xs font-bold text-primary whitespace-nowrap"
                  >
                    {fruit.name} · {selectedIngredients.get(fruitId)}g
                  </div>
                ) : null;
              })}
              {selectedIngredients.size === 0 && (
                <span className="text-xs font-medium text-muted-foreground">
                  Aucun fruit sélectionné
                </span>
              )}
              {selectedIngredients.size > 0 && (
                <span className="ml-auto text-xs font-bold text-primary whitespace-nowrap pl-2">
                  {totalPrice.toLocaleString()} XAF
                </span>
              )}
            </div>

            <Button
              size="lg"
              className="w-full h-14 rounded-full font-bold text-[17px] active:scale-95 transition-all gap-3"
              style={analysis
                ? { background: '#3F6D4E', color: '#fff', boxShadow: '0 8px 25px rgba(63,109,78,0.3)' }
                : { background: '#E0982E', color: '#fff', boxShadow: '0 8px 25px rgba(224,152,46,0.3)' }
              }
              disabled={selectedIngredients.size === 0 || analyzing}
              onClick={analysis ? () => setShowMobileSave(true) : () => handleAnalyze()}
            >
              {analyzing
                ? <><span className="size-5 border-2 border-white/40 border-t-white rounded-full animate-spin inline-block" /> Analyse…</>
                : analysis
                ? <><Save className="size-5" /> Sauvegarder</>
                : <><span className="text-lg">✦</span> Analyser avec NutriFYS</>
              }
            </Button>
          </div>
        </div>
      )}

      {activeTab === 'supplements' && (
        <div className="fixed bottom-0 left-0 w-full bg-background/95 backdrop-blur-md border-t border-border/50 p-4 pb-6 z-50 rounded-t-3xl lg:hidden">
          <div className="max-w-lg mx-auto space-y-3">
            <div className="flex items-center gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
              {supplementSummaryItems.map((item) => (
                <div
                  key={`sel-${item.id}`}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 rounded-full border border-primary/20 text-xs font-bold text-primary whitespace-nowrap"
                >
                  <span>{item.emoji}</span> {item.name}
                </div>
              ))}
              {supplementSummaryItems.length > 0 && (
                <span className="ml-auto text-xs font-bold text-muted-foreground whitespace-nowrap pl-2">
                  {supplementsCountLabel}
                </span>
              )}
              {supplementSummaryItems.length === 0 && (
                <span className="text-xs font-medium text-muted-foreground">
                  Aucun élément sélectionné
                </span>
              )}
            </div>
            <Button
              size="lg"
              className="w-full h-14 rounded-full bg-primary hover:bg-primary/90 text-white font-bold text-[17px] shadow-[0_8px_25px_rgba(63,109,78,0.3)] active:scale-95 transition-all gap-3"
              disabled={supplementSummaryItems.length === 0}
            >
              <Sparkles className="size-5" /> Analyser avec NutriFYS
            </Button>
          </div>
        </div>
      )}

      {/* ── Mobile save Sheet ─────────────────────────────────────────────────── */}
      {/* <Sheet open={showMobileSave} onOpenChange={setShowMobileSave}>
        <SheetContent side="bottom" className="rounded-t-3xl pb-safe px-0 pt-0">
          <MobileSaveSheet
            cocktailName={cocktailName}
            onNameChange={setCocktailName}
            canSave={canSave}
            saving={saving}
            onSave={() => handleSave()}
          />
        </SheetContent>
      </Sheet> */}

      {/* ── Order Sheet ────────────────────────────────────────────────────────── */}
      {draftCocktail && user && (
        <OrderSheet
          cocktail={draftCocktail}
          open={showOrderSheet}
          onOpenChange={setShowOrderSheet}
          user={{ uid: user.uid, name: (user as any).displayName || (user as any).name || '', email: user.email || '' }}
          onOrderSuccess={() => handleSave(true)}
        />
      )}
    </div>
  );
};

FysLab.metadata = {
  title: 'FYS Lab — Créateur de Cocktail',
  description: 'Créez et validez votre cocktail santé avec NutriFYS',
};

export default FysLab;
