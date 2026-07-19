import { useState } from 'react';
import { PageComponent } from 'rasengan';
import { Plus } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { CategoryList } from '@/components/features/categories/CategoryList';
import { CategoryFormDialog } from '@/components/features/categories/CategoryFormDialog';
import { BoardPageShell } from '@/components/layout/BoardPageShell';
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
    <>
      <BoardPageShell
        eyebrow="Structure"
        titleBefore="Les"
        titleHighlight="Catégories"
        sectionBefore="Types"
        sectionHighlight="nutritionnels"
        subtitle="Classez vos fruits en grands types pour le Lab et le catalogue."
        imageUrl="https://images.pexels.com/photos/1435735/pexels-photo-1435735.jpeg?auto=compress&cs=tinysrgb&w=1200"
        actions={
          <Button
            size="lg"
            onClick={openCreate}
            className="w-full rounded-[2rem] h-14 bg-primary text-white font-bold text-base gap-3 shadow-[0_8px_30px_rgba(63,109,78,0.25)] hover:bg-primary/90 active:scale-95 transition-all"
          >
            <Plus className="size-5" />
            Ajouter une catégorie
          </Button>
        }
      >
        <div className="bg-card rounded-[2rem] border border-border/40 shadow-sm p-4 md:p-6 overflow-hidden">
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
      </BoardPageShell>

      <CategoryFormDialog
        open={dialogOpen}
        category={editing}
        onClose={() => setDialogOpen(false)}
        onSave={handleSave}
      />
    </>
  );
};

Categories.metadata = {
  title: 'FYS — Categories',
  description: 'Category management.',
};

export default Categories;
