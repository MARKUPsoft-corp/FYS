import { useEffect, useState } from 'react';
import { PageComponent, useNavigate } from 'rasengan';
import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { Separator } from '@/components/ui/separator';
import { loginWithEmail, loginWithGoogle, consumeGoogleRedirect } from '@/services/auth';
import { useAuthStore } from '@/stores/auth';
import i18n from '@/i18n';

const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
  </svg>
);

const Login: PageComponent = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { t } = useTranslation();
  const [googleLoading, setGoogleLoading] = useState(false);
  const { user } = useAuthStore();

  // URL de retour (ex: /lab?tab=nutrifys) — posée avant de venir ici
  const redirectPath = typeof window !== 'undefined'
    ? new URLSearchParams(window.location.search).get('redirect')
    : null;

  // Au retour de la redirection Google, useAuthStore s'occupe déjà de
  // consommer le résultat et créer le document Firestore. Il n'est plus
  // nécessaire de le faire ici.

  // Une fois connecté (y compris après le redirect Google), on repart vers la
  // destination prévue.
  useEffect(() => {
    if (user) afterLogin();
  }, [user]);

  function afterLogin() {
    const target = redirectPath?.startsWith('/') ? redirectPath : '/board';
    navigate(target, { replace: true });
  }

  async function handleEmailLogin(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await loginWithEmail(email, password);
      afterLogin();
    } catch (err: unknown) {
      const code = (err as { code?: string }).code;
      if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found') {
        setError(t('auth.login.errors.invalidCredentials'));
      } else {
        setError(t('auth.login.errors.generic'));
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleLogin() {
    setError('');
    setGoogleLoading(true);
    try {
      // POPUP d'abord (retourne l'utilisateur directement) ; si le popup est
      // bloqué, bascule automatiquement sur une redirection vers Google (la
      // page quitte puis revient ; afterLogin() s'exécute via useAuthStore).
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

  return (
    <div className="w-full max-w-sm flex flex-col">
      <div className="text-center mb-10">
        <h1 className="font-display text-4xl font-bold text-primary mb-2">{t('auth.login.title')}</h1>
        <p className="text-white/70">{t('auth.login.subtitle')}</p>
      </div>

      <div className="w-full space-y-6">
        {/* Google */}
        <Button
          type="button"
          className="w-full rounded-full bg-white hover:bg-gray-100 text-[#1A1A2E] font-semibold h-[54px] text-[15px] shadow-md transition-all"
          onClick={handleGoogleLogin}
          disabled={googleLoading || loading}
        >
          {googleLoading ? (
            <Loader2 className="size-5 animate-spin mr-3" />
          ) : (
            <div className="mr-3"><GoogleIcon /></div>
          )}
          {t('auth.login.continueWithGoogle')}
        </Button>

        <div className="flex items-center gap-3 w-full max-w-[80%] mx-auto py-2">
          <Separator className="flex-1 bg-white/10" />
          <span className="text-[11px] text-white/40 uppercase tracking-widest font-bold">{t('auth.login.or')}</span>
          <Separator className="flex-1 bg-white/10" />
        </div>

        {/* Email / password form */}
        <form id="login-form" onSubmit={handleEmailLogin} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-xs font-semibold text-white/80 uppercase tracking-wider ml-1">{t('auth.login.email')}</Label>
            <Input
              id="email"
              type="email"
              placeholder={t('auth.login.emailPlaceholder')}
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="h-[54px] rounded-[16px] bg-white/[0.08] border-white/[0.12] text-white placeholder:text-white/30 focus-visible:ring-[#3F6D4E] px-4"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password" className="text-xs font-semibold text-white/80 uppercase tracking-wider ml-1">{t('auth.login.password')}</Label>
            <Input
              id="password"
              type="password"
              placeholder={t('auth.login.passwordPlaceholder')}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="h-[54px] rounded-[16px] bg-white/[0.08] border-white/[0.12] text-white placeholder:text-white/30 focus-visible:ring-[#3F6D4E] px-4"
            />
          </div>

          {error && (
            <p className="text-sm text-red-400 font-medium text-center">{error}</p>
          )}
        </form>

        <div className="flex flex-col gap-5 pt-2">
          <Button
            type="submit"
            form="login-form"
            className="w-full rounded-full bg-[#3F6D4E] hover:bg-[#32573e] text-white font-semibold h-[54px] text-[15px] shadow-[0_4px_20px_rgba(63,109,78,0.35)] hover:-translate-y-[1px] transition-all"
            disabled={loading || googleLoading}
          >
            {loading && <Loader2 className="size-5 animate-spin mr-3" />}
            {t('auth.login.signIn')}
          </Button>
        </div>
      </div>
    </div>
  );
};

Login.metadata = {
  title: i18n.t('auth.login.pageTitle'),
  description: i18n.t('auth.login.pageDescription'),
};

export default Login;
