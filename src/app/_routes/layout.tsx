import React, { useEffect } from 'react';
import { Outlet, LayoutComponent, useNavigate, useLocation } from 'rasengan';
import { useAuthStore } from '@/stores/auth';
import { Loader2 } from 'lucide-react';

const AppLayout: LayoutComponent = () => {
  const { user, loading } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  const isAuthRoute = location.pathname.startsWith('/auth');

  useEffect(() => {
    if (!loading && !user && !isAuthRoute) {
      navigate('/auth/login');
    }
  }, [user, loading, isAuthRoute]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <React.Fragment>
      <Outlet />
    </React.Fragment>
  );
};

export default AppLayout;
