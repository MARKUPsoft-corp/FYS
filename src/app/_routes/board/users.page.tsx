import { PageComponent } from 'rasengan';
import { Users as UsersIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

const Users: PageComponent = () => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display font-semibold text-2xl text-foreground">Utilisateurs</h2>
        <p className="text-muted-foreground text-sm mt-1">
          Liste des comptes clients et administrateurs.
        </p>
      </div>
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16 gap-3 text-center">
          <div className="size-14 rounded-full bg-violet-50 dark:bg-violet-950/30 flex items-center justify-center">
            <UsersIcon className="size-6 text-violet-300" />
          </div>
          <p className="text-sm font-medium text-foreground">Aucun utilisateur</p>
          <p className="text-xs text-muted-foreground max-w-[220px]">
            Les utilisateurs inscrits apparaîtront ici.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

Users.metadata = {
  title: 'FYS — Utilisateurs',
  description: 'Gestion des utilisateurs FYS.',
};

export default Users;
