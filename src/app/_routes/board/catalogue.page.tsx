import { PageComponent } from 'rasengan';
import { Flame, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';

const MOCK_COCKTAILS = [
  { name: 'Glow Up', desc: '+25% Vitamine C', badge: 'Nouveau', badgeColor: 'bg-secondary', img: "url('https://images.pexels.com/photos/109275/pexels-photo-109275.jpeg?auto=compress&cs=tinysrgb&w=800')" },
  { name: 'Detox Green', desc: 'Pomme, Céleri, Gingembre', badge: null, badgeColor: '', img: "url('https://images.pexels.com/photos/1337825/pexels-photo-1337825.jpeg?auto=compress&cs=tinysrgb&w=800')" },
  { name: 'Tropical Bliss', desc: 'Mangue, Ananas, Coco', badge: 'Été', badgeColor: 'bg-amber-500', img: "url('https://images.pexels.com/photos/1099680/pexels-photo-1099680.jpeg?auto=compress&cs=tinysrgb&w=800')" },
  { name: 'Sun Berry', desc: 'Fraise, Framboise, Menthe', badge: 'Populaire', badgeColor: 'bg-rose-500', img: "url('https://images.pexels.com/photos/1132047/pexels-photo-1132047.jpeg?auto=compress&cs=tinysrgb&w=800')" },
  { name: 'Power Shot', desc: 'Citron, Gingembre, Curcuma', badge: 'Boost', badgeColor: 'bg-orange-500', img: "url('https://images.pexels.com/photos/2090902/pexels-photo-2090902.jpeg?auto=compress&cs=tinysrgb&w=800')" },
  { name: 'Minty Fresh', desc: 'Concombre, Menthe, Citron vert', badge: null, badgeColor: '', img: "url('https://images.pexels.com/photos/1638280/pexels-photo-1638280.jpeg?auto=compress&cs=tinysrgb&w=800')" },
  { name: 'Sunrise Blend', desc: 'Carotte, Orange, Gingembre', badge: null, badgeColor: '', img: "url('https://images.pexels.com/photos/1000084/pexels-photo-1000084.jpeg?auto=compress&cs=tinysrgb&w=800')" },
  { name: 'Berry Power', desc: 'Myrtille, Açaï, Banane', badge: 'Top', badgeColor: 'bg-violet-500', img: "url('https://images.pexels.com/photos/1153655/pexels-photo-1153655.jpeg?auto=compress&cs=tinysrgb&w=800')" },
];

const Catalogue: PageComponent = () => {
  return (
    <div className="min-h-screen bg-background pb-20">

      {/* Hero Banner */}
      <div
        className="relative w-full h-[220px] flex items-end px-6 pb-8 mb-12 overflow-hidden"
        style={{ backgroundImage: "url('https://images.pexels.com/photos/1337825/pexels-photo-1337825.jpeg?auto=compress&cs=tinysrgb&w=1200')", backgroundSize: 'cover', backgroundPosition: 'center top' }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
        <div className="relative z-10">
          <p className="text-white/70 text-xs font-bold uppercase tracking-[0.2em] mb-1">Nos créations</p>
          <h1 className="font-display font-extrabold text-4xl text-white">
            Le <span className="text-secondary italic">Catalogue</span>
          </h1>
        </div>
      </div>

      <div className="px-4 space-y-10">

        {/* Search bar */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Rechercher un cocktail..."
            className="w-full h-14 pl-12 pr-4 rounded-[2rem] bg-card border border-border/60 text-foreground placeholder:text-muted-foreground font-medium text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition-shadow"
          />
        </div>

        {/* Section title */}
        <div className="text-center">
          <h3 className="font-display font-bold text-3xl">
            <span className="text-foreground">Nos </span>
            <span className="text-primary">Créations</span>
          </h3>
          <p className="text-muted-foreground mt-2 font-medium">Inspirées par la nature, validées par vos papilles.</p>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-16 pb-8 pt-14">
          {MOCK_COCKTAILS.map((c, idx) => (
            <div
              key={idx}
              className="rounded-[2.5rem] bg-card p-4 flex flex-col justify-end relative shadow-md group cursor-pointer transition-transform hover:-translate-y-3 border border-border/50"
              style={{ minHeight: '260px' }}
            >
              <div
                className="absolute -top-12 left-1/2 -translate-x-1/2 w-36 h-44 bg-cover bg-center rounded-2xl shadow-xl transition-transform duration-500 group-hover:scale-110 bg-white/10"
                style={{ backgroundImage: c.img }}
              />
              {c.badge && (
                <div className={`absolute top-4 left-4 ${c.badgeColor} text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full shadow-md z-10`}>
                  {c.badge}
                </div>
              )}
              <div className="relative z-10 text-center">
                <h4 className="font-display font-bold text-lg text-foreground">{c.name}</h4>
                <p className="text-xs text-muted-foreground mt-1 mb-3 font-medium flex items-center justify-center gap-1.5">
                  <Flame className="size-3.5 text-secondary" /> {c.desc}
                </p>
                <Button className="w-full h-10 rounded-full font-bold bg-primary/10 text-primary hover:bg-primary hover:text-white transition-colors text-sm">
                  Voir la recette
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

Catalogue.metadata = {
  title: 'FYS — Catalogue',
  description: 'Catalogue de cocktails FYS.',
};

export default Catalogue;
