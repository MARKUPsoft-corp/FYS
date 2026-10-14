import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getTastingSettings, subscribeToTastingSettings } from '@/services/tasting';
import { DEFAULT_TASTING_SETTINGS, type TastingSettings } from '@/entities';

/**
 * Hook temps réel pour la configuration du Lab Dégustation (fruits & suppléments autorisés).
 * Les données vivent dans le cache react-query `['tasting-settings']`.
 */
export function useTastingSettings(): {
  settings: TastingSettings;
  isLoading: boolean;
} {
  const queryClient = useQueryClient();

  const { data: settings = DEFAULT_TASTING_SETTINGS, isLoading } = useQuery({
    queryKey: ['tasting-settings'],
    queryFn: getTastingSettings,
  });

  useEffect(() => {
    return subscribeToTastingSettings((snapshot) => {
      queryClient.setQueryData(['tasting-settings'], snapshot);
    });
  }, [queryClient]);

  return { settings, isLoading };
}
