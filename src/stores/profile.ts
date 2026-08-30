import { createStore } from '@rasenganjs/kurama';
import { getProfile, saveProfile } from '@/services/profile';
import type { HealthProfile } from '@/entities';

type ProfileState = {
  profile: HealthProfile | null;
  loading: boolean;
  fetched: boolean;
  fetch: (uid: string) => Promise<void>;
  save: (uid: string, data: Pick<HealthProfile, 'healthConditions' | 'allergies' | 'goals'>) => Promise<void>;
  clear: () => void;
};

export const useProfileStore = createStore<ProfileState>((set, get) => ({
  profile: null,
  loading: false,
  fetched: false,

  fetch: async (uid) => {
    if (!get().profile) {
      set({ loading: true });
    }
    const profile = await getProfile(uid);
    set({ profile, loading: false, fetched: true });
  },

  save: async (uid, data) => {
    await saveProfile(uid, data);
    const profile = await getProfile(uid);
    set({ profile });
  },

  clear: () => set({ profile: null, loading: false, fetched: false }),
}));

export function isProfileComplete(profile: HealthProfile | null): boolean {
  if (!profile) return false;
  return (
    profile.healthConditions.length > 0 &&
    profile.allergies.length > 0 &&
    (profile.goals?.length ?? 0) > 0
  );
}
