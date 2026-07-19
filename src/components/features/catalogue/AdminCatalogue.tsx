import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CocktailTable } from './CocktailTable';
import { BoardPageShell } from '@/components/layout/BoardPageShell';
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
    <BoardPageShell
      eyebrow="Carte"
      titleBefore="Le"
      titleHighlight="Catalogue"
      sectionBefore="Créations"
      sectionHighlight="publiques"
      subtitle="Définissez les cocktails visibles par les clients."
      imageUrl="https://images.pexels.com/photos/1337825/pexels-photo-1337825.jpeg?auto=compress&cs=tinysrgb&w=1200"
      imagePosition="center top"
      actions={
        <Button
          size="lg"
          onClick={onAdd}
          className="w-full rounded-[2rem] h-14 bg-primary text-white font-bold text-base gap-3 shadow-[0_8px_30px_rgba(63,109,78,0.25)] hover:bg-primary/90 active:scale-95 transition-all"
        >
          <Plus className="size-5" />
          Ajouter un cocktail
        </Button>
      }
    >
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
    </BoardPageShell>
  );
}
