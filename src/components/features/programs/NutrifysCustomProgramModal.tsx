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
  isEnrolling: boolean;
  bottlePrice?: number;
};

export function NutrifysCustomProgramModal({
  isOpen,
  onClose,
  profile,
  fruits,
  onEnroll,
  isEnrolling,
  bottlePrice = 1800,
}: Props) {
  const [duration, setDuration] = useState<3 | 5 | 7>(3);
  const [userGoal, setUserGoal] = useState('');
  const [customPrompt, setCustomPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
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
    setGenerationStep(1);

    const stepInterval = setInterval(() => {
      setGenerationStep((prev) => (prev < 3 ? prev + 1 : prev));
    }, 1800);

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

  const handleAdoptProgram = async () => {
    if (!generatedProgram) return;

    // Convert GeneratedCustomProgram to full Program entity
    const packPrice = generatedProgram.durationDays * bottlePrice;
    const daysData: ProgramDayItem[] = generatedProgram.days.map((d, di) => ({
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

    const programToEnroll: Program = {
      id: `custom-nutrifys-${Date.now()}`,
      slug: `cure-sur-mesure-${generatedProgram.goal}-${Date.now()}`,
      title: generatedProgram.title,
      subtitle: generatedProgram.subtitle,
      description: generatedProgram.description,
      goal: generatedProgram.goal,
      goalLabel: generatedProgram.goalLabel,
      durationDays: generatedProgram.durationDays,
      bottlesTotal: generatedProgram.durationDays,
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
        `${generatedProgram.durationDays} flacons 500ml bruts sans eau ni conservateurs`,
        'Accompagnement quotidien étape par étape',
      ],
      benefits: generatedProgram.benefits,
      isActive: true,
      days: daysData,
    };

    await onEnroll(programToEnroll, startingToday);
    onClose();
  };

  const resetGenerator = () => {
    setGeneratedProgram(null);
    setError(null);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="w-[calc(100%-1.25rem)] sm:w-full max-w-2xl max-h-[92vh] overflow-y-auto overflow-x-hidden p-0 border border-primary/30 shadow-2xl rounded-3xl bg-background flex flex-col min-w-0"
      >
        {/* Header Ribbon */}
        <div className="relative overflow-hidden bg-gradient-to-br from-[#1F3326] via-[#28422F] to-[#142219] text-white p-4 sm:p-6 flex items-start justify-between gap-3 shrink-0 border-b border-primary/20">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] sm:text-xs font-bold uppercase tracking-wider bg-secondary text-secondary-foreground shadow-xs">
                <Sparkles className="size-3.5 fill-current" />
                NutriFYS Intelligence Clinique
              </span>
              <span className="text-[11px] font-bold text-primary-foreground/80">
                Approche Personnalisée
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold font-display text-white">
              {generatedProgram ? generatedProgram.title : 'Concevoir ma Cure Sur-Mesure'}
            </h2>
            <p className="text-xs text-white/80 line-clamp-2">
              {generatedProgram
                ? generatedProgram.subtitle
                : 'NutriFYS élabore un protocole jour par jour adapté à votre santé, vos allergies et vos fruits préférés.'}
            </p>
          </div>

          <button
            onClick={onClose}
            className="size-8 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center transition-colors cursor-pointer shrink-0"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 space-y-6 min-w-0">
          {/* Error Message Banner */}
          {error && (
            <div className="p-3.5 rounded-2xl bg-destructive/10 border border-destructive/30 text-destructive text-xs flex items-center gap-2.5">
              <AlertCircle className="size-4 shrink-0" />
              <span className="font-semibold">{error}</span>
            </div>
          )}

          {/* ── STATE 1 : Generator Configuration Screen ── */}
          {!generatedProgram && !isGenerating && (
            <div className="space-y-5">
              {/* Profile Snapshot Banner */}
              <div className="p-4 rounded-2xl bg-muted/40 border border-border/80 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Heart className="size-3.5 text-primary" />
                    Votre Profil Santé Détecté
                  </span>
                  <span className="text-[10px] font-semibold text-primary">
                    Synchronisé automatiquement
                  </span>
                </div>

                <div className="flex flex-wrap gap-2 text-xs">
                  {activeConditions.length > 0 ? (
                    activeConditions.map((c, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-primary/10 text-primary font-semibold border border-primary/20"
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
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-destructive/10 text-destructive font-semibold border border-destructive/20"
                      >
                        <AlertTriangle className="size-3" />
                        Exclure : {a}
                      </span>
                    ))}
                </div>
              </div>

              {/* Duration Selection */}
              <div className="space-y-2.5">
                <label className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                  <Calendar className="size-3.5 text-primary" />
                  Durée de votre protocole :
                </label>
                <div className="grid grid-cols-3 gap-2.5">
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
                            ? 'border-primary bg-primary/10 ring-2 ring-primary/40 shadow-xs'
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

              {/* Optional Refinements */}
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-bold text-foreground block mb-1">
                    Objectif principal spécifique (optionnel) :
                  </label>
                  <Input
                    placeholder="Ex: Détox foie, regain d'énergie, ventre plat..."
                    value={userGoal}
                    onChange={(e) => setUserGoal(e.target.value)}
                    className="h-10 text-xs rounded-xl bg-card border-border/80"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-foreground block mb-1">
                    Remarques ou symptômes particuliers (optionnel) :
                  </label>
                  <textarea
                    placeholder="Ex: 'J'ai des reflux quand je bois des agrumes le matin', 'Je préfère les goûts doux'..."
                    value={customPrompt}
                    onChange={(e) => setCustomPrompt(e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-card border border-border/80 resize-none focus:outline-none focus:ring-2 focus:ring-primary/40 text-foreground"
                  />
                </div>
              </div>

              {/* CTA Formulate */}
              <div className="pt-2">
                <Button
                  onClick={handleGenerate}
                  className="w-full rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs sm:text-sm h-12 shadow-md transition-all active:scale-98 cursor-pointer gap-2"
                >
                  <Sparkles className="size-4" />
                  Formuler ma cure personnalisée avec NutriFYS
                  <ArrowRight className="size-4 ml-auto" />
                </Button>
              </div>
            </div>
          )}

          {/* ── STATE 2 : Generation in progress ── */}
          {isGenerating && (
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-6 min-w-0">
              <div className="relative">
                <div className="size-20 rounded-full bg-primary/10 border-2 border-primary/30 flex items-center justify-center animate-pulse">
                  <Sparkles className="size-10 text-primary animate-spin" />
                </div>
                <div className="absolute inset-0 rounded-full border-2 border-primary border-t-transparent animate-spin" />
              </div>

              <div className="space-y-2 max-w-sm">
                <h3 className="text-base font-bold font-display text-foreground">
                  NutriFYS formule votre cure clinique...
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {generationStep === 1 &&
                    'Analyse des conditions médicales et verrouillage des exclusions allergènes...'}
                  {generationStep === 2 &&
                    'Recherche des fruits compatibles dans les récoltes fraîches FYS...'}
                  {generationStep >= 3 &&
                    'Calibration des dosages et rédaction des recommandations posologiques...'}
                </p>
              </div>

              <div className="flex items-center gap-1.5">
                {[1, 2, 3].map((step) => (
                  <span
                    key={step}
                    className={`size-2.5 rounded-full transition-all duration-300 ${
                      generationStep >= step ? 'bg-primary scale-110' : 'bg-muted'
                    }`}
                  />
                ))}
              </div>
            </div>
          )}

          {/* ── STATE 3 : Generated Custom Program Display ── */}
          {generatedProgram && !isGenerating && (
            <div className="space-y-6 min-w-0">
              {/* Compatibility & Score Banner */}
              <div className="p-4 rounded-2xl bg-primary/10 border border-primary/25 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-primary uppercase tracking-wider">
                    <ShieldCheck className="size-4" />
                    Validation Clinique NutriFYS
                  </span>
                  <span className="px-2.5 py-1 rounded-full text-xs font-extrabold bg-primary text-primary-foreground shadow-xs">
                    {generatedProgram.compatibilityScore}% Compatible
                  </span>
                </div>
                <p className="text-xs text-foreground/90 leading-relaxed font-medium">
                  {generatedProgram.clinicalRationale}
                </p>
              </div>

              {/* Day Selector Tabs */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Calendar className="size-3.5 text-primary" />
                    Parcours des {generatedProgram.durationDays} Jours :
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    Cliquez sur un jour pour examiner sa recette
                  </span>
                </div>

                <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                  {generatedProgram.days.map((day, idx) => {
                    const isSelected = selectedDayIdx === idx;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setSelectedDayIdx(idx)}
                        className={`px-3.5 py-2 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-primary text-primary-foreground shadow-sm'
                            : 'bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground'
                        }`}
                      >
                        Jour {day.dayNumber || idx + 1}
                      </button>
                    );
                  })}
                </div>

                {/* Selected Day Card */}
                {generatedProgram.days[selectedDayIdx] && (
                  <div className="p-4 rounded-2xl bg-card border border-border/80 shadow-xs space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/50 pb-2.5">
                      <div className="space-y-0.5">
                        <span className="text-[10px] uppercase font-bold text-primary block">
                          {generatedProgram.days[selectedDayIdx].focus}
                        </span>
                        <h4 className="text-base font-bold font-display text-foreground">
                          {generatedProgram.days[selectedDayIdx].cocktailName}
                        </h4>
                      </div>
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-muted text-foreground">
                        <Clock className="size-3 text-primary" />
                        {generatedProgram.days[selectedDayIdx].timingLabel}
                      </span>
                    </div>

                    {/* Fruits list */}
                    <div className="space-y-1.5">
                      <span className="text-[10px] uppercase font-bold text-muted-foreground">
                        Ingrédients prescrits (500ml) :
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {generatedProgram.days[selectedDayIdx].fruits.map((f, fi) => (
                          <span
                            key={fi}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-muted/60 border border-border/60 text-foreground"
                          >
                            <Leaf className="size-3 text-primary" />
                            {f}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Taste Profile */}
                    <p className="text-xs text-muted-foreground italic">
                      Profil gustatif : « {generatedProgram.days[selectedDayIdx].tasteProfile} »
                    </p>

                    {/* Advice */}
                    <div className="p-2.5 rounded-xl bg-muted/40 border border-border/40 text-xs text-foreground/90 flex items-start gap-2">
                      <Sparkles className="size-3.5 text-secondary shrink-0 mt-0.5" />
                      <span>{generatedProgram.days[selectedDayIdx].advice}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Start Today Toggle */}
              <div className="p-3 rounded-xl bg-muted/30 border border-border/60 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-foreground block">
                    Démarrage du coaching FYS
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {startingToday ? 'Aujourd’hui (Jour 1 immédiat)' : 'Demain matin'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setStartingToday(!startingToday)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    startingToday
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground border border-border'
                  }`}
                >
                  {startingToday ? 'Aujourd’hui' : 'Demain'}
                </button>
              </div>

              {/* Actions Footer */}
              <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
                <Button
                  variant="outline"
                  onClick={resetGenerator}
                  className="w-full sm:w-auto text-xs rounded-xl cursor-pointer"
                >
                  <RefreshCw className="size-3.5 mr-1.5" />
                  Re-formuler
                </Button>

                <Button
                  disabled={isEnrolling}
                  onClick={handleAdoptProgram}
                  className="w-full sm:flex-1 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs sm:text-sm h-12 shadow-md transition-all active:scale-98 cursor-pointer gap-2"
                >
                  {isEnrolling ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Activation en cours...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="size-4" />
                      Adopter ce programme sur-mesure
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
