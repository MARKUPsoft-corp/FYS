import { useState } from 'react';
import { ChevronRight, ChevronLeft, X, Check, Plus, Activity, Leaf, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
// ── Chip selector ─────────────────────────────────────────────────────────────

function ChipSelector({
  chips,
  noneLabel,
  selected,
  onChange,
  customInput,
  onCustomInputChange,
  placeholder,
}: {
  chips: readonly string[];
  noneLabel: string;
  selected: string[];
  onChange: (v: string[]) => void;
  customInput: string;
  onCustomInputChange: (v: string) => void;
  placeholder?: string;
}) {
  const { t } = useTranslation();

  function toggle(value: string) {
    if (value === noneLabel) {
      onCustomInputChange('');
      onChange(selected.includes(noneLabel) ? [] : [noneLabel]);
      return;
    }
    const withoutNone = selected.filter((s) => s !== noneLabel);
    if (withoutNone.includes(value)) {
      onChange(withoutNone.filter((s) => s !== value));
    } else {
      onChange([...withoutNone, value]);
    }
  }

  function addCustom() {
    const raw = customInput.trim();
    if (!raw) return;
    const items = raw
      .split(/[,;\n]+/)
      .map((s) => s.trim())
      .filter(Boolean);

    if (items.length === 0) return;
    const withoutNone = selected.filter((s) => s !== noneLabel);
    const updated = Array.from(new Set([...withoutNone, ...items]));
    onChange(updated);
    onCustomInputChange('');
  }

  function removeCustom(value: string) {
    onChange(selected.filter((s) => s !== value));
  }

  const customValues = selected.filter((s) => !chips.includes(s) && s !== noneLabel);

  return (
    <div className="space-y-4">
      {/* Puces prédéfinies */}
      <div className="flex flex-wrap gap-2">
        {chips.map((chip) => {
          const active = selected.includes(chip);
          return (
            <button
              key={chip}
              type="button"
              onClick={() => toggle(chip)}
              className={cn(
                'relative flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold border-2 transition-all duration-200 active:scale-95',
                active
                  ? 'bg-primary border-primary text-white scale-105 shadow-md'
                  : 'bg-card border-border text-foreground hover:border-primary/50',
              )}
            >
              {active && <Check className="size-3.5 shrink-0" />}
              {chip}
            </button>
          );
        })}
      </div>

      {/* Tags personnalisés saisis par l'utilisateur */}
      {customValues.length > 0 && (
        <div className="space-y-1.5 pt-1">
          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
            {t('onboarding.customAddedTitle', 'Vos ajouts personnalisés :')}
          </p>
          <div className="flex flex-wrap gap-2">
            {customValues.map((v) => (
              <span
                key={v}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-semibold border-2 bg-primary/10 border-primary text-primary shadow-xs animate-in fade-in zoom-in-95 duration-150"
              >
                <Check className="size-3.5 shrink-0" />
                <span>{v}</span>
                <button
                  type="button"
                  onClick={() => removeCustom(v)}
                  className="size-4 ml-0.5 rounded-full hover:bg-primary/20 flex items-center justify-center transition-colors"
                  title={t('common.delete', 'Supprimer')}
                >
                  <X className="size-3 text-primary/80 hover:text-primary" />
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Champ de saisie libre avec bouton Ajouter bien visible */}
      <div className="space-y-1.5 pt-1">
        <div className="flex gap-2">
          <Input
            value={customInput}
            onChange={(e) => onCustomInputChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addCustom();
              }
            }}
            onBlur={() => {
              // Auto-commit on blur si l'utilisateur quitte le champ
              if (customInput.trim()) {
                addCustom();
              }
            }}
            placeholder={placeholder || t('onboarding.customPlaceholder')}
            className="h-11 text-sm rounded-xl border-border bg-background shadow-xs focus-visible:ring-primary/20"
          />
          <Button
            type="button"
            variant={customInput.trim() ? 'default' : 'outline'}
            className={cn(
              'h-11 px-4 rounded-xl font-bold shrink-0 gap-1.5 transition-all',
              customInput.trim()
                ? 'bg-primary hover:bg-primary/90 text-white shadow-sm'
                : 'text-muted-foreground border-border hover:text-foreground',
            )}
            onClick={addCustom}
            disabled={!customInput.trim()}
          >
            <Plus className="size-4" />
            <span className="text-xs">{t('common.add', 'Ajouter')}</span>
          </Button>
        </div>
        <p className="text-[11px] text-muted-foreground px-1">
          {t('onboarding.customHelper', 'Saisissez votre situation si elle n\'apparaît pas dans la liste ci-dessus, puis continuez.')}
        </p>
      </div>

      {/* Option exclusive "Aucune" */}
      <div className="pt-2">
        <button
          type="button"
          onClick={() => toggle(noneLabel)}
          className={cn(
            'w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold border-2 border-dashed transition-all active:scale-98',
            selected.includes(noneLabel)
              ? 'border-primary bg-primary/10 text-primary'
              : 'border-border text-muted-foreground hover:border-muted-foreground hover:text-foreground',
          )}
        >
          {selected.includes(noneLabel) && <Check className="size-4" />}
          {noneLabel}
        </button>
      </div>
    </div>
  );
}

// ── Progress bar ──────────────────────────────────────────────────────────────

function ProgressBar({ step, total }: { step: number; total: number }) {
  return (
    <div className="flex gap-1.5">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${
            i <= step ? 'bg-primary' : 'bg-border'
          }`}
        />
      ))}
    </div>
  );
}

// ── Props ─────────────────────────────────────────────────────────────────────

type Props = {
  open: boolean;
  onSkip: () => void;
  onComplete: (data: { healthConditions: string[]; allergies: string[]; goals: string[] }) => Promise<void>;
};

// ── Main component ────────────────────────────────────────────────────────────

export function OnboardingModal({ open, onSkip, onComplete }: Props) {
  const { t } = useTranslation();
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState<'forward' | 'back'>('forward');
  const [animating, setAnimating] = useState(false);
  const [saving, setSaving] = useState(false);

  const [conditions, setConditions] = useState<string[]>([]);
  const [allergies, setAllergies] = useState<string[]>([]);
  const [goals, setGoals] = useState<string[]>([]);

  // Saisie en cours dans l'input pour chaque étape
  const [customCondition, setCustomCondition] = useState('');
  const [customAllergy, setCustomAllergy] = useState('');
  const [customGoal, setCustomGoal] = useState('');

  const values = [conditions, allergies, goals];
  const setters = [setConditions, setAllergies, setGoals];
  const customInputs = [customCondition, customAllergy, customGoal];
  const setCustomInputs = [setCustomCondition, setCustomAllergy, setCustomGoal];

  const STEPS = [
    {
      key: 'conditions',
      Icon: Activity,
      title: t('onboarding.conditionsTitle'),
      subtitle: t('onboarding.conditionsSubtitle'),
      none: t('onboarding.conditionsNone'),
      placeholder: t('onboarding.customConditionsPlaceholder', 'Autre condition… (ex: gastrite, ulcère, asthme)'),
      chips: [
        'Diabète de type 2', 'Hypertension', 'Maladie cardiovasculaire',
        'Grossesse', 'Insuffisance rénale', 'Problèmes thyroïdiens',
        'Anémie', 'Côlon irritable', 'Obésité',
      ],
    },
    {
      key: 'allergies',
      Icon: Leaf,
      title: t('onboarding.allergiesTitle'),
      subtitle: t('onboarding.allergiesSubtitle'),
      none: t('profile.noAllergies'),
      placeholder: t('onboarding.customAllergiesPlaceholder', 'Autre allergie… (ex: mangue, pêche, kiwi)'),
      chips: [
        'Kiwi', 'Fraise', 'Ananas', 'Arachides',
        'Noix de coco', 'Agrumes', 'Gluten', 'Soja', 'Lactose',
      ],
    },
    {
      key: 'goals',
      Icon: Target,
      title: t('onboarding.goalsTitle'),
      subtitle: t('onboarding.goalsSubtitle'),
      none: t('onboarding.goalsNone'),
      placeholder: t('onboarding.customGoalsPlaceholder', 'Autre objectif… (ex: concentration, vitalité)'),
      chips: [
        'Perdre du poids', 'Booster mon énergie', 'Mieux digérer',
        'Renforcer l\'immunité', 'Santé cardiaque', 'Récupération sportive',
        'Belle peau', 'Meilleur sommeil', 'Réduire le stress', 'Grossesse saine',
      ],
    },
  ];

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;
  const currentCustom = customInputs[step];

  // L'utilisateur peut continuer s'il a sélectionné au moins un élément
  // OU s'il a saisi du texte dans le champ de condition personnalisée !
  const canContinue = values[step].length > 0 || currentCustom.trim().length > 0;

  function commitStepCustom(stepIndex: number, currentList: string[]): string[] {
    const raw = customInputs[stepIndex].trim();
    if (!raw) return currentList;

    const items = raw
      .split(/[,;\n]+/)
      .map((s) => s.trim())
      .filter(Boolean);

    if (items.length === 0) return currentList;

    const noneLabel = STEPS[stepIndex].none;
    const withoutNone = currentList.filter((s) => s !== noneLabel);
    const updated = Array.from(new Set([...withoutNone, ...items]));

    setters[stepIndex](updated);
    setCustomInputs[stepIndex]('');
    return updated;
  }

  function navigate(nextStep: number, dir: 'forward' | 'back') {
    if (animating) return;
    setDirection(dir);
    setAnimating(true);
    setTimeout(() => {
      setStep(nextStep);
      setAnimating(false);
    }, 220);
  }

  async function handleNextOrFinish() {
    // Valide et intègre automatiquement toute saisie personnalisée en attente
    const updatedCurrentStepValues = commitStepCustom(step, values[step]);

    if (isLast) {
      setSaving(true);
      try {
        const finalConditions = step === 0 ? updatedCurrentStepValues : commitStepCustom(0, conditions);
        const finalAllergies = step === 1 ? updatedCurrentStepValues : commitStepCustom(1, allergies);
        const finalGoals = step === 2 ? updatedCurrentStepValues : commitStepCustom(2, goals);

        await onComplete({
          healthConditions: finalConditions.length ? finalConditions : [STEPS[0].none],
          allergies: finalAllergies.length ? finalAllergies : [STEPS[1].none],
          goals: finalGoals.length ? finalGoals : [STEPS[2].none],
        });
      } finally {
        setSaving(false);
      }
    } else {
      navigate(step + 1, 'forward');
    }
  }

  return (
    <Sheet open={open} onOpenChange={(isOpen) => { if (!isOpen) onSkip(); }}>
      <SheetContent side="right" showCloseButton={false} className="w-full max-w-[500px] p-0 flex flex-col border-l-0 sm:border-l">
        {/* Header / progress */}
        <SheetHeader className="px-6 pt-6 pb-4 border-b border-border/40 shrink-0 relative">
          <SheetTitle className="sr-only">Onboarding</SheetTitle>
          
          {/* Skip */}
          <button
            onClick={onSkip}
            className="absolute top-6 right-6 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground bg-muted/60 hover:bg-muted px-3 py-2 rounded-full transition-colors"
          >
            {t('onboarding.skip')} <X className="size-3.5" />
          </button>

          <div className="space-y-3 pr-24 mt-2">
            <p className="text-xs font-bold uppercase tracking-widest text-primary">
              {t('onboarding.stepLabel', { step: step + 1, total: STEPS.length })}
            </p>
            <ProgressBar step={step} total={STEPS.length} />
          </div>
        </SheetHeader>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div
            className="transition-all duration-200 mt-2"
            style={{
              opacity: animating ? 0 : 1,
              transform: animating
                ? `translateX(${direction === 'forward' ? '-24px' : '24px'})`
                : 'translateX(0)',
            }}
          >
            {/* Header */}
            <div className="text-center space-y-3 mb-8">
              <div className="mx-auto size-14 rounded-[1.25rem] bg-primary/10 border border-primary/20 flex items-center justify-center">
                <current.Icon
                  className={cn(
                    'size-7',
                    current.key === 'allergies' ? 'text-green-600' :
                    current.key === 'goals' ? 'text-secondary' : 'text-primary',
                  )}
                />
              </div>
              <h2 className="font-display font-bold text-2xl text-foreground">
                {current.title}
              </h2>
              <p className="text-muted-foreground text-sm leading-relaxed max-w-sm mx-auto">
                {current.subtitle}
              </p>
            </div>

            {/* Chips */}
            <ChipSelector
              chips={current.chips}
              noneLabel={current.none}
              selected={values[step]}
              onChange={setters[step]}
              customInput={currentCustom}
              onCustomInputChange={setCustomInputs[step]}
              placeholder={current.placeholder}
            />
          </div>
        </div>

        {/* Navigation Footer */}
        <div className="p-6 border-t border-border/40 shrink-0 bg-card">
          <div className="flex items-center gap-3">
            {step > 0 && (
              <Button
                size="lg"
                variant="outline"
                className="h-12 rounded-2xl gap-2 font-bold border-border/60 text-foreground hover:bg-muted/50 shrink-0 px-5"
                onClick={() => navigate(step - 1, 'back')}
              >
                <ChevronLeft className="size-4" />
                {t('common.back')}
              </Button>
            )}

            <Button
              onClick={handleNextOrFinish}
              disabled={!canContinue || saving}
              size="lg"
              className="flex-1 h-12 rounded-2xl bg-primary hover:bg-primary/90 text-white font-bold gap-2 shadow-[0_8px_25px_rgba(63,109,78,0.25)] active:scale-95 transition-all"
            >
              {saving
                ? t('lab.saving')
                : isLast
                ? `🎉 ${t('profile.onboarding.complete')}`
                : t('profile.onboarding.next')}
              {!isLast && !saving && <ChevronRight className="size-4" />}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}


