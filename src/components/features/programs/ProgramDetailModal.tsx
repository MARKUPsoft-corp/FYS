import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Sparkles,
  Calendar,
  Clock,
  CheckCircle2,
  Leaf,
  Droplets,
  HeartPulse,
  Flame,
  Shield,
  Sun,
  Coffee,
  ChevronDown,
  ChevronUp,
  MessageCircle,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import {
  type Program,
  PROGRAM_TIMING_LABELS,
  type ProgramTiming,
} from '@/entities';

interface Props {
  program: Program | null;
  isOpen: boolean;
  onClose: () => void;
  onEnroll: (program: Program, startingToday: boolean) => Promise<void>;
  isEnrolling?: boolean;
  hasActiveProgram?: boolean;
  activeProgramTitle?: string;
}

const GOAL_ICONS: Record<string, any> = {
  detox: Leaf,
  immunity: Shield,
  digestion: HeartPulse,
  energy: Flame,
  weight_loss: Flame,
  wellness: Sparkles,
};

const TIMING_ICONS: Record<ProgramTiming, any> = {
  morning_fasting: Sun,
  mid_morning: Coffee,
  lunch_substitute: Droplets,
  afternoon_boost: Flame,
  dinner_light: Clock,
  before_bed: Clock,
};

export function ProgramDetailModal({
  program,
  isOpen,
  onClose,
  onEnroll,
  isEnrolling = false,
  hasActiveProgram = false,
  activeProgramTitle,
}: Props) {
  const [startingToday, setStartingToday] = useState(true);
  const [expandedDay, setExpandedDay] = useState<number | null>(1);

  if (!program) return null;

  const GoalIcon = GOAL_ICONS[program.goal] || Sparkles;

  const handleEnrollClick = async () => {
    await onEnroll(program, startingToday);
  };

  const whatsappMessage = encodeURIComponent(
    `Bonjour FYS ! Je souhaite commander le pack pour le programme "${program.title}" (${program.durationDays} jours, ${program.bundlePrice?.toLocaleString() ?? 5000} XAF). Pouvez-vous m'aider pour la livraison ?`
  );
  const whatsappUrl = `https://wa.me/237699000000?text=${whatsappMessage}`; // Can be customized or synced with settings

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0 border border-border/80 shadow-2xl rounded-2xl bg-background/95 backdrop-blur-md">
        {/* Header Hero Banner */}
        <div className="relative p-6 bg-gradient-to-br from-emerald-500/15 via-teal-500/10 to-primary/5 border-b border-border/60">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
              <GoalIcon className="w-3.5 h-3.5" />
              {program.goal.toUpperCase()}
            </span>
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-primary/15 text-primary border border-primary/30">
              <Calendar className="w-3.5 h-3.5" />
              {program.durationDays} jours
            </span>
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground border border-border/60">
              Difficulté : {program.difficulty}
            </span>
          </div>

          <DialogHeader className="text-left space-y-1">
            <DialogTitle className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <span>{program.title}</span>
            </DialogTitle>
            <DialogDescription className="text-base text-muted-foreground">
              {program.subtitle}
            </DialogDescription>
          </DialogHeader>

          {/* Pricing Pack Highlight */}
          {program.bundlePrice && (
            <div className="mt-4 flex items-center justify-between p-3.5 rounded-xl bg-background/80 border border-emerald-500/30 shadow-xs">
              <div>
                <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">
                  Pack Cure Complète ({program.durationDays} bouteilles fraîches)
                </p>
                <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                  {program.bundlePrice.toLocaleString()} XAF
                </p>
              </div>
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                Commander le pack
              </a>
            </div>
          )}
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6">
          {/* Description & Benefits */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              À propos de la cure
            </h3>
            <p className="text-sm text-foreground/90 leading-relaxed">
              {program.description}
            </p>

            {program.benefits && program.benefits.length > 0 && (
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                {program.benefits.map((benefit, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-2 p-2.5 rounded-lg bg-muted/40 border border-border/40 text-xs text-foreground/90"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span>{benefit}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Day by Day Plan */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <span>Programme jour par jour ({program.days.length} étapes)</span>
              </h3>
              <span className="text-xs text-muted-foreground">
                Cliquez sur un jour pour déplier
              </span>
            </div>

            <div className="space-y-3">
              {program.days.map((day) => {
                const isExpanded = expandedDay === day.day;
                const TimingIcon = TIMING_ICONS[day.timing] || Clock;
                const timingLabel = PROGRAM_TIMING_LABELS[day.timing] || day.timing;

                return (
                  <div
                    key={day.day}
                    className={`rounded-xl border transition-all duration-200 overflow-hidden ${
                      isExpanded
                        ? 'border-emerald-500/50 bg-emerald-50/20 dark:bg-emerald-950/10 shadow-xs'
                        : 'border-border/60 bg-card/60 hover:border-border'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setExpandedDay(isExpanded ? null : day.day)}
                      className="w-full text-left p-3.5 flex items-center justify-between gap-3 focus:outline-hidden"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold shrink-0 ${
                            isExpanded
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : 'bg-muted text-foreground'
                          }`}
                        >
                          J{day.day}
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-foreground flex items-center gap-2">
                            <span>{day.title}</span>
                            <span className="text-xs font-normal text-muted-foreground">
                              • {day.focus}
                            </span>
                          </div>
                          <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1 mt-0.5">
                            <TimingIcon className="w-3 h-3" />
                            <span>{day.juiceName}</span>
                            <span className="text-muted-foreground">({day.bottleSize})</span>
                          </p>
                        </div>
                      </div>

                      <div className="text-muted-foreground">
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="px-4 pb-4 pt-1 space-y-3 border-t border-border/40 text-xs">
                        {/* Recipe Ingredients */}
                        <div>
                          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                            Ingrédients de la potion :
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {day.fruits.map((f, fi) => (
                              <span
                                key={fi}
                                className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-medium border border-emerald-500/20"
                              >
                                {f}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Timing & Instructions */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-muted-foreground">
                          <div className="flex items-center gap-1.5 p-2 rounded-lg bg-muted/40">
                            <Clock className="w-3.5 h-3.5 text-primary shrink-0" />
                            <span><strong>Moment :</strong> {timingLabel}</span>
                          </div>
                          {day.instructions && (
                            <div className="flex items-center gap-1.5 p-2 rounded-lg bg-muted/40">
                              <Droplets className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                              <span>{day.instructions}</span>
                            </div>
                          )}
                        </div>

                        {/* NutriFYS Tip */}
                        {day.nutrifysAdvice && (
                          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-900 dark:text-amber-200 flex items-start gap-2">
                            <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                            <div>
                              <strong className="font-semibold block text-[11px] uppercase tracking-wider text-amber-700 dark:text-amber-300">
                                Conseil NutriFYS
                              </strong>
                              <p className="text-xs leading-relaxed mt-0.5">
                                {day.nutrifysAdvice}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Active Program Conflict Warning */}
          {hasActiveProgram && (
            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-300 flex items-start gap-2.5 text-xs">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong>Tu as déjà un programme en cours :</strong> "{activeProgramTitle}".
                <p className="mt-0.5 text-muted-foreground">
                  Tu peux continuer à suivre ta cure actuelle dans ton espace, ou la terminer pour en démarrer une autre.
                </p>
              </div>
            </div>
          )}

          {/* Starting Day Selection */}
          {!hasActiveProgram && (
            <div className="p-4 rounded-xl bg-muted/40 border border-border/60 space-y-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">
                Quand souhaites-tu débuter ?
              </span>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setStartingToday(true)}
                  className={`p-3 rounded-xl text-left border text-xs font-medium transition-all ${
                    startingToday
                      ? 'border-emerald-600 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200 shadow-xs'
                      : 'border-border/60 bg-background text-muted-foreground hover:border-border'
                  }`}
                >
                  <span className="block font-bold text-sm text-foreground mb-0.5">
                    Aujourd'hui
                  </span>
                  Le Jour 1 commence immédiatement
                </button>
                <button
                  type="button"
                  onClick={() => setStartingToday(false)}
                  className={`p-3 rounded-xl text-left border text-xs font-medium transition-all ${
                    !startingToday
                      ? 'border-emerald-600 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200 shadow-xs'
                      : 'border-border/60 bg-background text-muted-foreground hover:border-border'
                  }`}
                >
                  <span className="block font-bold text-sm text-foreground mb-0.5">
                    Demain matin
                  </span>
                  Départ frais dès le réveil
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-muted/30 border-t border-border/60 flex items-center justify-between gap-3">
          <Button variant="ghost" onClick={onClose} disabled={isEnrolling} className="text-xs">
            Fermer
          </Button>

          <div className="flex items-center gap-2">
            {!hasActiveProgram && (
              <Button
                onClick={handleEnrollClick}
                disabled={isEnrolling}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs px-5 shadow-xs"
              >
                {isEnrolling ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                    Inscription...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                    Démarrer ce programme
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
