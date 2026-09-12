import React, { useState } from 'react';
import { useNavigate } from 'rasengan';
import {
  Sparkles,
  Calendar,
  Clock,
  CheckCircle2,
  Leaf,
  Droplets,
  Flame,
  Shield,
  HeartPulse,
  Sun,
  Coffee,
  Check,
  Award,
  AlertTriangle,
  ShoppingBag,
  ArrowRight,
  ChevronRight,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  type UserProgram,
  type ProgramDayItem,
  PROGRAM_TIMING_LABELS,
  type ProgramTiming,
} from '@/entities';

interface Props {
  userProgram: UserProgram;
  onCheckin: (dayNumber: number, notes?: string) => Promise<void>;
  onCancel: () => Promise<void>;
  isCheckingIn?: boolean;
  isCancelling?: boolean;
}

const TIMING_ICONS: Record<string, any> = {
  morning_empty_stomach: Sun,
  morning: Coffee,
  afternoon: Flame,
  evening: Clock,
};

const FALLBACK_IMAGE = 'https://images.pexels.com/photos/1337825/pexels-photo-1337825.jpeg?auto=compress&cs=tinysrgb&w=1200';

export function ActiveProgramCoach({
  userProgram,
  onCheckin,
  onCancel,
  isCheckingIn = false,
  isCancelling = false,
}: Props) {
  const navigate = useNavigate();
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [selectedDayView, setSelectedDayView] = useState<number | null>(null);

  const totalDays = userProgram.durationDays;
  const completedCheckins = userProgram.checkins || [];
  const completedDayNumbers = new Set(
    completedCheckins.map((c) => c.dayNumber || c.day)
  );
  const completedCount = completedDayNumbers.size;
  const percentComplete = Math.min(100, Math.round((completedCount / totalDays) * 100));

  // Determine current active day based on startDate
  const now = new Date();
  const start = new Date(userProgram.startDate);
  const diffDays = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  const calculatedDay = Math.max(1, Math.min(totalDays, diffDays + 1));
  const activeDay = Math.min(totalDays, Math.max(userProgram.currentDay || 1, calculatedDay));

  // Active or selected day for inspection
  const displayedDayNum = selectedDayView ?? activeDay;
  const todayItem: ProgramDayItem | undefined =
    userProgram.programSnapshot.days.find(
      (d) => (d.dayNumber || d.day) === displayedDayNum
    ) || userProgram.programSnapshot.days[0];

  const isDisplayedDayChecked = completedDayNumbers.has(displayedDayNum);
  const isProgramCompleted = userProgram.status === 'completed' || completedCount >= totalDays;

  const TimingIcon = todayItem ? TIMING_ICONS[todayItem.timing] || Clock : Clock;
  const timingLabel = todayItem
    ? todayItem.timingLabel || PROGRAM_TIMING_LABELS[todayItem.timing] || 'Au réveil'
    : '';

  const handleOrderJuice = (day: ProgramDayItem) => {
    const fruits = day.fruitNames || day.fruits || [];
    const prompt = `Je suis le programme ${userProgram.programTitle}, jour ${day.dayNumber || day.day}. Prépare-moi la recette "${day.cocktailName || day.juiceName}" avec ${fruits.join(', ')}.`;
    navigate(`/lab?tab=nutrifys&prompt=${encodeURIComponent(prompt)}`);
  };

  return (
    <div className="space-y-8">
      {/* Top Hero Card With Animated SVGs & Clean Background */}
      <div className="relative overflow-hidden rounded-2xl sm:rounded-[2.5rem] bg-card/95 dark:bg-card/90 backdrop-blur-xl border border-border/80 text-foreground p-4 sm:p-10 shadow-sm transition-all">
        {/* Animated Background SVGs (FYS Freshness & Botanical Motifs) */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none select-none z-0">
          <style>{`
            @keyframes fysFloatA {
              0%, 100% { transform: translateY(0px) rotate(0deg); }
              50% { transform: translateY(-12px) rotate(6deg); }
            }
            @keyframes fysFloatB {
              0%, 100% { transform: translateY(0px) rotate(0deg); }
              50% { transform: translateY(-14px) rotate(-8deg); }
            }
            @keyframes fysFloatC {
              0%, 100% { transform: translateY(0px) rotate(0deg); }
              50% { transform: translateY(-9px) rotate(5deg); }
            }
            @keyframes fysSway {
              0%, 100% { transform: translateX(0px) rotate(0deg); }
              50% { transform: translateX(10px) rotate(-10deg); }
            }
            @keyframes fysTwinkle {
              0%, 100% { transform: scale(0.85); opacity: 0.25; }
              50% { transform: scale(1.18); opacity: 0.85; }
            }
            @keyframes fysCitrusSpinSlow {
              from { transform: rotate(0deg); }
              to { transform: rotate(360deg); }
            }
            @keyframes fysPulseSoft {
              0%, 100% { transform: scale(1); opacity: 0.15; }
              50% { transform: scale(1.08); opacity: 0.35; }
            }
            .fys-svg-float-a { animation: fysFloatA 6s ease-in-out infinite; }
            .fys-svg-float-b { animation: fysFloatB 7.5s ease-in-out infinite 1s; }
            .fys-svg-float-c { animation: fysFloatC 5.5s ease-in-out infinite 2s; }
            .fys-svg-sway { animation: fysSway 8s ease-in-out infinite 0.5s; }
            .fys-svg-twinkle-1 { animation: fysTwinkle 3.5s ease-in-out infinite; }
            .fys-svg-twinkle-2 { animation: fysTwinkle 4.5s ease-in-out infinite 1.8s; }
            .fys-svg-spin { animation: fysCitrusSpinSlow 50s linear infinite; }
            .fys-svg-spin-rev { animation: fysCitrusSpinSlow 65s linear infinite reverse; }
            .fys-svg-pulse { animation: fysPulseSoft 5s ease-in-out infinite; }
          `}</style>

          {/* Ambient soft glow spots */}
          <div className="absolute -right-12 -top-12 size-72 rounded-full bg-primary/10 dark:bg-primary/15 blur-3xl pointer-events-none fys-svg-pulse" />
          <div className="absolute left-1/4 -bottom-16 size-64 rounded-full bg-secondary/10 dark:bg-secondary/15 blur-3xl pointer-events-none fys-svg-pulse" style={{ animationDelay: '2.5s' }} />

          {/* 1. Large Citrus Slice Wheel - Top Right */}
          <div className="absolute -top-10 -right-8 w-44 h-44 sm:w-56 sm:h-56 text-primary/15 dark:text-primary/20 fys-svg-spin">
            <svg viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="1.4" className="w-full h-full">
              <circle cx="50" cy="50" r="46" strokeWidth="1.8" strokeDasharray="3 3" />
              <circle cx="50" cy="50" r="41" strokeWidth="1.2" />
              <circle cx="50" cy="50" r="9" strokeWidth="1.2" fill="currentColor" fillOpacity="0.08" />
              <line x1="50" y1="12" x2="50" y2="41" />
              <line x1="50" y1="59" x2="50" y2="88" />
              <line x1="12" y1="50" x2="41" y2="50" />
              <line x1="59" y1="50" x2="88" y2="50" />
              <line x1="23" y1="23" x2="43" y2="43" />
              <line x1="57" y1="57" x2="77" y2="77" />
              <line x1="77" y1="23" x2="57" y2="43" />
              <line x1="43" y1="57" x2="23" y2="77" />
              <path d="M50 20 C46 27 46 34 50 38 C54 34 54 27 50 20 Z" fill="currentColor" fillOpacity="0.12" />
              <path d="M50 80 C46 73 46 66 50 62 C54 66 54 73 50 80 Z" fill="currentColor" fillOpacity="0.12" />
              <path d="M20 50 C27 46 34 46 38 50 C34 54 27 54 20 50 Z" fill="currentColor" fillOpacity="0.12" />
              <path d="M80 50 C73 46 66 46 62 50 C66 54 73 54 80 50 Z" fill="currentColor" fillOpacity="0.12" />
            </svg>
          </div>

          {/* 2. Secondary Citrus Outline - Bottom Left */}
          <div className="absolute -bottom-14 -left-12 w-40 h-40 sm:w-48 sm:h-48 text-secondary/15 dark:text-secondary/20 fys-svg-spin-rev">
            <svg viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="1.3" className="w-full h-full">
              <circle cx="50" cy="50" r="45" strokeWidth="1.8" />
              <circle cx="50" cy="50" r="38" strokeDasharray="4 2" />
              <circle cx="50" cy="50" r="8" fill="currentColor" fillOpacity="0.1" />
              <line x1="50" y1="14" x2="50" y2="42" />
              <line x1="50" y1="58" x2="50" y2="86" />
              <line x1="14" y1="50" x2="42" y2="50" />
              <line x1="58" y1="50" x2="86" y2="50" />
              <line x1="24" y1="24" x2="44" y2="44" />
              <line x1="56" y1="56" x2="76" y2="76" />
              <line x1="76" y1="24" x2="56" y2="44" />
              <line x1="44" y1="56" x2="24" y2="76" />
            </svg>
          </div>

          {/* 3. Floating Leaf #1 - Top Left */}
          <div className="absolute top-5 left-10 sm:left-24 w-8 h-8 text-primary/35 dark:text-primary/45 fys-svg-float-a">
            <svg viewBox="0 0 24 24" fill="currentColor" fillOpacity="0.18" stroke="currentColor" strokeWidth="1.5" className="w-full h-full">
              <path d="M12 2C6.5 2 2 6.5 2 12c0 5 4 8.5 9 8.5.5-2 1-4.5 3-6.5s4.5-2.5 6.5-3c0-5-3.5-9-8.5-9z" />
              <path d="M12 2c0 7-3 12-8 15" strokeLinecap="round" />
              <path d="M8 8c1.5 1 3 1.5 4 1" strokeLinecap="round" />
              <path d="M6 13c2 .5 3.5 0 4-1" strokeLinecap="round" />
            </svg>
          </div>

          {/* 4. Floating Leaf #2 - Near Center Top */}
          <div className="absolute top-3 left-1/2 -translate-x-1/2 w-6 h-6 text-accent/50 dark:text-accent/40 fys-svg-float-b">
            <svg viewBox="0 0 24 24" fill="currentColor" fillOpacity="0.2" stroke="currentColor" strokeWidth="1.5" className="w-full h-full">
              <path d="M21 3c-4.5.5-9 3-12 7-2 2.5-2.5 5.5-2 8.5 3 .5 6 0 8.5-2 4-3 6.5-7.5 7-12 0-.5-.5-1-1-1.5z" />
              <path d="M7 18.5c2.5-2.5 6.5-5.5 11.5-6.5" strokeLinecap="round" />
            </svg>
          </div>

          {/* 5. Floating Leaf #3 - Bottom Right */}
          <div className="absolute bottom-6 right-1/4 w-7 h-7 text-primary/30 dark:text-primary/40 fys-svg-sway">
            <svg viewBox="0 0 24 24" fill="currentColor" fillOpacity="0.15" stroke="currentColor" strokeWidth="1.5" className="w-full h-full">
              <path d="M20.5 3.5c-4.5 0-9.5 3-12 7-1.5 2.5-1.5 5.5-1 8 2.5.5 5.5.5 8-1 4-2.5 7-7.5 7-12 0-.7-.3-1.3-1-1.7-.3-.2-.7-.3-1-.3z" />
              <path d="M7.5 18.5c3-3 7.5-6 13-7" strokeLinecap="round" />
            </svg>
          </div>

          {/* 6. Juice Droplet #1 - Left side */}
          <div className="absolute top-20 left-4 sm:left-12 w-5 h-6 text-secondary/40 dark:text-secondary/50 fys-svg-float-c">
            <svg viewBox="0 0 24 28" fill="currentColor" fillOpacity="0.22" stroke="currentColor" strokeWidth="1.5" className="w-full h-full">
              <path d="M12 2 C12 2 4 12 4 18 C4 22.4 7.6 26 12 26 C16.4 26 20 22.4 20 18 C20 12 12 2 12 2 Z" />
              <circle cx="9" cy="17" r="1.5" fill="currentColor" fillOpacity="0.6" stroke="none" />
            </svg>
          </div>

          {/* 7. Juice Droplet #2 - Lower Center */}
          <div className="absolute bottom-12 left-1/3 w-4 h-5 text-primary/35 dark:text-primary/45 fys-svg-float-a" style={{ animationDelay: '1.2s' }}>
            <svg viewBox="0 0 24 28" fill="currentColor" fillOpacity="0.2" stroke="currentColor" strokeWidth="1.5" className="w-full h-full">
              <path d="M12 2 C12 2 4 12 4 18 C4 22.4 7.6 26 12 26 C16.4 26 20 22.4 20 18 C20 12 12 2 12 2 Z" />
              <circle cx="9" cy="17" r="1.2" fill="currentColor" fillOpacity="0.5" stroke="none" />
            </svg>
          </div>

          {/* 8. Juice Droplet #3 - Right near metrics */}
          <div className="absolute top-12 right-2 sm:right-1/3 w-4.5 h-5.5 text-secondary/35 dark:text-secondary/45 fys-svg-float-b" style={{ animationDelay: '2.2s' }}>
            <svg viewBox="0 0 24 28" fill="currentColor" fillOpacity="0.2" stroke="currentColor" strokeWidth="1.5" className="w-full h-full">
              <path d="M12 2 C12 2 4 12 4 18 C4 22.4 7.6 26 12 26 C16.4 26 20 22.4 20 18 C20 12 12 2 12 2 Z" />
            </svg>
          </div>

          {/* 9. Vitality Stars - Sparkles */}
          <div className="absolute top-10 left-1/3 w-4 h-4 text-secondary/50 dark:text-secondary/60 fys-svg-twinkle-1">
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
              <path d="M12 0L14.5 9.5L24 12L14.5 14.5L12 24L9.5 14.5L0 12L9.5 9.5L12 0Z" />
            </svg>
          </div>

          <div className="absolute bottom-16 right-16 w-3.5 h-3.5 text-primary/45 dark:text-primary/55 fys-svg-twinkle-2">
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
              <path d="M12 0L14.5 9.5L24 12L14.5 14.5L12 24L9.5 14.5L0 12L9.5 9.5L12 0Z" />
            </svg>
          </div>

          <div className="absolute top-24 right-10 w-3 h-3 text-secondary/45 dark:text-secondary/55 fys-svg-twinkle-1" style={{ animationDelay: '2s' }}>
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
              <path d="M12 0L14.5 9.5L24 12L14.5 14.5L12 24L9.5 14.5L0 12L9.5 9.5L12 0Z" />
            </svg>
          </div>

          {/* 10. Small floating bubbles / micronutrient dots */}
          <div className="absolute top-1/2 left-16 size-2 rounded-full bg-secondary/30 fys-svg-float-b" />
          <div className="absolute top-1/3 right-1/4 size-2.5 rounded-full bg-primary/25 fys-svg-float-a" />
          <div className="absolute bottom-10 left-2/3 size-2 rounded-full bg-accent/35 fys-svg-float-c" />
        </div>

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6 sm:gap-8">
          <div className="space-y-3 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 sm:px-3.5 sm:py-1.5 rounded-full text-[11px] sm:text-xs font-bold uppercase tracking-wider bg-secondary/10 text-secondary border border-secondary/25 shadow-xs">
                <Sparkles className="size-3.5 text-secondary animate-pulse" />
                Votre Cure en cours
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 sm:px-3.5 sm:py-1.5 rounded-full text-[11px] sm:text-xs font-bold bg-primary/10 text-primary border border-primary/25 shadow-xs">
                <Calendar className="size-3.5 text-primary" />
                Jour {activeDay} sur {totalDays}
              </span>
            </div>

            <h2 className="text-2xl sm:text-4xl font-bold font-display tracking-tight text-foreground">
              {userProgram.programTitle}
            </h2>

            <p className="text-muted-foreground text-xs sm:text-base leading-relaxed">
              {isProgramCompleted
                ? 'Félicitations ! Vous avez accompli avec succès l’intégralité de votre cure.'
                : 'Chaque gorgée apporte des enzymes vivantes et des micronutriments protecteurs à votre organisme.'}
            </p>
          </div>

          {/* Metric Badges */}
          <div className="w-full sm:w-auto shrink-0 flex items-center justify-around sm:justify-start gap-4 sm:gap-6 bg-card/70 dark:bg-card/50 backdrop-blur-md p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-border/70 shadow-xs">
            <div className="text-center">
              <div className="text-3xl sm:text-5xl font-bold text-foreground font-display">
                {percentComplete}%
              </div>
              <div className="text-[10px] sm:text-[11px] font-bold text-muted-foreground uppercase tracking-widest mt-1">
                Progression
              </div>
            </div>

            <div className="h-10 sm:h-12 w-px bg-border/70" />

            <div className="text-center">
              <div className="text-2xl sm:text-4xl font-bold text-secondary font-display">
                {completedCount}/{totalDays}
              </div>
              <div className="text-[10px] sm:text-[11px] font-bold text-muted-foreground uppercase tracking-widest mt-1">
                Jus Validés
              </div>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="relative z-10 mt-8 pt-6 border-t border-border/60 space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
            <span>Début : {new Date(userProgram.startDate).toLocaleDateString('fr-FR')}</span>
            <span>Fin prévue : {new Date(userProgram.endDate).toLocaleDateString('fr-FR')}</span>
          </div>
          <div className="w-full h-3 rounded-full bg-muted/60 dark:bg-muted/40 overflow-hidden p-0.5 border border-border/50">
            <div
              className="h-full bg-gradient-to-r from-primary via-accent to-secondary rounded-full transition-all duration-700 ease-out shadow-xs"
              style={{ width: `${percentComplete}%` }}
            />
          </div>
        </div>
      </div>

      {/* Completion Celebration Card (if completed) */}
      {isProgramCompleted && (
        <div className="p-7 rounded-3xl bg-primary/10 border border-primary/30 flex flex-col sm:flex-row items-center justify-between gap-5 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="size-16 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center shadow-md shrink-0">
              <Award className="size-9" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-foreground">
                Cure accomplie avec succès
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                Vous avez validé vos {completedCount} étapes. Votre organisme a fait le plein d'énergie et de vitalité.
              </p>
            </div>
          </div>
          <Button
            onClick={() => navigate('/lab')}
            className="rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold h-11 px-6 shadow-sm shrink-0 cursor-pointer"
          >
            Créer un cocktail au Lab
            <ArrowRight className="size-4 ml-1.5" />
          </Button>
        </div>
      )}

      {/* Prescription du Jour : Hero Juice Card */}
      {todayItem && (
        <div className="rounded-2xl sm:rounded-[2.5rem] border border-border/80 bg-card shadow-sm overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-12">
            {/* Left: Juice Photo with Verified Source */}
            <div className="lg:col-span-5 relative min-h-[220px] sm:min-h-[300px] lg:min-h-full overflow-hidden bg-muted">
              <img
                src={todayItem.cocktailImage || todayItem.imageUrl || userProgram.programSnapshot.imageUrl}
                alt={todayItem.cocktailName || todayItem.juiceName}
                onError={(e) => {
                  (e.target as HTMLImageElement).src = FALLBACK_IMAGE;
                }}
                className="w-full h-full object-cover object-center transform hover:scale-105 transition-transform duration-1000 ease-out"
              />
              <div className="absolute inset-0 bg-gradient-to-t lg:bg-gradient-to-r from-black/75 via-black/35 to-transparent" />

              {/* Floating Day Badge */}
              <div className="absolute top-4 left-4 sm:top-5 sm:left-5 z-10">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 sm:px-3.5 sm:py-1.5 rounded-full text-[11px] sm:text-xs font-bold uppercase tracking-wider bg-primary text-primary-foreground backdrop-blur-md shadow-md">
                  {displayedDayNum === activeDay ? 'Prescription d’Aujourd’hui' : `Détail du Jour ${displayedDayNum}`}
                </span>
              </div>

              {/* Title & Taste Note over Photo */}
              <div className="absolute bottom-4 left-4 right-4 sm:bottom-5 sm:left-5 sm:right-5 text-white z-10 space-y-1 sm:space-y-1.5">
                <span className="text-[10px] sm:text-[11px] font-bold text-white/80 uppercase tracking-wider">
                  Jour {displayedDayNum} • {todayItem.focus || 'Fraîcheur et Bienfaits'}
                </span>
                <h3 className="text-xl sm:text-3xl font-bold font-display leading-tight">
                  {todayItem.cocktailName || todayItem.juiceName}
                </h3>
                {todayItem.tasteProfile && (
                  <p className="text-xs text-white/80 italic line-clamp-2">
                    « {todayItem.tasteProfile} »
                  </p>
                )}
              </div>
            </div>

            {/* Right: Nutrition Info, Fruits & Interactive Check-in */}
            <div className="lg:col-span-7 p-3.5 sm:p-8 flex flex-col justify-between space-y-5 sm:space-y-6">
              <div className="space-y-4 sm:space-y-5">
                {/* Timing & Bottle specs */}
                <div className="flex flex-wrap items-center justify-between gap-2.5 sm:gap-3 pb-4 border-b border-border/60">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full text-xs font-bold bg-primary/10 text-primary border border-primary/20">
                      <TimingIcon className="size-3.5 sm:size-4" />
                      {timingLabel}
                    </span>
                    <span className="inline-flex items-center px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full text-xs font-bold bg-muted text-muted-foreground">
                      500ml 100% Frais
                    </span>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleOrderJuice(todayItem)}
                    className="w-full sm:w-auto text-xs font-bold h-9 border-primary/30 hover:bg-primary/10 text-foreground cursor-pointer"
                  >
                    <ShoppingBag className="size-3.5 mr-1.5 text-primary" />
                    Commander ce jus
                  </Button>
                </div>

                {/* Fresh Ingredients */}
                <div>
                  <p className="text-[10px] sm:text-[11px] uppercase font-bold tracking-wider text-muted-foreground mb-2">
                    Ingrédients bruts pressés à froid :
                  </p>
                  <div className="flex flex-wrap gap-1.5 sm:gap-2">
                    {(todayItem.fruitNames || todayItem.fruits || []).map((fruit, fi) => (
                      <span
                        key={fi}
                        className="inline-flex items-center gap-1 sm:gap-1.5 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-xl text-xs font-bold bg-primary/10 text-foreground border border-primary/20"
                      >
                        <Leaf className="size-3 text-primary" />
                        {fruit}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Instructions */}
                {todayItem.instructions && (
                  <div className="p-3 sm:p-3.5 rounded-2xl bg-muted/40 border border-border/50 text-xs text-muted-foreground flex items-start gap-2.5">
                    <Droplets className="size-4 text-primary shrink-0 mt-0.5" />
                    <span>
                      <strong className="text-foreground">Conseil dégustation :</strong> {todayItem.instructions}
                    </span>
                  </div>
                )}

                {/* NutriFYS Coach Quote */}
                {(todayItem.advice || todayItem.nutrifysAdvice) && (
                  <div className="p-3.5 sm:p-4 rounded-2xl bg-secondary/10 border border-secondary/20 text-foreground space-y-1.5">
                    <div className="flex items-center gap-2 text-secondary font-bold text-xs">
                      <Sparkles className="size-4" />
                      <span>LE CONSEIL DU COACH NUTRIFYS</span>
                    </div>
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      {todayItem.advice || todayItem.nutrifysAdvice}
                    </p>
                  </div>
                )}
              </div>

              {/* Check-in Action Bar */}
              <div className="pt-5 border-t border-border/60 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4">
                <div className="text-xs text-muted-foreground text-center sm:text-left">
                  {isDisplayedDayChecked ? (
                    <span className="inline-flex items-center gap-1.5 text-primary font-bold">
                      <CheckCircle2 className="size-4 text-primary" />
                      Jour {displayedDayNum} validé.
                    </span>
                  ) : (
                    <span>Avez-vous consommé votre jus pour le Jour {displayedDayNum} ?</span>
                  )}
                </div>

                <div className="w-full sm:w-auto">
                  {isDisplayedDayChecked ? (
                    <Button
                      disabled
                      className="w-full sm:w-auto rounded-xl bg-primary/20 text-primary border border-primary/30 font-bold text-xs h-11 px-6 cursor-default"
                    >
                      <Check className="size-4 mr-2 text-primary" />
                      Validé pour aujourd'hui
                    </Button>
                  ) : (
                    <Button
                      onClick={() => onCheckin(displayedDayNum)}
                      disabled={isCheckingIn}
                      className="w-full sm:w-auto rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs h-11 px-6 sm:px-8 shadow-md transition-all active:scale-98 cursor-pointer"
                    >
                      {isCheckingIn ? (
                        <>
                          <Loader2 className="size-4 animate-spin mr-2" />
                          Validation...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="size-4 mr-2" />
                          Valider mon jus (Jour {displayedDayNum})
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Visual Stepper of Days */}
      <div className="rounded-2xl sm:rounded-[2.5rem] border border-border/80 bg-card p-3.5 sm:p-8 shadow-xs space-y-4 sm:space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm sm:text-base font-bold font-display uppercase tracking-wider text-foreground flex items-center gap-2">
              <Calendar className="size-4 text-primary" />
              Parcours de la cure ({totalDays} étapes)
            </h3>
            <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5">
              Cliquez sur un jour pour afficher sa recette et ses bienfaits.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2.5 sm:gap-3.5">
          {userProgram.programSnapshot.days.map((day, idx) => {
            const dNum = day.dayNumber || day.day || idx + 1;
            const isCompleted = completedDayNumbers.has(dNum);
            const isCurrent = dNum === activeDay;
            const isSelected = displayedDayNum === dNum;

            return (
              <button
                key={idx}
                type="button"
                onClick={() => setSelectedDayView(dNum)}
                className={`group relative rounded-2xl overflow-hidden border text-left flex flex-col justify-between transition-all duration-300 cursor-pointer ${
                  isSelected
                    ? 'ring-2 ring-primary border-transparent shadow-md scale-102'
                    : isCurrent
                    ? 'border-primary bg-primary/5 ring-1 ring-primary/60'
                    : isCompleted
                    ? 'border-border/60 bg-muted/40'
                    : 'border-border/60 bg-card hover:border-primary/40'
                }`}
              >
                {/* Day thumbnail photo */}
                <div className="relative h-24 w-full overflow-hidden bg-muted">
                  <img
                    src={day.cocktailImage || day.imageUrl || userProgram.programSnapshot.imageUrl}
                    alt={day.cocktailName || day.juiceName}
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = FALLBACK_IMAGE;
                    }}
                    className="w-full h-full object-cover object-center group-hover:scale-110 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />

                  {/* Day number & status badge */}
                  <div className="absolute top-2 left-2 right-2 flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-black/60 text-white backdrop-blur-xs">
                      J{dNum}
                    </span>
                    {isCompleted ? (
                      <span className="size-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px] shadow-xs">
                        <Check className="size-3" />
                      </span>
                    ) : isCurrent ? (
                      <span className="size-2.5 rounded-full bg-primary animate-ping" />
                    ) : (
                      <Clock className="size-3 text-white/70" />
                    )}
                  </div>

                  <div className="absolute bottom-1.5 left-2 right-2 text-white">
                    <p className="text-[11px] font-bold truncate">
                      {day.cocktailName || day.juiceName}
                    </p>
                  </div>
                </div>

                <div className="p-2.5 space-y-1">
                  <p className="text-[10px] text-muted-foreground truncate">
                    {day.focus || 'Bienfaits ciblés'}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Abandon Option */}
      <div className="flex items-center justify-between p-4 rounded-2xl bg-muted/30 border border-border/50 text-xs">
        <span className="text-muted-foreground">
          Besoin d'interrompre votre programme ?
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCancelModalOpen(true)}
          className="text-xs text-destructive hover:bg-destructive/10 cursor-pointer"
        >
          Arrêter ce programme
        </Button>
      </div>

      {/* Cancel Confirmation Modal */}
      <Dialog open={cancelModalOpen} onOpenChange={setCancelModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="size-5" />
              Interrompre le programme ?
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground pt-2 leading-relaxed">
              Êtes-vous certain de vouloir interrompre votre cure « {userProgram.programTitle} » ? Votre progression sera archivée et vous pourrez démarrer une autre cure quand vous le souhaitez.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="mt-4 gap-2">
            <Button
              variant="outline"
              onClick={() => setCancelModalOpen(false)}
              disabled={isCancelling}
              className="text-xs cursor-pointer"
            >
              Conserver ma cure
            </Button>
            <Button
              variant="destructive"
              onClick={async () => {
                await onCancel();
                setCancelModalOpen(false);
              }}
              disabled={isCancelling}
              className="text-xs cursor-pointer"
            >
              {isCancelling ? 'Arrêt...' : 'Oui, interrompre'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
