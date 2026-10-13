import React from 'react';

export type AfricanPatternName =
  | 'ndop'
  | 'signature-totem'
  | 'grassfields-chevrons'
  | 'seeds-sun'
  | 'royal-mosaic';

export type AfricanPatternColor = 'forest' | 'terracotta' | 'coral' | 'current';

interface AfricanSectionBackgroundProps {
  /**
   * Cultural geometric pattern name.
   */
  pattern?: AfricanPatternName;
  /**
   * Color accent for the watermark pattern.
   * 'forest': #3F6D4E (Signature Green)
   * 'terracotta': #E0982E (Signature Amber)
   * 'coral': #F2694A (Signature Coral)
   * 'current': adapts to current text color
   */
  color?: AfricanPatternColor;
  /**
   * Size of the repeating tile (e.g. 'sm' 40-60px, 'md' 80-100px, 'lg' 120-140px).
   */
  tileSize?: 'sm' | 'md' | 'lg';
  /**
   * Numeric opacity override (e.g. 0.03 = 3%) ensuring guaranteed rendering without depending on Tailwind JIT class generation.
   */
  opacity?: number;
  /**
   * Opacity preset for the repeating pattern.
   * Defaults to subtle immersion that preserves 100% text readability.
   */
  opacityClass?: string;
  /**
   * Add a soft ambient radial juice glow in the background.
   */
  glowColor?: 'forest' | 'terracotta' | 'coral' | 'none';
  /**
   * Optional giant centered watermark emblem behind the section.
   */
  watermarkEmblem?: 'totem' | 'ndop-mandala' | 'sun' | 'none';
  /**
   * Additional Tailwind classes for the outer wrapper.
   */
  className?: string;
}

const COLOR_HEX: Record<AfricanPatternColor, string> = {
  forest: '#3F6D4E',
  terracotta: '#E0982E',
  coral: '#F2694A',
  current: '#3F6D4E',
};

// Generates the raw SVG data-uri for each pattern with requested color hex
function getPatternDataUri(pattern: AfricanPatternName, hex: string): { uri: string; defaultSize: string } {
  switch (pattern) {
    // ━━━ 1. LE MOTIF ROYAL NDOP BAMILEKE (Chefferies de l'Ouest) ━━━
    case 'ndop': {
      const svg = `<svg width='80' height='80' viewBox='0 0 80 80' xmlns='http://www.w3.org/2000/svg'><g fill='${hex}' fill-opacity='1' fill-rule='evenodd'><path d='M0 40L40 0L80 40L40 80zM40 16L16 40L40 64L64 40z'/><path d='M40 26L26 40L40 54L54 40zM40 33L33 40L40 47L47 40z'/><circle cx='40' cy='40' r='3.5'/><circle cx='0' cy='0' r='3.5'/><circle cx='80' cy='0' r='3.5'/><circle cx='0' cy='80' r='3.5'/><circle cx='80' cy='80' r='3.5'/><path d='M0 12L12 0M68 0L80 12M0 68L12 80M68 80L80 68' stroke='${hex}' stroke-width='1.5'/></g></svg>`;
      return { uri: `url("data:image/svg+xml,${encodeURIComponent(svg)}")`, defaultSize: '80px 80px' };
    }

    // ━━━ 2. LA SIGNATURE TOTEM FYS EN TRAME CONTINUE (Les 5 éléments sacrés) ━━━
    case 'signature-totem': {
      const svg = `<svg width='100' height='130' viewBox='0 0 100 130' xmlns='http://www.w3.org/2000/svg'><g fill='${hex}' stroke='${hex}'><line x1='50' y1='2' x2='50' y2='128' stroke-width='1.2' stroke-dasharray='3 3' stroke-opacity='0.6'/><path d='M46 10L50 5L54 10L54 20L46 20Z' stroke='none'/><path d='M50 26L62 38L50 50L38 38Z M50 32L44 38L50 44L56 38Z' fill-rule='evenodd' stroke='none'/><polygon points='50,35 53,38 50,41 47,38' stroke='none'/><circle cx='50' cy='65' r='10' fill='none' stroke-width='2.5'/><circle cx='50' cy='65' r='4' stroke='none'/><path d='M50 80L62 92L50 104L38 92Z M50 86L44 92L50 98L56 92Z' fill-rule='evenodd' stroke='none'/><polygon points='50,89 53,92 50,95 47,92' stroke='none'/><path d='M46 110L54 110L54 120L50 125L46 120Z' stroke='none'/><circle cx='0' cy='65' r='3' stroke='none'/><circle cx='100' cy='65' r='3' stroke='none'/></g></svg>`;
      return { uri: `url("data:image/svg+xml,${encodeURIComponent(svg)}")`, defaultSize: '100px 130px' };
    }

    // ━━━ 3. CHEVRONS & VANNERIE GRASSFIELDS (Terroir & Artisanat montagnard) ━━━
    case 'grassfields-chevrons': {
      const svg = `<svg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'><g fill='none' stroke='${hex}' stroke-linecap='round' stroke-linejoin='round'><path d='M6 14L30 4L54 14' stroke-width='1.8'/><path d='M6 28L30 18L54 28' stroke-width='1.5'/><path d='M6 42L30 32L54 42' stroke-width='1.5'/><path d='M6 56L30 46L54 56' stroke-width='1.8'/><circle cx='30' cy='4' r='2' fill='${hex}' stroke='none'/><circle cx='30' cy='18' r='1.5' fill='${hex}' stroke='none'/><circle cx='30' cy='32' r='1.5' fill='${hex}' stroke='none'/><circle cx='30' cy='46' r='1.5' fill='${hex}' stroke='none'/></g></svg>`;
      return { uri: `url("data:image/svg+xml,${encodeURIComponent(svg)}")`, defaultSize: '60px 60px' };
    }

    // ━━━ 4. LE SOLEIL ÉQUATORIAL & GRAINES DE FRUITS (Vitalité & Terroir) ━━━
    case 'seeds-sun': {
      const svg = `<svg width='90' height='90' viewBox='0 0 90 90' xmlns='http://www.w3.org/2000/svg'><g fill='${hex}'><circle cx='45' cy='45' r='18' fill='none' stroke='${hex}' stroke-width='1.8'/><circle cx='45' cy='45' r='12' fill='none' stroke='${hex}' stroke-width='1' stroke-dasharray='3 2'/><circle cx='45' cy='45' r='4'/><polygon points='45,16 50,30 45,34 40,30'/><polygon points='45,74 50,60 45,56 40,60'/><polygon points='16,45 30,50 34,45 30,40'/><polygon points='74,45 60,50 56,45 60,40'/><circle cx='0' cy='0' r='3.5'/><circle cx='90' cy='0' r='3.5'/><circle cx='0' cy='90' r='3.5'/><circle cx='90' cy='90' r='3.5'/></g></svg>`;
      return { uri: `url("data:image/svg+xml,${encodeURIComponent(svg)}")`, defaultSize: '90px 90px' };
    }

    // ━━━ 5. LA MOSAÏQUE ROYALE DES CHEFFERIES (Perles & Trônes Bamum) ━━━
    case 'royal-mosaic':
    default: {
      const svg = `<svg width='70' height='70' viewBox='0 0 70 70' xmlns='http://www.w3.org/2000/svg'><g fill='none' stroke='${hex}'><path d='M35 5L65 35L35 65L5 35Z' stroke-width='1.8'/><path d='M35 15L55 35L35 55L15 35Z' stroke-width='1.2' stroke-dasharray='3 2'/><polygon points='35,24 46,35 35,46 24,35' fill='${hex}'/><circle cx='35' cy='35' r='2' fill='#ffffff'/><circle cx='35' cy='5' r='2' fill='${hex}'/><circle cx='65' cy='35' r='2' fill='${hex}'/><circle cx='35' cy='65' r='2' fill='${hex}'/><circle cx='5' cy='35' r='2' fill='${hex}'/></g></svg>`;
      return { uri: `url("data:image/svg+xml,${encodeURIComponent(svg)}")`, defaultSize: '70px 70px' };
    }
  }
}

export function AfricanSectionBackground({
  pattern = 'ndop',
  color = 'forest',
  tileSize = 'md',
  opacity,
  opacityClass = 'opacity-[0.035] dark:opacity-[0.05]',
  glowColor = 'forest',
  watermarkEmblem = 'none',
  className = '',
}: AfricanSectionBackgroundProps) {
  const hex = COLOR_HEX[color];
  const { uri, defaultSize } = React.useMemo(() => getPatternDataUri(pattern, hex), [pattern, hex]);

  const sizeStyle = React.useMemo(() => {
    if (tileSize === 'sm') return '50px 50px';
    if (tileSize === 'lg') return '120px 120px';
    return defaultSize;
  }, [tileSize, defaultSize]);

  // Guaranteed subtle opacity that never defaults to 100%
  const computedOpacity = opacity !== undefined ? opacity : 0.035;

  return (
    <div className={`absolute inset-0 pointer-events-none select-none z-0 overflow-hidden ${className}`} aria-hidden="true">
      {/* ── 1. The Seamless Repeating Cultural Geometric Pattern ── */}
      <div
        className={`absolute inset-0 transition-opacity duration-700 ${opacityClass}`}
        style={{
          backgroundImage: uri,
          backgroundSize: sizeStyle,
          backgroundRepeat: 'repeat',
          opacity: computedOpacity,
        }}
      />

      {/* ── 2. Ambient Juice Glow for Organic Depth ── */}
      {glowColor !== 'none' && (
        <div
          className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full blur-[140px] pointer-events-none transition-all duration-700 ${
            glowColor === 'terracotta'
              ? 'w-[550px] h-[550px] bg-[#E0982E]/[0.08] dark:bg-[#E0982E]/[0.06]'
              : glowColor === 'coral'
              ? 'w-[500px] h-[500px] bg-[#F2694A]/[0.07] dark:bg-[#F2694A]/[0.05]'
              : 'w-[600px] h-[600px] bg-[#3F6D4E]/[0.08] dark:bg-[#3F6D4E]/[0.07]'
          }`}
        />
      )}

      {/* ── 3. Optional Giant Sacred Watermark Emblem ── */}
      {watermarkEmblem !== 'none' && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none flex items-center justify-center">
          {watermarkEmblem === 'totem' && (
            <svg
              viewBox="0 0 200 660"
              className="w-[320px] md:w-[480px] lg:w-[600px] h-auto max-h-[85vh] text-[#3F6D4E] dark:text-[#AECBB2]"
              style={{ opacity: 0.045 }}
              fill="currentColor"
            >
              <path d="M 92.5,18 L 100,10 L 107.5,18 L 107.5,90 L 92.5,90 Z" />
              <path d="M 100,104 L 150,184 L 100,264 L 50,184 Z M 100,130 L 67,184 L 100,238 L 133,184 Z" fillRule="evenodd" />
              <path d="M 100,158 L 114,184 L 100,210 L 86,184 Z" />
              <circle cx="100" cy="330" r="44.5" fill="none" stroke="currentColor" strokeWidth="15" />
              <circle cx="100" cy="330" r="17" />
              <path d="M 100,396 L 150,476 L 100,556 L 50,476 Z M 100,422 L 67,476 L 100,530 L 133,476 Z" fillRule="evenodd" />
              <path d="M 100,450 L 114,476 L 100,502 L 86,476 Z" />
              <path d="M 92.5,570 L 107.5,570 L 107.5,642 L 100,650 L 92.5,642 Z" />
            </svg>
          )}

          {watermarkEmblem === 'ndop-mandala' && (
            <svg
              viewBox="0 0 200 200"
              className="w-[360px] md:w-[520px] h-auto text-[#E0982E]"
              style={{ opacity: 0.045 }}
              fill="none"
              stroke="currentColor"
            >
              <circle cx="100" cy="100" r="92" strokeWidth="1.5" strokeDasharray="6 4" />
              <circle cx="100" cy="100" r="76" strokeWidth="2.5" />
              <circle cx="100" cy="100" r="50" strokeWidth="1.5" strokeDasharray="4 4" />
              <polygon points="100,30 170,100 100,170 30,100" strokeWidth="2" />
              <polygon points="100,55 145,100 100,145 55,100" strokeWidth="1.5" />
              <circle cx="100" cy="100" r="14" fill="currentColor" stroke="none" />
            </svg>
          )}

          {watermarkEmblem === 'sun' && (
            <svg
              viewBox="0 0 200 200"
              className="w-[360px] md:w-[500px] h-auto text-[#F2694A]"
              style={{ opacity: 0.045 }}
              fill="none"
              stroke="currentColor"
            >
              <circle cx="100" cy="100" r="40" strokeWidth="2" />
              <circle cx="100" cy="100" r="16" fill="currentColor" stroke="none" />
              <path d="M 100,10 L 100,30 M 100,170 L 100,190 M 10,100 L 30,100 M 170,100 L 190,100" strokeWidth="2.5" />
              <path d="M 36,36 L 50,50 M 150,150 L 164,164 M 36,164 L 50,150 M 150,50 L 164,36" strokeWidth="2" strokeDasharray="4 2" />
              <circle cx="100" cy="100" r="80" strokeWidth="1" strokeDasharray="5 5" />
            </svg>
          )}
        </div>
      )}
    </div>
  );
}
