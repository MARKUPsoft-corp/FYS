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
  ShieldCheck,
  Award,
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

const FALLBACK_IMAGE = 'https://images.pexels.com/photos/1337825/pexels-photo-1337825.jpeg?auto=compress&cs=tinysrgb&w=1200';

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
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto p-0 border border-primary/20 shadow-2xl rounded-3xl bg-background/98 backdrop-blur-xl overflow-x-hidden">
        {/* Top Hero Visual Banner */}
        <div className="relative h-64 sm:h-72 w-full overflow-hidden bg-muted">
          <img
            src={program.imageUrl}
            alt={program.title}
            onError={(e) => {
              (e.target as HTMLImageElement).src = FALLBACK_IMAGE;
            }}
            className="w-full h-full object-cover object-center transform hover:scale-105 transition-transform duration-1000 ease-out"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-black/35" />

          {/* Floating Badges */}
          <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-10">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider bg-primary text-primary-foreground backdrop-blur-md shadow-md">
                <GoalIcon className="size-3.5" />
                {program.goalLabel || program.goal}
              </span>
              <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold bg-card/85 text-foreground backdrop-blur-md shadow-xs border border-border/40">
                <Calendar className="size-3.5 text-primary" />
                {program.durationDays} jours
              </span>
              {program.badge && (
                <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold bg-secondary text-secondary-foreground shadow-sm">
                  <Award className="size-3.5" />
                  {program.badge}
                </span>
              )}
            </div>

            <button
              onClick={onClose}
              className="size-9 rounded-full bg-black/45 hover:bg-black/65 text-white flex items-center justify-center backdrop-blur-md transition-colors cursor-pointer"
            >
              <X className="size-5" />
            </button>
          </div>

          {/* Banner Title */}
          <div className="absolute bottom-4 left-5 right-5 z-10 space-y-1">
            <h2 className="text-2xl sm:text-3xl font-bold font-display tracking-tight text-foreground">
              {program.title}
            </h2>
            <p className="text-xs sm:text-sm font-medium text-primary max-w-xl">
              {program.subtitle}
            </p>
          </div>
        </div>

        {/* Modal Content Body */}
        <div className="p-5 sm:p-7 space-y-7">
          {/* Key Value Props Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-2xl bg-muted/40 border border-border/60 text-center">
            <div>
              <p className="text-[10px] uppercase font-bold text-muted-foreground">Flacons</p>
              <p className="text-base font-bold text-foreground mt-0.5">{program.durationDays}x {program.bottleSize}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-muted-foreground">Pressage</p>
              <p className="text-base font-bold text-primary mt-0.5">100% à froid</p>
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-muted-foreground">Sucre et eau</p>
              <p className="text-base font-bold text-foreground mt-0.5">0% ajouté</p>
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-muted-foreground">Pack complet</p>
              <p className="text-base font-bold text-primary mt-0.5">{packPrice.toLocaleString()} XAF</p>
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
                    className="flex items-center gap-2.5 p-3 rounded-xl bg-primary/5 border border-primary/15 text-xs font-medium text-foreground"
                  >
                    <CheckCircle2 className="size-4 text-primary shrink-0" />
                    <span>{b}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Interactive Day-by-Day Juice Explorer */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                <Sparkles className="size-4 text-secondary" />
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
                        ? 'bg-primary text-primary-foreground shadow-md scale-102 ring-2 ring-primary/40'
                        : 'bg-card border border-border/70 text-muted-foreground hover:text-foreground hover:border-primary/40'
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
              <div className="rounded-3xl border border-primary/20 bg-card overflow-hidden shadow-lg transition-all duration-300">
                <div className="grid grid-cols-1 md:grid-cols-5">
                  {/* Juice Photo */}
                  <div className="md:col-span-2 relative min-h-[220px] md:min-h-full overflow-hidden bg-muted">
                    <img
                      src={currentDayItem.cocktailImage || currentDayItem.imageUrl || program.imageUrl}
                      alt={currentDayItem.cocktailName || currentDayItem.juiceName}
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = FALLBACK_IMAGE;
                      }}
                      className="w-full h-full object-cover object-center transform hover:scale-105 transition-transform duration-700"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t md:bg-gradient-to-r from-black/60 via-black/20 to-transparent" />
                    <div className="absolute bottom-3 left-3 right-3 text-white">
                      <span className="text-[10px] font-bold uppercase tracking-widest bg-black/40 px-2 py-0.5 rounded-md backdrop-blur-xs">
                        {currentDayItem.focus || 'Prescription quotidienne'}
                      </span>
                      <p className="text-base font-bold leading-snug mt-1">
                        {currentDayItem.cocktailName || currentDayItem.juiceName}
                      </p>
                    </div>
                  </div>

                  {/* Juice Details */}
                  <div className="md:col-span-3 p-5 sm:p-6 flex flex-col justify-between space-y-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary bg-primary/10 px-3 py-1 rounded-full border border-primary/20">
                          <TimingIcon className="size-3.5" />
                          {timingLabel}
                        </span>
                        <span className="text-xs font-bold text-muted-foreground">
                          Flacon de 500ml
                        </span>
                      </div>

                      {currentDayItem.tasteProfile && (
                        <p className="text-xs italic text-muted-foreground bg-muted/40 p-2.5 rounded-xl border border-border/40">
                          « {currentDayItem.tasteProfile} »
                        </p>
                      )}

                      {/* Ingredients Chips */}
                      <div>
                        <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-2">
                          Fruits et plantes bruts pressés :
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {(currentDayItem.fruitNames || currentDayItem.fruits || []).map((f, fi) => (
                            <span
                              key={fi}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-primary/10 text-foreground border border-primary/20"
                            >
                              <Leaf className="size-3 text-primary" />
                              {f}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* NutriFYS Advice Box */}
                      {(currentDayItem.advice || currentDayItem.nutrifysAdvice) && (
                        <div className="p-3.5 rounded-2xl bg-secondary/10 border border-secondary/20 text-foreground space-y-1">
                          <div className="flex items-center gap-1.5 text-secondary font-bold text-xs">
                            <Sparkles className="size-3.5" />
                            <span>Conseil NutriFYS pour ce jour</span>
                          </div>
                          <p className="text-xs leading-relaxed text-muted-foreground">
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
            <div className="p-4 rounded-2xl bg-secondary/10 border border-secondary/25 text-foreground flex items-start gap-3 text-xs">
              <AlertCircle className="size-4 text-secondary shrink-0 mt-0.5" />
              <div>
                <strong className="text-foreground">Vous suivez actuellement :</strong> « {activeProgramTitle} ».
                <p className="text-muted-foreground mt-0.5">
                  Pour préserver l'efficacité biologique de votre cure, nous vous conseillons de la terminer avant d'en entamer une nouvelle.
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
                      ? 'border-primary bg-primary/10 text-foreground shadow-xs ring-1 ring-primary'
                      : 'border-border/60 bg-card text-muted-foreground hover:border-border'
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
                      ? 'border-primary bg-primary/10 text-foreground shadow-xs ring-1 ring-primary'
                      : 'border-border/60 bg-card text-muted-foreground hover:border-border'
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
          <div className="p-4 rounded-2xl bg-primary/10 border border-primary/20 flex flex-col sm:flex-row items-center justify-between gap-4">
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
              className="inline-flex items-center gap-2 text-xs font-bold px-4 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm transition-all shrink-0 cursor-pointer"
            >
              <MessageCircle className="size-4" />
              Commander le pack ({packPrice.toLocaleString()} XAF)
            </a>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-5 bg-card border-t border-border/60 flex items-center justify-between gap-3">
          <Button variant="ghost" onClick={onClose} disabled={isEnrolling} className="text-xs cursor-pointer">
            Fermer
          </Button>

          {!hasActiveProgram && (
            <Button
              onClick={handleEnrollClick}
              disabled={isEnrolling}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs h-11 px-7 rounded-xl shadow-md transition-all active:scale-98 cursor-pointer"
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
