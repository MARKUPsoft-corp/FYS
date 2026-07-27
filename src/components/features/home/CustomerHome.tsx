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
import { useState, useMemo } from 'react';
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
    <div className="min-h-dvh bg-background pb-4 overflow-x-clip relative">

      {/* 1. Massive Full Bleed Hero — SLIDER */}
      <div  className="lg:px-2">
        <HeroSlider />
      </div>

      {/* Content wrapper for things below hero */}
      <div className="px-3 md:px-4 space-y-12 mt-6 lg:mt-8 relative z-10">

        {/* Profile completion banner */}
        {!profileComplete && (
          <ProfileCompletionCard onStart={() => setShowOnboarding(true)} />
        )}

        {/* FYS Lab section - Clean Split Hero (Desktop) / Card Overlay (Mobile) */}
        <section  className="relative py-8 lg:py-20">
          
          {/* Section Title */}
          <div className="mb-8 lg:mb-12 text-center">
            <h3 className="font-display font-bold text-3xl md:text-4xl leading-none">
              <span className="text-foreground">FYS </span><span className="text-primary">Lab</span>
            </h3>
            <p className="text-muted-foreground mt-3 font-medium text-sm md:text-base">
              Composez votre cocktail sur-mesure, analysé par l'IA en temps réel.
            </p>
          </div>

          {/* MOBILE VERSION - Card with overlay */}
          <div className="lg:hidden relative w-full rounded-[2.5rem] overflow-hidden min-h-[480px] flex flex-col justify-center items-center shadow-xl">
            {/* Background image */}
            <div 
              className="absolute inset-0 bg-cover bg-center"
              style={{ 
                backgroundImage: "url('https://images.pexels.com/photos/338713/pexels-photo-338713.jpeg?auto=compress&cs=tinysrgb&w=1200')"
              }}
            />
            {/* Dark overlay for readability */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/60 to-black/50" />
            
            {/* Content overlay - centered */}
            <div className="relative z-10 p-6 w-full space-y-5 text-center">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20">
                <Beaker className="size-3.5 text-white" />
                <span className="text-white font-bold uppercase tracking-widest text-[10px]">Le FYS Lab</span>
              </div>

              {/* Title */}
              <h2 className="font-display font-extrabold text-4xl sm:text-5xl text-white leading-[1.15]">
                Créez votre propre <span className="bg-gradient-to-r from-primary via-[#90B566] to-secondary bg-clip-text text-transparent">cocktail</span>
              </h2>

              {/* Description */}
              <p className="text-white/90 text-base sm:text-lg leading-relaxed max-w-md mx-auto">
                Sélectionnez vos fruits et laissez <strong className="text-white font-bold">NutriFYS</strong> analyser la compatibilité en temps réel.
              </p>

              {/* Quick stats - 3 inline pills */}
              <div className="flex flex-wrap gap-2 justify-center">
                <div className="px-4 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20">
                  <span className="text-white text-sm font-bold">18+ Fruits</span>
                </div>
                <div className="px-4 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20">
                  <span className="text-white text-sm font-bold">Analyse IA</span>
                </div>
                <div className="px-4 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20">
                  <span className="text-white text-sm font-bold">2 min chrono</span>
                </div>
              </div>

              {/* CTA */}
              <div className="max-w-sm mx-auto">
                <Link to="/lab" className="block">
                  <Button
                    size="lg"
                    className="w-full rounded-[1.25rem] bg-primary text-white font-bold hover:bg-primary/90 active:scale-95 transition-all h-16 text-lg shadow-lg"
                  >
                    <Sparkles className="size-6" />
                    Tester le FYS Lab
                  </Button>
                </Link>
              </div>
            </div>
          </div>

          {/* DESKTOP VERSION - Two columns split */}
          <div className="hidden lg:grid lg:grid-cols-2 gap-20 items-center lg:min-h-[70vh]">
            
            {/* Left Column - Content */}
            <div className="space-y-8">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/5 border border-primary/10">
                <Beaker className="size-4 text-primary" />
                <span className="text-primary font-bold uppercase tracking-widest text-[11px]">Le FYS Lab</span>
              </div>

              {/* Title */}
              <h2 className="font-display font-extrabold text-5xl xl:text-7xl text-foreground leading-[1.1]">
                Créez votre{' '}
                <span className="bg-gradient-to-r from-primary via-[#90B566] to-secondary bg-clip-text text-transparent">cocktail</span>
              </h2>

              {/* Description */}
              <p className="text-muted-foreground text-lg xl:text-xl leading-relaxed max-w-xl">
                Devenez l'artisan de votre boisson. Sélectionnez vos fruits et laissez notre IA <strong className="text-foreground font-bold">NutriFYS</strong> analyser la compatibilité en temps réel.
              </p>

              {/* Stats */}
              <div className="flex flex-wrap items-center gap-6 pt-2">
                <div className="flex items-center gap-2">
                  <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-primary font-bold text-lg">18</span>
                  </div>
                  <span className="text-sm font-semibold text-muted-foreground">Fruits disponibles</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="size-10 rounded-full bg-secondary/10 flex items-center justify-center">
                    <Sparkles className="size-5 text-secondary" />
                  </div>
                  <span className="text-sm font-semibold text-muted-foreground">Analyse IA instantanée</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-primary font-bold text-lg">2</span>
                  </div>
                  <span className="text-sm font-semibold text-muted-foreground">Minutes chrono</span>
                </div>
              </div>

              {/* CTA */}
              <div className="pt-4">
                <Link to="/lab">
                  <Button
                    size="lg"
                    className="rounded-full bg-primary text-white font-bold hover:bg-primary/90 active:scale-95 transition-all px-12 h-16 text-lg shadow-[0_8px_30px_rgba(63,109,78,0.25)]"
                  >
                    <Sparkles className="size-6" />
                    Tester le FYS Lab
                  </Button>
                </Link>
              </div>
            </div>

            {/* Right Column - Image */}
            <div className="relative">
              <div 
                className="aspect-square w-full max-w-[500px] mx-auto rounded-[3rem] bg-cover bg-center shadow-2xl border-4 border-background ring-1 ring-border/20 transition-transform hover:scale-[1.02] duration-500"
                style={{ 
                  backgroundImage: "url('https://images.pexels.com/photos/338713/pexels-photo-338713.jpeg?auto=compress&cs=tinysrgb&w=1200')"
                }}
              />
              {/* Decorative elements */}
              <div className="absolute -z-10 top-8 right-8 w-72 h-72 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute -z-10 -bottom-8 -left-8 w-64 h-64 bg-secondary/5 rounded-full blur-3xl pointer-events-none" />
            </div>
          </div>

          {/* Scroll indicator - desktop only */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 hidden xl:flex flex-col items-center gap-2 text-muted-foreground animate-bounce">
            <span className="text-xs font-semibold uppercase tracking-widest">Découvrez plus</span>
            <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          </div>
        </section>

        <hr className="border-border/50" />

        {/* 2. NOS CREATIONS */}
        <section >
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
