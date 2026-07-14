import { Flame, Globe, Lock, MoreVertical, Trash2, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { Cocktail, AIVerdict } from '@/entities';

// ── Ingredient summary helper ─────────────────────────────────────────────────

export function ingredientSummary(cocktail: Cocktail): string {
  return cocktail.ingredients.map((i) => i.fruitName).join(' · ');
}

// ── AI verdict pill ───────────────────────────────────────────────────────────

const VERDICT_STYLES: Record<AIVerdict, { label: string; className: string }> = {
  beneficial:       { label: '✦ Bénéfique',        className: 'bg-emerald-500/90 text-white' },
  neutral:          { label: '◈ Neutre',            className: 'bg-slate-500/90 text-white' },
  caution:          { label: '⚠ Avec réserve',      className: 'bg-amber-500/90 text-white' },
  not_recommended:  { label: '✕ Déconseillé',       className: 'bg-destructive/90 text-white' },
};

function VerdictPill({ verdict }: { verdict: AIVerdict }) {
  const { label, className } = VERDICT_STYLES[verdict];
  return (
    <span className={`text-[9px] font-bold tracking-wider uppercase px-2.5 py-1 rounded-full backdrop-blur-sm ${className}`}>
      {label}
    </span>
  );
}

// ── Card ──────────────────────────────────────────────────────────────────────

type Props = {
  cocktail: Cocktail;
  /** Catalogue context — opens a detail drawer */
  onView?: (cocktail: Cocktail) => void;
  /** "Mes Cocktails" context — shows visibility badge + action menu */
  showActions?: boolean;
  onTogglePublish?: (cocktail: Cocktail) => void;
  onDelete?: (cocktail: Cocktail) => void;
};

export function CocktailCard({ cocktail, onView, showActions, onTogglePublish, onDelete }: Props) {
  const summary = ingredientSummary(cocktail);
  const hasImage = !!cocktail.imageUrl;

  return (
    <div
      onClick={() => onView?.(cocktail)}
      className={`rounded-[1.75rem] overflow-hidden border border-border/50 bg-card shadow-sm group transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl ${onView ? 'cursor-pointer' : ''}`}
    >
      {/* ── Image zone ── */}
      <div className="relative h-52 overflow-hidden">

        {/* Background */}
        {hasImage ? (
          <div
            className="absolute inset-0 bg-cover bg-center scale-100 group-hover:scale-105 transition-transform duration-700"
            style={{ backgroundImage: `url('${cocktail.imageUrl}')` }}
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-accent/30 to-secondary/15 flex items-center justify-center">
            <span className="text-7xl opacity-50 drop-shadow-sm">🍹</span>
          </div>
        )}

        {/* Gradient scrim — bottom fade */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/5 to-transparent" />

        {/* Tag — top left */}
        {cocktail.tag && !showActions && (
          <div className="absolute top-3 left-3 z-10 bg-secondary text-white text-[9px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full shadow-md">
            {cocktail.tag}
          </div>
        )}

        {/* Visibility badge — top left (my cocktails) */}
        {showActions && (
          <div className="absolute top-3 left-3 z-10">
            {cocktail.isPublic ? (
              <Badge variant="success" className="gap-1 text-[10px] shadow-md backdrop-blur-sm">
                <Globe className="size-3" /> Public
              </Badge>
            ) : (
              <Badge className="gap-1 text-[10px] bg-black/50 text-white border-0 shadow-md backdrop-blur-sm hover:bg-black/50">
                <Lock className="size-3" /> Privé
              </Badge>
            )}
          </div>
        )}

        {/* AI verdict — top right (catalogue, when analysis present) */}
        {!showActions && cocktail.aiAnalysis && (
          <div className="absolute top-3 right-3 z-10">
            <VerdictPill verdict={cocktail.aiAnalysis.verdict} />
          </div>
        )}

        {/* Action menu — top right (my cocktails) */}
        {showActions && (onTogglePublish || onDelete) && (
          <div className="absolute top-3 right-3 z-10" onClick={(e) => e.stopPropagation()}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 rounded-full bg-black/40 hover:bg-black/60 text-white border-0 backdrop-blur-sm"
                >
                  <MoreVertical className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                {onTogglePublish && (
                  <DropdownMenuItem onClick={() => onTogglePublish(cocktail)}>
                    {cocktail.isPublic ? (
                      <><Lock className="size-4 mr-2" /> Rendre privé</>
                    ) : (
                      <><Globe className="size-4 mr-2" /> Publier</>
                    )}
                  </DropdownMenuItem>
                )}
                {onDelete && (
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={() => onDelete(cocktail)}
                  >
                    <Trash2 className="size-4 mr-2" /> Supprimer
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}

        {/* Ingredient count pill — bottom left, over scrim */}
        {cocktail.ingredients.length > 0 && (
          <div className="absolute bottom-3 left-3 flex items-center gap-1 bg-black/40 backdrop-blur-sm text-white text-[10px] font-semibold px-2.5 py-1 rounded-full">
            <Flame className="size-3 text-secondary" />
            {cocktail.ingredients.length} fruit{cocktail.ingredients.length > 1 ? 's' : ''}
          </div>
        )}
      </div>

      {/* ── Info zone ── */}
      <div className="px-4 pt-4 pb-4 space-y-3">

        {/* Name + summary */}
        <div className="space-y-1">
          <h4 className="font-display font-bold text-[1.05rem] text-foreground leading-tight line-clamp-1">
            {cocktail.name}
          </h4>
          <p className="text-[11px] text-muted-foreground line-clamp-1 font-medium">
            {summary || cocktail.description || '—'}
          </p>
        </div>

        {/* Price + CTA row */}
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-base font-bold text-primary leading-none">
              {cocktail.totalPrice > 0 ? `${cocktail.totalPrice.toLocaleString()} XAF` : '—'}
            </p>
            <p className="text-[9px] text-muted-foreground mt-0.5">+ 500 livraison</p>
          </div>
          {onView && (
            <Button
              size="sm"
              className="rounded-full h-9 px-4 font-bold bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground transition-all gap-1.5 shrink-0 text-xs"
              onClick={(e) => { e.stopPropagation(); onView(cocktail); }}
            >
              Voir <ArrowRight className="size-3" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
