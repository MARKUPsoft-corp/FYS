import { useTranslation } from 'react-i18next';
import { Pencil, Trash2, ImageOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { isUsableFruit, type Fruit, type Category } from '@/entities';

type Props = {
  fruits: Fruit[];
  categories: Category[];
  onEdit: (fruit: Fruit) => void;
  onDelete: (fruit: Fruit) => void;
  onToggleActive: (fruit: Fruit) => void;
};

const ROLE_LABELS: Record<string, string> = {
  acid: 'Acid', sweet: 'Sweet', antioxidant: 'Antioxidant',
  mineral: 'Mineral', base: 'Base',
};

const STATUS_VARIANT: Record<string, 'success' | 'warning'> = {
  complete: 'success',
  partial: 'warning',
};

export function FruitTable({ fruits, categories, onEdit, onDelete, onToggleActive }: Props) {
  const { t } = useTranslation();
  const categoryMap = Object.fromEntries(categories.map((c) => [c.id, c.name]));

  if (fruits.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-10">
        No fruits yet. Add your first fruit or run <code className="font-mono bg-muted px-1 rounded">pnpm seed</code>.
      </p>
    );
  }

  return (
    <div className="w-full">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-muted/50 border-b border-border">
            <th className="text-left font-medium text-muted-foreground px-4 py-3 w-12" />
            <th className="text-left font-medium text-muted-foreground px-4 py-3">Name</th>
            <th className="text-left font-medium text-muted-foreground px-4 py-3 hidden md:table-cell">Categories</th>
            <th className="text-left font-medium text-muted-foreground px-4 py-3 hidden lg:table-cell">Role</th>
            <th className="text-left font-medium text-muted-foreground px-4 py-3 hidden md:table-cell">Lab</th>
            <th className="text-left font-medium text-muted-foreground px-4 py-3 hidden lg:table-cell">Price</th>
            <th className="text-left font-medium text-muted-foreground px-4 py-3 hidden sm:table-cell">{t('fruits.availability')}</th>
            <th className="px-4 py-3 w-20" />
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {fruits.map((fruit) => (
            <tr key={fruit.id} className="hover:bg-muted/30 transition-colors">
              {/* Thumbnail */}
              <td className="px-4 py-3">
                <div className={cn(
                  'size-9 rounded-lg overflow-hidden flex items-center justify-center bg-muted shrink-0',
                )}>
                  {fruit.imageUrl ? (
                    <img
                      src={fruit.imageUrl}
                      alt={fruit.name}
                      className="size-full object-cover"
                    />
                  ) : (
                    <ImageOff className="size-4 text-muted-foreground/40" />
                  )}
                </div>
              </td>

              {/* Name */}
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-foreground">{fruit.name}</p>
                  <Badge variant={STATUS_VARIANT[fruit.dataStatus]} className="text-[10px] capitalize">
                    {fruit.dataStatus}
                  </Badge>
                </div>
                {fruit.scientificName && (
                  <p className="text-xs text-muted-foreground italic">{fruit.scientificName}</p>
                )}
              </td>

              {/* Categories */}
              <td className="px-4 py-3 hidden md:table-cell">
                <div className="flex flex-wrap gap-1">
                  {fruit.categoryIds.map((cid) => (
                    <Badge key={cid} variant="secondary" className="text-xs">
                      {categoryMap[cid] ?? cid}
                    </Badge>
                  ))}
                </div>
              </td>

              {/* Role */}
              <td className="px-4 py-3 hidden lg:table-cell">
                {fruit.cocktailRole ? (
                  <Badge variant="outline" className="text-xs capitalize">
                    {ROLE_LABELS[fruit.cocktailRole]}
                  </Badge>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </td>

              {/* Lab usage */}
              <td className="px-4 py-3 hidden md:table-cell">
                <div className="flex flex-wrap gap-1">
                  {fruit.isMainFruit !== false && (
                    <Badge variant="secondary" className="text-[10px]">{t('lab.fruits')}</Badge>
                  )}
                  {fruit.isSupplement && (
                    <Badge className="text-[10px] bg-secondary/15 text-secondary border-secondary/30" variant="outline">
                      {t('fruits.supplement')}
                    </Badge>
                  )}
                </div>
              </td>

              {/* Price */}
              <td className="px-4 py-3 hidden lg:table-cell text-foreground tabular-nums">
                {fruit.price != null
                  ? `${fruit.price.toLocaleString()} XAF`
                  : <span className="text-muted-foreground">—</span>}
              </td>

              {/* Availability */}
              <td className="px-4 py-3 hidden sm:table-cell">
                <button
                  type="button"
                  onClick={() => onToggleActive(fruit)}
                  title={isUsableFruit(fruit) ? t('fruits.availableHint') : t('fruits.unavailableHint')}
                  className={cn(
                    'inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full border transition-colors cursor-pointer',
                    isUsableFruit(fruit)
                      ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/50 hover:bg-emerald-500/20'
                      : 'bg-red-500/10 text-red-500 border-red-500/40 hover:bg-red-500/20',
                  )}
                >
                  <span className={cn('size-1.5 rounded-full', isUsableFruit(fruit) ? 'bg-emerald-500' : 'bg-red-500')} />
                  {isUsableFruit(fruit) ? t('fruits.available') : t('fruits.unavailable')}
                </button>
              </td>

              {/* Actions */}
              <td className="px-4 py-3">
                <div className="flex items-center gap-1 justify-end">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 text-muted-foreground hover:text-foreground"
                    onClick={() => onEdit(fruit)}
                  >
                    <Pencil className="size-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 text-muted-foreground hover:text-destructive"
                    onClick={() => onDelete(fruit)}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
