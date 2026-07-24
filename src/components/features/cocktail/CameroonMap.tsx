import { useMemo, useState } from 'react';
import cameroonMap from '@svg-maps/cameroon';
import type { CocktailIngredient, CameroonRegion } from '@/entities';
import { useQuery } from '@tanstack/react-query';
import { getFruits } from '@/services/fruit';
import { generateRegionInfo } from '@/services/ai';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { MapPin, Sparkles, X } from 'lucide-react';

export interface CameroonMapProps {
  ingredients: CocktailIngredient[];
}

const REGION_ID_MAP: Record<CameroonRegion, string> = {
  'Adamaoua': 'adamawa',
  'Centre': 'central',
  'Est': 'east',
  'Extrême-Nord': 'far-north',
  'Littoral': 'littoral',
  'Nord': 'north',
  'Nord-Ouest': 'northwest',
  'Ouest': 'west',
  'Sud': 'south',
  'Sud-Ouest': 'southwest',
};

const REGION_DESCRIPTIONS_FALLBACK: Record<string, string> = {
  "adamawa": "Le château d'eau du Cameroun. Son climat d'altitude offre un terroir unique pour des fruits gorgés de soleil.",
  "central": "Cœur forestier du pays, bénéficiant d'une pluviométrie abondante idéale pour les fruits tropicaux charnus.",
  "east": "La vaste forêt équatoriale nourrit une biodiversité exceptionnelle, donnant aux fruits une saveur sauvage.",
  "far-north": "Terre de savanes, produisant des fruits résilients à la concentration en sucre remarquable sous un soleil de plomb.",
  "littoral": "Bordée par l'océan, cette région volcanique fertile produit parmi les meilleurs fruits d'Afrique centrale.",
  "north": "Un climat soudano-sahélien où la terre des vallées permet la culture de fruits aux saveurs intenses.",
  "northwest": "Hautes terres volcaniques au climat frais, réputées pour des fruits d'une fraîcheur et qualité inégalées.",
  "south": "En plein cœur de la forêt, une humidité constante qui est le secret de fruits juteux et onctueux.",
  "southwest": "Dominée par le Mont Cameroun, ses sols volcaniques extrêmement riches sont un paradis pour les fruits exotiques.",
  "west": "Le grenier du Cameroun ! Ses terres volcaniques fertiles offrent des fruits d'une qualité nutritionnelle exceptionnelle."
};

// Coordonnées pré-calculées des centres des régions (viewBox: "0 0 793 1160")
const CENTROIDS: Record<string, { x: number, y: number }> = {
  "adamawa": { x: 488, y: 603 },
  "central": { x: 334, y: 847 },
  "east": { x: 602, y: 930 },
  "far-north": { x: 622, y: 254 }, // Adjusted slightly down for visual balance
  "littoral": { x: 177, y: 887 },
  "north": { x: 558, y: 442 },
  "northwest": { x: 196, y: 668 },
  "south": { x: 334, y: 1030 },
  "southwest": { x: 84, y: 793 },
  "west": { x: 215, y: 755 }
};

export function CameroonMap({ ingredients }: CameroonMapProps) {
  const { data: fruits = [] } = useQuery({ queryKey: ['fruits'], queryFn: getFruits });
  const [activeRegion, setActiveRegion] = useState<string | null>(null);

  // Map each ingredient to its region and image
  const fruitsByRegion = useMemo(() => {
    const map = new Map<string, { id: string; name: string; image?: string }[]>();
    for (const ing of ingredients) {
      const fruit = fruits.find(f => f.id === ing.fruitId);
      if (fruit?.region) {
        const regionId = REGION_ID_MAP[fruit.region];
        if (regionId) {
          const list = map.get(regionId) || [];
          list.push({ id: fruit.id, name: fruit.name, image: fruit.imageUrl });
          map.set(regionId, list);
        }
      }
    }
    return map;
  }, [ingredients, fruits]);

  // Si une région avec fruits n'est pas cliquée, on peut afficher la première dispo ou null
  const defaultRegion = Array.from(fruitsByRegion.keys())[0] || null;
  const displayRegionId = activeRegion || defaultRegion;
  const displayRegionName = displayRegionId ? cameroonMap.locations.find((l: any) => l.id === displayRegionId)?.name : null;

  const { data: aiRegionText, isLoading: isRegionLoading } = useQuery({
    queryKey: ['region-info', displayRegionName],
    queryFn: () => displayRegionName ? generateRegionInfo(displayRegionName) : Promise.resolve(''),
    enabled: !!displayRegionName,
    staleTime: 1000 * 60 * 60 * 24, // cache for 24h
  });

  return (
    <div className="relative w-full bg-background/50 rounded-3xl mt-4 overflow-hidden p-2">

      {/* Box statique d'explication: en haut à gauche de la carte */}
      <div className="absolute top-4 left-4 max-w-[180px] z-10 bg-background/80 backdrop-blur-md border border-border/50 p-3 rounded-2xl shadow-xl pointer-events-none">
        <div className="flex items-center gap-1.5 mb-1.5">
          <MapPin className="size-3.5 text-primary shrink-0" />
          <h4 className="font-display font-bold text-xs text-foreground">Terroir Local</h4>
        </div>
        <p className="text-[10px] text-muted-foreground leading-relaxed">
          Cliquez sur une bulle pour voir les infos agricoles de la région.
        </p>
      </div>

      {/* Contextual Box for Region Info */}
      {activeRegion && displayRegionName && (
        <>
          {/* Invisible overlay to dismiss the box when clicking outside */}
          <div 
            className="absolute inset-0 z-20 cursor-pointer" 
            onClick={() => setActiveRegion(null)} 
            aria-label="Fermer"
          />
          <div className="absolute z-30 bottom-4 left-4 right-4 md:bottom-8 md:left-1/2 md:-translate-x-1/2 md:w-80 bg-background/95 backdrop-blur-md border border-primary/20 p-5 rounded-2xl shadow-2xl animate-in fade-in slide-in-from-bottom-4 zoom-in-95">
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <MapPin className="size-5 text-primary" />
                <h4 className="font-display font-bold text-base text-foreground">{displayRegionName}</h4>
              </div>
              <button 
                onClick={() => setActiveRegion(null)}
                className="p-1.5 rounded-full hover:bg-foreground/5 text-muted-foreground transition-colors"
                aria-label="Fermer"
              >
                <X className="size-4" />
              </button>
            </div>
            
            <div className="text-xs text-muted-foreground leading-relaxed relative min-h-[60px]">
               {isRegionLoading ? (
                 <div className="flex items-center gap-2 text-primary/60 animate-pulse mt-2">
                   <Sparkles className="size-4" />
                   <span>L'IA rédige l'histoire de ce terroir...</span>
                 </div>
               ) : (
                 <p 
                   className="animate-in fade-in"
                   dangerouslySetInnerHTML={{ 
                     __html: (aiRegionText || REGION_DESCRIPTIONS_FALLBACK[displayRegionId!])
                       .replace(/\*\*(.*?)\*\*/g, '<strong class="text-primary font-bold">$1</strong>') 
                   }}
                 />
               )}
            </div>
            
            {fruitsByRegion.has(activeRegion) && (
              <div className="mt-4 pt-3 border-t border-border/50 flex flex-wrap gap-2">
                {fruitsByRegion.get(activeRegion)!.map(f => (
                  <div key={f.id} className="flex items-center gap-1.5 bg-primary/10 px-2 py-1 rounded-full">
                    {f.image && <img src={f.image} alt="" className="w-5 h-5 rounded-full object-cover shadow-sm" />}
                    <span className="text-[11px] font-semibold text-primary">{f.name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox={cameroonMap.viewBox}
        className="w-full h-auto drop-shadow-xl"
        style={{ fill: 'currentColor' }}
      >
        <defs>
          {Array.from(fruitsByRegion.keys()).map(regionId => (
            <clipPath key={`clip-${regionId}`} id={`clip-fruit-${regionId}`}>
              <circle cx="0" cy="-30" r="11" />
            </clipPath>
          ))}
        </defs>
        <TooltipProvider>
          {/* 1. Couche des régions (chemins) */}
          {cameroonMap.locations.map((location: any) => {
            const hasFruits = fruitsByRegion.has(location.id);
            const isHighlighted = hasFruits;
            const isActive = activeRegion === location.id;
            const frName = Object.keys(REGION_ID_MAP).find(key => REGION_ID_MAP[key as CameroonRegion] === location.id) || location.name;

            return (
              <Tooltip key={`path-${location.id}`}>
                <TooltipTrigger asChild>
                  <g 
                    className="group cursor-pointer"
                    onClick={() => { if (hasFruits) setActiveRegion(location.id); }}
                  >
                    <path
                      id={location.id}
                      name={frName}
                      d={location.path}
                      className={`
                        transition-all duration-500 ease-in-out stroke-background stroke-[1.5px]
                        ${isActive 
                          ? 'fill-primary text-primary-foreground drop-shadow-md'
                          : isHighlighted 
                            ? 'fill-primary/60 hover:fill-primary text-primary-foreground animate-pulse' 
                            : 'fill-muted/60 hover:fill-muted text-muted-foreground'
                        }
                      `}
                    />
                  </g>
                </TooltipTrigger>
                {hasFruits && !isActive && (
                  <TooltipContent className="bg-popover text-popover-foreground border-border/50 shadow-xl rounded-xl p-2 px-3 text-xs">
                    Cliquer pour voir les détails
                  </TooltipContent>
                )}
              </Tooltip>
            );
          })}

          {/* 2. Couche des noms de régions (textes) */}
          {cameroonMap.locations.map((location: any) => {
            const hasFruits = fruitsByRegion.has(location.id);
            const isActive = activeRegion === location.id;
            const isHighlighted = hasFruits;
            const centroid = CENTROIDS[location.id] || { x: 0, y: 0 };
            const frName = Object.keys(REGION_ID_MAP).find(key => REGION_ID_MAP[key as CameroonRegion] === location.id) || location.name;

            if (centroid.x === 0) return null;

            return (
              <text
                key={`text-${location.id}`}
                x={centroid.x}
                y={centroid.y + (hasFruits ? 95 : 28)}
                textAnchor="middle"
                fontSize={frName.length > 9 ? '17' : frName.length > 5 ? '20' : '24'}
                fontWeight="700"
                className={`pointer-events-none select-none transition-colors ${
                  isHighlighted || isActive 
                    ? 'fill-white stroke-black/50' 
                    : 'fill-muted-foreground stroke-background'
                }`}
                strokeWidth="5"
                paintOrder="stroke"
                fontFamily="sans-serif"
              >
                {frName}
              </text>
            );
          })}

          {/* 3. Couche des pins (au-dessus de tout) */}
          {cameroonMap.locations.map((location: any) => {
            const hasFruits = fruitsByRegion.has(location.id);
            if (!hasFruits) return null;
            
            const regionFruits = fruitsByRegion.get(location.id)!;
            const isActive = activeRegion === location.id;
            const centroid = CENTROIDS[location.id] || { x: 0, y: 0 };

            return (
              <g 
                key={`pin-${location.id}`}
                transform={`translate(${centroid.x}, ${centroid.y})`}
                className="cursor-pointer"
                onClick={() => setActiveRegion(location.id)}
              >
                 <g 
                   style={{ 
                     transform: `scale(${isActive ? 4.5 : 4})`, 
                     transition: 'transform 0.3s ease-in-out' 
                   }}
                   className="animate-in fade-in duration-500 hover:scale-[4.2]"
                 >
                   {/* Zone cliquable étendue */}
                   <rect x="-20" y="-50" width="40" height="60" fill="transparent" className="cursor-pointer" />
                   
                   <path 
                     d="M0 0 C-10 -10 -15 -20 -15 -30 A15 15 0 1 1 15 -30 C15 -20 10 -10 0 0 Z" 
                     className="fill-background stroke-primary stroke-[1.5px] drop-shadow-md pointer-events-none"
                   />
                   
                   {regionFruits[0].image ? (
                     <image 
                       href={regionFruits[0].image}
                       x="-11" y="-41" 
                       width="22" height="22"
                       clipPath={`url(#clip-fruit-${location.id})`}
                       preserveAspectRatio="xMidYMid slice"
                       className="pointer-events-none"
                     />
                   ) : (
                     <circle cx="0" cy="-30" r="11" className="fill-primary/20 pointer-events-none" />
                   )}
                   
                   {regionFruits.length > 1 && (
                     <g transform="translate(9, -41)" className="pointer-events-none">
                       <circle cx="0" cy="0" r="6" className="fill-primary" />
                       <text x="0" y="2" fontSize="7" fill="white" textAnchor="middle" fontWeight="bold">
                         +{regionFruits.length - 1}
                       </text>
                     </g>
                   )}
                </g>
              </g>
            );
          })}
        </TooltipProvider>
      </svg>
    </div>
  );
}
