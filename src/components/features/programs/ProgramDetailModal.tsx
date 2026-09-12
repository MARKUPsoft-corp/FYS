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
  MessageCircle,
  AlertCircle,
  Loader2,
  Check,
  X,
  ArrowRight,
  ChevronRight,
  ShieldCheck,
  Apple,
} from 'lucide-react';
import {
  type Program,
  type ProgramDayItem,
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
  glow: Sparkles,
};

const TIMING_ICONS: Record<string, any> = {
  morning_empty_stomach: Sun,
  morning: Coffee,
  afternoon: Flame,
  evening: Clock,
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
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);

  if (!program) return null;

  const GoalIcon = GOAL_ICONS[program.goal] || Sparkles;
  const currentDayItem = program.days[selectedDayIndex] || program.days[0];
  const TimingIcon = TIMING_ICONS[currentDayItem.timing] || Clock;
  const timingLabel = currentDayItem.timingLabel || PROGRAM_TIMING_LABELS[currentDayItem.timing] || 'Au réveil';

  const handleEnrollClick = async () => {
    await onEnroll(program, startingToday);
  };

  const packPrice = program.bundlePrice || program.price;
  const whatsappMessage = encodeURIComponent(
    `Bonjour FYS ! Je souhaite commander la cure complète "${program.title}" (${program.durationDays} jours, ${packPrice.toLocaleString()} XAF). Pouvez-vous organiser ma livraison ?`
  );
  const whatsappUrl = `https://wa.me/237699000000?text=${whatsappMessage}`;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto p-0 border border-emerald-500/20 shadow-2xl rounded-3xl bg-background/98 backdrop-blur-xl overflow-x-hidden">
        {/* ── Top Hero Visual Banner ── */}
        <div className="relative h-64 sm:h-72 w-full overflow-hidden bg-muted">
          <img
            src={program.imageUrl}
            alt={program.title}
            className="w-full h-full object-cover object-center transform hover:scale-105 transition-transform duration-1000 ease-out"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-black/30" />

          {/* Floating Badges */}
          <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-10">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-wider bg-emerald-500/90 text-white backdrop-blur-md shadow-lg border border-emerald-400/40">
                <GoalIcon className="w-3.5 h-3.5" />
                {program.goalLabel || program.goal}
              </span>
              <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold bg-white/80 dark:bg-black/80 text-foreground backdrop-blur-md shadow-sm border border-border/40">
                <Calendar className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                {program.durationDays} jours
              </span>
              {program.badge && (
                <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold bg-amber-500 text-white shadow-md">
                  <Sparkles className="w-3.5 h-3.5" />
                  {program.badge}
                </span>
              )}
            </div>

            <button
              onClick={onClose}
              className="size-9 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center backdrop-blur-md transition-colors"
            >
              <X className="size-5" />
            </button>
          </div>

          {/* Banner Title */}
          <div className="absolute bottom-4 left-5 right-5 z-10 space-y-1">
            <h2 className="text-2xl sm:text-3xl font-extrabold font-display tracking-tight text-foreground">
              {program.title}
            </h2>
            <p className="text-xs sm:text-sm font-medium text-emerald-600 dark:text-emerald-400 max-w-xl">
              {program.subtitle}
            </p>
          </div>
        </div>

        {/* ── Modal Content Body ── */}
        <div className="p-5 sm:p-7 space-y-7">
          {/* Key Value Props Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-2xl bg-muted/40 border border-border/60 text-center">
            <div>
              <p className="text-[10px] uppercase font-bold text-muted-foreground">Flacons</p>
              <p className="text-base font-black text-foreground mt-0.5">{program.durationDays}x {program.bottleSize}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-muted-foreground">Pressage</p>
              <p className="text-base font-black text-emerald-600 dark:text-emerald-400 mt-0.5">100% à froid</p>
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-muted-foreground">Sucre / Eau</p>
              <p className="text-base font-black text-foreground mt-0.5">0% Ajouté</p>
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-muted-foreground">Pack complet</p>
              <p className="text-base font-black text-emerald-600 dark:text-emerald-400 mt-0.5">{packPrice.toLocaleString()} XAF</p>
            </div>
          </div>

          {/* Description & Benefits */}
          <div className="space-y-3">
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              {program.description}
            </p>
            {program.benefits && program.benefits.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                {program.benefits.map((b, bi) => (
                  <div
                    key={bi}
                    className="flex items-center gap-2.5 p-3 rounded-xl bg-emerald-500/5 dark:bg-emerald-950/20 border border-emerald-500/20 text-xs font-medium text-foreground"
                  >
                    <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span>{b}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Interactive Day-by-Day Juice Explorer ── */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                <Sparkles className="size-4 text-emerald-500" />
                Déroulé des jus de votre cure
              </h3>
              <span className="text-xs font-medium text-muted-foreground">
                Jour {selectedDayIndex + 1} sur {program.days.length}
              </span>
            </div>

            {/* Day Selector Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
              {program.days.map((dayItem, index) => {
                const isSelected = selectedDayIndex === index;
                const dNum = dayItem.dayNumber || dayItem.day || index + 1;
                return (
                  <button
                    key={index}
                    type="button"
                    onClick={() => setSelectedDayIndex(index)}
                    className={`shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all duration-200 cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-600 text-white shadow-lg scale-102 ring-2 ring-emerald-400/50'
                        : 'bg-card border border-border/70 text-muted-foreground hover:text-foreground hover:border-emerald-500/40'
                    }`}
                  >
                    <span className="size-5 rounded-full bg-white/20 flex items-center justify-center text-[10px]">
                      J{dNum}
                    </span>
                    <span>{dayItem.cocktailName || dayItem.juiceName}</span>
                  </button>
                );
              })}
            </div>

            {/* Featured Juice Card for Selected Day */}
            {currentDayItem && (
              <div className="rounded-3xl border border-emerald-500/25 bg-gradient-to-br from-card to-emerald-500/5 overflow-hidden shadow-lg transition-all duration-300">
                <div className="grid grid-cols-1 md:grid-cols-5">
                  {/* Juice Photo */}
                  <div className="md:col-span-2 relative min-h-[220px] md:min-h-full overflow-hidden bg-muted">
                    <img
                      src={currentDayItem.cocktailImage || currentDayItem.imageUrl || program.imageUrl}
                      alt={currentDayItem.cocktailName || currentDayItem.juiceName}
                      className="w-full h-full object-cover object-center transform hover:scale-105 transition-transform duration-700"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t md:bg-gradient-to-r from-black/60 via-black/20 to-transparent" />
                    <div className="absolute bottom-3 left-3 right-3 text-white">
                      <span className="text-[10px] font-extrabold uppercase tracking-widest bg-black/40 px-2 py-0.5 rounded-md backdrop-blur-xs">
                        {currentDayItem.focus || 'Prescription quotidienne'}
                      </span>
                      <p className="text-base font-black leading-snug mt-1">
                        {currentDayItem.cocktailName || currentDayItem.juiceName}
                      </p>
                    </div>
                  </div>

                  {/* Juice Details */}
                  <div className="md:col-span-3 p-5 sm:p-6 flex flex-col justify-between space-y-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                          <TimingIcon className="size-3.5" />
                          {timingLabel}
                        </span>
                        <span className="text-xs font-bold text-muted-foreground">
                          Flacon de 500ml
                        </span>
                      </div>

                      {currentDayItem.tasteProfile && (
                        <p className="text-xs italic text-muted-foreground bg-muted/30 p-2.5 rounded-xl border border-border/40">
                          « {currentDayItem.tasteProfile} »
                        </p>
                      )}

                      {/* Ingredients Chips */}
                      <div>
                        <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-2">
                          Fruits & plantes bio pressés :
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {(currentDayItem.fruitNames || currentDayItem.fruits || []).map((f, fi) => (
                            <span
                              key={fi}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-500/10 text-emerald-800 dark:text-emerald-200 border border-emerald-500/20 shadow-2xs"
                            >
                              <Leaf className="size-3 text-emerald-600" />
                              {f}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* NutriFYS Advice Box */}
                      {(currentDayItem.advice || currentDayItem.nutrifysAdvice) && (
                        <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-amber-950 dark:text-amber-200 space-y-1">
                          <div className="flex items-center gap-1.5 text-amber-700 dark:text-amber-300 font-bold text-xs">
                            <Sparkles className="size-3.5 text-amber-500" />
                            <span>Conseil NutriFYS pour ce jour</span>
                          </div>
                          <p className="text-xs leading-relaxed">
                            {currentDayItem.advice || currentDayItem.nutrifysAdvice}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Active Program Alert if already enrolled in another */}
          {hasActiveProgram && (
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 flex items-start gap-3 text-xs">
              <AlertCircle className="size-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong>Vous suivez actuellement :</strong> « {activeProgramTitle} ».
                <p className="text-muted-foreground mt-0.5">
                  Pour préserver l'efficacité biologique de votre organisme, nous vous conseillons de terminer votre cure actuelle avant d'en entamer une nouvelle.
                </p>
              </div>
            </div>
          )}

          {/* Starting Day Selector */}
          {!hasActiveProgram && (
            <div className="p-4 sm:p-5 rounded-2xl bg-muted/30 border border-border/60 space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
                Quand souhaitez-vous commencer votre cure ?
              </span>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setStartingToday(true)}
                  className={`p-3.5 rounded-2xl text-left border text-xs transition-all cursor-pointer ${
                    startingToday
                      ? 'border-emerald-600 bg-emerald-500/10 text-emerald-900 dark:text-emerald-100 shadow-sm ring-1 ring-emerald-500'
                      : 'border-border/60 bg-background text-muted-foreground hover:border-border'
                  }`}
                >
                  <span className="block font-bold text-sm text-foreground mb-0.5">
                    Aujourd'hui
                  </span>
                  Le Jour 1 démarre immédiatement
                </button>

                <button
                  type="button"
                  onClick={() => setStartingToday(false)}
                  className={`p-3.5 rounded-2xl text-left border text-xs transition-all cursor-pointer ${
                    !startingToday
                      ? 'border-emerald-600 bg-emerald-500/10 text-emerald-900 dark:text-emerald-100 shadow-sm ring-1 ring-emerald-500'
                      : 'border-border/60 bg-background text-muted-foreground hover:border-border'
                  }`}
                >
                  <span className="block font-bold text-sm text-foreground mb-0.5">
                    Demain matin
                  </span>
                  Départ parfait dès le réveil
                </button>
              </div>
            </div>
          )}

          {/* Pack WhatsApp Order CTA Box */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-600/10 via-teal-600/10 to-transparent border border-emerald-500/25 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <p className="text-xs font-bold text-foreground">
                Besoin de vous faire livrer les jus frais à domicile ?
              </p>
              <p className="text-[11px] text-muted-foreground">
                Commandez le pack de {program.durationDays} jus en une seule fois auprès de notre atelier.
              </p>
            </div>
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 text-xs font-bold px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white shadow-md transition-all shrink-0 cursor-pointer"
            >
              <MessageCircle className="size-4" />
              Commander le pack ({packPrice.toLocaleString()} XAF)
            </a>
          </div>
        </div>

        {/* ── Footer Actions ── */}
        <div className="p-5 bg-card border-t border-border/60 flex items-center justify-between gap-3">
          <Button variant="ghost" onClick={onClose} disabled={isEnrolling} className="text-xs cursor-pointer">
            Fermer
          </Button>

          {!hasActiveProgram && (
            <Button
              onClick={handleEnrollClick}
              disabled={isEnrolling}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs h-11 px-7 rounded-xl shadow-lg transition-all active:scale-98 cursor-pointer"
            >
              {isEnrolling ? (
                <>
                  <Loader2 className="size-4 animate-spin mr-2" />
                  Inscription en cours...
                </>
              ) : (
                <>
                  <Sparkles className="size-4 mr-2" />
                  Démarrer ce programme ({program.durationDays} jours)
                </>
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
