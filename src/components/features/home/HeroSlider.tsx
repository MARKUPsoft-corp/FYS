import { Link } from 'rasengan';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { getHeroSlides } from '@/services/settings';
import { DEFAULT_HERO_SLIDES, type HeroSlide } from '@/entities';

const SWIPE_THRESHOLD = 50;

export function HeroSlider() {
  const { data: slides = DEFAULT_HERO_SLIDES } = useQuery({
    queryKey: ['hero-slides'],
    queryFn: getHeroSlides,
    staleTime: 60_000,
  });

  const [active, setActive] = useState(0);
  const touchStartX = useRef<number | null>(null);
  const pauseAutoplay = useRef(false);

  const count = slides.length;
  const safeActive = count > 0 ? active % count : 0;

  useEffect(() => {
    if (count === 0) return;
    setActive((p) => p % count);
  }, [count]);

  const go = useCallback(
    (dir: 1 | -1) => {
      if (count === 0) return;
      setActive((p) => (p + dir + count) % count);
    },
    [count],
  );

  useEffect(() => {
    if (count <= 1) return;
    const t = setInterval(() => {
      if (!pauseAutoplay.current) go(1);
    }, 5000);
    return () => clearInterval(t);
  }, [count, go]);

  function onTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
    pauseAutoplay.current = true;
  }

  function onTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current == null) return;
    const delta = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(delta) >= SWIPE_THRESHOLD) {
      go(delta < 0 ? 1 : -1);
    }
    setTimeout(() => {
      pauseAutoplay.current = false;
    }, 4000);
  }

  if (count === 0) return null;

  const slide: HeroSlide = slides[safeActive];

  return (
    <section
      className="relative z-0 w-full h-[420px] rounded-b-[3rem] shadow-[0_20px_50px_rgba(63,109,78,0.25)] touch-pan-y select-none overflow-hidden"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <div
        key={slide.id}
        className="absolute inset-0 bg-cover bg-center overflow-hidden rounded-b-[3rem] transition-all duration-700"
        style={{ backgroundImage: `url('${slide.imageUrl}')` }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-black/80 via-black/50 to-black/20" />
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-primary/40 rounded-full blur-3xl pointer-events-none" />
      </div>

      <div className="relative z-30 flex flex-col h-[420px] justify-center px-4 pointer-events-none">
        <p className="text-white/80 text-xs mb-2 font-bold uppercase tracking-[0.2em] drop-shadow-md">
          {slide.label}
        </p>
        <h1 className="font-display font-extrabold text-5xl md:text-6xl text-white leading-[1.05] mb-2 drop-shadow-lg">
          {slide.title}
        </h1>
        <h1 className="font-display font-extrabold text-5xl md:text-6xl leading-[1.05] mb-6 drop-shadow-lg">
          <span className="text-secondary italic">{slide.highlight}</span>{' '}
          <span className="text-white">{slide.titleEnd}</span>
        </h1>

        <div className="pointer-events-auto">
          <Button
            asChild
            size="lg"
            className="w-max rounded-full bg-white text-primary hover:bg-stone-50 hover:scale-105 active:scale-95 transition-transform shadow-[0_8px_30px_rgba(255,255,255,0.25)] font-bold px-8 h-12"
          >
            <Link to={slide.ctaLink}>{slide.cta}</Link>
          </Button>
        </div>

        <div className="flex gap-2 mt-8 pointer-events-auto">
          {slides.map((s, i) => (
            <button
              key={s.id}
              type="button"
              onClick={() => {
                setActive(i);
                pauseAutoplay.current = true;
                setTimeout(() => {
                  pauseAutoplay.current = false;
                }, 4000);
              }}
              aria-label={`Slide ${i + 1}`}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === safeActive ? 'w-6 bg-white' : 'w-1.5 bg-white/40'
              }`}
            />
          ))}
        </div>
      </div>

      {slide.breakoutImageUrl && (
        <div className="absolute -bottom-12 -right-2 w-44 h-60 z-20 pointer-events-none drop-shadow-2xl opacity-95 md:w-64 md:h-96 md:-right-4 md:-bottom-20">
          <div
            key={`breakout-${slide.id}`}
            className="w-full h-full bg-cover bg-center rounded-[2rem] border-4 border-white/40 shadow-2xl rotate-[-8deg] transition-all duration-700"
            style={{ backgroundImage: `url('${slide.breakoutImageUrl}')` }}
          />
        </div>
      )}
    </section>
  );
}
