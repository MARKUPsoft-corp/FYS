import { Eye, EyeOff, ImageOff, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CocktailType, type Cocktail } from '@/entities';

type Props = {
  cocktails: Cocktail[];
  onEdit: (cocktail: Cocktail) => void;
  onDelete: (cocktail: Cocktail) => void;
  onToggleActive: (cocktail: Cocktail) => void;
};

const TYPE_VARIANT: Record<CocktailType, 'default' | 'secondary'> = {
  [CocktailType.CATALOG]: 'default',
  [CocktailType.CUSTOM]:  'secondary',
};

export function CocktailTable({ cocktails, onEdit, onDelete, onToggleActive }: Props) {
  if (cocktails.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-10">
        No cocktails yet. Add your first catalog cocktail.
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
            <th className="text-left font-medium text-muted-foreground px-4 py-3 hidden md:table-cell">Type</th>
            <th className="text-left font-medium text-muted-foreground px-4 py-3 hidden lg:table-cell">Ingredients</th>
            <th className="text-left font-medium text-muted-foreground px-4 py-3 hidden sm:table-cell">Price</th>
            <th className="text-left font-medium text-muted-foreground px-4 py-3 hidden md:table-cell">Visibility</th>
            <th className="px-4 py-3 w-28" />
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {cocktails.map((cocktail) => (
            <tr
              key={cocktail.id}
              className={`hover:bg-muted/30 transition-colors ${!cocktail.isActive ? 'opacity-50' : ''}`}
            >
              {/* Thumbnail */}
              <td className="px-4 py-3">
                <div className="size-9 rounded-lg overflow-hidden flex items-center justify-center bg-muted shrink-0">
                  {cocktail.imageUrl ? (
                    <img src={cocktail.imageUrl} alt={cocktail.name} className="size-full object-cover" />
                  ) : (
                    <ImageOff className="size-4 text-muted-foreground/40" />
                  )}
                </div>
              </td>

              {/* Name */}
              <td className="px-4 py-3">
                <p className="font-medium text-foreground">{cocktail.name}</p>
                {cocktail.tag && (
                  <p className="text-xs text-muted-foreground">{cocktail.tag}</p>
                )}
              </td>

              {/* Type */}
              <td className="px-4 py-3 hidden md:table-cell">
                <Badge variant={TYPE_VARIANT[cocktail.type]} className="text-xs capitalize">
                  {cocktail.type}
                </Badge>
              </td>

              {/* Ingredients */}
              <td className="px-4 py-3 hidden lg:table-cell">
                <p className="text-muted-foreground line-clamp-1">
                  {cocktail.ingredients.map((i) => i.fruitName).join(', ') || '—'}
                </p>
              </td>

              {/* Price */}
              <td className="px-4 py-3 hidden sm:table-cell text-foreground font-medium tabular-nums">
                {cocktail.totalPrice > 0
                  ? `${cocktail.totalPrice.toLocaleString()} XAF`
                  : <span className="text-muted-foreground">—</span>}
              </td>

              {/* Visibility */}
              <td className="px-4 py-3 hidden md:table-cell">
                <Badge variant={cocktail.isPublic ? 'success' : 'outline'} className="text-xs">
                  {cocktail.isPublic ? 'Public' : 'Private'}
                </Badge>
              </td>

              {/* Actions */}
              <td className="px-4 py-3">
                <div className="flex items-center gap-1 justify-end">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 text-muted-foreground hover:text-foreground"
                    title={cocktail.isActive ? 'Deactivate' : 'Activate'}
                    onClick={() => onToggleActive(cocktail)}
                  >
                    {cocktail.isActive ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 text-muted-foreground hover:text-foreground"
                    onClick={() => onEdit(cocktail)}
                  >
                    <Pencil className="size-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 text-muted-foreground hover:text-destructive"
                    onClick={() => onDelete(cocktail)}
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
