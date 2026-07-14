import { Lightbulb, Sparkles, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  LAB_SUPPLEMENTS,
  type LabItem,
} from '@/data/lab-items';
import type { AIRecommendation } from '@/services/ai.shared';
import { cn } from '@/lib/utils';

type Props = {
  selectedFruits: LabItem[];
  selectedSupplements: string[];
  onToggleSupplement: (id: string) => void;
  onAnalyze: () => void;
  aiRecommendation?: AIRecommendation;
  loadingAI?: boolean;
};

export function SupplementsTab({
  selectedFruits,
  selectedSupplements,
  onToggleSupplement,
  onAnalyze,
  aiRecommendation,
  loadingAI,
}: Props) {
  const recommendedSupplements = LAB_SUPPLEMENTS.filter(
    (s) => aiRecommendation?.recommendedIds.includes(s.id),
  );
  const highlighted = LAB_SUPPLEMENTS.find(
    (s) => s.id === aiRecommendation?.highlightedSupplementId,
  );
  const totalCount = selectedFruits.length + selectedSupplements.length;

  if (selectedFruits.length === 0) {
    return (
      <div className="relative z-20 -mt-5 lg:mt-8 bg-card rounded-2xl p-8 border border-border/60 shadow-lg text-center max-w-lg mx-auto">
        <Sparkles className="size-8 text-[#E0982E] mx-auto mb-4" />
        <h2 className="font-display font-bold text-xl text-foreground mb-2">Composez d&apos;abord votre base</h2>
        <p className="text-sm text-muted-foreground font-medium">
          Sélectionnez au moins un fruit dans l&apos;onglet « Je compose » pour recevoir des recommandations NutriFYS.
        </p>
      </div>
    );
  }

  const fruitNames = selectedFruits.map((f) => f.name).join(' + ');

  return (
    <div className="space-y-6">
      {/* Recommendation card — overlaps header */}
      <div className="relative z-20 -mt-5 lg:mt-8 bg-[#28422F] rounded-2xl p-4 border border-primary/20 shadow-lg flex items-start gap-4 min-h-[100px]">
        <div className="size-10 rounded-full bg-primary/30 flex items-center justify-center shrink-0 border border-accent/30">
          <Sparkles className="size-4 text-[#E0982E]" />
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-[#E0982E] text-[10px] font-bold uppercase tracking-widest block mb-1">
            NutriFYS
          </span>
          {loadingAI ? (
            <div className="animate-pulse flex flex-col gap-2 mt-2 w-full">
              <div className="h-3 bg-white/20 rounded w-full"></div>
              <div className="h-3 bg-white/20 rounded w-4/5"></div>
            </div>
          ) : (
            <p className="text-white/90 text-[12px] md:text-[13px] font-medium leading-relaxed">
              Basé sur votre sélection{' '}
              <span className="text-white font-semibold">{fruitNames}</span>{' '}
              <span className="text-[#E0982E] font-bold">(cocktail {aiRecommendation?.profileLabel})</span>
              , voici les suppléments que je vous recommande :
            </p>
          )}
        </div>
      </div>

      {/* Base cocktail */}
      <section>
        <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3">
          Votre cocktail de base
        </h3>
        <div className="flex flex-wrap gap-3">
          {selectedFruits.map((fruit) => (
            <div
              key={fruit.id}
              className="flex flex-col items-center justify-center gap-1.5 w-[calc(33.333%-0.5rem)] min-w-[96px] max-w-[120px] aspect-square rounded-[1rem] bg-primary/10 border-2 border-primary shadow-[0_4px_12px_rgba(63,109,78,0.12)]"
            >
              <span className="text-2xl">{fruit.emoji}</span>
              <span className="text-[10px] font-semibold text-primary">{fruit.name}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Recommended supplements */}
      <section>
        <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3 flex items-center gap-1.5">
          <Sparkles className="size-3 text-[#E0982E]" />
          Suppléments recommandés par NutriFYS
          <Sparkles className="size-3 text-[#E0982E]" />
        </h3>
        
        {loadingAI ? (
          <div className="flex flex-wrap gap-3">
             <div className="w-[calc(33.333%-0.5rem)] min-w-[96px] max-w-[120px] aspect-square rounded-[1rem] bg-muted/60 animate-pulse" />
             <div className="w-[calc(33.333%-0.5rem)] min-w-[96px] max-w-[120px] aspect-square rounded-[1rem] bg-muted/60 animate-pulse [animation-delay:150px]" />
          </div>
        ) : (
          <div className="flex flex-wrap gap-3">
            {recommendedSupplements.map((supplement) => {
              const isSelected = selectedSupplements.includes(supplement.id);
              return (
                <button
                  key={supplement.id}
                  type="button"
                  onClick={() => onToggleSupplement(supplement.id)}
                  className={cn(
                    'flex flex-col items-center justify-center gap-1.5 w-[calc(33.333%-0.5rem)] min-w-[96px] max-w-[120px] aspect-square rounded-[1rem] transition-all duration-200',
                    isSelected
                      ? 'bg-secondary/10 border-2 border-secondary shadow-[0_4px_12px_rgba(242,105,74,0.15)] scale-[0.97]'
                      : 'bg-card border-2 border-border/60 hover:border-secondary/40 shadow-sm',
                  )}
                >
                  <span className="text-2xl">{supplement.emoji}</span>
                  <span
                    className={cn(
                      'text-[10px] font-semibold',
                      isSelected ? 'text-secondary' : 'text-muted-foreground',
                    )}
                  >
                    {supplement.name}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* Why card — ambre réservé signalétique NutriFYS */}
      {loadingAI ? (
        <div className="bg-[#E0982E]/10 border border-[#E0982E]/30 rounded-2xl p-4 flex gap-3 h-20 animate-pulse" />
      ) : highlighted && selectedSupplements.includes(highlighted.id) ? (
        <div className="bg-[#E0982E]/10 border border-[#E0982E]/30 rounded-2xl p-4 flex gap-3">
          <div className="size-9 rounded-xl bg-[#E0982E]/15 flex items-center justify-center shrink-0">
            <Lightbulb className="size-4 text-[#E0982E]" />
          </div>
          <div>
            <p className="text-sm font-bold text-foreground mb-1">
              Pourquoi le {highlighted.name.toLowerCase()} ?
            </p>
            <p className="text-[12px] text-muted-foreground font-medium leading-relaxed">
              {aiRecommendation?.why}
            </p>
          </div>
        </div>
      ) : null}

      {/* Desktop analyze CTA */}
      <div className="hidden lg:block pt-2">
        <Button
          size="lg"
          className="w-full h-14 rounded-2xl bg-primary hover:bg-primary/90 text-white font-bold text-[17px] shadow-[0_8px_25px_rgba(63,109,78,0.3)] active:scale-95 transition-all gap-3"
          disabled={totalCount === 0}
          onClick={onAnalyze}
        >
          <Sparkles className="size-5" /> Analyser avec NutriFYS
        </Button>
      </div>

      {/* Mobile sticky summary rendered by parent — expose count via nothing, parent handles it */}
    </div>
  );
}

export function getSupplementsSummaryItems(
  fruits: LabItem[],
  supplementIds: string[],
): LabItem[] {
  const supplements = LAB_SUPPLEMENTS.filter((s) => supplementIds.includes(s.id));
  return [...fruits, ...supplements];
}
