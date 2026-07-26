import { createStore } from '@rasenganjs/kurama';

interface AudioState {
  enabled: boolean;
  playing: boolean;
  volume: number;
  toggleEnabled: () => void;
  setVolume: (v: number) => void;
  play: () => void;
  pause: () => void;
  init: () => void;
}

let audioInstance: HTMLAudioElement | null = null;
let initialized = false;

const loadInitialPreferences = () => {
  const defaults = { enabled: true, volume: 0.8 };
  if (typeof window === 'undefined') return defaults;
  try {
    const saved = localStorage.getItem('fys-audio-preference');
    if (saved !== null) {
      return { ...defaults, ...JSON.parse(saved) };
    }
  } catch (e) {}
  return defaults;
};

export const useAudioStore = createStore<AudioState>((set, get) => ({
  enabled: loadInitialPreferences().enabled,
  volume: loadInitialPreferences().volume,
  playing: false,
  
  toggleEnabled: () => {
    const { enabled, volume, play, pause } = get();
    const newState = !enabled;
    set({ enabled: newState });
    
    try {
      localStorage.setItem('fys-audio-preference', JSON.stringify({ enabled: newState, volume }));
    } catch (e) {}
    
    if (newState) {
      play();
    } else {
      pause();
    }
  },

  setVolume: (v: number) => {
    set({ volume: v });
    const { enabled } = get();
    if (audioInstance) {
      audioInstance.volume = v;
    }
    try {
      localStorage.setItem('fys-audio-preference', JSON.stringify({ enabled, volume: v }));
    } catch (e) {}
  },
  
  play: () => {
    if (!get().enabled) return;
    if (!audioInstance) {
      audioInstance = new Audio('/music/ambient.mp3?v=3');
      audioInstance.loop = true;
      audioInstance.addEventListener('pause', () => set({ playing: false }));
      audioInstance.addEventListener('play', () => set({ playing: true }));
    }
    audioInstance.volume = get().volume;
    audioInstance.play().then(() => {
      set({ playing: true });
    }).catch((e) => {
      console.warn('[FYS Audio] Autoplay prevented:', e);
    });
  },
  
  pause: () => {
    if (audioInstance) {
      audioInstance.pause();
    }
    set({ playing: false });
  },
  
  init: () => {
    if (initialized) return;
    initialized = true;

    const handleInteraction = () => {
      if (get().enabled && !get().playing) {
        get().play();
      }
    };
    
    if (typeof document !== 'undefined') {
      document.addEventListener('click', handleInteraction);
      document.addEventListener('pointerdown', handleInteraction);
      document.addEventListener('keydown', handleInteraction);
    }
  }
}));
