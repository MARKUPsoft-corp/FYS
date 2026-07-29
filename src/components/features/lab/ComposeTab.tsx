import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Plus, FlaskConical, Sparkles, Save, Loader2,
  Shield, Zap, Leaf, Droplets, Heart, Moon, Wind,
  Lightbulb, Link2, ClipboardList, ShoppingBag,
  Check, ChevronRight, ChevronLeft,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { SupplementsTab } from '@/components/features/lab/SupplementsTab';
import type { AIRecommendation } from '@/services/ai.shared';
import type { Fruit, AIAnalysis, AIVerdict, NutrientInfo } from '@/entities';
import { isUsableAsMainFruit, MAX_LAB_MAIN_FRUITS, MAX_LAB_SUPPLEMENTS } from '@/entities';


// ── Verdict config ────────────────────────────────────────────────────────────

function getVerdictLabel(verdict: AIVerdict, t: (key: string) => string): string {
  const labels: Record<AIVerdict, string> = {
    beneficial: t('nutrition.verdictBeneficial'),
    neutral: t('nutrition.verdictNeutral'),
    caution: t('nutrition.verdictCaution'),
    not_recommended: t('nutrition.verdictNotRecommended'),
  };
  return labels[verdict];
}

const VERDICT_CONFIG: Record<AIVerdict, {
  emoji: string;
  bg: string;
  border: string;
  text: string;
  bar: string;
  chip: string;
}> = {
  beneficial: {
    emoji: '✦',
    bg: 'bg-emerald-50 dark:bg-emerald-950/30',
    border: 'border-emerald-200 dark:border-emerald-700',
    text: 'text-emerald-700 dark:text-emerald-400',
    bar: 'bg-emerald-500',
    chip: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-400',
  },
  neutral: {
    emoji: '◈',
    bg: 'bg-slate-50 dark:bg-slate-900/30',
    border: 'border-slate-200 dark:border-slate-700',
    text: 'text-slate-600 dark:text-slate-400',
    bar: 'bg-slate-400',
    chip: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
  },
  caution: {
    emoji: '⚠',
    bg: 'bg-amber-50 dark:bg-amber-950/30',
    border: 'border-amber-200 dark:border-amber-700',
    text: 'text-amber-700 dark:text-amber-400',
    bar: 'bg-amber-500',
    chip: 'bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-400',
  },
  not_recommended: {
    emoji: '✕',
    bg: 'bg-red-50 dark:bg-red-950/30',
    border: 'border-red-200 dark:border-red-700',
    text: 'text-red-700 dark:text-red-400',
    bar: 'bg-red-500',
    chip: 'bg-red-100 text-red-700 dark:bg-red-900/60 dark:text-red-400',
  },
};

function getNutrientLabel(id: string, t: (key: string) => string): string {
  const labels: Record<string, string> = {
    vitamineC: t('nutrition.nutrientVitamineC'),
    vitamineA: t('nutrition.nutrientVitamineA'),
    fibres: t('nutrition.nutrientFibres'),
    potassium: t('nutrition.nutrientPotassium'),
    sucresNaturels: t('nutrition.nutrientSucresNaturels'),
    antioxydants: t('nutrition.nutrientAntioxydants'),
  };
  return labels[id] ?? id;
}

// ── Nutrient bar ──────────────────────────────────────────────────────────────

const NUTRIENT_META: Record<string, { bar: string }> = {
  vitamineC: { bar: 'bg-orange-400' },
  vitamineA: { bar: 'bg-yellow-400' },
  fibres: { bar: 'bg-emerald-500' },
  potassium: { bar: 'bg-sky-400' },
  sucresNaturels: { bar: 'bg-rose-400' },
  antioxydants: { bar: 'bg-violet-500' },
};

function NutrientRow({ id, info }: { id: string; info: NutrientInfo }) {
  const { t } = useTranslation();
  const meta = NUTRIENT_META[id] ?? { bar: 'bg-primary' };
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-[12px] font-semibold text-foreground/70">{getNutrientLabel(id, t)}</span>
        <div className="flex items-center gap-2">
          <span className="text-[12px] font-bold text-foreground">{info.valeur}</span>
          <span className="text-[11px] font-bold tabular-nums text-muted-foreground">
            {info.pourcentage}%<span className="text-[10px] font-normal">{t('nutrition.ajr')}</span>
          </span>
        </div>
      </div>
      <div className="h-2 w-full bg-border/50 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${meta.bar}`}
          style={{ width: `${info.pourcentage}%` }}
        />
      </div>
    </div>
  );
}

// ── Benefit chip ──────────────────────────────────────────────────────────────

const BENEFIT_ICONS: Record<string, React.ElementType> = {
  immunité: Shield,
  énergie: Zap,
  digestion: Leaf,
  hydratation: Droplets,
  'anti-inflammatoire': Heart,
  peau: Sparkles,
  sommeil: Moon,
  stress: Wind,
};

const BENEFIT_LEVEL: Record<string, { chip: string; dots: number }> = {
  faible: { chip: 'bg-muted text-muted-foreground border border-border/60', dots: 1 },
  modéré: { chip: 'bg-primary/10 text-primary border border-primary/20', dots: 2 },
  élevé: { chip: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-700', dots: 3 },
};

function BenefitChip({ nom, niveau }: { nom: string; niveau: string }) {
  const Icon = BENEFIT_ICONS[nom] ?? Sparkles;
  const style = BENEFIT_LEVEL[niveau] ?? BENEFIT_LEVEL['modéré'];
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-semibold ${style.chip}`}>
      <Icon className="size-3.5 shrink-0" />
      <span className="capitalize">{nom}</span>
      <span className="flex items-center gap-0.5 ml-1">
        {Array.from({ length: 3 }).map((_, i) => (
          <span
            key={i}
            className={`size-1.5 rounded-full ${i < style.dots ? 'bg-current' : 'bg-current opacity-20'}`}
          />
        ))}
      </span>
    </span>
  );
}

// ── Nutritional sheet content ─────────────────────────────────────────────────

function NutritionalSheetContent({
  analysis,
  selectedFruits,
  onOrderRequest,
}: {
  analysis: AIAnalysis;
  selectedFruits: Fruit[];
  onOrderRequest: () => void;
}) {
  const { t } = useTranslation();
  const cfg = VERDICT_CONFIG[analysis.verdict];

  const nutrients = (
    Object.entries(analysis.profilNutritionnel) as [string, NutrientInfo | undefined][]
  )
    .filter((e): e is [string, NutrientInfo] => e[1] !== undefined)
    .sort((a, b) => b[1].pourcentage - a[1].pourcentage);

  return (
    <div className="flex flex-col h-full">

      {/* Sheet header */}
      <SheetHeader className="px-6 pt-6 pb-4 border-b border-border/40 shrink-0">
        <div className="flex items-center justify-between gap-3">
          <SheetTitle className="font-display text-lg font-bold text-foreground">
            {t('nutrition.sheetTitle')}
          </SheetTitle>
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[12px] font-bold ${cfg.chip}`}>
            <span>{cfg.emoji}</span>
            {getVerdictLabel(analysis.verdict, t)} · {analysis.score}/100
          </span>
        </div>
        {selectedFruits.length > 0 && (
          <p className="text-[12px] text-muted-foreground mt-1">
            {selectedFruits.map((f) => f.name).join(' · ')}
          </p>
        )}
      </SheetHeader>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

        {/* Score bar + notes */}
        <div className={`rounded-2xl border p-4 space-y-3 ${cfg.bg} ${cfg.border}`}>
          <div className="h-2 w-full bg-black/10 dark:bg-white/10 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${cfg.bar}`}
              style={{ width: `${analysis.score}%` }}
            />
          </div>
          <p className="text-[13px] leading-relaxed text-foreground/80 font-medium">
            {analysis.notes}
          </p>
        </div>

        {/* Profil nutritionnel */}
        {nutrients.length > 0 && (
          <div className="space-y-4">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
              {t('nutrition.profileSubtitle')}
            </p>
            <div className="space-y-3">
              {nutrients.map(([id, info]) => (
                <NutrientRow key={id} id={id} info={info} />
              ))}
            </div>
          </div>
        )}

        {/* Bénéfices ciblés */}
        {analysis.beneficesCibles.length > 0 && (
          <div className="space-y-3">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
              {t('nutrition.targetedBenefits')}
            </p>
            <div className="flex flex-wrap gap-2">
              {analysis.beneficesCibles.map((b) => (
                <BenefitChip key={b.nom} nom={b.nom} niveau={b.niveau} />
              ))}
            </div>
          </div>
        )}

        {/* Interactions fruits */}
        {analysis.interactionsFruits.length > 0 && (
          <div className="space-y-3">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
              <Link2 className="size-3" />
              {t('nutrition.fruitInteractionsShort')}
            </p>
            <ul className="space-y-2">
              {analysis.interactionsFruits.map((item, i) => (
                <li key={i} className="flex items-start gap-2.5 text-[12px] text-foreground/75 leading-relaxed">
                  <span className="mt-1.5 size-1.5 rounded-full bg-primary/40 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Conseil */}
        {analysis.conseil && (
          <div className="rounded-xl border border-[#E0982E]/30 bg-[#E0982E]/6 px-4 py-3.5 flex gap-3">
            <Lightbulb className="size-4 text-[#E0982E] shrink-0 mt-0.5" />
            <p className="text-[12px] leading-relaxed text-foreground/80 font-medium">
              {analysis.conseil}
            </p>
          </div>
        )}
      </div>

      {/* Footer: Commander */}
      <div className="shrink-0 border-t border-border/40 px-6 py-4">
        <Button
          size="lg"
          className="w-full h-12 rounded-xl gap-2 text-sm font-bold bg-primary hover:bg-primary/90 text-white shadow-[0_8px_25px_rgba(63,109,78,0.25)] active:scale-95 transition-all"
          onClick={onOrderRequest}
        >
          <ShoppingBag className="size-4" /> {t('lab.order')}
        </Button>
      </div>
    </div>
  );
}

// ── Compose stepper ───────────────────────────────────────────────────────────

export type ComposeStep = 1 | 2;

function ComposeStepper({
  step,
  onStepChange,
  canGoStep2,
}: {
  step: ComposeStep;
  onStepChange: (s: ComposeStep) => void;
  canGoStep2: boolean;
}) {
  const { t } = useTranslation();
  const steps = [
    { n: 1 as const, label: t('lab.fruits'), hint: t('lab.fruityBase') },
    { n: 2 as const, label: t('lab.supplements'), hint: t('lab.seasoning') },
  ];

  return (
    <div className="mb-0 max-w-sm mx-auto w-full">
      <div className="flex items-center justify-center gap-0">
        {steps.map((s, i) => {
          const active = step === s.n;
          const done = step > s.n;
          const clickable = s.n === 1 || canGoStep2;
          return (
            <div key={s.n} className="flex items-center flex-1 min-w-0">
              <button
                type="button"
                disabled={!clickable}
                onClick={() => clickable && onStepChange(s.n)}
                className={cn(
                  'group flex items-center gap-3 w-full text-left rounded-2xl px-3 py-3 transition-all',
                  active && 'bg-primary/8',
                  !clickable && 'opacity-40 cursor-not-allowed',
                )}
              >
                <span
                  className={cn(
                    'size-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0 border-2 transition-all',
                    active && 'bg-primary text-primary-foreground border-primary shadow-[0_4px_14px_rgba(63,109,78,0.35)]',
                    done && !active && 'bg-primary/15 text-primary border-primary/40',
                    !active && !done && 'bg-muted text-muted-foreground border-border',
                  )}
                >
                  {done && !active ? <Check className="size-4" /> : s.n}
                </span>
                <span className="min-w-0">
                  <span className={cn(
                    'block text-[11px] font-bold uppercase tracking-widest',
                    active ? 'text-primary' : 'text-muted-foreground',
                  )}>
                    {t('lab.stepLabel', { step: s.n })}
                  </span>
                  <span className={cn(
                    'block text-sm font-semibold truncate',
                    active ? 'text-foreground' : 'text-muted-foreground',
                  )}>
                    {s.label}
                  </span>
                  <span className="hidden sm:block text-[10px] text-muted-foreground">{s.hint}</span>
                </span>
              </button>
              {i < steps.length - 1 && (
                <div
                  className={cn(
                    'h-0.5 w-6 sm:w-10 shrink-0 rounded-full mx-1 transition-colors',
                    step > 1 ? 'bg-primary/50' : 'bg-border',
                  )}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── ComposeTab ────────────────────────────────────────────────────────────────

type Props = {
  fruits: Fruit[];
  supplements: Fruit[];
  loading: boolean;
  composeStep: ComposeStep;
  onStepChange: (step: ComposeStep) => void;
  selectedIngredients: Map<string, number>;
  selectedSupplements: Map<string, number>;
  onToggleFruit: (id: string) => void;
  onToggleSupplement: (id: string) => void;
  onChangeQuantity: (fruitId: string, grams: number) => void;
  cocktailName: string;
  onNameChange: (name: string) => void;
  onSave: () => Promise<void>;
  saving: boolean;
  analysis: AIAnalysis | null;
  onAnalyze: () => Promise<void>;
  analyzing: boolean;
  onOrderRequest: () => void;
  aiRecommendation: AIRecommendation | null;
  loadingAI: boolean;
};

export function ComposeTab({
  fruits,
  supplements,
  loading,
  composeStep,
  onStepChange,
  selectedIngredients,
  selectedSupplements,
  onToggleFruit,
  onToggleSupplement,
  cocktailName,
  onNameChange,
  onSave,
  saving,
  analysis,
  onAnalyze,
  analyzing,
  onOrderRequest,
  aiRecommendation,
  loadingAI,
}: Props) {
  const { t } = useTranslation();
  const mainFruits = fruits.filter(isUsableAsMainFruit);
  const selectedFruits = mainFruits.filter((f) => selectedIngredients.has(f.id));
  const selectedSupplementItems = supplements.filter((f) => selectedSupplements.has(f.id));
  const atMaxFruits = selectedIngredients.size >= MAX_LAB_MAIN_FRUITS;
  const canSave = selectedIngredients.size > 0 && cocktailName.trim().length > 0;
  const canAnalyze = selectedIngredients.size > 0;
  const canGoStep2 = selectedIngredients.size > 0;
  return (
    <div className="flex flex-col lg:flex-row gap-6 lg:gap-12">

      <div className="flex-1 min-w-0 w-full">
        <div  className="sticky top-0 z-30 -mx-4 px-4 lg:-ml-16 lg:pl-16 pt-[calc(env(safe-area-inset-top)+0.5rem)] pb-3 mb-3 bg-background/70 backdrop-blur-[48px] saturate-[180%] border-b border-white/40 dark:border-white/10">
          <ComposeStepper
            step={composeStep}
            onStepChange={onStepChange}
            canGoStep2={canGoStep2}
          />

          {composeStep === 1 ? (
            <div className="relative z-20 bg-card rounded-2xl p-4 mt-3 border border-border/60 shadow-lg flex items-center lg:items-start gap-4 mx-auto lg:mx-0 max-w-lg lg:max-w-none text-left">
              <div className="size-10 rounded-full bg-[#E0982E]/10 flex items-center justify-center shrink-0 border border-[#E0982E]/20">
                <Sparkles className="size-4 text-[#E0982E]" />
              </div>
              <div>
                <span className="text-[#E0982E] text-[10px] font-bold uppercase tracking-widest block mb-0.5">
                  {t('lab.step1Title')}
                </span>
                <p className="text-foreground text-[12px] md:text-[13px] font-medium leading-relaxed">
                  {t('lab.step1Description', { fruits: MAX_LAB_MAIN_FRUITS, supplements: MAX_LAB_SUPPLEMENTS })}
                </p>
              </div>
            </div>
          ) : (
            <div className="relative z-20 bg-card rounded-2xl p-4 mt-3 border border-border/60 shadow-lg flex items-center lg:items-start gap-4 mx-auto lg:mx-0 max-w-lg lg:max-w-none text-left">
              <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20">
                <Sparkles className="size-4 text-primary" />
              </div>
              <div>
                <span className="text-primary text-[10px] font-bold uppercase tracking-widest block mb-0.5">
                  {t('lab.step2Title')}
                </span>
                <p className="text-foreground text-[12px] md:text-[13px] font-medium leading-relaxed">
                  {t('lab.step2Description', { supplements: MAX_LAB_SUPPLEMENTS })}
                </p>
              </div>
            </div>
          )}
        </div>

        {composeStep === 1 && (
          <>
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                  {t('lab.fruitsAvailable')}
                </h3>
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-secondary opacity-50" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-secondary" />
                </span>
              </div>
              <span className={`text-[11px] font-bold tabular-nums shrink-0 ${atMaxFruits ? 'text-secondary' : 'text-muted-foreground'
                }`}>
                {selectedIngredients.size}/{MAX_LAB_MAIN_FRUITS}
              </span>
            </div>

            {atMaxFruits && (
              <p className="text-[11px] text-secondary font-semibold mb-3 -mt-1">
                {t('lab.maxFruitsReachedDesc')}
              </p>
            )}

            {loading ? (
              <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-3">
                {Array.from({ length: 10 }).map((_, i) => (
                  <div key={i} className="aspect-square rounded-[1.25rem] bg-card border-2 border-border/40 animate-pulse" />
                ))}
              </div>
            ) : (
              <div  className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-3">
                {mainFruits.map((fruit) => {
                  const isSelected = selectedIngredients.has(fruit.id);
                  const isDisabled = !isSelected && atMaxFruits;
                  return (
                    <button
                      key={fruit.id}
                      type="button"
                      disabled={isDisabled}
                      onClick={() => onToggleFruit(fruit.id)}
                      className={`relative flex flex-col items-center justify-start gap-1.5 p-2.5 rounded-[1.25rem] transition-colors duration-300 ${isSelected
                          ? 'bg-primary/10 border-2 border-primary shadow-[0_4px_12px_rgba(63,109,78,0.15)] animate-card-bounce'
                          : isDisabled
                            ? 'bg-muted/40 border-2 border-border/30 opacity-45 cursor-not-allowed'
                            : 'bg-card border-2 border-border/60 hover:border-primary/40 shadow-sm hover:-translate-y-0.5'
                        }`}
                    >
                      {isSelected && (
                        <span className="absolute inset-0 rounded-[1.25rem] overflow-hidden pointer-events-none">
                          <span className="absolute inset-0 bg-gradient-to-br from-transparent via-white/25 to-transparent animate-wave-sweep" />
                        </span>
                      )}
                      {fruit.imageUrl ? (
                        <div
                          className="w-full aspect-square rounded-xl bg-cover bg-center ring-1 ring-inset ring-black/5"
                          style={{ backgroundImage: `url('${fruit.imageUrl}')` }}
                        />
                      ) : (
                        <div className="w-full aspect-square rounded-xl bg-primary/10 flex items-center justify-center text-2xl">
                          🍓
                        </div>
                      )}
                      <span className={`text-[10px] font-semibold text-center line-clamp-1 w-full ${isSelected ? 'text-primary' : 'text-muted-foreground'}`}>
                        {fruit.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Desktop only — mobile uses the fixed bottom bar */}
            <div className="mt-6 hidden lg:flex justify-end">
              <Button
                size="lg"
                className="h-12 rounded-2xl px-6 font-bold gap-2 bg-primary hover:bg-primary/90 text-white shadow-[0_8px_25px_rgba(63,109,78,0.25)]"
                disabled={!canGoStep2}
                onClick={() => onStepChange(2)}
              >
                {t('lab.nextSupplements')}
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </>
        )}

        {composeStep === 2 && (
          <>
            <div className="mb-4 space-y-3">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="gap-1.5 text-muted-foreground hover:text-foreground -ml-2"
                onClick={() => onStepChange(1)}
              >
                <ChevronLeft className="size-4" />
                {t('lab.editFruits')}
              </Button>
              <div className="lg:hidden">
                <Input
                  value={cocktailName}
                  onChange={(e) => onNameChange(e.target.value)}
                  placeholder={t('lab.namePlaceholder')}
                  className="h-11 rounded-xl text-base font-semibold"
                />
                <p className="text-[10px] text-muted-foreground mt-1.5 px-0.5">
                  {t('lab.nameGenerated')}
                </p>
              </div>
            </div>
            <SupplementsTab
              selectedFruits={selectedFruits}
              supplements={supplements}
              selectedSupplementIds={[...selectedSupplements.keys()]}
              onToggleSupplement={onToggleSupplement}
              aiRecommendation={aiRecommendation}
              loadingAI={loadingAI}
            />
          </>
        )}
      </div>

      {/* ── Desktop save panel ── */}
      <div  className="hidden lg:block w-[360px] shrink-0">
        <SavePanel
          composeStep={composeStep}
          onStepChange={onStepChange}
          selectedFruits={selectedFruits}
          selectedSupplements={selectedSupplementItems}
          selectedMainCount={selectedFruits.length}
          selectedSupplementCount={selectedSupplementItems.length}
          cocktailName={cocktailName}
          onNameChange={onNameChange}
          onSave={onSave}
          saving={saving}
          canSave={canSave}
          analysis={analysis}
          onAnalyze={onAnalyze}
          analyzing={analyzing}
          canAnalyze={canAnalyze}
          canGoStep2={canGoStep2}
          onOrderRequest={onOrderRequest}
        />
      </div>
    </div>
  );
}

// ── SavePanel ─────────────────────────────────────────────────────────────────

type SavePanelProps = {
  composeStep: ComposeStep;
  onStepChange: (step: ComposeStep) => void;
  selectedFruits: Fruit[];
  selectedSupplements: Fruit[];
  selectedMainCount: number;
  selectedSupplementCount: number;
  cocktailName: string;
  onNameChange: (name: string) => void;
  onSave: () => Promise<void>;
  saving: boolean;
  canSave: boolean;
  analysis: AIAnalysis | null;
  onAnalyze: () => Promise<void>;
  analyzing: boolean;
  canAnalyze: boolean;
  canGoStep2: boolean;
  onOrderRequest: () => void;
};

export function SavePanel({
  composeStep,
  onStepChange,
  selectedFruits,
  selectedSupplements,
  selectedMainCount,
  selectedSupplementCount,
  cocktailName,
  onNameChange,
  onSave,
  saving,
  canSave,
  analysis,
  onAnalyze,
  analyzing,
  canAnalyze,
  canGoStep2,
  onOrderRequest,
}: SavePanelProps) {
  const { t } = useTranslation();
  const [sheetOpen, setSheetOpen] = useState(false);

  useEffect(() => {
    if (analysis) setSheetOpen(true);
  }, [analysis]);

  const cfg = analysis ? VERDICT_CONFIG[analysis.verdict] : null;
  const hasComposition = selectedMainCount > 0 || selectedSupplementCount > 0;

  return (
    <>
      <div className="bg-card rounded-3xl border border-border/60 shadow-sm overflow-hidden sticky top-24 mt-8 flex flex-col max-h-[calc(100vh-8rem)]">

        <div className="bg-primary/5 border-b border-border/40 px-6 py-4 flex items-center gap-3">
          <div className="size-9 bg-primary/10 rounded-xl flex items-center justify-center">
            <FlaskConical className="size-5 text-primary" />
          </div>
          <div>
            <h2 className="font-display font-bold text-base text-foreground">{t('lab.myRecipe')}</h2>
            <p className="text-xs text-muted-foreground">
              {selectedMainCount === 0
                ? t('lab.noFruitSelected')
                : `${selectedMainCount}/${MAX_LAB_MAIN_FRUITS} ${t('lab.fruitCount', { count: selectedMainCount })}${selectedSupplementCount > 0
                  ? ` · ${selectedSupplementCount}/${MAX_LAB_SUPPLEMENTS} ${t('lab.supplementCount', { count: selectedSupplementCount })}`
                  : ''
                }`}
            </p>
          </div>
        </div>

        <div className="px-6 py-4">
          {!hasComposition ? (
            <div className="flex flex-col items-center justify-center py-6 text-center gap-2">
              <Plus className="size-6 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground font-medium">
                {t('lab.selectFruits')}
              </p>
            </div>
          ) : (
            <>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2.5">
                {t('catalogue.composition')}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {selectedFruits.map((f) => (
                  <span
                    key={`f-${f.id}`}
                    className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold border bg-primary/8 text-primary border-primary/15"
                  >
                    {f.name}
                  </span>
                ))}
                {selectedSupplements.map((f) => (
                  <span
                    key={`s-${f.id}`}
                    className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold border bg-secondary/10 text-secondary border-secondary/20"
                  >
                    {f.name}
                  </span>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="border-t border-border/40 mx-6" />

        <div className="px-6 py-4 space-y-3">
          {composeStep === 1 ? (
            <Button
              className="w-full h-11 rounded-2xl font-bold gap-2 bg-primary hover:bg-primary/90 text-white shadow-[0_8px_25px_rgba(63,109,78,0.25)]"
              disabled={!canGoStep2}
              onClick={() => onStepChange(2)}
            >
              {t('lab.nextSupplements')}
              <ChevronRight className="size-4" />
            </Button>
          ) : !analysis ? (
            <>
              {canAnalyze && (
                <p className="text-[11px] text-muted-foreground text-center">
                  {t('lab.launchAnalysis')}
                </p>
              )}
              <Button
                className="w-full h-11 rounded-2xl font-bold gap-2 bg-[#E0982E] hover:bg-[#E0982E]/90 text-white shadow-[0_8px_25px_rgba(224,152,46,0.25)] active:scale-95 transition-all"
                disabled={(!canAnalyze || analyzing) ? true : undefined}
                onClick={onAnalyze}
              >
                {analyzing ? (
                  <><Loader2 className="size-4 animate-spin" /> {t('lab.analyzing')}</>
                ) : (
                  <><Sparkles className="size-4" /> {t('lab.analyzeWith')}</>
                )}
              </Button>
            </>
          ) : (
            <>
              <div className={`rounded-xl border px-4 py-3 flex items-center justify-between ${cfg!.bg} ${cfg!.border}`}>
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-bold ${cfg!.text}`}>{cfg!.emoji}</span>
                  <span className={`text-sm font-bold ${cfg!.text}`}>{getVerdictLabel(analysis!.verdict, t)}</span>
                </div>
                <span className={`text-base font-bold tabular-nums ${cfg!.text}`}>
                  {analysis.score}
                  <span className="text-xs font-normal opacity-60">/100</span>
                </span>
              </div>

              <Button
                variant="outline"
                className="w-full h-10 rounded-xl gap-2 text-sm font-semibold border-primary/30 text-primary hover:bg-primary/5"
                onClick={() => setSheetOpen(true)}
              >
                <ClipboardList className="size-4" />
                {t('lab.viewNutritionSheet')}
              </Button>
            </>
          )}
        </div>

        <div className="border-t border-border/40 mx-6" />

        <div className="px-6 py-5 space-y-3">
          <Input
            value={cocktailName}
            onChange={(e) => onNameChange(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && canSave && !saving && onSave()}
            placeholder={t('lab.nameInputPlaceholder')}
            className="h-10 rounded-xl text-base"
          />
          <p className="text-[10px] text-muted-foreground -mt-1">
            {t('lab.suggestedByAI')}
          </p>
          <Button
            size="lg"
            className="w-full h-12 rounded-2xl bg-primary hover:bg-primary/90 text-white font-bold shadow-[0_8px_25px_rgba(63,109,78,0.3)] active:scale-95 transition-all gap-2"
            disabled={(!canSave || saving) ? true : undefined}
            onClick={onSave}
          >
            {saving ? (
              t('lab.saving')
            ) : (
              <>
                <Save className="size-4" />
                {analysis ? t('lab.saveWithAnalysis') : t('lab.saveRecipe')}
              </>
            )}
          </Button>
          {!analysis && composeStep === 2 && selectedMainCount > 0 && (
            <p className="text-center text-[11px] text-muted-foreground">
              {t('lab.analyzeFirst')}
            </p>
          )}
        </div>
      </div>

      {analysis && (
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetContent
            side="right"
            className="w-full max-w-[500px] p-0 flex flex-col"
          >
            <NutritionalSheetContent
              analysis={analysis}
              selectedFruits={[...selectedFruits, ...selectedSupplements]}
              onOrderRequest={() => {
                setSheetOpen(false);
                onOrderRequest();
              }}
            />
          </SheetContent>
        </Sheet>
      )}
    </>
  );
}
