import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CocktailTable } from './CocktailTable';
import type { Cocktail } from '@/entities';

type Props = {
  cocktails: Cocktail[];
  loading?: boolean;
  onEdit: (cocktail: Cocktail) => void;
  onDelete: (cocktail: Cocktail) => void;
  onToggleActive: (cocktail: Cocktail) => void;
  onAdd: () => void;
};

export function AdminCatalogue({ cocktails, loading, onEdit, onDelete, onToggleActive, onAdd }: Props) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display font-semibold text-2xl text-foreground">Catalogue</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Manage catalog cocktails visible to customers.
          </p>
        </div>
        <Button size="sm" onClick={onAdd}>
          <Plus className="size-4 mr-1.5" />
          Add cocktail
        </Button>
      </div>

      {loading ? (
        <div className="rounded-xl border border-border/40 overflow-hidden divide-y divide-border/40">
          <div className="bg-muted/30 h-10 w-full" />
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-3 bg-card">
              <div className="size-10 rounded-lg bg-muted animate-pulse shrink-0" />
              <div className="space-y-2 flex-1">
                <div className="h-4 w-[150px] bg-muted animate-pulse rounded" />
                <div className="h-3 w-[100px] bg-muted animate-pulse rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <CocktailTable
          cocktails={cocktails}
          onEdit={onEdit}
          onDelete={onDelete}
          onToggleActive={onToggleActive}
        />
      )}
    </div>
  );
}
