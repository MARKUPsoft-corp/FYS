import { useNavigate } from 'rasengan';
import { ChevronLeft, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ButtonTheme } from '@/components/common/atoms/ButtonTheme';
import { NotificationBell } from '@/components/common/NotificationBell';

export type LabTab = 'compose' | 'supplements' | 'nutrifys';

type Props = {
  activeTab: LabTab;
  onTabChange: (tab: LabTab) => void;
  compact?: boolean;
};

const TABS: { id: LabTab; label: string; nutrifys?: boolean }[] = [
  { id: 'compose', label: 'Je compose' },
  { id: 'nutrifys', label: 'compose', nutrifys: true },
];

export function LabHeader({ activeTab, onTabChange, compact }: Props) {
  const navigate = useNavigate();

  function handleBack() {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/board');
    }
  }

  return (
    <div
      className={cn(
        'relative flex flex-col justify-end pb-6 pt-safe overflow-hidden',
        compact ? 'px-3 lg:px-5' : 'px-5 lg:px-16',
      )}
      style={{
        minHeight: '240px',
        backgroundImage:
          "url('https://images.pexels.com/photos/338713/pexels-photo-338713.jpeg?auto=compress&cs=tinysrgb&w=1600')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <div className="absolute inset-0 bg-gradient-to-b from-primary/80 via-background/90 to-background dark:from-[#28422F]/95 dark:via-background/85 dark:to-background" />

      <div className={cn('relative z-10 mx-auto w-full', compact ? 'max-w-[1480px]' : 'max-w-6xl')}>
        <div className="flex items-center justify-between mt-5 mb-4 w-full">
          <button
            type="button"
            onClick={handleBack}
            className="inline-flex items-center text-foreground bg-background/80 backdrop-blur-sm shadow-sm rounded-full px-3 py-1.5 hover:bg-background transition-colors text-sm font-semibold"
          >
            <ChevronLeft className="size-4 mr-1" /> Retour
          </button>
          <div id="tour-lab-notifications" className="flex items-center gap-3">
            <ButtonTheme />
            <NotificationBell />
          </div>
        </div>

        <div className="flex flex-col lg:flex-row items-center lg:justify-between gap-5 text-center lg:text-left mb-3">
          <div>
            <h1 id="tour-lab-title" className="font-display font-extrabold text-[2rem] lg:text-5xl text-foreground flex items-center justify-center lg:justify-start gap-1.5 mb-1">
              FYS <span className="text-primary">Lab</span>
            </h1>
            <p className="text-muted-foreground text-sm font-medium">Votre jus, validé par NutriFYS</p>
          </div>

          <div id="tour-lab-tabs" className="flex bg-muted/40 backdrop-blur-md rounded-2xl p-1 border border-border/20 shadow-inner w-fit mx-auto lg:mx-0">
            {TABS.map((tab) => {
              const isActive = activeTab === tab.id;

              if (tab.nutrifys) {
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => onTabChange(tab.id)}
                    className={cn(
                      'flex flex-col items-center justify-center px-5 py-2 rounded-xl transition-colors whitespace-nowrap',
                      isActive ? 'bg-card shadow-sm' : 'text-muted-foreground hover:text-foreground',
                    )}
                  >
                    <span
                      className={cn(
                        'text-[7.5px] lg:text-[8px] uppercase font-bold tracking-widest leading-none mb-0.5 flex items-center gap-0.5',
                        'text-secondary', // Ensure it uses the orange semantic color
                      )}
                    >
                      NutriFYS <Sparkles className="size-2.5" />
                    </span>
                    <span
                      className={cn(
                        'text-xs lg:text-sm font-semibold leading-none',
                        isActive ? 'text-card-foreground' : '',
                      )}
                    >
                      compose
                    </span>
                  </button>
                );
              }

              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => onTabChange(tab.id)}
                  className={cn(
                    'px-6 py-3 text-xs lg:text-sm rounded-xl transition-colors whitespace-nowrap',
                    isActive
                      ? 'bg-card text-card-foreground font-bold shadow-sm'
                      : 'font-semibold text-muted-foreground hover:text-foreground',
                  )}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
