import { useCallback } from 'react';
import { useNavigate, useSearchParams } from 'rasengan';

type SetSearchParams = ReturnType<typeof useSearchParams>[1];

/**
 * Ouvre une couche UI en poussant un paramètre d'URL dans l'historique.
 * Le bouton retour système (téléphone) retire alors cette couche
 * avant de quitter la page.
 */
export function pushHistoryParam(
  setSearchParams: SetSearchParams,
  key: string,
  value: string,
) {
  setSearchParams((prev) => {
    const next = new URLSearchParams(prev);
    if (next.get(key) === value) return prev;
    next.set(key, value);
    return next;
  });
}

/**
 * Ferme une couche : revient d'une entrée d'historique si le param est présent.
 */
export function useCloseHistoryParam() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  return useCallback(
    (key: string) => {
      if (searchParams.get(key)) {
        navigate(-1);
        return true;
      }
      return false;
    },
    [navigate, searchParams],
  );
}

/**
 * Remplace l'URL sans empiler (ex. nettoyage après navigation externe).
 */
export function replaceClearParam(
  setSearchParams: SetSearchParams,
  key: string,
) {
  setSearchParams((prev) => {
    if (!prev.has(key)) return prev;
    const next = new URLSearchParams(prev);
    next.delete(key);
    return next;
  }, { replace: true });
}
