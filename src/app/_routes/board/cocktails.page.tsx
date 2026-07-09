import { PageComponent } from 'rasengan';
import { FlaskConical, Plus, Flame } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/stores/auth';
import { UserRole } from '@/entities';

const MOCK_CUSTOM = [
  { name: 'Mon Mix #1', desc: 'Orange, Gingembre, Citron', img: "url('https://images.pexels.com/photos/42059/citrus-diet-food-fresh-42059.jpeg?auto=compress&cs=tinysrgb&w=800')" },
  { name: 'Energie +', desc: 'Carotte, Pomme, Betterave', img: "url('https://images.pexels.com/photos/1000084/pexels-photo-1000084.jpeg?auto=compress&cs=tinysrgb&w=800')" },
  { name: 'Smoothie Violet', desc: 'Myrtille, Banane, Açaï', img: "url('https://images.pexels.com/photos/1153655/pexels-photo-1153655.jpeg?auto=compress&cs=tinysrgb&w=800')" },
];

const Cocktails: PageComponent = () => {
  const { user } = useAuthStore();
  const isAdmin = user?.role === UserRole.ADMIN;

  return (
    <div className="min-h-screen bg-background pb-20">

      {/* Hero Banner */}
      <div
        className="relative w-full h-[220px] flex items-end px-6 pb-8 mb-12 overflow-hidden"
        style={{ backgroundImage: "url('https://images.pexels.com/photos/1638280/pexels-photo-1638280.jpeg?auto=compress&cs=tinysrgb&w=1200')", backgroundSize: 'cover', backgroundPosition: 'center' }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
        <div className="relative z-10 flex-1">
          <p className="text-white/70 text-xs font-bold uppercase tracking-[0.2em] mb-1">
            {isAdmin ? 'Administration' : 'Mes mélanges'}
          </p>
          <h1 className="font-display font-extrabold text-4xl text-white">
            {isAdmin ? 'Cocktails ' : 'Mes '}
            <span className="text-secondary italic">Cocktails</span>
          </h1>
        </div>
      </div>

      <div className="px-4 space-y-10">

        {/* CTA Button */}
        <Button
          size="lg"
          className="w-full rounded-[2rem] h-16 bg-primary text-white font-bold text-base gap-3 shadow-[0_8px_30px_rgba(63,109,78,0.25)] hover:bg-primary/90 active:scale-95 transition-all"
        >
          <Plus className="size-5" />
          {isAdmin ? 'Ajouter un cocktail au catalogue' : 'Créer un nouveau cocktail'}
        </Button>

        {/* Section header */}
        <div className="text-center">
          <h3 className="font-display font-bold text-3xl">
            <span className="text-foreground">{isAdmin ? 'Le ' : 'Mes '}</span>
            <span className="text-primary">{isAdmin ? 'Catalogue' : 'Créations'}</span>
          </h3>
          <p className="text-muted-foreground mt-2 font-medium">
            {isAdmin ? 'Gérez les cocktails visibles dans le catalogue.' : 'Vos mélanges personnalisés sauvegardés.'}
          </p>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-16 pb-8 pt-14">
          {MOCK_CUSTOM.map((c, idx) => (
            <div
              key={idx}
              className="rounded-[2.5rem] bg-card p-4 flex flex-col justify-end relative shadow-md group cursor-pointer transition-transform hover:-translate-y-3 border border-border/50"
              style={{ minHeight: '240px' }}
            >
              <div
                className="absolute -top-12 left-1/2 -translate-x-1/2 w-36 h-44 bg-cover bg-center rounded-2xl shadow-xl transition-transform duration-500 group-hover:scale-110"
                style={{ backgroundImage: c.img }}
              />
              <div className="relative z-10 text-center">
                <h4 className="font-display font-bold text-lg text-foreground">{c.name}</h4>
                <p className="text-xs text-muted-foreground mt-1 mb-3 font-medium flex items-center justify-center gap-1.5">
                  <Flame className="size-3.5 text-secondary" /> {c.desc}
                </p>
                <Button className="w-full h-10 rounded-full font-bold bg-primary/10 text-primary hover:bg-primary hover:text-white transition-colors text-sm">
                  Voir
                </Button>
              </div>
            </div>
          ))}
        </div>

        {/* Empty cta */}
        <div className="rounded-[2.5rem] border-2 border-dashed border-border/40 flex flex-col items-center justify-center py-16 gap-4 text-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all group">
          <div className="size-16 rounded-full bg-primary/5 group-hover:bg-primary/10 flex items-center justify-center transition-colors">
            <FlaskConical className="size-7 text-primary/50 group-hover:text-primary transition-colors" />
          </div>
          <p className="text-sm font-semibold text-foreground">Créer un nouveau mélange</p>
          <p className="text-xs text-muted-foreground max-w-[200px]">Sélectionnez vos fruits préférés et composez votre recette unique.</p>
        </div>

      </div>
    </div>
  );
};

Cocktails.metadata = {
  title: 'FYS — Cocktails',
  description: 'Gestion des cocktails FYS.',
};

export default Cocktails;
