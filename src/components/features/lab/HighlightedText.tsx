import { cn } from '@/lib/utils';
import { resolveProposalItems, type CocktailProposal } from '@/data/nutrifys-chat';
import { getLabItemById } from '@/data/lab-items';
import type { Fruit } from '@/entities';

export type HighlightTerm = {
  term: string;
  type: 'fruit' | 'supplement' | 'profile' | 'benefit' | 'keyword';
  id?: string;
};

const KEYWORD_TERMS: HighlightTerm[] = [
  { term: 'NutriFYS', type: 'keyword' },
  { term: 'profil de santé', type: 'keyword' },
  { term: 'profil santé', type: 'keyword' },
  { term: 'immunité', type: 'keyword' },
  { term: 'énergie', type: 'keyword' },
  { term: 'digestion', type: 'keyword' },
  { term: 'récupération', type: 'keyword' },
  { term: 'détente', type: 'keyword' },
  { term: 'vitamine C', type: 'benefit' },
  { term: 'antioxydants', type: 'benefit' },
  { term: 'anti-inflammatoire', type: 'benefit' },
];

export function getHighlightTerms(
  proposal?: CocktailProposal,
  fruitsCatalog: Fruit[] = [],
): HighlightTerm[] {
  const terms: HighlightTerm[] = [...KEYWORD_TERMS];

  if (proposal) {
    terms.push({ term: proposal.profileLabel, type: 'profile' });
    terms.push({ term: proposal.name, type: 'profile' });
    proposal.benefits.forEach((b) => terms.push({ term: b, type: 'benefit' }));

    proposal.fruitIds.forEach((id) => {
      const fromCatalog =
        fruitsCatalog.find((f) => f.id === id) ??
        fruitsCatalog.find((f) => f.name.toLowerCase() === id.toLowerCase());
      const lab = getLabItemById(id);
      const name = fromCatalog?.name ?? lab?.name;
      if (name) terms.push({ term: name, type: 'fruit', id: fromCatalog?.id ?? id });
    });

    const { supplements } = resolveProposalItems({ ...proposal, fruitIds: [] });
    supplements.forEach((s) => terms.push({ term: s.name, type: 'supplement', id: s.id }));
  }

  // Longest first to avoid partial matches
  return terms.sort((a, b) => b.term.length - a.term.length);
}

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

type Props = {
  text: string;
  proposal?: CocktailProposal;
  fruitsCatalog?: Fruit[];
  onTermClick?: (term: HighlightTerm) => void;
  className?: string;
};

const HIGHLIGHT_STYLES: Record<HighlightTerm['type'], string> = {
  fruit:
    'text-primary font-bold bg-primary/10 px-1.5 py-0.5 rounded-md cursor-pointer hover:bg-primary/20 transition-colors underline-offset-2 hover:underline',
  supplement:
    'text-secondary font-bold bg-secondary/10 px-1.5 py-0.5 rounded-md cursor-pointer hover:bg-secondary/20 transition-colors underline-offset-2 hover:underline',
  profile:
    'text-[#E0982E] font-bold bg-[#E0982E]/12 px-1.5 py-0.5 rounded-md cursor-pointer hover:bg-[#E0982E]/20 transition-colors',
  benefit:
    'text-accent-foreground font-bold bg-accent/25 px-1.5 py-0.5 rounded-md',
  keyword:
    'text-[#E0982E] font-semibold',
};

export function HighlightedText({ text, proposal, fruitsCatalog = [], onTermClick, className }: Props) {
  const terms = getHighlightTerms(proposal, fruitsCatalog);
  if (terms.length === 0) {
    return <span className={className}>{text}</span>;
  }

  const pattern = terms.map((t) => escapeRegex(t.term)).join('|');
  const regex = new RegExp(`(${pattern})`, 'gi');
  const parts = text.split(regex);

  return (
    <span className={className}>
      {parts.map((part, i) => {
        if (!part) return null;
        const match = terms.find((t) => t.term.toLowerCase() === part.toLowerCase());
        if (!match) return <span key={i}>{part}</span>;

        const isClickable =
          !!onTermClick && (match.type === 'fruit' || match.type === 'supplement' || match.type === 'profile');

        if (isClickable) {
          return (
            <button
              key={i}
              type="button"
              onClick={() => onTermClick(match)}
              className={cn('inline align-baseline', HIGHLIGHT_STYLES[match.type])}
            >
              {part}
            </button>
          );
        }

        return (
          <span key={i} className={HIGHLIGHT_STYLES[match.type]}>
            {part}
          </span>
        );
      })}
    </span>
  );
}

export function buildProposalSelection(
  base: CocktailProposal,
  fruitIds: string[],
  supplementIds: string[],
): CocktailProposal {
  return { ...base, fruitIds, supplementIds };
}
