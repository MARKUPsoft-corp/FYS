import { Minus, Plus, FlaskConical, Sparkles, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { Fruit } from '@/entities';
import { BASE_COCKTAIL_PRICE } from '@/entities';

// ── Quantity stepper ──────────────────────────────────────────────────────────

function QuantityStepper({ grams, onChange }: { grams: number; onChange: (g: number) => void }) {
  return (
    <div className="flex items-center gap-1 mt-1.5" onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        onClick={() => onChange(Math.max(50, grams - 50))}
        className="size-6 rounded-full bg-primary/15 text-primary flex items-center justify-center hover:bg-primary/25 active:scale-90 transition-all"
      >
        <Minus className="size-3" />
      </button>
      <span className="text-[11px] font-bold text-primary min-w-[38px] text-center">{grams}g</span>
      <button
        type="button"
        onClick={() => onChange(grams + 50)}
        className="size-6 rounded-full bg-primary/15 text-primary flex items-center justify-center hover:bg-primary/25 active:scale-90 transition-all"
      >
        <Plus className="size-3" />
      </button>
    </div>
  );
}

// ── ComposeTab ────────────────────────────────────────────────────────────────

type Props = {
  fruits: Fruit[];
  loading: boolean;
  selectedIngredients: Map<string, number>;
  onToggleFruit: (id: string) => void;
  onChangeQuantity: (fruitId: string, grams: number) => void;
  cocktailName: string;
  onNameChange: (name: string) => void;
  totalPrice: number;
  onSave: () => Promise<void>;
  saving: boolean;
};

export function ComposeTab({
  fruits,
  loading,
  selectedIngredients,
  onToggleFruit,
  onChangeQuantity,
  cocktailName,
  onNameChange,
  totalPrice,
  onSave,
  saving,
}: Props) {
  const selectedFruits = fruits.filter((f) => selectedIngredients.has(f.id));
  const canSave = selectedIngredients.size > 0 && cocktailName.trim().length > 0;

  return (
    <div className="flex flex-col lg:flex-row gap-6 lg:gap-12 items-start">

      {/* ── Fruit grid ── */}
      <div className="flex-1 min-w-0 w-full">
        <div className="relative z-20 -mt-5 lg:mt-8 bg-card rounded-2xl p-4 mb-6 border border-border/60 shadow-lg flex items-center lg:items-start gap-4 mx-auto lg:mx-0 max-w-lg lg:max-w-none text-left">
          <div className="size-10 rounded-full bg-[#E0982E]/10 flex items-center justify-center shrink-0 border border-[#E0982E]/20">
            <Sparkles className="size-4 text-[#E0982E]" />
          </div>
          <div>
            <span className="text-[#E0982E] text-[10px] font-bold uppercase tracking-widest block mb-0.5">
              NutriFYS
            </span>
            <p className="text-foreground text-[12px] md:text-[13px] font-medium leading-relaxed">
              Choisissez vos fruits 🍹, ajustez les quantités et sauvegardez votre création.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 mb-3">
          <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
            Fruits disponibles · Pleine saison
          </h3>
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-secondary opacity-50" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-secondary" />
          </span>
        </div>

        {loading ? (
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-3">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="aspect-square rounded-[1.25rem] bg-card border-2 border-border/40 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-3">
            {fruits.map((fruit) => {
              const isSelected = selectedIngredients.has(fruit.id);
              const grams = selectedIngredients.get(fruit.id) ?? 100;
              return (
                <button
                  key={fruit.id}
                  type="button"
                  onClick={() => onToggleFruit(fruit.id)}
                  className={`flex flex-col items-center justify-start gap-1.5 p-2.5 rounded-[1.25rem] transition-all duration-200 ${
                    isSelected
                      ? 'bg-primary/10 border-2 border-primary shadow-[0_4px_12px_rgba(63,109,78,0.15)] scale-[0.97]'
                      : 'bg-card border-2 border-border/60 hover:border-primary/40 shadow-sm hover:-translate-y-0.5'
                  }`}
                >
                  {fruit.imageUrl ? (
                    <div
                      className="w-full aspect-square rounded-xl bg-cover bg-center"
                      style={{ backgroundImage: `url('${fruit.imageUrl}')` }}
                    />
                  ) : (
                    <div className="w-full aspect-square rounded-xl bg-primary/10 flex items-center justify-center text-2xl">
                      🍓
                    </div>
                  )}
                  <span className={`text-[10px] font-semibold text-center line-clamp-1 w-full ${isSelected ? 'text-primary' : 'text-muted-foreground'}`}>
                    {fruit.name}
                  </span>
                  {fruit.price != null && (
                    <span className="text-[9px] font-bold text-muted-foreground/70">
                      {fruit.price.toLocaleString()} XAF
                    </span>
                  )}
                  {isSelected && (
                    <QuantityStepper
                      grams={grams}
                      onChange={(g) => onChangeQuantity(fruit.id, g)}
                    />
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Desktop save panel ── */}
      <div className="hidden lg:block w-[360px] shrink-0">
        <SavePanel
          selectedFruits={selectedFruits}
          selectedIngredients={selectedIngredients}
          cocktailName={cocktailName}
          onNameChange={onNameChange}
          totalPrice={totalPrice}
          onSave={onSave}
          saving={saving}
          canSave={canSave}
        />
      </div>
    </div>
  );
}

// ── SavePanel (desktop sidebar + re-exported for mobile Sheet) ────────────────

type SavePanelProps = {
  selectedFruits: Fruit[];
  selectedIngredients: Map<string, number>;
  cocktailName: string;
  onNameChange: (name: string) => void;
  totalPrice: number;
  onSave: () => Promise<void>;
  saving: boolean;
  canSave: boolean;
};

export function SavePanel({
  selectedFruits,
  selectedIngredients,
  cocktailName,
  onNameChange,
  totalPrice,
  onSave,
  saving,
  canSave,
}: SavePanelProps) {
  return (
    <div className="bg-card rounded-3xl border border-border/60 shadow-sm overflow-hidden sticky top-24 mt-8">
      {/* Header */}
      <div className="bg-primary/5 border-b border-border/40 px-6 py-5 flex items-center gap-3">
        <div className="size-9 bg-primary/10 rounded-xl flex items-center justify-center">
          <FlaskConical className="size-5 text-primary" />
        </div>
        <div>
          <h2 className="font-display font-bold text-base text-foreground">Ma recette</h2>
          <p className="text-xs text-muted-foreground">
            {selectedFruits.length === 0
              ? 'Aucun fruit sélectionné'
              : `${selectedFruits.length} fruit${selectedFruits.length > 1 ? 's' : ''} sélectionné${selectedFruits.length > 1 ? 's' : ''}`}
          </p>
        </div>
      </div>

      {/* Ingredient list */}
      <div className="px-6 py-5 min-h-[120px]">
        {selectedFruits.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-4 text-center gap-2">
            <Plus className="size-6 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground font-medium">
              Sélectionnez des fruits dans la grille
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {selectedFruits.map((f) => (
              <div key={f.id} className="flex items-center justify-between text-sm">
                <span className="font-medium text-foreground">{f.name}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground bg-muted rounded-full px-2 py-0.5">
                    {selectedIngredients.get(f.id)}g
                  </span>
                  {f.price != null && (
                    <span className="text-xs font-bold text-primary">
                      +{f.price.toLocaleString()} XAF
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Price breakdown */}
      {selectedFruits.length > 0 && (
        <>
          <div className="border-t border-border/40 mx-6" />
          <div className="px-6 py-4 space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Base 50cl</span>
              <span>{BASE_COCKTAIL_PRICE.toLocaleString()} XAF</span>
            </div>
            {selectedFruits.map((f) =>
              f.price != null ? (
                <div key={f.id} className="flex justify-between text-xs text-muted-foreground">
                  <span>{f.name}</span>
                  <span>+{f.price.toLocaleString()} XAF</span>
                </div>
              ) : null,
            )}
            <div className="flex justify-between text-sm font-bold text-foreground pt-1.5 border-t border-border/40 mt-1">
              <span>Total cocktail</span>
              <span className="text-primary">{totalPrice.toLocaleString()} XAF</span>
            </div>
            <p className="text-[10px] text-muted-foreground">+ 500 XAF livraison à la commande</p>
          </div>
        </>
      )}

      <div className="border-t border-border/40 mx-6" />

      {/* Name + save */}
      <div className="px-6 py-5 space-y-3">
        <Input
          value={cocktailName}
          onChange={(e) => onNameChange(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && canSave && !saving && onSave()}
          placeholder="Nom de mon cocktail…"
          className="h-10 rounded-xl text-sm"
        />
        <Button
          size="lg"
          className="w-full h-12 rounded-2xl bg-primary hover:bg-primary/90 text-white font-bold shadow-[0_8px_25px_rgba(63,109,78,0.3)] active:scale-95 transition-all gap-2"
          disabled={!canSave || saving}
          onClick={onSave}
        >
          {saving ? (
            'Sauvegarde…'
          ) : (
            <>
              <Save className="size-4" /> Sauvegarder la recette
            </>
          )}
        </Button>
        <p className="text-center text-[11px] text-muted-foreground font-medium">
          Privé par défaut · vous pourrez publier ensuite
        </p>
      </div>
    </div>
  );
}
