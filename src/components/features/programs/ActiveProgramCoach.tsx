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
  RotateCcw,
  MessageCircle,
  Loader2,
  ChevronDown,
  ChevronUp,
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

const TIMING_ICONS: Record<ProgramTiming, any> = {
  morning_fasting: Sun,
  mid_morning: Coffee,
  lunch_substitute: Droplets,
  afternoon_boost: Flame,
  dinner_light: Clock,
  before_bed: Clock,
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
  const completedDayNumbers = new Set(completedCheckins.map((c) => c.day));
  const completedCount = completedDayNumbers.size;
  const percentComplete = Math.min(100, Math.round((completedCount / totalDays) * 100));

  // Determine current active day based on startDate and duration
  const now = new Date();
  const start = new Date(userProgram.startDate);
  const diffDays = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  const calculatedDay = Math.max(1, Math.min(totalDays, diffDays + 1));
  
  // Prefer the currentDay stored or calculatedDay
  const activeDay = Math.min(totalDays, Math.max(userProgram.currentDay || 1, calculatedDay));
  const isTodayChecked = completedDayNumbers.has(activeDay);

  // Day to display details for (defaults to activeDay)
  const displayedDayNum = selectedDayView ?? activeDay;
  const todayItem: ProgramDayItem | undefined =
    userProgram.programSnapshot.days.find((d) => d.day === displayedDayNum) ||
    userProgram.programSnapshot.days[0];

  const TimingIcon = todayItem ? TIMING_ICONS[todayItem.timing] || Clock : Clock;
  const timingLabel = todayItem ? PROGRAM_TIMING_LABELS[todayItem.timing] || todayItem.timing : '';

  const handleOrderJuice = (day: ProgramDayItem) => {
    // Navigate to lab with fruits prefilled or search
    const query = new URLSearchParams();
    query.set('tab', 'nutrifys');
    query.set('prompt', `Je suis le programme ${userProgram.programTitle}, jour ${day.day}. Prépare-moi la recette "${day.juiceName}" avec ${day.fruits.join(', ')}.`);
    navigate(`/lab?${query.toString()}`);
  };

  const isProgramCompleted = userProgram.status === 'completed' || completedCount >= totalDays;

  return (
    <div className="space-y-6">
      {/* ── Top Status Card ── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-600 via-teal-700 to-emerald-900 text-white p-6 shadow-xl">
        {/* Background decorative circles */}
        <div className="absolute -right-12 -top-12 w-48 h-48 rounded-full bg-white/10 blur-2xl pointer-events-none" />
        <div className="absolute right-20 -bottom-10 w-36 h-36 rounded-full bg-emerald-400/20 blur-xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-white/20 backdrop-blur-md text-white border border-white/30">
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                Programme Actif
              </span>
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/40 text-emerald-100 border border-emerald-400/40">
                <Calendar className="w-3.5 h-3.5" />
                Jour {activeDay} sur {totalDays}
              </span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              {userProgram.programTitle}
            </h2>
            <p className="text-emerald-100/90 text-sm max-w-xl">
              {isProgramCompleted
                ? 'Félicitations ! Vous avez accompli l’ensemble des étapes de votre cure.'
                : `Objectif : Restez régulier chaque jour pour maximiser les bienfaits de votre cure.`}
            </p>
          </div>

          {/* Progress circle or stats badge */}
          <div className="shrink-0 flex items-center gap-4 bg-black/20 backdrop-blur-md p-4 rounded-xl border border-white/15">
            <div className="text-center">
              <div className="text-3xl font-black text-white">
                {percentComplete}%
              </div>
              <div className="text-[11px] font-medium text-emerald-200 uppercase tracking-wider">
                Progression
              </div>
            </div>
            <div className="h-10 w-px bg-white/20" />
            <div className="text-center">
              <div className="text-2xl font-black text-amber-300">
                {completedCount}/{totalDays}
              </div>
              <div className="text-[11px] font-medium text-emerald-200 uppercase tracking-wider">
                Jus Validés
              </div>
            </div>
          </div>
        </div>

        {/* Linear progress bar */}
        <div className="relative z-10 mt-6 pt-4 border-t border-white/15">
          <div className="flex items-center justify-between text-xs font-medium text-emerald-200 mb-2">
            <span>Début : {new Date(userProgram.startDate).toLocaleDateString('fr-FR')}</span>
            <span>Fin prévue : {new Date(userProgram.endDate).toLocaleDateString('fr-FR')}</span>
          </div>
          <div className="w-full h-2.5 rounded-full bg-white/20 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-amber-400 to-emerald-300 rounded-full transition-all duration-500 shadow-sm"
              style={{ width: `${percentComplete}%` }}
            />
          </div>
        </div>
      </div>

      {/* ── Completion Celebration Banner (if completed) ── */}
      {isProgramCompleted && (
        <div className="p-6 rounded-2xl bg-gradient-to-r from-amber-500/15 via-emerald-500/15 to-primary/10 border border-amber-500/30 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center shrink-0">
              <Award className="w-8 h-8 text-amber-500" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-foreground">
                Cure {userProgram.programTitle} accomplie avec brio ! 🏆
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                Vous avez bu vos {completedCount} jus et fait un grand pas pour votre santé et vitalité.
              </p>
            </div>
          </div>
          <Button
            onClick={() => navigate('/lab')}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shrink-0"
          >
            Créer un nouveau cocktail au Lab
          </Button>
        </div>
      )}

      {/* ── Focus Juice of the Day Card ── */}
      {todayItem && (
        <div className="rounded-2xl border border-border/80 bg-card/90 backdrop-blur-xs p-6 shadow-sm space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-border/60">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-extrabold flex items-center justify-center border border-emerald-500/30 text-base">
                J{todayItem.day}
              </div>
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {displayedDayNum === activeDay ? "Prescription du jour" : `Détail du Jour ${displayedDayNum}`}
                </span>
                <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                  <span>{todayItem.title}</span>
                  <span className="text-xs font-normal text-muted-foreground">({todayItem.focus})</span>
                </h3>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground border border-border/60">
                <TimingIcon className="w-3.5 h-3.5 text-primary" />
                {timingLabel}
              </span>
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                {todayItem.bottleSize}
              </span>
            </div>
          </div>

          {/* Juice Recipe & Ingredients */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Recette du jour :
                </p>
                <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                  {todayItem.juiceName}
                </span>
              </div>

              <div className="flex flex-wrap gap-2">
                {todayItem.fruits.map((fruitName, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium bg-muted/80 text-foreground border border-border/60"
                  >
                    <Leaf className="w-3 h-3 text-emerald-500" />
                    {fruitName}
                  </span>
                ))}
              </div>

              {todayItem.instructions && (
                <div className="p-3 rounded-xl bg-muted/40 border border-border/40 text-xs text-muted-foreground flex items-start gap-2">
                  <Droplets className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-foreground">Conseil de dégustation :</strong> {todayItem.instructions}
                  </div>
                </div>
              )}
            </div>

            {/* NutriFYS Tip */}
            <div className="flex flex-col justify-between p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-950 dark:text-amber-200">
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-amber-700 dark:text-amber-300">
                  <Sparkles className="w-4 h-4" />
                  <span className="text-xs font-bold uppercase tracking-wider">
                    Le Mot du Coach NutriFYS
                  </span>
                </div>
                <p className="text-xs leading-relaxed">
                  {todayItem.nutrifysAdvice || "Consommez votre jus frais lentement pour favoriser l'assimilation complète des micro-nutriments vivants."}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-amber-500/20 flex items-center justify-between">
                <span className="text-[11px] text-amber-800/80 dark:text-amber-300/80">
                  Pas encore commandé ?
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleOrderJuice(todayItem)}
                  className="text-xs h-8 border-amber-500/40 text-amber-900 dark:text-amber-200 hover:bg-amber-500/15"
                >
                  <ShoppingBag className="w-3 h-3 mr-1" />
                  Commander ce jus
                </Button>
              </div>
            </div>
          </div>

          {/* ── Check-in Action Bar ── */}
          <div className="pt-4 border-t border-border/60 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-xs text-muted-foreground text-center sm:text-left">
              {isTodayChecked ? (
                <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold">
                  <CheckCircle2 className="w-4 h-4" />
                  Bravo ! Le Jour {displayedDayNum} a été validé.
                </span>
              ) : (
                <span>Avez-vous bu votre jus pour ce Jour {displayedDayNum} ?</span>
              )}
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              {isTodayChecked ? (
                <Button
                  disabled
                  className="w-full sm:w-auto bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 cursor-default text-xs font-semibold"
                >
                  <Check className="w-4 h-4 mr-1.5 text-emerald-600" />
                  Validé aujourd'hui
                </Button>
              ) : (
                <Button
                  onClick={() => onCheckin(displayedDayNum)}
                  disabled={isCheckingIn}
                  className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-6 shadow-md transition-all active:scale-98"
                >
                  {isCheckingIn ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                      Validation...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 mr-1.5" />
                      Valider mon jus (Jour {displayedDayNum})
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Timeline of All Days ── */}
      <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <Calendar className="w-4 h-4 text-emerald-500" />
            Parcours de la cure ({totalDays} jours)
          </h3>
          <span className="text-xs text-muted-foreground">
            Cliquez sur un jour pour l'afficher ci-dessus
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
          {userProgram.programSnapshot.days.map((day) => {
            const isCompleted = completedDayNumbers.has(day.day);
            const isCurrent = day.day === activeDay;
            const isSelected = displayedDayNum === day.day;

            return (
              <button
                key={day.day}
                type="button"
                onClick={() => setSelectedDayView(day.day)}
                className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all duration-150 ${
                  isSelected
                    ? 'ring-2 ring-emerald-500 border-transparent shadow-md'
                    : isCurrent
                    ? 'border-emerald-500 bg-emerald-500/10'
                    : isCompleted
                    ? 'border-border/60 bg-muted/40 opacity-90'
                    : 'border-border/60 bg-card hover:border-border'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-extrabold text-foreground">
                    Jour {day.day}
                  </span>
                  {isCompleted ? (
                    <span className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[10px]">
                      ✓
                    </span>
                  ) : isCurrent ? (
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  ) : (
                    <span className="text-muted-foreground text-[10px]">⏳</span>
                  )}
                </div>

                <p className="text-[11px] font-semibold line-clamp-1 text-foreground">
                  {day.juiceName}
                </p>
                <span className="text-[10px] text-muted-foreground mt-1 line-clamp-1">
                  {day.focus}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Manage / Abandon Program Section ── */}
      <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30 border border-border/60 text-xs">
        <span className="text-muted-foreground">
          Besoin de faire une pause ou d'interrompre votre programme ?
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCancelModalOpen(true)}
          className="text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/20"
        >
          Arrêter ce programme
        </Button>
      </div>

      {/* ── Cancel Confirmation Modal ── */}
      <Dialog open={cancelModalOpen} onOpenChange={setCancelModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-600">
              <AlertTriangle className="w-5 h-5" />
              Interrompre le programme ?
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground pt-2">
              Êtes-vous sûr de vouloir arrêter votre cure <strong>"{userProgram.programTitle}"</strong> ?
              Votre progression actuelle sera archivée et vous pourrez démarrer une nouvelle cure quand vous le souhaitez.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="mt-4 gap-2">
            <Button
              variant="outline"
              onClick={() => setCancelModalOpen(false)}
              disabled={isCancelling}
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
            >
              {isCancelling ? 'Arrêt en cours...' : 'Oui, interrompre'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
