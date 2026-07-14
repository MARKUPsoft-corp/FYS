import { PageComponent, useNavigate } from 'rasengan';
import { Sparkles, Save } from 'lucide-react';
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { LabHeader, type LabTab } from '@/components/features/lab/LabHeader';
import { ComposeTab, SavePanel } from '@/components/features/lab/ComposeTab';
import {
  SupplementsTab,
  getSupplementsSummaryItems,
} from '@/components/features/lab/SupplementsTab';
import { NutrifysComposeTab } from '@/components/features/lab/NutrifysComposeTab';
import { LAB_FRUITS } from '@/data/lab-items';
import type { CocktailProposal } from '@/data/nutrifys-chat';
import type { LabItem } from '@/data/lab-items';
import type { CocktailIngredient } from '@/entities';
import { CocktailType, BASE_COCKTAIL_PRICE } from '@/entities';
import { getFruits } from '@/services/fruit';
import { createCocktail } from '@/services/cocktail';
import { useAuthStore } from '@/stores/auth';

const FysLab: PageComponent = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<LabTab>('compose');

  // ── Compose tab state ──────────────────────────────────────────────────────
  const [selectedIngredients, setSelectedIngredients] = useState<Map<string, number>>(new Map());
  const [cocktailName, setCocktailName] = useState('');
  const [saving, setSaving] = useState(false);
  const [showMobileSave, setShowMobileSave] = useState(false);

  // ── Supplements tab state (still mock-based) ───────────────────────────────
  const [selectedSupplements, setSelectedSupplements] = useState<string[]>([]);

  // ── Load real fruits from Firestore ───────────────────────────────────────
  const { data: fruits = [], isLoading: fruitsLoading } = useQuery({
    queryKey: ['fruits'],
    queryFn: getFruits,
  });

  // ── Handlers ──────────────────────────────────────────────────────────────

  function toggleFruit(id: string) {
    setSelectedIngredients((prev) => {
      const next = new Map(prev);
      if (next.has(id)) next.delete(id);
      else next.set(id, 100);
      return next;
    });
  }

  function changeQuantity(fruitId: string, grams: number) {
    setSelectedIngredients((prev) => {
      const next = new Map(prev);
      next.set(fruitId, grams);
      return next;
    });
  }

  const totalPrice =
    BASE_COCKTAIL_PRICE +
    [...selectedIngredients.keys()].reduce((sum, fruitId) => {
      const fruit = fruits.find((f) => f.id === fruitId);
      return sum + (fruit?.price ?? 0);
    }, 0);

  async function handleSave() {
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
      await createCocktail({
        name: cocktailName.trim(),
        type: CocktailType.CUSTOM,
        createdBy: user.uid,
        isActive: true,
        isPublic: false,
        ingredients,
        basePrice: BASE_COCKTAIL_PRICE,
        totalPrice,
      });
      queryClient.invalidateQueries({ queryKey: ['user-cocktails'] });
      setSelectedIngredients(new Map());
      setCocktailName('');
      setShowMobileSave(false);
      navigate('/board/cocktails');
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

  function handleApplyProposal(proposal: CocktailProposal) {
    const ids = proposal.fruitIds;
    const next = new Map<string, number>();
    ids.forEach((id) => next.set(id, 100));
    setSelectedIngredients(next);
    setSelectedSupplements(proposal.supplementIds);
    setActiveTab('supplements');
  }

  function handleAnalyzeFromProposal(proposal: CocktailProposal) {
    const next = new Map<string, number>();
    proposal.fruitIds.forEach((id) => next.set(id, 100));
    setSelectedIngredients(next);
    setSelectedSupplements(proposal.supplementIds);
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
          'mx-auto',
          activeTab === 'nutrifys'
            ? 'max-w-[1480px] px-2 lg:px-5 pb-52 lg:pb-12'
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
            onSave={handleSave}
            saving={saving}
          />
        )}

        {activeTab === 'supplements' && (
          <SupplementsTab
            selectedFruits={selectedFruitLabItems}
            selectedSupplements={selectedSupplements}
            onToggleSupplement={toggleSupplement}
            onAnalyze={() => {}}
          />
        )}

        {activeTab === 'nutrifys' && (
          <NutrifysComposeTab
            onApplyProposal={handleApplyProposal}
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
              className="w-full h-14 rounded-full bg-primary hover:bg-primary/90 text-white font-bold text-[17px] shadow-[0_8px_25px_rgba(63,109,78,0.3)] active:scale-95 transition-all gap-3"
              disabled={selectedIngredients.size === 0}
              onClick={() => setShowMobileSave(true)}
            >
              <Save className="size-5" /> Sauvegarder la recette
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
      <Sheet open={showMobileSave} onOpenChange={setShowMobileSave}>
        <SheetContent side="bottom" className="rounded-t-3xl pb-safe">
          <SheetHeader className="mb-4">
            <SheetTitle className="font-display text-xl">Sauvegarder votre cocktail</SheetTitle>
          </SheetHeader>
          <SavePanel
            selectedFruits={fruits.filter((f) => selectedIngredients.has(f.id))}
            selectedIngredients={selectedIngredients}
            cocktailName={cocktailName}
            onNameChange={setCocktailName}
            totalPrice={totalPrice}
            onSave={handleSave}
            saving={saving}
            canSave={canSave}
          />
        </SheetContent>
      </Sheet>
    </div>
  );
};

FysLab.metadata = {
  title: 'FYS Lab — Créateur de Cocktail',
  description: 'Créez et validez votre cocktail santé avec NutriFYS',
};

export default FysLab;
