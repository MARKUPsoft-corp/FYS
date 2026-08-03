import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getFruits, subscribeToFruits } from '@/services/fruit';
import type { Fruit } from '@/entities';

/**
 * Catalogue fruits mis à jour en temps réel (Firestore onSnapshot).
 * Les données vivent dans le cache react-query `['fruits']` : tous les
 * consommateurs de cette clé (Lab, accueil, admin…) reçoivent les mises à jour.
 */
export function useFruitsRealtime(): { fruits: Fruit[]; isLoading: boolean } {
  const queryClient = useQueryClient();

  const { data: fruits = [], isLoading } = useQuery({
    queryKey: ['fruits'],
    queryFn: getFruits,
  });

  useEffect(() => {
    return subscribeToFruits((snapshot) => {
      queryClient.setQueryData(['fruits'], snapshot);
    });
  }, [queryClient]);

  return { fruits, isLoading };
}
