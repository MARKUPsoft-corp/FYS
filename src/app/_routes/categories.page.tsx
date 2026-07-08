import { PageComponent } from 'rasengan';
import { Tag } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const Categories: PageComponent = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display font-semibold text-2xl text-foreground">Catégories</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Organisez les fruits par catégories (citrus, tropical, low-sugar…).
          </p>
        </div>
        <Button size="sm">Ajouter une catégorie</Button>
      </div>
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16 gap-3 text-center">
          <div className="size-14 rounded-full bg-primary/5 flex items-center justify-center">
            <Tag className="size-6 text-primary/50" />
          </div>
          <p className="text-sm font-medium text-foreground">Aucune catégorie</p>
          <p className="text-xs text-muted-foreground max-w-[220px]">
            Commencez par créer des catégories pour organiser vos fruits.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

Categories.metadata = {
  title: 'FYS — Catégories',
  description: 'Gestion des catégories FYS.',
};

export default Categories;
