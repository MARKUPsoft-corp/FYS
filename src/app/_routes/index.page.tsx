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
    <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-8 animate-in fade-in zoom-in-95 duration-1000">
      <div className="relative">
        <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full scale-150 animate-pulse" />
        <div className="relative size-20 rounded-[1.5rem] bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-xl shadow-primary/30 animate-bounce">
          <span className="font-display font-extrabold text-white text-4xl tracking-tight">F</span>
        </div>
      </div>
      <div className="flex items-center gap-1.5 opacity-80">
        <div className="size-2 rounded-full bg-primary animate-ping" />
        <span className="text-sm font-semibold text-muted-foreground tracking-widest uppercase">Chargement</span>
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
