import type { ReactNode } from 'react';

type Props = {
  eyebrow: string;
  titleBefore: string;
  titleHighlight: string;
  titleAfter?: string;
  sectionBefore: string;
  sectionHighlight: string;
  subtitle: string;
  imageUrl: string;
  imagePosition?: string;
  heroExtra?: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
};

/**
 * Layout partagé client/admin :
 * hero full-bleed + titre de section centré + contenu.
 */
export function BoardPageShell({
  eyebrow,
  titleBefore,
  titleHighlight,
  titleAfter,
  sectionBefore,
  sectionHighlight,
  subtitle,
  imageUrl,
  imagePosition = 'center',
  heroExtra,
  actions,
  children,
}: Props) {
  return (
    <div className="min-h-screen bg-background pb-20">
      <div
        className="relative w-full h-[220px] flex items-end px-3 md:px-6 pb-8 mb-12 overflow-hidden"
        style={{
          backgroundImage: `url('${imageUrl}')`,
          backgroundSize: 'cover',
          backgroundPosition: imagePosition,
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
        <div className="relative z-10 flex-1 flex items-end justify-between gap-4">
          <div>
            <p className="text-white/70 text-xs font-bold uppercase tracking-[0.2em] mb-1">
              {eyebrow}
            </p>
            <h1 className="font-display font-extrabold text-4xl text-white">
              {titleBefore}{' '}
              <span className="text-secondary italic">{titleHighlight}</span>
              {titleAfter ? ` ${titleAfter}` : ''}
            </h1>
          </div>
          {heroExtra}
        </div>
      </div>

      <div className="px-3 md:px-4 space-y-8">
        {actions}

        <div className="text-center">
          <h3 className="font-display font-bold text-3xl">
            <span className="text-foreground">{sectionBefore} </span>
            <span className="text-primary">{sectionHighlight}</span>
          </h3>
          <p className="text-muted-foreground mt-2 font-medium text-sm max-w-lg mx-auto">
            {subtitle}
          </p>
        </div>

        {children}
      </div>
    </div>
  );
}
