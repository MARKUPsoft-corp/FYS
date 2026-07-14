import {
  Shield, Zap, Leaf, Droplets, Heart, Sparkles, Moon, Wind,
  Lightbulb, Link2,
} from 'lucide-react';
import type { AIAnalysis, AIVerdict, NutrientInfo } from '@/entities';

// ── Display constants ─────────────────────────────────────────────────────────

export const VERDICT_CONFIG: Record<AIVerdict, {
  label: string;
  emoji: string;
  bg: string;
  border: string;
  text: string;
  bar: string;
  chip: string;
}> = {
  beneficial: {
    label: 'Bénéfique', emoji: '✦',
    bg: 'bg-emerald-50 dark:bg-emerald-950/30',
    border: 'border-emerald-200 dark:border-emerald-700',
    text: 'text-emerald-700 dark:text-emerald-400',
    bar: 'bg-emerald-500',
    chip: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-400',
  },
  neutral: {
    label: 'Neutre', emoji: '◈',
    bg: 'bg-slate-50 dark:bg-slate-900/30',
    border: 'border-slate-200 dark:border-slate-700',
    text: 'text-slate-600 dark:text-slate-400',
    bar: 'bg-slate-400',
    chip: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
  },
  caution: {
    label: 'Avec réserve', emoji: '⚠',
    bg: 'bg-amber-50 dark:bg-amber-950/30',
    border: 'border-amber-200 dark:border-amber-700',
    text: 'text-amber-700 dark:text-amber-400',
    bar: 'bg-amber-500',
    chip: 'bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-400',
  },
  not_recommended: {
    label: 'Déconseillé', emoji: '✕',
    bg: 'bg-red-50 dark:bg-red-950/30',
    border: 'border-red-200 dark:border-red-700',
    text: 'text-red-700 dark:text-red-400',
    bar: 'bg-red-500',
    chip: 'bg-red-100 text-red-700 dark:bg-red-900/60 dark:text-red-400',
  },
};

export const NUTRIENT_META: Record<string, { label: string; bar: string }> = {
  vitamineC:      { label: 'Vitamine C',   bar: 'bg-orange-400'  },
  vitamineA:      { label: 'Vitamine A',   bar: 'bg-yellow-400'  },
  fibres:         { label: 'Fibres',       bar: 'bg-emerald-500' },
  potassium:      { label: 'Potassium',    bar: 'bg-sky-400'     },
  sucresNaturels: { label: 'Sucres nat.',  bar: 'bg-rose-400'    },
  antioxydants:   { label: 'Antioxydants', bar: 'bg-violet-500'  },
};

export const BENEFIT_ICONS: Record<string, React.ElementType> = {
  'immunité':            Shield,
  'énergie':             Zap,
  'digestion':           Leaf,
  'hydratation':         Droplets,
  'anti-inflammatoire':  Heart,
  'peau':                Sparkles,
  'sommeil':             Moon,
  'stress':              Wind,
};

const BENEFIT_LEVEL_STYLE: Record<string, { chip: string; dots: number }> = {
  faible: { chip: 'bg-muted text-muted-foreground border border-border/60',                                                                   dots: 1 },
  modéré: { chip: 'bg-primary/10 text-primary border border-primary/20',                                                                      dots: 2 },
  élevé:  { chip: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-700', dots: 3 },
};

// ── Component ─────────────────────────────────────────────────────────────────

export function NutritionalView({ analysis }: { analysis: AIAnalysis }) {
  const cfg = VERDICT_CONFIG[analysis.verdict];

  const nutrients = (
    Object.entries(analysis.profilNutritionnel) as [string, NutrientInfo | undefined][]
  )
    .filter((e): e is [string, NutrientInfo] => e[1] !== undefined)
    .sort((a, b) => b[1].pourcentage - a[1].pourcentage);

  return (
    <div className="space-y-6">

      {/* Verdict + score + notes */}
      <div className={`rounded-2xl border p-4 space-y-3 ${cfg.bg} ${cfg.border}`}>
        <div className="flex items-center justify-between">
          <span className={`text-sm font-bold ${cfg.text}`}>{cfg.emoji} {cfg.label}</span>
          <span className={`text-base font-bold tabular-nums ${cfg.text}`}>
            {analysis.score}<span className="text-xs font-normal opacity-60">/100</span>
          </span>
        </div>
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
        <div className="space-y-3">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
            Profil nutritionnel · AJR adulte
          </p>
          <div className="space-y-3">
            {nutrients.map(([id, info]) => {
              const meta = NUTRIENT_META[id] ?? { label: id, bar: 'bg-primary' };
              return (
                <div key={id} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] font-semibold text-foreground/70">{meta.label}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[12px] font-bold text-foreground">{info.valeur}</span>
                      <span className="text-[11px] font-bold tabular-nums text-muted-foreground">
                        {info.pourcentage}%<span className="text-[10px] font-normal"> AJR</span>
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
            })}
          </div>
        </div>
      )}

      {/* Bénéfices ciblés */}
      {analysis.beneficesCibles.length > 0 && (
        <div className="space-y-3">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
            Bénéfices ciblés
          </p>
          <div className="flex flex-wrap gap-2">
            {analysis.beneficesCibles.map((b) => {
              const Icon = BENEFIT_ICONS[b.nom] ?? Sparkles;
              const style = BENEFIT_LEVEL_STYLE[b.niveau] ?? BENEFIT_LEVEL_STYLE['modéré'];
              return (
                <span
                  key={b.nom}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-semibold ${style.chip}`}
                >
                  <Icon className="size-3.5 shrink-0" />
                  <span className="capitalize">{b.nom}</span>
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
            })}
          </div>
        </div>
      )}

      {/* Interactions */}
      {analysis.interactionsFruits.length > 0 && (
        <div className="space-y-3">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
            <Link2 className="size-3" />
            Interactions entre fruits
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
  );
}
