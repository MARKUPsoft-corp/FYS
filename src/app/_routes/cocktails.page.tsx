import { PageComponent } from 'rasengan';
import { FlaskConical } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/stores/auth';
import { UserRole } from '@/entities';

const Cocktails: PageComponent = () => {
  const { user } = useAuthStore();
  const isAdmin = user?.role === UserRole.ADMIN;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display font-semibold text-2xl text-foreground">
            {isAdmin ? 'Cocktails catalogue' : 'Mes cocktails'}
          </h2>
          <p className="text-muted-foreground text-sm mt-1">
            {isAdmin
              ? 'Gérez les cocktails visibles dans le catalogue.'
              : 'Vos mélanges personnalisés sauvegardés.'}
          </p>
        </div>
        {isAdmin && <Button size="sm">Ajouter un cocktail</Button>}
        {!isAdmin && <Button size="sm">Nouveau cocktail</Button>}
      </div>
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16 gap-3 text-center">
          <div className="size-14 rounded-full bg-primary/5 flex items-center justify-center">
            <FlaskConical className="size-6 text-primary/50" />
          </div>
          <p className="text-sm font-medium text-foreground">
            {isAdmin ? 'Aucun cocktail dans le catalogue' : 'Aucun cocktail créé'}
          </p>
          <p className="text-xs text-muted-foreground max-w-[220px]">
            {isAdmin
              ? 'Commencez par ajouter un cocktail au catalogue.'
              : 'Créez votre premier mélange de fruits.'}
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

Cocktails.metadata = {
  title: 'FYS — Cocktails',
  description: 'Gestion des cocktails FYS.',
};

export default Cocktails;
