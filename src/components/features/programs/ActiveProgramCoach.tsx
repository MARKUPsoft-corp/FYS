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
      {/* Top Hero Card With FYS Brand Colors & Clean Structure */}
      <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-[#1F3326] via-[#28422F] to-[#142219] text-white p-7 sm:p-10 shadow-xl border border-primary/30">
        {/* Subtle radial glows */}
        <div className="absolute -right-16 -top-16 size-64 rounded-full bg-primary/20 blur-3xl pointer-events-none" />
        <div className="absolute left-1/3 -bottom-16 size-56 rounded-full bg-secondary/15 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
          <div className="space-y-3 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider bg-white/15 backdrop-blur-md text-white border border-white/20">
                <Sparkles className="size-3.5 text-secondary animate-pulse" />
                Votre Cure en cours
              </span>
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-primary/40 text-white border border-primary/40">
                <Calendar className="size-3.5" />
                Jour {activeDay} sur {totalDays}
              </span>
            </div>

            <h2 className="text-3xl sm:text-4xl font-bold font-display tracking-tight text-white">
              {userProgram.programTitle}
            </h2>

            <p className="text-white/80 text-sm sm:text-base leading-relaxed">
              {isProgramCompleted
                ? 'Félicitations ! Vous avez accompli avec succès l’intégralité de votre cure.'
                : 'Chaque gorgée apporte des enzymes vivantes et des micronutriments protecteurs à votre organisme.'}
            </p>
          </div>

          {/* Metric Badges */}
          <div className="shrink-0 flex items-center gap-6 bg-black/30 backdrop-blur-md p-5 rounded-3xl border border-white/15">
            <div className="text-center">
              <div className="text-4xl sm:text-5xl font-bold text-white font-display">
                {percentComplete}%
              </div>
              <div className="text-[11px] font-bold text-white/70 uppercase tracking-widest mt-1">
                Progression
              </div>
            </div>

            <div className="h-12 w-px bg-white/20" />

            <div className="text-center">
              <div className="text-3xl sm:text-4xl font-bold text-secondary font-display">
                {completedCount}/{totalDays}
              </div>
              <div className="text-[11px] font-bold text-white/70 uppercase tracking-widest mt-1">
                Jus Validés
              </div>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="relative z-10 mt-8 pt-6 border-t border-white/15 space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-white/80">
            <span>Début : {new Date(userProgram.startDate).toLocaleDateString('fr-FR')}</span>
            <span>Fin prévue : {new Date(userProgram.endDate).toLocaleDateString('fr-FR')}</span>
          </div>
          <div className="w-full h-3 rounded-full bg-white/15 overflow-hidden p-0.5 border border-white/10">
            <div
              className="h-full bg-gradient-to-r from-secondary to-primary rounded-full transition-all duration-700 ease-out shadow-xs"
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
        <div className="rounded-[2.5rem] border border-border/80 bg-card shadow-sm overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-12">
            {/* Left: Juice Photo with Verified Source */}
            <div className="lg:col-span-5 relative min-h-[300px] lg:min-h-full overflow-hidden bg-muted">
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
              <div className="absolute top-5 left-5 z-10">
                <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider bg-primary text-primary-foreground backdrop-blur-md shadow-md">
                  {displayedDayNum === activeDay ? 'Prescription d’Aujourd’hui' : `Détail du Jour ${displayedDayNum}`}
                </span>
              </div>

              {/* Title & Taste Note over Photo */}
              <div className="absolute bottom-5 left-5 right-5 text-white z-10 space-y-1.5">
                <span className="text-[11px] font-bold text-white/80 uppercase tracking-wider">
                  Jour {displayedDayNum} • {todayItem.focus || 'Fraîcheur et Bienfaits'}
                </span>
                <h3 className="text-2xl sm:text-3xl font-bold font-display leading-tight">
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
                    <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-bold bg-muted text-muted-foreground">
                      500ml 100% Frais
                    </span>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleOrderJuice(todayItem)}
                    className="text-xs font-bold h-9 border-primary/30 hover:bg-primary/10 text-foreground cursor-pointer"
                  >
                    <ShoppingBag className="size-3.5 mr-1.5 text-primary" />
                    Commander ce jus
                  </Button>
                </div>

                {/* Fresh Ingredients */}
                <div>
                  <p className="text-[11px] uppercase font-bold tracking-wider text-muted-foreground mb-2">
                    Ingrédients bruts pressés à froid :
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {(todayItem.fruitNames || todayItem.fruits || []).map((fruit, fi) => (
                      <span
                        key={fi}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-primary/10 text-foreground border border-primary/20"
                      >
                        <Leaf className="size-3 text-primary" />
                        {fruit}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Instructions */}
                {todayItem.instructions && (
                  <div className="p-3.5 rounded-2xl bg-muted/40 border border-border/50 text-xs text-muted-foreground flex items-start gap-2.5">
                    <Droplets className="size-4 text-primary shrink-0 mt-0.5" />
                    <span>
                      <strong className="text-foreground">Conseil dégustation :</strong> {todayItem.instructions}
                    </span>
                  </div>
                )}

                {/* NutriFYS Coach Quote */}
                {(todayItem.advice || todayItem.nutrifysAdvice) && (
                  <div className="p-4 rounded-2xl bg-secondary/10 border border-secondary/20 text-foreground space-y-1.5">
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
              <div className="pt-5 border-t border-border/60 flex flex-col sm:flex-row items-center justify-between gap-4">
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
                      className="w-full sm:w-auto rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs h-11 px-8 shadow-md transition-all active:scale-98 cursor-pointer"
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
      <div className="rounded-[2.5rem] border border-border/80 bg-card p-6 sm:p-8 shadow-xs space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold font-display uppercase tracking-wider text-foreground flex items-center gap-2">
              <Calendar className="size-4 text-primary" />
              Parcours de la cure ({totalDays} étapes)
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Cliquez sur un jour pour afficher sa recette et ses bienfaits.
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
