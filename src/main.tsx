import '@rasenganjs/image/css';
import '@/styles/index.css';
import { useEffect } from 'react';
import { type AppProps } from 'rasengan';
import ThemeProvider, { useTheme } from '@rasenganjs/theme';
import { TooltipProvider } from '@/components/ui/tooltip';
import { useAuthStore } from '@/stores/auth';

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
  const init = useAuthStore((s) => s.init);

  useEffect(() => {
    const unsubscribe = init();
    return unsubscribe;
  }, []);

  return (
    <ThemeProvider>
      <ThemeWatcher />
      <TooltipProvider delayDuration={200}>
        <Component>{children}</Component>
      </TooltipProvider>
    </ThemeProvider>
  );
}
