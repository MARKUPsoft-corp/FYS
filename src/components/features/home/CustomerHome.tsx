import { useTranslation } from 'react-i18next';
import { Link } from 'rasengan';
import { Plus, Sparkles, Beaker } from 'lucide-react';
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
import { isUsableFruit, type Fruit } from '@/entities';
import { HeroSlider } from '@/components/features/home/HeroSlider';

type Props = Record<string, never>;

export function CustomerHome(_props: Props) {
  const { t } = useTranslation();
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

        {/* Profile completion banner — uniquement pour les utilisateurs connectés */}
        {!profileComplete && user && (
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
              {t('home.customer.labDescription')}
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
                <span className="text-white font-bold uppercase tracking-widest text-[10px]">{t('home.customer.labTitle')}</span>
              </div>

              {/* Title */}
              <h2 className="font-display font-extrabold text-4xl sm:text-5xl text-white leading-[1.15]">
                {t('home.customer.featureTitle')} <span className="bg-gradient-to-r from-primary via-[#90B566] to-secondary bg-clip-text text-transparent">cocktail</span>
              </h2>

              {/* Description */}
              <p className="text-white/90 text-base sm:text-lg leading-relaxed max-w-md mx-auto">
                {t('home.customer.featureSubtitle')}
              </p>

              {/* Quick stats - 3 inline pills */}
              <div className="flex flex-wrap gap-2 justify-center">
                <div className="px-4 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20">
                  <span className="text-white text-sm font-bold">{t('home.customer.labStatsFruitsShort', { count: 18 })}</span>
                </div>
                <div className="px-4 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20">
                  <span className="text-white text-sm font-bold">{t('home.customer.featureAIAnalysis')}</span>
                </div>
                <div className="px-4 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20">
                  <span className="text-white text-sm font-bold">{t('home.customer.labStatsTimeShort', { count: 2 })}</span>
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
                    {t('home.customer.labCta')}
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
                <span className="text-primary font-bold uppercase tracking-widest text-[11px]">{t('home.customer.labTitle')}</span>
              </div>

              {/* Title */}
              <h2 className="font-display font-extrabold text-5xl xl:text-7xl text-foreground leading-[1.1]">
                {t('home.customer.featureTitle')}{' '}
                <span className="bg-gradient-to-r from-primary via-[#90B566] to-secondary bg-clip-text text-transparent">cocktail</span>
              </h2>

              {/* Description */}
              <p className="text-muted-foreground text-lg xl:text-xl leading-relaxed max-w-xl">
                {t('home.customer.featureSubtitle')}
              </p>

              {/* Stats */}
              <div className="flex flex-wrap items-center gap-6 pt-2">
                <div className="flex items-center gap-2">
                  <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-primary font-bold text-lg">18</span>
                  </div>
                  <span className="text-sm font-semibold text-muted-foreground">{t('home.customer.labStatsFruits')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="size-10 rounded-full bg-secondary/10 flex items-center justify-center">
                    <Sparkles className="size-5 text-secondary" />
                  </div>
                  <span className="text-sm font-semibold text-muted-foreground">{t('home.customer.featureAIAnalysis')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-primary font-bold text-lg">2</span>
                  </div>
                  <span className="text-sm font-semibold text-muted-foreground">{t('home.customer.labStatsTime')}</span>
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
                    {t('home.customer.labCta')}
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
            <span className="text-xs font-semibold uppercase tracking-widest">{t('home.customer.discoverMore')}</span>
            <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          </div>
        </section>

        {/* INGREDIENTS PHARES (Fruits de saison) */}
        <section className="pb-10">
          <div className="mb-8 block text-center">
            <h3 className="font-display font-bold text-3xl md:text-4xl leading-none">
              <span className="text-foreground">{t('home.customer.ingredientsTitlePre')}</span><span className="text-primary">{t('home.customer.ingredientsTitleHighlight')}</span>
            </h3>
            <p className="text-muted-foreground mt-3 font-medium">{t('home.customer.ingredientsSubtitle')}</p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 pb-8">
            
            {storeFruits.filter(isUsableFruit).map((fruit) => (
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

      {/* Floating profile button — only when profile incomplete (connecté) */}
      {!profileComplete && user && (
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
        <DrawerContent className="max-w-md mx-auto bg-background/70 backdrop-blur-[48px] saturate-[180%] border border-white/40 dark:border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.15)]">
          {selectedFruit && (
            <div className="overflow-y-auto max-h-[85vh] scrollbar-hide">
              {/* Image + Name row */}
              <div className="flex gap-5 pt-8 px-6 pb-4">
                <div
                  className="size-44 shrink-0 rounded-2xl shadow-lg bg-cover bg-center bg-muted border border-border/40"
                  style={{ backgroundImage: selectedFruit.imageUrl ? `url('${selectedFruit.imageUrl}')` : 'none' }}
                />
                <div className="flex flex-col justify-center min-w-0">
                  <span className="text-[11px] font-bold uppercase tracking-widest text-primary mb-1">
                    {selectedFruit.cocktailRole || 'BASE'}
                  </span>
                  <h2 className="font-display font-bold text-2xl text-foreground leading-tight">
                    {selectedFruit.name}
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1 font-medium">
                    {selectedFruit.nutrients?.macros?.calories_kcal || 50} kcal / 100g
                  </p>
                </div>
              </div>

              <div className="px-6 pb-6 space-y-5">
                {selectedFruit.healthProfile?.benefitBadges && selectedFruit.healthProfile.benefitBadges.length > 0 && (
                  <div>
                    <h4 className="font-bold text-xs uppercase tracking-wider text-muted-foreground mb-2.5 flex items-center gap-1.5">
                      <span className="size-1.5 rounded-full bg-secondary" />
                      {t('nutrition.targetedBenefits')}
                    </h4>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedFruit.healthProfile.benefitBadges.map((b, i) => (
                        <span key={i} className="text-[11px] bg-secondary/10 text-secondary font-bold px-2.5 py-1 rounded-lg border border-secondary/20">
                          {b}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Nutrition quick stats */}
                {selectedFruit.nutrients && (
                  <div>
                    <h4 className="font-bold text-xs uppercase tracking-wider text-muted-foreground mb-2.5 flex items-center gap-1.5">
                      <span className="size-1.5 rounded-full bg-primary" />
                      {t('nutrition.profileLabel')}
                    </h4>
                    <div className="grid grid-cols-3 gap-2">
                      {selectedFruit.nutrients.macros && (
                        <>
                          {selectedFruit.nutrients.macros.proteines_g && (
                            <div className="bg-muted/50 rounded-xl p-2.5 text-center">
                              <p className="text-sm font-bold text-foreground">{selectedFruit.nutrients.macros.proteines_g}g</p>
                              <p className="text-[9px] text-muted-foreground font-medium uppercase tracking-wider">Prots</p>
                            </div>
                          )}
                          {selectedFruit.nutrients.macros.glucides_g && (
                            <div className="bg-muted/50 rounded-xl p-2.5 text-center">
                              <p className="text-sm font-bold text-foreground">{selectedFruit.nutrients.macros.glucides_g}g</p>
                              <p className="text-[9px] text-muted-foreground font-medium uppercase tracking-wider">Gluc</p>
                            </div>
                          )}
                          {selectedFruit.nutrients.macros.lipides_g && (
                            <div className="bg-muted/50 rounded-xl p-2.5 text-center">
                              <p className="text-sm font-bold text-foreground">{selectedFruit.nutrients.macros.lipides_g}g</p>
                              <p className="text-[9px] text-muted-foreground font-medium uppercase tracking-wider">Lip</p>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                )}
                
                {selectedFruit.healthProfile?.nutritionistNote && (
                  <div>
                    <h4 className="font-bold text-xs uppercase tracking-wider text-muted-foreground mb-2.5 flex items-center gap-1.5">
                      <span className="size-1.5 rounded-full bg-amber-500" />
                      Conseil du Nutritionniste
                    </h4>
                    <p className="text-sm font-medium leading-relaxed bg-primary/5 p-4 rounded-2xl border border-primary/10">
                      {selectedFruit.healthProfile.nutritionistNote}
                    </p>
                  </div>
                )}
                
                {selectedFruit.warnings && selectedFruit.warnings.length > 0 && (
                  <div>
                    <h4 className="font-bold text-xs uppercase tracking-wider text-muted-foreground mb-2.5 flex items-center gap-1.5">
                      <span className="size-1.5 rounded-full bg-amber-500" />
                      {t('home.customer.claimsTitle')}
                    </h4>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedFruit.warnings.map((w, i) => (
                        <span key={i} className="text-[11px] bg-amber-500/10 text-amber-600 font-semibold px-2.5 py-1 rounded-lg border border-amber-500/20">
                          {w}
                        </span>
                      ))}
                    </div>
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
