import { useState, useMemo } from 'react';
import {
  Sparkles,
  Loader2,
  Calendar,
  Clock,
  Leaf,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  X,
  RefreshCw,
  Heart,
  AlertTriangle,
  Bookmark,
  BookmarkCheck,
} from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { HealthProfile, Fruit, Program, ProgramDayItem } from '@/entities';
import {
  generateCustomProgram,
  type GeneratedCustomProgram,
} from '@/services/ai';

const FALLBACK_PROGRAM_IMAGES = [
  'https://images.pexels.com/photos/1337825/pexels-photo-1337825.jpeg?auto=compress&cs=tinysrgb&w=1200',
  'https://images.pexels.com/photos/158053/fresh-orange-juice-squeezed-refreshing-citrus-158053.jpeg?auto=compress&cs=tinysrgb&w=1200',
  'https://images.pexels.com/photos/1435735/pexels-photo-1435735.jpeg?auto=compress&cs=tinysrgb&w=1200',
  'https://images.pexels.com/photos/109275/pexels-photo-109275.jpeg?auto=compress&cs=tinysrgb&w=1200',
];

type Props = {
  isOpen: boolean;
  onClose: () => void;
  profile: HealthProfile | null;
  fruits: Fruit[];
  onEnroll: (program: Program, startToday: boolean) => Promise<void>;
  onSaveProgram?: (program: Program) => Promise<void>;
  isEnrolling: boolean;
  bottlePrice?: number;
};

export function NutrifysCustomProgramModal({
  isOpen,
  onClose,
  profile,
  fruits,
  onEnroll,
  onSaveProgram,
  isEnrolling,
  bottlePrice = 1800,
}: Props) {
  const [duration, setDuration] = useState<3 | 5 | 7>(3);
  const [userGoal, setUserGoal] = useState('');
  const [customPrompt, setCustomPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [generatedProgram, setGeneratedProgram] = useState<GeneratedCustomProgram | null>(null);
  const [generationStep, setGenerationStep] = useState(0);
  const [selectedDayIdx, setSelectedDayIdx] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [startingToday, setStartingToday] = useState(true);

  const activeConditions = useMemo(() => {
    return (profile?.healthConditions ?? []).filter(
      (c) => !c.toLowerCase().includes('aucune') && !c.toLowerCase().includes('none')
    );
  }, [profile?.healthConditions]);

  const activeAllergies = useMemo(() => {
    return (profile?.allergies ?? []).filter(
      (a) => !a.toLowerCase().includes('aucune') && !a.toLowerCase().includes('none')
    );
  }, [profile?.allergies]);

  const handleGenerate = async () => {
    setIsGenerating(true);
    setError(null);
    setIsSaved(false);
    setGenerationStep(1);

    const stepInterval = setInterval(() => {
      setGenerationStep((prev) => (prev < 3 ? prev + 1 : prev));
    }, 1600);

    try {
      const result = await generateCustomProgram({
        profile,
        durationDays: duration,
        availableFruits: fruits.length > 0 ? fruits : [],
        userGoal: userGoal.trim() || undefined,
        userPrompt: customPrompt.trim() || undefined,
      });
      setGeneratedProgram(result);
      setSelectedDayIdx(0);
    } catch (err: any) {
      console.error('[NutriFYS Custom Program Error]', err);
      setError(
        err.message ||
          'Une erreur est survenue lors de la formulation. Veuillez réessayer.'
      );
    } finally {
      clearInterval(stepInterval);
      setIsGenerating(false);
    }
  };

  const convertGeneratedToProgram = (gen: GeneratedCustomProgram): Program => {
    const packPrice = gen.durationDays * bottlePrice;
    const daysData: ProgramDayItem[] = gen.days.map((d, di) => ({
      dayNumber: d.dayNumber || di + 1,
      day: d.dayNumber || di + 1,
      title: d.cocktailName,
      cocktailName: d.cocktailName,
      juiceName: d.cocktailName,
      cocktailImage: FALLBACK_PROGRAM_IMAGES[di % FALLBACK_PROGRAM_IMAGES.length],
      imageUrl: FALLBACK_PROGRAM_IMAGES[di % FALLBACK_PROGRAM_IMAGES.length],
      timing: d.timing,
      timingLabel: d.timingLabel,
      focus: d.focus,
      tasteProfile: d.tasteProfile,
      bottleSize: '500ml',
      benefits: d.benefits,
      fruitNames: d.fruits,
      fruits: d.fruits,
      advice: d.advice,
      nutrifysAdvice: d.advice,
      instructions: 'Conserver bien au frais. À consommer dans les 48h suivant le pressage.',
    }));

    return {
      id: `custom-nutrifys-${Date.now()}`,
      slug: `cure-sur-mesure-${gen.goal}-${Date.now()}`,
      title: gen.title,
      subtitle: gen.subtitle,
      description: gen.description,
      goal: gen.goal,
      goalLabel: gen.goalLabel,
      durationDays: gen.durationDays,
      bottlesTotal: gen.durationDays,
      bottleSize: '500ml',
      price: packPrice,
      bundlePrice: packPrice,
      badge: '100% Sur-Mesure NutriFYS',
      difficulty: 'Facile',
      imageUrl: FALLBACK_PROGRAM_IMAGES[0],
      colorAccent: 'primary',
      highlights: [
        'Formulation clinique personnalisée selon vos pathologies',
        'Exclusion stricte de vos allergènes déclarés',
        `${gen.durationDays} flacons 500ml bruts sans eau ni conservateurs`,
        'Accompagnement quotidien étape par étape',
      ],
      benefits: gen.benefits,
      isActive: true,
      days: daysData,
    };
  };

  const handleAdoptProgram = async () => {
    if (!generatedProgram) return;
    const programToEnroll = convertGeneratedToProgram(generatedProgram);
    await onEnroll(programToEnroll, startingToday);
    onClose();
  };

  const handleSaveProgram = async () => {
    if (!generatedProgram || !onSaveProgram) return;
    setIsSaving(true);
    setError(null);
    try {
      const programToSave = convertGeneratedToProgram(generatedProgram);
      await onSaveProgram(programToSave);
      setIsSaved(true);
    } catch (err: any) {
      console.error('[NutriFYS] Save program error:', err);
      setError("Impossible d'enregistrer la cure. Veuillez réessayer.");
    } finally {
      setIsSaving(false);
    }
  };

  const resetGenerator = () => {
    setGeneratedProgram(null);
    setError(null);
    setIsSaved(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="w-[calc(100%-1.25rem)] sm:w-full max-w-2xl max-h-[90vh] overflow-y-auto overflow-x-hidden p-0 border border-primary/20 shadow-2xl rounded-3xl bg-card flex flex-col min-w-0"
      >
        {/* Header: Épuré, Lumineux & Moderne FYS */}
        <div className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-4 sm:p-6 border-b border-border/70 flex items-start justify-between gap-3 shrink-0">
          <div className="space-y-1.5 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] sm:text-xs font-bold uppercase tracking-wider bg-primary text-primary-foreground shadow-xs">
                <Sparkles className="size-3.5" />
                NutriFYS • Sur-Mesure
              </span>
              {generatedProgram && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-semibold bg-muted text-foreground border border-border/60">
                  <Calendar className="size-3 text-primary" />
                  {generatedProgram.durationDays} Jours
                </span>
              )}
            </div>

            <h2 className="text-lg sm:text-2xl font-bold font-display text-foreground tracking-tight truncate">
              {generatedProgram ? generatedProgram.title : 'Concevoir ma Cure Personnalisée'}
            </h2>

            <p className="text-xs text-muted-foreground line-clamp-1">
              {generatedProgram
                ? generatedProgram.subtitle
                : 'Protocole adapté à votre métabolisme, vos allergies et vos objectifs réels.'}
            </p>
          </div>

          <button
            onClick={onClose}
            className="size-8 rounded-full bg-muted/70 hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors cursor-pointer shrink-0"
            aria-label="Fermer"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 space-y-5 min-w-0">
          {/* Error Message */}
          {error && (
            <div className="p-3.5 rounded-2xl bg-destructive/10 border border-destructive/25 text-destructive text-xs flex items-center gap-2.5">
              <AlertCircle className="size-4 shrink-0" />
              <span className="font-medium">{error}</span>
            </div>
          )}

          {/* ── STATE 1 : Generator Configuration ── */}
          {!generatedProgram && !isGenerating && (
            <div className="space-y-5">
              {/* Profile Card */}
              <div className="p-3.5 sm:p-4 rounded-2xl bg-muted/40 border border-border/70 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Heart className="size-3.5 text-primary" />
                    Votre Profil Santé
                  </span>
                  <span className="text-[10px] font-semibold text-primary">
                    Synchronisé
                  </span>
                </div>

                <div className="flex flex-wrap gap-1.5 text-xs">
                  {activeConditions.length > 0 ? (
                    activeConditions.map((c, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-primary/10 text-primary font-semibold border border-primary/20 text-xs"
                      >
                        <ShieldCheck className="size-3" />
                        {c}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-muted-foreground italic">
                      Aucune pathologie déclarée
                    </span>
                  )}

                  {activeAllergies.length > 0 &&
                    activeAllergies.map((a, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-destructive/10 text-destructive font-semibold border border-destructive/20 text-xs"
                      >
                        <AlertTriangle className="size-3" />
                        Sans {a}
                      </span>
                    ))}
                </div>
              </div>

              {/* Duration Choice */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                  <Calendar className="size-3.5 text-primary" />
                  Durée de la cure
                </label>
                <div className="grid grid-cols-3 gap-2 sm:gap-3">
                  {(
                    [
                      { days: 3, label: '3 Jours', desc: 'Express Détox' },
                      { days: 5, label: '5 Jours', desc: 'Intensif Santé' },
                      { days: 7, label: '7 Jours', desc: 'Transformation' },
                    ] as const
                  ).map((item) => {
                    const isSelected = duration === item.days;
                    return (
                      <button
                        key={item.days}
                        type="button"
                        onClick={() => setDuration(item.days)}
                        className={`p-3 rounded-2xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                          isSelected
                            ? 'border-primary bg-primary/10 ring-2 ring-primary/30 shadow-xs'
                            : 'border-border/70 bg-card hover:border-primary/40'
                        }`}
                      >
                        <span className="text-sm font-bold font-display text-foreground">
                          {item.label}
                        </span>
                        <span className="text-[10px] text-muted-foreground mt-0.5">
                          {item.desc}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Optional Inputs */}
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1">
                    Objectif principal (optionnel)
                  </label>
                  <Input
                    placeholder="Ex: Ventre plat, vitalité, digestion légère..."
                    value={userGoal}
                    onChange={(e) => setUserGoal(e.target.value)}
                    className="h-10 text-xs rounded-xl bg-background border-border/80"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1">
                    Préférences ou intolérances particulières (optionnel)
                  </label>
                  <textarea
                    placeholder="Ex: Éviter les agrumes le matin, préférer le gingembre doux..."
                    value={customPrompt}
                    onChange={(e) => setCustomPrompt(e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-background border border-border/80 resize-none focus:outline-none focus:ring-2 focus:ring-primary/40 text-foreground"
                  />
                </div>
              </div>

              {/* Formulate Button */}
              <div className="pt-1">
                <Button
                  onClick={handleGenerate}
                  className="w-full rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs sm:text-sm h-12 shadow-md transition-all active:scale-98 cursor-pointer gap-2"
                >
                  <Sparkles className="size-4" />
                  Formuler ma cure avec NutriFYS
                  <ArrowRight className="size-4 ml-auto" />
                </Button>
              </div>
            </div>
          )}

          {/* ── STATE 2 : Generating ── */}
          {isGenerating && (
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-5 min-w-0">
              <div className="relative">
                <div className="size-16 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center animate-pulse">
                  <Sparkles className="size-8 text-primary animate-spin" />
                </div>
                <div className="absolute inset-0 rounded-full border-2 border-primary border-t-transparent animate-spin" />
              </div>

              <div className="space-y-1.5 max-w-sm">
                <h3 className="text-base font-bold font-display text-foreground">
                  NutriFYS élabore votre protocole...
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {generationStep === 1 && 'Validation de vos conditions et exclusions allergènes...'}
                  {generationStep === 2 && 'Sélection des fruits frais compatibles...'}
                  {generationStep >= 3 && 'Calibration des portions et conseils nutritionnels...'}
                </p>
              </div>

              <div className="flex items-center gap-1.5">
                {[1, 2, 3].map((step) => (
                  <span
                    key={step}
                    className={`size-2 rounded-full transition-all duration-300 ${
                      generationStep >= step ? 'bg-primary scale-110' : 'bg-muted'
                    }`}
                  />
                ))}
              </div>
            </div>
          )}

          {/* ── STATE 3 : Generated Custom Program ── */}
          {generatedProgram && !isGenerating && (
            <div className="space-y-5 min-w-0">
              {/* Refined Clinical Validation Card (Épurée, sans gros pavé de texte) */}
              <div className="p-4 rounded-2xl bg-primary/5 border border-primary/20 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-primary uppercase tracking-wider">
                    <ShieldCheck className="size-4" />
                    Validation Clinique NutriFYS
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-primary text-primary-foreground shadow-xs">
                    {generatedProgram.compatibilityScore}% Compatible
                  </span>
                </div>

                {/* Concise Rationale (1-2 sentences) */}
                <p className="text-xs text-foreground/90 font-medium leading-relaxed">
                  {generatedProgram.clinicalRationale}
                </p>

                {/* Key Benefits Pills */}
                {generatedProgram.benefits && generatedProgram.benefits.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-2 border-t border-primary/10">
                    {generatedProgram.benefits.map((b, bi) => (
                      <span
                        key={bi}
                        className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[11px] font-semibold bg-card text-foreground border border-border/70 shadow-xs"
                      >
                        <CheckCircle2 className="size-3 text-primary shrink-0" />
                        {b}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Day Selector & Daily Recipe */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Calendar className="size-3.5 text-primary" />
                    Programme {generatedProgram.durationDays} Jours
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    Cliquez sur un jour pour voir le jus
                  </span>
                </div>

                {/* Day tabs */}
                <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                  {generatedProgram.days.map((day, idx) => {
                    const isSelected = selectedDayIdx === idx;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setSelectedDayIdx(idx)}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-primary text-primary-foreground shadow-xs'
                            : 'bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground'
                        }`}
                      >
                        Jour {day.dayNumber || idx + 1}
                      </button>
                    );
                  })}
                </div>

                {/* Day Card */}
                {generatedProgram.days[selectedDayIdx] && (
                  <div className="p-4 rounded-2xl bg-card border border-border/80 shadow-xs space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/50 pb-2.5">
                      <div className="space-y-0.5">
                        <span className="text-[10px] uppercase font-bold text-primary block">
                          {generatedProgram.days[selectedDayIdx].focus}
                        </span>
                        <h4 className="text-sm sm:text-base font-bold font-display text-foreground">
                          {generatedProgram.days[selectedDayIdx].cocktailName}
                        </h4>
                      </div>
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-muted text-foreground">
                        <Clock className="size-3 text-primary" />
                        {generatedProgram.days[selectedDayIdx].timingLabel}
                      </span>
                    </div>

                    {/* Ingrédients */}
                    <div className="space-y-1.5">
                      <span className="text-[10px] uppercase font-bold text-muted-foreground">
                        Fruits recommandés (500ml) :
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {generatedProgram.days[selectedDayIdx].fruits.map((f, fi) => (
                          <span
                            key={fi}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-muted/50 border border-border/60 text-foreground"
                          >
                            <Leaf className="size-3 text-primary" />
                            {f}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Taste & Advice */}
                    {generatedProgram.days[selectedDayIdx].tasteProfile && (
                      <p className="text-[11px] text-muted-foreground italic">
                        Saveur : {generatedProgram.days[selectedDayIdx].tasteProfile}
                      </p>
                    )}

                    <div className="p-2.5 rounded-xl bg-muted/30 border border-border/40 text-xs text-foreground/90 flex items-start gap-2">
                      <Sparkles className="size-3.5 text-primary shrink-0 mt-0.5" />
                      <span className="text-[11px] leading-relaxed">
                        {generatedProgram.days[selectedDayIdx].advice}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Start Today or Tomorrow */}
              <div className="p-3 rounded-2xl bg-muted/30 border border-border/60 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-foreground block">
                    Démarrage du programme
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {startingToday ? 'Aujourd’hui (Jour 1)' : 'Demain matin'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setStartingToday(!startingToday)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    startingToday
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground border border-border'
                  }`}
                >
                  {startingToday ? 'Aujourd’hui' : 'Demain'}
                </button>
              </div>

              {/* Saved feedback badge */}
              {isSaved && (
                <div className="p-3 rounded-xl bg-primary/10 border border-primary/30 text-primary text-xs flex items-center gap-2 animate-pop-in-cute">
                  <BookmarkCheck className="size-4 shrink-0" />
                  <span className="font-semibold">
                    Cure enregistrée avec succès dans votre liste de programmes !
                  </span>
                </div>
              )}

              {/* Actions Footer: Enregistrer, Re-formuler, Démarrer */}
              <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={resetGenerator}
                  className="rounded-xl text-xs cursor-pointer h-10 order-3 sm:order-1"
                >
                  <RefreshCw className="size-3.5 mr-1.5" />
                  Re-formuler
                </Button>

                {onSaveProgram && (
                  <Button
                    variant="outline"
                    disabled={isSaving || isSaved}
                    onClick={handleSaveProgram}
                    className="rounded-xl text-xs font-bold border-primary/40 text-primary hover:bg-primary/10 h-10 cursor-pointer order-2 gap-1.5"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="size-3.5 animate-spin" />
                        Enregistrement...
                      </>
                    ) : isSaved ? (
                      <>
                        <BookmarkCheck className="size-3.5" />
                        Enregistré
                      </>
                    ) : (
                      <>
                        <Bookmark className="size-3.5" />
                        Enregistrer dans mes programmes
                      </>
                    )}
                  </Button>
                )}

                <Button
                  disabled={isEnrolling}
                  onClick={handleAdoptProgram}
                  className="rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs sm:text-sm h-11 shadow-md transition-all active:scale-98 cursor-pointer gap-2 flex-1 order-1 sm:order-3"
                >
                  {isEnrolling ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Activation...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="size-4" />
                      Démarrer maintenant
                      <ArrowRight className="size-4 ml-auto" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
