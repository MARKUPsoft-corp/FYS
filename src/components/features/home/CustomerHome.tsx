import { Link } from 'rasengan';
import { GlassWater, Apple, FlaskConical, ArrowRight, Sparkles } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

type Props = { name: string };

export function CustomerHome({ name }: Props) {
  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Bonjour,</p>
          <h2 className="font-display font-bold text-3xl text-foreground mt-1 leading-tight capitalize">{name}</h2>
          <p className="text-muted-foreground mt-2 text-sm">Que veux-tu boire aujourd'hui ?</p>
        </div>
        <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 text-primary px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide shrink-0 mt-1">
          <Sparkles className="size-3" />
          NutriFYS actif
        </div>
      </div>


      <div className="relative rounded-[2.5rem] bg-[#28522F] p-7 overflow-hidden shadow-xl shadow-primary/20">
        <div className="absolute -right-12 -top-12 size-48 bg-white/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute right-8 bottom-[-20%] size-32 bg-white/5 rounded-full blur-2xl pointer-events-none" />
        <div
          className="absolute inset-0 opacity-10 pointer-events-none"
          style={{ backgroundImage: 'radial-gradient(circle at 70% 30%, white 0%, transparent 50%)' }}
        />

        <div className="relative z-10 max-w-sm">
          <h3 className="font-display font-extrabold text-xl text-primary-foreground leading-tight">
            Crée Ton Mix Parfait
          </h3>
          <p className="text-primary-foreground/80 text-xs mt-2 mb-5 max-w-[240px] leading-relaxed">
            Mélange tes fruits préférés, NutriFYS s'assure que ça booste ton profil santé.
          </p>
          <Button
            asChild
            size="sm"
            className="rounded-full bg-white text-[#28522F] hover:bg-stone-50 hover:scale-105 active:scale-95 transition-all shadow-md font-bold px-5"
          >
            <Link to="/cocktails">
              <FlaskConical className="size-4 mr-2" />
              Mixer maintenant
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
        <Card className="rounded-[2rem] border-dashed border-2 border-muted bg-transparent shadow-none group hover:border-primary/50 transition-colors">
          <CardContent className="flex flex-col items-center justify-center py-16 gap-4 text-center relative overflow-hidden">
            <div className="absolute -left-10 -top-10 size-40 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-colors" />
            <div className="size-20 rounded-full bg-primary/10 flex items-center justify-center animate-pulse shadow-inner relative z-10">
              <GlassWater className="size-10 text-primary/60" />
            </div>
            <div className="relative z-10">
              <p className="text-lg font-bold text-foreground">Mixeur en pause</p>
              <p className="text-sm text-muted-foreground max-w-[260px] mx-auto mt-1">
                Le catalogue de nos experts sera bientôt prêt à déguster.
              </p>
            </div>
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
        <Card className="rounded-[2rem] border-dashed border-2 border-muted bg-transparent shadow-none group hover:border-orange-200 transition-colors">
          <CardContent className="flex flex-col items-center justify-center py-16 gap-4 text-center relative overflow-hidden">
             <div className="absolute right-0 bottom-0 size-40 bg-orange-50 dark:bg-orange-950/20 rounded-full blur-2xl group-hover:scale-110 transition-transform" />
             <div className="relative size-20 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center group-hover:rotate-12 transition-transform shadow-inner z-10">
              <Apple className="size-10 text-orange-400" />
            </div>
            <div className="relative z-10">
              <p className="text-lg font-bold text-foreground">Le verger se repose</p>
              <p className="text-sm text-muted-foreground max-w-[260px] mx-auto mt-1">
                Des fruits archi-frais de saison arrivent très prochainement.
              </p>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
