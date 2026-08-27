import { PageComponent, useNavigate } from 'rasengan';
import { useEffect } from 'react';
import { useAuthStore } from '@/stores/auth';

const RootIndex: PageComponent = () => {
  const { loading } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading) {
      // Prevent redirecting search engine bots so they can index the homepage and show sitelinks
      const isBot = /bot|googlebot|crawler|spider|robot|crawling|bingbot/i.test(navigator.userAgent);
      if (!isBot) {
        navigate('/board', { replace: true });
      }
    }
  }, [loading, navigate]);

  return (
    <div className="min-h-dvh bg-background flex flex-col items-center justify-center gap-8 animate-in fade-in duration-700">
      {/* Orbital FYS Logo */}
      <style>{`
        @keyframes orbit {
          from { transform: rotate(0deg) translateX(44px) rotate(0deg); }
          to   { transform: rotate(360deg) translateX(44px) rotate(-360deg); }
        }
        .fys-orbit-dot {
          animation: orbit 2s linear infinite;
        }
        @keyframes fys-logo-pulse {
          0%, 100% { transform: scale(1); }
          50%       { transform: scale(1.04); }
        }
        .fys-logo-text { animation: fys-logo-pulse 2s ease-in-out infinite; }
      `}</style>
      <div className="relative flex items-center justify-center" style={{ width: 120, height: 120 }}>
        {/* Glow halo */}
        <div className="absolute inset-0 bg-primary/15 blur-2xl rounded-full scale-125" />
        {/* FYS logo */}
        <div className="fys-logo-text relative z-10 flex items-center justify-center">
          <img src="/logos/fys_logo.png" alt="FYS Logo" className="w-24 h-auto object-contain" />
        </div>
      </div>
      {/* Loading indicator */}
      <div className="flex items-center gap-2 opacity-70">
        <div className="size-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0ms' }} />
        <div className="size-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: '150ms' }} />
        <div className="size-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
    </div>
  );
};

RootIndex.path = '/';
RootIndex.metadata = {
  title: 'FYS — Cocktails Santé Personnalisés par IA',
  description: "FYS (For Your Self) crée pour vous des cocktails de fruits sur mesure, analysés et validés par l'intelligence artificielle NutriFYS en fonction de votre santé.",
};

export default RootIndex;
