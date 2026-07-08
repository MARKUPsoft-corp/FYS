import { PageComponent } from 'rasengan';
import { Apple } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const Fruits: PageComponent = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display font-semibold text-2xl text-foreground">Fruits</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Gérez le catalogue de fruits, leurs prix et nutriments.
          </p>
        </div>
        <Button size="sm">Ajouter un fruit</Button>
      </div>
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16 gap-3 text-center">
          <div className="size-14 rounded-full bg-orange-50 dark:bg-orange-950/30 flex items-center justify-center">
            <Apple className="size-6 text-orange-300" />
          </div>
          <p className="text-sm font-medium text-foreground">Aucun fruit</p>
          <p className="text-xs text-muted-foreground max-w-[220px]">
            Commencez par ajouter des fruits à votre catalogue.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

Fruits.metadata = {
  title: 'FYS — Fruits',
  description: 'Gestion des fruits FYS.',
};

export default Fruits;
