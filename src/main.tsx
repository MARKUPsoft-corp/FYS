import '@rasenganjs/kage-demo/css';
import '@rasenganjs/image/css';
import '@/styles/index.css';
import '@/i18n';
import { useEffect } from 'react';
import { type AppProps } from 'rasengan';
import ThemeProvider, { useTheme } from '@rasenganjs/theme';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TooltipProvider } from '@/components/ui/tooltip';
import { useAuthStore } from '@/stores/auth';
import { useAudioStore } from '@/stores/audio';

const queryClient = new QueryClient();

function ThemeWatcher() {
  const { actualTheme } = useTheme();

  useEffect(() => {
    const root = document.documentElement;
    let themeMeta = document.querySelector('meta[name="theme-color"]');
    
    if (!themeMeta) {
      themeMeta = document.createElement('meta');
      themeMeta.setAttribute('name', 'theme-color');
      document.head.appendChild(themeMeta);
    }

    if (actualTheme === 'dark') {
      root.classList.add('dark');
      themeMeta.setAttribute('content', '#1A1F1B');
    } else {
      root.classList.remove('dark');
      themeMeta.setAttribute('content', '#FDFBF7');
    }
  }, [actualTheme]);

  return null;
}

export default function App({ Component, children }: AppProps) {
  const initAuth = useAuthStore((s) => s.init);
  const initAudio = useAudioStore((s) => s.init);

  useEffect(() => {
    const unsubscribe = initAuth();
    initAudio();

    // Fix global pour le clavier mobile sur tous les champs de saisie
    const handleFocusIn = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        setTimeout(() => {
          target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 300);
      }
    };

    document.addEventListener('focusin', handleFocusIn);

    return () => {
      unsubscribe();
      document.removeEventListener('focusin', handleFocusIn);
    };
  }, []);


  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <ThemeWatcher />
        <TooltipProvider delayDuration={200}>
          <Component>{children}</Component>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
