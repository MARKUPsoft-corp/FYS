import { useState } from 'react';
import { ChevronRight, X, Check, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

// ── Step data ─────────────────────────────────────────────────────────────────

const STEPS = [
  {
    key: 'conditions',
    emoji: '🩺',
    title: 'Conditions de santé',
    subtitle: 'Sélectionne tout ce qui te correspond pour que NutriFYS adapte ses recommandations.',
    none: 'Aucune condition particulière',
    chips: [
      'Diabète de type 2', 'Hypertension', 'Maladie cardiovasculaire',
      'Grossesse', 'Insuffisance rénale', 'Problèmes thyroïdiens',
      'Anémie', 'Côlon irritable', 'Obésité',
    ],
  },
  {
    key: 'allergies',
    emoji: '🌿',
    title: 'Allergies & intolérances',
    subtitle: 'Tes cocktails seront filtrés pour éviter les ingrédients à risque.',
    none: 'Aucune allergie connue',
    chips: [
      'Kiwi', 'Fraise', 'Ananas', 'Arachides',
      'Noix de coco', 'Agrumes', 'Gluten', 'Soja', 'Lactose',
    ],
  },
  {
    key: 'goals',
    emoji: '🎯',
    title: 'Tes objectifs santé',
    subtitle: 'On personnalise tes mélanges selon ce que tu veux atteindre.',
    none: 'Aucun objectif spécifique',
    chips: [
      'Perdre du poids', 'Booster mon énergie', 'Mieux digérer',
      'Renforcer l\'immunité', 'Santé cardiaque', 'Récupération sportive',
      'Belle peau', 'Meilleur sommeil', 'Réduire le stress', 'Grossesse saine',
    ],
  },
] as const;

// ── Chip selector ─────────────────────────────────────────────────────────────

function ChipSelector({
  chips, noneLabel, selected, onChange,
}: {
  chips: readonly string[];
  noneLabel: string;
  selected: string[];
  onChange: (v: string[]) => void;
}) {
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
          placeholder="Autre… (appuie sur Entrée)"
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
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState<'forward' | 'back'>('forward');
  const [animating, setAnimating] = useState(false);
  const [saving, setSaving] = useState(false);

  const [conditions, setConditions] = useState<string[]>([]);
  const [allergies, setAllergies] = useState<string[]>([]);
  const [goals, setGoals] = useState<string[]>([]);

  const values = [conditions, allergies, goals];
  const setters = [setConditions, setAllergies, setGoals];

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-md px-4">

      {/* Skip */}
      <button
        onClick={onSkip}
        className="absolute top-5 right-5 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        Passer <X className="size-4" />
      </button>

      <div className="w-full max-w-lg space-y-8">

        {/* Progress */}
        <div className="space-y-3">
          <p className="text-xs font-bold uppercase tracking-widest text-primary text-center">
            Étape {step + 1} sur {STEPS.length}
          </p>
          <ProgressBar step={step} total={STEPS.length} />
        </div>

        {/* Step content */}
        <div
          className="transition-all duration-200"
          style={{
            opacity: animating ? 0 : 1,
            transform: animating
              ? `translateX(${direction === 'forward' ? '-24px' : '24px'})`
              : 'translateX(0)',
          }}
        >
          {/* Header */}
          <div className="text-center space-y-2 mb-8">
            <div className="text-6xl mb-4">{current.emoji}</div>
            <h2 className="font-display font-bold text-3xl text-foreground">
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
        <div className="flex items-center justify-between pt-2">
          {step > 0 ? (
            <button
              onClick={() => navigate(step - 1, 'back')}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors font-medium"
            >
              ← Retour
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
              ? 'Enregistrement…'
              : isLast
              ? '🎉 Terminer'
              : 'Continuer'}
            {!isLast && !saving && <ChevronRight className="size-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}
