import React from 'react';

export type AfricanMotifVariant =
  | 'totem-seal'
  | 'heritage-diamond'
  | 'centre-sun'
  | 'elan-chevrons'
  | 'creation-pyramids'
  | 'ancrage-roots'
  | 'ndop-cross'
  | 'corner-bracket';

export type AfricanMotifColor = 'auto' | 'primary' | 'terracotta' | 'coral' | 'muted';

interface AfricanCornerPatternProps {
  /**
   * Specific motif variant to render.
   * If omitted, chosen dynamically via index or section hash.
   */
  variant?: AfricanMotifVariant;
  /**
   * Index of the card in a list or grid to ensure non-repeating adjacent motifs.
   */
  index?: number;
  /**
   * Identifier of the section (e.g. 'stats', 'how-it-works', 'features', 'events', 'creations', 'nutrifys', 'about').
   * Offsets the variant selection so each section has its own rhythm.
   */
  section?: string;
  /**
   * Color theme for the motif.
   * 'auto' alternates between FYS sacred brand colors (Forest Green, Terracotta Amber, Warm Coral).
   */
  color?: AfricanMotifColor;
  /**
   * Size preset. Defaults to 'md'.
   */
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /**
   * Additional Tailwind classes.
   */
  className?: string;
  /**
   * Opacity preset. Defaults to subtle watermark.
   */
  opacityClass?: string;
}

const ALL_VARIANTS: AfricanMotifVariant[] = [
  'heritage-diamond',
  'centre-sun',
  'ndop-cross',
  'elan-chevrons',
  'corner-bracket',
  'creation-pyramids',
  'totem-seal',
  'ancrage-roots',
];

const COLOR_CLASSES: Record<AfricanMotifColor, string> = {
  primary: 'text-[#3F6D4E] dark:text-[#AECBB2]',
  terracotta: 'text-[#E0982E]',
  coral: 'text-[#F2694A]',
  muted: 'text-muted-foreground',
  auto: '', // handled dynamically
};

const AUTO_COLORS = [
  'text-[#E0982E]',                     // Terracotta / Ambre
  'text-[#3F6D4E] dark:text-[#AECBB2]', // Vert forêt
  'text-[#F2694A]',                     // Corail papaye
  'text-primary',                       // Brand Primary
];

const SIZE_CLASSES = {
  sm: 'size-10 sm:size-12',
  md: 'size-12 sm:size-14 md:size-16',
  lg: 'size-16 sm:size-20',
  xl: 'size-20 sm:size-24',
};

// Deterministic string hash to keep SSR and client hydration in sync
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function AfricanCornerPattern({
  variant,
  index,
  section,
  color = 'auto',
  size = 'md',
  className = '',
  opacityClass = 'opacity-20 dark:opacity-25 group-hover:opacity-45',
}: AfricanCornerPatternProps) {
  // Determine variant deterministically
  const resolvedVariant: AfricanMotifVariant = React.useMemo(() => {
    if (variant) return variant;
    let offset = 0;
    if (section) {
      offset = hashString(section);
    }
    const idx = (index !== undefined ? index : 0) + offset;
    return ALL_VARIANTS[idx % ALL_VARIANTS.length];
  }, [variant, index, section]);

  // Determine color class
  const resolvedColorClass: string = React.useMemo(() => {
    if (color !== 'auto') {
      return COLOR_CLASSES[color];
    }
    let offset = 0;
    if (section) offset = hashString(section);
    const idx = (index !== undefined ? index : 0) + offset;
    return AUTO_COLORS[idx % AUTO_COLORS.length];
  }, [color, index, section]);

  return (
    <div
      className={`absolute top-0 right-0 pointer-events-none select-none z-10 transition-all duration-500 overflow-hidden ${opacityClass} ${className}`}
      aria-hidden="true"
    >
      <div className={`${SIZE_CLASSES[size]} ${resolvedColorClass} p-1.5 sm:p-2 transition-transform duration-500 group-hover:scale-105`}>
        {renderMotifSvg(resolvedVariant)}
      </div>
    </div>
  );
}

function renderMotifSvg(variant: AfricanMotifVariant) {
  switch (variant) {
    // ━━━ 1. L'HÉRITAGE & NDOP BAMILEKE (Double losange avec cœur plein) ━━━
    case 'heritage-diamond':
      return (
        <svg viewBox="0 0 60 60" className="w-full h-full" fill="currentColor">
          {/* Cadre losange externe */}
          <path d="M 30,4 L 56,30 L 30,56 L 4,30 Z" fill="none" stroke="currentColor" strokeWidth="1.8" />
          {/* Losange intermédiaire évidé */}
          <path d="M 30,13 L 47,30 L 30,47 L 13,30 Z" fill="none" stroke="currentColor" strokeWidth="1.2" strokeDasharray="3 2" />
          {/* Cœur losange plein sacré (Signature 02 FYS) */}
          <polygon points="30,22 38,30 30,38 22,30" />
          {/* Accents cardinaux traditionnels Ndop */}
          <circle cx="30" cy="8" r="1.5" />
          <circle cx="52" cy="30" r="1.5" />
          <circle cx="30" cy="52" r="1.5" />
          <circle cx="8" cy="30" r="1.5" />
          {/* Chevrons d'angle */}
          <path d="M 46,6 L 54,6 L 54,14" fill="none" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      );

    // ━━━ 2. SOI, AU CENTRE & SOLEIL ÉQUATORIAL (Cercles concentriques et rayons) ━━━
    case 'centre-sun':
      return (
        <svg viewBox="0 0 60 60" className="w-full h-full" fill="currentColor">
          {/* Anneau extérieur perlé */}
          <circle cx="30" cy="30" r="25" fill="none" stroke="currentColor" strokeWidth="1.4" strokeDasharray="2 3" />
          {/* Anneau principal */}
          <circle cx="30" cy="30" r="18" fill="none" stroke="currentColor" strokeWidth="1.8" />
          {/* Anneau intérieur fin */}
          <circle cx="30" cy="30" r="11" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="4 2" />
          {/* Point central plein sacré (Signature 03 FYS) */}
          <circle cx="30" cy="30" r="5" />
          {/* Rayons cardinaux des 4 vents de l'Adamaoua à la côte */}
          <circle cx="30" cy="7" r="1.8" />
          <circle cx="53" cy="30" r="1.8" />
          <circle cx="30" cy="53" r="1.8" />
          <circle cx="7" cy="30" r="1.8" />
          {/* Diagonales royales */}
          <circle cx="44" cy="16" r="1.2" />
          <circle cx="44" cy="44" r="1.2" />
          <circle cx="16" cy="44" r="1.2" />
          <circle cx="16" cy="16" r="1.2" />
        </svg>
      );

    // ━━━ 3. CROIX & LOSANGE ROYAL NDOP (Motif textile chefferie de l'Ouest) ━━━
    case 'ndop-cross':
      return (
        <svg viewBox="0 0 60 60" className="w-full h-full" fill="currentColor">
          {/* Croix diagonale en pointillés */}
          <line x1="8" y1="8" x2="52" y2="52" stroke="currentColor" strokeWidth="1" strokeDasharray="3 3" />
          <line x1="52" y1="8" x2="8" y2="52" stroke="currentColor" strokeWidth="1" strokeDasharray="3 3" />
          {/* Grand losange central */}
          <polygon points="30,6 54,30 30,54 6,30" fill="none" stroke="currentColor" strokeWidth="1.8" />
          {/* Losange interne pivoté */}
          <polygon points="30,17 43,30 30,43 17,30" fill="none" stroke="currentColor" strokeWidth="1.4" />
          {/* Cœur à 4 perles */}
          <circle cx="30" cy="30" r="3" />
          <circle cx="30" cy="11" r="1.6" />
          <circle cx="49" cy="30" r="1.6" />
          <circle cx="30" cy="49" r="1.6" />
          <circle cx="11" cy="30" r="1.6" />
          {/* Équerre d'angle du tissu royal */}
          <path d="M 44,6 L 54,6 L 54,16" fill="none" stroke="currentColor" strokeWidth="2" />
        </svg>
      );

    // ━━━ 4. L'ÉLAN & FLÈCHES D'ASCENSION (Signature 01 FYS & Chevrons Grassfields) ━━━
    case 'elan-chevrons':
      return (
        <svg viewBox="0 0 60 60" className="w-full h-full" fill="currentColor">
          {/* Axe vertical sacré */}
          <line x1="30" y1="6" x2="30" y2="54" stroke="currentColor" strokeWidth="1.2" strokeDasharray="4 3" />
          {/* Pointe supérieure avec chevron (Signature 01) */}
          <path d="M 27,10 L 30,6 L 33,10 L 33,18 L 27,18 Z" />
          {/* Triples chevrons ascendants */}
          <path d="M 14,24 L 30,12 L 46,24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M 18,34 L 30,24 L 42,34" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M 22,44 L 30,36 L 38,44" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
          {/* Points latéraux d'équilibre */}
          <circle cx="14" cy="24" r="1.5" />
          <circle cx="46" cy="24" r="1.5" />
          <circle cx="30" cy="52" r="2" />
        </svg>
      );

    // ━━━ 5. LA CRÉATION & PYRAMIDES EN SABLIER (Signature 04 FYS) ━━━
    case 'creation-pyramids':
      return (
        <svg viewBox="0 0 60 60" className="w-full h-full" fill="currentColor">
          {/* Cadre losange */}
          <polygon points="30,5 55,30 30,55 5,30" fill="none" stroke="currentColor" strokeWidth="1.8" />
          {/* Pyramide supérieure descendante */}
          <polygon points="30,12 43,26 17,26" fill="currentColor" fillOpacity="0.25" stroke="currentColor" strokeWidth="1" />
          {/* Pyramide inférieure montante */}
          <polygon points="30,48 43,34 17,34" fill="currentColor" fillOpacity="0.25" stroke="currentColor" strokeWidth="1" />
          {/* Cœur étincelle de création */}
          <polygon points="30,26 34,30 30,34 26,30" />
          <circle cx="30" cy="30" r="1.2" fill="#fff" />
          {/* Lignes d'énergie créative */}
          <line x1="30" y1="5" x2="30" y2="12" stroke="currentColor" strokeWidth="1.5" />
          <line x1="30" y1="48" x2="30" y2="55" stroke="currentColor" strokeWidth="1.5" />
          <circle cx="50" cy="30" r="1.5" />
          <circle cx="10" cy="30" r="1.5" />
        </svg>
      );

    // ━━━ 6. L'ANCRAGE & RACINES DU TERROIR (Signature 05 FYS) ━━━
    case 'ancrage-roots':
      return (
        <svg viewBox="0 0 60 60" className="w-full h-full" fill="currentColor">
          {/* Pointe d'ancrage inférieure */}
          <path d="M 27,42 L 33,42 L 33,50 L 30,54 L 27,50 Z" />
          {/* Chevrons descendants reliés à la terre */}
          <path d="M 14,16 L 30,30 L 46,16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M 18,24 L 30,36 L 42,24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          {/* Lignes telluriques horizontales (strates du terroir) */}
          <line x1="16" y1="36" x2="44" y2="36" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 2" />
          <line x1="22" y1="42" x2="38" y2="42" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          {/* Point de fertilité au sommet */}
          <circle cx="30" cy="10" r="2.5" />
          <line x1="30" y1="13" x2="30" y2="30" stroke="currentColor" strokeWidth="1.2" strokeDasharray="2 2" />
        </svg>
      );

    // ━━━ 7. MINI TOTEM SACRÉ FYS CONDENSÉ (Les 5 éléments complets en sceau) ━━━
    case 'totem-seal':
      return (
        <svg viewBox="0 0 40 70" className="w-full h-full" fill="currentColor">
          {/* 01 Élan (barre + chevron haut) */}
          <path d="M 18,5 L 20,3 L 22,5 L 22,13 L 18,13 Z" />
          {/* 02 Héritage (losange + cœur plein) */}
          <path d="M 20,16 L 27,24 L 20,32 L 13,24 Z M 20,20 L 16.5,24 L 20,28 L 23.5,24 Z" fillRule="evenodd" />
          <polygon points="20,22 22,24 20,26 18,24" />
          {/* 03 Soi au centre (cercle + point) */}
          <circle cx="20" cy="38" r="6" fill="none" stroke="currentColor" strokeWidth="1.8" />
          <circle cx="20" cy="38" r="2.4" />
          {/* 04 Création (losange + cœur plein) */}
          <path d="M 20,44 L 27,52 L 20,60 L 13,52 Z M 20,48 L 16.5,52 L 20,56 L 23.5,52 Z" fillRule="evenodd" />
          <polygon points="20,50 22,52 20,54 18,52" />
          {/* 05 Ancrage (barre + chevron bas) */}
          <path d="M 18,62 L 22,62 L 22,65 L 20,67 L 18,65 Z" />
        </svg>
      );

    // ━━━ 8. ÉQUERRE D'ANGLE TRADITIONNELLE (Bord supérieur droit) ━━━
    case 'corner-bracket':
    default:
      return (
        <svg viewBox="0 0 60 60" className="w-full h-full" fill="currentColor">
          {/* Bordure d'angle double */}
          <path d="M 10,4 L 56,4 L 56,50" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M 20,10 L 50,10 L 50,40" fill="none" stroke="currentColor" strokeWidth="1.2" strokeDasharray="3 2" />
          {/* Losange incrusté dans le coin */}
          <polygon points="40,16 48,24 40,32 32,24" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <polygon points="40,20 44,24 40,28 36,24" />
          {/* Chevrons et perles */}
          <circle cx="53" cy="7" r="1.6" />
          <circle cx="40" cy="7" r="1.2" />
          <circle cx="53" cy="20" r="1.2" />
          <path d="M 28,18 L 32,14 L 36,18" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
      );
  }
}
