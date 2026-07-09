import { useState } from 'react';
import { PageComponent, useNavigate, Link } from 'rasengan';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { Separator } from '@/components/ui/separator';
import { loginWithEmail, loginWithGoogle } from '@/services/auth';

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
  const [googleLoading, setGoogleLoading] = useState(false);

  async function handleEmailLogin(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await loginWithEmail(email, password);
      navigate('/');
    } catch (err: unknown) {
      const code = (err as { code?: string }).code;
      if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found') {
        setError('Email ou mot de passe incorrect.');
      } else {
        setError('Une erreur est survenue. Réessaie.');
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleLogin() {
    setError('');
    setGoogleLoading(true);
    try {
      await loginWithGoogle();
      navigate('/');
    } catch {
      setError('Connexion Google annulée ou impossible.');
    } finally {
      setGoogleLoading(false);
    }
  }

  return (
    <div className="w-full max-w-sm flex flex-col">
      <div className="text-center mb-10">
        <h1 className="font-display text-4xl font-bold text-white mb-2">Connexion</h1>
        <p className="text-white/70">Retrouve tes jus et ton profil santé.</p>
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
          Continuer avec Google
        </Button>

        <div className="flex items-center gap-3 w-full max-w-[80%] mx-auto py-2">
          <Separator className="flex-1 bg-white/10" />
          <span className="text-[11px] text-white/40 uppercase tracking-widest font-bold">ou</span>
          <Separator className="flex-1 bg-white/10" />
        </div>

        {/* Email / password form */}
        <form id="login-form" onSubmit={handleEmailLogin} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-xs font-semibold text-white/80 uppercase tracking-wider ml-1">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="exemple@fys.fr"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="h-[54px] rounded-[16px] bg-white/[0.08] border-white/[0.12] text-white placeholder:text-white/30 focus-visible:ring-[#2D7A3A] px-4"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password" className="text-xs font-semibold text-white/80 uppercase tracking-wider ml-1">Mot de passe</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="h-[54px] rounded-[16px] bg-white/[0.08] border-white/[0.12] text-white placeholder:text-white/30 focus-visible:ring-[#2D7A3A] px-4"
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
            className="w-full rounded-full bg-[#2D7A3A] hover:bg-[#23632e] text-white font-semibold h-[54px] text-[15px] shadow-[0_4px_20px_rgba(45,122,58,0.35)] hover:-translate-y-[1px] transition-all"
            disabled={loading || googleLoading}
          >
            {loading && <Loader2 className="size-5 animate-spin mr-3" />}
            Se connecter
          </Button>
          <p className="text-sm text-white/60 text-center">
            Pas encore de compte ?{' '}
            <Link to="/auth/register" className="text-white font-bold hover:underline">
              Créer un compte
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

Login.metadata = {
  title: 'FYS — Connexion',
  description: 'Connecte-toi à ton espace FYS.',
};

export default Login;
