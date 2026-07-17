import { useState } from 'react';
import { Search } from 'lucide-react';
import { CocktailCard } from './CocktailCard';
import { CatalogueOrderSheet } from './CatalogueOrderSheet';
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
    <div className="min-h-screen bg-background pb-20">

      {/* Hero Banner */}
      <div
        className="relative w-full h-[220px] flex items-end px-3 md:px-6 pb-8 mb-12 overflow-hidden"
        style={{
          backgroundImage: "url('https://images.pexels.com/photos/1337825/pexels-photo-1337825.jpeg?auto=compress&cs=tinysrgb&w=1200')",
          backgroundSize: 'cover',
          backgroundPosition: 'center top',
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
        <div className="relative z-10">
          <p className="text-white/70 text-xs font-bold uppercase tracking-[0.2em] mb-1">Nos créations</p>
          <h1 className="font-display font-extrabold text-4xl text-white">
            Le <span className="text-secondary italic">Catalogue</span>
          </h1>
        </div>
      </div>

      <div className="px-3 md:px-4 space-y-10">

        {/* Search */}
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

        {/* Section title */}
        <div className="text-center">
          <h3 className="font-display font-bold text-3xl">
            <span className="text-foreground">Nos </span>
            <span className="text-primary">Créations</span>
          </h3>
          <p className="text-muted-foreground mt-2 font-medium">
            Inspirés par la nature, validés par votre goût.
          </p>
        </div>

        {/* Grid */}
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
      </div>

      <CatalogueOrderSheet
        cocktail={selected}
        open={!!selected}
        onOpenChange={(v) => !v && setSelected(null)}
      />
    </div>
  );
}
