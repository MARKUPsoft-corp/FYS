import { PageComponent } from 'rasengan';
import { ShoppingBag } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { useAuthStore } from '@/stores/auth';
import { UserRole } from '@/entities';

const Orders: PageComponent = () => {
  const { user } = useAuthStore();
  const isAdmin = user?.role === UserRole.ADMIN;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display font-semibold text-2xl text-foreground">
          {isAdmin ? 'Commandes' : 'Mes commandes'}
        </h2>
        <p className="text-muted-foreground text-sm mt-1">
          {isAdmin
            ? 'Toutes les commandes passées sur la plateforme.'
            : 'L\'historique de vos commandes.'}
        </p>
      </div>
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16 gap-3 text-center">
          <div className="size-14 rounded-full bg-secondary/10 flex items-center justify-center">
            <ShoppingBag className="size-6 text-secondary/50" />
          </div>
          <p className="text-sm font-medium text-foreground">Aucune commande</p>
          <p className="text-xs text-muted-foreground max-w-[220px]">
            {isAdmin
              ? 'Les commandes apparaîtront ici une fois passées.'
              : 'Vous n\'avez pas encore passé de commande.'}
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

Orders.metadata = {
  title: 'FYS — Commandes',
  description: 'Gestion des commandes FYS.',
};

export default Orders;
