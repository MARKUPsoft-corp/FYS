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
import { useState } from 'react';
import { useProfileStore, isProfileComplete } from '@/stores/profile';
import { ProfileCompletionCard } from '@/components/features/profile/ProfileCompletionCard';
import { ProfileFloatingButton } from '@/components/features/profile/ProfileFloatingButton';
import { OnboardingModal } from '@/components/features/onboarding/OnboardingModal';
import { useAuthStore } from '@/stores/auth';
import { getFruits } from '@/services/fruit';
import { useQuery } from '@tanstack/react-query';
import type { Fruit } from '@/entities';
import { HeroSlider } from '@/components/features/home/HeroSlider';

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



type Props = { name: string };

export function CustomerHome({ name }: Props) {
  const [selectedFruit, setSelectedFruit] = useState<Fruit | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const { user } = useAuthStore();
  const { profile, save: saveProfile } = useProfileStore();
  const profileComplete = isProfileComplete(profile);

  const { data: storeFruits = [] } = useQuery({
    queryKey: ['fruits'],
    queryFn: getFruits,
  });

  async function handleOnboardingComplete(data: {
    healthConditions: string[];
    allergies: string[];
    goals: string[];
  }) {
    if (!user) return;
    await saveProfile(user.uid, data);
    setShowOnboarding(false);
  }

  return (
    <div className="min-h-screen bg-background pb-20 overflow-x-hidden relative">

      {/* 1. Massive Full Bleed Hero — SLIDER */}
      <div className="lg:px-2">
        <HeroSlider />
      </div>

      {/* Content wrapper for things below hero */}
      <div className="px-3 md:px-4 space-y-12 mt-28 relative z-10">

        {/* Profile completion banner */}
        {!profileComplete && (
          <ProfileCompletionCard onStart={() => setShowOnboarding(true)} />
        )}

        {/* FYS Lab section */}
        <section>
          <div className="mb-8 block text-center">
            <h3 className="font-display font-bold text-3xl md:text-4xl leading-none">
              <span className="text-foreground">FYS </span><span className="text-primary">Lab</span>
            </h3>
            <p className="text-muted-foreground mt-3 font-medium">Composez votre cocktail sur-mesure, analysé par l'IA en temps réel.</p>
          </div>

          <div 
            className="relative w-full rounded-[3.5rem] overflow-hidden h-[450px] lg:h-[500px] flex items-end shadow-xl"
            style={{ backgroundImage: "url('https://images.pexels.com/photos/338713/pexels-photo-338713.jpeg?auto=compress&cs=tinysrgb&w=1200')", backgroundSize: 'cover', backgroundPosition: 'center' }}
          >
            {/* Cinematic Gradient overlay (Neutral dark gray fade from bottom to transparent) */}
            <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-gray-900/70 to-transparent" />
            
            <div className="relative z-10 w-full px-3 md:px-4 pb-12 md:pb-16 lg:px-16">
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

        {/* 3. INGREDIENTS PHARES (Fruits de saison) */}
        <section className="pb-10">
          <div className="mb-8 block text-center">
            <h3 className="font-display font-bold text-3xl md:text-4xl leading-none">
              <span className="text-foreground">Nos </span><span className="text-primary">Ingrédients</span>
            </h3>
            <p className="text-muted-foreground mt-3 font-medium">100% frais et de saison.</p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 pb-8">
            
            {storeFruits.map((fruit) => (
              <div 
                key={fruit.id} 
                onClick={() => setSelectedFruit(fruit)}
                className="bg-card w-full p-3 rounded-[2rem] border border-border/40 shadow-sm hover:shadow-md transition-shadow group flex flex-col items-center cursor-pointer"
              >
                 <div 
                   className="w-full aspect-square rounded-[1.5rem] shadow-inner mb-3 bg-cover bg-center transition-transform group-hover:scale-105 bg-muted"
                   style={{ backgroundImage: fruit.imageUrl ? `url('${fruit.imageUrl}')` : 'none' }}
                 />
                 <h5 className="font-bold text-sm text-foreground text-center line-clamp-1 w-full px-1">{fruit.name}</h5>
                 <p className="text-[11px] text-muted-foreground text-center line-clamp-1 w-full mt-0.5 px-1">{fruit.benefits?.[0] || 'Fruit Naturel'}</p>
                 
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

      {/* Floating profile button — only when profile incomplete */}
      {!profileComplete && (
        <ProfileFloatingButton onClick={() => setShowOnboarding(true)} />
      )}

      {/* Inline onboarding modal (triggered from card or floating button) */}
      <OnboardingModal
        open={showOnboarding}
        onSkip={() => setShowOnboarding(false)}
        onComplete={handleOnboardingComplete}
      />

      {/* Fruit Details Bottom Sheet / Drawer */}
      <Drawer open={!!selectedFruit} onOpenChange={(open) => !open && setSelectedFruit(null)}>
        <DrawerContent className="max-w-md mx-auto">
          {selectedFruit && (
            <div className="px-6 py-5 flex flex-col items-center overflow-y-auto max-h-[85vh] scrollbar-hide pt-8">
              <div 
                className="w-40 aspect-square rounded-[2rem] shadow-xl mb-4 bg-cover bg-center border-4 border-background -mt-20 z-10 bg-muted"
                style={{ backgroundImage: selectedFruit.imageUrl ? `url('${selectedFruit.imageUrl}')` : 'none' }}
              />
              <DrawerHeader className="pb-2 w-full">
                <DrawerTitle className="text-3xl font-display font-bold text-center text-foreground mt-2">
                  {selectedFruit.name}
                </DrawerTitle>
                <DrawerDescription className="text-center font-medium text-base mt-2 whitespace-pre-wrap">
                  {selectedFruit.benefits?.join(' • ') || 'Sélection 100% naturel pressée à froid.'}
                </DrawerDescription>
              </DrawerHeader>

              <div className="w-full mt-2 flex items-center justify-center gap-4 text-sm font-bold">
                <span className="bg-muted px-3 py-1 rounded-full text-muted-foreground text-xs uppercase tracking-widest">{selectedFruit.cocktailRole || 'BASE'}</span>
                <span className="bg-primary/10 text-primary px-3 py-1 rounded-full">{selectedFruit.nutrients?.macros?.calories_kcal || 50} kcal / 100g</span>
              </div>

              <div className="w-full mt-6 space-y-4 text-left mb-6">
                {selectedFruit.healthProfile?.benefitBadges && selectedFruit.healthProfile.benefitBadges.length > 0 && (
                  <div>
                    <h4 className="font-bold text-sm uppercase tracking-wider text-muted-foreground mb-2">Bienfaits (NutriFYS)</h4>
                    <ul className="flex flex-wrap gap-2">
                      {selectedFruit.healthProfile.benefitBadges.map((b, i) => (
                        <li key={i} className="text-[11px] bg-secondary/10 text-secondary font-bold px-2 py-1 rounded border border-secondary/20">
                          {b}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {selectedFruit.healthProfile?.nutritionistNote && (
                  <div className="pt-2">
                    <h4 className="font-bold text-sm uppercase tracking-wider text-muted-foreground mb-2">Conseil du Nutritionniste</h4>
                    <p className="text-sm font-medium leading-relaxed bg-primary/5 p-4 rounded-[1.5rem] border border-primary/10">
                      {selectedFruit.healthProfile.nutritionistNote}
                    </p>
                  </div>
                )}
                
                {selectedFruit.warnings && selectedFruit.warnings.length > 0 && (
                  <div className="pt-2">
                    <h4 className="font-bold text-sm uppercase tracking-wider text-muted-foreground mb-2">Allégations & Précautions</h4>
                    <ul className="flex flex-wrap gap-2">
                      {selectedFruit.warnings.map((w, i) => (
                        <li key={i} className="text-[11px] bg-amber-500/10 text-amber-600 font-semibold px-2 py-1 rounded border border-amber-500/20">
                          {w}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}
        </DrawerContent>
      </Drawer>
    </div>
  );
}
