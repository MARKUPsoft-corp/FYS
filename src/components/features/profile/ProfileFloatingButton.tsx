import { Sparkles } from 'lucide-react';

type Props = {
  onClick: () => void;
};

export function ProfileFloatingButton({ onClick }: Props) {
  return (
    <button
      onClick={onClick}
      className="fixed bottom-24 right-4 z-40 flex items-center gap-2.5 bg-primary text-primary-foreground rounded-full shadow-lg shadow-primary/30 px-4 py-3 font-semibold text-sm hover:bg-primary/90 hover:scale-105 active:scale-95 transition-all duration-200 lg:bottom-6"
    >
      <Sparkles className="size-4 shrink-0" />
      Mon profil santé
      <span className="size-2 rounded-full bg-white/70 animate-pulse" />
    </button>
  );
}
