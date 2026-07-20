import { useEffect } from 'react';
import { Outlet, LayoutComponent, useNavigate } from 'rasengan';
import { useAuthStore } from '@/stores/auth';

const AuthLayout: LayoutComponent = () => {
  const { user, loading } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) {
      navigate('/board', { replace: true });
    }
  }, [user, loading]);

  return (
    <div className="min-h-screen bg-[#1a1f1b] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Glow top left */}
      <div 
        className="absolute -top-[80px] -left-[80px] w-[320px] h-[320px] pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(63,109,78,.45) 0%, transparent 70%)' }}
      />
      {/* Glow bottom right */}
      <div 
        className="absolute -bottom-[60px] -right-[60px] w-[260px] h-[260px] pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(242,105,74,.15) 0%, transparent 70%)' }}
      />
      
      <div className="relative z-10 w-full flex justify-center">
        <Outlet />
      </div>
    </div>
  );
};

export default AuthLayout;
