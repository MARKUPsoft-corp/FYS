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

    if (actualTheme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
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
    return unsubscribe;
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
