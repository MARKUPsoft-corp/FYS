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
    <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-6">
      <div className="size-16 rounded-3xl bg-muted animate-pulse" />
      <div className="w-32 h-4 rounded-full bg-muted animate-pulse" />
    </div>
  );
};

RootIndex.path = '/';
RootIndex.metadata = {
  title: 'FYS',
  description: 'FYS — Pour votre santé.',
};

export default RootIndex;
