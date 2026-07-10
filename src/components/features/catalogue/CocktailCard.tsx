import { Flame, ImageOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Cocktail } from '@/entities';

type Props = {
  cocktail: Cocktail;
  onView: (cocktail: Cocktail) => void;
};

export function ingredientSummary(cocktail: Cocktail): string {
  return cocktail.ingredients.map((i) => i.fruitName).join(', ');
}

export function CocktailCard({ cocktail, onView }: Props) {
  const summary = ingredientSummary(cocktail);

  return (
    <div
      className="rounded-[2.5rem] bg-card p-4 flex flex-col justify-end relative shadow-md group cursor-pointer transition-transform hover:-translate-y-3 border border-border/50"
      style={{ minHeight: '260px' }}
      onClick={() => onView(cocktail)}
    >
      {/* Floating image */}
      <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-36 h-44 rounded-2xl shadow-xl overflow-hidden transition-transform duration-500 group-hover:scale-110 bg-muted flex items-center justify-center shrink-0">
        {cocktail.imageUrl ? (
          <img
            src={cocktail.imageUrl}
            alt={cocktail.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <ImageOff className="size-8 text-muted-foreground/30" />
        )}
      </div>

      {/* Tag badge */}
      {cocktail.tag && (
        <div className="absolute top-4 left-4 bg-secondary text-secondary-foreground text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full shadow-md z-10">
          {cocktail.tag}
        </div>
      )}

      {/* Card body */}
      <div className="relative z-10 text-center">
        <h4 className="font-display font-bold text-lg text-foreground leading-tight">
          {cocktail.name}
        </h4>
        <p className="text-xs text-muted-foreground mt-1 mb-1 font-medium flex items-center justify-center gap-1.5 line-clamp-1">
          <Flame className="size-3.5 text-secondary shrink-0" />
          {summary || cocktail.description || '—'}
        </p>
        <p className="text-xs font-semibold text-primary mb-3">
          {cocktail.totalPrice > 0 ? `${cocktail.totalPrice.toLocaleString()} XAF` : '—'}
        </p>
        <Button
          className="w-full h-10 rounded-full font-bold bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground transition-colors text-sm"
          onClick={(e) => { e.stopPropagation(); onView(cocktail); }}
        >
          View recipe
        </Button>
      </div>
    </div>
  );
}
