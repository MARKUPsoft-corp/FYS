import { useState } from 'react';
import { ChevronRight, X, Check, Plus, Activity, Leaf, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

// ── Chip selector ─────────────────────────────────────────────────────────────

function ChipSelector({
  chips, noneLabel, selected, onChange,
}: {
  chips: readonly string[];
  noneLabel: string;
  selected: string[];
  onChange: (v: string[]) => void;
}) {
  const { t } = useTranslation();
  const [custom, setCustom] = useState('');

  function toggle(value: string) {
    if (value === noneLabel) {
      onChange(selected.includes(noneLabel) ? [] : [noneLabel]);
      return;
    }
    const without = selected.filter((s) => s !== noneLabel);
    if (without.includes(value)) {
      onChange(without.filter((s) => s !== value));
    } else {
      onChange([...without, value]);
    }
  }

  function addCustom() {
    const t = custom.trim();
    if (!t || selected.includes(t)) { setCustom(''); return; }
    onChange([...selected.filter((s) => s !== noneLabel), t]);
    setCustom('');
  }

  const customValues = selected.filter((s) => !chips.includes(s) && s !== noneLabel);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {chips.map((chip) => {
          const active = selected.includes(chip);
          return (
            <button
              key={chip}
              type="button"
              onClick={() => toggle(chip)}
              className={`relative flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold border-2 transition-all duration-200 ${
                active
                  ? 'bg-primary border-primary text-white scale-105 shadow-md'
                  : 'bg-card border-border text-foreground hover:border-primary/50'
              }`}
            >
              {active && <Check className="size-3.5 shrink-0" />}
              {chip}
            </button>
          );
        })}

        {/* Custom values added by the user */}
        {customValues.map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => toggle(v)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold border-2 bg-secondary border-secondary text-secondary-foreground scale-105 shadow-md transition-all"
          >
            <Check className="size-3.5 shrink-0" />
            {v}
          </button>
        ))}
      </div>

      {/* Free text input */}
      <div className="flex gap-2">
        <Input
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCustom())}
          placeholder={t('onboarding.customPlaceholder')}
          className="h-9 text-sm rounded-full border-dashed"
        />
        <Button type="button" variant="outline" size="icon" className="size-9 rounded-full shrink-0" onClick={addCustom}>
          <Plus className="size-4" />
        </Button>
      </div>

      {/* None option */}
      <button
        type="button"
        onClick={() => toggle(noneLabel)}
        className={`w-full flex items-center justify-center gap-2 py-3 rounded-full text-sm font-medium border-2 border-dashed transition-all ${
          selected.includes(noneLabel)
            ? 'border-muted-foreground bg-muted text-foreground'
            : 'border-border text-muted-foreground hover:border-muted-foreground'
        }`}
      >
        {selected.includes(noneLabel) && <Check className="size-4" />}
        {noneLabel}
      </button>
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

  const values = [conditions, allergies, goals];
  const setters = [setConditions, setAllergies, setGoals];

  const STEPS = [
    {
      key: 'conditions',
      Icon: Activity,
      title: t('onboarding.conditionsTitle'),
      subtitle: t('onboarding.conditionsSubtitle'),
      none: t('onboarding.conditionsNone'),
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
      chips: [
        'Perdre du poids', 'Booster mon énergie', 'Mieux digérer',
        'Renforcer l\'immunité', 'Santé cardiaque', 'Récupération sportive',
        'Belle peau', 'Meilleur sommeil', 'Réduire le stress', 'Grossesse saine',
      ],
    },
  ];

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;
  const canContinue = values[step].length > 0;

  function navigate(nextStep: number, dir: 'forward' | 'back') {
    if (animating) return;
    setDirection(dir);
    setAnimating(true);
    setTimeout(() => {
      setStep(nextStep);
      setAnimating(false);
    }, 220);
  }

  async function handleFinish() {
    setSaving(true);
    try {
      await onComplete({ healthConditions: conditions, allergies, goals });
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md px-safe py-safe animate-in fade-in duration-300">
      <div className="relative w-full max-w-md bg-card border border-border/60 shadow-[0_25px_80px_rgba(0,0,0,0.35)] rounded-[2rem] p-6 sm:p-8 max-h-[calc(100dvh-var(--sat)-var(--sab)-2rem)] overflow-y-auto animate-in zoom-in-95 fade-in slide-in-from-bottom-4 duration-300">

        {/* Skip */}
        <button
          onClick={onSkip}
          className="absolute top-4 right-4 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground bg-muted/60 hover:bg-muted px-3 py-2 rounded-full transition-colors"
        >
          {t('onboarding.skip')} <X className="size-3.5" />
        </button>

        {/* Progress */}
        <div className="space-y-3 pr-24">
          <p className="text-xs font-bold uppercase tracking-widest text-primary">
            {t('onboarding.stepLabel', { step: step + 1, total: STEPS.length })}
          </p>
          <ProgressBar step={step} total={STEPS.length} />
        </div>

        {/* Step content */}
        <div
          className="transition-all duration-200 mt-8"
          style={{
            opacity: animating ? 0 : 1,
            transform: animating
              ? `translateX(${direction === 'forward' ? '-24px' : '24px'})`
              : 'translateX(0)',
          }}
        >
          {/* Header */}
          <div className="text-center space-y-3">
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
          />
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between pt-6">
          {step > 0 ? (
            <button
              onClick={() => navigate(step - 1, 'back')}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors font-medium"
            >
              ← {t('common.back')}
            </button>
          ) : (
            <div />
          )}

          <Button
            onClick={isLast ? handleFinish : () => navigate(step + 1, 'forward')}
            disabled={!canContinue || saving}
            size="lg"
            className="rounded-full px-8 font-bold gap-2 transition-all"
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
    </div>
  );
}
