import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type TourStepCallbacks = {
  next: () => void;
  prev: () => void;
  end: () => void;
};

type TourStepCardProps = TourStepCallbacks & {
  step: number;
  total: number;
  title: string;
  description: string;
  hint?: string;
  showPrev?: boolean;
  nextLabel?: string;
  isLast?: boolean;
};

export function TourStepCard({
  step,
  total,
  title,
  description,
  hint,
  showPrev = false,
  nextLabel = 'Suivant',
  isLast = false,
  next,
  prev,
  end,
}: TourStepCardProps) {
  return (
    <div className="w-[min(100vw-2rem,22rem)] bg-card border border-border/60 rounded-[1.5rem] shadow-xl p-5 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-[11px] font-bold uppercase tracking-wide">
          Visite guidée
        </span>
        <span className="text-[11px] font-semibold text-muted-foreground tabular-nums">
          {step} / {total}
        </span>
      </div>

      <div className="space-y-2">
        <h3 className="font-display font-bold text-lg text-foreground leading-snug">{title}</h3>
        <p className="text-[13px] text-muted-foreground leading-relaxed">{description}</p>
        {hint && (
          <p className="text-[12px] text-foreground/80 bg-muted/60 border border-border/50 rounded-xl px-3 py-2.5 leading-relaxed">
            {hint}
          </p>
        )}
      </div>

      <div className="flex items-center gap-1.5" aria-hidden>
        {Array.from({ length: total }).map((_, i) => (
          <span
            key={i}
            className={cn(
              'h-1.5 rounded-full transition-all duration-300',
              i + 1 === step ? 'w-5 bg-primary' : 'w-1.5 bg-border',
            )}
          />
        ))}
      </div>

      <div className="flex items-center justify-between gap-2 pt-0.5">
        <button
          type="button"
          onClick={end}
          className="text-[12px] font-semibold text-muted-foreground hover:text-foreground transition-colors px-1"
        >
          Passer
        </button>
        <div className="flex items-center gap-2">
          {showPrev && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={prev}
              className="rounded-full h-9 px-4 font-semibold border-border/60"
            >
              Retour
            </Button>
          )}
          <Button
            type="button"
            size="sm"
            onClick={isLast ? end : next}
            className="rounded-full h-9 px-5 font-bold bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {isLast ? "C'est parti !" : nextLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
