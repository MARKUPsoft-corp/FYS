import { FlaskConical, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { HighlightedText, buildProposalSelection, type HighlightTerm } from '@/components/features/lab/HighlightedText';
import { cn } from '@/lib/utils';
import {
  getVerdictColor,
  getVerdictLabel,
  resolveProposalItems,
  type CocktailProposal,
} from '@/data/nutrifys-chat';
import { getLabItemById } from '@/data/lab-items';
import type { Fruit } from '@/entities';
import { MAX_LAB_MAIN_FRUITS, MAX_LAB_SUPPLEMENTS } from '@/entities';

type Props = {
  proposal: CocktailProposal;
  fruitIds: string[];
  supplementIds: string[];
  onToggleFruit: (id: string) => void;
  onToggleSupplement: (id: string) => void;
  onAnalyze: (proposal: CocktailProposal) => void;
  pulseId?: string | null;
  onTermClick?: (term: HighlightTerm) => void;
  /** Catalogue Firestore — pour afficher les vraies images des fruits */
  fruitsCatalog?: Fruit[];
};

type DisplayItem = {
  id: string;
  name: string;
  imageUrl?: string;
  emoji: string;
};

function resolveFruitDisplays(
  ids: string[],
  catalog: Fruit[],
): DisplayItem[] {
  return ids.map((id) => {
    const fromCatalog =
      catalog.find((f) => f.id === id) ??
      catalog.find((f) => f.name.toLowerCase() === id.toLowerCase());

    if (fromCatalog) {
      const labFallback = getLabItemById(fromCatalog.id);
      return {
        id: fromCatalog.id,
        name: fromCatalog.name,
        imageUrl: fromCatalog.imageUrl,
        emoji: labFallback?.emoji ?? '🍓',
      };
    }

    const lab = getLabItemById(id);
    return {
      id,
      name: lab?.name ?? id,
      emoji: lab?.emoji ?? '🍓',
    };
  });
}

function IngredientTile({
  item,
  variant,
  selected,
  onClick,
  disabled = false,
}: {
  item: DisplayItem;
  variant: 'fruit' | 'supplement';
  selected: boolean;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        'flex flex-col items-center justify-start gap-1.5 p-2 rounded-[1.25rem] border-2 min-w-[80px] w-[88px] transition-all duration-200',
        selected
          ? variant === 'fruit'
            ? 'bg-primary/10 border-primary shadow-[0_3px_10px_rgba(63,109,78,0.12)] scale-[0.98]'
            : 'bg-secondary/10 border-secondary shadow-[0_3px_10px_rgba(242,105,74,0.12)] scale-[0.98]'
          : disabled
          ? 'bg-muted/40 border-border/30 opacity-45 cursor-not-allowed'
          : 'bg-card border-border/60 opacity-55 hover:opacity-85 hover:border-primary/40',
      )}
    >
      {item.imageUrl ? (
        <div
          className="w-full aspect-square rounded-xl bg-cover bg-center"
          style={{ backgroundImage: `url('${item.imageUrl}')` }}
        />
      ) : (
        <div
          className={cn(
            'w-full aspect-square rounded-xl flex items-center justify-center text-2xl',
            variant === 'fruit' ? 'bg-primary/10' : 'bg-secondary/10',
          )}
        >
          {item.emoji}
        </div>
      )}
      <span
        className={cn(
          'text-[10px] font-semibold text-center line-clamp-1 w-full',
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
  onAnalyze,
  pulseId,
  onTermClick,
  fruitsCatalog = [],
}: Props) {
  // Toujours afficher les fruits de la proposal ; la sélection se gère via selected=
  const fruits = resolveFruitDisplays(proposal.fruitIds, fruitsCatalog);
  // Suppléments : catalogue lab statique (pas d'images Cloudinary pour l'instant)
  const { supplements: labSupplements } = resolveProposalItems({
    ...proposal,
    fruitIds: [],
  });
  const supplements: DisplayItem[] = labSupplements.map((s) => ({
    id: s.id,
    name: s.name,
    emoji: s.emoji,
  }));

  const verdictColor = getVerdictColor(proposal.verdict);
  const activeProposal = buildProposalSelection(proposal, fruitIds, supplementIds);
  const hasSelection = fruitIds.length > 0;
  const atMaxFruits = fruitIds.length >= MAX_LAB_MAIN_FRUITS;
  const atMaxSupplements = supplementIds.length >= MAX_LAB_SUPPLEMENTS;

  return (
    <div className="mt-3 rounded-2xl border border-border/60 bg-background/80 overflow-hidden shadow-sm">
      <div className="px-4 py-3 bg-primary/5 border-b border-border/40 flex items-center gap-3">
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
        Touchez un fruit ou un supplément pour l&apos;ajouter ou le retirer (max. {MAX_LAB_MAIN_FRUITS} fruits · {MAX_LAB_SUPPLEMENTS} suppléments).
      </p>

      <div className="px-4 pt-3 pb-2">
        <div className="flex items-center justify-between gap-2 mb-2">
          <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">
            Fruits proposés
          </p>
          <span className={`text-[10px] font-bold tabular-nums ${atMaxFruits ? 'text-secondary' : 'text-muted-foreground'}`}>
            {fruitIds.length}/{MAX_LAB_MAIN_FRUITS}
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {fruits.map((fruit) => {
            const selected = fruitIds.includes(fruit.id);
            const disabled = !selected && atMaxFruits;
            return (
            <div
              key={fruit.id}
              className={cn(pulseId === fruit.id && 'animate-pulse')}
            >
              <IngredientTile
                item={fruit}
                variant="fruit"
                selected={selected}
                disabled={disabled}
                onClick={() => onToggleFruit(fruit.id)}
              />
            </div>
            );
          })}
        </div>
      </div>

      {supplements.length > 0 && (
        <div className="px-4 pb-2">
          <div className="flex items-center justify-between gap-2 mb-2">
            <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">
              Suppléments
            </p>
            <span className={`text-[10px] font-bold tabular-nums ${atMaxSupplements ? 'text-secondary' : 'text-muted-foreground'}`}>
              {supplementIds.length}/{MAX_LAB_SUPPLEMENTS}
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {supplements.map((sup) => {
              const selected = supplementIds.includes(sup.id);
              const disabled = !selected && atMaxSupplements;
              return (
              <div key={sup.id} className={cn(pulseId === sup.id && 'animate-pulse')}>
                <IngredientTile
                  item={sup}
                  variant="supplement"
                  selected={selected}
                  disabled={disabled}
                  onClick={() => onToggleSupplement(sup.id)}
                />
              </div>
              );
            })}
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
          <HighlightedText
            text={proposal.explanation}
            proposal={proposal}
            fruitsCatalog={fruitsCatalog}
            onTermClick={onTermClick}
          />
        </p>
      </div>

      <div className="px-4 pb-4 flex flex-col sm:flex-row gap-2">
        <Button
          type="button"
          size="sm"
          disabled={!hasSelection}
          onClick={() => onAnalyze(activeProposal)}
          className="flex-1 rounded-xl h-11 p-4 font-bold text-sm gap-2 bg-primary hover:bg-primary/90 text-white shadow-[0_4px_14px_rgba(63,109,78,0.25)] disabled:opacity-40"
        >
          <Sparkles className="size-4" /> Analyser ce mélange
        </Button>
      </div>
    </div>
  );
}
