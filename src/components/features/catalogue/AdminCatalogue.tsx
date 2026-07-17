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
    <div className="space-y-8 max-w-7xl mx-auto px-3 md:px-4 lg:px-6 pt-6 lg:pt-10 pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground font-semibold uppercase tracking-widest pl-1 mb-2">Carte</p>
          <h2 className="font-display font-bold text-4xl text-foreground leading-[1.1]">Catalogue</h2>
          <p className="text-muted-foreground text-lg font-medium mt-3">
            Définissez les cocktails visibles par les clients.
          </p>
        </div>
        <Button size="lg" onClick={onAdd} className="rounded-full shadow-sm">
          <Plus className="size-5 mr-2" />
          Ajouter un cocktail
        </Button>
      </div>

      {loading ? (
        <div className="rounded-[2rem] border border-border/40 overflow-hidden shadow-sm bg-card divide-y divide-border/40">
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
        <div className="bg-card rounded-[2rem] border border-border/40 shadow-sm overflow-hidden">
          <CocktailTable
          cocktails={cocktails}
          onEdit={onEdit}
          onDelete={onDelete}
          onToggleActive={onToggleActive}
        />
        </div>
      )}
    </div>
  );
}
