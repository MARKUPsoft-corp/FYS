import { useRef, useState, type MouseEvent, type ReactNode } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CocktailBanner, type FruitVisual } from '@/components/features/cocktail/CocktailBanner';
import { downloadCocktailLabelPng, sanitizeLabelFilename } from '@/lib/label-export';

type Props = {
  cocktailName: string;
  clientName?: string;
  fruits?: FruitVisual[];
  fruitNames?: string[];
  imageUrl?: string | null;
  badge?: ReactNode;
  heightClass?: string;
  filename?: string;
  className?: string;
};

export function CocktailLabelExport({
  cocktailName,
  clientName,
  fruits,
  fruitNames,
  imageUrl,
  badge,
  heightClass = 'h-[200px] sm:h-[220px]',
  filename,
  className,
}: Props) {
  const exportRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);

  async function handleDownload(e: MouseEvent) {
    e.stopPropagation();
    if (!exportRef.current) return;
    setDownloading(true);
    try {
      const safe = sanitizeLabelFilename(cocktailName);
      await downloadCocktailLabelPng(
        exportRef.current,
        filename ?? `Etiquette_${safe}.png`,
      );
    } catch (err) {
      console.error('Échec export étiquette PNG:', err);
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className={`relative ${className ?? ''}`}>
      <div ref={exportRef} className="overflow-hidden">
        <CocktailBanner
          cocktailName={cocktailName}
          clientName={clientName}
          fruits={fruits}
          fruitNames={fruitNames}
          imageUrl={imageUrl}
          badge={badge}
          showText
          heightClass={heightClass}
        />
      </div>

      <Button
        type="button"
        variant="ghost"
        size="icon"
        disabled={downloading}
        onClick={handleDownload}
        title="Télécharger l'étiquette (PNG)"
        aria-label="Télécharger l'étiquette (PNG)"
        className="absolute bottom-3 right-3 z-20 size-8 rounded-full bg-black/45 hover:bg-black/60 text-white border-0 backdrop-blur-sm"
      >
        {downloading ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : (
          <Download className="size-3.5" />
        )}
      </Button>
    </div>
  );
}
