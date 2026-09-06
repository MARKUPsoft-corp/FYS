import { useState, useEffect } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

declare global {
  interface Window {
    __pwa_deferred_prompt?: BeforeInstallPromptEvent | null;
  }
}

// Capture early before React mounts
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    window.__pwa_deferred_prompt = e as BeforeInstallPromptEvent;
  });
}

export function isRunningStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window.navigator as any).standalone === true ||
    document.referrer.includes('android-app://')
  );
}

export function isIOSSafari(): boolean {
  if (typeof window === 'undefined') return false;
  const ua = window.navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
  const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|OPiOS|mercury/i.test(ua);
  return isIOS && isSafari;
}

const STORAGE_KEY = 'fys_pwa_installed';
const DISMISSED_KEY = 'fys_pwa_dismissed';

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(() => {
    if (typeof window !== 'undefined') {
      return window.__pwa_deferred_prompt ?? null;
    }
    return null;
  });
  const [isStandalone, setIsStandalone] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSModal, setShowIOSModal] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const standalone = isRunningStandalone();
    setIsStandalone(standalone);

    const installed = localStorage.getItem(STORAGE_KEY) === 'true';
    setIsInstalled(installed);

    const dismissed = sessionStorage.getItem(DISMISSED_KEY) === 'true';
    setIsDismissed(dismissed);

    const ios = isIOSSafari();
    setIsIOS(ios);

    // If already in standalone or marked installed: do not listen
    if (standalone || installed) return;

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const promptEvent = e as BeforeInstallPromptEvent;
      window.__pwa_deferred_prompt = promptEvent;
      setDeferredPrompt(promptEvent);
    };

    const handleAppInstalled = () => {
      try {
        localStorage.setItem(STORAGE_KEY, 'true');
      } catch {}
      setIsInstalled(true);
      setDeferredPrompt(null);
      window.__pwa_deferred_prompt = null;
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    const mql = window.matchMedia('(display-mode: standalone)');
    const handleMqlChange = (e: MediaQueryListEvent) => {
      if (e.matches) {
        try {
          localStorage.setItem(STORAGE_KEY, 'true');
        } catch {}
        setIsStandalone(true);
        setIsInstalled(true);
      }
    };
    mql.addEventListener('change', handleMqlChange);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      mql.removeEventListener('change', handleMqlChange);
    };
  }, []);

  const install = async () => {
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        if (choice.outcome === 'accepted') {
          localStorage.setItem(STORAGE_KEY, 'true');
          setIsInstalled(true);
        }
      } catch (err) {
        console.error('Error during PWA install:', err);
      } finally {
        setDeferredPrompt(null);
        window.__pwa_deferred_prompt = null;
      }
    } else if (isIOS) {
      setShowIOSModal(true);
    }
  };

  const dismiss = () => {
    try {
      sessionStorage.setItem(DISMISSED_KEY, 'true');
    } catch {}
    setIsDismissed(true);
  };

  const shouldShow =
    !isStandalone &&
    !isInstalled &&
    !isDismissed &&
    (deferredPrompt !== null || isIOS);

  return {
    canInstall: shouldShow,
    isIOS,
    showIOSModal,
    setShowIOSModal,
    install,
    dismiss,
  };
}
