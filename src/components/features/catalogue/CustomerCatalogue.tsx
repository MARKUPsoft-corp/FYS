import { useState } from 'react';
import { Search } from 'lucide-react';
import { CocktailCard } from './CocktailCard';
import { CatalogueOrderSheet } from './CatalogueOrderSheet';
import { BoardPageShell } from '@/components/layout/BoardPageShell';
import type { Cocktail } from '@/entities';

type Props = {
  cocktails: Cocktail[];
  loading?: boolean;
};

export function CustomerCatalogue({ cocktails, loading }: Props) {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Cocktail | null>(null);

  const visible = cocktails.filter(
    (c) =>
      c.isActive &&
      c.isPublic &&
      c.name.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <>
      <BoardPageShell
        eyebrow="Nos créations"
        titleBefore="Le"
        titleHighlight="Catalogue"
        sectionBefore="Nos"
        sectionHighlight="Créations"
        subtitle="Inspirés par la nature, validés par votre goût."
        imageUrl="https://images.pexels.com/photos/1337825/pexels-photo-1337825.jpeg?auto=compress&cs=tinysrgb&w=1200"
        imagePosition="center top"
        actions={
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-muted-foreground" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher un cocktail…"
              className="w-full h-14 pl-12 pr-4 rounded-[2rem] bg-card border border-border/60 text-foreground placeholder:text-muted-foreground font-medium text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition-shadow"
            />
          </div>
        }
      >
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 pb-8">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex flex-col gap-3">
                <div className="w-full aspect-[4/5] rounded-[1.75rem] border border-border/50 bg-muted/30 animate-pulse" />
                <div className="px-2 space-y-2">
                  <div className="h-4 w-2/3 rounded bg-muted animate-pulse" />
                  <div className="h-3 w-1/3 rounded bg-muted animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : visible.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-12">
            {query ? 'Aucun résultat pour cette recherche.' : 'Aucun cocktail disponible pour le moment.'}
          </p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 pb-8">
            {visible.map((cocktail) => (
              <CocktailCard
                key={cocktail.id}
                cocktail={cocktail}
                onView={setSelected}
              />
            ))}
          </div>
        )}
      </BoardPageShell>

      <CatalogueOrderSheet
        cocktail={selected}
        open={!!selected}
        onOpenChange={(v) => !v && setSelected(null)}
      />
    </>
  );
}
