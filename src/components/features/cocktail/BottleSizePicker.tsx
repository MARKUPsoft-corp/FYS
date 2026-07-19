import { cn } from '@/lib/utils';
import type { BottleSize } from '@/entities';
import { BOTTLE_LABELS, BOTTLE_VOLUME_LABELS } from '@/entities';

type Props = {
  selected: BottleSize;
  onSelect: (size: BottleSize) => void;
  price500ml: number;
  price1L: number;
};

/** Illustration bouteille stylisée (SVG) avec jus coloré */
function BottleIllustration({
  size,
  selected,
}: {
  size: BottleSize;
  selected: boolean;
}) {
  const isHalf = size === '500ml';
  // Demi-litre un peu plus petite, 1L plus haute
  const scale = isHalf ? 0.88 : 1;
  const juiceColor = selected ? '#3F6D4E' : '#AECBB2';
  const glassStroke = selected ? '#28422F' : '#9CA3AF';
  const capColor = selected ? '#F2694A' : '#C4B5A8';

  return (
    <div
      className="relative flex items-end justify-center h-[140px] sm:h-[160px]"
      style={{ transform: `scale(${scale})` }}
    >
      {/* Soft glow when selected */}
      {selected && (
        <div className="absolute bottom-2 inset-x-4 h-8 rounded-full bg-primary/20 blur-xl" />
      )}
      <svg
        viewBox="0 0 80 160"
        className="h-full w-auto drop-shadow-md relative z-10"
        aria-hidden
      >
        {/* Cap */}
        <rect x="30" y="4" width="20" height="14" rx="3" fill={capColor} />
        <rect x="28" y="16" width="24" height="6" rx="2" fill={capColor} opacity="0.85" />

        {/* Neck */}
        <path
          d="M32 22 L32 42 Q32 48 28 52 L52 52 Q48 48 48 42 L48 22 Z"
          fill="#E8F0EA"
          stroke={glassStroke}
          strokeWidth="1.5"
        />

        {/* Shoulder + body outline */}
        <path
          d="M28 52
             Q18 58 16 72
             L14 138
             Q14 150 40 152
             Q66 150 66 138
             L64 72
             Q62 58 52 52 Z"
          fill={`url(#glassGrad-${size})`}
          stroke={glassStroke}
          strokeWidth="1.8"
        />

        {/* Juice fill */}
        <path
          d={
            isHalf
              ? `M18 95 L16 138 Q16 148 40 150 Q64 148 64 138 L62 95 Q40 100 18 95 Z`
              : `M17 78 L15 138 Q15 148 40 150 Q65 148 65 138 L63 78 Q40 84 17 78 Z`
          }
          fill={juiceColor}
          opacity="0.92"
        />

        {/* Juice surface highlight */}
        <ellipse
          cx="40"
          cy={isHalf ? 96 : 80}
          rx="22"
          ry="4"
          fill="#fff"
          opacity="0.25"
        />

        {/* Glass shine */}
        <path
          d="M24 70 L22 130"
          stroke="#fff"
          strokeWidth="3"
          strokeLinecap="round"
          opacity="0.35"
        />

        <defs>
          <linearGradient id={`glassGrad-${size}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#F7FAF7" />
            <stop offset="100%" stopColor="#D5E6D9" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}

export function BottleSizePicker({
  selected,
  onSelect,
  price500ml,
  price1L,
}: Props) {
  const options: { size: BottleSize; price: number }[] = [
    { size: '500ml', price: price500ml },
    { size: '1L', price: price1L },
  ];

  return (
    <div className="space-y-3">
      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
        Choisissez votre contenant
      </p>
      <div className="grid grid-cols-2 gap-3">
        {options.map(({ size, price }) => {
          const isSelected = selected === size;
          return (
            <button
              key={size}
              type="button"
              onClick={() => onSelect(size)}
              className={cn(
                'relative flex flex-col items-center rounded-2xl border-2 p-3 pt-4 transition-all duration-200',
                isSelected
                  ? 'border-primary bg-primary/5 shadow-[0_8px_24px_rgba(63,109,78,0.18)] scale-[1.02]'
                  : 'border-border/60 bg-card hover:border-primary/40 hover:-translate-y-0.5',
              )}
            >
              {isSelected && (
                <span className="absolute top-2 right-2 size-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px] font-bold">
                  ✓
                </span>
              )}
              <BottleIllustration size={size} selected={isSelected} />
              <div className="mt-2 text-center space-y-0.5">
                <p className={cn(
                  'text-sm font-bold',
                  isSelected ? 'text-primary' : 'text-foreground',
                )}>
                  {BOTTLE_LABELS[size]}
                </p>
                <p className="text-[11px] text-muted-foreground font-medium">
                  {BOTTLE_VOLUME_LABELS[size]}
                </p>
                <p className={cn(
                  'text-[15px] font-bold tabular-nums pt-1',
                  isSelected ? 'text-primary' : 'text-foreground',
                )}>
                  {price.toLocaleString()} <span className="text-[11px] font-semibold">XAF</span>
                </p>
                <p className="text-[10px] text-muted-foreground">/ bouteille</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
