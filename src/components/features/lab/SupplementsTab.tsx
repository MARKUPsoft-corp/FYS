import { Lightbulb, Sparkles } from 'lucide-react';
import type { Fruit } from '@/entities';
import { MAX_LAB_SUPPLEMENTS } from '@/entities';
import type { AIRecommendation } from '@/services/ai.shared';
import { cn } from '@/lib/utils';

type Props = {
  selectedFruits: Fruit[];
  supplements: Fruit[];
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
}: {
  item: Fruit;
  selected: boolean;
  onClick: () => void;
  accent?: 'primary' | 'secondary';
  badge?: string;
  disabled?: boolean;
}) {
  const selectedCls =
    accent === 'primary'
      ? 'bg-primary/10 border-primary shadow-[0_4px_12px_rgba(63,109,78,0.15)] scale-[0.97]'
      : 'bg-secondary/10 border-secondary shadow-[0_4px_12px_rgba(242,105,74,0.15)] scale-[0.97]';
  const textCls =
    accent === 'primary' ? 'text-primary' : 'text-secondary';

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'relative flex flex-col items-center justify-start gap-1.5 p-2.5 rounded-[1.25rem] transition-all duration-200 border-2',
        selected
          ? selectedCls
          : disabled
          ? 'bg-muted/40 border-border/30 opacity-45 cursor-not-allowed'
          : 'bg-card border-border/60 hover:border-primary/40 shadow-sm hover:-translate-y-0.5 opacity-80',
      )}
    >
      {badge && (
        <span className="absolute -top-1.5 -right-1.5 z-10 text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-[#E0982E] text-white shadow-sm">
          {badge}
        </span>
      )}
      {item.imageUrl ? (
        <div
          className="w-full aspect-square rounded-xl bg-cover bg-center"
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
  supplements,
  selectedSupplementIds,
  onToggleSupplement,
  aiRecommendation,
  loadingAI,
}: Props) {
  const recommendedIds = new Set(aiRecommendation?.recommendedIds ?? []);
  const recommended = supplements.filter((s) => recommendedIds.has(s.id));
  const others = supplements.filter((s) => !recommendedIds.has(s.id));
  const highlighted = supplements.find((s) => s.id === aiRecommendation?.highlightedSupplementId);
  const atMaxSupplements = selectedSupplementIds.length >= MAX_LAB_SUPPLEMENTS;

  const fruitNames = selectedFruits.map((f) => f.name).join(' + ');

  function renderTile(s: Fruit, accent: 'primary' | 'secondary', badge?: string) {
    const selected = selectedSupplementIds.includes(s.id);
    const disabled = !selected && atMaxSupplements;
    return (
      <ItemTile
        key={s.id}
        item={s}
        selected={selected}
        disabled={disabled}
        onClick={() => onToggleSupplement(s.id)}
        accent={accent}
        badge={badge}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="relative z-20 bg-[#28422F] rounded-2xl p-4 border border-primary/20 shadow-lg flex items-start gap-4 min-h-[100px]">
        <div className="size-10 rounded-full bg-primary/30 flex items-center justify-center shrink-0 border border-accent/30">
          <Sparkles className="size-4 text-[#E0982E]" />
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-[#E0982E] text-[10px] font-bold uppercase tracking-widest block mb-1">
            NutriFYS
          </span>
          {loadingAI ? (
            <div className="animate-pulse flex flex-col gap-2 mt-2 w-full">
              <div className="h-3 bg-white/20 rounded w-full" />
              <div className="h-3 bg-white/20 rounded w-4/5" />
            </div>
          ) : (
            <p className="text-white/90 text-[12px] md:text-[13px] font-medium leading-relaxed">
              Basé sur{' '}
              <span className="text-white font-semibold">{fruitNames || 'votre sélection'}</span>
              {aiRecommendation?.profileLabel && (
                <>
                  {' '}
                  <span className="text-[#E0982E] font-bold">
                    (profil {aiRecommendation.profileLabel})
                  </span>
                </>
              )}
              , voici les suppléments que je vous propose (max. {MAX_LAB_SUPPLEMENTS}). Vous pouvez les retirer ou en ajouter d&apos;autres.
            </p>
          )}
        </div>
      </div>

      <section>
        <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3">
          Votre base fruitée
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
            Propositions NutriFYS
          </h3>
          <span className={`text-[11px] font-bold tabular-nums ${
            atMaxSupplements ? 'text-secondary' : 'text-muted-foreground'
          }`}>
            {selectedSupplementIds.length}/{MAX_LAB_SUPPLEMENTS}
          </span>
        </div>

        {atMaxSupplements && (
          <p className="text-[11px] text-secondary font-semibold mb-3">
            Limite atteinte — retirez un supplément pour en ajouter un autre.
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
            Aucune suggestion pour l&apos;instant — choisissez librement dans la liste ci-dessous.
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
              Pourquoi le {highlighted.name.toLowerCase()} ?
            </p>
            <p className="text-[12px] text-muted-foreground font-medium leading-relaxed">
              {aiRecommendation.why}
            </p>
          </div>
        </div>
      )}

      <section>
        <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3">
          Tous les suppléments
        </h3>
        {supplements.length === 0 ? (
          <p className="text-sm text-muted-foreground font-medium py-6 text-center rounded-xl border border-dashed border-border">
            Aucun supplément en base. L&apos;admin peut en ajouter depuis Fruits &amp; suppléments.
          </p>
        ) : others.length === 0 ? (
          <p className="text-[11px] text-muted-foreground">
            Tous les suppléments disponibles sont déjà proposés ci-dessus.
          </p>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-3">
            {others.map((s) => renderTile(s, 'secondary'))}
          </div>
        )}
      </section>
    </div>
  );
}
