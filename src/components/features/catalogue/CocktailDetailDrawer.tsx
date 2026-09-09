import { useTranslation } from 'react-i18next';
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
import { AIVerdict, partitionCocktailIngredients, type Cocktail } from '@/entities';
import { useQuery } from '@tanstack/react-query';
import { getFruits } from '@/services/fruit';

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
  const { t } = useTranslation();
  const { data: fruits = [] } = useQuery({
    queryKey: ['fruits'],
    queryFn: getFruits,
    staleTime: 5 * 60_000,
  });

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

          {/* Ingredients — noms seulement, pas de prix */}
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-foreground">{t('catalogue.composition')}</h3>
              {cocktail.hasAddedSugar !== undefined && (
                cocktail.hasAddedSugar ? (
                  <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold border bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20">
                    🍯 {t('orders.sugarAddedBadge', 'Avec sucre')}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold border bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20">
                    🌿 {t('orders.sugarFreeBadge', '100% Naturel · Sans sucre')}
                  </span>
                )
              )}
            </div>
            <Separator />
            {cocktail.ingredients.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('cocktail.noIngredients')}</p>
            ) : (() => {
              const { mainFruits, supplements } = partitionCocktailIngredients(cocktail.ingredients, fruits);
              return (
                <div className="space-y-3 pt-1">
                  {mainFruits.length > 0 && (
                    <div>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1">
                        🍓 {t('orders.mainFruits', 'Fruits de base')} ({mainFruits.length})
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {mainFruits.map((ing) => (
                          <span
                            key={ing.fruitId}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-500/10 text-emerald-900 dark:text-emerald-300 border border-emerald-500/25 text-[12px] font-semibold"
                          >
                            <span className="size-1.5 rounded-full bg-emerald-500" />
                            {ing.fruitName}
                            {ing.quantityGrams ? (
                              <span className="text-[10px] opacity-75 font-normal">({ing.quantityGrams}g)</span>
                            ) : null}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {supplements.length > 0 && (
                    <div className="pt-2 border-t border-border/40">
                      <p className="text-[10px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                        🌿 {t('orders.supplements', 'Suppléments & Boosters')} ({supplements.length})
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {supplements.map((ing) => (
                          <span
                            key={ing.fruitId}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-500/15 text-amber-900 dark:text-amber-200 border border-amber-500/35 text-[12px] font-semibold"
                          >
                            <span className="size-1.5 rounded-full bg-amber-500 animate-pulse" />
                            {ing.fruitName}
                            {ing.quantityGrams ? (
                              <span className="text-[10px] opacity-80 font-bold">({ing.quantityGrams}g)</span>
                            ) : null}
                            <span className="text-[9px] uppercase tracking-wider font-extrabold bg-amber-500/20 px-1 py-0.2 rounded text-amber-800 dark:text-amber-300">
                              {t('orders.supplementBadge', 'Supplément')}
                            </span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>

          {/* Prix opaque — le détail est révélé à la commande via les contenants */}
          <div className="space-y-1.5 pt-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-foreground">{t('catalogue.from')}</span>
              <span className="text-lg font-bold text-primary">
                {cocktail.totalPrice.toLocaleString()} XAF
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              {t('cocktail.priceInfo')}
            </p>
          </div>
        </div>

        {/* Footer */}
        <SheetFooter className="px-6 py-4 border-t border-border shrink-0">
          <Button className="w-full rounded-full font-bold h-12 text-base gap-2">
            <ShoppingCart className="size-4" />
            {t('catalogue.order')}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
