import { PageComponent, Link } from 'rasengan';
import { ChevronLeft, Sparkles, FlaskConical, Plus } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';

const FRUITS_MOCK = [
  { id: 'ananas', emoji: '🍍', name: 'Ananas' },
  { id: 'pasteque', emoji: '🍉', name: 'Pastèque' },
  { id: 'mangue', emoji: '🥭', name: 'Mangue' },
  { id: 'papaye', emoji: '🍈', name: 'Papaye' },
  { id: 'banane', emoji: '🍌', name: 'Banane' },
  { id: 'citron', emoji: '🍋', name: 'Citron' },
  { id: 'corossol', emoji: '🌺', name: 'Corossol' },
  { id: 'baobab', emoji: '🌿', name: 'Baobab' },
  { id: 'orange', emoji: '🍊', name: 'Orange' },
  { id: 'pomme', emoji: '🍎', name: 'Pomme' },
  { id: 'folere', emoji: '🌸', name: 'Foléré' },
  { id: 'goyave', emoji: '🥝', name: 'Goyave' },
];

const FysLab: PageComponent = () => {
  const [selectedFruits, setSelectedFruits] = useState<string[]>(['ananas', 'mangue', 'citron']);

  const toggleFruit = (id: string) => {
    setSelectedFruits(prev =>
      prev.includes(id)
        ? prev.filter(f => f !== id)
        : prev.length < 5 ? [...prev, id] : prev
    );
  };

  const getSelected = () => FRUITS_MOCK.filter(f => selectedFruits.includes(f.id));

  return (
    <div className="min-h-screen bg-background">

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          HERO HEADER — full photo, dark overlay
          Tabs are inside the header (all screens)
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div
        className="relative flex flex-col justify-end px-5 lg:px-16 pb-6 overflow-hidden"
        style={{
          minHeight: '240px',
          backgroundImage: "url('https://images.pexels.com/photos/338713/pexels-photo-338713.jpeg?auto=compress&cs=tinysrgb&w=1600')",
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        {/* Dark overlay fading to background */}
        <div className="absolute inset-0 bg-gradient-to-b from-gray-950/90 via-gray-900/80 to-gray-950/95" />

        <div className="relative z-10 max-w-6xl mx-auto w-full">
          {/* Back link */}
          <Link to="/board" className="inline-flex items-center text-white/80 hover:text-white transition-colors text-sm font-medium mt-5 mb-4">
            <ChevronLeft className="size-4 mr-1" /> Retour
          </Link>

          {/* Title and Tabs Row */}
          <div className="flex flex-col lg:flex-row items-center lg:justify-between gap-5 text-center lg:text-left mb-3">
            <div>
              <h1 className="font-display font-extrabold text-[2rem] lg:text-5xl text-white flex items-center justify-center lg:justify-start gap-2 mb-1">
                FYS Lab <Sparkles className="size-6 text-secondary" />
              </h1>
              <p className="text-white/70 text-sm font-medium">Votre jus, validé par NutriFYS</p>
            </div>

            {/* Tab control — Centered on mobile */}
            <div className="flex bg-white/10 backdrop-blur-md rounded-2xl p-1 border border-white/10 shadow-inner w-fit mx-auto lg:mx-0">
              <button className="px-5 py-2.5 text-[11px] lg:text-xs font-bold bg-white text-gray-950 rounded-xl shadow-sm whitespace-nowrap">
                Je compose
              </button>
              <button className="px-5 py-2.5 text-[11px] lg:text-xs font-medium text-white/70 hover:text-white transition-colors whitespace-nowrap">
                Suppléments
              </button>
              <div className="flex flex-col items-center justify-center px-4 py-1 text-white/70 hover:text-white cursor-pointer transition-colors whitespace-nowrap">
                <span className="text-[7.5px] lg:text-[8px] uppercase font-bold tracking-widest text-[#E0982E] leading-none mb-0.5 flex items-center gap-0.5">
                  NutriFYS <Sparkles className="size-2.5" />
                </span>
                <span className="text-[10px] lg:text-[11px] font-medium leading-none">compose</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          MAIN CONTENT
          Mobile: single column, NutriFYS card overlaps header
          Desktop: two columns
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div className="max-w-6xl mx-auto px-4 lg:px-16 pb-36 lg:pb-12">
        <div className="flex flex-col lg:flex-row gap-6 lg:gap-12 items-start">

          {/* ── LEFT COLUMN ── */}
          <div className="flex-1 min-w-0 w-full">

            {/* NutriFYS card — overlaps header on mobile, forced to front (z-20), centered on mobile */}
            <div className="relative z-20 -mt-5 lg:mt-8 bg-card rounded-2xl p-4 mb-6 border border-border/60 shadow-lg flex items-center lg:items-start gap-4 mx-auto lg:mx-0 max-w-lg lg:max-w-none text-left">
              <div className="size-10 rounded-full bg-[#E0982E]/10 flex items-center justify-center shrink-0 border border-[#E0982E]/20">
                <Sparkles className="size-4 text-[#E0982E]" />
              </div>
              <div>
                <span className="text-secondary text-[10px] font-bold uppercase tracking-widest block mb-0.5">NutriFYS</span>
                <p className="text-foreground text-[12px] md:text-[13px] font-medium leading-relaxed">
                  Choisissez vos fruits 🍹. Je vérifierai que la composition correspond à votre profil de santé.
                </p>
              </div>
            </div>

            {/* Section label */}
            <div className="flex items-center gap-2 mb-3">
              <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                Fruits disponibles · Pleine saison
              </h3>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-secondary opacity-50"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-secondary"></span>
              </span>
            </div>

            {/* Fruit Grid — Responsive (3 cols small mobile, 4 cols tablet, 5 on desktop) */}
            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-3">
              {FRUITS_MOCK.map((fruit) => {
                const isSelected = selectedFruits.includes(fruit.id);
                return (
                  <button
                    key={fruit.id}
                    onClick={() => toggleFruit(fruit.id)}
                    className={`
                      aspect-square rounded-[1rem] flex flex-col items-center justify-center gap-1.5 transition-all duration-200
                      ${isSelected
                        ? 'bg-primary/10 border-2 border-primary shadow-[0_4px_12px_rgba(63,109,78,0.15)] scale-[0.97]'
                        : 'bg-card border-2 border-border/60 hover:border-primary/40 shadow-sm hover:-translate-y-0.5'
                      }
                    `}
                  >
                    <span className="text-2xl lg:text-3xl filter drop-shadow-sm">{fruit.emoji}</span>
                    <span className={`text-[10px] font-semibold ${isSelected ? 'text-primary' : 'text-muted-foreground'}`}>
                      {fruit.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── RIGHT COLUMN (Desktop Only) ── */}
          <div className="hidden lg:block w-[380px] shrink-0">
            <div className="bg-card rounded-3xl border border-border/60 shadow-sm overflow-hidden sticky top-24 mt-8">

              {/* Panel Header */}
              <div className="bg-primary/5 border-b border-border/40 px-6 py-5 flex items-center gap-3">
                <div className="size-9 bg-primary/10 rounded-xl flex items-center justify-center">
                  <FlaskConical className="size-5 text-primary" />
                </div>
                <div>
                  <h2 className="font-display font-bold text-base text-foreground">Ma recette</h2>
                  <p className="text-xs text-muted-foreground">{selectedFruits.length}/5 fruits sélectionnés</p>
                </div>
              </div>

              {/* Fruit chips */}
              <div className="px-6 py-5 min-h-[160px] flex flex-wrap gap-2 content-start">
                {getSelected().length === 0 && (
                  <div className="w-full flex flex-col items-center justify-center py-6 text-center gap-2">
                    <Plus className="size-6 text-muted-foreground/40" />
                    <p className="text-sm text-muted-foreground font-medium">Sélectionnez des fruits dans la grille</p>
                  </div>
                )}
                {getSelected().map(f => (
                  <button
                    key={`chip-${f.id}`}
                    onClick={() => toggleFruit(f.id)}
                    className="flex items-center gap-2 px-3 py-2 bg-primary/10 rounded-full border border-primary/20 text-sm font-bold text-primary hover:bg-red-50 hover:border-red-200 hover:text-red-500 transition-colors group"
                  >
                    <span>{f.emoji}</span> {f.name}
                    <span className="text-[10px] opacity-0 group-hover:opacity-100 transition-opacity ml-0.5">✕</span>
                  </button>
                ))}
              </div>

              <div className="border-t border-border/40 mx-6" />

              <div className="px-6 py-5">
                <Button
                  size="lg"
                  className="w-full h-14 rounded-2xl bg-primary hover:bg-primary/90 text-white font-bold text-[17px] shadow-[0_8px_25px_rgba(63,109,78,0.3)] active:scale-95 transition-all gap-3"
                  disabled={selectedFruits.length === 0}
                >
                  <Sparkles className="size-5" /> Analyser avec NutriFYS
                </Button>
                <p className="text-center text-xs text-muted-foreground mt-3 font-medium">
                  Compatible avec votre profil santé.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          STICKY BOTTOM BAR — Mobile & Tablet only
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div className="fixed bottom-0 left-0 w-full bg-background/95 backdrop-blur-md border-t border-border/50 p-4 pb-6 z-50 rounded-t-3xl lg:hidden">
        <div className="max-w-lg mx-auto space-y-3">
          {/* Selected chips row */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
            {getSelected().map(f => (
              <div key={`sel-${f.id}`} className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 rounded-full border border-primary/20 text-xs font-bold text-primary whitespace-nowrap">
                <span>{f.emoji}</span> {f.name}
              </div>
            ))}
            {selectedFruits.length > 0 && (
              <span className="ml-auto text-xs font-bold text-muted-foreground whitespace-nowrap pl-2">
                {selectedFruits.length} fruits
              </span>
            )}
            {selectedFruits.length === 0 && (
              <span className="text-xs font-medium text-muted-foreground">Aucun fruit sélectionné</span>
            )}
          </div>

          <Button
            size="lg"
            className="w-full h-14 rounded-full bg-primary hover:bg-primary/90 text-white font-bold text-[17px] shadow-[0_8px_25px_rgba(63,109,78,0.3)] active:scale-95 transition-all gap-3"
            disabled={selectedFruits.length === 0}
          >
            <Sparkles className="size-5" /> Analyser avec NutriFYS
          </Button>
        </div>
      </div>

    </div>
  );
};

FysLab.metadata = {
  title: 'FYS Lab — Créateur de Cocktail',
  description: 'Créez et validez votre cocktail santé avec NutriFYS',
};

export default FysLab;
