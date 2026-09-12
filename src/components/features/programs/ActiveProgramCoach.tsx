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
  ExternalLink,
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
      {/* ── Top Hero Card With Modern Glassmorphism & Visual Energy ── */}
      <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-emerald-800 via-teal-900 to-emerald-950 text-white p-7 sm:p-10 shadow-2xl border border-emerald-500/30">
        {/* Ambient Light Orbs */}
        <div className="absolute -right-16 -top-16 size-64 rounded-full bg-emerald-400/20 blur-3xl pointer-events-none" />
        <div className="absolute left-1/3 -bottom-16 size-56 rounded-full bg-teal-300/15 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
          <div className="space-y-3 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-black uppercase tracking-wider bg-white/20 backdrop-blur-md text-white border border-white/30 shadow-xs">
                <Sparkles className="size-3.5 text-amber-300 animate-pulse" />
                Votre Cure en cours
              </span>
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-emerald-500/40 text-emerald-100 border border-emerald-400/40">
                <Calendar className="size-3.5" />
                Jour {activeDay} sur {totalDays}
              </span>
            </div>

            <h2 className="text-3xl sm:text-4xl font-extrabold font-display tracking-tight text-white">
              {userProgram.programTitle}
            </h2>

            <p className="text-emerald-100/90 text-sm sm:text-base leading-relaxed">
              {isProgramCompleted
                ? '🏆 Félicitations ! Vous avez accompli avec succès l’intégralité de votre cure.'
                : 'Chaque gorgée apporte des enzymes vivantes et des micronutriments protecteurs à votre organisme.'}
            </p>
          </div>

          {/* Circular / Badge Metric Display */}
          <div className="shrink-0 flex items-center gap-6 bg-black/30 backdrop-blur-md p-5 rounded-3xl border border-white/20 shadow-inner">
            <div className="text-center">
              <div className="text-4xl sm:text-5xl font-black text-white font-display">
                {percentComplete}%
              </div>
              <div className="text-[11px] font-bold text-emerald-200 uppercase tracking-widest mt-1">
                Progression
              </div>
            </div>

            <div className="h-12 w-px bg-white/20" />

            <div className="text-center">
              <div className="text-3xl sm:text-4xl font-black text-amber-300 font-display">
                {completedCount}/{totalDays}
              </div>
              <div className="text-[11px] font-bold text-emerald-200 uppercase tracking-widest mt-1">
                Jus Validés
              </div>
            </div>
          </div>
        </div>

        {/* Animated Progress Bar */}
        <div className="relative z-10 mt-8 pt-6 border-t border-white/15 space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-emerald-200">
            <span>Début : {new Date(userProgram.startDate).toLocaleDateString('fr-FR')}</span>
            <span>Fin prévue : {new Date(userProgram.endDate).toLocaleDateString('fr-FR')}</span>
          </div>
          <div className="w-full h-3 rounded-full bg-white/15 overflow-hidden p-0.5 border border-white/10">
            <div
              className="h-full bg-gradient-to-r from-amber-400 via-emerald-400 to-teal-300 rounded-full transition-all duration-700 ease-out shadow-sm"
              style={{ width: `${percentComplete}%` }}
            />
          </div>
        </div>
      </div>

      {/* ── Completion Celebration Card (if completed) ── */}
      {isProgramCompleted && (
        <div className="p-7 rounded-3xl bg-gradient-to-r from-amber-500/20 via-emerald-500/20 to-teal-500/10 border border-amber-500/40 flex flex-col sm:flex-row items-center justify-between gap-5 shadow-lg">
          <div className="flex items-center gap-4">
            <div className="size-16 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-lg shrink-0">
              <Award className="size-9" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-foreground">
                Cure accomplie avec succès ! 🎉
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                Vous avez validé vos {completedCount} étapes. Votre corps et votre esprit vous remercient !
              </p>
            </div>
          </div>
          <Button
            onClick={() => navigate('/lab')}
            className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold h-11 px-6 shadow-md shrink-0 cursor-pointer"
          >
            Créer un cocktail au Lab
            <ArrowRight className="size-4 ml-1.5" />
          </Button>
        </div>
      )}

      {/* ── Prescription du Jour : Luscious Hero Juice Card ── */}
      {todayItem && (
        <div className="rounded-[2.5rem] border border-emerald-500/30 bg-card shadow-xl overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-12">
            {/* Left: Juice Imagery with Freshness Steam & Badge */}
            <div className="lg:col-span-5 relative min-h-[300px] lg:min-h-full overflow-hidden bg-muted">
              <img
                src={todayItem.cocktailImage || todayItem.imageUrl || userProgram.programSnapshot.imageUrl}
                alt={todayItem.cocktailName || todayItem.juiceName}
                className="w-full h-full object-cover object-center transform hover:scale-105 transition-transform duration-1000 ease-out"
              />
              <div className="absolute inset-0 bg-gradient-to-t lg:bg-gradient-to-r from-black/70 via-black/30 to-transparent" />

              {/* Floating Day Badge */}
              <div className="absolute top-5 left-5 z-10">
                <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-black uppercase tracking-wider bg-emerald-600/90 text-white backdrop-blur-md shadow-lg border border-emerald-400/40">
                  {displayedDayNum === activeDay ? 'Prescription d’Aujourd’hui' : `Détail du Jour ${displayedDayNum}`}
                </span>
              </div>

              {/* Title & Taste Note over Photo */}
              <div className="absolute bottom-5 left-5 right-5 text-white z-10 space-y-1.5">
                <span className="text-[11px] font-bold text-emerald-300 uppercase tracking-wider">
                  Jour {displayedDayNum} • {todayItem.focus || 'Fraîcheur & Bienfaits'}
                </span>
                <h3 className="text-2xl sm:text-3xl font-black font-display leading-tight">
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
            <div className="lg:col-span-7 p-6 sm:p-8 flex flex-col justify-between space-y-6">
              <div className="space-y-5">
                {/* Timing & Bottle specs */}
                <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-border/60">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-primary/10 text-primary border border-primary/20">
                      <TimingIcon className="size-4" />
                      {timingLabel}
                    </span>
                    <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-extrabold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                      500ml 100% Frais
                    </span>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleOrderJuice(todayItem)}
                    className="text-xs font-bold h-9 border-emerald-500/30 hover:bg-emerald-500/10 text-foreground cursor-pointer"
                  >
                    <ShoppingBag className="size-3.5 mr-1.5 text-emerald-600" />
                    Commander ce jus
                  </Button>
                </div>

                {/* Fresh Ingredients */}
                <div>
                  <p className="text-[11px] uppercase font-extrabold tracking-wider text-muted-foreground mb-2">
                    Ingrédients bruts pressés à froid :
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {(todayItem.fruitNames || todayItem.fruits || []).map((fruit, fi) => (
                      <span
                        key={fi}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-muted/70 text-foreground border border-border/60 shadow-2xs"
                      >
                        <Leaf className="size-3 text-emerald-500" />
                        {fruit}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Instructions */}
                {todayItem.instructions && (
                  <div className="p-3.5 rounded-2xl bg-muted/40 border border-border/50 text-xs text-muted-foreground flex items-start gap-2.5">
                    <Droplets className="size-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span>
                      <strong className="text-foreground">Conseil dégustation :</strong> {todayItem.instructions}
                    </span>
                  </div>
                )}

                {/* NutriFYS Coach Quote */}
                {(todayItem.advice || todayItem.nutrifysAdvice) && (
                  <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-amber-950 dark:text-amber-200 space-y-1.5">
                    <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300 font-extrabold text-xs">
                      <Sparkles className="size-4 text-amber-500" />
                      <span>LE CONSEIL DU COACH NUTRIFYS</span>
                    </div>
                    <p className="text-xs leading-relaxed">
                      {todayItem.advice || todayItem.nutrifysAdvice}
                    </p>
                  </div>
                )}
              </div>

              {/* ── Check-in Action Bar ── */}
              <div className="pt-5 border-t border-border/60 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-xs text-muted-foreground text-center sm:text-left">
                  {isDisplayedDayChecked ? (
                    <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold">
                      <CheckCircle2 className="size-4 text-emerald-500" />
                      Bravo ! Le Jour {displayedDayNum} a été validé.
                    </span>
                  ) : (
                    <span>Avez-vous bu votre potion pour le Jour {displayedDayNum} ?</span>
                  )}
                </div>

                <div className="w-full sm:w-auto">
                  {isDisplayedDayChecked ? (
                    <Button
                      disabled
                      className="w-full sm:w-auto rounded-xl bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 font-bold text-xs h-11 px-6 cursor-default"
                    >
                      <Check className="size-4 mr-2 text-emerald-600" />
                      Validé avec succès ✨
                    </Button>
                  ) : (
                    <Button
                      onClick={() => onCheckin(displayedDayNum)}
                      disabled={isCheckingIn}
                      className="w-full sm:w-auto rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs h-11 px-8 shadow-lg hover:shadow-emerald-600/20 transition-all active:scale-98 cursor-pointer"
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

      {/* ── Visual Day-by-Day Stepper with Photos ── */}
      <div className="rounded-[2.5rem] border border-border/80 bg-card p-6 sm:p-8 shadow-sm space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-extrabold font-display uppercase tracking-wider text-foreground flex items-center gap-2">
              <Calendar className="size-4 text-emerald-500" />
              Parcours de la cure ({totalDays} étapes)
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Cliquez sur n'importe quel jour pour explorer sa recette et ses bienfaits.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-3.5">
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
                    ? 'ring-3 ring-emerald-500 border-transparent shadow-lg scale-102'
                    : isCurrent
                    ? 'border-emerald-500 bg-emerald-500/5 ring-1 ring-emerald-400'
                    : isCompleted
                    ? 'border-border/60 bg-muted/40'
                    : 'border-border/60 bg-card hover:border-emerald-500/40 hover:shadow-md'
                }`}
              >
                {/* Day thumbnail photo */}
                <div className="relative h-24 w-full overflow-hidden bg-muted">
                  <img
                    src={day.cocktailImage || day.imageUrl || userProgram.programSnapshot.imageUrl}
                    alt={day.cocktailName || day.juiceName}
                    className="w-full h-full object-cover object-center group-hover:scale-110 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />

                  {/* Day number & status badge */}
                  <div className="absolute top-2 left-2 right-2 flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-black/60 text-white backdrop-blur-xs">
                      J{dNum}
                    </span>
                    {isCompleted ? (
                      <span className="size-5 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[10px] shadow-sm">
                        ✓
                      </span>
                    ) : isCurrent ? (
                      <span className="size-2.5 rounded-full bg-emerald-400 animate-ping" />
                    ) : (
                      <span className="text-[11px] opacity-70">⏳</span>
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

      {/* ── Abandon / Pause Option ── */}
      <div className="flex items-center justify-between p-4 rounded-2xl bg-muted/30 border border-border/50 text-xs">
        <span className="text-muted-foreground">
          Besoin d'interrompre votre programme ?
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCancelModalOpen(true)}
          className="text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-500/10 cursor-pointer"
        >
          Arrêter ce programme
        </Button>
      </div>

      {/* Cancel Confirmation Modal */}
      <Dialog open={cancelModalOpen} onOpenChange={setCancelModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-600">
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
