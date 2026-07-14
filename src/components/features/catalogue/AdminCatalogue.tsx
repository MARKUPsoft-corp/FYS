import { useState } from 'react';
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
        <p className="text-sm text-muted-foreground text-center py-16">Loading…</p>
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
