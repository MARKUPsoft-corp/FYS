import { PageComponent, useNavigate } from 'rasengan';
import { Save, Loader2 } from 'lucide-react';
import { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { LabHeader, type LabTab } from '@/components/features/lab/LabHeader';
import { ComposeTab } from '@/components/features/lab/ComposeTab';
import { OrderSheet } from '@/components/features/cocktail/OrderSheet';
import { NutrifysComposeTab } from '@/components/features/lab/NutrifysComposeTab';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import type { CocktailProposal } from '@/data/nutrifys-chat';
import type { CocktailIngredient, AIAnalysis, Cocktail } from '@/entities';
import { CocktailType, BASE_COCKTAIL_PRICE } from '@/entities';
import { getFruits } from '@/services/fruit';
import { createCocktail } from '@/services/cocktail';
import { analyzeCocktail } from '@/services/ai';
import { useAuthStore } from '@/stores/auth';
import { useProfileStore } from '@/stores/profile';


const FysLab: PageComponent = () => {
  const { user } = useAuthStore();
  const { profile } = useProfileStore();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<LabTab>('compose');

  // ── Compose tab state ──────────────────────────────────────────────────────
  const [selectedIngredients, setSelectedIngredients] = useState<Map<string, number>>(new Map());
  const [showRenameSheet, setShowRenameSheet] = useState(false);
  const [cocktailName, setCocktailName] = useState('');
  const [saving, setSaving] = useState(false);
  const [analysis, setAnalysis] = useState<AIAnalysis | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [showOrderSheet, setShowOrderSheet] = useState(false);

  // ── Load real fruits from Firestore ───────────────────────────────────────
  const { data: fruits = [], isLoading: fruitsLoading } = useQuery({
    queryKey: ['fruits'],
    queryFn: getFruits,
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
        navigate(`/board/cocktails?cocktail=${cocktailId}`);
      }
    } finally {
      setSaving(false);
    }
  }


  function handleAnalyzeFromProposal(proposal: CocktailProposal) {
    const next = new Map<string, number>();
    proposal.fruitIds.forEach((id) => next.set(id, 100));
    setSelectedIngredients(next);
    setActiveTab('compose');
    // Using setTimeout to guarantee React batched state update allows it to seamlessly render Assemble panel
    setTimeout(() => handleAnalyze(next), 50);
  }

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
              onClick={analysis ? () => setShowRenameSheet(true) : () => handleAnalyze()}
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

      {/* ── Mobile Rename Sheet ──────────────────────────────────────────────── */}
      <Sheet open={showRenameSheet} onOpenChange={setShowRenameSheet}>
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
              onChange={(e) => setCocktailName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && cocktailName.trim() && !saving) {
                  setShowRenameSheet(false);
                  handleSave();
                }
              }}
              placeholder="Ex: Boost Matinal..."
              className="h-12 rounded-xl text-base px-4 bg-muted/30 focus-visible:ring-primary/40"
              autoFocus
            />
            <Button
              size="lg"
              className="w-full h-12 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold gap-2 text-base shadow-[0_8px_25px_rgba(63,109,78,0.3)] active:scale-95"
              disabled={!cocktailName.trim() || saving}
              onClick={() => {
                setShowRenameSheet(false);
                handleSave();
              }}
            >
              {saving ? <><Loader2 className="size-4 animate-spin" /> Enregistrement…</> : <><Save className="size-4" /> Enregistrer le cocktail</>}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

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
