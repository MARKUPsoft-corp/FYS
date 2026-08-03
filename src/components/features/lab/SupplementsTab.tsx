import { useTranslation } from 'react-i18next';
import { Lightbulb, Sparkles } from 'lucide-react';
import type { Fruit } from '@/entities';
import { MAX_LAB_SUPPLEMENTS } from '@/entities';
import { isUsableFruit, isUsableAsSupplement } from '@/entities';
import type { AIRecommendation } from '@/services/ai.shared';
import { cn } from '@/lib/utils';

type Props = {
  selectedFruits: Fruit[];
  /** Catalogue complet (actifs + indisponibles) — le grisé est calculé ici même */
  fruits: Fruit[];
  selectedSupplementIds: string[];
  onToggleSupplement: (id: string) => void;
  aiRecommendation?: AIRecommendation | null;
  loadingAI?: boolean;
};

function ItemTile({
  item,
  selected,
  onClick,
  accent = 'primary',
  badge,
  disabled = false,
  unavailable = false,
}: {
  item: Fruit;
  selected: boolean;
  onClick: () => void;
  accent?: 'primary' | 'secondary';
  badge?: string;
  disabled?: boolean;
  unavailable?: boolean;
}) {
  const selectedCls =
    accent === 'primary'
      ? 'bg-primary/10 border-primary shadow-[0_4px_12px_rgba(63,109,78,0.15)] animate-card-bounce'
      : 'bg-secondary/10 border-secondary shadow-[0_4px_12px_rgba(242,105,74,0.15)] animate-card-bounce';
  const textCls =
    accent === 'primary' ? 'text-primary' : 'text-secondary';

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'relative flex flex-col items-center justify-start gap-1.5 p-2.5 rounded-[1.25rem] transition-colors duration-300 border-2',
        unavailable
          ? 'bg-muted/40 border-border/30 opacity-45 cursor-not-allowed grayscale'
          : selected
          ? selectedCls
          : disabled
          ? 'bg-muted/40 border-border/30 opacity-45 cursor-not-allowed'
          : 'bg-card border-border/60 hover:border-primary/40 shadow-sm hover:-translate-y-0.5 opacity-80',
      )}
    >
      {selected && (
        <span className="absolute inset-0 rounded-[1.25rem] overflow-hidden pointer-events-none">
          <span className="absolute inset-0 bg-gradient-to-br from-transparent via-white/25 to-transparent animate-wave-sweep" />
        </span>
      )}
      {badge && (
        <span className="absolute -top-1.5 -right-1.5 z-10 text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-[#E0982E] text-white shadow-sm">
          {badge}
        </span>
      )}
      {item.imageUrl ? (
        <div
          className="w-full aspect-square rounded-xl bg-cover bg-center ring-1 ring-inset ring-black/5"
          style={{ backgroundImage: `url('${item.imageUrl}')` }}
        />
      ) : (
        <div className={cn(
          'w-full aspect-square rounded-xl flex items-center justify-center text-2xl',
          accent === 'primary' ? 'bg-primary/10' : 'bg-secondary/10',
        )}>
          ✦
        </div>
      )}
      <span className={cn(
        'text-[10px] font-semibold text-center line-clamp-1 w-full',
        selected ? textCls : 'text-muted-foreground',
      )}>
        {item.name}
      </span>
    </button>
  );
}

export function SupplementsTab({
  selectedFruits,
  fruits,
  selectedSupplementIds,
  onToggleSupplement,
  aiRecommendation,
  loadingAI,
}: Props) {
  const { t } = useTranslation();
  // Calculé ici même depuis le catalogue complet : un supplément indisponible
  // (isActive: false) est grisé et non cliquable, comme à l'étape 1.
  const supplements = fruits.filter((f) => isUsableAsSupplement(f) && isUsableFruit(f));
  const unavailableSupplements = fruits.filter((f) => isUsableAsSupplement(f) && !isUsableFruit(f));
  const recommendedIds = new Set(aiRecommendation?.recommendedIds ?? []);
  const recommended = supplements.filter((s) => recommendedIds.has(s.id));
  const others = supplements.filter((s) => !recommendedIds.has(s.id));
  const highlighted = supplements.find((s) => s.id === aiRecommendation?.highlightedSupplementId);
  const atMaxSupplements = selectedSupplementIds.length >= MAX_LAB_SUPPLEMENTS;

  function renderTile(s: Fruit, accent: 'primary' | 'secondary', badge?: string, unavailable = false) {
    const selected = selectedSupplementIds.includes(s.id);
    const disabled = unavailable || (!selected && atMaxSupplements);
    return (
      <ItemTile
        key={s.id}
        item={s}
        selected={selected}
        disabled={disabled}
        unavailable={unavailable}
        onClick={() => onToggleSupplement(s.id)}
        accent={accent}
        badge={badge}
      />
    );
  }

  return (
    <div className="space-y-6">
      <section>
        <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3">
          {t('lab.selectedFruits')}
        </h3>
        <div className="flex flex-wrap gap-2">
          {selectedFruits.map((fruit) => (
            <div
              key={fruit.id}
              className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-full bg-primary/10 border border-primary/20"
            >
              {fruit.imageUrl ? (
                <div
                  className="size-6 rounded-full bg-cover bg-center"
                  style={{ backgroundImage: `url('${fruit.imageUrl}')` }}
                />
              ) : (
                <span className="size-6 rounded-full bg-primary/20 flex items-center justify-center text-[10px]">🍓</span>
              )}
              <span className="text-[11px] font-semibold text-primary">{fruit.name}</span>
            </div>
          ))}
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between gap-2 mb-3">
          <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
            <Sparkles className="size-3 text-[#E0982E]" />
            {t('lab.suggestions')}
          </h3>
          <span className={`text-[11px] font-bold tabular-nums ${
            atMaxSupplements ? 'text-secondary' : 'text-muted-foreground'
          }`}>
            {selectedSupplementIds.length}/{MAX_LAB_SUPPLEMENTS}
          </span>
        </div>

        {atMaxSupplements && (
          <p className="text-[11px] text-secondary font-semibold mb-3">
            {t('lab.maxSupplementsReachedDesc')}
          </p>
        )}

        {loadingAI ? (
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="aspect-square rounded-[1.25rem] bg-muted/60 animate-pulse" />
            ))}
          </div>
        ) : recommended.length === 0 ? (
          <p className="text-sm text-muted-foreground font-medium py-4 px-3 rounded-xl bg-muted/30 border border-border/40">
            {t('lab.noSuggestions')}
          </p>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-3">
            {recommended.map((s) =>
              renderTile(s, 'secondary', s.id === highlighted?.id ? 'Top' : 'IA'),
            )}
          </div>
        )}
      </section>

      {!loadingAI && highlighted && selectedSupplementIds.includes(highlighted.id) && aiRecommendation?.why && (
        <div className="bg-[#E0982E]/10 border border-[#E0982E]/30 rounded-2xl p-4 flex gap-3">
          <div className="size-9 rounded-xl bg-[#E0982E]/15 flex items-center justify-center shrink-0">
            <Lightbulb className="size-4 text-[#E0982E]" />
          </div>
          <div>
            <p className="text-sm font-bold text-foreground mb-1">
              {t('lab.whySupplement', { name: highlighted.name.toLowerCase() })}
            </p>
            <p className="text-[12px] text-muted-foreground font-medium leading-relaxed">
              {aiRecommendation.why}
            </p>
          </div>
        </div>
      )}

      <section>
        <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3">
          {t('lab.allSupplements')}
        </h3>
        {supplements.length === 0 && unavailableSupplements.length === 0 ? (
          <p className="text-sm text-muted-foreground font-medium py-6 text-center rounded-xl border border-dashed border-border">
            {t('lab.noSupplements')}
          </p>
        ) : others.length === 0 && unavailableSupplements.length === 0 ? (
          <p className="text-[11px] text-muted-foreground">
            {t('lab.allAvailableSupplements')}
          </p>
        ) : (
          <>
            {others.length > 0 && (
              <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-3">
                {others.map((s) => renderTile(s, 'secondary'))}
              </div>
            )}
            {unavailableSupplements.length > 0 && (
              <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-3 mt-3">
                {unavailableSupplements.map((s) => renderTile(s, 'secondary', t('lab.unavailable'), true))}
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}