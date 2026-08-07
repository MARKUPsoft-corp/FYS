import { logEvent } from 'firebase/analytics';
import { analytics } from './firebase';

export type EventName =
  | 'login'
  | 'sign_up'
  | 'add_to_cart'
  | 'remove_from_cart'
  | 'begin_checkout'
  | 'purchase'
  | 'generate_custom_mix'
  | 'publish_recipe'
  | 'view_item'
  | 'push_subscribe'
  | 'push_dismiss';

/**
 * Envoie un événement structuré à Firebase Analytics (Google Analytics 4).
 * Gère de manière asynchrone la disponibilité du module côté client.
 *
 * @param eventName Le nom standardisé de l'événement
 * @param eventParams Paramètres optionnels (ex: prix, devise, identifiants)
 */
export async function trackEvent(eventName: EventName, eventParams?: Record<string, any>) {
  try {
    const analyticsInstance = await analytics;
    if (analyticsInstance) {
      logEvent(analyticsInstance, eventName as string, eventParams);
    }
  } catch (err) {
    console.warn('[Analytics] Failed to log event', eventName, err);
  }
}
