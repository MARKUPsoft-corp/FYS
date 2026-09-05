// Brouillon du Lab : la composition en cours est sauvegardée localement pour
// être restaurée à la prochaine visite (même sans connexion).

const LAB_DRAFT_KEY = 'fys.lab.draft';

export type LabDraft = {
  mains: [string, number][];
  supps: [string, number][];
  name: string;
  hasAddedSugar?: boolean;
};

export function saveLabDraft(draft: LabDraft): void {
  try {
    localStorage.setItem(LAB_DRAFT_KEY, JSON.stringify(draft));
  } catch {
    // stockage indisponible — on ignore silencieusement
  }
}

export function loadLabDraft(): LabDraft | null {
  try {
    const raw = localStorage.getItem(LAB_DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<LabDraft>;
    if (!Array.isArray(parsed.mains) || !Array.isArray(parsed.supps)) return null;
    return {
      mains: parsed.mains.filter(
        (e): e is [string, number] => Array.isArray(e) && typeof e[0] === 'string' && typeof e[1] === 'number',
      ),
      supps: parsed.supps.filter(
        (e): e is [string, number] => Array.isArray(e) && typeof e[0] === 'string' && typeof e[1] === 'number',
      ),
      name: typeof parsed.name === 'string' ? parsed.name : '',
      hasAddedSugar: typeof parsed.hasAddedSugar === 'boolean' ? parsed.hasAddedSugar : false,
    };
  } catch {
    return null;
  }
}

export function clearLabDraft(): void {
  try {
    localStorage.removeItem(LAB_DRAFT_KEY);
  } catch {
    // stockage indisponible — on ignore silencieusement
  }
}
