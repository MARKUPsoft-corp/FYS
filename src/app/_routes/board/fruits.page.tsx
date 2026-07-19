import { useState } from 'react';
import { PageComponent } from 'rasengan';
import { Plus } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { FruitTable } from '@/components/features/fruits/FruitTable';
import { FruitFormDrawer } from '@/components/features/fruits/FruitFormDrawer';
import { getFruits, createFruit, updateFruit, deleteFruit } from '@/services/fruit';
import { getCategories } from '@/services/category';
import type { Fruit } from '@/entities';

const Fruits: PageComponent = () => {
  const queryClient = useQueryClient();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<Fruit | null>(null);

  const { data: fruits = [], isLoading: fruitsLoading } = useQuery({
    queryKey: ['fruits'],
    queryFn: getFruits,
  });

  const { data: categories = [], isLoading: catsLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: getCategories,
  });

  const loading = fruitsLoading || catsLoading;

  function openCreate() {
    setEditing(null);
    setDrawerOpen(true);
  }

  function openEdit(fruit: Fruit) {
    setEditing(fruit);
    setDrawerOpen(true);
  }

  async function handleDelete(fruit: Fruit) {
    if (!confirm(`Delete "${fruit.name}"?`)) return;
    await deleteFruit(fruit.id, fruit.imageUrl);
    queryClient.invalidateQueries({ queryKey: ['fruits'] });
  }

  async function handleSave(
    data: Omit<Fruit, 'id' | 'createdAt' | 'updatedAt'>,
    imageFile: File | null,
    fruitId?: string,
  ) {
    if (fruitId) {
      await updateFruit(fruitId, data, imageFile ?? undefined);
    } else {
      await createFruit(data, imageFile ?? undefined);
    }
    queryClient.invalidateQueries({ queryKey: ['fruits'] });
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-3 md:px-4 lg:px-6 pt-6 lg:pt-10 pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground font-semibold uppercase tracking-widest pl-1 mb-2">Ingrédients</p>
          <h2 className="font-display font-bold text-4xl text-foreground leading-[1.1]">Fruits & suppléments</h2>
          <p className="text-muted-foreground text-lg font-medium mt-3">
            Gérez le catalogue : fruits principaux, suppléments, ou les deux.
          </p>
        </div>
        <Button size="lg" onClick={openCreate} className="rounded-full shadow-sm">
          <Plus className="size-5 mr-2" />
          Ajouter un fruit
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 bg-card rounded-[2rem] border border-border/40 shadow-sm">
          <p className="text-sm font-semibold text-muted-foreground animate-pulse">Chargement en cours…</p>
        </div>
      ) : (
        <div className="bg-card rounded-[2rem] border border-border/40 shadow-sm overflow-hidden">
          <FruitTable
            fruits={fruits}
            categories={categories}
            onEdit={openEdit}
            onDelete={handleDelete}
          />
        </div>
      )}

      <FruitFormDrawer
        open={drawerOpen}
        fruit={editing}
        categories={categories}
        onClose={() => setDrawerOpen(false)}
        onSave={handleSave}
      />
    </div>
  );
};

Fruits.metadata = {
  title: 'FYS — Fruits',
  description: 'Fruit catalogue management.',
};

export default Fruits;
