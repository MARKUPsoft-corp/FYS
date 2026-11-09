import { useState, useRef, useEffect, useMemo } from 'react';
import { MapPin, ChevronDown, Search, CheckCircle2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { DeliveryZone, DEFAULT_DELIVERY_ZONES, getDeliveryZoneForDistrict } from '@/entities/delivery';

// ── Liste de base des quartiers de Yaoundé ─────────────────────────────────
export const YAOUNDE_DISTRICTS = [
  // Zone 1 (Proximité Nsimeyong)
  'Nsimeyong',
  'Nsimeyong I',
  'Nsimeyong II',
  'Nsimeyong III',
  'Biyem-Assi',
  'Accacia',
  'Damase',
  'Mendong',
  'Jouvence',
  'Etoug-Ebe',
  'Melen',
  'Ngoa-Ekele',
  'Obili',
  'Simbock',
  'Elig-Effa',

  // Zone 2 (Centre & Rayon Moyen)
  'Centre-ville (Plateau)',
  'Poste Centrale',
  'Boulevard du 20 mai',
  'Bastos',
  'Golf',
  'Dragages',
  'Tsinga',
  'Messa',
  'Mokolo',
  'Madagascar',
  'Ekoudou',
  'Nlongkak',
  'Elig-Essono',
  'Elig-Edzoa',
  'Warda',
  'Mbankolo',
  'Nsam',
  'Ahala',
  'Obobogo',
  'Mvog-Mbi',
  'Mvog-Ada',
  'Coron',
  'Omnisports',
  'Essos',
  'Mfandena',
  'Kondengui',
  'Emombo',
  'Nkol-Eton',
  'Bonamoussadi',
  'Santa Barbara',
  'Ekié',
  'Djoungolo',

  // Zone 3 (Longue distance & Périphérie)
  'Odza',
  'Messamendongo',
  'Borne 10',
  'Auberge bleue',
  'Koweït',
  'Ngousso',
  'Hôpital Général',
  'Eleveurs',
  'Emana',
  'Messassi',
  'Olembe',
  'Nkomo',
  'Biteng',
  'Awae',
  'Nkolmesseng',
  'Mimboman',
  'Nkol-Afeme',
  'Nkoabang',
  'Nkolnda',
  'Mvogbeti-Messala',
  'Nkolbisson',
  'Carrière',
  'Mvolyé',
  'Etoa-Meki',
  'Brasseries',
  'Anguissa',
  'Ekengté',
].filter((v, i, a) => a.indexOf(v) === i).sort();

// ── Composant ──────────────────────────────────────────────────────────────

interface YaoundeDistrictPickerProps {
  value: string;
  onChange: (district: string, fee?: number) => void;
  error?: boolean;
  zones?: DeliveryZone[];
}

export function YaoundeDistrictPicker({ value, onChange, error, zones = DEFAULT_DELIVERY_ZONES }: YaoundeDistrictPickerProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Combine tous les quartiers connus des zones et de la liste globale
  const allDistricts = useMemo(() => {
    const set = new Set<string>(YAOUNDE_DISTRICTS);
    if (Array.isArray(zones)) {
      zones.forEach((z) => {
        (z.districts || []).forEach((d) => set.add(d));
      });
    }
    return Array.from(set).sort();
  }, [zones]);

  const filtered = useMemo(() => {
    return allDistricts.filter((d) =>
      d.toLowerCase().includes(search.toLowerCase()),
    );
  }, [allDistricts, search]);

  const currentZoneInfo = useMemo(() => {
    return getDeliveryZoneForDistrict(value, zones);
  }, [value, zones]);

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
    const feeInfo = getDeliveryZoneForDistrict(district, zones);
    onChange(district, feeInfo.fee);
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
        className={`w-full h-11 px-3 flex items-center justify-between rounded-xl text-sm transition-all border ${
          error && !value
            ? 'border-red-400 bg-red-50/50 dark:bg-red-950/20 shadow-sm'
            : isValid
            ? 'border-primary/40 bg-primary/5 hover:border-primary/60'
            : 'border-border/60 bg-muted/40 hover:bg-muted/70'
        } focus:outline-none focus:ring-2 focus:ring-primary/20`}
      >
        <div className="flex items-center gap-2 overflow-hidden mr-2">
          <MapPin className={`size-4 shrink-0 ${isValid ? 'text-primary' : 'text-muted-foreground'}`} />
          <span className={`truncate ${value ? 'text-foreground font-semibold' : 'text-muted-foreground'}`}>
            {value || t('districts.placeholder')}
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {isValid && currentZoneInfo.fee > 0 && (
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
              {currentZoneInfo.fee.toLocaleString()} XAF
            </span>
          )}
          {isValid && <CheckCircle2 className="size-3.5 text-primary" />}
          <ChevronDown
            className={`size-3.5 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`}
          />
        </div>
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-50 bg-background border border-border/80 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-md animate-in fade-in-0 zoom-in-95 duration-100">
          {/* Search */}
          <div className="p-2.5 border-b border-border/40 bg-muted/30">
            <div className="flex items-center gap-2 px-3 py-2 bg-background border border-border/60 rounded-xl shadow-inner">
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

          <div className="max-h-56 overflow-y-auto divide-y divide-border/20">
            {filtered.map((district) => {
              const zoneInfo = getDeliveryZoneForDistrict(district, zones);
              const isSelected = value === district;
              return (
                <button
                  key={district}
                  type="button"
                  onClick={() => handleSelect(district)}
                  className={`w-full flex items-center justify-between px-4 py-2.5 text-sm text-left transition-colors hover:bg-primary/5 ${
                    isSelected ? 'bg-primary/10 text-primary font-bold' : 'text-foreground'
                  }`}
                >
                  <span className="truncate mr-2">{district}</span>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-muted/80 text-muted-foreground border border-border/40">
                      {zoneInfo.fee.toLocaleString()} XAF
                    </span>
                    {isSelected && <CheckCircle2 className="size-3.5 text-primary" />}
                  </div>
                </button>
              );
            })}
            
            {/* Si aucune correspondance exacte ou recherche personnalisée */}
            {search.trim().length > 0 && !allDistricts.some(d => d.toLowerCase() === search.toLowerCase()) && (
              <button
                type="button"
                onClick={() => handleSelect(search.trim())}
                className="w-full flex items-center justify-between px-4 py-3 text-sm text-left text-primary bg-primary/5 hover:bg-primary/10 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <MapPin className="size-4 shrink-0" />
                  <span className="font-semibold">{t('districts.useCustom', { name: search.trim() })}</span>
                </div>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-primary/20 text-primary">
                  1 500 XAF
                </span>
              </button>
            )}

            {filtered.length === 0 && search.trim().length === 0 && (
               <p className="px-4 py-4 text-sm text-muted-foreground text-center">
                  {t('districts.searchPlaceholder')}
               </p>
            )}
          </div>

          {/* Footer info départ Nsimeyong */}
          <div className="px-4 py-2.5 border-t border-border/40 bg-muted/40 flex items-center justify-between text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1.5 font-medium">
              <MapPin className="size-3 text-primary shrink-0" />
              Départ atelier : Nsimeyong
            </span>
            <span className="text-[10px] text-muted-foreground/80">
              Tarif calculé selon la distance
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
