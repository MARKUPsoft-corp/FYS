import { Link } from 'rasengan';
import { GlassWater, Apple, FlaskConical, ArrowRight, Sparkles } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

type Props = { name: string };

export function CustomerHome({ name }: Props) {
  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Bonjour,</p>
          <h2 className="font-display font-semibold text-3xl text-foreground mt-0.5">{name} 👋</h2>
          <p className="text-muted-foreground mt-1 text-sm">Que veux-tu boire aujourd'hui ?</p>
        </div>
        <Badge variant="success" className="shrink-0 gap-1.5 mt-1">
          <Sparkles className="size-3" />
          NutriFYS actif
        </Badge>
      </div>

      <div className="relative rounded-2xl bg-primary p-6 overflow-hidden">
        <div
          className="absolute inset-0 opacity-10"
          style={{ backgroundImage: 'radial-gradient(circle at 80% 50%, white 0%, transparent 60%)' }}
        />
        <div className="relative z-10 max-w-sm">
          <p className="text-primary-foreground/80 text-sm font-medium">Nouveau</p>
          <h3 className="font-display font-semibold text-2xl text-primary-foreground mt-1 leading-tight">
            Compose ton jus personnalisé
          </h3>
          <p className="text-primary-foreground/70 text-sm mt-2">
            Choisis tes fruits, NutriFYS analyse la compatibilité avec ton profil santé.
          </p>
          <Button
            asChild
            size="sm"
            className="mt-4 bg-primary-foreground text-primary hover:bg-primary-foreground/90"
          >
            <Link to="/cocktails">
              <FlaskConical className="size-4" />
              Créer un cocktail
            </Link>
          </Button>
        </div>
      </div>

      <section>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-display font-semibold text-lg text-foreground">Cocktails du catalogue</h3>
            <p className="text-xs text-muted-foreground">Créés par notre équipe</p>
          </div>
          <Button asChild variant="ghost" size="sm" className="text-primary">
            <Link to="/catalogue">
              Tout voir
              <ArrowRight className="size-3" />
            </Link>
          </Button>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 gap-3 text-center">
            <div className="size-14 rounded-full bg-primary/5 flex items-center justify-center">
              <GlassWater className="size-6 text-primary/50" />
            </div>
            <p className="text-sm font-medium text-foreground">Aucun cocktail disponible</p>
            <p className="text-xs text-muted-foreground max-w-[200px]">
              Le catalogue sera bientôt rempli par notre équipe.
            </p>
          </CardContent>
        </Card>
      </section>

      <section>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-display font-semibold text-lg text-foreground">Fruits disponibles</h3>
            <p className="text-xs text-muted-foreground">Frais et de saison</p>
          </div>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 gap-3 text-center">
            <div className="size-14 rounded-full bg-orange-50 dark:bg-orange-950/30 flex items-center justify-center">
              <Apple className="size-6 text-orange-300" />
            </div>
            <p className="text-sm font-medium text-foreground">Aucun fruit disponible</p>
            <p className="text-xs text-muted-foreground max-w-[200px]">
              Notre catalogue de fruits sera disponible prochainement.
            </p>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
