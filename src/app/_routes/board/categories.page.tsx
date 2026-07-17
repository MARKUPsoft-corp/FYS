import { useState } from 'react';
import { PageComponent } from 'rasengan';
import { Plus } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
// import removed
import { CategoryList } from '@/components/features/categories/CategoryList';
import { CategoryFormDialog } from '@/components/features/categories/CategoryFormDialog';
import { getCategories, createCategory, updateCategory, deleteCategory } from '@/services/category';
import type { Category } from '@/entities';

const Categories: PageComponent = () => {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: getCategories,
  });

  function openCreate() {
    setEditing(null);
    setDialogOpen(true);
  }

  function openEdit(category: Category) {
    setEditing(category);
    setDialogOpen(true);
  }

  async function handleDelete(category: Category) {
    if (!confirm(`Delete category "${category.name}"?`)) return;
    await deleteCategory(category.id);
    queryClient.invalidateQueries({ queryKey: ['categories'] });
  }

  async function handleSave(name: string, id?: string) {
    if (id) {
      await updateCategory(id, name);
    } else {
      await createCategory(name);
    }
    queryClient.invalidateQueries({ queryKey: ['categories'] });
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-3 md:px-4 lg:px-6 pt-6 lg:pt-10 pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground font-semibold uppercase tracking-widest pl-1 mb-2">Structure</p>
          <h2 className="font-display font-bold text-4xl text-foreground leading-[1.1]">Catégories</h2>
          <p className="text-muted-foreground text-lg font-medium mt-3">
            Classez vos fruits en grands types nutritionnels.
          </p>
        </div>
        <Button size="lg" onClick={openCreate} className="rounded-full shadow-sm">
          <Plus className="size-5 mr-2" />
          Ajouter une catégorie
        </Button>
      </div>

      <div className="bg-card rounded-[2rem] border border-border/40 shadow-sm p-4 md:p-6 overflow-hidden">
        <div>
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <p className="text-sm font-semibold text-muted-foreground animate-pulse">Chargement en cours…</p>
            </div>
          ) : (
            <CategoryList
              categories={categories}
              onEdit={openEdit}
              onDelete={handleDelete}
            />
          )}
        </div>
      </div>

      <CategoryFormDialog
        open={dialogOpen}
        category={editing}
        onClose={() => setDialogOpen(false)}
        onSave={handleSave}
      />
    </div>
  );
};

Categories.metadata = {
  title: 'FYS — Categories',
  description: 'Category management.',
};

export default Categories;
