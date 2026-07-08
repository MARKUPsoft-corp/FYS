import { PageComponent } from 'rasengan';
import { HeartPulse } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const Profile: PageComponent = () => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display font-semibold text-2xl text-foreground">Profil santé</h2>
        <p className="text-muted-foreground text-sm mt-1">
          Vos conditions de santé, allergies et objectifs pour une analyse NutriFYS personnalisée.
        </p>
      </div>
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16 gap-3 text-center">
          <div className="size-14 rounded-full bg-rose-50 dark:bg-rose-950/30 flex items-center justify-center">
            <HeartPulse className="size-6 text-rose-300" />
          </div>
          <p className="text-sm font-medium text-foreground">Profil non configuré</p>
          <p className="text-xs text-muted-foreground max-w-[240px]">
            Renseignez vos informations de santé pour obtenir une analyse NutriFYS personnalisée.
          </p>
          <Button size="sm" className="mt-2">Configurer mon profil</Button>
        </CardContent>
      </Card>
    </div>
  );
};

Profile.metadata = {
  title: 'FYS — Profil santé',
  description: 'Profil santé FYS.',
};

export default Profile;
