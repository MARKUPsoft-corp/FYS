import { useState } from 'react';
import { Search } from 'lucide-react';
import { CocktailCard } from './CocktailCard';
import { CocktailDetailDrawer } from './CocktailDetailDrawer';
import type { Cocktail } from '@/entities';

type Props = {
  cocktails: Cocktail[];
  loading?: boolean;
};

export function CustomerCatalogue({ cocktails, loading }: Props) {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Cocktail | null>(null);

  const visible = cocktails.filter(
    (c) => c.isActive && c.isPublic &&
      c.name.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <div className="min-h-screen bg-background pb-20">

      {/* Hero Banner */}
      <div
        className="relative w-full h-[220px] flex items-end px-6 pb-8 mb-12 overflow-hidden"
        style={{
          backgroundImage: "url('https://images.pexels.com/photos/1337825/pexels-photo-1337825.jpeg?auto=compress&cs=tinysrgb&w=1200')",
          backgroundSize: 'cover',
          backgroundPosition: 'center top',
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
        <div className="relative z-10">
          <p className="text-white/70 text-xs font-bold uppercase tracking-[0.2em] mb-1">Our creations</p>
          <h1 className="font-display font-extrabold text-4xl text-white">
            The <span className="text-secondary italic">Catalogue</span>
          </h1>
        </div>
      </div>

      <div className="px-4 space-y-10">

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-muted-foreground" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search a cocktail…"
            className="w-full h-14 pl-12 pr-4 rounded-[2rem] bg-card border border-border/60 text-foreground placeholder:text-muted-foreground font-medium text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition-shadow"
          />
        </div>

        {/* Section title */}
        <div className="text-center">
          <h3 className="font-display font-bold text-3xl">
            <span className="text-foreground">Our </span>
            <span className="text-primary">Creations</span>
          </h3>
          <p className="text-muted-foreground mt-2 font-medium">
            Inspired by nature, validated by your taste.
          </p>
        </div>

        {/* Grid */}
        {loading ? (
          <p className="text-center text-sm text-muted-foreground py-12">Loading…</p>
        ) : visible.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-12">No cocktails found.</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-16 pb-8 pt-14">
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

      <CocktailDetailDrawer
        cocktail={selected}
        open={!!selected}
        onClose={() => setSelected(null)}
      />
    </div>
  );
}
