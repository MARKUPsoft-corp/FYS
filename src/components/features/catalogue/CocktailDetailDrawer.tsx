import { ImageOff, ShoppingCart, Sparkles } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { AIVerdict, type Cocktail } from '@/entities';

type Props = {
  cocktail: Cocktail | null;
  open: boolean;
  onClose: () => void;
};

const VERDICT_CONFIG: Record<AIVerdict, { label: string; variant: 'success' | 'warning' | 'destructive' | 'outline' }> = {
  [AIVerdict.BENEFICIAL]:       { label: 'Beneficial',        variant: 'success' },
  [AIVerdict.NEUTRAL]:          { label: 'Neutral',           variant: 'outline' },
  [AIVerdict.CAUTION]:          { label: 'Caution',           variant: 'warning' },
  [AIVerdict.NOT_RECOMMENDED]:  { label: 'Not recommended',   variant: 'destructive' },
};

export function CocktailDetailDrawer({ cocktail, open, onClose }: Props) {
  if (!cocktail) return null;

  const verdict = cocktail.aiAnalysis
    ? VERDICT_CONFIG[cocktail.aiAnalysis.verdict]
    : null;

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-lg flex flex-col p-0 gap-0">

        {/* Image header */}
        <div className="relative w-full h-52 bg-muted shrink-0">
          {cocktail.imageUrl ? (
            <img
              src={cocktail.imageUrl}
              alt={cocktail.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <ImageOff className="size-10 text-muted-foreground/30" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />

          {cocktail.tag && (
            <div className="absolute top-4 left-4 bg-secondary text-secondary-foreground text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full shadow">
              {cocktail.tag}
            </div>
          )}

          <SheetHeader className="absolute bottom-0 left-0 right-0 px-6 pb-4">
            <SheetTitle className="font-display text-white text-2xl">
              {cocktail.name}
            </SheetTitle>
          </SheetHeader>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

          {/* Description */}
          {cocktail.description && (
            <p className="text-sm text-muted-foreground leading-relaxed">
              {cocktail.description}
            </p>
          )}

          {/* AI Analysis */}
          {cocktail.aiAnalysis && verdict && (
            <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-2">
              <div className="flex items-center gap-2">
                <Sparkles className="size-4 text-primary" />
                <span className="text-sm font-semibold text-foreground">AI Analysis</span>
                <Badge variant={verdict.variant} className="ml-auto">{verdict.label}</Badge>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1.5 rounded-full bg-border overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${cocktail.aiAnalysis.score}%` }}
                  />
                </div>
                <span className="text-xs font-semibold text-primary tabular-nums">
                  {cocktail.aiAnalysis.score}/100
                </span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {cocktail.aiAnalysis.notes}
              </p>
            </div>
          )}

          {/* Ingredients */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Ingredients</h3>
            <Separator />
            {cocktail.ingredients.length === 0 ? (
              <p className="text-sm text-muted-foreground">No ingredients listed.</p>
            ) : (
              <ul className="space-y-2">
                {cocktail.ingredients.map((ing, i) => (
                  <li key={i} className="flex items-center justify-between text-sm">
                    <span className="text-foreground font-medium">{ing.fruitName}</span>
                    <div className="flex items-center gap-3 text-muted-foreground">
                      <span>{ing.quantityGrams}g</span>
                      <span className="text-xs tabular-nums">
                        {ing.priceSnapshot.toLocaleString()} XAF
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Price breakdown */}
          <div className="space-y-1.5 pt-2">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>Base (50cl)</span>
              <span>{cocktail.basePrice.toLocaleString()} XAF</span>
            </div>
            {cocktail.ingredients.map((ing, i) => (
              <div key={i} className="flex items-center justify-between text-sm text-muted-foreground">
                <span>{ing.fruitName}</span>
                <span>+ {ing.priceSnapshot.toLocaleString()} XAF</span>
              </div>
            ))}
            <Separator />
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-foreground">Cocktail total</span>
              <span className="text-lg font-bold text-primary">
                {cocktail.totalPrice.toLocaleString()} XAF
              </span>
            </div>
            <p className="text-xs text-muted-foreground">+ 500 XAF delivery if applicable</p>
          </div>
        </div>

        {/* Footer */}
        <SheetFooter className="px-6 py-4 border-t border-border shrink-0">
          <Button className="w-full rounded-full font-bold h-12 text-base gap-2">
            <ShoppingCart className="size-4" />
            Order this cocktail
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
