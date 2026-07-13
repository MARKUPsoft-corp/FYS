import { Sparkles, FlaskConical, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { LabItem } from '@/data/lab-items';

type Props = {
  fruits: LabItem[];
  selectedFruits: string[];
  onToggleFruit: (id: string) => void;
  onAnalyze: () => void;
  showDesktopPanel?: boolean;
};

export function ComposeTab({
  fruits,
  selectedFruits,
  onToggleFruit,
  onAnalyze,
  showDesktopPanel = true,
}: Props) {
  const selected = fruits.filter((f) => selectedFruits.includes(f.id));

  return (
    <div className="flex flex-col lg:flex-row gap-6 lg:gap-12 items-start">
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
              Choisissez vos fruits 🍹. Je vérifierai que la composition correspond à votre profil de santé.
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

        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-3">
          {fruits.map((fruit) => {
            const isSelected = selectedFruits.includes(fruit.id);
            return (
              <button
                key={fruit.id}
                type="button"
                onClick={() => onToggleFruit(fruit.id)}
                className={`
                  aspect-square rounded-[1rem] flex flex-col items-center justify-center gap-1.5 transition-all duration-200
                  ${isSelected
                    ? 'bg-primary/10 border-2 border-primary shadow-[0_4px_12px_rgba(63,109,78,0.15)] scale-[0.97]'
                    : 'bg-card border-2 border-border/60 hover:border-primary/40 shadow-sm hover:-translate-y-0.5'
                  }
                `}
              >
                <span className="text-2xl lg:text-3xl filter drop-shadow-sm">{fruit.emoji}</span>
                <span className={`text-[10px] font-semibold ${isSelected ? 'text-primary' : 'text-muted-foreground'}`}>
                  {fruit.name}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {showDesktopPanel && (
        <div className="hidden lg:block w-[380px] shrink-0">
          <RecipePanel
            items={selected}
            countLabel={`${selectedFruits.length}/5 fruits sélectionnés`}
            emptyMessage="Sélectionnez des fruits dans la grille"
            onRemove={onToggleFruit}
            onAnalyze={onAnalyze}
            disabled={selectedFruits.length === 0}
          />
        </div>
      )}
    </div>
  );
}

type RecipePanelProps = {
  items: LabItem[];
  countLabel: string;
  emptyMessage: string;
  onRemove: (id: string) => void;
  onAnalyze: () => void;
  disabled: boolean;
};

export function RecipePanel({
  items,
  countLabel,
  emptyMessage,
  onRemove,
  onAnalyze,
  disabled,
}: RecipePanelProps) {
  return (
    <div className="bg-card rounded-3xl border border-border/60 shadow-sm overflow-hidden sticky top-24 mt-8">
      <div className="bg-primary/5 border-b border-border/40 px-6 py-5 flex items-center gap-3">
        <div className="size-9 bg-primary/10 rounded-xl flex items-center justify-center">
          <FlaskConical className="size-5 text-primary" />
        </div>
        <div>
          <h2 className="font-display font-bold text-base text-foreground">Ma recette</h2>
          <p className="text-xs text-muted-foreground">{countLabel}</p>
        </div>
      </div>

      <div className="px-6 py-5 min-h-[160px] flex flex-wrap gap-2 content-start">
        {items.length === 0 && (
          <div className="w-full flex flex-col items-center justify-center py-6 text-center gap-2">
            <Plus className="size-6 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground font-medium">{emptyMessage}</p>
          </div>
        )}
        {items.map((item) => (
          <button
            key={`chip-${item.id}`}
            type="button"
            onClick={() => onRemove(item.id)}
            className="flex items-center gap-2 px-3 py-2 bg-primary/10 rounded-full border border-primary/20 text-sm font-bold text-primary hover:bg-destructive/10 hover:border-destructive/30 hover:text-destructive transition-colors group"
          >
            <span>{item.emoji}</span> {item.name}
            <span className="text-[10px] opacity-0 group-hover:opacity-100 transition-opacity ml-0.5">✕</span>
          </button>
        ))}
      </div>

      <div className="border-t border-border/40 mx-6" />

      <div className="px-6 py-5">
        <Button
          size="lg"
          className="w-full h-14 rounded-2xl bg-primary hover:bg-primary/90 text-white font-bold text-[17px] shadow-[0_8px_25px_rgba(63,109,78,0.3)] active:scale-95 transition-all gap-3"
          disabled={disabled}
          onClick={onAnalyze}
        >
          <Sparkles className="size-5" /> Analyser avec NutriFYS
        </Button>
        <p className="text-center text-xs text-muted-foreground mt-3 font-medium">
          Compatible avec votre profil santé.
        </p>
      </div>
    </div>
  );
}
