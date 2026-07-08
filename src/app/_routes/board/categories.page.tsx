import { useState } from 'react';
import { PageComponent } from 'rasengan';
import { Plus } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display font-semibold text-2xl text-foreground">Categories</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Organise fruits by category (citrus, tropical, low-sugar…).
          </p>
        </div>
        <Button size="sm" onClick={openCreate}>
          <Plus className="size-4 mr-1.5" />
          Add category
        </Button>
      </div>

      <Card>
        <CardContent className="py-4 px-6">
          {isLoading ? (
            <p className="text-sm text-muted-foreground text-center py-10">Loading…</p>
          ) : (
            <CategoryList
              categories={categories}
              onEdit={openEdit}
              onDelete={handleDelete}
            />
          )}
        </CardContent>
      </Card>

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
