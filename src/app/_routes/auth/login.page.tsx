import { useEffect, useState } from 'react';
import { PageComponent, useNavigate } from 'rasengan';
import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { loginWithGoogle, loginWithApple } from '@/services/auth';
import { useAuthStore } from '@/stores/auth';
import i18n from '@/i18n';

const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" className="size-5" aria-hidden="true">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
  </svg>
);

const AppleIcon = () => (
  <svg viewBox="0 0 24 24" className="size-5 fill-current" aria-hidden="true">
    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.37c.63-.78 1.06-1.85.94-2.94-.92.04-2.02.63-2.67 1.39-.58.67-1.09 1.77-.95 2.83 1.03.08 2.05-.5 2.68-1.28z" />
  </svg>
);

const Login: PageComponent = () => {
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [googleLoading, setGoogleLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);
  const { t } = useTranslation();
  const { user } = useAuthStore();

  // URL de retour (ex: /lab?tab=nutrifys) — posée avant de venir ici
  const redirectPath = typeof window !== 'undefined'
    ? new URLSearchParams(window.location.search).get('redirect')
    : null;

  // Une fois connecté (y compris après le redirect Google/Apple), on repart vers la destination prévue.
  useEffect(() => {
    if (user) afterLogin();
  }, [user]);

  function afterLogin() {
    const target = redirectPath?.startsWith('/') ? redirectPath : '/board';
    navigate(target, { replace: true });
  }

  async function handleGoogleLogin() {
    setError('');
    setGoogleLoading(true);
    try {
      const googleUser = await loginWithGoogle();
      if (googleUser) {
        afterLogin();
      } else {
        setGoogleLoading(false);
      }
    } catch (err: unknown) {
      const code = (err as { code?: string }).code;
      setError(
        code === 'auth/popup-closed-by-user'
          ? t('auth.login.errors.googleCanceled')
          : t('auth.login.errors.googleFailed'),
      );
      setGoogleLoading(false);
    }
  }

  async function handleAppleLogin() {
    setError('');
    setAppleLoading(true);
    try {
      const appleUser = await loginWithApple();
      if (appleUser) {
        afterLogin();
      } else {
        setAppleLoading(false);
      }
    } catch (err: unknown) {
      const code = (err as { code?: string }).code;
      setError(
        code === 'auth/popup-closed-by-user'
          ? t('auth.login.errors.appleCanceled')
          : t('auth.login.errors.appleFailed'),
      );
      setAppleLoading(false);
    }
  }

  const isPending = googleLoading || appleLoading;

  return (
    <div className="w-full max-w-sm flex flex-col py-2">
      <div className="text-center mb-8">
        <h1 className="font-display text-4xl font-bold text-primary mb-2.5">
          {t('auth.login.title')}
        </h1>
        <p className="text-white/70 text-[15px] leading-relaxed">
          {t('auth.login.subtitle')}
        </p>
      </div>

      <div className="w-full space-y-4">
        {/* Google */}
        <Button
          type="button"
          className="w-full rounded-full bg-white hover:bg-gray-100 text-[#1A1A2E] font-semibold h-[54px] text-[15px] shadow-md transition-all flex items-center justify-center cursor-pointer active:scale-[0.99]"
          onClick={handleGoogleLogin}
          disabled={isPending}
        >
          {googleLoading ? (
            <Loader2 className="size-5 animate-spin mr-3 text-zinc-700" />
          ) : (
            <div className="mr-3 flex items-center justify-center">
              <GoogleIcon />
            </div>
          )}
          {t('auth.login.continueWithGoogle')}
        </Button>

        {/* Apple */}
        <Button
          type="button"
          className="w-full rounded-full bg-black hover:bg-zinc-900 border border-white/25 text-white font-semibold h-[54px] text-[15px] shadow-md transition-all flex items-center justify-center cursor-pointer active:scale-[0.99]"
          onClick={handleAppleLogin}
          disabled={isPending}
        >
          {appleLoading ? (
            <Loader2 className="size-5 animate-spin mr-3 text-white" />
          ) : (
            <div className="mr-3 flex items-center justify-center">
              <AppleIcon />
            </div>
          )}
          {t('auth.login.continueWithApple')}
        </Button>

        {error && (
          <p className="text-sm text-red-400 font-medium text-center pt-2">
            {error}
          </p>
        )}
      </div>
    </div>
  );
};

Login.metadata = {
  title: i18n.t('auth.login.pageTitle'),
  description: i18n.t('auth.login.pageDescription'),
};

export default Login;
