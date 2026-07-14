import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

type Props = {
  onStart: () => void;
};

export function ProfileCompletionCard({ onStart }: Props) {
  return (
    <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-primary/10 via-secondary/10 to-accent border border-primary/20 p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4">
      {/* Decorative blob */}
      <div className="absolute -top-8 -right-8 size-32 rounded-full bg-primary/10 blur-2xl pointer-events-none" />
      <div className="absolute -bottom-6 -left-4 size-24 rounded-full bg-secondary/10 blur-2xl pointer-events-none" />

      <div className="relative size-12 rounded-2xl bg-primary/15 flex items-center justify-center shrink-0">
        <Sparkles className="size-6 text-primary" />
      </div>

      <div className="relative flex-1 min-w-0">
        <p className="font-bold text-foreground text-base leading-snug">
          Complète ton profil santé
        </p>
        <p className="text-muted-foreground text-sm mt-0.5 leading-relaxed">
          2 minutes suffisent. NutriFYS personnalisera chaque recommandation selon ton profil.
        </p>
      </div>

      <Button
        onClick={onStart}
        size="sm"
        className="relative rounded-full font-bold shrink-0 gap-1.5"
      >
        Commencer
      </Button>
    </div>
  );
}
