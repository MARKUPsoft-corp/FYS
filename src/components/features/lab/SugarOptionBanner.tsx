import { useTranslation } from 'react-i18next';
import { Leaf, Check, AlertCircle, ShieldCheck } from 'lucide-react';
import { labSounds } from '@/services/lab-sounds';

interface Props {
  hasAddedSugar: boolean;
  onChange: (hasSugar: boolean) => void;
}

export function SugarOptionBanner({ hasAddedSugar, onChange }: Props) {
  const { t } = useTranslation();

  function handleSelect(val: boolean) {
    if (val !== hasAddedSugar) {
      labSounds.fruitSelect();
      onChange(val);
    }
  }

  return (
    <div
      className={`rounded-2xl border transition-all duration-300 p-2.5 sm:p-3 relative overflow-hidden ${
        hasAddedSugar
          ? 'border-amber-500/30 bg-amber-500/[0.04]'
          : 'border-emerald-500/30 bg-emerald-500/[0.04]'
      }`}
    >
      {/* ── Ligne principale : Label compact & Switch tactile 2 choix ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div
            className={`size-7 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
              hasAddedSugar
                ? 'bg-amber-500/15 text-amber-600'
                : 'bg-emerald-500/15 text-emerald-600'
            }`}
          >
            {hasAddedSugar ? <span className="text-sm">🍯</span> : <Leaf className="size-3.5" />}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-foreground">
                {t('lab.sugarOption.title')}
              </span>
              <span className="text-[10px] font-semibold text-primary/90 bg-primary/10 px-1.5 py-0.5 rounded-full">
                NutriFYS
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground truncate">
              {hasAddedSugar
                ? t('lab.sugarOption.withSugarSubtitle')
                : t('lab.sugarOption.noSugarSubtitle')}
            </p>
          </div>
        </div>

        {/* Segmented Control tactile 2 boutons côte-à-côte */}
        <div className="grid grid-cols-2 p-1 bg-background/80 dark:bg-card/80 border border-border/60 rounded-xl gap-1 shrink-0">
          <button
            type="button"
            onClick={() => handleSelect(false)}
            className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              !hasAddedSugar
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
            }`}
          >
            <Leaf className="size-3 shrink-0" />
            <span>{t('lab.sugarOption.noSugarBtn')}</span>
            {!hasAddedSugar && <Check className="size-3 shrink-0 ml-0.5" />}
          </button>

          <button
            type="button"
            onClick={() => handleSelect(true)}
            className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              hasAddedSugar
                ? 'bg-amber-500 text-white shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
            }`}
          >
            <span className="text-xs">🍯</span>
            <span>{t('lab.sugarOption.withSugarBtn')}</span>
            {hasAddedSugar && <Check className="size-3 shrink-0 ml-0.5" />}
          </button>
        </div>
      </div>

      {/* ── Micro-note NutriFYS discrète (1 ligne max) ── */}
      <div className="mt-2 pt-1.5 border-t border-border/30 flex items-center justify-between text-[11px]">
        <div className="flex items-center gap-1.5 min-w-0 text-muted-foreground">
          {hasAddedSugar ? (
            <AlertCircle className="size-3 text-amber-500 shrink-0" />
          ) : (
            <ShieldCheck className="size-3 text-emerald-600 shrink-0" />
          )}
          <span className="truncate">
            {hasAddedSugar
              ? t('lab.sugarOption.withSugarNote')
              : t('lab.sugarOption.noSugarNote')}
          </span>
        </div>
        <span
          className={`text-[10px] font-bold shrink-0 ml-2 ${
            hasAddedSugar ? 'text-amber-600' : 'text-emerald-600'
          }`}
        >
          {hasAddedSugar
            ? t('lab.sugarOption.withSugarBadge')
            : t('lab.sugarOption.noSugarBadge')}
        </span>
      </div>
    </div>
  );
}
