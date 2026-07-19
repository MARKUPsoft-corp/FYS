import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export type PeriodType = 'all' | 'day' | 'week' | 'month' | 'year';

const WEEKDAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
const MONTHS = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function startOfWeek(d: Date): Date {
  const x = startOfDay(d);
  const day = x.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  x.setDate(x.getDate() + diff);
  return x;
}

export function endOfWeek(d: Date): Date {
  const start = startOfWeek(d);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return end;
}

export function getPeriodBounds(type: PeriodType, anchor: Date): { start: Date; end: Date } | null {
  if (type === 'all') return null;
  if (type === 'day') {
    const start = startOfDay(anchor);
    const end = new Date(start);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }
  if (type === 'week') return { start: startOfWeek(anchor), end: endOfWeek(anchor) };
  if (type === 'month') {
    const start = startOfDay(new Date(anchor.getFullYear(), anchor.getMonth(), 1));
    const end = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0, 23, 59, 59, 999);
    return { start, end };
  }
  return {
    start: startOfDay(new Date(anchor.getFullYear(), 0, 1)),
    end: new Date(anchor.getFullYear(), 11, 31, 23, 59, 59, 999),
  };
}

export function formatPeriodLabel(type: PeriodType, anchor: Date): string {
  if (type === 'all') return 'Toutes les périodes';
  if (type === 'day') {
    return anchor.toLocaleDateString('fr-FR', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    });
  }
  if (type === 'week') {
    const { start, end } = getPeriodBounds('week', anchor)!;
    const sameMonth = start.getMonth() === end.getMonth();
    const startStr = start.toLocaleDateString('fr-FR', {
      day: 'numeric', month: sameMonth ? undefined : 'short',
    });
    const endStr = end.toLocaleDateString('fr-FR', {
      day: 'numeric', month: 'long', year: 'numeric',
    });
    return `Semaine du ${startStr} au ${endStr}`;
  }
  if (type === 'month') {
    return anchor.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  }
  return String(anchor.getFullYear());
}

function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate();
}

function inWeek(day: Date, anchor: Date): boolean {
  const { start, end } = getPeriodBounds('week', anchor)!;
  return day >= start && day <= end;
}

type Props = {
  periodType: Exclude<PeriodType, 'all'>;
  value: Date;
  onChange: (date: Date) => void;
  onClose?: () => void;
};

export function PeriodCalendar({ periodType, value, onChange, onClose }: Props) {
  const [view, setView] = useState(() => new Date(value.getFullYear(), value.getMonth(), 1));
  const today = startOfDay(new Date());

  const yearGridStart = useMemo(() => {
    const y = view.getFullYear();
    return y - ((y % 12));
  }, [view]);

  function selectDay(day: Date) {
    onChange(startOfDay(day));
    onClose?.();
  }

  function selectMonth(year: number, month: number) {
    onChange(startOfDay(new Date(year, month, 1)));
    onClose?.();
  }

  function selectYear(year: number) {
    onChange(startOfDay(new Date(year, 0, 1)));
    onClose?.();
  }

  // ── Day / Week calendar ──
  if (periodType === 'day' || periodType === 'week') {
    const year = view.getFullYear();
    const month = view.getMonth();
    const first = new Date(year, month, 1);
    const startPad = (first.getDay() + 6) % 7; // Monday-first
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: (Date | null)[] = [
      ...Array.from({ length: startPad }, () => null),
      ...Array.from({ length: daysInMonth }, (_, i) => new Date(year, month, i + 1)),
    ];

    return (
      <div className="w-full max-w-[320px] p-3">
        <div className="flex items-center justify-between mb-3">
          <button
            type="button"
            onClick={() => setView(new Date(year, month - 1, 1))}
            className="size-8 rounded-lg flex items-center justify-center hover:bg-muted text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="size-4" />
          </button>
          <p className="text-sm font-bold text-foreground capitalize">
            {MONTHS[month]} {year}
          </p>
          <button
            type="button"
            onClick={() => setView(new Date(year, month + 1, 1))}
            className="size-8 rounded-lg flex items-center justify-center hover:bg-muted text-muted-foreground hover:text-foreground"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1 mb-1">
          {WEEKDAYS.map((d) => (
            <div key={d} className="text-center text-[10px] font-bold text-muted-foreground py-1">
              {d}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {cells.map((day, i) => {
            if (!day) return <div key={`e-${i}`} />;
            const selected = periodType === 'day'
              ? sameDay(day, value)
              : inWeek(day, value);
            const isToday = sameDay(day, today);
            const weekStart = periodType === 'week' && sameDay(day, startOfWeek(value));
            const weekEnd = periodType === 'week' && sameDay(day, endOfWeek(value));

            return (
              <button
                key={day.toISOString()}
                type="button"
                onClick={() => selectDay(day)}
                className={cn(
                  'h-9 text-[12px] font-semibold transition-colors',
                  periodType === 'week' && selected && 'bg-secondary/15',
                  periodType === 'week' && weekStart && 'rounded-l-lg',
                  periodType === 'week' && weekEnd && 'rounded-r-lg',
                  periodType === 'day' && selected && 'bg-secondary text-white rounded-lg',
                  periodType === 'day' && !selected && 'rounded-lg hover:bg-muted',
                  periodType === 'week' && !selected && 'hover:bg-muted rounded-lg',
                  isToday && !selected && 'text-secondary ring-1 ring-secondary/40 rounded-lg',
                  !selected && 'text-foreground',
                  periodType === 'week' && selected && 'text-secondary',
                )}
              >
                {day.getDate()}
              </button>
            );
          })}
        </div>

        {periodType === 'week' && (
          <p className="text-[10px] text-muted-foreground text-center mt-3 font-medium">
            Cliquez un jour pour sélectionner sa semaine
          </p>
        )}
      </div>
    );
  }

  // ── Month picker ──
  if (periodType === 'month') {
    const year = view.getFullYear();
    return (
      <div className="w-full max-w-[320px] p-3">
        <div className="flex items-center justify-between mb-3">
          <button
            type="button"
            onClick={() => setView(new Date(year - 1, 0, 1))}
            className="size-8 rounded-lg flex items-center justify-center hover:bg-muted text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="size-4" />
          </button>
          <p className="text-sm font-bold text-foreground">{year}</p>
          <button
            type="button"
            onClick={() => setView(new Date(year + 1, 0, 1))}
            className="size-8 rounded-lg flex items-center justify-center hover:bg-muted text-muted-foreground hover:text-foreground"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {MONTHS.map((label, month) => {
            const selected = value.getFullYear() === year && value.getMonth() === month;
            const isCurrent = today.getFullYear() === year && today.getMonth() === month;
            return (
              <button
                key={label}
                type="button"
                onClick={() => selectMonth(year, month)}
                className={cn(
                  'h-11 rounded-xl text-[12px] font-bold transition-colors',
                  selected
                    ? 'bg-secondary text-white'
                    : isCurrent
                    ? 'text-secondary ring-1 ring-secondary/40 hover:bg-secondary/10'
                    : 'text-foreground hover:bg-muted',
                )}
              >
                {label.slice(0, 4)}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // ── Year picker ──
  const years = Array.from({ length: 12 }, (_, i) => yearGridStart + i);
  return (
    <div className="w-full max-w-[320px] p-3">
      <div className="flex items-center justify-between mb-3">
        <button
          type="button"
          onClick={() => setView(new Date(yearGridStart - 12, 0, 1))}
          className="size-8 rounded-lg flex items-center justify-center hover:bg-muted text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="size-4" />
        </button>
        <p className="text-sm font-bold text-foreground">
          {yearGridStart} – {yearGridStart + 11}
        </p>
        <button
          type="button"
          onClick={() => setView(new Date(yearGridStart + 12, 0, 1))}
          className="size-8 rounded-lg flex items-center justify-center hover:bg-muted text-muted-foreground hover:text-foreground"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {years.map((year) => {
          const selected = value.getFullYear() === year;
          const isCurrent = today.getFullYear() === year;
          return (
            <button
              key={year}
              type="button"
              onClick={() => selectYear(year)}
              className={cn(
                'h-11 rounded-xl text-[13px] font-bold transition-colors',
                selected
                  ? 'bg-secondary text-white'
                  : isCurrent
                  ? 'text-secondary ring-1 ring-secondary/40 hover:bg-secondary/10'
                  : 'text-foreground hover:bg-muted',
              )}
            >
              {year}
            </button>
          );
        })}
      </div>
    </div>
  );
}
