import { useLocation, useNavigate } from 'rasengan';
import { setPendingAction } from '@/lib/pending-action';

/**
 * Renvoie une fonction qui redirige vers la page de connexion en mémorisant
 * l'URL courante (`?redirect=`). Si une `action` est fournie, elle est
 * sauvegardée pour être rejouée automatiquement après connexion.
 */
export function useRequireAuth() {
  const navigate = useNavigate();
  const location = useLocation();

  return (action?: string) => {
    if (action) setPendingAction(action);
    // Utiliser window.location pour garantir qu'on a l'URL la plus à jour
    // si un setSearchParams vient d'être déclenché juste avant.
    const current = window.location.pathname + window.location.search;
    navigate(`/auth/login?redirect=${encodeURIComponent(current)}`);
  };
}
