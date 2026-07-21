export type TourPageId =
  | 'app'
  | 'home'
  | 'lab'
  | 'catalogue'
  | 'cocktails'
  | 'orders'
  | 'profile';

const STORAGE_KEY = 'fys-tours-v2';

type ToursState = Record<string, Partial<Record<TourPageId, true>>>;

function loadState(): ToursState {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as ToursState;
  } catch {
    return {};
  }
}

function saveState(state: ToursState): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore quota / private mode
  }
}

export const TOUR_COMPLETED_EVENT = 'fys-tour-completed';

export function dispatchTourCompleted(pageId: TourPageId): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(TOUR_COMPLETED_EVENT, { detail: { pageId } }));
}

export function isPageTourCompleted(userId: string, pageId: TourPageId): boolean {
  const state = loadState();
  return state[userId]?.[pageId] === true;
}

export function markPageTourCompleted(userId: string, pageId: TourPageId): void {
  const state = loadState();
  if (!state[userId]) state[userId] = {};
  state[userId][pageId] = true;
  saveState(state);
  dispatchTourCompleted(pageId);
}

/** @deprecated use isPageTourCompleted(userId, 'app') */
export function isClientTourCompleted(userId: string): boolean {
  return isPageTourCompleted(userId, 'app');
}

/** @deprecated use markPageTourCompleted(userId, 'app') */
export function markClientTourCompleted(userId: string): void {
  markPageTourCompleted(userId, 'app');
}
