import type { ReactNode } from 'react';
import { CocktailType, type Cocktail } from '@/entities';
import { cn } from '@/lib/utils';

export type FruitVisual = {
  name?: string;
  imageUrl?: string | null;
};

type Props = {
  cocktailName?: string;
  clientName?: string;
  /** Fruits sélectionnés (image optionnelle → placeholder) */
  fruits?: FruitVisual[];
  /** Fallback cover si aucun fruit */
  imageUrl?: string | null;
  fruitNames?: string[];
  /** Affiche nom / client (étiquette). false = visuel seul (cartes). */
  showText?: boolean;
  className?: string;
  heightClass?: string;
  badge?: ReactNode;
};

type Slot = { top: string; left: string; size: string; z: number };

/**
 * Visuel cocktail généré dynamiquement :
 * collage des fruits (+ placeholders) + optionnellement le texte étiquette.
 */
export function CocktailBanner({
  cocktailName = 'Cocktail',
  clientName,
  fruits = [],
  imageUrl,
  fruitNames = [],
  showText = true,
  className,
  heightClass = 'h-52',
  badge,
}: Props) {
  const slots = fruits.length > 0
    ? fruits
    : imageUrl
      ? [{ name: cocktailName, imageUrl }]
      : [];

  const names = fruitNames.length
    ? fruitNames
    : fruits.map((f) => f.name).filter((n): n is string => !!n);

  return (
    <div
      className={cn(
        'relative overflow-hidden shrink-0 select-none',
        heightClass,
        className,
      )}
    >
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at 20% 0%, #5BA87A 0%, transparent 50%), radial-gradient(ellipse at 90% 100%, #F2694A33 0%, transparent 45%), linear-gradient(160deg, #28422F 0%, #3F6D4E 48%, #1F3326 100%)',
        }}
      />

      <div
        className="absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            'radial-gradient(circle at 1px 1px, #fff 1px, transparent 0)',
          backgroundSize: '18px 18px',
        }}
      />

      <div className="absolute inset-0 pointer-events-none">
        {slots.length > 0 ? (
          <FruitOrbit fruits={slots} centered={!showText} />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-7xl opacity-40">
            🍹
          </div>
        )}
      </div>

      {showText && (
        <>
          <div className="absolute inset-y-0 left-0 w-[42%] bg-gradient-to-r from-[#1A2E20]/80 via-[#1A2E20]/35 to-transparent z-[6]" />
          <div className="absolute inset-0 z-10 flex flex-col justify-end p-4 sm:p-5">
            <div className="max-w-[58%]">
              <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.22em] text-[#E0982E] mb-1.5">
                FYS · Création
              </p>
              <h3
                className="font-display text-xl sm:text-2xl font-bold leading-tight line-clamp-2 drop-shadow-[0_2px_8px_rgba(0,0,0,0.45)]"
                style={{ color: '#F2694A' }}
              >
                {cocktailName || 'Cocktail'}
              </h3>
              {clientName && (
                <p className="mt-2 text-[12px] sm:text-[13px] text-white/90 font-medium truncate">
                  pour <span className="text-white font-semibold">{clientName}</span>
                </p>
              )}
              {names.length > 0 && (
                <p className="mt-1.5 text-[10px] text-white/55 line-clamp-1 font-medium">
                  {names.slice(0, 5).join(' · ')}
                  {names.length > 5 ? '…' : ''}
                </p>
              )}
            </div>
          </div>
        </>
      )}

      {badge && <div className="absolute top-3 right-3 z-20">{badge}</div>}
    </div>
  );
}

function FruitOrbit({ fruits, centered }: { fruits: FruitVisual[]; centered?: boolean }) {
  const layout = buildLayout(fruits.length, centered);

  return (
    <>
      {fruits.map((fruit, i) => {
        const slot = layout[i] ?? layout[layout.length - 1];
        return (
          <div
            key={`${fruit.name ?? 'fruit'}-${i}`}
            className="absolute rounded-full overflow-hidden shadow-[0_10px_24px_rgba(0,0,0,0.35)] border-[2.5px] border-white/35 bg-[#AECBB2]"
            style={{
              top: slot.top,
              left: slot.left,
              width: slot.size,
              height: slot.size,
              zIndex: slot.z,
            }}
          >
            {fruit.imageUrl ? (
              <img
                src={fruit.imageUrl}
                alt={fruit.name ?? ''}
                className="size-full object-cover"
                loading="eager"
                referrerPolicy="no-referrer"
              />
            ) : (
              <FruitPlaceholder name={fruit.name} />
            )}
          </div>
        );
      })}
      <div
        className="absolute rounded-full border border-[#E0982E]/35 pointer-events-none"
        style={{
          top: centered ? '18%' : '14%',
          left: centered ? '28%' : '48%',
          width: centered ? '48%' : '42%',
          height: centered ? '48%' : '42%',
          zIndex: 1,
        }}
      />
    </>
  );
}

function FruitPlaceholder({ name }: { name?: string }) {
  const initial = name?.trim()?.[0]?.toUpperCase() ?? '?';
  return (
    <div
      className="size-full flex flex-col items-center justify-center gap-0.5"
      style={{
        background:
          'linear-gradient(145deg, #AECBB2 0%, #5BA87A 55%, #3F6D4E 100%)',
      }}
    >
      <span className="text-white/90 font-display font-bold text-[clamp(1rem,4vw,1.75rem)] leading-none drop-shadow-sm">
        {initial}
      </span>
      <span className="text-[9px] font-semibold uppercase tracking-wider text-white/55 px-1 truncate max-w-[90%]">
        {name ? name.slice(0, 8) : 'fruit'}
      </span>
    </div>
  );
}

/** Positions en orbite — toutes les pastilles restent visibles. */
function buildLayout(count: number, centered?: boolean): Slot[] {
  if (count <= 0) return [];

  const preset: Record<number, Slot[]> = centered
    ? {
        1: [{ top: '14%', left: '22%', size: '66%', z: 3 }],
        2: [
          { top: '10%', left: '8%', size: '52%', z: 2 },
          { top: '28%', left: '42%', size: '50%', z: 4 },
        ],
        3: [
          { top: '4%', left: '18%', size: '46%', z: 2 },
          { top: '38%', left: '4%', size: '42%', z: 4 },
          { top: '30%', left: '48%', size: '44%', z: 3 },
        ],
        4: [
          { top: '2%', left: '22%', size: '42%', z: 2 },
          { top: '34%', left: '2%', size: '38%', z: 4 },
          { top: '18%', left: '48%', size: '40%', z: 3 },
          { top: '52%', left: '36%', size: '36%', z: 5 },
        ],
        5: [
          { top: '0%', left: '24%', size: '38%', z: 2 },
          { top: '28%', left: '0%', size: '36%', z: 4 },
          { top: '12%', left: '52%', size: '38%', z: 3 },
          { top: '50%', left: '28%', size: '34%', z: 5 },
          { top: '44%', left: '58%', size: '30%', z: 3 },
        ],
      }
    : {
        1: [{ top: '10%', left: '42%', size: '72%', z: 3 }],
        2: [
          { top: '6%', left: '36%', size: '54%', z: 2 },
          { top: '34%', left: '56%', size: '48%', z: 4 },
        ],
        3: [
          { top: '2%', left: '38%', size: '48%', z: 2 },
          { top: '40%', left: '30%', size: '42%', z: 4 },
          { top: '26%', left: '60%', size: '40%', z: 3 },
        ],
        4: [
          { top: '0%', left: '40%', size: '44%', z: 2 },
          { top: '36%', left: '28%', size: '38%', z: 4 },
          { top: '20%', left: '60%', size: '40%', z: 3 },
          { top: '52%', left: '50%', size: '34%', z: 5 },
        ],
        5: [
          { top: '0%', left: '42%', size: '40%', z: 2 },
          { top: '30%', left: '26%', size: '36%', z: 4 },
          { top: '16%', left: '62%', size: '38%', z: 3 },
          { top: '52%', left: '42%', size: '32%', z: 5 },
          { top: '46%', left: '68%', size: '28%', z: 3 },
        ],
      };

  if (count <= 5 && preset[count]) return preset[count];

  // 6+ : cercle compact
  const cx = centered ? 42 : 58;
  const cy = 42;
  const radius = centered ? 28 : 30;
  const size = Math.max(22, Math.min(34, 120 / count));
  return Array.from({ length: count }, (_, i) => {
    const angle = -Math.PI / 2 + (i / count) * Math.PI * 2;
    const x = cx + Math.cos(angle) * radius - size / 2;
    const y = cy + Math.sin(angle) * radius - size / 2;
    return {
      top: `${Math.max(0, y)}%`,
      left: `${Math.max(0, Math.min(100 - size, x))}%`,
      size: `${size}%`,
      z: 2 + (i % 4),
    };
  });
}

/** Construit la liste visuelle à partir des ingrédients + catalogue. */
export function buildFruitVisuals(
  ingredients: { fruitId: string; fruitName: string }[],
  catalog: { id: string; imageUrl?: string | null }[],
  snapshots?: (string | null | undefined)[],
): FruitVisual[] {
  return ingredients.map((ing, i) => ({
    name: ing.fruitName,
    imageUrl:
      (snapshots?.[i] ? snapshots[i] : null) ||
      catalog.find((f) => f.id === ing.fruitId)?.imageUrl ||
      null,
  }));
}

export function pickCocktailCoverUrl(
  cocktail: Pick<Cocktail, 'type' | 'imageUrl'>,
  fruitImageUrls: string[],
): string | undefined {
  if (cocktail.type === CocktailType.CUSTOM) return undefined;
  if (cocktail.imageUrl) return cocktail.imageUrl;
  return fruitImageUrls.find(Boolean);
}

/** Collage multi-fruits pour les créations perso ; photo pour le catalogue admin. */
export function shouldUseFruitCollage(cocktail: Pick<Cocktail, 'type' | 'imageUrl'>): boolean {
  return cocktail.type === CocktailType.CUSTOM || !cocktail.imageUrl;
}
