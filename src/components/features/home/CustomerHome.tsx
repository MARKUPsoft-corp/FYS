import { Link } from 'rasengan';
import { Flame, Plus, Sparkles, Beaker } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { useState, useEffect } from 'react';

const SLIDES = [
  {
    bg: "url('https://images.pexels.com/photos/158053/fresh-orange-juice-squeezed-refreshing-citrus-158053.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1')",
    label: 'Notre signature',
    title: 'Créez votre',
    highlight: 'élixir',
    titleEnd: 'de vie.',
    cta: 'Composer un jus',
    ctaLink: '/cocktails',
    breakout: "url('https://images.pexels.com/photos/338713/pexels-photo-338713.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1')",
  },
  {
    bg: "url('https://images.pexels.com/photos/1337825/pexels-photo-1337825.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1')",
    label: 'Fruits frais du jour',
    title: 'Boost ton',
    highlight: 'énergie',
    titleEnd: 'dès maintenant.',
    cta: 'Voir le catalogue',
    ctaLink: '/catalogue',
    breakout: "url('https://images.pexels.com/photos/42059/citrus-diet-food-fresh-42059.jpeg?auto=compress&cs=tinysrgb&w=600')",
  },
  {
    bg: "url('https://images.pexels.com/photos/109275/pexels-photo-109275.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1')",
    label: 'NutriFYS actif',
    title: 'Prends soin de',
    highlight: 'toi',
    titleEnd: 'chaque jour.',
    cta: 'Mon profil santé',
    ctaLink: '/profile',
    breakout: "url('https://images.pexels.com/photos/1603901/pexels-photo-1603901.jpeg?auto=compress&cs=tinysrgb&w=600')",
  },
];

const CREATIONS = [
  {
    name: 'Glow Up',
    description: '+25% Vitamine C',
    badge: 'Nouveau',
    badgeColor: 'bg-secondary',
    shadowColor: 'shadow-[0_20px_40px_rgba(242,105,74,0.15)]',
    btnClass: 'bg-secondary/10 text-secondary hover:bg-secondary hover:text-white',
    rotation: 'group-hover:rotate-3',
    img: "url('https://images.pexels.com/photos/109275/pexels-photo-109275.jpeg?auto=compress&cs=tinysrgb&w=800')",
  },
  {
    name: 'Detox Green',
    description: 'Pomme, Céleri, Gingembre',
    badge: null,
    badgeColor: '',
    shadowColor: 'shadow-[0_20px_40px_rgba(63,109,78,0.15)]',
    btnClass: 'bg-primary/10 text-primary hover:bg-primary hover:text-white',
    rotation: 'group-hover:-rotate-3',
    img: "url('https://images.pexels.com/photos/1337825/pexels-photo-1337825.jpeg?auto=compress&cs=tinysrgb&w=800')",
  },
  {
    name: 'Tropical Bliss',
    description: 'Mangue, Ananas, Coco',
    badge: 'Été',
    badgeColor: 'bg-amber-500',
    shadowColor: 'shadow-[0_20px_40px_rgba(251,191,36,0.15)]',
    btnClass: 'bg-amber-500/10 text-amber-600 hover:bg-amber-500 hover:text-white',
    rotation: 'group-hover:rotate-3',
    img: "url('https://images.pexels.com/photos/1099680/pexels-photo-1099680.jpeg?auto=compress&cs=tinysrgb&w=800')",
  },
  {
    name: 'Sun Berry',
    description: 'Fraise, Framboise, Menthe',
    badge: 'Populaire',
    badgeColor: 'bg-rose-500',
    shadowColor: 'shadow-[0_20px_40px_rgba(239,68,68,0.15)]',
    btnClass: 'bg-rose-500/10 text-rose-600 hover:bg-rose-500 hover:text-white',
    rotation: 'group-hover:-rotate-3',
    img: "url('https://images.pexels.com/photos/1132047/pexels-photo-1132047.jpeg?auto=compress&cs=tinysrgb&w=800')",
  },
  {
    name: 'Power Shot',
    description: 'Citron, Gingembre, Curcuma',
    badge: 'Boost',
    badgeColor: 'bg-orange-500',
    shadowColor: 'shadow-[0_20px_40px_rgba(249,115,22,0.15)]',
    btnClass: 'bg-orange-500/10 text-orange-600 hover:bg-orange-500 hover:text-white',
    rotation: 'group-hover:rotate-2',
    img: "url('https://images.pexels.com/photos/2090902/pexels-photo-2090902.jpeg?auto=compress&cs=tinysrgb&w=800')",
  },
  {
    name: 'Minty Fresh',
    description: 'Concombre, Menthe, Citron vert',
    badge: null,
    badgeColor: '',
    shadowColor: 'shadow-[0_20px_40px_rgba(20,184,166,0.15)]',
    btnClass: 'bg-teal-500/10 text-teal-600 hover:bg-teal-500 hover:text-white',
    rotation: 'group-hover:-rotate-2',
    img: "url('https://images.pexels.com/photos/1638280/pexels-photo-1638280.jpeg?auto=compress&cs=tinysrgb&w=800')",
  },
];

const FRUITS = [
  { name: 'Orange Sanguine', desc: 'Riche en Vitamine C', img: 'https://images.pexels.com/photos/42059/citrus-diet-food-fresh-42059.jpeg?auto=compress&cs=tinysrgb&w=600' },
  { name: 'Grenade Juteuse', desc: 'Antioxydants +++', img: 'https://images.pexels.com/photos/1611078/pexels-photo-1611078.jpeg?auto=compress&cs=tinysrgb&w=600' },
  { name: 'Fraise des bois', desc: 'Gourmandise pure', img: 'https://images.pexels.com/photos/1132047/pexels-photo-1132047.jpeg?auto=compress&cs=tinysrgb&w=600' },
  { name: 'Citron Vert', desc: 'Détoxifiant', img: 'https://images.pexels.com/photos/2090902/pexels-photo-2090902.jpeg?auto=compress&cs=tinysrgb&w=600' },
  { name: 'Kiwi Zespri', desc: 'Fibre & Énergie', img: 'https://images.pexels.com/photos/51312/kiwi-fruit-vitamins-healthy-eating-51312.jpeg?auto=compress&cs=tinysrgb&w=600' },
  { name: 'Ananas Victoria', desc: 'Brûle-graisses', img: 'https://images.pexels.com/photos/461754/pexels-photo-461754.jpeg?auto=compress&cs=tinysrgb&w=600' },
  { name: 'Mangue', desc: 'Douceur dorée', img: 'https://images.pexels.com/photos/2294471/pexels-photo-2294471.jpeg?auto=compress&cs=tinysrgb&w=600' },
  { name: 'Pomme Granny', desc: 'Acidulée & Fraîche', img: 'https://images.pexels.com/photos/103566/pexels-photo-103566.jpeg?auto=compress&cs=tinysrgb&w=600' },
  { name: 'Myrtille', desc: 'Super-fruit', img: 'https://images.pexels.com/photos/1153655/pexels-photo-1153655.jpeg?auto=compress&cs=tinysrgb&w=600' },
  { name: 'Framboise', desc: 'Délicatesse', img: 'https://images.pexels.com/photos/60021/raspberry-fruit-berries-healthy-60021.jpeg?auto=compress&cs=tinysrgb&w=600' },
  { name: 'Pamplemousse', desc: 'Tonique matinal', img: 'https://images.pexels.com/photos/161559/grapefruit-citrus-fresh-fruit-161559.jpeg?auto=compress&cs=tinysrgb&w=600' },
  { name: 'Melon Charentais', desc: 'Gorgé de soleil', img: 'https://images.pexels.com/photos/1314550/pexels-photo-1314550.jpeg?auto=compress&cs=tinysrgb&w=600' },
  { name: 'Pastèque', desc: 'Désaltérante', img: 'https://images.pexels.com/photos/1314550/pexels-photo-1314550.jpeg?auto=compress&cs=tinysrgb&w=600' }, 
  { name: 'Pêche Plate', desc: 'Jus exquis', img: 'https://images.pexels.com/photos/592055/pexels-photo-592055.jpeg?auto=compress&cs=tinysrgb&w=600' },
  { name: 'Banane', desc: 'Texture crémeuse', img: 'https://images.pexels.com/photos/2872755/pexels-photo-2872755.jpeg?auto=compress&cs=tinysrgb&w=600' },
  { name: 'Cerise Burlat', desc: 'Ronde & Suave', img: 'https://images.pexels.com/photos/109274/pexels-photo-109274.jpeg?auto=compress&cs=tinysrgb&w=600' },
  { name: 'Gingembre', desc: 'Coup de fouet', img: 'https://images.pexels.com/photos/10543240/pexels-photo-10543240.jpeg?auto=compress&cs=tinysrgb&w=600' },
  { name: 'Carotte', desc: 'Bonne mine', img: 'https://images.pexels.com/photos/143133/pexels-photo-143133.jpeg?auto=compress&cs=tinysrgb&w=600' },
];

type Props = { name: string };

function HeroSlider() {
  const [active, setActive] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setActive(p => (p + 1) % SLIDES.length), 4000);
    return () => clearInterval(t);
  }, []);
  const slide = SLIDES[active];
  return (
    <section className="relative z-0 w-full h-[420px] rounded-b-[3rem] shadow-[0_20px_50px_rgba(63,109,78,0.25)]">
      {/* Isolated Background Layer */}
      <div
        key={active}
        className="absolute inset-0 bg-cover bg-center overflow-hidden rounded-b-[3rem] transition-all duration-700"
        style={{ backgroundImage: slide.bg }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-black/80 via-black/50 to-black/20" />
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-primary/40 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Text Area */}
      <div className="relative z-30 flex flex-col h-[420px] justify-center px-4">
        <p className="text-white/80 text-xs mb-2 font-bold uppercase tracking-[0.2em] drop-shadow-md">
          {slide.label}
        </p>
        <h1 className="font-display font-extrabold text-5xl md:text-6xl text-white leading-[1.05] mb-2 drop-shadow-lg">
          {slide.title}
        </h1>
        <h1 className="font-display font-extrabold text-5xl md:text-6xl leading-[1.05] mb-6 drop-shadow-lg">
          <span className="text-secondary italic">{slide.highlight}</span>{' '}
          <span className="text-white">{slide.titleEnd}</span>
        </h1>

        <Button
          asChild
          size="lg"
          className="w-max rounded-full bg-white text-primary hover:bg-stone-50 hover:scale-105 active:scale-95 transition-transform shadow-[0_8px_30px_rgba(255,255,255,0.25)] font-bold px-8 h-12"
        >
          <Link to={slide.ctaLink}>{slide.cta}</Link>
        </Button>

        {/* Dot indicators */}
        <div className="flex gap-2 mt-8">
          {SLIDES.map((_, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === active ? 'w-6 bg-white' : 'w-1.5 bg-white/40'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Breakout Image (overflows below) */}
      <div className="absolute -bottom-12 -right-2 w-44 h-60 z-20 pointer-events-none drop-shadow-2xl opacity-95 md:w-64 md:h-96 md:-right-4 md:-bottom-20">
        <div
          key={`breakout-${active}`}
          className="w-full h-full bg-cover bg-center rounded-[2rem] border-4 border-white/40 shadow-2xl rotate-[-8deg] transition-all duration-700"
          style={{ backgroundImage: slide.breakout }}
        />
      </div>
    </section>
  );
}

export function CustomerHome({ name }: Props) {
  const [selectedFruit, setSelectedFruit] = useState<typeof FRUITS[0] | null>(null);

  return (
    <div className="min-h-screen bg-background pb-20 overflow-x-hidden relative">

      {/* 1. Massive Full Bleed Hero — SLIDER */}
      <div className="lg:px-2">
        <HeroSlider />
      </div>

      {/* Content wrapper for things below hero */}
      <div className="px-2 space-y-10 mt-28 relative z-10">
        
        {/* 2. NOS CREATIONS */}
        <section>
          <div className="mb-10 block text-center">
            <h3 className="font-display font-bold text-3xl md:text-4xl leading-none">
              <span className="text-foreground">Nos </span><span className="text-primary">Créations</span>
            </h3>
            <p className="text-muted-foreground mt-3 font-medium">Inspirées par la nature, validées par vos papilles.</p>
          </div>

          <div className="flex gap-8 overflow-x-auto pb-8 pt-14 snap-x snap-mandatory scrollbar-hide -mx-4 px-4">
            {CREATIONS.map((c, idx) => (
              <div
                key={idx}
                className={`snap-center shrink-0 w-[240px] h-[320px] rounded-[2.5rem] bg-card p-5 flex flex-col justify-end relative ${c.shadowColor} group cursor-pointer transition-transform hover:-translate-y-3 border border-border/50`}
              >
                {/* Floating Image breaking out of the top */}
                <div
                  className={`absolute -top-12 left-1/2 -translate-x-1/2 w-44 h-52 bg-cover bg-center rounded-2xl shadow-xl transition-transform duration-500 group-hover:scale-110 ${c.rotation} bg-white/10`}
                  style={{ backgroundImage: c.img }}
                />
                {c.badge && (
                  <div className={`absolute top-4 left-4 ${c.badgeColor} text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full shadow-md z-10`}>
                    {c.badge}
                  </div>
                )}
                <div className="relative z-10 text-center">
                  <h4 className="font-display font-bold text-xl text-foreground">{c.name}</h4>
                  <p className="text-sm text-muted-foreground mt-1 mb-4 font-medium flex items-center justify-center gap-1.5">
                    <Flame className="size-4 text-secondary" /> {c.description}
                  </p>
                  <Button className={`w-full h-11 rounded-full font-bold transition-colors ${c.btnClass}`}>
                    Voir la recette
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <hr className="border-border/50" />

        {/* BANNER: FYS Lab (Core Product) - HERO STYLE */}
        <section>
          <div 
            className="relative w-full rounded-[3.5rem] overflow-hidden h-[450px] lg:h-[500px] flex items-end shadow-xl"
            style={{ backgroundImage: "url('https://images.pexels.com/photos/338713/pexels-photo-338713.jpeg?auto=compress&cs=tinysrgb&w=1200')", backgroundSize: 'cover', backgroundPosition: 'center' }}
          >
            {/* Cinematic Gradient overlay (Neutral dark gray fade from bottom to transparent) */}
            <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-gray-900/70 to-transparent" />
            
            <div className="relative z-10 w-full px-8 pb-12 md:pb-16 lg:px-16">
              <div className="max-w-xl">
                <div className="flex items-center gap-2 mb-4">
                   <div className="size-8 rounded-full bg-secondary/20 flex items-center justify-center">
                     <Beaker className="size-4 text-secondary drop-shadow-md" />
                   </div>
                   <p className="text-secondary font-bold uppercase tracking-widest text-xs drop-shadow-md">Le FYS Lab</p>
                </div>
                <h3 className="font-display font-extrabold text-4xl lg:text-5xl text-white leading-[1.15] mb-5">
                  Créez votre propre <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-[#AECBB2] to-secondary italic drop-shadow-md">cocktail.</span>
                </h3>
                <p className="text-white/80 text-[17px] mb-8 font-medium leading-relaxed">
                  Devenez l'artisan de votre boisson. Sélectionnez vos fruits et laissez notre IA <strong className="text-white font-bold">NutriFYS</strong> vérifier la compatibilité de la recette en temps réel.
                </p>
                <div className="flex flex-col sm:flex-row items-center gap-4">
                  <Link to="/lab" className="w-full sm:w-auto">
                    <Button
                      size="lg"
                      className="w-full rounded-full bg-primary text-white font-bold hover:bg-primary/90 hover:scale-105 active:scale-95 transition-all px-10 h-14 shadow-[0_8px_30px_rgba(63,109,78,0.3)] text-base gap-3"
                    >
                      <Sparkles className="size-5" />
                      Tester le FYS Lab
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        <hr className="border-border/50" />

        {/* 3. INGREDIENTS PHARES (Fruits de saison) */}
        <section className="pb-10">
          <div className="mb-8 block text-center">
            <h3 className="font-display font-bold text-3xl md:text-4xl leading-none">
              <span className="text-foreground">Nos </span><span className="text-primary">Ingrédients</span>
            </h3>
            <p className="text-muted-foreground mt-3 font-medium">100% frais et de saison.</p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 pb-8">
            
            {FRUITS.map((fruit, idx) => (
              <div 
                key={idx} 
                onClick={() => setSelectedFruit(fruit)}
                className="bg-card w-full p-3 rounded-[2rem] border border-border/40 shadow-sm hover:shadow-md transition-shadow group flex flex-col items-center cursor-pointer"
              >
                 <div 
                   className="w-full aspect-square rounded-[1.5rem] shadow-inner mb-3 bg-cover bg-center transition-transform group-hover:scale-105"
                   style={{ backgroundImage: `url('${fruit.img}')` }}
                 />
                 <h5 className="font-bold text-sm text-foreground text-center line-clamp-1 w-full px-1">{fruit.name}</h5>
                 <p className="text-[11px] text-muted-foreground text-center line-clamp-1 w-full mt-0.5 px-1">{fruit.desc}</p>
                 
                 <Button 
                   variant="ghost" 
                   size="icon" 
                   className="h-8 w-8 rounded-full mt-3 bg-primary/5 text-primary group-hover:bg-primary group-hover:text-white transition-colors"
                 >
                    <Plus className="size-4" />
                 </Button>
              </div>
            ))}

          </div>
        </section>

      </div>

      {/* Fruit Details Bottom Sheet / Drawer */}
      <Drawer open={!!selectedFruit} onOpenChange={(open) => !open && setSelectedFruit(null)}>
        <DrawerContent className="max-w-md mx-auto">
          {selectedFruit && (
            <div className="px-6 py-4 flex flex-col items-center">
              <div 
                className="w-40 aspect-square rounded-[2rem] shadow-xl mb-4 bg-cover bg-center border-4 border-background -mt-16 z-10"
                style={{ backgroundImage: `url('${selectedFruit.img}')` }}
              />
              <DrawerHeader className="pb-2 w-full">
                <DrawerTitle className="text-3xl font-display font-bold text-center text-foreground">
                  {selectedFruit.name}
                </DrawerTitle>
                <DrawerDescription className="text-center font-medium text-base mt-2">
                  {selectedFruit.desc}
                </DrawerDescription>
              </DrawerHeader>
              <div className="w-full mt-4 space-y-4">
                <p className="bg-primary/5 p-4 rounded-[1.5rem] text-sm text-center text-foreground font-medium border border-primary/10">
                  100% Naturel, pressé à froid pour préserver un maximum de nutriments et de vitamines essentiels.
                </p>
                <div className="flex gap-3">
                  <Button 
                    className="w-full rounded-full font-bold h-14 bg-secondary text-white hover:bg-secondary/90 text-base" 
                    size="lg" 
                  >
                    Ajouter au panier
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DrawerContent>
      </Drawer>
    </div>
  );
}
