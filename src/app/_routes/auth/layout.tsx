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
    <div 
      className="min-h-dvh flex items-center justify-center p-4 relative overflow-hidden"
      style={{
        backgroundImage: "url('https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?q=80&w=1600&auto=format&fit=crop')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {/* Dark overlay to ensure text contrast and add background blur */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />
      
      {/* Glassmorphism card wrapping the Auth contents */}
      <div className="relative z-10 w-full max-w-md bg-black/30 backdrop-blur-lg border border-white/20 p-8 md:p-10 rounded-[2rem] shadow-2xl flex justify-center animate-in fade-in zoom-in-95 duration-500">
        <Outlet />
      </div>
    </div>
  );
};

export default AuthLayout;
