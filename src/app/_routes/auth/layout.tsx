import { useEffect } from 'react';
import { Outlet, LayoutComponent, useNavigate } from 'rasengan';
import { useAuthStore } from '@/stores/auth';

const AuthLayout: LayoutComponent = () => {
  const { user, loading } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) {
      navigate('/');
    }
  }, [user, loading]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Outlet />
    </div>
  );
};

export default AuthLayout;
