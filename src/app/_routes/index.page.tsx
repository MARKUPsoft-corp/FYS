import { PageComponent, useNavigate } from 'rasengan';
import { useEffect } from 'react';
import { useAuthStore } from '@/stores/auth';
import { Loader2 } from 'lucide-react';

const RootIndex: PageComponent = () => {
  const { user, loading } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading) {
      if (user) navigate('/board');
      else navigate('/auth/login');
    }
  }, [user, loading, navigate]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <Loader2 className="size-8 animate-spin text-primary" />
    </div>
  );
};

RootIndex.path = '/';
RootIndex.metadata = {
  title: 'FYS',
  description: 'FYS — Pour votre santé.',
};

export default RootIndex;
