import { useState, useRef, useEffect } from 'react';
import { MapPin, ChevronDown, Search, CheckCircle2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

// ── Liste des quartiers de Yaoundé ─────────────────────────────────────────
export const YAOUNDE_DISTRICTS = [
  // Centre-ville
  'Centre-ville (Plateau)',
  'Mvog-Ada',
  'Mvog-Mbi',
  'Messa',
  'Ekoudou',

  // Nord
  'Nsam',
  'Nkolbisson',
  'Biyem-Assi',
  'Mbankolo',
  'Nkoldongo',

  // Sud
  'Ngousso',
  'Nkomo',
  'Mendong',
  'Djoungolo',
  'Etoug-Ebe',
  'Odza',

  // Est
  'Tsinga',
  'Omnisports',
  'Bastos',
  'Eleveurs',
  'Nkol-Afeme',

  // Ouest
  'Bonamoussadi',
  'Nkoldongo',
  'Elig-Edzoa',
  'Nkolmesseng',

  // Autres quartiers populaires
  'Essos',
  'Santa Barbara',
  'Melen',
  'Ekié',
  'Ngoa-Ekele',
  'Kondengui',
  'Emana',
  'Mfandena',
  'Awae',
  'Simbock',
  'Elig-Effa',
  'Mimboman',
  'Nkoabang',
  'Nkoldongo',
  'Mvogbeti-Messala',
  'Nkol-Eton',
  'Ahala',
  'Nkolnda',
  'Carrière',
  'Mvolyé',
  'Obili',
  'Etoa-Meki',
  'Nlongkak',
  'Brasseries',
  'Anguissa',
  'Ekengté',
].filter((v, i, a) => a.indexOf(v) === i).sort();

// ── Composant ──────────────────────────────────────────────────────────────

interface YaoundeDistrictPickerProps {
  value: string;
  onChange: (v: string) => void;
  error?: boolean;
}

export function YaoundeDistrictPicker({ value, onChange, error }: YaoundeDistrictPickerProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = YAOUNDE_DISTRICTS.filter((d) =>
    d.toLowerCase().includes(search.toLowerCase()),
  );

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch('');
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  function handleSelect(district: string) {
    onChange(district);
    setOpen(false);
    setSearch('');
  }

  const isValid = !!value;

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`w-full h-10 px-3 flex items-center justify-between rounded-xl text-sm transition-colors border ${
          error && !value
            ? 'border-red-400 bg-red-50/50 dark:bg-red-950/20'
            : isValid
            ? 'border-primary/40 bg-primary/5'
            : 'border-border/40 bg-muted/60'
        } focus:outline-none`}
      >
        <span className={value ? 'text-foreground font-medium' : 'text-muted-foreground'}>
          {value || t('districts.placeholder')}
        </span>
        <div className="flex items-center gap-1.5 shrink-0">
          {isValid && <CheckCircle2 className="size-3.5 text-primary" />}
          <ChevronDown
            className={`size-3.5 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`}
          />
        </div>
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute left-0 right-0 top-[calc(100%+4px)] z-50 bg-background border border-border/60 rounded-2xl shadow-xl overflow-hidden">
          {/* Search */}
          <div className="p-2 border-b border-border/40">
            <div className="flex items-center gap-2 px-2 py-1.5 bg-muted/60 rounded-xl">
              <Search className="size-3.5 text-muted-foreground shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('districts.searchPlaceholder')}
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
            </div>
          </div>

          <div className="max-h-48 overflow-y-auto">
            {filtered.map((district) => (
              <button
                key={district}
                type="button"
                onClick={() => handleSelect(district)}
                className={`w-full flex items-center justify-between px-4 py-2.5 text-sm text-left transition-colors hover:bg-muted/80 ${
                  value === district ? 'bg-primary/10 text-primary font-semibold' : 'text-foreground'
                }`}
              >
                {district}
                {value === district && <CheckCircle2 className="size-3.5 shrink-0" />}
              </button>
            ))}
            
            {/* Si aucune correspondance exacte ou recherche personnalisée */}
            {search.trim().length > 0 && !YAOUNDE_DISTRICTS.some(d => d.toLowerCase() === search.toLowerCase()) && (
              <button
                type="button"
                onClick={() => handleSelect(search.trim())}
                className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-left text-primary transition-colors hover:bg-primary/10"
              >
                <MapPin className="size-3.5" />
                {t('districts.useCustom', { name: search.trim() })}
              </button>
            )}

            {filtered.length === 0 && search.trim().length === 0 && (
               <p className="px-4 py-3 text-sm text-muted-foreground text-center">
                  {t('districts.searchPlaceholder')}
               </p>
            )}
          </div>

          {/* Footer badge */}
          <div className="px-4 py-2.5 border-t border-border/40 bg-muted/30">
            <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
              <MapPin className="size-3 shrink-0" />
              {t('districts.yourDelivery')}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
