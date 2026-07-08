import { PageComponent } from 'rasengan';
import { GlassWater } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

const Catalogue: PageComponent = () => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display font-semibold text-2xl text-foreground">Catalogue</h2>
        <p className="text-muted-foreground text-sm mt-1">Tous les cocktails créés par notre équipe.</p>
      </div>
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16 gap-3 text-center">
          <div className="size-14 rounded-full bg-primary/5 flex items-center justify-center">
            <GlassWater className="size-6 text-primary/50" />
          </div>
          <p className="text-sm font-medium text-foreground">Catalogue vide</p>
          <p className="text-xs text-muted-foreground max-w-[220px]">
            Les cocktails du catalogue seront disponibles prochainement.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

Catalogue.metadata = {
  title: 'FYS — Catalogue',
  description: 'Catalogue de cocktails FYS.',
};

export default Catalogue;
