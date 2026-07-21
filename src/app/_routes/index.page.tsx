import { PageComponent, useNavigate } from 'rasengan';
import { useEffect } from 'react';
import { useAuthStore } from '@/stores/auth';

const RootIndex: PageComponent = () => {
  const { user, loading } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading) {
      if (user) navigate('/board', { replace: true });
      else navigate('/auth/login', { replace: true });
    }
  }, [user, loading, navigate]);

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
        {/* FYS wordmark */}
        <div className="fys-logo-text relative z-10 flex items-end justify-center gap-0.5">
          <span className="font-display font-extrabold text-primary text-5xl leading-none tracking-tight">FYS</span>
          <span className="size-2.5 rounded-full bg-secondary mb-0.5 shrink-0 fys-orbit-dot absolute" />
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
  title: 'FYS',
  description: 'FYS — Pour votre santé.',
};

export default RootIndex;
