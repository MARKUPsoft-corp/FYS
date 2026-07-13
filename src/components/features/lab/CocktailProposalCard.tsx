import { Check, FlaskConical, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { HighlightedText, buildProposalSelection, type HighlightTerm } from '@/components/features/lab/HighlightedText';

import { cn } from '@/lib/utils';
import {
  getVerdictColor,
  getVerdictLabel,
  resolveProposalItems,
  type CocktailProposal,
} from '@/data/nutrifys-chat';

type Props = {
  proposal: CocktailProposal;
  fruitIds: string[];
  supplementIds: string[];
  onToggleFruit: (id: string) => void;
  onToggleSupplement: (id: string) => void;
  onApply: (proposal: CocktailProposal) => void;
  onAnalyze: (proposal: CocktailProposal) => void;
  applied?: boolean;
  pulseId?: string | null;
  onTermClick?: (term: HighlightTerm) => void;
};

function CompatibilityRing({ score, verdict }: { score: number; verdict: CocktailProposal['verdict'] }) {
  const color = getVerdictColor(verdict);
  const degrees = (score / 100) * 360;

  return (
    <div className="relative size-16 shrink-0">
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background: `conic-gradient(${color} ${degrees}deg, rgba(42,36,29,0.08) ${degrees}deg)`,
        }}
      />
      <div className="absolute inset-[5px] rounded-full bg-card flex flex-col items-center justify-center">
        <span className="font-mono text-sm font-bold text-foreground leading-none">{score}</span>
        <span className="text-[8px] text-muted-foreground font-bold uppercase tracking-wider mt-0.5">/ 100</span>
      </div>
    </div>
  );
}

function IngredientTile({
  item,
  variant,
  selected,
  onClick,
}: {
  item: { id: string; emoji: string; name: string };
  variant: 'fruit' | 'supplement';
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        'flex flex-col items-center justify-center gap-1 aspect-square rounded-[0.875rem] border-2 p-1.5 min-w-[72px] transition-all duration-200',
        selected
          ? variant === 'fruit'
            ? 'bg-primary/10 border-primary shadow-[0_3px_10px_rgba(63,109,78,0.12)] scale-[0.98]'
            : 'bg-secondary/10 border-secondary shadow-[0_3px_10px_rgba(242,105,74,0.12)] scale-[0.98]'
          : 'bg-muted/30 border-border/50 opacity-45 hover:opacity-70',
      )}
    >
      <span className="text-xl leading-none">{item.emoji}</span>
      <span
        className={cn(
          'text-[9px] font-bold text-center leading-tight',
          selected
            ? variant === 'fruit'
              ? 'text-primary'
              : 'text-secondary'
            : 'text-muted-foreground',
        )}
      >
        {item.name}
      </span>
    </button>
  );
}

export function CocktailProposalCard({
  proposal,
  fruitIds,
  supplementIds,
  onToggleFruit,
  onToggleSupplement,
  onApply,
  onAnalyze,
  applied,
  pulseId,
  onTermClick,
}: Props) {
  const { fruits, supplements } = resolveProposalItems(proposal);
  const verdictColor = getVerdictColor(proposal.verdict);
  const activeProposal = buildProposalSelection(proposal, fruitIds, supplementIds);
  const hasSelection = fruitIds.length > 0;

  return (
    <div className="mt-3 rounded-2xl border border-border/60 bg-background/80 overflow-hidden shadow-sm">
      <div className="px-4 py-3 bg-primary/5 border-b border-border/40 flex items-center gap-3">
        <CompatibilityRing score={proposal.score} verdict={proposal.verdict} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-0.5">
            <FlaskConical className="size-3.5 text-primary shrink-0" />
            <span className="font-display font-bold text-sm text-foreground">{proposal.name}</span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#E0982E]">
              {proposal.profileLabel}
            </span>
            <span
              className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white"
              style={{ backgroundColor: verdictColor }}
            >
              {getVerdictLabel(proposal.verdict)}
            </span>
          </div>
        </div>
      </div>

      <p className="px-4 pt-3 text-[11px] text-muted-foreground font-medium">
        Touchez un fruit ou un supplément pour l&apos;ajouter ou le retirer de la recette.
      </p>

      <div className="px-4 pt-3 pb-2">
        <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mb-2">
          Fruits proposés
        </p>
        <div className="flex flex-wrap gap-2">
          {fruits.map((fruit) => (
            <div
              key={fruit.id}
              className={cn(pulseId === fruit.id && 'animate-pulse')}
            >
              <IngredientTile
                item={fruit}
                variant="fruit"
                selected={fruitIds.includes(fruit.id)}
                onClick={() => onToggleFruit(fruit.id)}
              />
            </div>
          ))}
        </div>
      </div>

      {supplements.length > 0 && (
        <div className="px-4 pb-2">
          <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mb-2">
            Suppléments
          </p>
          <div className="flex flex-wrap gap-2">
            {supplements.map((sup) => (
              <div key={sup.id} className={cn(pulseId === sup.id && 'animate-pulse')}>
                <IngredientTile
                  item={sup}
                  variant="supplement"
                  selected={supplementIds.includes(sup.id)}
                  onClick={() => onToggleSupplement(sup.id)}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="px-4 py-2 flex flex-wrap gap-1.5">
        {proposal.benefits.map((b) => (
          <span
            key={b}
            className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-accent/30 text-accent-foreground border border-accent/40"
          >
            {b}
          </span>
        ))}
      </div>

      <div className="mx-4 mb-4 p-3 rounded-xl bg-muted/40 border border-border/30">
        <p className="text-[14px] lg:text-[15px] text-muted-foreground font-medium leading-relaxed">
          <HighlightedText text={proposal.explanation} proposal={proposal} onTermClick={onTermClick} />
        </p>
      </div>

      <div className="px-4 pb-4 flex flex-col sm:flex-row gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={applied || !hasSelection}
          onClick={() => onApply(activeProposal)}
          className={cn(
            'flex-1 rounded-xl h-11 font-bold text-sm gap-2 border-primary/30',
            applied && 'bg-primary/5 text-primary border-primary/40',
          )}
        >
          {applied ? (
            <>
              <Check className="size-4" /> Recette appliquée
            </>
          ) : (
            <>
              <FlaskConical className="size-4" /> Utiliser cette recette
            </>
          )}
        </Button>
        <Button
          type="button"
          size="sm"
          disabled={!hasSelection}
          onClick={() => onAnalyze(activeProposal)}
          className="flex-1 rounded-xl h-11 font-bold text-sm gap-2 bg-primary hover:bg-primary/90 text-white shadow-[0_4px_14px_rgba(63,109,78,0.25)] disabled:opacity-40"
        >
          <Sparkles className="size-4" /> Analyser
        </Button>
      </div>
    </div>
  );
}
