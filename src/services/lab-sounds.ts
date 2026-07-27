/**
 * FYS Lab Sound Effects
 * 
 * Sons liquides et aquatiques pour le Lab :
 * - Sélection de fruit : "plonk" dans l'eau
 * - Analyse NutriFYS : Eau qui coule et se mélange continuellement
 */

// ── Audio Context Singleton ──────────────────────────────────────────────────

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return audioCtx;
}

// ── 1a. Fruit Selection Sound (Plonk dans l'eau) ─────────────────────────────

/**
 * Son de sélection de fruit : "Plonk" d'eau, comme un fruit qui tombe dans le jus
 * Durée : ~300ms
 * Effet : Éclaboussure douce et liquide
 */
export function playFruitSelectSound() {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    
    // Créer un "plonk" d'eau avec un sweep de fréquence descendant
    const plonk = ctx.createOscillator();
    const plonkGain = ctx.createGain();
    const plonkFilter = ctx.createBiquadFilter();
    
    plonk.type = 'sine';
    plonk.frequency.setValueAtTime(400, now);
    plonk.frequency.exponentialRampToValueAtTime(120, now + 0.25);
    
    plonkFilter.type = 'lowpass';
    plonkFilter.frequency.setValueAtTime(1200, now);
    plonkFilter.frequency.exponentialRampToValueAtTime(300, now + 0.25);
    plonkFilter.Q.value = 2;
    
    plonk.connect(plonkFilter);
    plonkFilter.connect(plonkGain);
    plonkGain.connect(ctx.destination);
    
    // Envelope avec volume augmenté
    plonkGain.gain.setValueAtTime(0, now);
    plonkGain.gain.linearRampToValueAtTime(0.36, now + 0.01); // Volume augmenté (x7.2)
    plonkGain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    
    plonk.start(now);
    plonk.stop(now + 0.3);
    
    // Petites bulles d'éclaboussure (très subtiles)
    [0.05, 0.12].forEach((offset) => {
      const bubble = ctx.createOscillator();
      const bubbleGain = ctx.createGain();
      
      bubble.type = 'sine';
      const freq = 600 + Math.random() * 200;
      bubble.frequency.setValueAtTime(freq, now + offset);
      bubble.frequency.exponentialRampToValueAtTime(freq * 0.7, now + offset + 0.08);
      
      bubble.connect(bubbleGain);
      bubbleGain.connect(ctx.destination);
      
      bubbleGain.gain.setValueAtTime(0, now + offset);
      bubbleGain.gain.linearRampToValueAtTime(0.16, now + offset + 0.01); // Volume augmenté (x8)
      bubbleGain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.08);
      
      bubble.start(now + offset);
      bubble.stop(now + offset + 0.08);
    });
    
  } catch (err) {
    console.warn('[FYS Lab Sounds] playFruitSelectSound failed:', err);
  }
}

// ── 1b. Fruit Deselection Sound (Éclaboussure sortante) ──────────────────────

/**
 * Son de déselection de fruit : Éclaboussure légère, eau qui sort
 * Durée : ~200ms
 * Effet : Inverse du plonk, plus court et ascendant
 */
export function playFruitDeselectSound() {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    
    // Sweep ascendant (inverse du plonk)
    const splash = ctx.createOscillator();
    const splashGain = ctx.createGain();
    const splashFilter = ctx.createBiquadFilter();
    
    splash.type = 'sine';
    splash.frequency.setValueAtTime(150, now);
    splash.frequency.exponentialRampToValueAtTime(350, now + 0.18);
    
    splashFilter.type = 'highpass';
    splashFilter.frequency.setValueAtTime(200, now);
    splashFilter.frequency.exponentialRampToValueAtTime(600, now + 0.18);
    splashFilter.Q.value = 2;
    
    splash.connect(splashFilter);
    splashFilter.connect(splashGain);
    splashGain.connect(ctx.destination);
    
    splashGain.gain.setValueAtTime(0, now);
    splashGain.gain.linearRampToValueAtTime(0.24, now + 0.01); // Volume augmenté (x8)
    splashGain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
    
    splash.start(now);
    splash.stop(now + 0.18);
    
  } catch (err) {
    console.warn('[FYS Lab Sounds] playFruitDeselectSound failed:', err);
  }
}

// ── 2. Analysis Start Sound (Début du mélange) ───────────────────────────────

/**
 * Son de démarrage d'analyse : Liquide qui commence à tourbillonner
 * Durée : ~600ms
 * Effet : Liquide qu'on verse et qui commence à se mélanger
 */
export function playAnalysisStartSound() {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    
    // Effet de versement (noise filtré qui descend)
    const bufferSize = ctx.sampleRate;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    
    // Pink noise (plus doux que white noise)
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      output[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
      output[i] *= 0.11;
      b6 = white * 0.115926;
    }
    
    const pour = ctx.createBufferSource();
    pour.buffer = noiseBuffer;
    
    const pourFilter = ctx.createBiquadFilter();
    pourFilter.type = 'bandpass';
    pourFilter.frequency.setValueAtTime(600, now);
    pourFilter.frequency.exponentialRampToValueAtTime(200, now + 0.6);
    pourFilter.Q.value = 3;
    
    const pourGain = ctx.createGain();
    pour.connect(pourFilter);
    pourFilter.connect(pourGain);
    pourGain.connect(ctx.destination);
    
    pourGain.gain.setValueAtTime(0, now);
    pourGain.gain.linearRampToValueAtTime(0.32, now + 0.1); // Volume augmenté (x8)
    pourGain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
    
    pour.start(now);
    pour.stop(now + 0.6);
    
  } catch (err) {
    console.warn('[FYS Lab Sounds] playAnalysisStartSound failed:', err);
  }
}

// ── 3. Analysis Ambient Loop (Eau qui coule continuellement) ─────────────────

let ambientLoopInterval: number | null = null;
let ambientSources: AudioBufferSourceNode[] = [];
let ambientGains: GainNode[] = [];
let ambientPausedVolume: number | null = null; // Volume avant pause

/**
 * Son d'arrière-plan pendant l'analyse : Eau qui coule et se mélange continuellement
 * Durée : Continue jusqu'à stopAnalysisAmbient()
 * Effet : Eau versée dans un récipient, liquide en mouvement constant
 */
export function playAnalysisAmbient() {
  try {
    // Clear any existing loop
    if (ambientLoopInterval) stopAnalysisAmbient();
    
    const ctx = getAudioContext();
    const startTime = ctx.currentTime;
    
    // ── Continuous water flow (brown noise + modulation) ──
    const bufferSize = 2 * ctx.sampleRate; // 2 seconds loop
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    
    // Brown noise (eau profonde) avec variation organique
    let lastOut = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      output[i] = (lastOut + (0.025 * white)) / 1.025;
      lastOut = output[i];
      // Ajouter variation pour simuler turbulence de l'eau
      output[i] *= (2.5 + Math.sin(i / 500) * 0.5);
    }
    
    const flow = ctx.createBufferSource();
    flow.buffer = noiseBuffer;
    flow.loop = true; // Loop continu
    
    const flowFilter = ctx.createBiquadFilter();
    flowFilter.type = 'bandpass';
    flowFilter.frequency.value = 400; // Fréquence médiane pour eau qui coule
    flowFilter.Q.value = 2;
    
    const flowGain = ctx.createGain();
    flow.connect(flowFilter);
    flowFilter.connect(flowGain);
    flowGain.connect(ctx.destination);
    
    // Volume constant mais audible
    flowGain.gain.setValueAtTime(0, startTime);
    flowGain.gain.linearRampToValueAtTime(0.28, startTime + 0.5); // Volume augmenté (x7)
    
    flow.start(startTime);
    ambientSources.push(flow);
    ambientGains.push(flowGain);
    
    // ── Modulation de filtre (mouvement de l'eau) ──
    function modulateFlow() {
      if (ambientGains.length === 0) return;
      
      const now = ctx.currentTime;
      const targetFreq = 350 + Math.random() * 150; // Varie la tonalité
      const duration = 1.5 + Math.random() * 1;
      
      flowFilter.frequency.cancelScheduledValues(now);
      flowFilter.frequency.setValueAtTime(flowFilter.frequency.value, now);
      flowFilter.frequency.exponentialRampToValueAtTime(targetFreq, now + duration);
      
      ambientLoopInterval = window.setTimeout(modulateFlow, duration * 1000);
    }
    
    modulateFlow();
    
    // ── Bulles d'éclaboussure occasionnelles ──
    function spawnSplash() {
      if (ambientGains.length === 0) return;
      
      const splash = ctx.createOscillator();
      const splashGain = ctx.createGain();
      const splashFilter = ctx.createBiquadFilter();
      
      splash.type = 'sine';
      const freq = 250 + Math.random() * 200;
      splash.frequency.setValueAtTime(freq, ctx.currentTime);
      splash.frequency.exponentialRampToValueAtTime(freq * 0.5, ctx.currentTime + 0.8);
      
      splashFilter.type = 'lowpass';
      splashFilter.frequency.value = 600;
      splashFilter.Q.value = 3;
      
      splash.connect(splashFilter);
      splashFilter.connect(splashGain);
      splashGain.connect(ctx.destination);
      
      splashGain.gain.setValueAtTime(0, ctx.currentTime);
      splashGain.gain.linearRampToValueAtTime(0.14, ctx.currentTime + 0.1); // Volume augmenté (x8)
      splashGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
      
      splash.start(ctx.currentTime);
      splash.stop(ctx.currentTime + 0.8);
      
      // Prochaine éclaboussure
      const nextDelay = 1500 + Math.random() * 2500;
      setTimeout(spawnSplash, nextDelay);
    }
    
    spawnSplash();
    
  } catch (err) {
    console.warn('[FYS Lab Sounds] playAnalysisAmbient failed:', err);
  }
}

/**
 * Arrête le son d'ambiance d'analyse
 */
export function stopAnalysisAmbient() {
  if (ambientLoopInterval) {
    window.clearTimeout(ambientLoopInterval);
    ambientLoopInterval = null;
  }
  
  // Stop all sources
  ambientSources.forEach((source) => {
    try {
      source.stop();
    } catch (e) {
      // Already stopped
    }
  });
  
  // Fade out gains
  ambientGains.forEach((gain) => {
    try {
      const ctx = getAudioContext();
      gain.gain.cancelScheduledValues(ctx.currentTime);
      gain.gain.setValueAtTime(gain.gain.value, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    } catch (e) {
      // Context might be unavailable
    }
  });
  
  ambientSources = [];
  ambientGains = [];
  ambientPausedVolume = null;
}

/**
 * Met en pause le son d'ambiance (quand l'utilisateur change d'onglet)
 */
function pauseAnalysisAmbient() {
  if (ambientGains.length === 0 || ambientPausedVolume !== null) return;
  
  try {
    const ctx = getAudioContext();
    const currentGain = ambientGains[0];
    ambientPausedVolume = currentGain.gain.value;
    
    // Fade out rapide
    currentGain.gain.cancelScheduledValues(ctx.currentTime);
    currentGain.gain.setValueAtTime(currentGain.gain.value, ctx.currentTime);
    currentGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
  } catch (e) {
    console.warn('[FYS Lab Sounds] pauseAnalysisAmbient failed:', e);
  }
}

/**
 * Reprend le son d'ambiance (quand l'utilisateur revient sur l'onglet)
 */
function resumeAnalysisAmbient() {
  if (ambientGains.length === 0 || ambientPausedVolume === null) return;
  
  try {
    const ctx = getAudioContext();
    const currentGain = ambientGains[0];
    const targetVolume = ambientPausedVolume;
    ambientPausedVolume = null;
    
    // Fade in doux
    currentGain.gain.cancelScheduledValues(ctx.currentTime);
    currentGain.gain.setValueAtTime(0.001, ctx.currentTime);
    currentGain.gain.linearRampToValueAtTime(targetVolume, ctx.currentTime + 0.5);
  } catch (e) {
    console.warn('[FYS Lab Sounds] resumeAnalysisAmbient failed:', e);
  }
}

// ── 4. Analysis Complete Sound (Fin douce du mélange) ────────────────────────

/**
 * Son de fin d'analyse : Liquide qui se stabilise doucement
 * Durée : ~800ms
 * Effet : Le mélange s'apaise, comme de l'eau qui se calme
 */
export function playAnalysisCompleteSound() {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    
    // Stop ambient loop
    stopAnalysisAmbient();
    
    // Son de stabilisation (sweep doux descendant)
    const settle = ctx.createOscillator();
    const settleGain = ctx.createGain();
    const settleFilter = ctx.createBiquadFilter();
    
    settle.type = 'sine';
    settle.frequency.setValueAtTime(300, now);
    settle.frequency.exponentialRampToValueAtTime(150, now + 0.8);
    
    settleFilter.type = 'lowpass';
    settleFilter.frequency.setValueAtTime(600, now);
    settleFilter.frequency.exponentialRampToValueAtTime(200, now + 0.8);
    settleFilter.Q.value = 3;
    
    settle.connect(settleFilter);
    settleFilter.connect(settleGain);
    settleGain.connect(ctx.destination);
    
    settleGain.gain.setValueAtTime(0, now);
    settleGain.gain.linearRampToValueAtTime(0.28, now + 0.1); // Volume augmenté (x7)
    settleGain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
    
    settle.start(now);
    settle.stop(now + 0.8);
    
    // Dernière bulle qui remonte (très subtile)
    const finalBubble = ctx.createOscillator();
    const finalBubbleGain = ctx.createGain();
    
    finalBubble.type = 'sine';
    finalBubble.frequency.setValueAtTime(200, now + 0.2);
    finalBubble.frequency.exponentialRampToValueAtTime(400, now + 0.6);
    
    finalBubble.connect(finalBubbleGain);
    finalBubbleGain.connect(ctx.destination);
    
    finalBubbleGain.gain.setValueAtTime(0, now + 0.2);
    finalBubbleGain.gain.linearRampToValueAtTime(0.16, now + 0.3); // Volume augmenté (x8)
    finalBubbleGain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
    
    finalBubble.start(now + 0.2);
    finalBubble.stop(now + 0.6);
    
  } catch (err) {
    console.warn('[FYS Lab Sounds] playAnalysisCompleteSound failed:', err);
  }
}

// ── Preference Check ──────────────────────────────────────────────────────────

/**
 * Vérifie si les sons sont activés (respecte les préférences utilisateur)
 */
export function areSoundsEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  
  try {
    const prefs = localStorage.getItem('fys-audio-preference');
    if (!prefs) return true; // Enabled by default
    const parsed = JSON.parse(prefs);
    return parsed.enabled !== false;
  } catch {
    return true;
  }
}

// ── Visibility Change Handler (Pause/Resume on tab switch) ───────────────────

if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      // L'utilisateur a quitté l'onglet → pause
      pauseAnalysisAmbient();
    } else {
      // L'utilisateur est revenu → reprendre
      resumeAnalysisAmbient();
    }
  });
}

// ── Main Exports with Preference Check ───────────────────────────────────────

export const labSounds = {
  fruitSelect: () => areSoundsEnabled() && playFruitSelectSound(),
  fruitDeselect: () => areSoundsEnabled() && playFruitDeselectSound(),
  analysisStart: () => areSoundsEnabled() && playAnalysisStartSound(),
  analysisAmbient: () => areSoundsEnabled() && playAnalysisAmbient(),
  analysisComplete: () => areSoundsEnabled() && playAnalysisCompleteSound(),
  stopAmbient: stopAnalysisAmbient,
};
