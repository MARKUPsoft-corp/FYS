import { PageComponent } from 'rasengan';
import { HeartPulse, Apple, Zap, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';

const NutriStats = [
  { icon: Apple, label: 'Fruits préférés', value: '3 renseignés', color: 'bg-primary/10 text-primary' },
  { icon: Zap, label: 'Objectif santé', value: 'Énergie & Vitalité', color: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400' },
  { icon: Shield, label: 'Allergies', value: 'Aucune renseignée', color: 'bg-secondary/10 text-secondary' },
];

const Profile: PageComponent = () => {
  return (
    <div className="min-h-screen bg-background pb-20">

      {/* Hero Banner */}
      <div
        className="relative w-full h-[240px] flex items-end px-6 pb-8 mb-12 overflow-hidden"
        style={{ backgroundImage: "url('https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=1200')", backgroundSize: 'cover', backgroundPosition: 'center' }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent" />
        {/* Avatar */}
        <div className="absolute -bottom-10 left-6 size-24 rounded-full bg-primary flex items-center justify-center border-4 border-background shadow-2xl z-20">
          <HeartPulse className="size-10 text-white" />
        </div>
        <div className="relative z-10 ml-32">
          <p className="text-white/70 text-xs font-bold uppercase tracking-[0.2em] mb-1">NutriFYS</p>
          <h1 className="font-display font-extrabold text-4xl text-white">
            Mon <span className="text-secondary italic">Profil</span>
          </h1>
        </div>
      </div>

      <div className="px-4 space-y-8 mt-14">

        {/* User banner */}
        <div className="bg-card rounded-[2rem] border border-border/50 p-5 shadow-sm">
          <h2 className="font-display font-bold text-xl text-foreground">MS tuto</h2>
          <p className="text-sm text-muted-foreground mt-1">Membre FYS · Profil en cours de configuration</p>
          <Button size="sm" className="mt-4 rounded-full bg-primary text-white font-bold hover:bg-primary/90 px-6">
            Modifier mon profil
          </Button>
        </div>

        {/* Nutri stats */}
        <div>
          <h3 className="font-display font-bold text-2xl mb-4">
            <span className="text-foreground">Mon </span>
            <span className="text-primary">Bilan NutriFYS</span>
          </h3>
          <div className="grid grid-cols-1 gap-4">
            {NutriStats.map((stat, idx) => (
              <div key={idx} className="bg-card rounded-[2rem] border border-border/50 p-5 shadow-sm flex items-center gap-5">
                <div className={`size-14 rounded-2xl flex items-center justify-center shrink-0 ${stat.color}`}>
                  <stat.icon className="size-7" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium">{stat.label}</p>
                  <p className="font-bold text-foreground mt-0.5">{stat.value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA Setup */}
        <div
          className="relative rounded-[2.5rem] overflow-hidden flex items-center px-8 py-10"
          style={{ backgroundImage: "url('https://images.pexels.com/photos/2294471/pexels-photo-2294471.jpeg?auto=compress&cs=tinysrgb&w=1200')", backgroundSize: 'cover', backgroundPosition: 'center' }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-primary/90 to-primary/60" />
          <div className="relative z-10">
            <p className="text-white/80 text-xs font-bold uppercase tracking-widest mb-2">Personnalisation</p>
            <h3 className="font-display font-extrabold text-2xl text-white leading-tight mb-4">
              Complète ton profil pour des<br />
              <span className="text-secondary italic">recommandations personnalisées</span>
            </h3>
            <Button className="rounded-full bg-white text-primary font-bold hover:bg-white/90 active:scale-95 transition-all px-8 h-12 shadow-xl">
              Configurer mon profil
            </Button>
          </div>
        </div>

      </div>
    </div>
  );
};

Profile.metadata = {
  title: 'FYS — Profil santé',
  description: 'Profil santé FYS.',
};

export default Profile;
