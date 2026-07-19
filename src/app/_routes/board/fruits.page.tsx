import { useState } from 'react';
import { PageComponent } from 'rasengan';
import { Plus } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { FruitTable } from '@/components/features/fruits/FruitTable';
import { FruitFormDrawer } from '@/components/features/fruits/FruitFormDrawer';
import { BoardPageShell } from '@/components/layout/BoardPageShell';
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
    <>
      <BoardPageShell
        eyebrow="Ingrédients"
        titleBefore="Fruits &"
        titleHighlight="suppléments"
        sectionBefore="Le"
        sectionHighlight="Catalogue"
        subtitle="Gérez les fruits principaux, les suppléments, ou les deux."
        imageUrl="https://images.pexels.com/photos/1132047/pexels-photo-1132047.jpeg?auto=compress&cs=tinysrgb&w=1200"
        actions={
          <Button
            size="lg"
            onClick={openCreate}
            className="w-full rounded-[2rem] h-14 bg-primary text-white font-bold text-base gap-3 shadow-[0_8px_30px_rgba(63,109,78,0.25)] hover:bg-primary/90 active:scale-95 transition-all"
          >
            <Plus className="size-5" />
            Ajouter un fruit
          </Button>
        }
      >
        {loading ? (
          <div className="flex items-center justify-center py-20 rounded-[2rem] border border-border/40 bg-card shadow-sm">
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
      </BoardPageShell>

      <FruitFormDrawer
        open={drawerOpen}
        fruit={editing}
        categories={categories}
        onClose={() => setDrawerOpen(false)}
        onSave={handleSave}
      />
    </>
  );
};

Fruits.metadata = {
  title: 'FYS — Fruits',
  description: 'Fruit catalogue management.',
};

export default Fruits;
