import { useState } from 'react';
import { PageComponent } from 'rasengan';
import { useAuthStore } from '@/stores/auth';
import { UserRole, type Cocktail } from '@/entities';
import { MOCK_COCKTAILS } from '@/data/mock-cocktails';
import { CustomerCatalogue } from '@/components/features/catalogue/CustomerCatalogue';
import { AdminCatalogue } from '@/components/features/catalogue/AdminCatalogue';

const Catalogue: PageComponent = () => {
  const { user } = useAuthStore();
  const [cocktails, setCocktails] = useState<Cocktail[]>(MOCK_COCKTAILS);

  // ── Admin handlers (stubs until Firestore service is wired) ──────────────
  function handleEdit(cocktail: Cocktail) {
    // TODO: open CocktailFormDrawer
    console.log('edit', cocktail.id);
  }

  function handleDelete(cocktail: Cocktail) {
    if (!confirm(`Delete "${cocktail.name}"?`)) return;
    setCocktails((prev) => prev.filter((c) => c.id !== cocktail.id));
  }

  function handleToggleActive(cocktail: Cocktail) {
    setCocktails((prev) =>
      prev.map((c) => c.id === cocktail.id ? { ...c, isActive: !c.isActive } : c),
    );
  }

  function handleAdd() {
    // TODO: open CocktailFormDrawer in create mode
    console.log('add cocktail');
  }

  if (user?.role === UserRole.ADMIN) {
    return (
      <AdminCatalogue
        cocktails={cocktails}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onToggleActive={handleToggleActive}
        onAdd={handleAdd}
      />
    );
  }

  return <CustomerCatalogue cocktails={cocktails} />;
};

Catalogue.metadata = {
  title: 'FYS — Catalogue',
  description: 'Cocktail catalogue.',
};

export default Catalogue;
