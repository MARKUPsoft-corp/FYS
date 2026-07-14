import { useState } from 'react';
import { PageComponent } from 'rasengan';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/auth';
import { UserRole, type Cocktail } from '@/entities';
import { getCocktails, getPublicCocktails, createCocktail, updateCocktail, deleteCocktail, toggleCocktailActive } from '@/services/cocktail';
import { getFruits } from '@/services/fruit';
import { getCategories } from '@/services/category';
import { CustomerCatalogue } from '@/components/features/catalogue/CustomerCatalogue';
import { AdminCatalogue } from '@/components/features/catalogue/AdminCatalogue';
import { CocktailFormDrawer } from '@/components/features/catalogue/CocktailFormDrawer';

const Catalogue: PageComponent = () => {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const isAdmin = user?.role === UserRole.ADMIN;

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<Cocktail | null>(null);

  // Fetch cocktails — admins see all, customers see only active+public
  const { data: cocktails = [], isLoading: cocktailsLoading } = useQuery({
    queryKey: isAdmin ? ['cocktails', 'all'] : ['cocktails', 'public'],
    queryFn: isAdmin ? getCocktails : getPublicCocktails,
  });

  // Fruits and categories needed by the form drawer (admin only)
  const { data: fruits = [] } = useQuery({
    queryKey: ['fruits'],
    queryFn: getFruits,
    enabled: isAdmin,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: getCategories,
    enabled: isAdmin,
  });

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['cocktails'] });
  }

  function openCreate() {
    setEditing(null);
    setDrawerOpen(true);
  }

  function openEdit(cocktail: Cocktail) {
    setEditing(cocktail);
    setDrawerOpen(true);
  }

  async function handleDelete(cocktail: Cocktail) {
    if (!confirm(`Delete "${cocktail.name}"?`)) return;
    await deleteCocktail(cocktail.id, cocktail.imageUrl);
    invalidate();
  }

  async function handleToggleActive(cocktail: Cocktail) {
    await toggleCocktailActive(cocktail.id, !cocktail.isActive);
    invalidate();
  }

  async function handleSave(
    data: Omit<Cocktail, 'id' | 'createdAt' | 'updatedAt'>,
    imageFile: File | null,
    cocktailId?: string,
  ) {
    if (cocktailId) {
      await updateCocktail(cocktailId, data, imageFile ?? undefined);
    } else {
      await createCocktail(data, imageFile ?? undefined);
    }
    invalidate();
  }

  if (isAdmin) {
    return (
      <>
        <AdminCatalogue
          cocktails={cocktails}
          loading={cocktailsLoading}
          onEdit={openEdit}
          onDelete={handleDelete}
          onToggleActive={handleToggleActive}
          onAdd={openCreate}
        />
        <CocktailFormDrawer
          open={drawerOpen}
          cocktail={editing}
          fruits={fruits}
          categories={categories}
          createdBy={user!.uid}
          onClose={() => setDrawerOpen(false)}
          onSave={handleSave}
        />
      </>
    );
  }

  return <CustomerCatalogue cocktails={cocktails} loading={cocktailsLoading} />;
};

Catalogue.metadata = {
  title: 'FYS — Catalogue',
  description: 'Cocktail catalogue.',
};

export default Catalogue;
