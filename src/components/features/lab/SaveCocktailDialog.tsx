import { Loader2, Save, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useTranslation } from 'react-i18next';
import type { Fruit, AIAnalysis } from '@/entities';
import { getVerdictLabel, VERDICT_CONFIG } from './ComposeTab';

// ── Modale d'enregistrement du cocktail ───────────────────────────────────────

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cocktailName: string;
  onNameChange: (name: string) => void;
  selectedFruits: Fruit[];
  selectedSupplements: Fruit[];
  analysis: AIAnalysis | null;
  saving: boolean;
  onSave: () => void;
};

export function SaveCocktailDialog({
  open,
  onOpenChange,
  cocktailName,
  onNameChange,
  selectedFruits,
  selectedSupplements,
  analysis,
  saving,
  onSave,
}: Props) {
  const { t } = useTranslation();
  const cfg = analysis ? VERDICT_CONFIG[analysis.verdict] : null;
  const canSave = cocktailName.trim().length > 0 && !saving;
  const hasComposition = selectedFruits.length > 0 || selectedSupplements.length > 0;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && !saving && onOpenChange(v)}>
      <DialogContent showCloseButton={false} className="max-w-md gap-0 p-0 overflow-hidden rounded-[1.75rem]">
        {/* En-tête */}
        <DialogHeader className="bg-primary/5 border-b border-border/40 px-6 py-5 flex-row items-center gap-3 text-left">
          <div className="size-11 rounded-2xl bg-primary/10 border border-primary/15 flex items-center justify-center shrink-0">
            <Sparkles className="size-5 text-primary" />
          </div>
          <div>
            <DialogTitle className="font-display text-lg font-bold text-foreground">
              {t('lab.saveCocktail')}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground mt-0.5">
              {t('lab.nameDescription')}
            </DialogDescription>
          </div>
        </DialogHeader>

        {/* Verdict IA (si analyse faite) */}
        {cfg && analysis && (
          <div className={`mx-6 mt-5 rounded-xl border px-4 py-3 flex items-center justify-between ${cfg.bg} ${cfg.border}`}>
            <div className="flex items-center gap-2">
              <span className={`text-sm font-bold ${cfg.text}`}>{cfg.emoji}</span>
              <span className={`text-sm font-bold ${cfg.text}`}>{getVerdictLabel(analysis.verdict, t)}</span>
            </div>
            <span className={`text-base font-bold tabular-nums ${cfg.text}`}>
              {analysis.score}
              <span className="text-xs font-normal opacity-60">/100</span>
            </span>
          </div>
        )}

        {/* Composition */}
        {hasComposition && (
          <div className="px-6 mt-5">
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
          </div>
        )}

        {/* Nom */}
        <div className="px-6 mt-5">
          <Input
            autoFocus
            value={cocktailName}
            onChange={(e) => onNameChange(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && canSave && onSave()}
            placeholder={t('lab.nameInputPlaceholder')}
            className="h-12 rounded-xl text-base px-4 bg-muted/30 focus-visible:ring-primary/40"
          />
          <p className="text-[10px] text-muted-foreground mt-1.5 px-0.5">
            {t('lab.suggestedByAI')}
          </p>
        </div>

        {/* Pied : annuler / enregistrer */}
        <DialogFooter className="px-6 py-5 mt-5 border-t border-border/40 flex-row gap-2 sm:gap-2">
          <Button
            variant="outline"
            className="flex-1 h-12 rounded-xl font-semibold"
            disabled={saving}
            onClick={() => onOpenChange(false)}
          >
            {t('common.cancel')}
          </Button>
          <Button
            className="flex-1 h-12 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold gap-2 shadow-[0_8px_25px_rgba(63,109,78,0.3)] active:scale-95 transition-all"
            disabled={!canSave}
            onClick={onSave}
          >
            {saving ? (
              <><Loader2 className="size-4 animate-spin" /> {t('lab.saving')}</>
            ) : (
              <><Save className="size-4" /> {t('common.save')}</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
