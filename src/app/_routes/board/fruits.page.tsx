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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display font-semibold text-2xl text-foreground">Fruits</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Manage the fruit catalogue, prices, and nutrients.
          </p>
        </div>
        <Button size="sm" onClick={openCreate}>
          <Plus className="size-4 mr-1.5" />
          Add fruit
        </Button>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground text-center py-16">Loading…</p>
      ) : (
        <FruitTable
          fruits={fruits}
          categories={categories}
          onEdit={openEdit}
          onDelete={handleDelete}
        />
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
