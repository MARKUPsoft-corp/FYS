import { Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { Category } from '@/entities';

type Props = {
  categories: Category[];
  onEdit: (category: Category) => void;
  onDelete: (category: Category) => void;
};

export function CategoryList({ categories, onEdit, onDelete }: Props) {
  if (categories.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-10">
        No categories yet.
      </p>
    );
  }

  return (
    <div className="divide-y divide-border">
      {categories.map((cat) => (
        <div key={cat.id} className="flex items-center justify-between py-3 px-1">
          <div className="flex items-center gap-3">
            {/* <Badge variant="secondary" className="font-mono text-xs">
              {cat.id}
            </Badge> */}
            <span className="text-sm font-medium text-foreground">{cat.name}</span>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="size-8 text-muted-foreground hover:text-foreground"
              onClick={() => onEdit(cat)}
            >
              <Pencil className="size-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-8 text-muted-foreground hover:text-destructive"
              onClick={() => onDelete(cat)}
            >
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
