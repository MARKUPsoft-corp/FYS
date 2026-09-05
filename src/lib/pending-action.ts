/**
 * Actions en attente de connexion : quand un visiteur déclenche une action
 * nécessitant un compte (analyser, commander, sauvegarder…), on mémorise
 * l'action + le contexte (mélange du Lab) pour la rejouer après login.
 */

const ACTION_KEY = 'fys.pendingAction';
const MIX_KEY = 'fys.labMix';
const TTL_MS = 10 * 60 * 1000; // 10 minutes

export type LabMixSnapshot = {
  mains: Map<string, number>;
  supps: Map<string, number>;
  name: string;
  hasAddedSugar?: boolean;
};

// ── Action ─────────────────────────────────────────────────────────────────

export function setPendingAction(action: string): void {
  try {
    sessionStorage.setItem(ACTION_KEY, JSON.stringify({ action, at: Date.now() }));
  } catch {
    /* storage indisponible : on ignore */
  }
}

/** Lit et efface l'action en attente (null si absente ou expirée). */
export function consumePendingAction(): string | null {
  try {
    const raw = sessionStorage.getItem(ACTION_KEY);
    if (!raw) return null;
    sessionStorage.removeItem(ACTION_KEY);
    const parsed = JSON.parse(raw) as { action: string; at: number };
    if (Date.now() - parsed.at > TTL_MS) return null;
    return parsed.action;
  } catch {
    return null;
  }
}

export function clearPendingAction(): void {
  try {
    sessionStorage.removeItem(ACTION_KEY);
  } catch {
    /* ignore */
  }
}

// ── Mélange du Lab (contexte des actions lab) ──────────────────────────────

export function saveLabMix(snapshot: LabMixSnapshot): void {
  try {
    sessionStorage.setItem(
      MIX_KEY,
      JSON.stringify({
        mains: [...snapshot.mains.entries()],
        supps: [...snapshot.supps.entries()],
        name: snapshot.name,
        hasAddedSugar: snapshot.hasAddedSugar ?? false,
        at: Date.now(),
      }),
    );
  } catch {
    /* ignore */
  }
}

export function loadLabMix(): LabMixSnapshot | null {
  try {
    const raw = sessionStorage.getItem(MIX_KEY);
    if (!raw) return null;
    sessionStorage.removeItem(MIX_KEY);
    const parsed = JSON.parse(raw) as {
      mains: [string, number][];
      supps: [string, number][];
      name: string;
      hasAddedSugar?: boolean;
      at: number;
    };
    if (Date.now() - parsed.at > TTL_MS) return null;
    return {
      mains: new Map(parsed.mains),
      supps: new Map(parsed.supps),
      name: parsed.name ?? '',
      hasAddedSugar: parsed.hasAddedSugar ?? false,
    };
  } catch {
    return null;
  }
}
