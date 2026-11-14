import type { VercelRequest, VercelResponse } from '@vercel/node';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { FYS_LOGO_BASE64 } from '../src/assets/logoBase64';
export interface DeliveryZone {
  id: string;
  name: string;
  fee: number;
  description?: string;
  districts: string[];
}

export const DEFAULT_DELIVERY_ZONES: DeliveryZone[] = [
  {
    id: 'zone_1',
    name: 'Zone 1 : Proximité Nsimeyong & Rayon Court',
    fee: 1000,
    description: 'Nsimeyong, Biyem-Assi, Mendong, Damase, Etoug-Ebe, Jouvence, Melen, Ngoa-Ekellé, Obili, Simbock',
    districts: [
      'Nsimeyong',
      'Nsimeyong I',
      'Nsimeyong II',
      'Nsimeyong III',
      'Biyem-Assi',
      'Accacia',
      'Rond-point Biyem-Assi',
      'Montée des Sœurs',
      'Damase',
      'Rond-point Damase',
      'Mendong',
      'Jouvence',
      'Carrefour Jouvence',
      'Etoug-Ebe',
      'Melen',
      'Mini-ferme',
      'Ngoa-Ekele',
      'Obili',
      'Simbock',
      'Elig-Effa',
    ],
  },
  {
    id: 'zone_2',
    name: 'Zone 2 : Centre-ville & Rayon Moyen',
    fee: 1500,
    description: 'Bastos, Centre-ville, Tsinga, Nlongkak, Mokolo, Nsam, Mvog-Mbi, Omnisports, Essos, Mbankolo...',
    districts: [
      'Centre-ville (Plateau)',
      'Poste Centrale',
      'Boulevard du 20 mai',
      'Hippodrome',
      'Bastos',
      'Golf',
      'Dragages',
      'Tsinga',
      'Messa',
      'Mokolo',
      'Madagascar',
      'Ekoudou',
      'Nlongkak',
      'Elig-Essono',
      'Elig-Edzoa',
      'Warda',
      'Mbankolo',
      'Nsam',
      'Ahala',
      'Obobogo',
      'Mvog-Mbi',
      'Mvog-Ada',
      'Coron',
      'Omnisports',
      'Essos',
      'Mfandena',
      'Kondengui',
      'Emombo',
      'Nkol-Eton',
      'Bonamoussadi',
      'Santa Barbara',
      'Ekié',
      'Djoungolo',
    ],
  },
  {
    id: 'zone_3',
    name: 'Zone 3 : Longue Distance & Périphérie',
    fee: 2000,
    description: 'Odza, Messamendongo, Ngousso, Emana, Messassi, Olembe, Nkomo, Biteng, Nkoabang, Awae...',
    districts: [
      'Odza',
      'Messamendongo',
      'Borne 10',
      'Auberge bleue',
      'Koweït',
      'Ngousso',
      'Hôpital Général',
      'Eleveurs',
      'Emana',
      'Messassi',
      'Olembe',
      'Nkomo',
      'Biteng',
      'Awae',
      'Nkolmesseng',
      'Mimboman',
      'Nkol-Afeme',
      'Nkoabang',
      'Nkolnda',
      'Mvogbeti-Messala',
      'Nkolbisson',
    ],
  },
];

export function normalizeDistrictName(name: string): string {
  return (name || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function getDeliveryZoneForDistrict(
  districtName?: string | null,
  zones: DeliveryZone[] = DEFAULT_DELIVERY_ZONES,
): { zone: DeliveryZone | null; fee: number; isDefault: boolean } {
  const activeZones = Array.isArray(zones) && zones.length > 0 ? zones : DEFAULT_DELIVERY_ZONES;

  if (!districtName || !districtName.trim()) {
    return { zone: activeZones[0] || null, fee: activeZones[0]?.fee ?? 1000, isDefault: true };
  }

  const clean = normalizeDistrictName(districtName);

  for (const zone of activeZones) {
    for (const d of zone.districts) {
      if (normalizeDistrictName(d) === clean) {
        return { zone, fee: zone.fee, isDefault: false };
      }
    }
  }

  for (const zone of activeZones) {
    for (const d of zone.districts) {
      const normD = normalizeDistrictName(d);
      if (normD.length >= 4 && (clean.includes(normD) || normD.includes(clean))) {
        return { zone, fee: zone.fee, isDefault: false };
      }
    }
  }

  const fallbackFee = activeZones[1]?.fee ?? 1500;
  return { zone: activeZones[1] || null, fee: fallbackFee, isDefault: true };
}

// ── Configuration ─────────────────────────────────────────────────────────────

const WHATSAPP_VERIFY_TOKEN =
  process.env.WHATSAPP_VERIFY_TOKEN || 'fys_secret_verify_token_2026';
const WHATSAPP_API_TOKEN = process.env.WHATSAPP_API_TOKEN;
const WHATSAPP_PHONE_NUMBER_ID =
  process.env.WHATSAPP_PHONE_NUMBER_ID || '1420693941130535';
const GEMINI_API_KEY =
  process.env.GEMINI_API_KEY || process.env.RASENGAN_GEMINI_API_KEY;

// ── Firebase Admin (optionnel & sécurisé) ────────────────────────────────────

function getAdminApp() {
  if (!process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_CLIENT_EMAIL || !process.env.FIREBASE_PRIVATE_KEY) {
    return null;
  }
  return getApps().length
    ? getApps()[0]
    : initializeApp({
        credential: cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        }),
      });
}

function getAdminDb() {
  try {
    const app = getAdminApp();
    if (!app) return null;
    const db = getFirestore(app);
    try {
      db.settings({ ignoreUndefinedProperties: true });
    } catch (_) {}
    return db;
  } catch (e) {
    console.warn('[whatsapp-webhook] Firebase Admin init bypassed:', e);
    return null;
  }
}

function getAdminMessaging() {
  try {
    const app = getAdminApp();
    return app ? getMessaging(app) : null;
  } catch (e) {
    console.warn('[whatsapp-webhook] Firebase Admin messaging bypassed:', e);
    return null;
  }
}

export const FYS_TEAM_PHONE_ORANGE = '691913207';
export const FYS_TEAM_PHONE_MTN = '675108876';
export const FYS_TEAM_CONTACTS_TEXT = `Appel / WhatsApp : +237 691 91 32 07 (https://wa.me/237691913207)\nAppel / WhatsApp : +237 675 10 88 76 (https://wa.me/237675108876)`;

/**
 * Nettoie et supprime de manière déterministe les numéros et blocs de contact FYS
 * dans les messages intermédiaires où ils ne doivent jamais apparaître.
 */
export function removeTeamContactsFromText(text: string): string {
  if (!text) return text;
  let cleaned = text.replace(
    /(?:\r?\n)*\s*(?:(?:Besoin\s+d['’][^\n]+|Si\s+vous\s+avez[^\n]+|Une\s+question[^\n]+|Notre\s+[ée]quipe[^\n]+|L['’][ée]quipe\s+FYS[^\n]+|Pour\s+toute\s+question[^\n]+|Contactez[- ]nous[^\n]*|Contacts?(?:\s+officiels|\s+de\s+l['’][ée]quipe|\s+FYS)?:?)[^\n]*\r?\n)?(?:\s*(?:📞|\+237|wa\.me|💬|Appel)[^\n]*(?:691\s*91\s*32\s*07|675\s*10\s*88\s*76|691913207|675108876)[^\n]*(?:\r?\n)?)+/gi,
    ''
  );
  cleaned = cleaned.replace(/^[^\n]*(?:691\s*91\s*32\s*07|675\s*10\s*88\s*76|691913207|675108876|wa\.me\/237691913207|wa\.me\/237675108876)[^\n]*$/gmi, '');
  cleaned = cleaned.replace(/(?:\r?\n)*\s*(?:(?:Besoin\s+d['’][^\n]+|Notre\s+[ée]quipe\s+est\s+[àa]\s+votre\s+[ée]coute|Pour\s+toute\s+question[^\n]+)[^\n]*:?)\s*$/gi, '');
  return cleaned.trim();
}

/**
 * Extrait le prénom d'un client pour les salutations personnalisées et chaleureuses.
 */
export function extractFirstName(fullName: string): string {
  if (!fullName) return '';
  const cleaned = fullName
    .replace(/^(?:M\.|Mme|Mlle|Dr|Pr|Monsieur|Madame)\s+/i, '')
    .trim();
  const parts = cleaned.split(/\s+/).filter(Boolean);
  return parts[0] || fullName;
}

/**
 * Garantit que le client est appelé chaleureusement par son prénom lors des salutations,
 * et bannit formellement toute formule générique froide ("cher(e) client(e)").
 */
export function sanitizeCustomerGreeting(text: string, customerFirstName: string): string {
  if (!text) return text;
  let res = text;
  const greetingGenericPattern = /(?:bonjour|salut|bonsoir|coucou)\s+ch[eè]r(?:e|\(e\)|\(ère\))?\s+(?:client(?:e|\(e\)|\(s\))?|ami(?:e|\(e\))?)/gi;
  const genericClientPattern = /ch[eè]r(?:e|\(e\)|\(ère\))?\s+(?:client(?:e|\(e\)|\(s\))?|ami(?:e|\(e\))?)/gi;

  if (customerFirstName) {
    res = res.replace(greetingGenericPattern, (match) => {
      const verb = match.split(/\s+/)[0];
      return `${verb} ${customerFirstName}`;
    });
    res = res.replace(genericClientPattern, customerFirstName);
    res = res.replace(/^(Bonjour|Salut|Bonsoir|Coucou)(?:\s*!|\s*,|\s*\.)/i, `$1 ${customerFirstName} !`);
  } else {
    res = res.replace(greetingGenericPattern, (match) => {
      const verb = match.split(/\s+/)[0];
      return `${verb} et bienvenue chez FYS`;
    });
    res = res.replace(genericClientPattern, 'chez FYS');
  }
  return res;
}

/**
 * Supprime les salutations intempestives en plein milieu de conversation
 * (ex: quand le client choisit ses fruits ou clique sur un bouton alors que la discussion est déjà engagée).
 */
export function stripUnwantedMidConversationGreetings(text: string): string {
  if (!text) return text;
  let cleaned = text;

  // 1. Supprime les salutations d'accueil du type "Bonjour cher(e) ami(e)," ou "Bonjour cher client !" ou "Bonjour Claudia !"
  cleaned = cleaned.replace(
    /^(?:(?:re-?)?bonjour|salut|bonsoir|coucou)(?:\s+(?:et\s+bienvenue(?:\s+chez\s+FYS)?|ch[eè]r(?:e|\(e\)|\(ère\))?\s+(?:client(?:e|\(e\)|\(s\))?|ami(?:e|\(e\))?)|[A-ZÀ-ÖØ-öø-ÿ0-9._-]+(?:\s+[A-ZÀ-ÖØ-öø-ÿ0-9._-]+)?))?(?:\s*[!.,:;])\s*/i,
    ''
  );

  // 2. Supprime les formules de remplissage du type "C'est un plaisir de vous accompagner pour cette commande..."
  cleaned = cleaned.replace(
    /^(?:c[\x27’]est|c\x27est)\s+(?:un\s+plaisir|un\s+réel\s+plaisir|un\s+bonheur)\s+de\s+vous\s+(?:retrouver|accompagner|servir|revoir)(?:\s+(?:aujourd[\x27’]hui|pour\s+cette\s+commande[^\n.!?]*))?[^\n.!?]*(?:!|\.|\?)\s*/i,
    ''
  );

  // 3. Supprime d'autres formules d'ouverture type "Ravi de vous retrouver..."
  cleaned = cleaned.replace(
    /^(?:ravi(?:e)?|heureux|heureuse)\s+de\s+vous\s+(?:retrouver|accompagner|servir|revoir)[^\n.!?]*(?:!|\.|\?)\s*/i,
    ''
  );

  cleaned = cleaned.trim();
  // Protection: si tout le message a été supprimé (cas rare), conserver le texte original nettoyé des formules impersonnelles
  if (!cleaned && text.trim()) {
    cleaned = text.replace(/ch[eè]r(?:e|\(e\)|\(ère\))?\s+(?:client(?:e|\(e\)|\(s\))?|ami(?:e|\(e\))?)/gi, '').trim();
  }

  if (cleaned.length > 0) {
    cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  }
  return cleaned;
}

/**
 * Assure un rendu textuel 100% professionnel, sobre et épuré pour WhatsApp :
 * - Supprime les émojis décoratifs (carnaval d'émojis) qui alourdissent la lecture.
 * - Supprime les doubles astérisques (**texte**) et les astérisques excessifs (*texte*)
 *   qui s'affichent mal sur WhatsApp et créent un effet brouillon/chargé.
 * - Normalise les expressions agressives (ex: "👉 TOTAL À PAYER :" -> "Total à payer :").
 * - Nettoie les listes et garantit une présentation aérée et soignée, digne d'un vrai service client pro.
 */
export function sanitizeProfessionalCustomerServiceText(text: string): string {
  if (!text) return text;
  let cleaned = text;

  // 1. Remplacer les doubles astérisques **mot** par du texte propre
  cleaned = cleaned.replace(/\*\*([^*]+)\*\*/g, '$1');

  // 2. Nettoyer les puces d'astérisques du type "* Ingrédients :"
  cleaned = cleaned.replace(/^\s*\*\s+/gm, '• ');

  // 3. Supprimer les émojis décoratifs fréquents
  const decorativeEmojisRegex = /[\u{1F300}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1FA70}-\u{1FAFF}\u{2B50}\u{2705}\u{274C}\u{270A}-\u{270D}\u{2714}\u{2716}\u{2728}\u{2733}\u{2734}\u{2744}\u{2747}\u{274E}\u{2753}-\u{2755}\u{2757}\u{2795}-\u{2797}\u{27A1}\u{27B0}\u{27BF}\u{2934}\u{2935}\u{2B05}-\u{2B07}\u{2B1B}\u{2B1C}\u{2B55}\u{3030}\u{303D}\u{3297}\u{3299}]/gu;
  cleaned = cleaned.replace(decorativeEmojisRegex, '');

  // 4. Supprimer les astérisques entourant des morceaux de texte (*titre*) et astérisques orphelines
  cleaned = cleaned.replace(/\*([^*\n]+)\*/g, '$1');
  cleaned = cleaned.replace(/\*/g, '');

  // 5. Nettoyer les expressions criardes
  cleaned = cleaned.replace(/TOTAL\s*(?:À|A)\s*PAYER\s*:/gi, 'Total à payer :');
  cleaned = cleaned.replace(/R[ÉE]CAPITULATIF\s+OFFICIEL(?:\s+DE\s+LA\s+COMMANDE)?\s*:/gi, 'Récapitulatif de votre commande :');

  // 6. Nettoyer les parenthèses résiduelles type "(Minimum de 5 atteint ! )" ou "(actuel : 2 / 5 )"
  cleaned = cleaned.replace(/!\s*\)/g, '!)');
  cleaned = cleaned.replace(/\(\s+/g, '(');
  cleaned = cleaned.replace(/\s+\)/g, ')');

  // 7. Nettoyer chaque ligne (retirer les espaces orphelins créés par les émojis retirés)
  cleaned = cleaned
    .split('\n')
    .map((l) => l.trim())
    .join('\n');

  // 8. Normaliser les espaces et sauts de ligne multiples
  cleaned = cleaned.replace(/[ \t]{2,}/g, ' ');
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
  return cleaned.trim();
}

/**
 * Parse du JSON renvoyé par un LLM de manière tolérante :
 * retire les blocs markdown ```json ... ``` et extrait l'objet { ... }.
 */
function parseSafeJson<T = any>(raw: string): T | null {
  if (!raw) return null;
  let cleaned = raw.trim();
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (match) {
    cleaned = match[0];
  }
  try {
    return JSON.parse(cleaned) as T;
  } catch (e) {
    console.warn('[whatsapp-webhook] Failed to parse JSON block:', e, 'Raw content was:', raw);
    return null;
  }
}

// ── Envoi de message WhatsApp via Meta Graph API ──────────────────────────────

async function sendWhatsAppMessage(to: string, text: string) {
  if (!WHATSAPP_API_TOKEN) {
    console.error('[whatsapp] WHATSAPP_API_TOKEN is missing');
    return false;
  }

  const url = `https://graph.facebook.com/v22.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`;

  const cleanBody = sanitizeProfessionalCustomerServiceText(text);
  const safeText = cleanBody && cleanBody.trim().length > 0
    ? cleanBody.trim()
    : 'Bonjour ! Merci pour votre message. Que pouvons-nous faire pour vous aujourd\'hui chez FYS ?';

  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to,
    type: 'text',
    text: { preview_url: false, body: safeText },
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${WHATSAPP_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.text();
    console.log('[whatsapp] Meta send response status:', response.status, data);
    return response.ok;
  } catch (fetchErr) {
    console.error('[whatsapp] Network error calling Meta API:', fetchErr);
    return false;
  }
}

// ── Envoi de messages interactifs natifs avec boutons cliquables Meta ──────────

interface WhatsAppInteractiveButton {
  id: string;
  title: string;
}

async function sendWhatsAppInteractiveButtons(
  to: string,
  bodyText: string,
  buttons: WhatsAppInteractiveButton[],
  headerText?: string,
  footerText = 'NutriFYS · Votre nutritionniste de poche'
): Promise<boolean> {
  if (!WHATSAPP_API_TOKEN) {
    console.error('[whatsapp] WHATSAPP_API_TOKEN is missing');
    return false;
  }

  // Nettoyer strictement les titres de boutons : Meta INTERDIT formellement les emojis et le markdown dans reply.title
  const cleanButtonTitle = (raw: string, fallback: string): string => {
    if (!raw || typeof raw !== 'string') return fallback.slice(0, 20);
    let stripped = raw
      .replace(/[\p{Extended_Pictographic}\uFE0F\u200D\u20E3]/gu, '')
      .replace(/[*_~`#|]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    // Remplacement intelligent des intitulés trop longs pour éviter la troncature Meta (max 20 car)
    const lower = stripped.toLowerCase();
    if (lower.includes('1 bouteille de chaque') || lower.includes('1 de chaqu')) {
      stripped = '1 de chaque';
    } else if (lower.includes('2 bouteilles de chaque') || lower.includes('2 de chaqu')) {
      stripped = '2 de chaque';
    } else if (lower.includes('3 bouteilles de chaque') || lower.includes('3 de chaqu')) {
      stripped = '3 de chaque';
    } else if (lower.includes('quantités différentes') || lower.includes('quantité différente') || lower.includes('quantités sur-mesure')) {
      stripped = 'Quantités perso';
    } else if (lower.includes('formats différents') || lower.includes('format différent')) {
      stripped = 'Formats différents';
    } else if (lower.includes('choisir un autre jus') || lower.includes('choisir un jus') || lower.includes('autre jus')) {
      stripped = 'Choisir un jus';
    } else if (lower.includes('ajouter un autre jus') || lower.includes('ajouter un jus')) {
      stripped = 'Ajouter un jus';
    } else if (lower.includes('compléter') || lower.includes('completer')) {
      stripped = stripped.replace(/bouteilles?|btles?|ce jus/gi, '').replace(/\s+/g, ' ').trim();
    }

    const finalTitle = stripped.slice(0, 20).trim();
    return finalTitle.length > 0 ? finalTitle : fallback.slice(0, 20);
  };

  // Meta autorise entre 1 et 3 boutons de réponse rapide max
  const seenIds = new Set<string>();
  const safeButtons = (buttons || [])
    .filter((b) => b && typeof b.title === 'string' && b.title.trim().length > 0)
    .slice(0, 3)
    .map((b, idx) => {
      let candidateId = (b.id || `btn_${idx}`).trim().slice(0, 256);
      if (!candidateId || seenIds.has(candidateId)) {
        candidateId = `btn_${idx}_${Date.now().toString(36)}`;
      }
      seenIds.add(candidateId);
      return {
        type: 'reply' as const,
        reply: {
          id: candidateId,
          // Limite stricte de Meta : 20 caractères max, 100% sans emoji ni markdown
          title: cleanButtonTitle(b.title, `Option ${idx + 1}`),
        },
      };
    });

  if (safeButtons.length === 0) {
    return sendWhatsAppMessage(to, bodyText);
  }

  const url = `https://graph.facebook.com/v22.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`;

  // Meta limite body.text à 1024 caractères pour les messages interactifs
  let textForBody = sanitizeProfessionalCustomerServiceText(bodyText);
  let prefixTextToSendFirst: string | null = null;
  if (textForBody.length > 950) {
    const splitIndex = textForBody.lastIndexOf('\n\n', 900);
    const cutAt = splitIndex > 250 ? splitIndex : 850;
    prefixTextToSendFirst = textForBody.slice(0, cutAt).trim();
    textForBody = textForBody.slice(cutAt).trim();
    if (textForBody.length > 950) {
      textForBody = textForBody.slice(-950);
    }
  }

  if (prefixTextToSendFirst) {
    await sendWhatsAppMessage(to, prefixTextToSendFirst);
  }

  const interactivePayload: any = {
    type: 'button',
    body: {
      text: textForBody || 'Que souhaitez-vous faire ?',
    },
    action: {
      buttons: safeButtons,
    },
  };

  // NOTE CRITIQUE COMPATIBILITÉ META CLOUD API & WHATSAPP WEB :
  // Les en-têtes textuels ({ type: 'text' }) sur les boutons interactifs (type: 'button')
  // ne sont pas recommandés par Meta et provoquent des échecs d'affichage silencieux sur WhatsApp Web.
  // On omet donc le text header pour garantir l'affichage à 100% sur mobile et sur WhatsApp Web.

  if (footerText && footerText.length <= 60) {
    const cleanFooter = footerText.replace(/[*_~`#|•·]/g, '-').replace(/-{2,}/g, '-').trim();
    if (cleanFooter) {
      interactivePayload.footer = {
        text: cleanFooter,
      };
    }
  }

  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to,
    type: 'interactive',
    interactive: interactivePayload,
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${WHATSAPP_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const responseText = await response.text();
    console.log('[whatsapp] Meta interactive buttons response status:', response.status, responseText);

    const db = getAdminDb();
    if (db) {
      await db.collection('meta_debug_logs').add({
        action: 'sendWhatsAppInteractiveButtons',
        to,
        status: response.status,
        responseText,
        payload,
        createdAt: FieldValue.serverTimestamp(),
      }).catch((e: any) => console.warn('[whatsapp] meta_debug_logs write skipped:', e));
    }

    if (!response.ok) {
      console.warn('[whatsapp] Interactive message not accepted by Meta:', response.status, responseText);

      // Tentative de secours 1 : envoyer sans header ni footer (certains clients Meta bloquent les en-têtes textuels)
      if (interactivePayload.header || interactivePayload.footer) {
        console.log('[whatsapp] Retrying interactive buttons with minimal body+action payload...');
        const minimalPayload = {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to,
          type: 'interactive',
          interactive: {
            type: 'button',
            body: { text: textForBody || 'Que souhaitez-vous faire ?' },
            action: { buttons: safeButtons },
          },
        };
        const retryRes = await fetch(url, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${WHATSAPP_API_TOKEN}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(minimalPayload),
        });
        const retryText = await retryRes.text();
        console.log('[whatsapp] Minimal interactive retry response status:', retryRes.status, retryText);

        if (db) {
          await db.collection('meta_debug_logs').add({
            action: 'minimalInteractiveRetry',
            to,
            status: retryRes.status,
            responseText: retryText,
            payload: minimalPayload,
            createdAt: FieldValue.serverTimestamp(),
          }).catch(() => null);
        }

        if (retryRes.ok) return true;
      }

      console.warn('[whatsapp] Interactive message not accepted by Meta, falling back to text message...');
      return sendWhatsAppMessage(to, textForBody);
    }

    return true;
  } catch (fetchErr) {
    console.error('[whatsapp] Network error sending interactive buttons, falling back to text:', fetchErr);
    return sendWhatsAppMessage(to, textForBody);
  }
}

// ── Catalogue des jus signatures FYS (Formats & Tarifs dynamiques de Firestore) ──────────────────

export interface CatalogCocktail {
  id: string;
  name: string;
  imageUrl?: string;
  description?: string;
  containers: Array<{ label: string; price: number }>;
  ingredients: Array<{
    fruitId: string;
    fruitName: string;
    quantityGrams?: number;
    priceSnapshot?: number;
    role?: string;
  }>;
}

let cachedCatalogCocktails: CatalogCocktail[] | null = null;
let cachedCatalogTimestamp = 0;

export async function getActiveCatalogCocktails(db: any): Promise<CatalogCocktail[]> {
  const now = Date.now();
  if (cachedCatalogCocktails && (now - cachedCatalogTimestamp < 60000)) {
    return cachedCatalogCocktails;
  }
  if (!db) return [];
  try {
    const snap = await db.collection('cocktails')
      .where('type', '==', 'catalog')
      .where('isActive', '==', true)
      .where('isPublic', '==', true)
      .get();

    const list: CatalogCocktail[] = [];
    snap.docs.forEach((d: any) => {
      const data = d.data();
      list.push({
        id: d.id,
        name: data.name || 'Jus FYS',
        imageUrl: data.imageUrl || '',
        description: data.description || '',
        containers: Array.isArray(data.containers) && data.containers.length > 0
          ? data.containers
          : [{ label: '350ml', price: 500 }],
        ingredients: Array.isArray(data.ingredients) ? data.ingredients : [],
      });
    });
    cachedCatalogCocktails = list;
    cachedCatalogTimestamp = now;
    return list;
  } catch (err) {
    console.warn('[whatsapp-webhook] Error fetching catalog cocktails:', err);
    return cachedCatalogCocktails || [];
  }
}

export function matchCatalogCocktailFromText(
  text: string,
  catalogCocktails: CatalogCocktail[]
): CatalogCocktail | null {
  if (!text || typeof text !== 'string' || !catalogCocktails || catalogCocktails.length === 0) return null;
  const clean = normalizeTextForMatching(text);
  for (const c of catalogCocktails) {
    const cNameNorm = normalizeTextForMatching(c.name);
    if (cNameNorm.length >= 3 && clean.includes(cNameNorm)) {
      return c;
    }
  }
  const extracted = extractCatalogOrdersFromText(text, catalogCocktails);
  if (extracted.length > 0) {
    return extracted[0].cocktail;
  }
  return null;
}

export interface ExtractedCatalogOrder {
  cocktail: CatalogCocktail;
  quantity: number | null;
  container: { label: string; price: number };
  containerIndex: number;
}

export function extractCatalogOrdersFromText(
  text: string,
  catalogCocktails: CatalogCocktail[]
): ExtractedCatalogOrder[] {
  if (!text || typeof text !== 'string' || !catalogCocktails || catalogCocktails.length === 0) return [];
  let clean = normalizeTextForMatching(text);

  // Si phrase de substitution (ex: "à la place de 4 ananas papaye je veux 3 papaye orange et 2 anas papaye")
  // On extrait uniquement depuis la clause désirée ("je veux / donne-moi / mets-moi / par / plutôt")
  const replaceMatch = clean.match(
    /(?:[àa]\s+la\s+place\s+d[e']?s?|au\s+lieu\s+d[e']?s?|remplac(?:er?|e|ez?)|chang(?:er?|e|ez?)(?:\s+(?:pour|en))?|je\s+ne\s+veux\s+plus\s+d[e']?s?|ne\s+mets\s+plus\s+d[e']?s?|retir(?:er?|e|ez?)|enl[èe]v(?:er?|e|ez?))\s+.*?\s+(?:je\s+veux|mets[- ]moi|donne[- ]moi|prends|ajoute|mets|par|en|plut[ôo]t|finalement|en\s+fait|,|;)\s+(.*)/i
  );
  if (replaceMatch && replaceMatch[1]) {
    clean = replaceMatch[1].trim();
  }

  const results: Array<ExtractedCatalogOrder & { matchIndex: number }> = [];

  const parseWordNumber = (word: string): number | null => {
    const map: Record<string, number> = {
      un: 1, une: 1, deux: 2, trois: 3, quatre: 4, cinq: 5,
      six: 6, sept: 7, huit: 8, neuf: 9, dix: 10,
      onze: 11, douze: 12, quinze: 15, vingt: 20,
    };
    return map[word] || null;
  };

  // Trier par longueur de nom décroissante pour éviter les collisions partielles
  const sortedCatalog = [...catalogCocktails].sort((a, b) => b.name.length - a.name.length);

  for (const c of sortedCatalog) {
    const cNorm = normalizeTextForMatching(c.name);
    if (cNorm.length < 3) continue;
    const words = cNorm.replace(/[^\w\s]/g, ' ').split(/\s+/).filter(Boolean);
    const namePattern = words.map((w) => {
      for (const [canonical, aliases] of Object.entries(FRUIT_TYPO_SYNONYMS)) {
        const normCanonical = normalizeTextForMatching(canonical);
        const normAliases = Array.from(new Set([canonical, ...aliases].map((a) => normalizeTextForMatching(a)).filter(Boolean)));
        if (w === normCanonical || normAliases.includes(w)) {
          return `(?:${normAliases.map((a) => escapeRegexString(a)).join('|')})`;
        }
      }
      return `${escapeRegexString(w)}s?`;
    }).join('\\s+(?:et\\s+|&\\s+)?');

    // Détection de quantité avant ou après le nom : ex "2 papaye oranges", "1 ananas gingembre", "papaye orange x 3"
    const regex = new RegExp(
      `(?:(\\d+|un|une|deux|trois|quatre|cinq|six|sept|huit|neuf|dix)\\s*(?:bouteilles?|cols?|btls?|x)?\\s*(?:de\\s+|d\\s+)?)?` +
      namePattern +
      `(?:\\s*(?:x|fois)?\\s*(\\d+))?`,
      'gi'
    );

    let match: RegExpExecArray | null;
    while ((match = regex.exec(clean)) !== null) {
      let qty: number | null = null;
      if (match[1]) {
        qty = parseInt(match[1], 10) || parseWordNumber(match[1]);
      } else if (match[2]) {
        qty = parseInt(match[2], 10);
      }

      const containers = Array.isArray(c.containers) && c.containers.length > 0
        ? c.containers
        : [{ label: '350ml', price: 500 }];

      let containerIndex = 0;
      if (containers.length > 1) {
        if (/1\s*l(?:itre)?|grand\s*format/i.test(text)) {
          const l1Idx = containers.findIndex((ct) => /1\s*l/i.test(ct.label));
          if (l1Idx >= 0) containerIndex = l1Idx;
        } else if (/350\s*ml|petit\s*format/i.test(text)) {
          const smIdx = containers.findIndex((ct) => /350/i.test(ct.label));
          if (smIdx >= 0) containerIndex = smIdx;
        }
      }

      results.push({
        cocktail: c,
        quantity: qty,
        container: containers[containerIndex] || containers[0],
        containerIndex,
        matchIndex: match.index,
      });
      break;
    }
  }

  results.sort((a, b) => a.matchIndex - b.matchIndex);
  return results;
}

export interface ParsedQuantityIntent {
  quantity: number;
  isRelative: boolean;
}

export function parseQuantityIntentFromText(text: string): ParsedQuantityIntent | null {
  if (!text || typeof text !== 'string') return null;
  const clean = text.toLowerCase().trim();

  // Exclure les formats de bouteilles explicites (500ml, 1L, etc.)
  if (/^(?:format\s+)?(?:500\s*(?:ml)?|1000\s*ml|1\s*(?:l|litre))$/i.test(clean)) {
    return null;
  }

  // 1. Détection des ajouts relatifs (ex: "ajoutes encore 3", "ajoute 3", "rajoute 2", "+3", "2 de plus", "encore 3 bouteilles")
  const relRegex1 = /(?:^|\b)(?:ajout(?:er?|e|es|ons|ez)?|rajout(?:er?|e|es|ons|ez)?)(?:\s+(?:en|m['’]en|moi|encore))*\s*(\d+)(?:\s*(?:bouteilles?|cols?|btls?))?(?:\s*(?:de\s*plus|en\s*plus|en\s*encore))?/i;
  const relRegex2 = /(?:^|\b)(?:encore|\+)\s*(\d+)(?:\s*(?:bouteilles?|cols?|btls?))?/i;
  const relRegex3 = /(?:^|\b)(\d+)\s*(?:bouteilles?|cols?|btls?)?\s*(?:de\s*plus|en\s*plus)(?:\b|$)/i;

  const mRel = clean.match(relRegex1) || clean.match(relRegex2) || clean.match(relRegex3);
  if (mRel) {
    const val = parseInt(mRel[1], 10);
    if (!isNaN(val) && val > 0 && val <= 50) {
      return { quantity: val, isRelative: true };
    }
  }

  // 2. Détection des quantités absolues (ex: "je veux 5 bouteilles", "je prends 5", "mets 5", "5 bouteilles", "5")
  const absRegex1 = /^(?:je\s+(?:veux|prends|souhaite|commande|voudrais)|mets|mets-moi|passe\s+[àa]|fais|compte|soit)?\s*(\d+)(?:\s*(?:bouteilles?|cols?|btls?))?$/i;
  const absRegex2 = /(?:je\s+(?:veux|prends|souhaite|commande|voudrais)|mets|mets-moi|passe\s+[àa]|fais|compte)\s*(\d+)(?:\s*(?:bouteilles?|cols?|btls?))?/i;
  const absRegex3 = /^(\d+)\s*(?:bouteilles?|cols?|btls?)$/i;

  const mAbs = clean.match(absRegex1) || clean.match(absRegex2) || clean.match(absRegex3);
  if (mAbs) {
    const val = parseInt(mAbs[1], 10);
    if (!isNaN(val) && val > 0 && val <= 100 && val !== 500 && val !== 1000) {
      return { quantity: val, isRelative: false };
    }
  }

  return null;
}

async function sendWhatsAppCatalogCard(
  to: string,
  cocktail: CatalogCocktail
): Promise<boolean> {
  if (!WHATSAPP_API_TOKEN) {
    console.error('[whatsapp] WHATSAPP_API_TOKEN is missing');
    return false;
  }

  const containers = Array.isArray(cocktail.containers) && cocktail.containers.length > 0
    ? cocktail.containers
    : [{ label: '350ml', price: 500 }];

  const formatsText = containers
    .map((c) => `${c.label} (${(Number(c.price) || 0).toLocaleString('fr-FR')} XAF)`)
    .join(' · ');

  const ingredientsList = cocktail.ingredients && cocktail.ingredients.length > 0
    ? cocktail.ingredients.map((i) => i.fruitName).join(', ')
    : 'Recette signature FYS';

  const bodyText = `${cocktail.name}\n• Ingrédients : ${ingredientsList}\n• Format(s) : ${formatsText}\n• Commande minimale : 5 bouteilles au total (panier combinable)`;
  const buttonId = `btn_cat_${cocktail.id}`;

  const interactivePayload: any = {
    type: 'button',
    body: {
      text: bodyText,
    },
    footer: {
      text: 'FYS · Jus signatures du catalogue',
    },
    action: {
      buttons: [
        {
          type: 'reply',
          reply: {
            id: buttonId,
            title: 'Choisir ce jus',
          },
        },
      ],
    },
  };

  if (cocktail.imageUrl && cocktail.imageUrl.startsWith('http')) {
    interactivePayload.header = {
      type: 'image',
      image: {
        link: cocktail.imageUrl,
      },
    };
  }

  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to,
    type: 'interactive',
    interactive: interactivePayload,
  };

  const url = `https://graph.facebook.com/v22.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${WHATSAPP_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const responseText = await response.text();
    console.log(`[whatsapp] Meta catalog card status for ${cocktail.name}:`, response.status, responseText);

    if (!response.ok) {
      console.warn(`[whatsapp] Catalog card with image header failed (${response.status}), falling back to text buttons...`);
      return sendWhatsAppInteractiveButtons(
        to,
        bodyText,
        [{ id: buttonId, title: 'Choisir ce jus' }],
        undefined,
        'FYS · Jus signatures'
      );
    }
    return true;
  } catch (err) {
    console.error(`[whatsapp] Network error sending catalog card for ${cocktail.name}:`, err);
    return sendWhatsAppInteractiveButtons(
      to,
      bodyText,
      [{ id: buttonId, title: 'Choisir ce jus' }],
      undefined,
      'FYS · Jus signatures'
    );
  }
}

async function sendCatalogJuicesList(to: string, cocktails: CatalogCocktail[]): Promise<void> {
  const introText = `Jus signatures du catalogue FYS\n\nDécouvrez nos recettes signatures prêtes à être dégustées, avec leurs formats et tarifs officiels enregistrés en boutique.\n\nCommande minimale : 5 bouteilles au total (vous pouvez combiner différentes recettes dans une même commande pour atteindre ce minimum).\n\nDécouvrez nos jus disponibles ci-dessous et cliquez sur « Choisir ce jus » pour composer votre panier :`;
  await sendWhatsAppMessage(to, introText);

  for (const c of cocktails) {
    await new Promise((res) => setTimeout(res, 400));
    await sendWhatsAppCatalogCard(to, c);
  }

  // Proposer toujours l'alternative sur-mesure au client
  await new Promise((res) => setTimeout(res, 400));
  await sendWhatsAppInteractiveButtons(
    to,
    "Envie d'un cocktail personnalisé ?\nVous pouvez également composer votre propre recette sur-mesure au Lab selon vos fruits préférés et vos objectifs santé.",
    [{ id: 'btn_mode_custom', title: 'Composer sur-mesure' }],
    'FYS · Le Lab Sur-mesure',
    'Créez votre jus personnalisé'
  );
}

// ── Envoi de messages interactifs avec listes déroulantes natives Meta ────────

interface WhatsAppListRow {
  id: string;
  title: string;
  description?: string;
}

interface WhatsAppListSection {
  title?: string;
  rows: WhatsAppListRow[];
}

interface WhatsAppListData {
  buttonText: string;
  sections: WhatsAppListSection[];
}

export function getWhatsAppDistrictsList(zones: DeliveryZone[] = DEFAULT_DELIVERY_ZONES): WhatsAppListData {
  const getFeeBadge = (d: string) => {
    const fee = getDeliveryZoneForDistrict(d, zones).fee;
    return `${fee.toLocaleString('fr-FR')} XAF`;
  };

  return {
    buttonText: 'Choisir le quartier',
    sections: [
      {
        title: 'Quartiers de Yaoundé',
        rows: [
          { id: 'loc_biyem_assi', title: 'Biyem-Assi', description: `${getFeeBadge('Biyem-Assi')} · Proche Nsimeyong (Zone 1)` },
          { id: 'loc_mendong', title: 'Mendong / Simbock', description: `${getFeeBadge('Mendong')} · Jouvence, Simbock (Zone 1)` },
          { id: 'loc_centre_ville', title: 'Centre-ville', description: `${getFeeBadge('Centre-ville')} · Poste Centrale (Zone 2)` },
          { id: 'loc_bastos', title: 'Bastos', description: `${getFeeBadge('Bastos')} · Ambassades, Golf (Zone 2)` },
          { id: 'loc_omnisports', title: 'Omnisports / Essos', description: `${getFeeBadge('Omnisports')} · Stade, Mfandena (Zone 2)` },
          { id: 'loc_nlongkak', title: 'Nlongkak', description: `${getFeeBadge('Nlongkak')} · Elig-Essono, Warda (Zone 2)` },
          { id: 'loc_mokolo', title: 'Mokolo / Tsinga', description: `${getFeeBadge('Mokolo')} · Marché, Tsinga (Zone 2)` },
          { id: 'loc_emombo', title: 'Emombo / Nkolmesseng', description: `${getFeeBadge('Emombo')} · Chapelle, Tradex (Zone 2)` },
          { id: 'loc_odza', title: 'Odza', description: `${getFeeBadge('Odza')} · Messamendongo, Borne 10 (Zone 3)` },
          { id: 'loc_ngousso', title: 'Ngousso', description: `${getFeeBadge('Ngousso')} · Hôpital Général, Eleveur (Zone 3)` },
        ],
      },
    ],
  };
}

// 10 quartiers fréquents prédéfinis de Yaoundé pour la livraison (fallback constant)
const YAOUNDE_DISTRICTS_LIST: WhatsAppListData = getWhatsAppDistrictsList(DEFAULT_DELIVERY_ZONES);

async function sendWhatsAppDistrictList(
  to: string,
  bodyText: string,
  zones: DeliveryZone[] = DEFAULT_DELIVERY_ZONES,
  headerText = 'FYS · Livraison Yaoundé'
): Promise<boolean> {
  const list = getWhatsAppDistrictsList(zones);
  return sendWhatsAppInteractiveList(to, bodyText, list, headerText);
}

async function sendWhatsAppInteractiveList(
  to: string,
  bodyText: string,
  listData: WhatsAppListData,
  headerText?: string,
  footerText = 'NutriFYS · Votre nutritionniste de poche'
): Promise<boolean> {
  if (!WHATSAPP_API_TOKEN) {
    console.error('[whatsapp] WHATSAPP_API_TOKEN is missing');
    return false;
  }

  let totalRowsCount = 0;
  const safeSections = (listData.sections || [])
    .map((sec, secIdx) => {
      const safeRows = (sec.rows || [])
        .filter((r) => r && typeof r.title === 'string' && r.title.trim().length > 0)
        .map((r, rIdx) => {
          if (totalRowsCount >= 10) return null;
          totalRowsCount++;
          const cleanTitle = r.title.replace(/[*_~`#|]/g, '').trim().slice(0, 24);
          const cleanDesc = r.description ? r.description.replace(/[*_~`#|]/g, '').trim().slice(0, 72) : undefined;
          return {
            id: (r.id || `row_${secIdx}_${rIdx}`).slice(0, 200),
            title: cleanTitle || `Option ${totalRowsCount}`,
            ...(cleanDesc ? { description: cleanDesc } : {}),
          };
        })
        .filter(Boolean) as { id: string; title: string; description?: string }[];

      return {
        ...(sec.title ? { title: sec.title.replace(/[*_~`#|]/g, '').trim().slice(0, 24) } : {}),
        rows: safeRows,
      };
    })
    .filter((sec) => sec.rows.length > 0)
    .slice(0, 10);

  if (safeSections.length === 0 || totalRowsCount === 0) {
    return sendWhatsAppMessage(to, bodyText);
  }

  const cleanButton = (listData.buttonText || 'Choisir').replace(/[*_~`#|]/g, '').trim().slice(0, 20);

  const cleanBody = sanitizeProfessionalCustomerServiceText(bodyText || 'Veuillez faire un choix :');

  const interactivePayload: any = {
    type: 'list',
    body: {
      text: cleanBody.slice(0, 4000),
    },
    action: {
      button: cleanButton || 'Choisir',
      sections: safeSections,
    },
  };

  if (headerText && headerText.length <= 60) {
    interactivePayload.header = {
      type: 'text',
      text: headerText,
    };
  }

  if (footerText && footerText.length <= 60) {
    interactivePayload.footer = {
      text: footerText,
    };
  }

  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to,
    type: 'interactive',
    interactive: interactivePayload,
  };

  const url = `https://graph.facebook.com/v22.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${WHATSAPP_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const responseText = await response.text();
    console.log('[whatsapp] Meta interactive list response status:', response.status, responseText);

    const db = getAdminDb();
    if (db) {
      await db.collection('meta_debug_logs').add({
        action: 'sendWhatsAppInteractiveList',
        to,
        status: response.status,
        responseText,
        payload,
        createdAt: FieldValue.serverTimestamp(),
      }).catch(() => null);
    }

    if (!response.ok) {
      console.warn('[whatsapp] Interactive list not accepted by Meta, falling back to text message:', response.status, responseText);
      return sendWhatsAppMessage(to, bodyText);
    }

    return true;
  } catch (err) {
    console.error('[whatsapp] Network error sending interactive list, falling back to text:', err);
    return sendWhatsAppMessage(to, bodyText);
  }
}

// ── Envoi de message interactif avec bouton CTA URL (Lien cliquable natif Meta) ──

interface WhatsAppCtaUrlData {
  displayText: string;
  url: string;
  headerText?: string;
  footerText?: string;
}

async function sendWhatsAppCtaUrl(
  to: string,
  bodyText: string,
  cta: WhatsAppCtaUrlData
): Promise<boolean> {
  if (!WHATSAPP_API_TOKEN) {
    console.error('[whatsapp] WHATSAPP_API_TOKEN is missing');
    return false;
  }

  const cleanButtonTitle = (raw: string, fallback: string): string => {
    if (!raw || typeof raw !== 'string') return fallback.slice(0, 20);
    const stripped = raw
      .replace(/[\p{Extended_Pictographic}\uFE0F\u200D\u20E3]/gu, '')
      .replace(/[*_~`#|]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    const finalTitle = stripped.slice(0, 20).trim();
    return finalTitle.length > 0 ? finalTitle : fallback.slice(0, 20);
  };

  const safeDisplayText = cleanButtonTitle(cta.displayText, 'Tableau de bord');
  const url = `https://graph.facebook.com/v22.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`;

  // Nettoyer bodyText pour retirer tout lien brut restant et garder un texte impeccable
  let textForBody = sanitizeProfessionalCustomerServiceText(
    (bodyText || '')
      .replace(/https?:\/\/fys-app\.com[^\s]*/g, '')
      .trim()
  );

  if (!textForBody) {
    textForBody = 'Votre commande est confirmée. Cliquez sur le bouton ci-dessous pour accéder à votre espace personnel FYS :';
  }

  // Meta limite body.text à 1024 caractères pour les messages interactifs
  let prefixTextToSendFirst: string | null = null;
  const isOrderConfirmation =
    Boolean(cta.headerText && cta.headerText.toLowerCase().includes('commande confirmée')) ||
    safeDisplayText.toLowerCase().includes('tableau de bord') ||
    textForBody.toLowerCase().includes('récapitulatif officiel') ||
    textForBody.toLowerCase().includes('récapitulatif de votre commande');

  if (textForBody.length > 1020) {
    if (isOrderConfirmation) {
      // Pour une confirmation de commande : RÈGLE COMMERCIALE STRICTE -> UN SEUL MESSAGE UNIQUE !
      // Ne jamais envoyer de prefixText séparé qui doublerait le message.
      textForBody = textForBody.slice(0, 1020).trim();
    } else {
      const splitIndex = textForBody.lastIndexOf('\n\n', 950);
      const cutAt = splitIndex > 250 ? splitIndex : 900;
      prefixTextToSendFirst = textForBody.slice(0, cutAt).trim();
      textForBody = textForBody.slice(cutAt).trim();
      if (textForBody.length > 1020) {
        textForBody = textForBody.slice(-1020);
      }
    }
  }

  if (prefixTextToSendFirst && !isOrderConfirmation) {
    await sendWhatsAppMessage(to, prefixTextToSendFirst);
  }

  const interactivePayload: any = {
    type: 'cta_url',
    body: {
      text: textForBody,
    },
    action: {
      name: 'cta_url',
      parameters: {
        display_text: safeDisplayText,
        url: cta.url,
      },
    },
  };

  if (cta.headerText && cta.headerText.length <= 60) {
    interactivePayload.header = {
      type: 'text',
      text: cta.headerText,
    };
  }

  if (cta.footerText && cta.footerText.length <= 60) {
    interactivePayload.footer = {
      text: cta.footerText,
    };
  }

  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to,
    type: 'interactive',
    interactive: interactivePayload,
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${WHATSAPP_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const responseText = await response.text();
    console.log('[whatsapp] Meta CTA URL button response status:', response.status, responseText);

    const db = getAdminDb();
    if (db) {
      await db.collection('meta_debug_logs').add({
        action: 'sendWhatsAppCtaUrl',
        to,
        status: response.status,
        responseText,
        payload,
        createdAt: FieldValue.serverTimestamp(),
      }).catch(() => null);
    }

    if (!response.ok) {
      console.warn('[whatsapp] CTA URL button rejected by Meta, retrying minimal payload without header/footer...');
      const minimalPayload = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to,
        type: 'interactive',
        interactive: {
          type: 'cta_url',
          body: { text: textForBody },
          action: {
            name: 'cta_url',
            parameters: {
              display_text: safeDisplayText,
              url: cta.url,
            },
          },
        },
      };

      const retryRes = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${WHATSAPP_API_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(minimalPayload),
      });

      const retryText = await retryRes.text();
      console.log('[whatsapp] Minimal CTA retry response status:', retryRes.status, retryText);
      if (retryRes.ok) return true;

      // Repli texte standard si rejeté par le client WhatsApp de l'utilisateur
      return sendWhatsAppMessage(to, `${textForBody}\n\nAccéder à votre Tableau de bord : ${cta.url}`);
    }

    return true;
  } catch (err) {
    console.error('[whatsapp] Network error sending CTA URL button, falling back to text:', err);
    return sendWhatsAppMessage(to, `${textForBody}\n\nAccéder à votre Tableau de bord : ${cta.url}`);
  }
}

// ── Marquer le message comme lu & Activer l'indicateur visuel "en train d'écrire..." ──

async function markWhatsAppMessageAsReadAndTyping(messageId: string): Promise<boolean> {
  if (!WHATSAPP_API_TOKEN || !messageId) return false;
  const url = `https://graph.facebook.com/v22.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${WHATSAPP_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        status: 'read',
        message_id: messageId,
        typing_indicator: {
          type: 'text',
        },
      }),
    });
    const data = await res.json().catch(() => null);
    console.log('[whatsapp] Read & typing indicator status:', res.status, data);

    // En cas de non-support de typing_indicator par une version spécifique, repli sur le read standard
    if (!res.ok) {
      console.warn('[whatsapp] typing_indicator failed, falling back to standard read:', data);
      await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${WHATSAPP_API_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          status: 'read',
          message_id: messageId,
        }),
      });
    }
    return res.ok;
  } catch (err) {
    console.warn('[whatsapp] Could not mark message as read and typing:', err);
    return false;
  }
}

// ── Téléchargement de média binaire WhatsApp (Note vocale client) ──────────────

async function downloadWhatsAppMedia(mediaId: string): Promise<{ buffer: Buffer; mimeType: string } | null> {
  if (!WHATSAPP_API_TOKEN) return null;
  try {
    const metaRes = await fetch(`https://graph.facebook.com/v22.0/${mediaId}`, {
      headers: { Authorization: `Bearer ${WHATSAPP_API_TOKEN}` },
    });
    if (!metaRes.ok) {
      console.error('[whatsapp] Failed to get media URL from Meta:', metaRes.status, await metaRes.text());
      return null;
    }
    const metaData = await metaRes.json();
    const mediaUrl = metaData.url;
    if (!mediaUrl) return null;

    const fileRes = await fetch(mediaUrl, {
      headers: { Authorization: `Bearer ${WHATSAPP_API_TOKEN}` },
    });
    if (!fileRes.ok) {
      console.error('[whatsapp] Failed to download media binary:', fileRes.status);
      return null;
    }
    const arrayBuffer = await fileRes.arrayBuffer();
    return {
      buffer: Buffer.from(arrayBuffer),
      mimeType: metaData.mime_type || 'audio/ogg',
    };
  } catch (err) {
    console.error('[whatsapp] Error downloading WhatsApp media:', err);
    return null;
  }
}

// ── Encodage PCM -> MP3 100% JS (compatible Vercel Serverless) ────────────────

async function pcmToMp3(pcmBuffer: Buffer, sampleRate = 24000, channels = 1): Promise<Buffer> {
  const { Mp3Encoder } = await import('@breezystack/lamejs');
  const encoder = new Mp3Encoder(channels, sampleRate, 64);
  const samples = new Int16Array(pcmBuffer.buffer, pcmBuffer.byteOffset, pcmBuffer.length / 2);
  const mp3Chunks: Buffer[] = [];
  const chunkSize = 1152;
  for (let i = 0; i < samples.length; i += chunkSize) {
    const chunk = samples.subarray(i, i + chunkSize);
    const encoded = encoder.encodeBuffer(chunk);
    if (encoded.length > 0) mp3Chunks.push(Buffer.from(encoded));
  }
  const end = encoder.flush();
  if (end.length > 0) mp3Chunks.push(Buffer.from(end));
  return Buffer.concat(mp3Chunks);
}

// ── Téléversement d'audio vers l'API Media de Meta ───────────────────────────

async function uploadWhatsAppAudio(mp3Buffer: Buffer): Promise<string | null> {
  if (!WHATSAPP_API_TOKEN) return null;
  const url = `https://graph.facebook.com/v22.0/${WHATSAPP_PHONE_NUMBER_ID}/media`;
  try {
    const formData = new FormData();
    formData.append('messaging_product', 'whatsapp');
    formData.append('type', 'audio/mpeg');
    const blob = new Blob([new Uint8Array(mp3Buffer)], { type: 'audio/mpeg' });
    formData.append('file', blob, 'nutrifys_voice.mp3');

    const response = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${WHATSAPP_API_TOKEN}` },
      body: formData,
    });
    if (!response.ok) {
      console.error('[whatsapp] Upload audio media failed:', response.status, await response.text());
      return null;
    }
    const data = await response.json();
    console.log('[whatsapp] Voice uploaded to Meta with media ID:', data.id);
    return data.id || null;
  } catch (err) {
    console.error('[whatsapp] Error uploading audio to Meta:', err);
    return null;
  }
}

// ── Envoi de message Vocal WhatsApp ──────────────────────────────────────────

async function sendWhatsAppAudio(to: string, mediaId: string): Promise<boolean> {
  if (!WHATSAPP_API_TOKEN) return false;
  const url = `https://graph.facebook.com/v22.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`;
  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to,
    type: 'audio',
    audio: { id: mediaId },
  };
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${WHATSAPP_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    const data = await response.text();
    console.log('[whatsapp] Meta send audio response status:', response.status, data);
    return response.ok;
  } catch (err) {
    console.error('[whatsapp] Network error sending audio to WhatsApp:', err);
    return false;
  }
}

// ── Synthèse Vocale NutriFYS via Google Gemini Audio Natif ───────────────────

async function generateGeminiSpeech(text: string, apiKey: string): Promise<Buffer | null> {
  try {
    const cleanText = text
      .replace(/:::PROFILE_JSON[\s\S]*?:::?/g, '')
      .replace(/:::ORDER_JSON[\s\S]*?:::?/g, '')
      .replace(/[*_~`#]/g, '')
      .replace(/•/g, ', ')
      .replace(/\s+/g, ' ')
      .trim();

    if (!cleanText) return null;

    // Prendre jusqu'à 450 caractères pour un message vocal naturel et percutant
    const spokenText = cleanText.length > 500
      ? cleanText.substring(0, 480) + '... Je vous ai mis tous les détails par écrit juste en dessous !'
      : cleanText;

    const ttsUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${apiKey}`;
    const res = await fetch(ttsUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: spokenText }] }],
        generationConfig: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: 'Kore',
              },
            },
          },
        },
      }),
    });

    if (!res.ok) {
      console.warn('[whatsapp-voice] Gemini TTS returned status:', res.status, await res.text());
      return null;
    }

    const data = await res.json();
    const base64Audio = data.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) return null;

    const pcmBuffer = Buffer.from(base64Audio, 'base64');
    return await pcmToMp3(pcmBuffer, 24000, 1);
  } catch (err) {
    console.error('[whatsapp-voice] Failed to generate Gemini speech:', err);
    return null;
  }
}

// ── Téléversement de document PDF vers l'API Media de Meta ────────────────────

async function uploadWhatsAppDocument(pdfBuffer: Buffer, filename: string): Promise<string | null> {
  if (!WHATSAPP_API_TOKEN) {
    console.error('[whatsapp] WHATSAPP_API_TOKEN is missing for document upload');
    return null;
  }
  const url = `https://graph.facebook.com/v22.0/${WHATSAPP_PHONE_NUMBER_ID}/media`;
  try {
    const formData = new FormData();
    formData.append('messaging_product', 'whatsapp');
    formData.append('type', 'application/pdf');
    const blob = new Blob([new Uint8Array(pdfBuffer)], { type: 'application/pdf' });
    formData.append('file', blob, filename);

    const response = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${WHATSAPP_API_TOKEN}` },
      body: formData,
    });
    const responseText = await response.text();
    console.log(`[whatsapp] Upload PDF media (${filename}) response: status ${response.status}:`, responseText);

    const db = getAdminDb();
    if (db) {
      await db.collection('meta_debug_logs').add({
        action: 'uploadWhatsAppDocument',
        filename,
        bufferSize: pdfBuffer.length,
        status: response.status,
        responseText,
        createdAt: FieldValue.serverTimestamp(),
      }).catch(() => null);
    }

    if (!response.ok) {
      console.error('[whatsapp] Upload PDF media failed:', response.status, responseText);
      return null;
    }
    const data = JSON.parse(responseText);
    console.log(`[whatsapp] PDF document ${filename} uploaded to Meta with media ID:`, data.id);
    return data.id || null;
  } catch (err: any) {
    console.error(`[whatsapp] Error uploading PDF ${filename} to Meta:`, err);
    const db = getAdminDb();
    if (db) {
      await db.collection('meta_debug_logs').add({
        action: 'uploadWhatsAppDocument_error',
        filename,
        error: err?.message || String(err),
        stack: err?.stack || null,
        createdAt: FieldValue.serverTimestamp(),
      }).catch(() => null);
    }
    return null;
  }
}

// ── Envoi de document PDF via WhatsApp ────────────────────────────────────────

async function sendWhatsAppDocument(to: string, mediaId: string, filename: string, caption?: string): Promise<boolean> {
  if (!WHATSAPP_API_TOKEN) return false;
  const url = `https://graph.facebook.com/v22.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`;
  const payload: any = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to,
    type: 'document',
    document: {
      id: mediaId,
      filename,
    },
  };
  if (caption && caption.trim().length > 0) {
    payload.document.caption = sanitizeProfessionalCustomerServiceText(caption.trim());
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${WHATSAPP_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    const responseText = await response.text();
    console.log(`[whatsapp] Meta send document (${filename}) response status:`, response.status, responseText);

    const db = getAdminDb();
    if (db) {
      await db.collection('meta_debug_logs').add({
        action: 'sendWhatsAppDocument',
        to,
        mediaId,
        filename,
        status: response.status,
        responseText,
        createdAt: FieldValue.serverTimestamp(),
      }).catch(() => null);
    }

    return response.ok;
  } catch (err: any) {
    console.error(`[whatsapp] Network error sending document (${filename}) to WhatsApp:`, err);
    const db = getAdminDb();
    if (db) {
      await db.collection('meta_debug_logs').add({
        action: 'sendWhatsAppDocument_error',
        to,
        filename,
        error: err?.message || String(err),
        stack: err?.stack || null,
        createdAt: FieldValue.serverTimestamp(),
      }).catch(() => null);
    }
    return false;
  }
}

// ── Générateurs de Buffers PDF pour Facture et Fiche Nutritionnelle ───────────

async function generateOrderFacturePdfBuffer(order: any, ingredientsStr?: string): Promise<Buffer | null> {
  try {
    const pdfPkg = await import('@react-pdf/renderer');
    const React = await import('react');
    const { Document, Page, View, Text, Image, StyleSheet, renderToBuffer } = pdfPkg;

    const PRIMARY = '#16A34A';
    const MUTED = '#6B7280';
    const BORDER = '#E5E7EB';
    const BGCARD = '#F9FAFB';
    const TEXT = '#111827';
    const WHITE = '#FFFFFF';

    const styles = StyleSheet.create({
      page: { fontFamily: 'Helvetica', fontSize: 10, color: TEXT, backgroundColor: WHITE, padding: 40 },
      header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 },
      logo: { width: 95, height: 56, marginBottom: 4 },
      brand: { fontSize: 28, fontFamily: 'Helvetica-Bold', color: PRIMARY, letterSpacing: -1 },
      dot: { color: '#22D3EE' },
      tagline: { fontSize: 8.5, color: MUTED, marginTop: 2 },
      meta: { alignItems: 'flex-end' },
      metaTitle: { fontSize: 18, fontFamily: 'Helvetica-Bold', color: TEXT, marginBottom: 4 },
      metaRef: { fontSize: 8, color: MUTED },
      badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20, marginTop: 6 },
      badgeText: { fontSize: 8, fontFamily: 'Helvetica-Bold' },
      divider: { borderBottomWidth: 1, borderBottomColor: BORDER, marginVertical: 20 },
      sectionTitle: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: MUTED, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 },
      card: { backgroundColor: BGCARD, borderRadius: 8, padding: 14, marginBottom: 16 },
      row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
      rowLast: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
      label: { fontSize: 10, color: MUTED },
      value: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: TEXT },
      totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F0FDF4', borderRadius: 8, padding: 12, marginTop: 8 },
      totalLabel: { fontSize: 13, fontFamily: 'Helvetica-Bold', color: TEXT },
      totalValue: { fontSize: 16, fontFamily: 'Helvetica-Bold', color: PRIMARY },
      addrRow: { flexDirection: 'row', marginBottom: 6 },
      addrKey: { fontSize: 9, color: MUTED, width: 90 },
      addrVal: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: TEXT, flex: 1 },
      cols: { flexDirection: 'row', gap: 12 },
      col: { flex: 1 },
      footer: { position: 'absolute', bottom: 24, left: 40, right: 40, flexDirection: 'row', justifyContent: 'space-between' },
      footerText: { fontSize: 8, color: MUTED },
    });

    const statusCfg = { bg: '#FEF9C3', text: '#854D0E' };
    const statusLabel = 'En attente';

    const createdDate = order.createdAt?.toDate ? order.createdAt.toDate() : new Date();
    const dateStr = createdDate.toLocaleString('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const subtotal = order.orderLines?.length
      ? order.orderLines.reduce((sum: number, line: any) => sum + (Number(line.lineTotal) || 0), 0)
      : (order.cocktailPriceSnapshot || 0) * (order.quantity || 1);

    const shortId = (order.id || 'ORDER').slice(0, 8).toUpperCase();

    const doc = React.createElement(
      Document,
      { title: `Facture — ${shortId}`, author: 'NutriFYS' },
      React.createElement(
        Page,
        { size: 'A4', style: styles.page },
        React.createElement(
          View,
          { style: styles.header },
          React.createElement(
            View,
            null,
            React.createElement(Image, { src: FYS_LOGO_BASE64, style: styles.logo }),
            React.createElement(Text, { style: styles.tagline }, 'Boissons Santé Artisanales · Yaoundé')
          ),
          React.createElement(
            View,
            { style: styles.meta },
            React.createElement(Text, { style: styles.metaTitle }, 'FACTURE OFFICIELLE'),
            React.createElement(Text, { style: styles.metaRef }, `N° ${shortId}`),
            React.createElement(Text, { style: styles.metaRef }, `Émise le ${dateStr}`),
            React.createElement(
              View,
              { style: [styles.badge, { backgroundColor: statusCfg.bg }] },
              React.createElement(Text, { style: [styles.badgeText, { color: statusCfg.text }] }, statusLabel)
            )
          )
        ),
        React.createElement(View, { style: styles.divider }),
        React.createElement(
          View,
          { style: styles.cols },
          React.createElement(
            View,
            { style: styles.col },
            React.createElement(Text, { style: styles.sectionTitle }, 'CLIENT'),
            React.createElement(
              View,
              { style: styles.card },
              React.createElement(Text, { style: [styles.value, { marginBottom: 4 }] }, order.userNameSnapshot || 'Client'),
              order.userEmailSnapshot ? React.createElement(Text, { style: styles.label }, order.userEmailSnapshot) : null,
              order.userPhoneSnapshot ? React.createElement(Text, { style: [styles.label, { marginTop: 2 }] }, order.userPhoneSnapshot) : null
            )
          ),
          order.deliveryDetails
            ? React.createElement(
                View,
                { style: styles.col },
                React.createElement(Text, { style: styles.sectionTitle }, 'LIVRAISON'),
                React.createElement(
                  View,
                  { style: styles.card },
                  React.createElement(
                    View,
                    { style: styles.addrRow },
                    React.createElement(Text, { style: styles.addrKey }, 'Quartier'),
                    React.createElement(Text, { style: styles.addrVal }, order.deliveryDetails.district || 'Yaoundé')
                  ),
                  React.createElement(
                    View,
                    { style: styles.addrRow },
                    React.createElement(Text, { style: styles.addrKey }, 'Téléphone'),
                    React.createElement(Text, { style: styles.addrVal }, order.deliveryDetails.phone || order.userPhoneSnapshot || '—')
                  ),
                  order.deliveryDetails.instructions
                    ? React.createElement(
                        View,
                        { style: styles.addrRow },
                        React.createElement(Text, { style: styles.addrKey }, 'Indications'),
                        React.createElement(Text, { style: styles.addrVal }, order.deliveryDetails.instructions)
                      )
                    : null
                )
              )
            : null
        ),
        React.createElement(Text, { style: [styles.sectionTitle, { marginTop: 8 }] }, 'DÉTAIL DE LA COMMANDE'),
        React.createElement(
          View,
          { style: styles.card },
          React.createElement(
            View,
            { style: [styles.row, { borderBottomWidth: 1, borderBottomColor: BORDER, paddingBottom: 6, marginBottom: 8 }] },
            React.createElement(Text, { style: [styles.label, { fontSize: 8, textTransform: 'uppercase' }] }, 'PRODUIT'),
            React.createElement(Text, { style: [styles.label, { fontSize: 8, textTransform: 'uppercase' }] }, 'QTÉ'),
            React.createElement(Text, { style: [styles.label, { fontSize: 8, textTransform: 'uppercase' }] }, 'P.U.'),
            React.createElement(Text, { style: [styles.label, { fontSize: 8, textTransform: 'uppercase' }] }, 'TOTAL')
          ),
          order.orderLines?.length
            ? order.orderLines.map((line: any, i: number) =>
                React.createElement(
                  View,
                  { key: i, style: [{ marginBottom: 6 }] },
                  React.createElement(
                    View,
                    { style: [styles.row, { marginBottom: 2 }] },
                    React.createElement(Text, { style: [styles.value, { flex: 2 }] }, `${line.cocktailName || order.cocktailNameSnapshot || 'Cocktail Santé'} · ${line.bottleSizeLabel || '1 L'}`),
                    React.createElement(Text, { style: [styles.value, { width: 30, textAlign: 'center' }] }, String(line.quantity || 1)),
                    React.createElement(Text, { style: [styles.value, { width: 70, textAlign: 'right' }] }, `${Number(line.pricePerBottle || line.unitPrice || 0).toLocaleString()} XAF`),
                    React.createElement(Text, { style: [styles.value, { width: 80, textAlign: 'right' }] }, `${Number(line.lineTotal || 0).toLocaleString()} XAF`)
                  ),
                  line.fruits?.length
                    ? React.createElement(
                        Text,
                        { style: [styles.label, { fontSize: 8, fontStyle: 'italic', paddingLeft: 4 }] },
                        `Fruits : ${Array.isArray(line.fruits) ? line.fruits.join(', ') : line.fruits}`
                      )
                    : null
                )
              )
            : React.createElement(
                View,
                { style: [styles.row, { marginBottom: 2 }] },
                React.createElement(Text, { style: [styles.value, { flex: 2 }] }, `${order.cocktailNameSnapshot || 'Cocktail Santé'} · ${order.bottleSizeLabel || '500 ml'}`),
                React.createElement(Text, { style: [styles.value, { width: 30, textAlign: 'center' }] }, String(order.quantity || 1)),
                React.createElement(Text, { style: [styles.value, { width: 70, textAlign: 'right' }] }, `${Number(order.cocktailPriceSnapshot || 0).toLocaleString()} XAF`),
                React.createElement(Text, { style: [styles.value, { width: 80, textAlign: 'right' }] }, `${subtotal.toLocaleString()} XAF`)
              ),
          ingredientsStr
            ? React.createElement(
                View,
                { style: styles.row },
                React.createElement(Text, { style: [styles.label, { flex: 2, fontSize: 8, fontStyle: 'italic' }] }, `Composition : ${ingredientsStr}`)
              )
            : null,
          React.createElement(
            View,
            { style: styles.row },
            React.createElement(
              Text,
              { style: [styles.label, { flex: 2, fontSize: 8, fontStyle: 'italic' }] },
              order.hasAddedSugar ? 'Option : Avec sucre ajouté' : 'Option : 100% Naturel (Sans sucre ajouté)'
            )
          )
        ),
        React.createElement(Text, { style: styles.sectionTitle }, 'RÉCAPITULATIF'),
        React.createElement(
          View,
          { style: styles.card },
          React.createElement(
            View,
            { style: styles.row },
            React.createElement(Text, { style: styles.label }, 'Sous-total'),
            React.createElement(Text, { style: styles.value }, `${subtotal.toLocaleString()} XAF`)
          ),
          React.createElement(
            View,
            { style: styles.rowLast },
            React.createElement(Text, { style: styles.label }, 'Livraison'),
            React.createElement(Text, { style: styles.value }, `${(Number(order.deliveryFee) || 1000).toLocaleString()} XAF`)
          )
        ),
        React.createElement(
          View,
          { style: styles.totalRow },
          React.createElement(Text, { style: styles.totalLabel }, 'TOTAL À PAYER'),
          React.createElement(Text, { style: styles.totalValue }, `${(Number(order.totalPrice) || (subtotal + 1000)).toLocaleString()} XAF`)
        ),
        React.createElement(
          View,
          { style: styles.footer },
          React.createElement(Text, { style: styles.footerText }, '« Tu sais ce que tu bois » · fys-app.com'),
          React.createElement(Text, { style: styles.footerText }, 'Merci de votre confiance !')
        )
      )
    );

    const buffer = await renderToBuffer(doc as any);
    return buffer as Buffer;
  } catch (err: any) {
    console.error('[whatsapp] Failed to generate Facture PDF buffer:', err);
    const db = getAdminDb();
    if (db) {
      await db.collection('meta_debug_logs').add({
        action: 'generateOrderFacturePdfBuffer_error',
        orderId: order?.id || 'unknown',
        error: err?.message || String(err),
        stack: err?.stack || null,
        createdAt: FieldValue.serverTimestamp(),
      }).catch(() => null);
    }
    return null;
  }
}

async function generateOrderNutritionPdfBuffer(
  analysis: any,
  cocktailName?: string,
  userName?: string,
  ingredients?: string[]
): Promise<Buffer | null> {
  try {
    const pdfPkg = await import('@react-pdf/renderer');
    const React = await import('react');
    const { Document, Page, View, Text, Image, StyleSheet, renderToBuffer } = pdfPkg;

    const PRIMARY = '#16A34A';
    const MUTED = '#6B7280';
    const BORDER = '#E5E7EB';
    const BGCARD = '#F9FAFB';
    const TEXT = '#111827';
    const WHITE = '#FFFFFF';

    const styles = StyleSheet.create({
      page: { fontFamily: 'Helvetica', fontSize: 10, color: TEXT, backgroundColor: WHITE, padding: 40 },
      header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 },
      logo: { width: 95, height: 56, marginBottom: 4 },
      brand: { fontSize: 24, fontFamily: 'Helvetica-Bold', color: PRIMARY },
      dot: { color: '#22D3EE' },
      tagline: { fontSize: 8.5, color: MUTED, marginTop: 2 },
      metaTitle: { fontSize: 16, fontFamily: 'Helvetica-Bold', color: TEXT, textAlign: 'right' },
      metaSub: { fontSize: 9, color: MUTED, textAlign: 'right', marginTop: 2 },
      divider: { borderBottomWidth: 1, borderBottomColor: BORDER, marginVertical: 16 },
      scoreHero: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 20 },
      scoreBig: { fontSize: 48, fontFamily: 'Helvetica-Bold', color: PRIMARY },
      scoreLabel: { fontSize: 11, color: MUTED },
      badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
      badgeText: { fontSize: 9, fontFamily: 'Helvetica-Bold' },
      sectionTitle: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: MUTED, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 },
      card: { backgroundColor: BGCARD, borderRadius: 8, padding: 14, marginBottom: 14 },
      noteText: { fontSize: 10, lineHeight: 1.6, color: TEXT },
      nutriRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: BORDER },
      nutriLabel: { fontSize: 10, color: TEXT },
      nutriRight: { flexDirection: 'row', gap: 12, alignItems: 'center' },
      nutriVal: { fontSize: 10, color: MUTED },
      nutriPct: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: PRIMARY, width: 42, textAlign: 'right' },
      barBg: { height: 6, backgroundColor: BORDER, borderRadius: 3, width: 80, marginLeft: 8 },
      barFill: { height: 6, borderRadius: 3, backgroundColor: PRIMARY },
      benefitsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 14 },
      chip: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 20 },
      chipText: { fontSize: 9, fontFamily: 'Helvetica-Bold' },
      bullet: { flexDirection: 'row', marginBottom: 6 },
      bulletDot: { fontSize: 12, color: PRIMARY, width: 14, marginTop: -2 },
      bulletText: { fontSize: 10, lineHeight: 1.5, color: MUTED, flex: 1 },
      conseilCard: { backgroundColor: '#F0FDF4', borderRadius: 8, padding: 14, borderLeftWidth: 3, borderLeftColor: PRIMARY },
      conseilText: { fontSize: 10, lineHeight: 1.5, color: '#065F46' },
      footer: { position: 'absolute', bottom: 24, left: 40, right: 40, flexDirection: 'row', justifyContent: 'space-between' },
      footerText: { fontSize: 8, color: MUTED },
    });

    const verdictLabel = 'Bénéfique';
    const verdictCfg = { bg: '#DCFCE7', text: '#15803D' };

    const nutrients: [string, { pourcentage: number; valeur: string }][] = analysis?.profilNutritionnel
      ? Object.entries(analysis.profilNutritionnel)
          .filter(([, v]) => v && typeof v === 'object') as any
      : [];

    const nutrientLabels: Record<string, string> = {
      vitamineC: 'Vitamine C',
      vitamineA: 'Vitamine A',
      fibres: 'Fibres alimentaires',
      potassium: 'Potassium',
      sucresNaturels: 'Glucides & Sucres naturels',
      antioxydants: 'Antioxydants (Polyphénols)',
    };

    const niveauColors: Record<string, string> = {
      faible: '#FCA5A5',
      modéré: '#FDE68A',
      élevé: '#6EE7B7',
    };

    const doc = React.createElement(
      Document,
      { title: `Fiche Nutritionnelle — ${cocktailName || 'Cocktail Santé'}`, author: 'NutriFYS' },
      React.createElement(
        Page,
        { size: 'A4', style: styles.page },
        React.createElement(
          View,
          { style: styles.header },
          React.createElement(
            View,
            null,
            React.createElement(Image, { src: FYS_LOGO_BASE64, style: styles.logo }),
            React.createElement(Text, { style: styles.tagline }, 'NutriFYS — Votre nutritionniste de poche')
          ),
          React.createElement(
            View,
            null,
            React.createElement(Text, { style: styles.metaTitle }, 'FICHE NUTRITIONNELLE'),
            React.createElement(Text, { style: styles.metaSub }, cocktailName || 'Cocktail Santé'),
            userName ? React.createElement(Text, { style: [styles.metaSub, { marginTop: 4, fontFamily: 'Helvetica-Bold', color: TEXT }] }, userName) : null,
            ingredients && ingredients.length > 0 ? React.createElement(Text, { style: styles.metaSub }, ingredients.join(' · ')) : null
          )
        ),
        React.createElement(View, { style: styles.divider }),
        React.createElement(
          View,
          { style: styles.scoreHero },
          React.createElement(Text, { style: styles.scoreBig }, String(analysis?.score || calculateDeterministicHealthScore(ingredients || [], false).score)),
          React.createElement(
            View,
            null,
            React.createElement(Text, { style: styles.scoreLabel }, 'Score Santé FYS / 100'),
            React.createElement(
              View,
              { style: [styles.badge, { backgroundColor: verdictCfg.bg, marginTop: 6 }] },
              React.createElement(Text, { style: [styles.badgeText, { color: verdictCfg.text }] }, verdictLabel)
            )
          )
        ),
        React.createElement(Text, { style: styles.sectionTitle }, 'ANALYSE DE VOTRE NUTRITIONNISTE'),
        React.createElement(
          View,
          { style: styles.card },
          React.createElement(Text, { style: styles.noteText }, analysis?.notes || 'Synergie nutritionnelle riche en antioxydants et micronutriments.')
        ),
        nutrients.length > 0
          ? React.createElement(
              React.Fragment,
              null,
              React.createElement(Text, { style: styles.sectionTitle }, 'PROFIL NUTRITIONNEL CLÉ'),
              React.createElement(
                View,
                { style: styles.card },
                nutrients.map(([key, info]) =>
                  React.createElement(
                    View,
                    { key, style: styles.nutriRow },
                    React.createElement(Text, { style: styles.nutriLabel }, nutrientLabels[key] || key),
                    React.createElement(
                      View,
                      { style: styles.nutriRight },
                      React.createElement(Text, { style: styles.nutriVal }, info.valeur),
                      React.createElement(
                        View,
                        { style: styles.barBg },
                        React.createElement(View, { style: [styles.barFill, { width: `${Math.min(info.pourcentage, 100)}%` }] })
                      ),
                      React.createElement(Text, { style: styles.nutriPct }, `${info.pourcentage}% AJR`)
                    )
                  )
                )
              )
            )
          : null,
        Array.isArray(analysis?.beneficesCibles) && analysis.beneficesCibles.length > 0
          ? React.createElement(
              React.Fragment,
              null,
              React.createElement(Text, { style: styles.sectionTitle }, 'BÉNÉFICES CIBLÉS'),
              React.createElement(
                View,
                { style: styles.benefitsRow },
                analysis.beneficesCibles.map((b: any, i: number) =>
                  React.createElement(
                    View,
                    { key: i, style: [styles.chip, { backgroundColor: niveauColors[b.niveau] || BGCARD }] },
                    React.createElement(Text, { style: [styles.chipText, { color: TEXT }] }, `⚡ ${b.nom} (${b.niveau || 'élevé'})`)
                  )
                )
              )
            )
          : null,
        Array.isArray(analysis?.interactionsFruits) && analysis.interactionsFruits.length > 0
          ? React.createElement(
              React.Fragment,
              null,
              React.createElement(Text, { style: styles.sectionTitle }, 'SYNERGIE DES FRUITS'),
              React.createElement(
                View,
                { style: styles.card },
                analysis.interactionsFruits.map((item: string, i: number) =>
                  React.createElement(
                    View,
                    { key: i, style: styles.bullet },
                    React.createElement(Text, { style: styles.bulletDot }, '•'),
                    React.createElement(Text, { style: styles.bulletText }, item)
                  )
                )
              )
            )
          : null,
        analysis?.conseil
          ? React.createElement(
              React.Fragment,
              null,
              React.createElement(Text, { style: styles.sectionTitle }, 'CONSEIL DE CONSOMMATION'),
              React.createElement(
                View,
                { style: styles.conseilCard },
                React.createElement(Text, { style: styles.conseilText }, analysis.conseil)
              )
            )
          : null,
        React.createElement(
          View,
          { style: styles.footer },
          React.createElement(Text, { style: styles.footerText }, 'NutriFYS — Votre nutritionniste de poche'),
          React.createElement(Text, { style: styles.footerText }, 'Consultez un professionnel de santé pour toute question médicale.')
        )
      )
    );

    const buffer = await renderToBuffer(doc as any);
    return buffer as Buffer;
  } catch (err: any) {
    console.error('[whatsapp] Failed to generate Nutrition PDF buffer:', err);
    const db = getAdminDb();
    if (db) {
      await db.collection('meta_debug_logs').add({
        action: 'generateOrderNutritionPdfBuffer_error',
        cocktailName: cocktailName || 'unknown',
        error: err?.message || String(err),
        stack: err?.stack || null,
        createdAt: FieldValue.serverTimestamp(),
      }).catch(() => null);
    }
    return null;
  }
}

export function calculateDeterministicHealthScore(
  fruitNames: string[],
  hasSugar: boolean,
  healthConditions?: string[]
): { score: number; verdict: 'beneficial' | 'neutral' | 'caution' } {
  let score = 78;
  const lowerFruits = fruitNames.map((f) => f.toLowerCase());
  const conditions = (healthConditions || []).map((c) => c.toLowerCase());

  // Boosters de vitalité / antioxydants
  const hasAntioxidantBooster = lowerFruits.some((f) =>
    f.includes('gingembre') || f.includes('foléré') || f.includes('bissap') || f.includes('curcuma') || f.includes('baobab') || f.includes('corossol')
  );
  if (hasAntioxidantBooster) score += 7;

  // Richesse en vitamine C / enzymes digestives
  const hasVitCEnzyme = lowerFruits.some((f) =>
    f.includes('citron') || f.includes('ananas') || f.includes('papaye') || f.includes('orange') || f.includes('cassimango')
  );
  if (hasVitCEnzyme) score += 5;

  // Synergie multi-fruits (2 à 3 fruits variés)
  if (fruitNames.length >= 2 && fruitNames.length <= 4) {
    score += 4;
  } else if (fruitNames.length === 1) {
    score -= 4;
  }

  // Hydratation & fibres
  const hasFibersHydration = lowerFruits.some((f) =>
    f.includes('concombre') || f.includes('carotte') || f.includes('pomme') || f.includes('pasteque')
  );
  if (hasFibersHydration) score += 2;

  // Pénalité sucre ajouté
  if (hasSugar) {
    score -= 16;
  }

  // Conditions de santé spécifiques
  if (conditions.some((c) => c.includes('diab') || c.includes('glyc'))) {
    const highSugarFruits = lowerFruits.filter((f) =>
      f.includes('mangue') || f.includes('banane') || f.includes('raisin')
    );
    if (highSugarFruits.length >= 2) {
      score -= 14;
    }
  }

  if (conditions.some((c) => c.includes('ulc') || c.includes('gastr') || c.includes('acid'))) {
    const highAcidFruits = lowerFruits.filter((f) =>
      f.includes('citron') || f.includes('ananas')
    );
    if (highAcidFruits.length >= 2) {
      score -= 12;
    }
  }

  // Borner entre 55 et 97
  score = Math.min(97, Math.max(55, score));

  let verdict: 'beneficial' | 'neutral' | 'caution' = 'beneficial';
  if (score < 70) {
    verdict = 'caution';
  } else if (score < 80) {
    verdict = 'neutral';
  }

  return { score, verdict };
}

async function resolveOrGenerateNutritionAnalysis(
  cocktailName: string,
  fruitNames: string[],
  hasSugar: boolean,
  existingSnapshot?: any,
  apiKey?: string,
  healthConditions?: string[]
): Promise<any> {
  const dynamicFallback = calculateDeterministicHealthScore(fruitNames, hasSugar, healthConditions);

  // 1. Analyse existante (panier web ou commande convertie)
  if (
    existingSnapshot &&
    existingSnapshot.profilNutritionnel &&
    typeof existingSnapshot.score === 'number'
  ) {
    return {
      verdict: existingSnapshot.verdict || dynamicFallback.verdict,
      score: existingSnapshot.score || dynamicFallback.score,
      notes: existingSnapshot.notes || `Cocktail santé équilibré et riche en nutriments essentiels.`,
      profilNutritionnel: existingSnapshot.profilNutritionnel,
      beneficesCibles: Array.isArray(existingSnapshot.beneficesCibles) ? existingSnapshot.beneficesCibles : [],
      interactionsFruits: Array.isArray(existingSnapshot.interactionsFruits) ? existingSnapshot.interactionsFruits : [],
      conseil: existingSnapshot.conseil || 'À déguster bien frais pour une biodisponibilité optimale.',
      analyzedAt: existingSnapshot.analyzedAt || { toDate: () => new Date() },
    };
  }

  // 2. Génération rapide par Gemini si disponible
  if (apiKey) {
    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({
        model: 'gemini-3.5-flash-lite',
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 800,
          responseMimeType: 'application/json',
        },
      });

      const prompt = `Tu es NutriFYS, expert en nutrition personnalisée chez FYS.
Génère l'analyse nutritionnelle pour ce cocktail de fruits :
- Nom : ${cocktailName}
- Fruits : ${fruitNames.join(', ')}
- Sucre ajouté : ${hasSugar ? 'Oui' : 'Non (100% naturel)'}

RÈGLE DU SCORE SANTÉ :
Calcule un score entier réaliste entre 55 et 97 basé sur la composition réelle de ce cocktail (NE METS JAMAIS 92 PAR DÉFAUT !) :
- Synergie antioxydante et vitaminée remarquable sans sucre : 88 à 96
- Bon mélange fruité équilibré et digeste : 80 à 87
- Mélange très riche en sucres naturels ou mono-fruit : 70 à 79
- Mélange avec sucre ajouté ou acidité déséquilibrée : 55 à 69

Renvoie UNIQUEMENT un objet JSON avec cette structure :
{
  "verdict": "beneficial" | "neutral" | "caution",
  "score": <entier calculé entre 55 et 97>,
  "notes": "Courte synthèse nutritionnelle en 2 phrases valorisant les bienfaits concrets de cette synergie de fruits frais.",
  "profilNutritionnel": {
    "vitamineC": { "pourcentage": 85, "valeur": "70 mg" },
    "vitamineA": { "pourcentage": 35, "valeur": "280 µg" },
    "fibres": { "pourcentage": 28, "valeur": "5.6 g" },
    "potassium": { "pourcentage": 32, "valeur": "440 mg" },
    "sucresNaturels": { "pourcentage": 16, "valeur": "17 g" },
    "antioxydants": { "pourcentage": 88, "valeur": "Élevé" }
  },
  "beneficesCibles": [
    { "nom": "Immunité & Tonus", "niveau": "élevé" },
    { "nom": "Confort digestif", "niveau": "élevé" }
  ],
  "interactionsFruits": [
    "Synergie bénéfique entre les fruits sélectionnés pour une absorption accrue",
    "Richesse en antioxydants protecteurs cellulaires"
  ],
  "conseil": "À consommer bien frais le matin pour maximiser l'énergie."
}`;

      const res = await Promise.race([
        model.generateContent(prompt),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Timeout analysis')), 4000)),
      ]);

      const text = res.response.text();
      const parsed = parseSafeJson<any>(text);
      if (parsed && parsed.score && parsed.profilNutritionnel) {
        return {
          verdict: parsed.verdict || dynamicFallback.verdict,
          score: Math.min(100, Math.max(0, Number(parsed.score) || dynamicFallback.score)),
          notes: parsed.notes || `Synergie fruitée conçue sur-mesure pour votre vitalité.`,
          profilNutritionnel: parsed.profilNutritionnel,
          beneficesCibles: Array.isArray(parsed.beneficesCibles) ? parsed.beneficesCibles : [],
          interactionsFruits: Array.isArray(parsed.interactionsFruits) ? parsed.interactionsFruits : [],
          conseil: parsed.conseil || 'À consommer bien frais.',
          analyzedAt: { toDate: () => new Date() },
        };
      }
    } catch (e) {
      console.warn('[whatsapp] Fast Gemini nutrition generation bypassed, using deterministic profile:', e);
    }
  }

  // 3. Fallback déterministe scientifique (0ms de latence, 100% robuste)
  const fruitsJoined = fruitNames.length > 0 ? fruitNames.join(', ') : 'Fruits frais de saison';
  return {
    verdict: dynamicFallback.verdict,
    score: dynamicFallback.score,
    notes: `Ce cocktail artisanal ${cocktailName} associant ${fruitsJoined} offre un apport équilibré en vitamines et micronutriments protecteurs pour soutenir votre vitalité et votre bien-être au quotidien.`,
    profilNutritionnel: {
      vitamineC: { pourcentage: 82, valeur: '74 mg' },
      vitamineA: { pourcentage: 40, valeur: '320 µg' },
      fibres: { pourcentage: 26, valeur: '5.2 g' },
      potassium: { pourcentage: 30, valeur: '420 mg' },
      sucresNaturels: { pourcentage: 16, valeur: '18 g' },
      antioxydants: { pourcentage: 88, valeur: 'Élevé' },
    },
    beneficesCibles: [
      { nom: 'Immunité & Vitalité', niveau: 'élevé' },
      { nom: 'Hydratation active', niveau: 'élevé' },
      { nom: 'Confort digestif', niveau: 'modéré' },
    ],
    interactionsFruits: [
      `Synergie naturelle favorisant l'assimilation des micronutriments essentiels`,
      `Haute concentration en polyphénols antioxydants protecteurs`,
    ],
    conseil: 'À déguster bien frais de préférence le matin ou après un effort pour une assimilation maximale.',
    analyzedAt: { toDate: () => new Date() },
  };
}

// ── Interfaces & Moteur de Calcul Déterministe du Panier (Cart Multi-Articles) ──

export interface WhatsAppCartItem {
  id: string;
  cocktailName: string;
  fruits: string[];
  ingredients: Array<{
    fruitId: string;
    fruitName: string;
    priceSnapshot: number;
    isSupplement?: boolean;
    incompatibleIds?: string[];
  }>;
  bottleSize: string;
  bottleSizeLabel: string;
  quantity: number;
  baseBottlePrice: number;
  ingredientsPriceSum: number;
  unitPrice: number;
  lineTotal: number;
  hasAddedSugar?: boolean;
  isCatalog?: boolean;
  catalogCocktailId?: string;
  imageUrl?: string;
}

export interface WhatsAppCart {
  items: WhatsAppCartItem[];
  subtotal: number;
  deliveryFee: number;
  totalPrice: number;
  totalCatalogBottles?: number;
  isCatalogMinimumMet?: boolean;
  hasExplicitFormat?: boolean;
  district?: string;
  updatedAt: number;
}

export function cleanForFirestore<T>(data: T): T {
  try {
    return JSON.parse(JSON.stringify(data));
  } catch (_) {
    return data;
  }
}

async function saveActiveWhatsAppCart(docRef: any, cart: WhatsAppCart | null) {
  if (!docRef) return;
  try {
    if (cart) {
      await docRef.set({ activeWhatsAppCart: cleanForFirestore(cart) }, { merge: true });
    } else {
      await docRef.set({ activeWhatsAppCart: FieldValue.delete() }, { merge: true });
    }
  } catch (err) {
    console.warn('[whatsapp-webhook] Failed to save activeWhatsAppCart:', err);
  }
}

export const normalizeTextForMatching = (s: string): string =>
  (s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[*_~`]/g, '');

export const escapeRegexString = (s: string): string =>
  s.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');

export const FRUIT_TYPO_SYNONYMS: Record<string, string[]> = {
  gingembre: ['gingembre', 'gingimbre', 'ginginbre', 'gingenbre', 'ginger', 'dja'],
  folere: ['folere', 'foléré', 'bissap', 'hibiscus', 'zobo'],
  coco: ['coco', 'noix de coco', 'lait de coco', 'eau de coco'],
  pasteque: ['pasteque', 'pastèque', 'pasteques', 'pastèques', "melon d'eau"],
  cassimango: ['cassimango', 'cassimangue', 'prune de cythere', 'prune de cythère', 'cythere', 'cythère'],
  baobab: ['baobab', 'pain de singe', 'bouye'],
  corossol: ['corossol', 'corosol', 'graviola', 'soursop'],
  passion: ['passion', 'maracuja', 'maracudja', 'fruit de la passion'],
  curcuma: ['curcuma', 'turmeric', 'safran des indes'],
  citron: ['citron', 'citrons', 'citron vert', 'lime'],
  betterave: ['betterave', 'betteraves'],
  carotte: ['carotte', 'carottes'],
  concombre: ['concombre', 'concombres'],
  ananas: ['ananas', 'anana', 'anas'],
  orange: ['orange', 'oranges'],
  banane: ['banane', 'bananes'],
  pomme: ['pomme', 'pommes'],
  mangue: ['mangue', 'mangues'],
  avocat: ['avocat', 'avocats'],
  papaye: ['papaye', 'papayes', 'papay'],
  menthe: ['menthe', 'menthes', 'mint', 'menthe fraiche', 'menthe fraîche'],
  epinard: ['epinard', 'épinard', 'epinards', 'épinards', 'spinach'],
  celeri: ['celeri', 'céleri', 'celeris', 'céleris', 'celery'],
  spiruline: ['spiruline', 'spirulina'],
  moringa: ['moringa'],
  persil: ['persil', 'parsley'],
  chia: ['chia', 'graines de chia'],
  fraise: ['fraise', 'fraises', 'strawberry'],
  kiwi: ['kiwi', 'kiwis'],
  pamplemousse: ['pamplemousse', 'pamplemousses', 'grapefruit', 'pomelo'],
  framboise: ['framboise', 'framboises', 'raspberry'],
  myrtille: ['myrtille', 'myrtilles', 'mure', 'mûre', 'mures', 'mûres', 'blueberry'],
  peche: ['peche', 'pêche', 'peches', 'pêches', 'peach'],
  abricot: ['abricot', 'abricots', 'apricot'],
  cerise: ['cerise', 'cerises', 'cherry'],
  raisin: ['raisin', 'raisins', 'grape'],
  melon: ['melon', 'melons'],
};

export function detectUnavailableFruitsInText(
  text: string,
  availableFruits: any[]
): string[] {
  if (!text || typeof text !== 'string') return [];
  const clean = normalizeTextForMatching(text);
  const unavailable: string[] = [];

  const knownUnavailable: Record<string, string[]> = {
    'Baobab': ['baobab', 'pain de singe', 'bouye'],
    'Fraise': ['fraise', 'fraises', 'strawberry'],
    'Kiwi': ['kiwi', 'kiwis'],
    'Pamplemousse (interdit)': ['pamplemousse', 'pamplemousses', 'grapefruit', 'pomelo'],
    'Framboise': ['framboise', 'framboises', 'raspberry'],
    'Myrtille': ['myrtille', 'myrtilles', 'mure', 'mûre', 'blueberry'],
    'Pêche': ['peche', 'pêche', 'peches', 'pêches', 'peach'],
    'Abricot': ['abricot', 'abricots', 'apricot'],
    'Cerise': ['cerise', 'cerises', 'cherry'],
  };

  for (const [fruitLabel, synonyms] of Object.entries(knownUnavailable)) {
    for (const syn of synonyms) {
      const reg = new RegExp(`(?:^|[\\s,;.!?'"()•\\-–—*+])${escapeRegexString(normalizeTextForMatching(syn))}(?:$|[\\s,;.!?'"()•\\-–—*+])`, 'i');
      if (reg.test(clean)) {
        if (!unavailable.includes(fruitLabel)) {
          unavailable.push(fruitLabel);
        }
        break;
      }
    }
  }

  // Vérifier également les fruits de FRUIT_TYPO_SYNONYMS non présents dans availableFruits
  if (Array.isArray(availableFruits) && availableFruits.length > 0) {
    for (const [key, synonyms] of Object.entries(FRUIT_TYPO_SYNONYMS)) {
      const isAvailable = availableFruits.some((af) => {
        const afNorm = normalizeTextForMatching(af.name || '');
        const afIdNorm = normalizeTextForMatching(af.id || '');
        return afNorm.includes(key) || afIdNorm.includes(key);
      });
      if (!isAvailable) {
        for (const syn of synonyms) {
          const reg = new RegExp(`(?:^|[\\s,;.!?'"()•\\-–—*+])${escapeRegexString(normalizeTextForMatching(syn))}(?:$|[\\s,;.!?'"()•\\-–—*+])`, 'i');
          if (reg.test(clean)) {
            const capitalized = key.charAt(0).toUpperCase() + key.slice(1);
            if (!unavailable.includes(capitalized) && !unavailable.some(u => u.toLowerCase().includes(key))) {
              unavailable.push(capitalized);
            }
            break;
          }
        }
      }
    }
  }

  return unavailable;
}

let currentActiveDeliveryZones: DeliveryZone[] = DEFAULT_DELIVERY_ZONES;

export function computeCartFromRawItems(
  rawItems: Array<{
    cocktailName?: string;
    fruits?: string[];
    bottleSize?: string;
    bottleSizeLabel?: string;
    quantity?: number;
    hasAddedSugar?: boolean;
    isCatalog?: boolean;
    catalogCocktailId?: string;
    imageUrl?: string;
    unitPrice?: number;
  }>,
  availableFruits: any[],
  bottle500Base: number,
  bottle1LBase: number,
  existingDistrict?: string,
  existingCart?: WhatsAppCart | null,
  deliveryZones: DeliveryZone[] = currentActiveDeliveryZones
): WhatsAppCart {
  const items: WhatsAppCartItem[] = [];

  rawItems.forEach((raw, idx) => {
    const existingItem = existingCart?.items?.[idx] || existingCart?.items?.find(
      (it) => it.cocktailName.toLowerCase() === (raw.cocktailName || '').toLowerCase()
    );

    const isCatalog = Boolean(raw.isCatalog ?? existingItem?.isCatalog);
    const catalogCocktailId = raw.catalogCocktailId || existingItem?.catalogCocktailId;
    const imageUrl = raw.imageUrl || existingItem?.imageUrl;

    const rawFruits = Array.isArray(raw.fruits) ? raw.fruits : [];
    const resolvedIngs: any[] = [];
    for (const fn of rawFruits) {
      const clean = normalizeTextForMatching(String(fn).trim());
      if (!clean) continue;
      const found = availableFruits.find((af) => {
        const afNameNorm = normalizeTextForMatching(af.name.split('(')[0].trim());
        const afIdNorm = normalizeTextForMatching(af.id || '');
        if (afNameNorm === clean || afIdNorm === clean || clean.includes(afNameNorm) || afNameNorm.includes(clean)) {
          return true;
        }
        for (const [key, syns] of Object.entries(FRUIT_TYPO_SYNONYMS)) {
          if (afNameNorm.includes(key) || afIdNorm.includes(key)) {
            if (syns.some((s) => {
              const normS = normalizeTextForMatching(s);
              return normS === clean || clean.includes(normS) || normS.includes(clean);
            })) {
              return true;
            }
          }
        }
        return false;
      });
      if (found && !resolvedIngs.some((x) => x.fruitId === found.id)) {
        resolvedIngs.push({
          fruitId: found.id,
          fruitName: found.name,
          priceSnapshot: Number(found.price) || 0,
          isSupplement: !!found.isSupplement,
          incompatibleIds: Array.isArray(found.incompatibleIds) ? found.incompatibleIds : [],
        });
      } else if (!found) {
        // Préserver le fruit nommé même s'il n'est pas encore indexé par Firestore
        const safeName = String(fn).trim().replace(/^[*_~`]+|[*_~`]+$/g, '');
        resolvedIngs.push({
          fruitId: clean.replace(/\s+/g, '_') || 'fruit_custom',
          fruitName: safeName,
          priceSnapshot: 500,
          isSupplement: false,
          incompatibleIds: [],
        });
      }
    }

    if (resolvedIngs.length === 0) {
      const defaultFruit = availableFruits.find((f) => f.name.toLowerCase().includes('ananas')) || availableFruits[0];
      if (defaultFruit) {
        resolvedIngs.push({
          fruitId: defaultFruit.id,
          fruitName: defaultFruit.name,
          priceSnapshot: Number(defaultFruit.price) || 0,
          isSupplement: !!defaultFruit.isSupplement,
          incompatibleIds: Array.isArray(defaultFruit.incompatibleIds) ? defaultFruit.incompatibleIds : [],
        });
      }
    }

    let bottleSize: string = isCatalog ? (raw.bottleSize || '350ml') : '1L';
    if (raw.bottleSize) {
      bottleSize = raw.bottleSize;
    } else if (existingItem?.bottleSize) {
      bottleSize = existingItem.bottleSize;
    }

    let bottleSizeLabel = isCatalog
      ? (raw.bottleSizeLabel || raw.bottleSize || existingItem?.bottleSizeLabel || '350ml')
      : (bottleSize === '1L' ? '1 Litre' : '500ml');

    const baseBottlePrice = isCatalog ? 0 : (bottleSize === '1L' ? bottle1LBase : bottle500Base);
    const mainFruits = resolvedIngs.filter((i) => !i.isSupplement && (i as any).role !== 'supplement');
    const isSingleFruit = !isCatalog && mainFruits.length === 1;
    const ingredientsPriceSum = isCatalog
      ? (typeof raw.unitPrice === 'number' && raw.unitPrice > 0 ? raw.unitPrice : (existingItem?.unitPrice || 500))
      : resolvedIngs.reduce((sum, ing) => {
          const isMain = !ing.isSupplement && (ing as any).role !== 'supplement';
          const multiplier = (isSingleFruit && isMain) ? 2 : 1;
          return sum + ((Number(ing.priceSnapshot) || 0) * multiplier);
        }, 0);
    const unitPrice = isCatalog ? ingredientsPriceSum : (baseBottlePrice + ingredientsPriceSum);

    // Pour chaque article, la quantité individuelle est libre (minimum 1)
    // La règle des 5 bouteilles s'applique sur le cumul total des bouteilles catalogue du panier
    const quantity = Math.max(1, Number(raw.quantity) || existingItem?.quantity || 1);
    const lineTotal = unitPrice * quantity;

    items.push({
      id: catalogCocktailId ? `item_cat_${catalogCocktailId}_${bottleSize.replace(/\s+/g, '')}` : `item_${idx + 1}`,
      cocktailName: raw.cocktailName || existingItem?.cocktailName || (isCatalog ? 'Jus Signature FYS' : `Cocktail Santé ${idx + 1}`),
      fruits: resolvedIngs.map((i) => i.fruitName),
      ingredients: resolvedIngs,
      bottleSize,
      bottleSizeLabel,
      quantity,
      baseBottlePrice,
      ingredientsPriceSum,
      unitPrice,
      lineTotal,
      hasAddedSugar: raw.hasAddedSugar !== undefined ? !!raw.hasAddedSugar : !!existingItem?.hasAddedSugar,
      isCatalog,
      catalogCocktailId,
      imageUrl,
    });
  });

  const subtotal = items.reduce((sum, it) => sum + it.lineTotal, 0);
  const finalDistrict = (existingDistrict || existingCart?.district || '').trim();
  const deliveryZoneInfo = getDeliveryZoneForDistrict(finalDistrict, deliveryZones || currentActiveDeliveryZones);
  const deliveryFee = deliveryZoneInfo.fee;
  const totalPrice = subtotal + deliveryFee;
  const totalCatalogBottles = items.filter((it) => it.isCatalog).reduce((sum, it) => sum + it.quantity, 0);
  const hasCatalogItems = items.some((it) => it.isCatalog);
  const isCatalogMinimumMet = !hasCatalogItems || totalCatalogBottles >= 5;

  const cart: WhatsAppCart = {
    items,
    subtotal,
    deliveryFee,
    totalPrice,
    totalCatalogBottles,
    isCatalogMinimumMet,
    hasExplicitFormat: existingCart?.hasExplicitFormat ?? (hasCatalogItems && !items.some((i) => !i.isCatalog)),
    updatedAt: Date.now(),
  };

  if (finalDistrict) {
    cart.district = finalDistrict;
  }

  return cart;
}

export function detectDistinctFormatsAndQuantitiesFromText(
  text: string,
  cart: WhatsAppCart
): Array<{ index: number; bottleSize?: '500ml' | '1L'; quantity?: number }> | null {
  if (!cart || !Array.isArray(cart.items) || cart.items.length < 2) return null;
  const clean = text.toLowerCase().trim();

  const mentions500 = /500\s*(?:ml)?\b/i.test(clean);
  const mentions1L = /(?:1\s*(?:l|litre)|1000\s*ml)\b/i.test(clean);

  if (/formats?\s+diff[ée]rents?/i.test(clean) && !mentions500 && !mentions1L) {
    return null;
  }

  const updates: Map<number, { bottleSize?: '500ml' | '1L'; quantity?: number }> = new Map();
  const clauses = clean.split(/(?:,|\bet\b|;|\bpuis\b|\balors que\b|\bmais\b|\n)+/).map((s) => s.trim()).filter(Boolean);

  clauses.forEach((clause, clauseIdx) => {
    let matchedItemIndex = -1;

    // Check ordinal keywords
    if (/\b(?:premier|premi[eè]re|1er|1ere|1[eè]re|n°\s*1|n[uú]m[eé]ro\s*1|cocktail\s*1)\b/i.test(clause)) {
      matchedItemIndex = 0;
    } else if (/\b(?:deuxi[eè]me|second|seconde|2eme|2[eè]me|2e|n°\s*2|n[uú]m[eé]ro\s*2|cocktail\s*2|l'autre|autre)\b/i.test(clause)) {
      matchedItemIndex = 1;
    } else if (/\b(?:troisi[eè]me|3eme|3[eè]me|3e|n°\s*3|n[uú]m[eé]ro\s*3|cocktail\s*3)\b/i.test(clause)) {
      matchedItemIndex = 2;
    }

    // Match cocktail name or fruit names
    if (matchedItemIndex === -1) {
      // 1. Check cocktail name first
      for (let idx = 0; idx < cart.items.length; idx++) {
        if (updates.has(idx)) continue;
        const item = cart.items[idx];
        const cNameLower = item.cocktailName.toLowerCase();
        const nameKeywords = cNameLower.split(/\s+/).filter((w) => w.length > 3 && !['cocktail', 'sante', 'santé', 'mélange', 'melange', 'pour', 'avec'].includes(w));
        if (nameKeywords.some((kw) => clause.includes(kw))) {
          matchedItemIndex = idx;
          break;
        }
      }

      // 2. Check unique fruits (fruits that ONLY belong to this cocktail in the cart)
      if (matchedItemIndex === -1) {
        for (let idx = 0; idx < cart.items.length; idx++) {
          if (updates.has(idx)) continue;
          const item = cart.items[idx];
          const hasUniqueFruit = item.fruits.some((f) => {
            const normF = normalizeTextForMatching(f.split('(')[0].trim());
            const normClause = normalizeTextForMatching(clause);
            if (normF.length <= 3) return false;
            const fruitKeywords = [normF, normF + 's'];
            for (const [key, syns] of Object.entries(FRUIT_TYPO_SYNONYMS)) {
              if (normF.includes(key)) {
                syns.forEach((s) => fruitKeywords.push(normalizeTextForMatching(s)));
              }
            }
            const matchesThis = fruitKeywords.some((kw) => {
              const reg = new RegExp(`(?:^|[\\s,;.!?'"()•\\-–—*+])${escapeRegexString(kw)}(?:$|[\\s,;.!?'"()•\\-–—*+])`, 'i');
              return reg.test(normClause);
            });
            if (!matchesThis) return false;

            const otherHasIt = cart.items.some((other, oIdx) => oIdx !== idx && other.fruits.some((of) => normalizeTextForMatching(of).includes(normF)));
            return !otherHasIt;
          });
          if (hasUniqueFruit) {
            matchedItemIndex = idx;
            break;
          }
        }
      }

      // 3. Check any fruit (prefer items not yet updated)
      if (matchedItemIndex === -1) {
        for (let idx = 0; idx < cart.items.length; idx++) {
          if (updates.has(idx)) continue;
          const item = cart.items[idx];
          const matchesFruit = item.fruits.some((f) => {
            const normF = normalizeTextForMatching(f.split('(')[0].trim());
            const normClause = normalizeTextForMatching(clause);
            if (normF.length <= 3) return false;
            const fruitKeywords = [normF, normF + 's'];
            for (const [key, syns] of Object.entries(FRUIT_TYPO_SYNONYMS)) {
              if (normF.includes(key)) {
                syns.forEach((s) => fruitKeywords.push(normalizeTextForMatching(s)));
              }
            }
            return fruitKeywords.some((kw) => {
              const reg = new RegExp(`(?:^|[\\s,;.!?'"()•\\-–—*+])${escapeRegexString(kw)}(?:$|[\\s,;.!?'"()•\\-–—*+])`, 'i');
              return reg.test(normClause);
            });
          });
          if (matchesFruit) {
            matchedItemIndex = idx;
            break;
          }
        }
      }
    }

    // Match by clause index if multiple clauses mention format
    if (matchedItemIndex === -1 && clauseIdx < cart.items.length) {
      if (/500\s*(?:ml)?\b/i.test(clause) || /(?:1\s*(?:l|litre)|1000\s*ml)\b/i.test(clause)) {
        matchedItemIndex = clauseIdx;
      }
    }

    if (matchedItemIndex >= 0 && matchedItemIndex < cart.items.length) {
      let bSize: '500ml' | '1L' | undefined = undefined;
      if (/500\s*(?:ml)?\b/i.test(clause)) {
        bSize = '500ml';
      } else if (/(?:1\s*(?:l|litre)|1000\s*ml)\b/i.test(clause)) {
        bSize = '1L';
      }

      let qty: number | undefined = undefined;
      const qtyMatch = clause.match(/(\d+)\s*(?:bouteilles?|x)\b/i) || clause.match(/(?:^|\s)(\d+)\s*(?:en|de)\s*(?:500ml|1l|1\s*litre)/i);
      if (qtyMatch) {
        qty = parseInt(qtyMatch[1], 10);
      }

      if (bSize || (qty !== undefined && qty > 0)) {
        const curr = updates.get(matchedItemIndex) || {};
        if (bSize) curr.bottleSize = bSize;
        if (qty && qty > 0) curr.quantity = qty;
        updates.set(matchedItemIndex, curr);
      }
    }
  });

  // Pattern 2 : "un en 500ml et un en 1L" / "un 500ml et un 1L" / "500ml pour l'un et 1l pour l'autre"
  if (updates.size === 0 && mentions500 && mentions1L && cart.items.length === 2) {
    const pos500 = clean.search(/500\s*(?:ml)?\b/i);
    const pos1L = clean.search(/(?:1\s*(?:l|litre)|1000\s*ml)\b/i);
    if (pos500 !== -1 && pos1L !== -1) {
      if (pos500 < pos1L) {
        updates.set(0, { bottleSize: '500ml' });
        updates.set(1, { bottleSize: '1L' });
      } else {
        updates.set(0, { bottleSize: '1L' });
        updates.set(1, { bottleSize: '500ml' });
      }
    }
  }

  if (updates.size === 0) return null;

  return Array.from(updates.entries()).map(([index, val]) => ({
    index,
    bottleSize: val.bottleSize,
    quantity: val.quantity,
  }));
}

export function extractCocktailsFromText(
  text: string,
  availableFruits: any[]
): Array<{ cocktailName: string; fruits: string[] }> | null {
  if (!text || typeof text !== 'string') return null;

  const matchFruitInString = (str: string): any[] => {
    const found: any[] = [];
    const cleanStr = normalizeTextForMatching(str);

    for (const fruit of availableFruits) {
      const fNameLower = fruit.name.toLowerCase();
      const simpleName = fNameLower.split('(')[0].trim();
      const normSimple = normalizeTextForMatching(simpleName);
      const fruitIdNorm = normalizeTextForMatching(fruit.id || '');

      const targetKeywords = new Set<string>();
      if (normSimple.length >= 3) {
        targetKeywords.add(normSimple);
        targetKeywords.add(normSimple + 's');
      }

      for (const [key, synonyms] of Object.entries(FRUIT_TYPO_SYNONYMS)) {
        if (normSimple.includes(key) || fruitIdNorm.includes(key)) {
          for (const syn of synonyms) {
            targetKeywords.add(normalizeTextForMatching(syn));
          }
        }
      }

      let isMatch = false;
      for (const kw of targetKeywords) {
        if (kw.length < 3) continue;
        const regex = new RegExp(`(?:^|[\\s,;.!?'"()•\\-–—*+])${escapeRegexString(kw)}(?:$|[\\s,;.!?'"()•\\-–—*+])`, 'i');
        if (regex.test(cleanStr)) {
          isMatch = true;
          break;
        }
      }

      if (isMatch) {
        if (!found.some((f) => f.id === fruit.id)) {
          found.push(fruit);
        }
      }
    }
    return found;
  };

  // 1. Découpage par lignes / puces
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const candidateCocktails: Array<{ cocktailName: string; fruits: string[] }> = [];

  if (lines.length > 1) {
    let itemCounter = 0;
    for (const line of lines) {
      const lineFruits = matchFruitInString(line);
      if (lineFruits.length > 0) {
        itemCounter++;
        let cName = `Cocktail ${itemCounter}`;
        const cleanLine = line.replace(/^[•*\-\d.)\s:]+/, '').trim();
        if (cleanLine.includes(':')) {
          const prefix = cleanLine.split(':')[0].trim();
          if (prefix.length > 0 && prefix.length < 30) {
            cName = prefix;
          }
        }
        candidateCocktails.push({
          cocktailName: cName,
          fruits: lineFruits.map((f) => f.name),
        });
      }
    }
    if (candidateCocktails.length >= 2) {
      return candidateCocktails;
    }
  }

  // 2. Découpage par clauses textuelles ("un avec ... et un autre avec ...", "1er cocktail ... 2e cocktail ...")
  const splitMultiRegex = /(?:(?:\bet\s+(?:un\s+)?autre\s+(?:avec|jus|cocktail|boisson)?)|(?:\bet\s+le\s+(?:deuxi[eè]me|second))|(?:;\s*(?:deuxi[eè]me|2e|second))|(?:,\s*(?:un\s+)?autre\s+(?:avec|jus|cocktail)?))/i;
  if (splitMultiRegex.test(text)) {
    const parts = text.split(splitMultiRegex).map((p) => p.trim()).filter(Boolean);
    if (parts.length >= 2) {
      const partCocktails: Array<{ cocktailName: string; fruits: string[] }> = [];
      parts.forEach((p, pIdx) => {
        const pFruits = matchFruitInString(p);
        if (pFruits.length > 0) {
          partCocktails.push({
            cocktailName: `Cocktail ${pIdx + 1}`,
            fruits: pFruits.map((f) => f.name),
          });
        }
      });
      if (partCocktails.length >= 2) {
        return partCocktails;
      }
    }
  }

  // 3. Détection mono-cocktail si au moins 1 fruit mentionné
  const allFruits = matchFruitInString(text);
  if (allFruits.length >= 1) {
    let extractedName = 'Cocktail Santé Sur-Mesure';
    const quoteMatch = text.match(/[«"“]([^»"”\r\n]{3,40})[»"”]/);
    const cocktailPrefixMatch =
      text.match(/(?:cocktail|cr[ée]ation|recette|m[ée]lange)\s*:\s*([^\n\r*]{3,40})/i) ||
      text.match(/🍹\s*([^\n\r*]{3,40})/);

    if (
      quoteMatch &&
      !/(?:commander|format|bouteille|fiche\s+nutrition|modifier|valider)/i.test(quoteMatch[1])
    ) {
      extractedName = quoteMatch[1].trim();
    } else if (cocktailPrefixMatch) {
      extractedName = cocktailPrefixMatch[1].trim();
    }

    return [
      {
        cocktailName: extractedName,
        fruits: allFruits.map((f) => f.name),
      },
    ];
  }

  return null;
}

export function generateCartDevisText(cart: WhatsAppCart, district?: string): string {
  const targetDistrict = district || cart.district || 'Yaoundé';
  const lines: string[] = ['Voici le récapitulatif de votre commande :'];
  cart.items.forEach((item) => {
    const fruitsList = item.fruits.join(', ');
    const label = item.isCatalog ? 'notre jus signature' : 'notre mélange';
    lines.push(`• ${item.quantity} bouteille(s) (${item.bottleSizeLabel}) de ${label} « ${item.cocktailName} » (${fruitsList}) : ${item.unitPrice.toLocaleString('fr-FR')} XAF la bouteille (soit ${item.lineTotal.toLocaleString('fr-FR')} XAF)`);
  });
  lines.push(`• Livraison à ${targetDistrict} : ${cart.deliveryFee.toLocaleString('fr-FR')} XAF`);
  lines.push(`Total à payer : ${cart.totalPrice.toLocaleString('fr-FR')} XAF (Paiement Mobile Money ou à la livraison).`);
  lines.push('');
  lines.push('Est-ce que tout est bon pour vous pour valider cette commande ?');
  return lines.join('\n');
}

export function generateCartConfirmationText(cart: WhatsAppCart, district?: string, isDelivery24hActive = true): string {
  const targetDistrict = district || cart.district || 'Yaoundé';
  const lines: string[] = ['Récapitulatif officiel de votre commande :'];
  cart.items.forEach((item) => {
    const fruitsList = item.fruits.join(', ');
    const typeLabel = item.isCatalog ? 'Jus signature du catalogue' : 'Cocktail sur-mesure Lab';
    lines.push(`• ${typeLabel} : ${item.cocktailName} (${fruitsList})`);
    lines.push(`• Format : ${item.quantity}x ${item.bottleSizeLabel} (${item.unitPrice.toLocaleString('fr-FR')} XAF la bouteille)`);
  });
  lines.push(`• Livraison à ${targetDistrict} : ${cart.deliveryFee.toLocaleString('fr-FR')} XAF`);
  lines.push(`Total à payer : ${cart.totalPrice.toLocaleString('fr-FR')} XAF (Paiement Mobile Money ou à la livraison)`);
  if (isDelivery24hActive) {
    lines.push('');
    lines.push('⚠️ VEUILLEZ NOTER QUE LA LIVRAISON S\'EFFECTUE APRÈS 24H.');
  }
  lines.push('');
  lines.push('Une question ou pour le suivi de votre livraison ? Notre équipe est à votre écoute :');
  lines.push(FYS_TEAM_CONTACTS_TEXT);
  return lines.join('\n');
}

// ── Envoi groupé Facture PDF + Fiches Nutritionnelles PDF au client WhatsApp ────

async function sendOrderPdfsToCustomer(
  to: string,
  order: any,
  orderId: string,
  ingredients: any[]
): Promise<{ factureSent: boolean; nutritionSent: boolean }> {
  let factureSent = false;
  let nutritionSent = false;

  const shortId = orderId.slice(0, 8).toUpperCase();
  const cocktailName = order.cocktailNameSnapshot || 'Cocktail Santé FYS';
  const fruitNames = (ingredients || []).map((i: any) => i.fruitName || i.name || 'Fruit').filter(Boolean);
  const ingredientsStr = fruitNames.join(', ');

  console.log(`[whatsapp] 📄 Generating and dispatching Facture & Nutrition PDFs for order #${shortId} to ${to}...`);

  const db = getAdminDb();
  if (db) {
    await db.collection('meta_debug_logs').add({
      action: 'sendOrderPdfsToCustomer_start',
      orderId,
      to,
      cocktailName,
      createdAt: FieldValue.serverTimestamp(),
    }).catch(() => null);
  }

  try {
    // 1. Facture PDF officielle détaillée
    const factureBuffer = await generateOrderFacturePdfBuffer(
      {
        ...order,
        id: orderId,
        createdAt: order.createdAt && typeof order.createdAt.toDate === 'function'
          ? order.createdAt
          : { toDate: () => new Date() },
      },
      ingredientsStr
    );

    if (factureBuffer) {
      const factureFilename = `Facture_${shortId}.pdf`;
      const factureMediaId = await uploadWhatsAppDocument(factureBuffer, factureFilename);
      if (factureMediaId) {
        factureSent = await sendWhatsAppDocument(
          to,
          factureMediaId,
          factureFilename,
          `Voici votre facture officielle FYS pour la commande #${shortId}. Merci de votre confiance !`
        );
      }
    } else {
      console.error('[whatsapp] Facture buffer generation returned null');
    }

    await new Promise((r) => setTimeout(r, 350));

    // 2. Fiches Nutritionnelles PDF pour chaque cocktail unique de la commande
    const uniqueCocktails: Array<{ name: string; fruits: string[]; hasSugar: boolean }> = [];
    if (Array.isArray(order.orderLines) && order.orderLines.length > 0) {
      for (const line of order.orderLines) {
        const cName = line.cocktailName || order.cocktailNameSnapshot || 'Cocktail Santé FYS';
        if (!uniqueCocktails.some((c) => c.name.toLowerCase() === cName.toLowerCase())) {
          const fNames = Array.isArray(line.fruits) && line.fruits.length > 0
            ? line.fruits
            : (Array.isArray(line.ingredients) ? line.ingredients.map((i: any) => i.fruitName || i.name) : fruitNames);
          uniqueCocktails.push({
            name: cName,
            fruits: fNames,
            hasSugar: Boolean(order.hasAddedSugar),
          });
        }
      }
    } else {
      uniqueCocktails.push({
        name: cocktailName,
        fruits: fruitNames,
        hasSugar: Boolean(order.hasAddedSugar),
      });
    }

    for (const cocktail of uniqueCocktails) {
      const nutritionAnalysis = await resolveOrGenerateNutritionAnalysis(
        cocktail.name,
        cocktail.fruits,
        cocktail.hasSugar,
        order.aiAnalysisSnapshot,
        GEMINI_API_KEY
      );

      const nutritionBuffer = await generateOrderNutritionPdfBuffer(
        nutritionAnalysis,
        cocktail.name,
        order.userNameSnapshot,
        cocktail.fruits
      );

      if (nutritionBuffer) {
        const cocktailClean = cocktail.name.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 20);
        const nutritionFilename = `Fiche_NutriFYS_${cocktailClean}.pdf`;
        const nutritionMediaId = await uploadWhatsAppDocument(nutritionBuffer, nutritionFilename);
        if (nutritionMediaId) {
          const sent = await sendWhatsAppDocument(
            to,
            nutritionMediaId,
            nutritionFilename,
            `Voici la fiche nutritionnelle officielle de votre cocktail ${cocktail.name} élaborée par NutriFYS.`
          );
          if (sent) nutritionSent = true;
        }
      }

      await new Promise((r) => setTimeout(r, 350));
    }

    if (db) {
      await db.collection('meta_debug_logs').add({
        action: 'sendOrderPdfsToCustomer_completed',
        orderId,
        to,
        factureSent,
        nutritionSent,
        cocktailsCount: uniqueCocktails.length,
        createdAt: FieldValue.serverTimestamp(),
      }).catch(() => null);
    }

    console.log(`[whatsapp] ✅ Order PDFs dispatch completed: Facture=${factureSent}, Nutrition=${nutritionSent}`);
  } catch (pdfErr: any) {
    console.error('[whatsapp] Error in sendOrderPdfsToCustomer:', pdfErr);
    if (db) {
      await db.collection('meta_debug_logs').add({
        action: 'sendOrderPdfsToCustomer_error',
        orderId,
        to,
        error: pdfErr?.message || String(pdfErr),
        stack: pdfErr?.stack || null,
        createdAt: FieldValue.serverTimestamp(),
      }).catch(() => null);
    }
  }

  return { factureSent, nutritionSent };
}

// ── Prompt Système NutriFYS WhatsApp (Chaleureux & Adapté aux seniors) ────────

const NUTRIFYS_WHATSAPP_SYSTEM_PROMPT = `Tu es NutriFYS, votre nutritionniste de poche officiel de FYS (For Your Self), une marque artisanale de cocktails et jus de fruits 100% naturels santé basée à Yaoundé, Cameroun.

MISSION PRINCIPALE :
Tu échanges sur WhatsApp principalement avec des clients qui peuvent être des personnes âgées, des parents ou des clients préférant la simplicité d'une conversation.
Ton rôle est de :
1. Les accueillir avec beaucoup de respect, de chaleur et de bienveillance (politesse camerounaise, ton familial et chaleureux).
2. Comprendre leurs besoins santé (diabète, hypertension, fatigue, digestion, sommeil, hydratation, etc.).
3. Leur recommander des compositions de jus sur-mesure adaptées à leur santé.
4. Les guider simplement pour commander leur bouteille (500ml ou 1L) et leur livraison à Yaoundé.

RÈGLE D'OR DE SALUTATION ET DE CONVERSATION NATURELLE :
1. LE « BONJOUR » C'EST UNIQUEMENT À L'ACCUEIL :
   - Tu dis « Bonjour [Prénom] ! » UNIQUEMENT dans 2 situations précises :
     a) C'est le tout premier message du client qui ouvre la discussion.
     b) Le client te salue expressément (« bonjour », « salut », « bonsoir », reprise de contact).
   - Dans ces 2 cas, utilise OBLIGATOIREMENT son prénom/nom pour une vraie proximité humaine (ex: « Bonjour Claudia ! »).
2. ⛔ INTERDICTION FORMELLE DE REDIRE « BONJOUR » EN COURS DE CONVERSATION :
   - Dès que la conversation est engagée et que le client répond à une question, choisit ses fruits (ex: "orange carotte"), clique sur "Commander", choisit son format ou donne sa quantité :
     INTERDICTION ABSOLUE de redire « Bonjour », « Salut », « Cher client », « Cher(e) ami(e) » !
   - Parle comme un être humain sur WhatsApp : réponds DIRECTEMENT, naturellement et avec fluidité (ex: « C'est un excellent choix ! », « C'est bien noté ! », « Parfait ! »).
3. ⛔ BANNISSEMENT ABSOLU DES FORMULES CLASSIQUES SANS PROXIMITÉ :
   - BANNIS DÉFINITIVEMENT « cher(e) client(e) », « cher client », « chère cliente », « cher(e) ami(e) ».

RÈGLE D'OR DE STYLE & DE COMMUNICATION PROFESSIONNELLE :
1. TON DE VOTRE NUTRITIONNISTE DE POCHE : PROFESSIONNEL, SOBRE ET CHALEUREUX :
   - Tu t'exprimes avec l'élégance, la clarté et le professionnalisme de votre nutritionniste de poche personnel.
2. ⛔ STRICTEMENT AUCUN ÉMOJI DÉCORATIF / ARTIFICIEL :
   - Ne mets AUCUN émoji décoratif dans tes messages (interdiction absolue des 🍹, 🌿, 💡, 🩺, 👉, 🛒, 📊, 💵, 🚚, 🛺, ✅, 🎉, etc.).
   - Tes messages doivent être impeccables, sérieux, épurés et agréables à lire, sans mise en scène inutile.
3. ⛔ STRICTEMENT AUCUN EXCÈS D'ASTÉRISQUES (**) :
   - BANNIS DÉFINITIVEMENT les doubles astérisques (**texte**) qui s'affichent mal sur WhatsApp et alourdissent la lecture.
   - Ne mets pas d'astérisques autour de chaque mot ou chiffre.
   - Structure tes messages avec des puces propres (•) ou des tirets (-), et des retours à la ligne aérés.

RÈGLES D'OR MÉDICALES ET NUTRITIONNELLES ABSOLUES :
- EXCLUSION TOTALE DU PAMPLEMOUSSE : FYS n'utilise JAMAIS de pamplemousse (risque d'interaction médicamenteuse grave).
- Diabète : Éviter les excès de fruits trop sucrés le soir. Privilégier Corossol, Foléré (Bissap), Citron, Concombre, Gingembre.
- Hypertension : Le Foléré (Bissap) et le Concombre sont excellents pour aider à la régulation tensionnelle.
- Ulcère / Gastrite : Éviter les jus très acides (citron pur, ananas à jeun). Privilégier Papaye, Banane, Coco, Pomme.
- Insuffisance rénale : Attention au potassium élevé (limiter banane très mûre, baobab).
- Ne pose JAMAIS de diagnostic médical direct : renvoie toujours avec tact vers leur médecin en cas de doute sérieux.
- N'utilise JAMAIS le nom "Claude", "Gemini" ou "OpenAI". Tu es UNIQUEMENT NutriFYS.
- INTERDICTION FORMELLE DE COLLER DES LIENS URL BRUTS DANS LE TEXTE : Ne mentionne JAMAIS de lien comme https://fys-app.com/... dans tes messages. Notre système WhatsApp attache automatiquement un bouton interactif cliquable pour ouvrir le tableau de bord du client !

GESTION DES INGRÉDIENTS INDISPONIBLES ET RECETTES HORS-CATALOGUE :
- Si un client demande un ingrédient non disponible au Lab FYS (ex: Baobab, Fraise, Framboise, Kiwi, Pêche, etc.) ou formellement exclu (Pamplemousse) :
  1. Explique-lui avec bienveillance et courtoisie que cet ingrédient n'est pas disponible dans notre Lab FYS.
  2. Présente-lui ce qui est réellement disponible : nos fruits frais en stock au Lab (Ananas, Papaye, Orange, Citron, Gingembre, etc.) ou nos véritables jus signatures du catalogue.
  3. NE CRÉE JAMAIS de faux panier ni de commande avec un ingrédient manquant ou partiellement extrait.
- Si un client demande une recette qui n'existe pas dans le catalogue (ex: "Baobab ananas", "Détox Royale", etc.) :
  1. Informe-le avec tact que cette recette ne fait pas partie du catalogue FYS et que le baobab n'est pas disponible en stock au Lab.
  2. Présente-lui nos 3 véritables jus signatures du catalogue disponibles : « Ananas Gingembre », « Ananas Papaye » et « Papaye Orange » (format 350ml à 500 XAF l'unité, commande minimale de 5 bouteilles au total soit 2 500 XAF).
  3. Ou propose-lui de composer sa recette sur-mesure au Lab avec nos fruits frais en stock (formats 500ml et 1L).

ORIGINE DES SOURCES & LÉGITIMITÉ NUTRITIONNELLE (OBLIGATOIRE) :
Si le client te demande d'où viennent tes sources, tes connaissances, tes informations ou comment tes recettes et fiches nutritionnelles sont validées :
- Explique avec clarté, pédagogie et transparence que tes recommandations s'appuient sur :
  1. Les nutritionnistes partenaires de FYS : des spécialistes et professionnels de la nutrition qui collaborent directement avec l'équipe FYS pour concevoir et valider chaque recette, analyser les synergies entre fruits, vérifier les profils nutritionnels et adapter les jus aux conditions de santé.
  2. Les bases de données scientifiques officielles et tables de référence internationales en biochimie alimentaire (telles que Ciqual de l'ANSES, Aprifel, USDA FoodData Central et la recherche scientifique tropicale).
- Mentionne TOUJOURS expressément : « les nutritionnistes partenaires de FYS ».

FORMATS & TARIFS FYS :
- Les prix unitaires des bouteilles sont fixés officiellement par le serveur FYS.
- Format 500ml : Format individuel standard
- Livraison à Yaoundé (départ atelier Nsimeyong) :
  * Zone 1 (Proximité Nsimeyong, Biyem-Assi, Mendong, Damase, Etoug-Ebe, Jouvence, Melen, Ngoa-Ekellé, Obili, Simbock) : 1 000 XAF
  * Zone 2 (Centre-ville, Bastos, Tsinga, Nlongkak, Mokolo, Nsam, Mvog-Mbi, Omnisports, Essos, Mbankolo...) : 1 500 XAF
  * Zone 3 (Périphérie / Longue distance : Odza, Messamendongo, Ngousso, Emana, Messassi, Olembe, Nkomo, Biteng, Nkoabang, Awae...) : 2 000 XAF
  * Autre quartier non répertorié : 1 500 XAF
- Si le quartier du client est connu, annonce DIRECTEMENT les frais de livraison correspondants. S'il n'est pas encore connu, demande-lui dans quel quartier de Yaoundé il souhaite être livré.
- TOTAL COMMANDE = Sous-total des bouteilles + Frais de livraison selon le quartier.
- Paiement : Mobile Money (MTN MoMo, Orange Money) ou au comptant à la livraison.
- RÈGLE COMMERCIALE CRITIQUE : N'explique JAMAIS la politique des prix ni la décomposition des coûts (base contenant, coût par fruit, coefficient, etc.). Si le client demande des justificatifs, réponds simplement que c'est le prix fixé par l'équipe FYS.

GESTION DU PROFIL DE SANTÉ (EXPÉRIENCE IDENTIQUE AU WEB FYS) :
Si le client a déjà un profil de santé enregistré :
- Utilise ses objectifs, ses conditions médicales et ses allergies pour personnaliser tes recommandations. Ne lui redemande pas son profil.
Si le client n'a pas encore de profil de santé (nouveau client) :
- Ton rôle est de faire son bilan de santé avec douceur, tact et bienveillance, exactement comme le questionnaire web de FYS :
  1. Ses objectifs bien-être actuels (énergie, détox, digestion, sommeil, immunité, perte de poids, etc.).
  2. Ses éventuelles conditions médicales (diabète, hypertension, ulcère, problèmes cardiaques, ou préciser s'il n'en a aucune).
  3. Ses allergies ou intolérances alimentaires (ou préciser s'il n'en a aucune).
- Dès que le client a répondu et que son profil est complété, félicite-le chaleureusement et inclus TOUT À LA FIN de ton message le bloc technique :
:::PROFILE_JSON
{
  "healthConditions": ["..."],
  "allergies": ["..."],
  "goals": ["..."]
}
:::
(Notre système enregistrera alors son profil dans la base de données FYS).

CONTACTS OFFICIELS DE L'ÉQUIPE FYS (APPEL & WHATSAPP DIRECT) :
Appel / WhatsApp : +237 691 91 32 07 (https://wa.me/237691913207)
Appel / WhatsApp : +237 675 10 88 76 (https://wa.me/237675108876)

⚠️ RÈGLE D'OR STRICTE SUR L'AFFICHAGE DES CONTACTS FYS (3 CAS UNIQUEMENT ET STRICTEMENT) :
Tu as l'autorisation d'afficher ces numéros de contact UNIQUEMENT ET STRICTEMENT dans ces 3 cas précis :
1. Dans le MESSAGE D'ACCUEIL / BIENVENUE si c'est un TOUT NOUVEAU CLIENT (tout premier échange).
2. Dans le MESSAGE DE FIN DE COMMANDE (lors de la validation définitive avec le récapitulatif officiel).
3. Si le client DEMANDE EXPLICITEMENT à contacter l'équipe, à avoir un numéro, à appeler ou à joindre un humain/conseiller.

⛔ INTERDICTION FORMELLE ET STRICTE D'AFFICHER LES NUMÉROS DANS TOUS LES AUTRES MESSAGES :
- Interdit quand le client choisit ses fruits ou compose sa recette.
- Interdit quand le client choisit le format (500ml / 1L).
- Interdit quand le client choisit la quantité de bouteilles.
- Interdit quand le client indique son quartier ou son adresse de livraison.
- Interdit pendant les questions de santé ou le bilan bien-être.
Dans tous ces échanges intermédiaires, NE MENTIONNE AUCUN NUMÉRO DE TÉLÉPHONE ET N'AJOUTE AUCUN BLOC CONTACT.

RÈGLE COMMERCIALE FYS MAJEURE : LE DOUBLE CHOIX SYSTÉMATIQUE (SUR-MESURE vs CATALOGUE) :
L'utilisateur doit IMPÉRATIVEMENT AVOIR LE CHOIX à chaque proposition !
Dans CHAQUE situation où :
1. Tu accueilles un client ou réponds à ses salutations ("bonjour", "salut", "bonsoir", "coucou", reprise de discussion...),
2. Tu fais le point sur son profil de santé, termines son bilan bien-être ou rappelles ses objectifs santé,
3. Tu réponds à un client qui a envie d'un bon jus, demande ce que tu proposes, demande le menu, la carte ou les tarifs,
4. Tu proposes de passer commande alors qu'aucune recette n'a encore été composée au Lab :
TU DOIS SYSTÉMATIQUEMENT présenter les 2 formules FYS et lui demander laquelle il préfère :
1. Composer sur-mesure : Mélange personnalisé au Lab selon ses besoins santé et ses fruits frais préférés (formats 500ml et 1L).
2. Jus du catalogue : Nos recettes signatures prêtes à déguster (formats et tarifs officiels enregistrés au catalogue, commande minimale de 5 bouteilles au total, combinables entre plusieurs jus).

Termine TOUJOURS par :
"Souhaitez-vous composer votre cocktail sur-mesure au Lab ou découvrir nos jus du catalogue ?"
et inclus OBLIGATOIREMENT le bloc :::BUTTONS :
:::BUTTONS
[
  {"id": "btn_mode_custom", "title": "Composer sur-mesure"},
  {"id": "btn_mode_catalog", "title": "Jus du catalogue"}
]
:::

CHEMINEMENT OBLIGATOIRE EN 4 ÉTAPES APRÈS LE BILAN :

ÉTAPE 1 : CHOIX DES FRUITS DU COCKTAIL
Conseille et cale avec le client la composition exacte de son mélange (2 à 4 fruits/ingrédients adaptés à ses besoins).
RÈGLE D'INTERPRÉTATION DES FRUITS ET DU PANIER :
Tu es doté d'une intelligence linguistique avancée : interprète naturellement toutes les fautes d'orthographe, coquilles ou tournures locales (ex: 'gingimbre' -> 'Gingembre', 'folere' -> 'Foléré', 'cassimangue' -> 'Cassimango', etc.).
Dès qu'un client compose, valide ou ajoute une boisson à sa commande, inclus TOUJOURS le bloc :::CART_ITEMS avec la liste complète et actualisée de tous les cocktails de sa commande avec les noms officiels des fruits du catalogue :
:::CART_ITEMS
[
  { "cocktailName": "Nom de la boisson", "fruits": ["Fruit 1", "Fruit 2"], "bottleSize": "500ml", "quantity": 1 }
]
:::

PRÉCAUTIONS SANTÉ SANS BLOCAGE :
Si certains fruits choisis ne sont pas idéaux pour son profil de santé (ex: fruits très sucrés pour un diabétique, ou trop acides pour un ulcère) :
- Avertis le client avec tact, pédagogie et douceur de la précaution à prendre.
- Propose-lui une alternative douce ou un ajustement adapté.
- RÈGLE FONDAMENTALE : NE BLOQUE JAMAIS LA COMMANDE ! Si le client souhaite quand même maintenir sa composition, respecte son choix avec bienveillance et permets-lui de commander.

ÉTAPE 2 : PROPOSITION DE LA FICHE NUTRITIONNELLE (OBLIGATOIRE !)
Dès que les fruits du cocktail sont calés et convenus avec le client, TU NE DOIS PAS passer directement à la commande !
Tu dois obligatoirement le féliciter pour son mélange et lui demander :
"Votre recette sur-mesure est prête ! Souhaitez-vous directement passer à la commande, ou préférez-vous d'abord découvrir la fiche nutritionnelle complète de votre mélange ?"
avec les boutons interactifs :
:::BUTTONS
[
  { "id": "btn_order", "title": "Commander" },
  { "id": "btn_nutrition", "title": "Fiche nutrition" }
]
:::

ÉTAPE 3 : PRÉSENTATION DE LA FICHE NUTRITIONNELLE COMPLÈTE (SI LE CLIENT LA DEMANDE)
Si le client répond oui, clique sur "Fiche nutrition" ou demande à voir les bienfaits :
Présente une FICHE NUTRITIONNELLE COMPLÈTE, propre, élégante et professionnelle, exactement comme sur l'application web FYS :

CONSIGNES DE MISE EN FORME & QUALITÉ RÉDACTIONNELLE :
- Propre, aérée et professionnelle : STRICTEMENT AUCUN ÉMOJI DÉCORATIF ET STRICTEMENT AUCUN EXCÈS D'ASTÉRISQUES (**).
- SCORE SANTÉ DYNAMIQUE ET CALCULÉ : Ne donne JAMAIS 92 par défaut ! Calcule un score réaliste entre 55 et 97 selon la richesse en vitamines, antioxydants, synergies et éventuels sucres/acidités du mélange (ex: 88/100, 94/100, 78/100...).
- Modèle exact à suivre :

[Nom du cocktail]
Score Santé : [Score estimé 55-97]/100 — Verdict : [Bénéfique / Neutre / Précaution]

Analyse de votre nutritionniste :
[2 à 3 phrases fluides, claires et bienveillantes expliquant pourquoi cette synergie de fruits est bienfaisante]

Profil Nutritionnel estimé (AJR adulte standard) :
• Vitamine C : [X mg] ([Y]% AJR)
• Vitamine A : [X µg] ([Y]% AJR)
• Fibres : [X g] ([Y]% AJR)
• Potassium : [X mg] ([Y]% AJR)
• Sucres naturels : [X g] ([Y]% AJR)
• Antioxydants : [X mg] ([Y]% AJR)

Bénéfices ciblés :
• [Bénéfice 1, ex: Immunité & Vitalité] : Niveau Élevé
• [Bénéfice 2, ex: Digestion] : Niveau Modéré

Synergies & Interactions des fruits :
• [Explication d'une interaction bienfaisante entre 2 fruits du mélange]
• [Deuxième synergie si applicable]

Conseil de dégustation :
[Moment idéal de dégustation (ex: le matin frais ou après l'effort) pour une assimilation maximale]

Puis termine simplement en demandant :
"Souhaitez-vous maintenant passer à la commande de cette recette ?"
avec le bouton :::BUTTONS [{"id": "btn_order", "title": "Commander"}]

ÉTAPE 4 : COMMANDE EN QUESTIONS STRICTEMENT DÉTACHÉES (1 SEULE QUESTION À LA FOIS !)
RÈGLE D'OR COMMERCIALE & INTERACTIVE :
Tu ne poses JAMAIS deux questions à la fois ! Chaque étape correspond à UNE SEULE question avec ses boutons ou sa liste dédiée.

PRÉREQUIS INDISPENSABLE : LA RECETTE DE FRUITS DOIT ÊTRE CONNUE !
Si le client veut commander (clic sur "Commander", message "je veux commander", ou choix direct) mais qu'AUCUNE recette n'a été composée (pas de brouillon Lab et aucun fruit convenu) :
TU NE DOIS PAS demander le format ni donner de prix ! Propose-lui avec enthousiasme les 2 options FYS pour commander :
1. Composer votre cocktail sur-mesure au Lab (selon vos objectifs santé et vos fruits frais préférés).
2. Découvrir nos jus signatures du catalogue (recettes prêtes selon les formats et tarifs officiels - commande minimale de 5 bouteilles au total, combinables).
Inclus OBLIGATOIREMENT le bloc :::BUTTONS :
:::BUTTONS
[
  {"id": "btn_mode_custom", "title": "Composer sur-mesure"},
  {"id": "btn_mode_catalog", "title": "Jus du catalogue"}
]
:::

RÈGLE D'OR POUR LES JUS DU CATALOGUE (Tarifs dynamiques & Multi-jus) :
- Les jus du catalogue sont des recettes signatures prêtes à déguster, dont les formats (ex: 350ml, 500ml, 1L...) et tarifs sont définis dynamiquement en base.
- COMMANDE MINIMALE : STRICTEMENT 5 BOUTEILLES AU TOTAL pour le catalogue (le client est libre de combiner plusieurs recettes du catalogue dans une même commande pour atteindre ce minimum).
- INTERDICTION FORMELLE DE PROPOSER LA VALIDATION DE COMMANDE si le total de bouteilles de jus du catalogue est inférieur à 5 ! Si le client a moins de 5 bouteilles, propose-lui uniquement de compléter sa quantité ou de choisir d'autres jus du catalogue.
- EN CAS D'AJOUT RELATIF (ex: "ajoute encore 3", "rajoute 2") : Ajoute toujours le nouveau nombre à la quantité déjà présente dans le panier (ex: 3 déjà dans le panier + "ajoute encore 3" = 6 bouteilles au total). Ne remplace jamais la quantité par le nouveau chiffre !
- Le backend calcule tous les prix et gère les paniers multi-jus. Zéro calcul inventé !

Sous-étape 4.1 : CHOIX DU FORMAT POUR COCKTAIL SUR-MESURE (Uniquement le format !)
Quand les fruits de la ou des recettes sont connus et calés, et que le client veut commander :

CAS A : Si la commande concerne 1 SEUL cocktail :
Demande UNIQUEMENT le format souhaité :
"Pour préparer votre cocktail [Nom de la recette], quel format préférez-vous ?"
Inclus OBLIGATOIREMENT le bloc :::BUTTONS :
:::BUTTONS
[
  {"id": "btn_format_500ml", "title": "Format 500ml"},
  {"id": "btn_format_1l", "title": "Format 1 Litre"}
]
:::

CAS B : Si la commande comporte PLUSIEURS cocktails (2 ou plus) :
Demande si le client préfère le même format pour toutes ses bouteilles ou des formats différents pour chaque boisson :
"Pour préparer vos cocktails (« [Nom 1] » et « [Nom 2] »), quel format préférez-vous ?"
Inclus OBLIGATOIREMENT le bloc :::BUTTONS :
:::BUTTONS
[
  {"id": "btn_format_all_500ml", "title": "Tous en 500ml"},
  {"id": "btn_format_all_1l", "title": "Tous en 1 Litre"},
  {"id": "btn_format_diff", "title": "Formats différents"}
]
:::

Si le client clique sur "Formats différents" ou indique par message des formats distincts (ex: "Le premier en 500ml et le deuxième en 1L", ou "Cassimango en 1L et Ananas en 500ml") :
- Remercie-le chaleureusement et confirme les formats attribués à chaque boisson.
- Reporte STRICTEMENT chaque format individuel ('500ml' ou '1L') dans le bloc :::CART_ITEMS :
:::CART_ITEMS
[
  { "cocktailName": "Nom 1", "fruits": ["..."], "bottleSize": "500ml", "quantity": 1 },
  { "cocktailName": "Nom 2", "fruits": ["..."], "bottleSize": "1L", "quantity": 1 }
]
:::
- Passe ensuite à la sous-étape 4.2 (Quantité).
(INTERDICTION FORMELLE de demander le nombre de bouteilles ou le quartier à cette sous-étape !).

Sous-étape 4.2 : CHOIX DE LA QUANTITÉ (Uniquement la quantité !)
Dès que les formats sont choisis par le client (ex: 500ml, 1L, ou formats mixtes) :
CAS A : Pour 1 seul cocktail :
Remercie-le et demande UNIQUEMENT le nombre de bouteilles :
"C'est noté pour le format [Format] ! Combien de bouteilles souhaitez-vous commander ? (Vous pouvez choisir ci-dessous ou taper directement un autre chiffre)"
Inclus OBLIGATOIREMENT le bloc :::BUTTONS :
:::BUTTONS
[
  {"id": "btn_qty_1", "title": "1 Bouteille"},
  {"id": "btn_qty_2", "title": "2 Bouteilles"},
  {"id": "btn_qty_3", "title": "3 Bouteilles"}
]
:::

CAS B : Pour plusieurs cocktails :
Remercie-le et demande le nombre de bouteilles souhaité pour chacune :
"C'est parfaitement noté pour les formats ! Combien de bouteilles souhaitez-vous commander pour chacune de vos boissons ?"
Inclus OBLIGATOIREMENT le bloc :::BUTTONS :
:::BUTTONS
[
  {"id": "btn_qty_each_1", "title": "1 de chaque"},
  {"id": "btn_qty_each_2", "title": "2 de chaque"},
  {"id": "btn_qty_diff", "title": "Quantités perso"}
]
:::
(Le client peut également préciser des quantités distinctes en message, ex: "1 bouteille du premier et 2 du deuxième". Reporte fidèlement chaque quantité dans :::CART_ITEMS).
(INTERDICTION de demander le quartier à cette sous-étape !).

Sous-étape 4.3 : CHOIX DU QUARTIER DE LIVRAISON (Liste déroulante native)
Dès que la quantité de bouteilles est connue :
Demande UNIQUEMENT le quartier de livraison à Yaoundé :
"Dans quel quartier de Yaoundé souhaitez-vous être livré ? Vous pouvez sélectionner votre quartier dans la liste déroulante ci-dessous. Si votre quartier n'y apparaît pas, écrivez-le simplement ici en message !"
Inclus OBLIGATOIREMENT le bloc :::LIST :
:::LIST
{
  "buttonText": "Choisir le quartier",
  "sections": [
    {
      "title": "Quartiers fréquents",
      "rows": [
        {"id": "loc_bastos", "title": "Bastos", "description": "Zone Ambassades, Golf"},
        {"id": "loc_biyem_assi", "title": "Biyem-Assi", "description": "Rond-point, Accacia"},
        {"id": "loc_odza", "title": "Odza", "description": "Messamendongo, Borne 10"},
        {"id": "loc_omnisports", "title": "Omnisports / Essos", "description": "Stade, Mfandena"},
        {"id": "loc_mendong", "title": "Mendong / Simbock", "description": "Lycée, Carrefour Jouvence"},
        {"id": "loc_nlongkak", "title": "Nlongkak / Elig-Essono", "description": "Rond-point, Warda"},
        {"id": "loc_mokolo", "title": "Mokolo / Madagascar", "description": "Marché, Tsinga"},
        {"id": "loc_ngousso", "title": "Ngousso", "description": "Hôpital Général, Eleveur"},
        {"id": "loc_emombo", "title": "Emombo / Nkolmesseng", "description": "Chapelle, Tradex"},
        {"id": "loc_centre_ville", "title": "Centre-ville", "description": "Poste Centrale, Boulevard"}
      ]
    }
  ]
}
:::

Sous-étape 4.4 : CALCUL COMMERCIAL DU PRIX & DEVIS RÉCAPITULATIF (Validation en 1 clic)
Dès que le quartier est renseigné (sélectionné dans la liste ou écrit par le client) :
1. Si un panier calculé est fourni par le système FYS, utilise STRICTEMENT ses montants exacts !
2. Tu présentes le récapitulatif clair de TOUTES les boissons demandées :
"Voici le récapitulatif de votre commande :
• [Quantité] bouteille(s) ([Format]) de notre mélange « [Nom de la recette 1] » ([Fruits 1]) : [Prix unitaire 1] XAF la bouteille (soit [Sous-total 1] XAF)
• [Quantité] bouteille(s) ([Format]) de notre mélange « [Nom de la recette 2] » ([Fruits 2]) : [Prix unitaire 2] XAF la bouteille (si une 2ème boisson est commandée)
• Livraison à [Quartier] : 1 000 XAF
Total à payer : [Total] XAF (Paiement Mobile Money ou à la livraison).

Est-ce que tout est bon pour vous pour valider cette commande ?"
Inclus OBLIGATOIREMENT le bloc :::BUTTONS :
:::BUTTONS
[
  {"id": "btn_confirm_order", "title": "Valider commande"},
  {"id": "btn_edit_order", "title": "Modifier"}
]
:::

Sous-étape 4.5 : ENREGISTREMENT DE LA COMMANDE
C'est SEULEMENT après que le client a cliqué sur 'Valider commande' (ou dit oui / confirmé) :
Tu le remercies chaleureusement, tu lui annonces avec enthousiasme que sa commande est validée et part en préparation dans notre Lab à Yaoundé, et qu'il reçoit immédiatement ci-dessous sa facture officielle FYS ainsi que les fiches nutritionnelles de ses cocktails en PDF !

VISION & ANALYSE D'IMAGES REÇUES DU CLIENT (MULTIMODALITÉ PHOTO) :
Quand le client t'envoie une image ou photo :
1. Ordonnance médicale / Bilan de santé / Résultats d'analyses :
   - Analyse attentivement la photo avec empathie et respect de la confidentialité.
   - Identifie les antécédents, pathologies ou contre-indications (ex: glycémie élevée, hypertension, cholestérol, gastrite/ulcère, anémie).
   - RASSURE le client avec chaleur : FYS adapte ses jus naturels à sa condition, mais ne remplace pas son médecin traitant.
   - Si son profil de santé n'est pas encore enregistré, résume ses conditions et intègre TOUT À LA FIN le bloc :::PROFILE_JSON { "healthConditions": [...], "allergies": [...], "goals": [...] } ::: pour enregistrer automatiquement son bilan dans FYS.
   - Propose-lui une recette de jus parfaitement adaptée aux indications de son ordonnance (en respectant les exclusions : pas de pamplemousse, pas d'acidité en cas d'ulcère, etc.).
2. Fruits frais ou ingrédients photographiés :
   - Reconnais précisément les fruits présents sur l'image.
   - Félicite le client pour ses fruits et explique leurs vertus santé.
   - Suggère-lui comment les marier au mieux pour sa santé, ou propose-lui de commander une recette personnalisée FYS enrichie de ces ingrédients.
3. Reçu de paiement Mobile Money (MTN MoMo, Orange Money) :
   - Lis la capture d'écran du reçu (montant en XAF, référence ou ID de transaction).
   - Remercie chaleureusement le client et confirme-lui que son paiement a bien été reçu et que sa commande part en préparation pour sa livraison à Yaoundé.

RÈGLE D'INTERACTION META WHATSAPP GÉNÉRALE (BOUTONS OU LISTES POUR CHAQUE CHOIX) :
Pour offrir une expérience fluide sans saisie fastidieuse au clavier, chaque fois que tu poses une question impliquant un choix :
- Pour 2 ou 3 choix (ex: Oui/Non, Commander/Fiche, Format 500ml/1L, Quantité, Validation) :
  Ajoute TOUJOURS le bloc :::BUTTONS [ {"id": "...", "title": "... (sans emoji, max 20 car)"} ] :::
- Pour plus de 3 choix (ex: liste des quartiers de Yaoundé, sélection d'ingrédients) :
  Ajoute TOUJOURS le bloc :::LIST { "buttonText": "...", "sections": [ {"title": "...", "rows": [{"id": "...", "title": "...", "description": "..."}]} ] } :::`;

// ── Handler principal ─────────────────────────────────────────────────────────

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // 1. Vérification Webhook (GET) demandé par Meta ou Test Diagnostic PDF
  if (req.method === 'GET') {
    // Diagnostique et déclenchement direct du dispatch PDF (Facture + Fiche Nutritionnelle)
    if (req.query.test_pdf_order) {
      try {
        const testOrderId = String(req.query.test_pdf_order);
        const db = getAdminDb();
        if (!db) return res.status(200).json({ error: 'No db instance' });
        const snap = await db.collection('orders').doc(testOrderId).get();
        if (!snap.exists) return res.status(200).json({ error: 'Order not found', testOrderId });
        const orderData = snap.data()!;
        const phone = String(req.query.to || orderData.userPhoneSnapshot || '237675108876');
        const ingredients = orderData.cocktailIngredientsSnapshot || [];
        const result = await sendOrderPdfsToCustomer(phone, orderData, testOrderId, ingredients);
        return res.status(200).json({
          status: 'tested',
          testOrderId,
          phone,
          result,
        });
      } catch (err: any) {
        return res.status(200).json({
          status: 'error',
          error: err?.message || String(err),
          stack: err?.stack || null,
        });
      }
    }

    // Diagnostique direct d'envoi de message pour tester la délivrabilité Meta Cloud API
    if (req.query.test_msg_to) {
      try {
        const to = String(req.query.test_msg_to);
        const text = String(req.query.text || 'Test de connexion NutriFYS Meta Cloud API');
        const isInteractive = req.query.interactive === 'true';
        let result = false;
        if (isInteractive) {
          result = await sendWhatsAppInteractiveButtons(
            to,
            text,
            [
              { id: 'btn_test_custom', title: 'Composer sur-mesure' },
              { id: 'btn_test_catalog', title: 'Jus du catalogue' },
            ],
            undefined,
            'NutriFYS - Test API'
          );
        } else {
          result = await sendWhatsAppMessage(to, text);
        }
        return res.status(200).json({ status: 'test_dispatched', to, isInteractive, result });
      } catch (err: any) {
        return res.status(500).json({ status: 'error', error: err?.message || String(err) });
      }
    }

    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode === 'subscribe' && token === WHATSAPP_VERIFY_TOKEN) {
      console.log('[whatsapp-webhook] Webhook verified successfully by Meta!');
      return res.status(200).send(challenge);
    } else {
      console.warn('[whatsapp-webhook] Verification failed. Tokens do not match.');
      return res.status(403).json({ error: 'Forbidden' });
    }
  }

  // 2. Traitement des messages entrants (POST)
  if (req.method === 'POST') {
    let messageId = '';
    try {
      const entry = req.body?.entry?.[0];
      const changes = entry?.changes?.[0]?.value;

      // 2.0 Traitement et journalisation des statuts de livraison Meta (sent, delivered, read, failed)
      const statuses = changes?.statuses;
      if (statuses && Array.isArray(statuses) && statuses.length > 0) {
        const db = getAdminDb();
        for (const st of statuses) {
          const statusDesc = `ID=${st.id} status=${st.status} recipient=${st.recipient_id}${st.errors ? ' errors=' + JSON.stringify(st.errors) : ''}`;
          if (st.status === 'failed') {
            console.error(`[whatsapp-webhook] ❌ Meta delivery FAILED: ${statusDesc}`);
          } else {
            console.log(`[whatsapp-webhook] 📡 Meta delivery status: ${statusDesc}`);
          }

          if (db) {
            await db.collection('meta_delivery_statuses').add({
              messageId: st.id || '',
              status: st.status || '',
              recipientId: st.recipient_id || '',
              errors: st.errors || null,
              raw: st,
              createdAt: FieldValue.serverTimestamp(),
            }).catch(() => null);

            // Secours automatique : si un message interactif a échoué chez le client, renvoi direct en texte brut
            if (st.status === 'failed' && st.id) {
              try {
                const debugDocs = await db.collection('meta_debug_logs')
                  .where('responseText', '>=', st.id)
                  .where('responseText', '<=', st.id + '\uf8ff')
                  .limit(1)
                  .get();
                if (!debugDocs.empty) {
                  const logData = debugDocs.docs[0].data();
                  const fallbackRecipient = logData.to || st.recipient_id;
                  const fallbackBody = logData.payload?.interactive?.body?.text || logData.payload?.text?.body;
                  if (fallbackRecipient && fallbackBody) {
                    console.warn(`[whatsapp-webhook] 🔄 Auto-recovering failed message ${st.id} with plain text to ${fallbackRecipient}...`);
                    await sendWhatsAppMessage(fallbackRecipient, fallbackBody);
                  }
                }
              } catch (recovErr) {
                console.warn('[whatsapp-webhook] Auto-recovery lookup skipped:', recovErr);
              }
            }
          }
        }
        return res.status(200).json({ status: 'statuses_processed' });
      }

      // Vérifier si un message texte, audio, image ou interactif (bouton cliqué) est présent
      const message = changes?.messages?.[0];
      const isAudioMessage = message?.type === 'audio' || message?.type === 'voice';
      const isImageMessage = message?.type === 'image';
      const isTextMessage = message?.type === 'text';
      const isInteractiveMessage = message?.type === 'interactive';

      if (!message || (!isTextMessage && !isAudioMessage && !isImageMessage && !isInteractiveMessage)) {
        return res.status(200).json({ status: 'ignored_unsupported_type' });
      }

      messageId = message.id || '';
      const senderPhone = message.from; // Numéro international (ex: 237699000000)
      const rawSenderName = changes?.contacts?.[0]?.profile?.name || '';
      const cleanSenderName = rawSenderName
        .replace(/[\p{Extended_Pictographic}\uFE0F\u200D\u20E3]/gu, '')
        .replace(/[^\p{L}\p{N}\s'-]/gu, '')
        .replace(/\s+/g, ' ')
        .trim();
      let senderName = cleanSenderName || '';
      let senderText = message.text?.body?.trim() || message.image?.caption?.trim() || '';

      // Détection naturelle du nom si le client se présente directement dans son message
      if (senderText) {
        const selfIntroMatch = senderText.match(/(?:je\s+m['’]appelle|moi\s+c['’]est|mon\s+nom\s+(?:c['’]est|est)|je\s+suis)\s+([A-ZÀ-ÖØ-öø-ÿ][a-zà-öø-ÿ'-]+(?:\s+[A-ZÀ-ÖØ-öø-ÿ][a-zà-öø-ÿ'-]+)?)/i);
        if (selfIntroMatch && selfIntroMatch[1]) {
          const possibleName = selfIntroMatch[1].trim();
          const lower = possibleName.toLowerCase();
          const forbiddenWords = ['bonjour', 'salut', 'merci', 'oui', 'non', 'ok', 'commander', 'client', 'un', 'une', 'du', 'des', 'le', 'la', 'les', 'pour', 'ici', 'bonsoir', 'coucou'];
          if (possibleName.length >= 2 && !forbiddenWords.includes(lower)) {
            senderName = possibleName;
          }
        }
      }
      let interactiveButtonId = '';

      if (isInteractiveMessage) {
        const btnReply = message.interactive?.button_reply;
        const listReply = message.interactive?.list_reply;
        const chosen = btnReply || listReply;
        if (chosen) {
          interactiveButtonId = chosen.id || '';
          senderText = chosen.title?.trim() || chosen.id || '';
          console.log(`[whatsapp-webhook] 🔘 Interactive response tapped: "${senderText}" (ID: ${interactiveButtonId}) from ${senderPhone}`);
        }
      }

      // Télécharger le fichier audio si le client a envoyé un vocal
      let audioBuffer: Buffer | null = null;
      let audioMimeType = 'audio/ogg';
      if (isAudioMessage) {
        const audioMediaId = message.audio?.id || message.voice?.id;
        if (audioMediaId) {
          console.log(`[whatsapp-webhook] Downloading customer voice note ${audioMediaId}...`);
          const downloaded = await downloadWhatsAppMedia(audioMediaId);
          if (downloaded) {
            audioBuffer = downloaded.buffer;
            audioMimeType = downloaded.mimeType;
            senderText = '[Note vocale reçue du client]';
          }
        }
      }

      // Télécharger le fichier image si le client a envoyé une photo
      let imageBuffer: Buffer | null = null;
      let imageMimeType = 'image/jpeg';
      if (isImageMessage && message.image?.id) {
        console.log(`[whatsapp-webhook] Downloading customer image ${message.image.id}...`);
        const downloaded = await downloadWhatsAppMedia(message.image.id);
        if (downloaded) {
          imageBuffer = downloaded.buffer;
          imageMimeType = downloaded.mimeType || 'image/jpeg';
          if (!senderText) {
            senderText = '[Photo reçue du client]';
          }
        }
      }

      if (!senderPhone || (!senderText && !audioBuffer && !imageBuffer)) {
        return res.status(200).json({ status: 'ignored_empty' });
      }

      // Normalisation du numéro de téléphone et variantes pour requêtes multi-formats fiables
      const cleanDigits = senderPhone.replace(/\D/g, '');
      const local9 = cleanDigits.replace(/^(237|00237)/, '');
      const phoneVariants = Array.from(new Set([
        senderPhone,
        `+${cleanDigits}`,
        cleanDigits,
        local9,
        `+237${local9}`,
        `237${local9}`,
        `00237${local9}`,
      ].filter(Boolean)));

      const messageKind = isAudioMessage ? 'audio' : isImageMessage ? 'image' : isInteractiveMessage ? 'interactive_button' : 'text';
      console.log(`[whatsapp-webhook] Processing ${messageKind} message ${messageId || ''} from ${senderPhone} (${senderName}): "${senderText}"`);

      // Initialiser la base Firestore (si disponible) et charger le contexte client & tarifaire
      let userProfileContext = '';
      const chatHistoryForGemini: { role: 'user' | 'model'; parts: { text: string }[] }[] = [];
      const db = getAdminDb();
      let userDocRef: any = null;
      let webDraftCode = '';
      let webDraft: any = null;
      let isNewDraftCodeInMessage = false;
      let previousSupersededDraftName = '';
      let previousSupersededDraftCode = '';
      let allPhoneUserDocs: any[] = [];
      let existingUserDoc: any = null;
      let isNewClientUser = false;
      let matchedUserEmail = '';
      let buttonsToSend: WhatsAppInteractiveButton[] = [];
      let listToSend: WhatsAppListData | null = null;
      let activeCart: WhatsAppCart | null = null;
      let parsedIntent: any = null;

      // DÉDUPLICATION 1 (META RETRIES) : Ignorer les retries réseau automatiques de Meta sur le même message ID
      if (db && messageId) {
        try {
          const processedRef = db.collection('processed_whatsapp_messages').doc(messageId);
          await processedRef.create({
            senderPhone,
            messageId,
            processedAt: FieldValue.serverTimestamp(),
          });
        } catch (alreadyProcessedErr) {
          console.warn(`[whatsapp-webhook] Message ${messageId} already processed (Meta retry). Ignoring duplicate.`);
          return res.status(200).json({ status: 'already_processed', messageId });
        }
      }

      // RÉTROACTION VISUELLE INSTANTANÉE (Double coche bleue + Indicateur "en train d'écrire...")
      if (messageId) {
        await markWhatsAppMessageAsReadAndTyping(messageId);
      }

      let bottle500Base = 1000;
      let bottle1LBase = 1500;
      let maxMainFruits = 3;
      let maxSupplements = 2;
      let deliveryFee = 1000;
      let activeDeliveryZones: DeliveryZone[] = DEFAULT_DELIVERY_ZONES;
      let catalogCocktails: CatalogCocktail[] = [];
      let isDelivery24hActive = true;
      const availableFruits: {
        id: string;
        name: string;
        price: number;
        isSupplement: boolean;
        incompatibleIds: string[];
      }[] = [];

      if (db) {
        try {
          // ── Détection initiale d'un brouillon de commande web FYS (ex: #FYS-7K2X) ──
          isNewDraftCodeInMessage = false;
          const draftMatch = senderText.match(/#?(FYS-[A-Z0-9]{4})/i);
          if (draftMatch) {
            webDraftCode = draftMatch[1].toUpperCase();
            isNewDraftCodeInMessage = true;
            try {
              const draftSnap = await db.collection('whatsapp_drafts').doc(webDraftCode).get();
              if (draftSnap.exists) {
                webDraft = draftSnap.data();
                console.log(`[whatsapp-webhook] 🍹 Web draft detected: ${webDraftCode} for client:`, webDraft.customerName);
              }
            } catch (dErr) {
              console.warn('[whatsapp-webhook] Failed to load web draft:', dErr);
            }
          }

          // Charger en parallèle la tarification, le catalogue de fruits du Lab et les jus signatures du catalogue FYS
          const [pricingDoc, fruitsSnap, loadedCatalogCocktails] = await Promise.all([
            db.collection('settings').doc('pricing').get().catch(() => null),
            db.collection('fruits').get().catch(() => null),
            getActiveCatalogCocktails(db),
          ]);
          if (Array.isArray(loadedCatalogCocktails)) {
            catalogCocktails = loadedCatalogCocktails;
          }

          if (pricingDoc && pricingDoc.exists) {
            const p = pricingDoc.data();
            if (typeof p?.bottle500mlBase === 'number') bottle500Base = p.bottle500mlBase;
            if (typeof p?.bottle1LBase === 'number') bottle1LBase = p.bottle1LBase;
            if (typeof p?.maxMainFruits === 'number') maxMainFruits = p.maxMainFruits;
            if (typeof p?.maxSupplements === 'number') maxSupplements = p.maxSupplements;
            if (Array.isArray(p?.deliveryZones) && p.deliveryZones.length > 0) {
              activeDeliveryZones = p.deliveryZones;
              currentActiveDeliveryZones = p.deliveryZones;
            }
            if (p?.delivery24hActive !== undefined) {
              isDelivery24hActive = p.delivery24hActive === true;
            } else if (p?.launchNoticeActive !== undefined) {
              isDelivery24hActive = p.launchNoticeActive === true;
            }
          }

          if (fruitsSnap) {
            fruitsSnap.docs.forEach((doc: any) => {
              const d = doc.data();
              const isFruitActive = d.isActive !== false && d.active !== false;
              const isProhibited = doc.id.toLowerCase().includes('pamplemousse') || (d.name || '').toLowerCase().includes('pamplemousse');
              if (isFruitActive && !isProhibited) {
                availableFruits.push({
                  id: doc.id,
                  name: d.name || doc.id,
                  price: typeof d.price === 'number' ? d.price : 0,
                  isSupplement: d.isSupplement === true,
                  incompatibleIds: Array.isArray(d.incompatibleIds) ? d.incompatibleIds : [],
                });
              }
            });
          }

          const usersRef = db.collection('users');
          existingUserDoc = null;

          // Récupérer tous les documents utilisateur associés à ce numéro WhatsApp
          const safeUserVariants = phoneVariants.length > 0 ? phoneVariants.slice(0, 30) : [senderPhone];
          try {
            const phoneUsersSnap = await usersRef.where('phone', 'in', safeUserVariants).get();
            if (!phoneUsersSnap.empty) {
              allPhoneUserDocs = phoneUsersSnap.docs;
            }
          } catch (pErr) {
            console.warn('[whatsapp-webhook] Phone users query error:', pErr);
          }

          // 1. Si le brouillon web a été initié par un utilisateur connecté sur le site
          if (webDraft?.userId && webDraft.userId !== 'guest') {
            const draftUserSnap = await usersRef.doc(webDraft.userId).get().catch(() => null);
            if (draftUserSnap && draftUserSnap.exists) {
              existingUserDoc = draftUserSnap;
            }
          }

          // 2. Priorisation intelligente et FUSION AUTOMATIQUE RÉELLE des doublons
          if (allPhoneUserDocs.length > 1) {
            const googleAccount = allPhoneUserDocs.find((d: any) => d.data()?.email);
            if (googleAccount) {
              existingUserDoc = googleAccount;
              for (const waDoc of allPhoneUserDocs) {
                if (waDoc.id !== googleAccount.id) {
                  try {
                    // Migrer les commandes
                    const oldOrders = await db.collection('orders').where('userId', '==', waDoc.id).get();
                    if (!oldOrders.empty) {
                      const b = db.batch();
                      oldOrders.docs.forEach((o: any) => b.update(o.ref, {
                        userId: googleAccount.id,
                        userEmailSnapshot: googleAccount.data()?.email || o.data().userEmailSnapshot || '',
                      }));
                      await b.commit();
                      console.log(`[whatsapp-webhook] 🔗 Reassigned ${oldOrders.size} orders from duplicate ${waDoc.id} to Google user ${googleAccount.id}`);
                    }
                    // Migrer les notifications
                    const oldNotifs = await db.collection('notifications').where('userId', '==', waDoc.id).get();
                    if (!oldNotifs.empty) {
                      const b = db.batch();
                      oldNotifs.docs.forEach((n: any) => b.update(n.ref, { userId: googleAccount.id }));
                      await b.commit();
                    }
                    // Migrer les messages WhatsApp
                    const oldMsgs = await waDoc.ref.collection('whatsapp_messages').get();
                    if (!oldMsgs.empty) {
                      const targetMsgs = googleAccount.ref.collection('whatsapp_messages');
                      for (const m of oldMsgs.docs) {
                        await targetMsgs.doc(m.id).set(m.data(), { merge: true }).catch(() => null);
                        await m.ref.delete().catch(() => null);
                      }
                    }
                    // Supprimer le compte WhatsApp dupliqué
                    await waDoc.ref.delete();
                    console.log(`[whatsapp-webhook] 🗑️ Automatically fused and deleted duplicate doc ${waDoc.id} into Google account ${googleAccount.id}`);
                  } catch (mergeErr) {
                    console.warn('[whatsapp-webhook] Error auto-fusing duplicate doc:', mergeErr);
                  }
                }
              }
              allPhoneUserDocs = [googleAccount];
            }
          }

          if (!existingUserDoc && allPhoneUserDocs.length > 0) {
            existingUserDoc =
              allPhoneUserDocs.find((d: any) => d.data()?.email) ||
              allPhoneUserDocs.find((d: any) => d.data()?.activeDraftCode) ||
              allPhoneUserDocs[0];
          }

          // 3. Si le message contient un email (ex: client mentionne son compte Google), fusionner et lier immédiatement
          if (senderText) {
            const emailMatch = senderText.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
            if (emailMatch) {
              const email = emailMatch[1].toLowerCase().trim();
              const emailSnap = await usersRef.where('email', '==', email).limit(1).get();
              if (!emailSnap.empty) {
                const googleDoc = emailSnap.docs[0];
                if (existingUserDoc && existingUserDoc.id !== googleDoc.id) {
                  try {
                    const oldOrders = await db.collection('orders').where('userId', '==', existingUserDoc.id).get();
                    if (!oldOrders.empty) {
                      const b = db.batch();
                      oldOrders.docs.forEach((o: any) => b.update(o.ref, {
                        userId: googleDoc.id,
                        userEmailSnapshot: email,
                      }));
                      await b.commit();
                    }
                    await existingUserDoc.ref.delete().catch(() => null);
                    console.log(`[whatsapp-webhook] 🗑️ Merged temporary WhatsApp account ${existingUserDoc.id} into Google account ${googleDoc.id} via email`);
                  } catch (e) {
                    console.warn('[whatsapp-webhook] Email merge error:', e);
                  }
                }
                existingUserDoc = googleDoc;
                console.log(`[whatsapp-webhook] 🔗 Google account linked via email ${email} to phone ${senderPhone}`);
              }
            }
          }

          // ── GESTION DES CONFLITS DE COMMANDES (NOUVEAU BROUILLON LAB VS ANCIEN EN COURS) ──
          if (isNewDraftCodeInMessage && existingUserDoc && webDraftCode) {
            const currentActiveDraft = existingUserDoc.data()?.activeDraftCode;
            if (currentActiveDraft && currentActiveDraft !== webDraftCode) {
              try {
                const prevSnap = await db.collection('whatsapp_drafts').doc(currentActiveDraft).get();
                if (prevSnap.exists) {
                  const prevData = prevSnap.data();
                  if (prevData?.status !== 'converted') {
                    previousSupersededDraftCode = currentActiveDraft;
                    previousSupersededDraftName = prevData?.cocktail?.name || 'Recette précédente';
                    await db.collection('whatsapp_drafts').doc(currentActiveDraft).update({
                      status: 'superseded',
                      supersededBy: webDraftCode,
                      supersededAt: FieldValue.serverTimestamp(),
                    }).catch(() => null);
                    console.log(`[whatsapp-webhook] 🔄 Superseded older pending draft #${previousSupersededDraftCode} (${previousSupersededDraftName}) by new draft #${webDraftCode}`);
                  }
                }
              } catch (err) {
                console.warn('[whatsapp-webhook] Error superseding previous draft:', err);
              }
            }
          }

          if (existingUserDoc) {
            const userData = existingUserDoc.data();
            userDocRef = existingUserDoc.ref;
            matchedUserEmail = userData?.email || '';

            // ── GESTION DU BROUILLON WEB & DÉTECTION DU CHANGEMENT DE RECETTE ──
            // Si le client n'a pas tapé un code #FYS-XXXX dans ce message précis,
            // vérifier s'il souhaite changer de recette, annuler, ou composer un nouveau jus sur WhatsApp
            const isResetOrNewCocktailIntent = !isNewDraftCodeInMessage && /(?:composer\s+(?:un\s+)?autre|nouvelle\s+recette|changer\s+(?:de\s+)?recette|autre\s+(?:jus|cocktail)|annuler|recommencer|je\s+veux|j'aimerais|mets-moi)/i.test(senderText);

            if (isResetOrNewCocktailIntent) {
              console.log(`[whatsapp-webhook] 🔄 Client initiated a new cocktail composition or reset. Purging any active/stale webDraft.`);
              if (userData?.activeDraftCode) {
                await db.collection('whatsapp_drafts').doc(userData.activeDraftCode).update({ status: 'superseded' }).catch(() => null);
              }
              webDraft = null;
              webDraftCode = null;
              if (userData?.activeDraftCode) {
                await userDocRef.set({ activeDraftCode: FieldValue.delete() }, { merge: true }).catch(() => null);
              }
            } else if (!webDraft && userData?.activeDraftCode) {
              // Restauration du brouillon UNIQUEMENT s'il est très récent (< 2 heures) et toujours en statut "draft"
              try {
                const draftSnap = await db.collection('whatsapp_drafts').doc(userData.activeDraftCode).get();
                if (draftSnap.exists) {
                  const dData = draftSnap.data();
                  const createdAtMs = dData?.createdAt?.toMillis
                    ? dData.createdAt.toMillis()
                    : (dData?.createdAt?._seconds ? dData.createdAt._seconds * 1000 : 0);
                  const isRecentDraft = createdAtMs > 0 && (Date.now() - createdAtMs < 2 * 3600 * 1000);
                  if (dData?.status === 'draft' && isRecentDraft) {
                    webDraftCode = userData.activeDraftCode;
                    webDraft = dData;
                    console.log(`[whatsapp-webhook] 🔄 Restored active web draft #${webDraftCode} from user profile:`, webDraft.cocktail?.name);
                  } else {
                    console.log(`[whatsapp-webhook] ⚠️ Stale or already converted webDraft #${userData.activeDraftCode} ignored.`);
                    await userDocRef.set({ activeDraftCode: FieldValue.delete() }, { merge: true }).catch(() => null);
                  }
                }
              } catch (dErr) {
                console.warn('[whatsapp-webhook] Failed to restore activeDraftCode from userData:', dErr);
              }
            }

            // Assurer que le document utilisateur possède bien son uid, son numéro certifié et son activeDraftCode
            const userUpdates: any = {};
            if (!userData?.uid) userUpdates.uid = userDocRef.id;
            if (!userData?.phone) userUpdates.phone = senderPhone;
            if (webDraftCode && userData?.activeDraftCode !== webDraftCode) {
              userUpdates.activeDraftCode = webDraftCode;
            }

            // Mettre à jour et consolider le nom du client avec la meilleure source disponible
            const isGenericDbName = !userData?.name || userData.name === senderPhone || userData.name === 'Client WhatsApp' || userData.name === 'Cher client';
            if (!isGenericDbName) {
              if (!senderName || senderName === 'Cher client') {
                senderName = userData.name.trim();
              }
            } else if (webDraft?.customerName?.trim()) {
              senderName = webDraft.customerName.trim();
              userUpdates.name = senderName;
            } else if (cleanSenderName) {
              senderName = cleanSenderName;
              userUpdates.name = cleanSenderName;
            } else if (senderName && senderName !== 'Cher client' && senderName !== senderPhone) {
              userUpdates.name = senderName;
            }

            if (Object.keys(userUpdates).length > 0) {
              await userDocRef.set(userUpdates, { merge: true });
            }

            // Synchroniser activeDraftCode sur TOUS les documents associés à ce numéro pour éviter tout désalignement
            if (webDraftCode && allPhoneUserDocs.length > 0) {
              for (const pDoc of allPhoneUserDocs) {
                if (pDoc.id !== userDocRef.id && pDoc.data()?.activeDraftCode !== webDraftCode) {
                  await pDoc.ref.set({ activeDraftCode: webDraftCode }, { merge: true }).catch(() => null);
                }
              }
            }

            // Lier le numéro et nom du client dans whatsapp_drafts si pas encore fait
            if (webDraftCode) {
              await db.collection('whatsapp_drafts').doc(webDraftCode).set({
                customerPhone: senderPhone,
                ...(webDraft?.customerName ? {} : { customerName: senderName }),
              }, { merge: true }).catch(() => null);
            }

            // Si le brouillon web fournit un profil de santé, l'enregistrer dans le profil
            if (webDraft?.healthProfile) {
              const hp = webDraft.healthProfile;
              if (hp.healthConditions?.length || hp.allergies?.length || hp.goals?.length) {
                await userDocRef.set({
                  healthConditions: hp.healthConditions || [],
                  allergies: hp.allergies || [],
                  goals: hp.goals || [],
                  hasHealthProfile: true,
                  updatedAt: FieldValue.serverTimestamp(),
                }, { merge: true });

                try {
                  await userDocRef.collection('profile').doc('main').set({
                    userId: userDocRef.id,
                    healthConditions: hp.healthConditions || [],
                    allergies: hp.allergies || [],
                    goals: hp.goals || [],
                    channel: 'whatsapp',
                    updatedAt: FieldValue.serverTimestamp(),
                  }, { merge: true });
                } catch (e) {
                  console.warn('[whatsapp-webhook] Subcollection profile write skipped:', e);
                }
              }
            }

            let conditions: string[] = [];
            let allergies: string[] = [];
            let goals: string[] = [];

            try {
              const profileSnap = await userDocRef.collection('profile').doc('main').get();
              if (profileSnap.exists) {
                const p = profileSnap.data();
                if (p?.healthConditions?.length) conditions = p.healthConditions;
                if (p?.allergies?.length) allergies = p.allergies;
                if (p?.goals?.length) goals = p.goals;
              }
            } catch (pErr) {
              console.warn('[whatsapp-webhook] Subcollection profile check skipped:', pErr);
            }

            if (!conditions.length && userData?.healthConditions?.length) {
              conditions = userData.healthConditions;
            }
            if (!allergies.length && userData?.allergies?.length) {
              allergies = userData.allergies;
            }
            if (!goals.length && userData?.goals?.length) {
              goals = userData.goals;
            }

            // Calcul des tarifs stricts selon la vraie formule FYS
            const webDraftIngredients = Array.isArray(webDraft?.cocktail?.ingredients) ? webDraft.cocktail.ingredients : [];
            const webDraftMainFruits = webDraftIngredients.filter((i: any) => !i.isSupplement && i.role !== 'supplement');
            const isSingleWebDraftFruit = webDraftMainFruits.length === 1;
            const webDraftIngredientsSum = webDraftIngredients.reduce((s: number, i: any) => {
              const isMain = !i.isSupplement && i.role !== 'supplement';
              const multiplier = (isSingleWebDraftFruit && isMain) ? 2 : 1;
              const snapPrice = Number(i.priceSnapshot);
              if (snapPrice > 0) return s + (snapPrice * multiplier);
              const foundInStock = availableFruits.find(f => f.id.toLowerCase() === (i.fruitId || i.id || '').toLowerCase() || f.name.toLowerCase() === (i.fruitName || i.name || '').toLowerCase());
              return s + ((foundInStock?.price || 0) * multiplier);
            }, 0);
            const exactDraftPrice500 = bottle500Base + webDraftIngredientsSum;
            const exactDraftPrice1L = bottle1LBase + webDraftIngredientsSum;
            const webDraftDistrict = (webDraft?.deliveryDetails?.district || (existingUserDoc?.data()?.activeWhatsAppCart?.district) || activeCart?.district || '').trim();
            const exactDraftDeliveryFee = getDeliveryZoneForDistrict(webDraftDistrict, activeDeliveryZones).fee;

            if (webDraft) {
              const cocktailName = webDraft.cocktail?.name || 'Mon Jus Personnalisé';
              const ingredientsNames = webDraftIngredients.length
                ? webDraftIngredients.map((i: any) => i.fruitName || i.name).filter(Boolean).join(', ')
                : 'Fruits frais';
              const sugarMention = webDraft.hasAddedSugar ? 'Avec sucre ajouté' : 'Sans sucre ajouté (100% pur)';
              const rawGreeting = webDraft.customerName?.trim() || userData.name || senderName;
              const customerGreetingName = rawGreeting
                .replace(/[\p{Extended_Pictographic}\uFE0F\u200D\u20E3]/gu, '')
                .replace(/[^\p{L}\p{N}\s'-]/gu, '')
                .replace(/\s+/g, ' ')
                .trim() || 'cher client';

              const supersedeContextNotice = previousSupersededDraftName
                ? `\n\n⚠️ RÈGLE DE REMPLACEMENT D'ANCIENNE COMMANDE NON FINALISÉE :
Le client avait commencé une commande pour son cocktail "${previousSupersededDraftName}" (#${previousSupersededDraftCode}) mais ne l'avait pas finalisée. Il vient de composer au Lab Web cette NOUVELLE création : "${cocktailName}" (#${webDraftCode}).
Consigne d'accueil : Informe-le avec enthousiasme et bienveillance que nous passons bien sur sa nouvelle recette "${cocktailName}" (#${webDraftCode}) (l'ancienne commande non validée a été annulée/remplacée). Demande-lui quel format il souhaite (500ml ou 1L).`
                : '';

              userProfileContext = `\n\nCOMMANDE EN COURS DU LAB WEB FYS (RÉFÉRENCE OFFICIELLE #${webDraftCode}) :
- Client : ${customerGreetingName}
- Recette composée au Lab FYS : "${cocktailName}"
- Ingrédients stricts de la recette : ${ingredientsNames}
- Sucre : ${sugarMention}
- Tarifs fermes et définitifs fixés par l'équipe FYS (à annoncer directement sans aucune décomposition) :
  * Bouteille 500ml : ${exactDraftPrice500.toLocaleString('fr-FR')} XAF
  * Bouteille 1L : ${exactDraftPrice1L.toLocaleString('fr-FR')} XAF
  * Livraison Yaoundé (départ atelier Nsimeyong) : ${webDraftDistrict ? `${exactDraftDeliveryFee.toLocaleString('fr-FR')} XAF pour ${webDraftDistrict}` : 'selon le quartier (Zone 1 : 1 000 XAF, Zone 2 : 1 500 XAF, Zone 3 : 2 000 XAF)'}${supersedeContextNotice}

CONSIGNES STRICTES ANTI-HALLUCINATION POUR CETTE COMMANDE :
1. LE CLIENT COMMANDE CE JUS PRÉCIS DU LAB : "${cocktailName}" (${ingredientsNames}).
2. INTERDICTION FORMELLE ET ABSOLUE de lui proposer une autre recette, d'inventer des fruits ou de changer le nom du cocktail (ne propose JAMAIS "Cocktail Douceur Tension" ou une autre recette inventée !).
3. NE REPOSE PAS le questionnaire de santé : son profil et sa recette sont déjà validés.
4. Si la commande n'est pas encore finalisée, guide-le simplement à travers les questions détachées : format (500ml ou 1L), quantité de bouteilles, et quartier de livraison.
5. PRIX FERMES : N'annonce JAMAIS d'autre prix unitaire que ${exactDraftPrice500.toLocaleString('fr-FR')} XAF (pour 500ml) ou ${exactDraftPrice1L.toLocaleString('fr-FR')} XAF (pour 1L).
6. FRAIS DE LIVRAISON : Applique le tarif de livraison selon le quartier depuis Nsimeyong (Zone 1 : 1 000 XAF, Zone 2 : 1 500 XAF, Zone 3 : 2 000 XAF). ${webDraftDistrict ? `Pour ${webDraftDistrict}, c'est exactement ${exactDraftDeliveryFee.toLocaleString('fr-FR')} XAF.` : 'Si le quartier n\'est pas encore précisé, demande son quartier de livraison.'}
7. N'EXPLIQUE JAMAIS la politique des prix ni aucune décomposition de coût. Si le client demande des justificatifs, réponds simplement que c'est le prix fixé par l'équipe FYS.
8. Lors de la confirmation finale (:::ORDER_JSON) :
   - "cocktailName" DOIT être strictement "${cocktailName}"
   - "fruits" DOIT être strictement ${JSON.stringify(webDraftIngredients.map((i: any) => i.fruitName || i.name))}
   - "unitPrice" DOIT être ${exactDraftPrice500} (pour 500ml) ou ${exactDraftPrice1L} (pour 1L)
   - "deliveryFee" DOIT être ${exactDraftDeliveryFee}`;
            } else {
              const hasProfile = conditions.length > 0 || allergies.length > 0 || goals.length > 0;
              if (hasProfile) {
                userProfileContext = `\n\nPROFIL DE SANTÉ COMPLET DU CLIENT (DÉJÀ ENREGISTRÉ DANS FYS) :
- Objectifs bien-être : ${goals.length ? goals.join(', ') : 'Général'}
- Conditions médicales / Antécédents : ${conditions.length ? conditions.join(', ') : 'Aucune condition particulière'}
- Allergies & Intolérances : ${allergies.length ? allergies.join(', ') : 'Aucune allergie signalée'}
CONSIGNE PROFIL : Ce profil est déjà complet. Travaille avec ces données tout au long de la discussion pour lui recommander les meilleurs jus et respecter toutes ses contre-indications. Ne lui repose pas le questionnaire.`;
              } else {
                userProfileContext = `\n\nSTATUT PROFIL DE SANTÉ : AUCUN PROFIL ENREGISTRÉ (NOUVEAU CLIENT).
CONSIGNE CRITIQUE : Tu dois d'abord réaliser son bilan de santé avec douceur et empathie (ses objectifs bien-être, ses conditions de santé comme diabète/tension/ulcère ou s'il n'en a aucune, et ses allergies). Dès que tu as ses réponses, valide son profil et ajoute :::PROFILE_JSON { "healthConditions": [...], "allergies": [...], "goals": [...] } ::: pour qu'il soit enregistré dans FYS.`;
              }
            }

            // Récupérer les messages récents pour garder le fil naturel
            // IMPORTANT ANTI-CONFLIT : Si le client arrive avec un NOUVEAU brouillon (#FYS-XXXX),
            // NE PAS charger l'historique des discussions précédentes, car cela polluerait l'IA avec
            // les questions/ingrédients d'une ancienne commande !
            if (!isNewDraftCodeInMessage) {
              const historySnap = await userDocRef
                .collection('whatsapp_messages')
                .orderBy('timestamp', 'desc')
                .limit(25)
                .get();

              if (!historySnap.empty) {
                const rawHistory = historySnap.docs.map((d: any) => d.data()).reverse();
                for (const m of rawHistory) {
                  if (m.text) {
                    chatHistoryForGemini.push({
                      role: m.sender === 'user' ? 'user' : 'model',
                      parts: [{ text: m.text }],
                    });
                  }
                }
              } else if (!isNewDraftCodeInMessage) {
                isNewClientUser = true;
              }
            }
          } else {
            // NOUVEAU CLIENT : Création officielle du compte avec son numéro au moment de l'envoi WhatsApp
            isNewClientUser = true;
            const isResetOrNewCocktailIntent = !isNewDraftCodeInMessage && /(?:composer\s+(?:un\s+)?autre|nouvelle\s+recette|changer\s+(?:de\s+)?recette|autre\s+(?:jus|cocktail)|annuler|recommencer|je\s+veux|j'aimerais|mets-moi)/i.test(senderText);
            if (!webDraft && !isResetOrNewCocktailIntent) {
              try {
                const draftsSnap = await db.collection('whatsapp_drafts')
                  .where('customerPhone', 'in', safeUserVariants)
                  .where('status', '==', 'draft')
                  .limit(5)
                  .get();
                if (!draftsSnap.empty) {
                  const sorted = draftsSnap.docs
                    .map(d => ({
                      id: d.id,
                      data: d.data(),
                      t: d.data()?.createdAt?.toMillis ? d.data().createdAt.toMillis() : (d.data()?.createdAt?._seconds ? d.data().createdAt._seconds * 1000 : 0)
                    }))
                    .filter(x => x.t > 0 && Date.now() - x.t < 2 * 3600 * 1000)
                    .sort((a, b) => b.t - a.t);

                  if (sorted.length > 0) {
                    webDraftCode = sorted[0].id;
                    webDraft = sorted[0].data;
                    console.log(`[whatsapp-webhook] 🔄 Restored active draft #${webDraftCode} for new user from phone query:`, webDraft.cocktail?.name);
                  }
                }
              } catch (e) {
                console.warn('[whatsapp-webhook] Phone drafts query bypassed for new user:', e);
              }
            }

            const newDocRef = usersRef.doc();
            const rawInitName = webDraft?.customerName?.trim() || senderName || cleanSenderName || '';
            const initialName = rawInitName
              .replace(/[\p{Extended_Pictographic}\uFE0F\u200D\u20E3]/gu, '')
              .replace(/[^\p{L}\p{N}\s'-]/gu, '')
              .replace(/\s+/g, ' ')
              .trim();
            if (initialName && (!senderName || senderName === 'Cher client')) {
              senderName = initialName;
            }
            const initialConditions = webDraft?.healthProfile?.healthConditions || [];
            const initialAllergies = webDraft?.healthProfile?.allergies || [];
            const initialGoals = webDraft?.healthProfile?.goals || [];
            const hasWebProfile = initialConditions.length > 0 || initialAllergies.length > 0 || initialGoals.length > 0;

            await newDocRef.set({
              uid: newDocRef.id,
              id: newDocRef.id,
              name: initialName,
              phone: senderPhone,
              email: '',
              role: 'customer',
              channel: 'whatsapp',
              healthConditions: initialConditions,
              allergies: initialAllergies,
              goals: initialGoals,
              hasHealthProfile: hasWebProfile,
              activeDraftCode: webDraftCode || null,
              createdAt: FieldValue.serverTimestamp(),
              updatedAt: FieldValue.serverTimestamp(),
            });
            userDocRef = newDocRef;

            if (webDraftCode) {
              await db.collection('whatsapp_drafts').doc(webDraftCode).set({
                customerPhone: senderPhone,
                ...(webDraft?.customerName ? {} : { customerName: senderName }),
              }, { merge: true }).catch(() => null);
            }

            if (hasWebProfile) {
              try {
                await newDocRef.collection('profile').doc('main').set({
                  userId: newDocRef.id,
                  healthConditions: initialConditions,
                  allergies: initialAllergies,
                  goals: initialGoals,
                  channel: 'whatsapp',
                  createdAt: FieldValue.serverTimestamp(),
                  updatedAt: FieldValue.serverTimestamp(),
                });
              } catch (e) {
                console.warn('[whatsapp-webhook] Initial profile/main write skipped:', e);
              }
            }

            // Calcul des tarifs stricts selon la vraie formule FYS
            const webDraftIngredients = Array.isArray(webDraft?.cocktail?.ingredients) ? webDraft.cocktail.ingredients : [];
            const webDraftMainFruits = webDraftIngredients.filter((i: any) => !i.isSupplement && i.role !== 'supplement');
            const isSingleWebDraftFruit = webDraftMainFruits.length === 1;
            const webDraftIngredientsSum = webDraftIngredients.reduce((s: number, i: any) => {
              const isMain = !i.isSupplement && i.role !== 'supplement';
              const multiplier = (isSingleWebDraftFruit && isMain) ? 2 : 1;
              const snapPrice = Number(i.priceSnapshot);
              if (snapPrice > 0) return s + (snapPrice * multiplier);
              const foundInStock = availableFruits.find(f => f.id.toLowerCase() === (i.fruitId || i.id || '').toLowerCase() || f.name.toLowerCase() === (i.fruitName || i.name || '').toLowerCase());
              return s + ((foundInStock?.price || 0) * multiplier);
            }, 0);
            const exactDraftPrice500 = bottle500Base + webDraftIngredientsSum;
            const exactDraftPrice1L = bottle1LBase + webDraftIngredientsSum;
            const webDraftDistrict = (webDraft?.deliveryDetails?.district || (existingUserDoc?.data()?.activeWhatsAppCart?.district) || activeCart?.district || '').trim();
            const exactDraftDeliveryFee = getDeliveryZoneForDistrict(webDraftDistrict, activeDeliveryZones).fee;

            if (webDraft) {
              const cocktailName = webDraft.cocktail?.name || 'Mon Jus Personnalisé';
              const ingredientsNames = webDraftIngredients.length
                ? webDraftIngredients.map((i: any) => i.fruitName || i.name).filter(Boolean).join(', ')
                : 'Fruits frais';
              const sugarMention = webDraft.hasAddedSugar ? 'Avec sucre ajouté' : 'Sans sucre ajouté (100% pur)';

              userProfileContext = `\n\nCOMMANDE EN COURS DU LAB WEB FYS (RÉFÉRENCE OFFICIELLE #${webDraftCode}) :
- Client : ${initialName}
- Recette composée au Lab FYS : "${cocktailName}"
- Ingrédients stricts de la recette : ${ingredientsNames}
- Sucre : ${sugarMention}
- Tarifs fermes et définitifs fixés par l'équipe FYS (à annoncer directement sans aucune décomposition) :
  * Bouteille 500ml : ${exactDraftPrice500.toLocaleString('fr-FR')} XAF
  * Bouteille 1L : ${exactDraftPrice1L.toLocaleString('fr-FR')} XAF
  * Livraison Yaoundé (départ atelier Nsimeyong) : ${webDraftDistrict ? `${exactDraftDeliveryFee.toLocaleString('fr-FR')} XAF pour ${webDraftDistrict}` : 'selon le quartier (Zone 1 : 1 000 XAF, Zone 2 : 1 500 XAF, Zone 3 : 2 000 XAF)'}

CONSIGNES STRICTES ANTI-HALLUCINATION POUR CETTE COMMANDE :
1. LE CLIENT COMMANDE CE JUS PRÉCIS DU LAB : "${cocktailName}" (${ingredientsNames}).
2. INTERDICTION FORMELLE ET ABSOLUE de lui proposer une autre recette, d'inventer des fruits ou de changer le nom du cocktail (ne propose JAMAIS "Cocktail Douceur Tension" ou une autre recette inventée !).
3. NE REPOSE PAS le questionnaire de santé : son profil et sa recette sont déjà validés.
4. Si la commande n'est pas encore finalisée, guide-le simplement à travers les questions détachées : format (500ml ou 1L), quantité de bouteilles, et quartier de livraison.
5. PRIX FERMES : N'annonce JAMAIS d'autre prix unitaire que ${exactDraftPrice500.toLocaleString('fr-FR')} XAF (pour 500ml) ou ${exactDraftPrice1L.toLocaleString('fr-FR')} XAF (pour 1L).
6. FRAIS DE LIVRAISON : Applique le tarif de livraison selon le quartier depuis Nsimeyong (Zone 1 : 1 000 XAF, Zone 2 : 1 500 XAF, Zone 3 : 2 000 XAF). ${webDraftDistrict ? `Pour ${webDraftDistrict}, c'est exactement ${exactDraftDeliveryFee.toLocaleString('fr-FR')} XAF.` : 'Si le quartier n\'est pas encore précisé, demande son quartier de livraison.'}
7. N'EXPLIQUE JAMAIS la politique des prix ni aucune décomposition de coût. Si le client demande des justificatifs, réponds simplement que c'est le prix fixé par l'équipe FYS.
8. Lors de la confirmation finale (:::ORDER_JSON) :
   - "cocktailName" DOIT être strictement "${cocktailName}"
   - "fruits" DOIT être strictement ${JSON.stringify(webDraftIngredients.map((i: any) => i.fruitName || i.name))}
   - "unitPrice" DOIT être ${exactDraftPrice500} (pour 500ml) ou ${exactDraftPrice1L} (pour 1L)
   - "deliveryFee" DOIT être ${exactDraftDeliveryFee}`;
            } else {
              userProfileContext = `\n\nSTATUT PROFIL DE SANTÉ : NOUVEAU CLIENT SANS PROFIL ENREGISTRÉ.
CONSIGNE CRITIQUE : Accueille-le chaleureusement et réalise son bilan de santé bienveillant (objectifs, conditions de santé, allergies).
Dès qu'il a répondu, insère le bloc :::PROFILE_JSON { "healthConditions": [...], "allergies": [...], "goals": [...] } ::: pour enregistrer son profil dans la base FYS.`;
            }
          }

          if (userDocRef) {
            await userDocRef.collection('whatsapp_messages').add({
              sender: 'user',
              text: senderText,
              timestamp: FieldValue.serverTimestamp(),
            });
          }
        } catch (dbErr) {
          console.warn('[whatsapp-webhook] Firestore history retrieval skipped:', dbErr);
        }
      }

      const isGenericName = !senderName || senderName === 'Cher client' || senderName === 'Client WhatsApp' || senderName === senderPhone;
      const customerFirstName = !isGenericName ? extractFirstName(senderName) : '';

      // Appeler le modèle Gemini avec le prompt NutriFYS et tout l'historique
      if (!GEMINI_API_KEY) {
        console.error('[whatsapp-webhook] GEMINI_API_KEY missing');
        const fallbackGreeting = customerFirstName ? `Bonjour ${customerFirstName} !` : 'Bonjour et bienvenue chez FYS !';
        await sendWhatsAppMessage(
          senderPhone,
          `${fallbackGreeting} Notre assistant NutriFYS est à votre service.\n\nBesoin d'aide ou d'informations directes ? Notre équipe est à votre écoute :\n${FYS_TEAM_CONTACTS_TEXT}`,
        );
        return res.status(200).json({ status: 'no_gemini_key' });
      }

      const isUserExplicitGreeting = Boolean(
        senderText && /(?:^|\b)(?:bonjour|salut|hello|bonsoir|coucou|yo|rebonjour|hey|allo)(?:\b|$)/i.test(senderText)
      );

      const hasHistory = chatHistoryForGemini.length > 0;
      let conversationRules = '';

      if (hasHistory) {
        if (isUserExplicitGreeting) {
          const greetingGuideline = customerFirstName
            ? `Le client vous salue (« ${senderText} »). Salue-le chaleureusement en l'appelant par son prénom (« Bonjour ${customerFirstName} ! »). BANNIS ABSOLUMENT « cher(e) client(e) », « cher client », « cher ami ».`
            : `Le client vous salue (« ${senderText} »). Salue-le chaleureusement (« Bonjour et bienvenue chez FYS ! »). BANNIS ABSOLUMENT « cher(e) client(e) ».`;
          conversationRules = `\nRÈGLE DE SALUTATION : ${greetingGuideline}
RÈGLE CENTRALE DU DOUBLE CHOIX FYS : Propose-lui le choix entre « Composer sur-mesure » au Lab et « Jus du catalogue », avec les boutons :::BUTTONS [{"id": "btn_mode_custom", "title": "Composer sur-mesure"}, {"id": "btn_mode_catalog", "title": "Jus du catalogue"}].
RÈGLE SUR LES CONTACTS : N'affiche pas les numéros de contact sauf s'il le demande explicitement.`;
        } else {
          conversationRules = `\nRÈGLE DE CONVERSATION EN COURS (NATURELLE & SANS SALUTATIONS RÉPÉTÉES) :
- La discussion est DÉJÀ ENGAGÉE et en cours. Le client est en train de répondre (« ${senderText} »).
- ⛔ INTERDICTION FORMELLE DE REDIRE « BONJOUR », « SALUT », « CHER CLIENT », « CHER AMI » OU DE RE-SALUER : Ne commence JAMAIS ton message par « Bonjour », « Salut », etc. Réponds DIRECTEMENT, naturellement et avec fluidité (ex: « C'est un excellent choix ! », « C'est bien noté ! », « Parfait ! »).
- RÈGLE CENTRALE DU DOUBLE CHOIX FYS : Si le client exprime une envie de jus ou demande un conseil/menu sans avoir encore de recette en cours : propose-lui le choix entre « Composer sur-mesure » au Lab et « Jus du catalogue », avec les boutons :::BUTTONS [{"id": "btn_mode_custom", "title": "Composer sur-mesure"}, {"id": "btn_mode_catalog", "title": "Jus du catalogue"}].
- RÈGLE STRICTE SUR LES CONTACTS : N'AFFICHE PAS les numéros de téléphone FYS dans les messages intermédiaires. Affiche-les UNIQUEMENT si le client demande expressément un contact, de l'aide ou à appeler l'équipe :\n${FYS_TEAM_CONTACTS_TEXT}`;
        }
      } else {
        const welcomeGreeting = customerFirstName
          ? `Salue-le chaleureusement en l'appelant par son prénom (« Bonjour ${customerFirstName} ! »). BANNIS ABSOLUMENT « cher(e) client(e) », « cher client ».`
          : `Salue-le chaleureusement (« Bonjour et bienvenue chez FYS ! »). BANNIS ABSOLUMENT « cher(e) client(e) ».`;
        conversationRules = isNewClientUser
          ? `\nRÈGLE D'ACCUEIL (NOUVEAU CLIENT) : C'est le tout premier échange avec ce nouveau client. ${welcomeGreeting} Réalise son bilan de santé bienveillant, présente les deux options FYS (Composer sur-mesure au Lab ou Jus du catalogue) avec les boutons :::BUTTONS [{"id": "btn_mode_custom", "title": "Composer sur-mesure"}, {"id": "btn_mode_catalog", "title": "Jus du catalogue"}], et inclus les contacts officiels de l'équipe FYS :\n${FYS_TEAM_CONTACTS_TEXT}`
          : `\nRÈGLE D'ACCUEIL (CLIENT CONNU) : Salue chaleureusement avec respect. ${welcomeGreeting} Présente les deux options FYS (Composer sur-mesure au Lab ou Jus du catalogue) avec les boutons :::BUTTONS [{"id": "btn_mode_custom", "title": "Composer sur-mesure"}, {"id": "btn_mode_catalog", "title": "Jus du catalogue"}]. N'affiche pas les numéros de contact sauf s'il le demande explicitement.`;
      }

      // ── CHARGEMENT & GESTION DÉTERMINISTE DU PANIER MULTI-BOISSONS (activeWhatsAppCart) ──
      activeCart = null;
      const rawUserCart = existingUserDoc?.data()?.activeWhatsAppCart;
      let pendingCatalogSelection = existingUserDoc?.data()?.pendingCatalogSelection || null;
      if (pendingCatalogSelection) {
        const pendingAgeMs = Date.now() - (pendingCatalogSelection.updatedAt || pendingCatalogSelection.timestamp || 0);
        if (pendingAgeMs > 2 * 3600 * 1000) {
          pendingCatalogSelection = null;
          if (userDocRef) {
            await userDocRef.set({ pendingCatalogSelection: FieldValue.delete() }, { merge: true }).catch(() => null);
          }
        }
      }

      if (rawUserCart && Array.isArray(rawUserCart.items) && rawUserCart.items.length > 0) {
        // Expiration stricte après 2 heures d'inactivité
        const cartAgeMs = Date.now() - (rawUserCart.updatedAt || 0);
        if (cartAgeMs > 2 * 3600 * 1000) {
          console.log(`[whatsapp-webhook] ⏰ activeWhatsAppCart expiré pour ${senderPhone} (${Math.round(cartAgeMs / 60000)} mins). Réinitialisation.`);
          if (userDocRef) {
            await userDocRef.set({ activeWhatsAppCart: FieldValue.delete() }, { merge: true }).catch(() => null);
          }
        } else {
          // Recalculer immédiatement avec les tarifs et catalogue à jour (0% hallucination)
          activeCart = computeCartFromRawItems(
            rawUserCart.items,
            availableFruits,
            bottle500Base,
            bottle1LBase,
            rawUserCart.district
          );
        }
      }

      // Détection explicite de l'intention d'ajouter une boisson à la commande existante
      const isAddIntent = /(?:ajout(?:er?|e|ons)|en\s+plus|aussi|(?:une|un)\s+autre\s+(?:commande|boisson|recette|jus|cocktail|bouteille|m[ée]lange)|deuxi[eè]me|2e|second)/i.test(senderText);

      // Détection de volonté d'annulation / recommencer / changer de commande (y compris fautes de frappe courantes comme analuer, anuler)
      const resetIntentRegex = /(?:annul(?:er?|ez?|ation)?|analu(?:er?|ez?)|anul(?:er?|ez?)|recommencer|laisse\s+tomber|oublie|remplacer|changer\s+(?:de\s+)?(?:recette|boisson|cocktail)|autre\s+(?:truc|chose|m[ée]lange|boisson|recette|jus|cocktail)|nouvelle\s+recette|choisir\s+d'autres|d'autres\s+fruits?|autres?\s+fruits?|vider\s+(?:le\s+)?panier|supprimer\s+(?:la\s+)?commande|effacer\s+(?:tout|la\s+commande)|remettre\s+[àa]\s+z[ée]ro|reset\b)/i;

      // Détection d'une réinitialisation explicite souhaitée par le client
      const isExplicitReset = !isAddIntent && /(?:annul(?:er?|ez?|ation)?|analu(?:er?|ez?)|anul(?:er?|ez?)|vider\s+(?:le\s+)?panier|supprimer\s+(?:la\s+)?commande|effacer\s+(?:tout|la\s+commande)|remettre\s+[àa]\s+z[ée]ro|reset\b)/i.test(senderText);

      // Détection explicite d'une demande de nouvelle composition / conseil pour un jus
      const isNewRecipeIntent = !isAddIntent && /(?:compose(?:r|-moi|\s+moi)?|propose(?:r|-moi|\s+moi)?|fais(?:-moi|\s+moi)?|donne(?:-moi|\s+moi)?|cr[ée]er?|aide(?:-moi|\s+moi)?\s+(?:[àa]\s+)?composer|nouveau\s+jus|nouvelle\s+composition|nouveau\s+cocktail|nouvelle\s+boisson|nouvelle\s+recette|nouvelle\s+commande|bon\s+jus)/i.test(senderText);

      if (senderText && (isExplicitReset || (!isAddIntent && (resetIntentRegex.test(senderText) || isNewRecipeIntent)))) {
        console.log(`[whatsapp-webhook] 🔄 Intention de réinitialisation détectée ("${senderText}"). Nettoyage immédiat du panier.`);
        activeCart = null;
        pendingCatalogSelection = null;
        if (userDocRef) {
          await userDocRef.set({
            activeWhatsAppCart: FieldValue.delete(),
            activeWhatsAppDraft: FieldValue.delete(),
            pendingCatalogSelection: FieldValue.delete(),
            selectedMode: FieldValue.delete(),
          }, { merge: true }).catch(() => null);
        }

        if (isExplicitReset) {
          const resetMsg = `Votre panier et vos commandes ont bien été réinitialisés.\n\nQue souhaitez-vous faire maintenant ?\n• Composer votre cocktail sur-mesure au Lab\n• Découvrir nos jus signatures du catalogue (min. 5 bouteilles combinables)`;
          await sendWhatsAppInteractiveButtons(
            senderPhone,
            resetMsg,
            [
              { id: 'btn_mode_custom', title: 'Sur-mesure (Lab)' },
              { id: 'btn_mode_catalog', title: 'Jus du catalogue' },
            ],
            'FYS · Réinitialisation',
            'Nouveau départ'
          );
          if (userDocRef) {
            await userDocRef.collection('whatsapp_messages').add({
              sender: 'nutrifys',
              text: resetMsg,
              timestamp: FieldValue.serverTimestamp(),
            }).catch(() => null);
          }
          return res.status(200).json({ status: 'ok', handled: 'explicit_cart_reset' });
        }
      }

      // ── DÉTERMINATION & CALCUL DE LA RECETTE ET DES PRIX DYNAMIQUES ──
      let activeRecipeIngredients: { fruitId: string; fruitName: string; priceSnapshot: number; isSupplement?: boolean; incompatibleIds?: string[] }[] = [];
      let activeRecipeName = '';

      // 1. Détection prioritaire des jus signatures du catalogue FYS dans le message
      const extractedCatalogOrders = (!isAddIntent && isNewRecipeIntent)
        ? []
        : extractCatalogOrdersFromText(senderText, catalogCocktails);

      if (extractedCatalogOrders && extractedCatalogOrders.length > 0) {
        console.log(`[whatsapp-webhook] Détection directe de ${extractedCatalogOrders.length} jus du catalogue dans le message :`, extractedCatalogOrders.map((o) => `${o.quantity ?? '?'}x ${o.cocktail.name}`));

        // Cas 1 : Un seul jus mentionné sans quantité explicite (ex: "je veux le jus papaye orange" ou "ananas gingembre")
        if (extractedCatalogOrders.length === 1 && extractedCatalogOrders[0].quantity === null) {
          const singleOrder = extractedCatalogOrders[0];
          const c = singleOrder.cocktail;
          const containers = Array.isArray(c.containers) && c.containers.length > 0
            ? c.containers
            : [{ label: '350ml', price: 500 }];

          if (containers.length > 1) {
            const formatButtons = containers.slice(0, 3).map((ct: any, idx: number) => ({
              id: `btn_catfmt_${c.id}_${idx}`,
              title: `${ct.label} (${(Number(ct.price) || 0).toLocaleString('fr-FR')} XAF)`.slice(0, 20),
            }));
            const fmtPrompt = `Pour notre jus signature « ${c.name} », quel format préférez-vous ?`;
            await sendWhatsAppInteractiveButtons(
              senderPhone,
              fmtPrompt,
              formatButtons,
              'FYS · Choix du format',
              c.name
            );
            if (userDocRef) {
              await userDocRef.collection('whatsapp_messages').add({
                sender: 'nutrifys',
                text: fmtPrompt,
                timestamp: FieldValue.serverTimestamp(),
              }).catch(() => null);
            }
            return res.status(200).json({ status: 'ok', handled: 'catalog_format_prompt_from_text' });
          }

          const container = containers[0];
          const unitPrice = typeof container.price === 'number' ? container.price : 500;
          const bottleSizeLabel = container.label || '350ml';

          const currentCatalogTotal = activeCart ? activeCart.items.filter((i) => i.isCatalog).reduce((s, i) => s + i.quantity, 0) : 0;
          const existingCartSummary = activeCart && activeCart.items.length > 0
            ? `\n\nVotre panier contient déjà :\n${activeCart.items.map((i) => `• ${i.quantity} × ${i.cocktailName} (${i.bottleSizeLabel})`).join('\n')}\n(Total actuel : ${currentCatalogTotal} / 5 bouteilles)`
            : '';

          const qtyPrompt = `Très bon choix. Vous avez sélectionné notre jus signature « ${c.name} » (${bottleSizeLabel} à ${unitPrice.toLocaleString('fr-FR')} XAF l'unité).${existingCartSummary}\n\nCombien de bouteilles de cette recette souhaitez-vous ajouter ? (Commande minimale de 5 bouteilles au total, combinables entre plusieurs jus)`;
          await sendWhatsAppInteractiveButtons(
            senderPhone,
            qtyPrompt,
            [
              { id: `btn_catqty_${c.id}_0_1`, title: '1 Bouteille' },
              { id: `btn_catqty_${c.id}_0_2`, title: '2 Bouteilles' },
              { id: `btn_catqty_${c.id}_0_5`, title: '5 Bouteilles' },
            ],
            'FYS · Jus du catalogue',
            'Min. 5 bouteilles au total'
          );

          if (userDocRef) {
            await userDocRef.set({
              pendingCatalogSelection: {
                catalogCocktailId: c.id,
                cocktailName: c.name,
                containerIdx: 0,
                bottleSizeLabel,
                unitPrice,
                imageUrl: c.imageUrl || null,
                ingredients: (c.ingredients || []).map((i: any) => ({
                  fruitId: i.fruitId || i.id,
                  fruitName: i.fruitName || i.name,
                  priceSnapshot: i.priceSnapshot || 0,
                  isSupplement: i.role === 'supplement' || i.isSupplement || false,
                })),
                fruits: (c.ingredients && c.ingredients.length > 0)
                  ? c.ingredients.map((i: any) => i.fruitName)
                  : [c.name],
                updatedAt: Date.now(),
              },
            }, { merge: true }).catch(() => null);
            await userDocRef.collection('whatsapp_messages').add({
              sender: 'nutrifys',
              text: qtyPrompt,
              timestamp: FieldValue.serverTimestamp(),
            }).catch(() => null);
          }
          return res.status(200).json({ status: 'ok', handled: 'catalog_single_order_prompt_qty' });
        }

        // Cas 2 : Un ou plusieurs jus avec quantité(s) (ex: "je veux 2 papaye oranges et 1 ananas gingembre", "5 papaye orange")
        const newCatalogItems: any[] = extractedCatalogOrders.map((ord) => {
          const qty = ord.quantity && ord.quantity > 0 ? ord.quantity : 1;
          const unitPrice = Number(ord.container.price) || 500;
          const bottleSizeLabel = ord.container.label || '350ml';
          return {
            cocktailName: ord.cocktail.name,
            fruits: (ord.cocktail.ingredients && ord.cocktail.ingredients.length > 0)
              ? ord.cocktail.ingredients.map((i: any) => i.fruitName)
              : [ord.cocktail.name],
            bottleSize: bottleSizeLabel,
            bottleSizeLabel,
            quantity: qty,
            hasAddedSugar: false,
            isCatalog: true,
            catalogCocktailId: ord.cocktail.id,
            imageUrl: ord.cocktail.imageUrl,
            unitPrice,
          };
        });

        let combinedRawItems: any[] = [];
        const isReplaceOrCorrection = /(?:[àa]\s+la\s+place\s+d|au\s+lieu\s+d|remplac|chang(?:er?|e|ez?)|plut[ôo]t|finalement|en\s+fait|ne\s+veux\s+plus|annule\s+les?)/i.test(senderText);

        if (isReplaceOrCorrection) {
          const normClean = normalizeTextForMatching(senderText);
          const replaceClauseMatch = normClean.match(
            /(?:[àa]\s+la\s+place\s+d[e']?s?|au\s+lieu\s+d[e']?s?|remplac(?:er?|e|ez?)|chang(?:er?|e|ez?)(?:\s+(?:pour|en))?|je\s+ne\s+veux\s+plus\s+d[e']?s?|ne\s+mets\s+plus\s+d[e']?s?|retir(?:er?|e|ez?)|enl[èe]v(?:er?|e|ez?))\s+(.*?)\s+(?:je\s+veux|mets[- ]moi|donne[- ]moi|prends|ajoute|mets|par|en|plut[ôo]t|finalement|en\s+fait|,|;)\s+(.*)/i
          );
          if (replaceClauseMatch && replaceClauseMatch[1] && activeCart && activeCart.items.length > 0) {
            const discardedOrders = extractCatalogOrdersFromText(replaceClauseMatch[1], catalogCocktails);
            const discardedIds = new Set(discardedOrders.map((d) => d.cocktail.id));
            combinedRawItems = activeCart.items
              .filter((it) => it.isCatalog && !discardedIds.has(it.catalogCocktailId))
              .map((it) => ({
                cocktailName: it.cocktailName,
                fruits: it.fruits,
                bottleSize: it.bottleSize,
                bottleSizeLabel: it.bottleSizeLabel,
                quantity: it.quantity,
                hasAddedSugar: it.hasAddedSugar,
                isCatalog: true,
                catalogCocktailId: it.catalogCocktailId,
                imageUrl: it.imageUrl,
                unitPrice: it.unitPrice,
              }));

            for (const newItem of newCatalogItems) {
              const existingMatch = combinedRawItems.find(
                (it) => it.catalogCocktailId === newItem.catalogCocktailId && it.bottleSizeLabel === newItem.bottleSizeLabel
              );
              if (existingMatch) {
                existingMatch.quantity = newItem.quantity;
              } else {
                combinedRawItems.push(newItem);
              }
            }
          } else {
            combinedRawItems = newCatalogItems;
          }
        } else if (activeCart && activeCart.items.length > 0) {
          // Filtrer rigoureusement les articles pour ne garder que les vrais jus catalogue
          const existingCatalogItems = activeCart.items.filter((it) => it.isCatalog);
          combinedRawItems = existingCatalogItems.map((it) => ({
            cocktailName: it.cocktailName,
            fruits: it.fruits,
            bottleSize: it.bottleSize,
            bottleSizeLabel: it.bottleSizeLabel,
            quantity: it.quantity,
            hasAddedSugar: it.hasAddedSugar,
            isCatalog: true,
            catalogCocktailId: it.catalogCocktailId,
            imageUrl: it.imageUrl,
            unitPrice: it.unitPrice,
          }));

          for (const newItem of newCatalogItems) {
            const existingMatch = combinedRawItems.find(
              (it) => it.catalogCocktailId === newItem.catalogCocktailId && it.bottleSizeLabel === newItem.bottleSizeLabel
            );
            if (existingMatch) {
              if (isAddIntent) {
                existingMatch.quantity += newItem.quantity;
              } else {
                existingMatch.quantity = newItem.quantity;
              }
            } else {
              combinedRawItems.push(newItem);
            }
          }
        } else {
          combinedRawItems = newCatalogItems;
        }

        activeCart = computeCartFromRawItems(
          combinedRawItems,
          availableFruits,
          bottle500Base,
          bottle1LBase,
          activeCart?.district,
          activeCart
        );

        if (userDocRef) {
          await saveActiveWhatsAppCart(userDocRef, activeCart);
        }

        const totalCatalogBottles = activeCart.items.filter((i) => i.isCatalog).reduce((s, i) => s + i.quantity, 0);
        const cartLines = activeCart.items.map((it) => `• ${it.quantity} × ${it.cocktailName} (${it.bottleSizeLabel}) : ${(it.unitPrice * it.quantity).toLocaleString('fr-FR')} XAF`).join('\n');

        if (totalCatalogBottles < 5) {
          const missing = 5 - totalCatalogBottles;
          const warningText = `Votre panier (Jus du catalogue) :\n${cartLines}\n──────────────────\nSous-total (${totalCatalogBottles} bouteilles) : ${activeCart.subtotal.toLocaleString('fr-FR')} XAF\nLivraison à Yaoundé : ${activeCart.deliveryFee.toLocaleString('fr-FR')} XAF\nTotal : ${activeCart.totalPrice.toLocaleString('fr-FR')} XAF\n\nPour les jus du catalogue, la commande minimale est de 5 bouteilles au total. Il vous manque encore ${missing} bouteille(s) pour valider votre commande. Vous pouvez combiner d'autres recettes du catalogue pour compléter votre panier :`;

          await sendWhatsAppInteractiveButtons(
            senderPhone,
            warningText,
            [
              { id: 'btn_mode_catalog', title: 'Choisir un jus' },
              { id: 'btn_complete_min', title: `Compléter (+${missing})` },
              { id: 'btn_view_cart', title: 'Voir le panier' },
            ],
            'FYS · Jus du catalogue',
            `Minimum 5 bouteilles (actuel: ${totalCatalogBottles})`
          );

          if (userDocRef) {
            await userDocRef.collection('whatsapp_messages').add({
              sender: 'nutrifys',
              text: warningText,
              timestamp: FieldValue.serverTimestamp(),
            }).catch(() => null);
          }
          return res.status(200).json({ status: 'ok', handled: 'catalog_multi_order_under_min' });
        } else {
          const readyText = `Votre commande (Jus du catalogue) :\n${cartLines}\n──────────────────\nSous-total (${totalCatalogBottles} bouteilles) : ${activeCart.subtotal.toLocaleString('fr-FR')} XAF\nLivraison à Yaoundé : ${activeCart.deliveryFee.toLocaleString('fr-FR')} XAF\nTotal à payer : ${activeCart.totalPrice.toLocaleString('fr-FR')} XAF\n\nDans quel quartier de Yaoundé souhaitez-vous être livré ? (Vous pouvez sélectionner dans la liste ci-dessous ou simplement écrire votre quartier en réponse)`;

          await sendWhatsAppInteractiveList(
            senderPhone,
            readyText,
            getWhatsAppDistrictsList(activeDeliveryZones),
            'FYS · Livraison Yaoundé'
          );

          if (userDocRef) {
            await userDocRef.collection('whatsapp_messages').add({
              sender: 'nutrifys',
              text: readyText,
              timestamp: FieldValue.serverTimestamp(),
            }).catch(() => null);
          }
          return res.status(200).json({ status: 'ok', handled: 'catalog_multi_order_ready' });
        }
      }

      // 2. Détection déterministe de cocktails et fruits sur-mesure dans le message actuel
      const unavailableFruitsCurrent = detectUnavailableFruitsInText(senderText, availableFruits);
      const isCatalogRequestInText = /(?:boissons?|jus|recettes?)\s+du\s+catalogue|catalogue/i.test(senderText);
      const shouldSkipCustomExtraction =
        unavailableFruitsCurrent.length > 0 ||
        (isCatalogRequestInText && (!extractedCatalogOrders || extractedCatalogOrders.length === 0));

      const extractedCurrent = (!shouldSkipCustomExtraction)
        ? extractCocktailsFromText(senderText, availableFruits)
        : null;
      if (extractedCurrent && extractedCurrent.length > 0) {
        if (isAddIntent && activeCart && activeCart.items.length > 0) {
          // Conserver les cocktails existants et ajouter le(s) nouveau(x) cocktail(s)
          const existingRaw = activeCart.items.map((it) => ({
            cocktailName: it.cocktailName,
            fruits: it.fruits,
            bottleSize: it.bottleSize,
            quantity: it.quantity,
            hasAddedSugar: it.hasAddedSugar,
          }));
          const newRaw = extractedCurrent.map((c, idx) => ({
            cocktailName: (c.cocktailName && c.cocktailName !== 'Cocktail Santé Sur-Mesure')
              ? c.cocktailName
              : `Cocktail ${existingRaw.length + idx + 1}`,
            fruits: c.fruits,
            bottleSize: '500ml' as const,
            quantity: 1,
          }));
          activeCart = computeCartFromRawItems(
            [...existingRaw, ...newRaw],
            availableFruits,
            bottle500Base,
            bottle1LBase,
            activeCart.district,
            activeCart
          );
          activeRecipeName = activeCart.items.map((i) => i.cocktailName).join(' + ');
          activeRecipeIngredients = activeCart.items.flatMap((i) => i.ingredients);
          if (userDocRef) {
            await saveActiveWhatsAppCart(userDocRef, activeCart);
            console.log(`[whatsapp-webhook] ➕ Appended ${newRaw.length} cocktail(s) to activeWhatsAppCart. Total items: ${activeCart.items.length}`);
          }
        } else {
          activeCart = computeCartFromRawItems(
            extractedCurrent,
            availableFruits,
            bottle500Base,
            bottle1LBase,
            activeCart?.district,
            undefined
          );
          activeRecipeName = activeCart.items.map((i) => i.cocktailName).join(' + ');
          activeRecipeIngredients = activeCart.items.flatMap((i) => i.ingredients);
          if (userDocRef) {
            await saveActiveWhatsAppCart(userDocRef, activeCart);
            console.log(`[whatsapp-webhook] 🍹 Persisted activeWhatsAppCart from user text with ${activeCart.items.length} item(s):`, activeRecipeName);
          }
        }
      } else if (activeCart && activeCart.items.length > 0) {
        // Priorité 2 : Panier multi-boissons en cours déjà calculé par le serveur
        activeRecipeName = activeCart.items.map((i) => i.cocktailName).join(' + ');
        activeRecipeIngredients = activeCart.items.flatMap((i) => i.ingredients);
      } else if (webDraft && Array.isArray(webDraft.cocktail?.ingredients) && webDraft.cocktail.ingredients.length > 0) {
        // Priorité 3 : Recette personnalisée venant du Lab Web
        activeRecipeName = webDraft.cocktail?.name || 'Mon Jus Personnalisé FYS';
        activeRecipeIngredients = webDraft.cocktail.ingredients.map((i: any) => {
          const snapPrice = Number(i.priceSnapshot);
          const matchedFruit = availableFruits.find(
            (f) => f.id.toLowerCase() === (i.fruitId || i.id || '').toLowerCase() ||
                   f.name.toLowerCase() === (i.fruitName || i.name || '').toLowerCase()
          );
          return {
            fruitId: i.fruitId || i.id || matchedFruit?.id || 'fruit',
            fruitName: i.fruitName || i.name || matchedFruit?.name || 'Fruit',
            priceSnapshot: snapPrice > 0 ? snapPrice : (matchedFruit?.price || 0),
            isSupplement: matchedFruit?.isSupplement ?? (i.role === 'supplement'),
            incompatibleIds: matchedFruit?.incompatibleIds || [],
          };
        });
      } else if (existingUserDoc?.data()?.activeWhatsAppDraft && Array.isArray(existingUserDoc.data().activeWhatsAppDraft.ingredients) && existingUserDoc.data().activeWhatsAppDraft.ingredients.length > 0) {
        // Priorité 4 : Recette personnalisée déjà composée et mémorisée sur WhatsApp
        const waDraft = existingUserDoc.data().activeWhatsAppDraft;
        activeRecipeName = waDraft.cocktailName || 'Cocktail Santé FYS';
        activeRecipeIngredients = waDraft.ingredients.map((i: any) => {
          const snapPrice = Number(i.priceSnapshot);
          const matchedFruit = availableFruits.find(
            (f) => f.id.toLowerCase() === (i.fruitId || i.id || '').toLowerCase() ||
                   f.name.toLowerCase() === (i.fruitName || i.name || '').toLowerCase()
          );
          return {
            fruitId: i.fruitId || i.id || matchedFruit?.id || 'fruit',
            fruitName: i.fruitName || i.name || matchedFruit?.name || 'Fruit',
            priceSnapshot: snapPrice > 0 ? snapPrice : (matchedFruit?.price || 0),
            isSupplement: matchedFruit?.isSupplement ?? (i.role === 'supplement'),
            incompatibleIds: matchedFruit?.incompatibleIds || [],
          };
        });
      } else if (!isExplicitReset && !isNewRecipeIntent && !resetIntentRegex.test(senderText)) {
        // Priorité 5 : Détection par scan de l'historique récent (uniquement si aucune réinitialisation)
        for (let h = chatHistoryForGemini.length - 1; h >= 0; h--) {
          const pastMsg = chatHistoryForGemini[h];
          if (pastMsg.parts?.[0]?.text) {
            const pastExtracted = extractCocktailsFromText(pastMsg.parts[0].text, availableFruits);
            if (pastExtracted && pastExtracted.length > 0) {
              activeCart = computeCartFromRawItems(
                pastExtracted,
                availableFruits,
                bottle500Base,
                bottle1LBase,
                activeCart?.district,
                activeCart
              );
              activeRecipeName = activeCart.items.map((i) => i.cocktailName).join(' + ');
              activeRecipeIngredients = activeCart.items.flatMap((i) => i.ingredients);
              if (userDocRef) {
                await saveActiveWhatsAppCart(userDocRef, activeCart);
                await userDocRef.set({
                  activeWhatsAppDraft: {
                    cocktailName: activeRecipeName,
                    ingredients: activeRecipeIngredients,
                    updatedAt: FieldValue.serverTimestamp(),
                  },
                }, { merge: true }).catch(() => null);
                console.log(`[whatsapp-webhook] 🔄 Restored activeWhatsAppCart from past chat history (${activeCart.items.length} items):`, activeRecipeName);
              }
              break;
            }
          }
        }
      }

      // Détection des incompatibilités scientifiques dans la recette courante
      const currentIncompatibilities: string[] = [];
      for (let i = 0; i < activeRecipeIngredients.length; i++) {
        for (let j = i + 1; j < activeRecipeIngredients.length; j++) {
          const f1 = activeRecipeIngredients[i];
          const f2 = activeRecipeIngredients[j];
          const inc1 = f1.incompatibleIds || [];
          const inc2 = f2.incompatibleIds || [];
          if (inc1.includes(f2.fruitId) || inc2.includes(f1.fruitId)) {
            currentIncompatibilities.push(`"${f1.fruitName}" et "${f2.fruitName}"`);
          }
        }
      }

      const currentMainFruitsCount = activeRecipeIngredients.filter((i) => !i.isSupplement).length;
      const currentSupplementsCount = activeRecipeIngredients.filter((i) => i.isSupplement).length;
      const isSingleFruit = currentMainFruitsCount === 1;

      const activeIngredientsSum = activeRecipeIngredients.reduce((s, i) => {
        const isMain = !i.isSupplement;
        const multiplier = (isSingleFruit && isMain) ? 2 : 1;
        return s + (i.priceSnapshot * multiplier);
      }, 0);
      const activePrice500 = bottle500Base + activeIngredientsSum;
      const activePrice1L = bottle1LBase + activeIngredientsSum;

      // Construction des catalogues séparés Fruits Principaux vs Suppléments et Incompatibilités
      const mainFruitsList = availableFruits.filter((f) => !f.isSupplement);
      const supplementFruitsList = availableFruits.filter((f) => f.isSupplement);

      const mainFruitsCatalogStr = mainFruitsList.map((f) => `  • ${f.name}`).join('\n');
      const supplementCatalogStr = supplementFruitsList.map((s) => `  • ${s.name}`).join('\n');

      const incompatibilityCatalogStr = availableFruits
        .filter((f) => f.incompatibleIds.length > 0)
        .map((f) => {
          const names = f.incompatibleIds
            .map((id) => availableFruits.find((x) => x.id === id)?.name || id)
            .filter(Boolean)
            .join(', ');
          return `  • ${f.name} ne doit JAMAIS être mélangé avec : ${names}`;
        })
        .join('\n');

      let recipePricingDetails = '';
      if (currentIncompatibilities.length > 0) {
        recipePricingDetails = `
⚠️ PRÉCAUTION NUTRITIONNELLE DU FYS LAB SUR CETTE RECETTE :
L'utilisateur a sélectionné une association de fruits faisant l'objet d'une réserve nutritionnelle : ${currentIncompatibilities.join(', ')}.
CONSIGNES (AVERTIR SANS JAMAIS BLOQUER LA COMMANDE) :
1. Avertis le client avec tact, bienveillance et pédagogie sur la précaution nutritionnelle (ex: interaction enzymatique, digestion ralentie ou sensibilité gastrique).
2. Suggère-lui gentiment une alternative ou un ajustement s'il le souhaite.
3. RÈGLE CRITIQUE : NE BLOQUE JAMAIS LA COMMANDE ! Si le client souhaite quand même maintenir sa composition, respecte son choix avec courtoisie, donne-lui les tarifs ci-dessous et permets-lui de commander son cocktail sans aucune restriction.

TARIFS OFFICIELS FIXÉS PAR LE SERVEUR FYS POUR CE COCKTAIL (À ANNONCER DIRECTEMENT SANS DÉCOMPOSITION) :
- Format 500ml : ${activePrice500.toLocaleString('fr-FR')} XAF la bouteille
- Format 1L : ${activePrice1L.toLocaleString('fr-FR')} XAF la bouteille
- Livraison Yaoundé (départ atelier Nsimeyong) : ${activeCart?.district ? `${activeCart.deliveryFee.toLocaleString('fr-FR')} XAF pour ${activeCart.district}` : 'selon le quartier (Zone 1 : 1 000 XAF, Zone 2 : 1 500 XAF, Zone 3 : 2 000 XAF)'}
TOTAL COMMANDE POUR Q BOUTEILLES = (Prix unitaire x Quantité) + Frais de livraison selon le quartier
CONSIGNE FERME : Affiche directement ces prix. N'explique JAMAIS la politique des prix. Si le client demande des justificatifs, dis simplement que c'est le prix fixé par l'équipe FYS.`;
      } else if (currentMainFruitsCount > maxMainFruits || currentSupplementsCount > maxSupplements) {
        recipePricingDetails = `
🚨 ALERTE DÉPASSEMENT DES LIMITES OFFICIELLES DU FYS LAB :
L'utilisateur a choisi ${currentMainFruitsCount} fruits principaux (maximum autorisé : ${maxMainFruits}) ou ${currentSupplementsCount} suppléments (maximum autorisé : ${maxSupplements}).
CONSIGNE FERME :
Informe-le avec bienveillance de la règle d'équilibre du FYS Lab : chaque bouteille comporte au maximum ${maxMainFruits} fruits principaux et ${maxSupplements} suppléments pour garantir un dosage thérapeutique efficace et un goût harmonieux. Demande-lui poliment de retirer l'ingrédient en trop pour respecter la règle du Lab.`;
      } else if (activeCart && activeCart.items.length > 0) {
        const cartItemsSummary = activeCart.items.map((it, idx) =>
          `• Boisson ${idx + 1} : « ${it.cocktailName} » (${it.fruits.join(', ')})
  - Format : ${it.bottleSizeLabel}
  - Quantité : ${it.quantity}
  - Prix unitaire fixé par le serveur FYS : ${it.unitPrice.toLocaleString('fr-FR')} XAF la bouteille
  - Sous-total : ${it.lineTotal.toLocaleString('fr-FR')} XAF`
        ).join('\n');

        recipePricingDetails = `
🛒 PANIER MULTI-BOISSONS EN COURS (CALCULÉ DIRECTEMENT PAR LE BACKEND FYS) :
${cartItemsSummary}
• Frais de livraison : ${activeCart.deliveryFee.toLocaleString('fr-FR')} XAF${activeCart.district ? ` (${activeCart.district})` : ' (départ atelier Nsimeyong)'}
• Sous-total : ${activeCart.subtotal.toLocaleString('fr-FR')} XAF
👉 TOTAL À PAYER EXACT DE LA COMMANDE : ${activeCart.totalPrice.toLocaleString('fr-FR')} XAF

CONSIGNES STRICTES ET CATÉGORIQUES ANTI-HALLUCINATION :
1. LE CLIENT COMMANDE CE PANIER EXACT CONTENANT ${activeCart.items.length} BOISSON(S).
2. NE FAIS AUCUN CALCUL ARITHMÉTIQUE TOI-MÊME : recopie STRICTEMENT et fidèlement les chiffres ci-dessus !
3. N'OUBLIE AUCUNE BOISSON DU PANIER DANS TON RÉCAPITULATIF OU TA CONFIRMATION : mentionne-les TOUTES !
4. N'explique jamais la politique des prix ni la décomposition. Si le client demande des justificatifs, dis simplement que c'est le prix fixé par l'équipe FYS.`;
      } else if (activeRecipeIngredients.length > 0) {
        const ingredientsListStr = activeRecipeIngredients.map((i) => i.fruitName).join(', ');
        recipePricingDetails = `
RECETTE DÉTECTÉE EN COURS : "${activeRecipeName}"
Ingrédients (${activeRecipeIngredients.length} fruits) : ${ingredientsListStr}
TARIFS OFFICIELS FIXÉS PAR LE SERVEUR FYS POUR CE COCKTAIL (À ANNONCER DIRECTEMENT SANS AUCUNE DÉCOMPOSITION) :
- Format 500ml : ${activePrice500.toLocaleString('fr-FR')} XAF la bouteille
- Format 1L : ${activePrice1L.toLocaleString('fr-FR')} XAF la bouteille
- Frais de livraison (départ atelier Nsimeyong) : ${activeCart?.district ? `${activeCart.deliveryFee.toLocaleString('fr-FR')} XAF pour ${activeCart.district}` : 'selon le quartier (Zone 1 : 1 000 XAF, Zone 2 : 1 500 XAF, Zone 3 : 2 000 XAF)'}
TOTAL COMMANDE POUR Q BOUTEILLES :
- Sous-total = (Prix unitaire x Quantité)
- TOTAL À PAYER = Sous-total + Frais de livraison
CONSIGNES STRICTES ANTI-JUSTIFICATION ET ANTI-HALLUCINATION :
1. Affiche DIRECTEMENT ces prix (${activePrice500.toLocaleString('fr-FR')} XAF pour 500ml, ${activePrice1L.toLocaleString('fr-FR')} XAF pour 1L, et les frais de livraison correspondants).
2. N'EXPLIQUE JAMAIS la politique des prix ni aucune décomposition de coût (interdiction formelle de détailler le contenant, le coût par fruit ou toute formule de calcul).
3. Si le client demande des justificatifs, une explication ou pourquoi ce prix : réponds simplement et avec courtoisie que « c'est le prix fixé par l'équipe FYS », sans entrer dans aucun détail.`;
      } else {
        recipePricingDetails = `
ATTENTION : AUCUN FRUIT NI RECETTE N'A ENCORE ÉTÉ CHOISI PAR LE CLIENT !
RÈGLE COMMERCIALE CRITIQUE :
Tant que les fruits du cocktail ne sont pas connus, TU NE PEUX PAS calculer de prix ni présenter de devis ou de format !
Si le client veut commander ou demande le prix, guide-le d'abord pour choisir 1 à ${maxMainFruits} fruits principaux et au maximum ${maxSupplements} suppléments parmi le catalogue officiel en stock ci-dessous afin de composer sa recette et calculer son prix exact selon la formule FYS.`;
      }

      const catalogJuicesListStr = catalogCocktails && catalogCocktails.length > 0
        ? catalogCocktails.map((c) => {
            const containerInfo = Array.isArray(c.containers) && c.containers.length > 0
              ? c.containers.map((ct: any) => `${ct.label} (${(Number(ct.price) || 500).toLocaleString('fr-FR')} XAF)`).join(', ')
              : '350ml (500 XAF)';
            const ings = Array.isArray(c.ingredients) && c.ingredients.length > 0
              ? c.ingredients.map((i: any) => i.fruitName || i.name).filter(Boolean).join(', ')
              : c.name;
            return `• « ${c.name} » (${ings}) — Formats et tarifs : ${containerInfo}`;
          }).join('\n')
        : '• « Ananas Gingembre » (Ananas, Gingembre) — 350ml (500 XAF)\n• « Ananas Papaye » (Ananas, Papaye) — 350ml (500 XAF)\n• « Papaye Orange » (Papaye, Orange) — 350ml (500 XAF)';

      const dynamicPricingContext = `\n\nCATALOGUE OFFICIEL DU FYS LAB (EN STOCK DÉFINITIF) :
A. FRUITS PRINCIPAUX (Base du cocktail - Maximum ${maxMainFruits} par bouteille) :
${mainFruitsCatalogStr}

B. SUPPLÉMENTS & BOOSTERS (Accents thérapeutiques - Maximum ${maxSupplements} par bouteille) :
${supplementCatalogStr}

C. JUS SIGNATURES DU CATALOGUE FYS (RECETTES PRÊTES DU CATALOGUE - MINIMUM 5 BOUTEILLES AU TOTAL) :
${catalogJuicesListStr}
⚠️ SEULES CES RECETTES CI-DESSUS EXISTENT DANS LE CATALOGUE FYS. TOUTE AUTRE RECETTE (ex: "Baobab ananas") N'EXISTE PAS DANS LE CATALOGUE ET DOIT ÊTRE REFUSÉE AVEC COURTOISIE.

RÈGLES D'INCOMPATIBILITÉ SCIENTIFIQUE DU FYS LAB (STRICTES ET INFRANGIBLES) :
${incompatibilityCatalogStr}

TARIFS OFFICIELS DU FYS LAB :
1. Prix par bouteille = Tarifs unitaires fixés par le serveur FYS (${activePrice500.toLocaleString('fr-FR')} XAF en 500ml, ${activePrice1L.toLocaleString('fr-FR')} XAF en 1L).
2. Frais de livraison (départ atelier Nsimeyong) = Selon le quartier de livraison :
   - Zone 1 (Proximité Nsimeyong, Biyem-Assi, Mendong, Damase, Jouvence, Melen...) : 1 000 XAF
   - Zone 2 (Centre-ville, Bastos, Tsinga, Nlongkak, Mokolo, Omnisports, Essos...) : 1 500 XAF
   - Zone 3 (Périphérie / Longue distance : Odza, Messamendongo, Ngousso, Emana, Olembe, Nkoabang...) : 2 000 XAF
   - Autre quartier non répertorié : 1 500 XAF
3. TOTAL À PAYER = (Prix par bouteille x Quantité) + Frais de livraison.
${recipePricingDetails}

RÈGLES D'OR OFFICIELLES DU FYS LAB (INFRANGIBLES ET CATÉGORIQUES) :
1. RESPECT STRICT DES LIMITES DU LAB :
   - Au maximum ${maxMainFruits} fruits principaux par bouteille.
   - Au maximum ${maxSupplements} suppléments par bouteille.
2. RÈGLE DES PRÉCAUTIONS NUTRITIONNELLES & CONSEILS SANTÉ :
   - Si un utilisateur choisit des fruits présentant une réserve nutritionnelle (ex: Banane + Citron, ou selon son état de santé) :
     * Avertis-le avec bienveillance et pédagogie sur la précaution nutritionnelle.
     * Propose-lui gentiment une alternative saine et équilibrée.
     * RÈGLE FONDAMENTALE : NE BLOQUE JAMAIS LA COMMANDE ! S'il souhaite maintenir sa composition, respecte son choix avec courtoisie, donne-lui les tarifs officiels et permets-lui de commander son cocktail sans blocage.
3. EXCLUSIVITÉ DU STOCK :
   - Seuls les fruits listés dans les catalogues A et B ci-dessus sont autorisés. Tout fruit absent (ex: Baobab, Fraise, Kiwi, Pamplemousse...) est strictement indisponible.
   - Si le client demande un ingrédient ou une recette indisponible : explique-lui avec clarté et courtoisie que ce n'est pas disponible, présente-lui nos véritables options disponibles (les 3 jus signatures du catalogue ci-dessus ou nos fruits frais du Lab), et ne crée aucun panier ni devis pour une recette inexistante.
4. CONFIDENTIALITÉ STRICTE ET POLITIQUE DES PRIX :
   - Tu n'expliques JAMAIS au client la politique de nos prix, ni aucune décomposition (coût du contenant vide, coût par fruit, coefficient x2, marge, etc.). Tu ne justifies AUCUN calcul.
   - Tu te contentes d'afficher directement le prix unitaire total tout compris de la bouteille et les frais de livraison pour le quartier du client.
   - Si le client demande des justificatifs, une explication ou pourquoi ce prix : réponds simplement et avec courtoisie que « c'est le prix fixé par l'équipe FYS », sans entrer dans aucun détail.
5. RÈGLE DÉLAI DE LIVRAISON :
   - ${isDelivery24hActive ? '⚠️ RÈGLE OBLIGATOIRE : La livraison s\'effectue après 24h. Si tu mentionnes le délai ou lors de la confirmation finale d\'une commande, indique TOUJOURS EN MAJUSCULES : « ⚠️ VEUILLEZ NOTER QUE LA LIVRAISON S\'EFFECTUE APRÈS 24H. »' : 'Aucun délai de livraison de 24h n\'est actuellement applicable. Ne précise rien sur un délai après 24h.'}

RÈGLE CRITIQUE DU ROUTEUR SÉMANTIQUE D'INTENTIONS (:::INTENT) :
Tu es le Cerveau IA du système FYS. Peu importe comment le client s'exprime en français naturel, argot camerounais, métaphores ou abréviations (ex: "oui oui on y va", "mets-moi le jus là", "lance seulement", "c'est bon pour moi", "en 1 litre stp", "je suis calé à Bastos", "compose moi un bon jus"), tu DOIS TOUJOURS traduire son intention et inclure à la TOUTE FIN de ton message le bloc technique :::INTENT :

:::INTENT
{
  "action": "ACTION_CODE",
  "cocktails": [
    {
      "cocktailName": "Nom Inspirant du Cocktail",
      "fruits": ["Fruit1", "Fruit2", "Fruit3"],
      "bottleSize": "500ml",
      "quantity": 1
    }
  ],
  "catalogItems": [
    {
      "cocktailName": "Nom Exact du Jus Catalogue (ex: Papaye orange, Ananas gingembre)",
      "quantity": 2,
      "bottleSize": "350ml"
    }
  ],
  "district": "Quartier si mentionné ou null"
}
:::

LES CODES D'ACTION SYSTÈME OBLIGATOIRES ("action") :
1. "NEW_RECIPE" : Dès que le client demande une composition, un conseil ou un nouveau jus (ex: "compose moi un bon jus", "propose-moi un mélange", "quel jus pour la fatigue ?"). Dans "cocktails", liste la recette que tu lui proposes avec un nom inspirant (ex: « L'Éclat Fraîcheur & Vitalité ») et les fruits exacts du catalogue en stock.
2. "VALIDATE_RECIPE" : Dès que le client valide, accepte ou aime la composition (ex: "oui oui on y va", "ça me va", "on est ensemble", "je prends ça", "allons-y", "c'est bon", "top"). Dans "cocktails", reporte fidèlement le cocktail validé.
3. "ORDER" : Dès que le client veut passer commande (ex: "je veux commander", "comment on passe la commande ?", "livrez-moi").
4. "ORDER_CATALOG" : Dès que le client commande des jus du catalogue FYS (ex: "je veux 2 papaye oranges et 1 ananas gingembre", "mets-moi 5 ananas gingembre"). Renseigne "catalogItems" avec les jus et quantités exacts.
5. "CATALOG" : Dès que le client souhaite voir la carte ou le menu des jus signatures du catalogue FYS (ex: "voir le catalogue", "vos jus standards", "carte des jus", "formules du catalogue").
6. "SHOW_NUTRITION" : Dès que le client demande la fiche nutritionnelle ou les bienfaits santé (ex: "fiche nutrition", "valeurs nutritionnelles", "quels sont les bienfaits ?").
7. "SET_FORMAT" : Dès que le client choisit ou modifie un format (ex: "en 1 litre", "500ml", "le premier en 500ml et l'autre en 1L"). Reporte "bottleSize": "500ml" ou "1L" pour chaque cocktail.
8. "SET_QUANTITY" : Dès que le client indique le nombre de bouteilles (ex: "1 bouteille", "2 de chaque", "mets m'en 3"). Reporte "quantity" pour chaque cocktail.
9. "SET_DISTRICT" : Dès que le client donne son quartier de livraison (ex: "Biyem-Assi", "je suis à Bastos", "vers Omnisports"). Renseigne "district".
10. "CONFIRM_ORDER" : Dès que le client valide officiellement le devis et confirme la commande (ex: "valider commande", "c'est validé", "je confirme", "envoie la facture").
11. "ADD_COCKTAIL" : Dès que le client souhaite ajouter un autre cocktail à sa commande en cours (ex: "ajoute aussi un ananas gingembre", "je veux une deuxième bouteille").
12. "RESET" : Dès que le client veut annuler, recommencer ou tout changer (ex: "annule", "analuer", "recommencer", "laisse tomber", "effacer").
13. "QUESTION" : Simple question d'information ou de conseil sans modification de commande.

CONSIGNE STRICTE :
Le serveur FYS utilise directement ce bloc :::INTENT pour calculer les tarifs officiels sans aucune faille de formulation ni amnésie. Inclus TOUJOURS ce bloc à la fin de ta réponse !

RÈGLE D'AFFICHAGE DU RÉCAPITULATIF DE COMMANDE :
Lorsque la commande est prête à être validée ou vient d'être confirmée :
1. Tu DOIS TOUJOURS écrire en texte clair et visible le récapitulatif complet de TOUTES les boissons :
   * Nom de chaque cocktail et ses fruits exacts
   * Quantité et format de chaque boisson
   * Frais de livraison selon le quartier (Zone 1 : 1 000 XAF, Zone 2 : 1 500 XAF, Zone 3 : 2 000 XAF)
   * TOTAL À PAYER en XAF (strictement le montant calculé par FYS !)
2. Ce texte récapitulatif DOIT ÊTRE ENTIÈREMENT VISIBLE DANS LE MESSAGE TEXTE. Ne laisse JAMAIS un espace vide ou un texte coupé !`;

      const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
      let aiReply = '';

      // Construction du payload multi-tours multimodal (Texte, Audio, Image)
      const currentUserParts: any[] = [];
      if (audioBuffer) {
        currentUserParts.push({
          inlineData: {
            mimeType: audioMimeType.split(';')[0] || 'audio/ogg',
            data: audioBuffer.toString('base64'),
          },
        });
        currentUserParts.push({
          text: "L'utilisateur a envoyé cette note vocale. Écoute attentivement sa voix et ses propos, comprends ses besoins santé, et réponds-lui avec chaleur et bienveillance selon les consignes NutriFYS.",
        });
      } else if (imageBuffer) {
        currentUserParts.push({
          inlineData: {
            mimeType: imageMimeType.split(';')[0] || 'image/jpeg',
            data: imageBuffer.toString('base64'),
          },
        });
        const promptIntro = senderText && senderText !== '[Photo reçue du client]'
          ? `L'utilisateur a envoyé cette photo accompagnée du message suivant : "${senderText}". Analyse attentivement l'image (ordonnance médicale, analyse, fruits ou reçu Mobile Money) et réponds-lui de manière claire, empathique et personnalisée.`
          : `L'utilisateur a envoyé cette photo. Analyse attentivement ce qu'elle contient (ordonnance médicale, bilan de santé, fruits frais ou reçu de paiement Mobile Money) et réponds-lui chaleureusement selon tes consignes NutriFYS.`;
        currentUserParts.push({ text: promptIntro });
      } else if (isInteractiveMessage && interactiveButtonId) {
        let explicitAction = `[Action interactive cliquée : "${senderText}"]`;

        // Filet de sécurité anti-amnésie global : si aucun panier ni ingrédient n'est actif, chercher dans l'historique
        if (!activeCart && activeRecipeIngredients.length === 0) {
          for (let h = chatHistoryForGemini.length - 1; h >= 0; h--) {
            const msg = chatHistoryForGemini[h];
            if (msg.parts?.[0]?.text) {
              const found = extractCocktailsFromText(msg.parts[0].text, availableFruits);
              if (found && found.length > 0) {
                activeCart = computeCartFromRawItems(
                  found,
                  availableFruits,
                  bottle500Base,
                  bottle1LBase,
                  undefined,
                  undefined
                );
                activeRecipeName = activeCart.items.map((i) => i.cocktailName).join(' + ');
                activeRecipeIngredients = activeCart.items.flatMap((i) => i.ingredients);
                if (userDocRef) {
                  await saveActiveWhatsAppCart(userDocRef, activeCart);
                  await userDocRef.set({
                    activeWhatsAppDraft: {
                      cocktailName: activeRecipeName,
                      ingredients: activeRecipeIngredients,
                      updatedAt: FieldValue.serverTimestamp(),
                    },
                  }, { merge: true }).catch(() => null);
                  console.log(`[whatsapp-webhook] 🛡️ Anti-amnesia recovered cocktail from history during interactive action:`, activeRecipeName);
                }
                break;
              }
            }
          }
        }

        if (interactiveButtonId === 'btn_reset_cart') {
          activeCart = null;
          if (userDocRef) {
            await userDocRef.set({
              activeWhatsAppCart: FieldValue.delete(),
              activeWhatsAppDraft: FieldValue.delete(),
              selectedMode: FieldValue.delete(),
            }, { merge: true }).catch(() => null);
          }
          const resetMsg = `Votre panier a été vidé.\n\nQue souhaitez-vous faire maintenant ?\n• Composer votre cocktail sur-mesure au Lab\n• Découvrir nos jus signatures du catalogue (min. 5 bouteilles combinables)`;
          await sendWhatsAppInteractiveButtons(
            senderPhone,
            resetMsg,
            [
              { id: 'btn_mode_custom', title: 'Sur-mesure (Lab)' },
              { id: 'btn_mode_catalog', title: 'Jus du catalogue' },
            ],
            'FYS · Panier vidé',
            'Nouveau départ'
          );
          if (userDocRef) {
            await userDocRef.collection('whatsapp_messages').add({
              sender: 'nutrifys',
              text: resetMsg,
              timestamp: FieldValue.serverTimestamp(),
            }).catch(() => null);
          }
          return res.status(200).json({ status: 'ok', handled: 'cart_reset_btn' });
        }

        if (interactiveButtonId.startsWith('btn_order')) {
          if (activeCart && activeCart.items.length > 0) {
            const hasCatalog = activeCart.items.some((i) => i.isCatalog);
            const totalCatalog = activeCart.items.filter((i) => i.isCatalog).reduce((s, i) => s + i.quantity, 0);

            // Vérification stricte du minimum de 5 pour les jus du catalogue
            if (hasCatalog && totalCatalog < 5) {
              const missing = 5 - totalCatalog;
              const warningText = `Impossible de valider la commande : votre panier contient actuellement ${totalCatalog} bouteille(s) de jus du catalogue. La commande minimale est de 5 bouteilles au total (il vous en manque encore ${missing}).\n\nVous pouvez combiner d'autres recettes du catalogue ou compléter vos bouteilles :`;
              await sendWhatsAppInteractiveButtons(
                senderPhone,
                warningText,
                [
                  { id: 'btn_mode_catalog', title: 'Choisir un jus' },
                  { id: 'btn_complete_min', title: `Compléter (+${missing})` },
                ],
                'FYS · Jus du catalogue',
                `Minimum 5 bouteilles (actuel: ${totalCatalog})`
              );
              if (userDocRef) {
                await userDocRef.collection('whatsapp_messages').add({
                  sender: 'nutrifys',
                  text: warningText,
                  timestamp: FieldValue.serverTimestamp(),
                }).catch(() => null);
              }
              return res.status(200).json({ status: 'ok', handled: 'catalog_order_blocked_under_5' });
            }

            // Si c'est un cocktail sur-mesure et que le format n'a pas encore été explicitement validé
            const hasCustom = activeCart.items.some((i) => !i.isCatalog);
            if (hasCustom && !activeCart.hasExplicitFormat) {
              if (activeCart.items.length === 1) {
                explicitAction = `[Le client a cliqué sur 'Commander' pour son cocktail sur-mesure "${activeCart.items[0].cocktailName}". RÈGLE STRICTE : Demande-lui UNIQUEMENT quel format il souhaite (500ml ou 1L) avec les boutons :::BUTTONS [{"id": "btn_format_500ml", "title": "Format 500ml"}, {"id": "btn_format_1l", "title": "Format 1 Litre"}]. Ne pose AUCUNE autre question !]`;
              } else {
                explicitAction = `[Le client a cliqué sur 'Commander' pour ses cocktails sur-mesure (${activeCart.items.map((i) => i.cocktailName).join(', ')}). RÈGLE STRICTE : Demande-lui quel format il préfère pour ses boissons avec les boutons :::BUTTONS [{"id": "btn_format_all_500ml", "title": "Tous en 500ml"}, {"id": "btn_format_all_1l", "title": "Tous en 1 Litre"}, {"id": "btn_format_diff", "title": "Formats différents"}]. Ne pose AUCUNE autre question !]`;
              }
            } else {
              // Si le format est validé ou s'il s'agit du catalogue avec min 5 : demander le quartier de livraison
              explicitAction = `[Le client a cliqué sur 'Commander'. Son panier est validé et prêt (${activeCart.items.map((i) => `${i.quantity}x ${i.cocktailName} (${i.bottleSizeLabel})`).join(', ')}). RÈGLE COMMERCIALE STRICTE : Remercie-le chaleureusement et demande-lui UNIQUEMENT dans quel quartier de Yaoundé il souhaite être livré avec la liste déroulante :::LIST des quartiers, en précisant bien qu'il peut aussi l'écrire s'il ne figure pas dans la liste].`;
            }
          } else if (activeRecipeIngredients.length === 0) {
            explicitAction = `[Le client a cliqué sur 'Commander', mais AUCUN fruit ni recette n'a encore été composé. RÈGLE COMMERCIALE STRICTE FYS : Propose-lui avec enthousiasme les 2 options FYS pour commander :
1. Composer votre cocktail sur-mesure au Lab (selon vos objectifs santé et vos fruits frais préférés).
2. Découvrir nos jus signatures du catalogue (recettes prêtes selon les formats et tarifs officiels - commande minimale de 5 bouteilles au total, combinables).
Propose IMPÉRATIVEMENT les boutons :::BUTTONS [{"id": "btn_mode_custom", "title": "Composer sur-mesure"}, {"id": "btn_mode_catalog", "title": "Jus du catalogue"}]. Ne pose aucune autre question !]`;
          } else {
            explicitAction = `[Le client a cliqué sur 'Commander' pour son cocktail "${activeRecipeName}". RÈGLE STRICTE : Pose UNIQUEMENT la question du format (500ml ou 1L) avec les boutons :::BUTTONS [{"id": "btn_format_500ml", "title": "Format 500ml"}, {"id": "btn_format_1l", "title": "Format 1 Litre"}]. Ne pose AUCUNE autre question !]`;
          }
        } else if (interactiveButtonId === 'btn_mode_catalog') {
          if (userDocRef) {
            await userDocRef.set({ selectedMode: 'catalog' }, { merge: true }).catch(() => null);
          }
          const listToSendCatalog = catalogCocktails && catalogCocktails.length > 0
            ? catalogCocktails
            : await getActiveCatalogCocktails(db);
          if (listToSendCatalog.length > 0) {
            await sendCatalogJuicesList(senderPhone, listToSendCatalog);
            if (userDocRef) {
              await userDocRef.collection('whatsapp_messages').add({
                sender: 'nutrifys',
                text: `[Catalogue des jus signatures FYS envoyé : ${listToSendCatalog.map((c) => c.name).join(', ')}]`,
                timestamp: FieldValue.serverTimestamp(),
              }).catch(() => null);
            }
            return res.status(200).json({ status: 'ok', handled: 'catalog_cards_sent' });
          } else {
            explicitAction = `[Le client souhaite voir les jus du catalogue, mais aucun jus n'est actuellement disponible. Propose-lui de composer sa recette sur-mesure au Lab].`;
          }
        } else if (interactiveButtonId === 'btn_mode_custom') {
          if (userDocRef) {
            await userDocRef.set({ selectedMode: 'custom' }, { merge: true }).catch(() => null);
          }
          explicitAction = `[Le client a cliqué sur 'Composer sur-mesure'. RÈGLE COMMERCIALE STRICTE FYS : Accueille-le chaleureusement et invite-le avec bienveillance à choisir 2 à 4 fruits parmi nos fruits frais du jour pour composer sa boisson santé sur-mesure au Lab. N'AJOUTE AUCUN BOUTON DE MODE DE COMMANDE car le client a déjà choisi le sur-mesure !]`;
        } else if (interactiveButtonId.startsWith('btn_cat_')) {
          const catId = interactiveButtonId.replace('btn_cat_', '');
          const allCat = catalogCocktails && catalogCocktails.length > 0
            ? catalogCocktails
            : await getActiveCatalogCocktails(db);
          const selectedCocktail = allCat.find((c) => c.id === catId) ||
            await db.collection('cocktails').doc(catId).get().then((d: any) => (d.exists ? { id: d.id, ...d.data() } : null));

          if (selectedCocktail) {
            const containers = Array.isArray(selectedCocktail.containers) && selectedCocktail.containers.length > 0
              ? selectedCocktail.containers
              : [{ label: '350ml', price: 500 }];

            // Si plusieurs formats existent pour ce jus, proposer d'abord le choix du format
            if (containers.length > 1) {
              const formatButtons = containers.slice(0, 3).map((c: any, idx: number) => ({
                id: `btn_catfmt_${selectedCocktail.id}_${idx}`,
                title: `${c.label} (${(Number(c.price) || 0).toLocaleString('fr-FR')} XAF)`.slice(0, 20),
              }));
              const fmtPrompt = `Pour notre jus signature « ${selectedCocktail.name} », quel format préférez-vous ?`;
              await sendWhatsAppInteractiveButtons(
                senderPhone,
                fmtPrompt,
                formatButtons,
                'FYS · Choix du format',
                selectedCocktail.name
              );
              if (userDocRef) {
                await userDocRef.collection('whatsapp_messages').add({
                  sender: 'nutrifys',
                  text: fmtPrompt,
                  timestamp: FieldValue.serverTimestamp(),
                }).catch(() => null);
              }
              return res.status(200).json({ status: 'ok', handled: 'catalog_format_prompt' });
            }

            const container = containers[0];
            const unitPrice = typeof container.price === 'number' ? container.price : 500;
            const bottleSizeLabel = container.label || '350ml';

            const qtyPrompt = `Très bon choix. Vous avez sélectionné « ${selectedCocktail.name} » (${bottleSizeLabel} à ${unitPrice.toLocaleString('fr-FR')} XAF l'unité).\n\nCombien de bouteilles de cette recette souhaitez-vous ajouter à votre panier ? (Vous pouvez combiner plusieurs jus du catalogue pour atteindre le minimum de 5 bouteilles au total)`;
            await sendWhatsAppInteractiveButtons(
              senderPhone,
              qtyPrompt,
              [
                { id: `btn_catqty_${selectedCocktail.id}_0_1`, title: '1 Bouteille' },
                { id: `btn_catqty_${selectedCocktail.id}_0_2`, title: '2 Bouteilles' },
                { id: `btn_catqty_${selectedCocktail.id}_0_3`, title: '3 Bouteilles' },
              ],
              'FYS · Jus du catalogue',
              'Panier combinable (min. 5 au total)'
            );

            if (userDocRef) {
              await userDocRef.set({
                pendingCatalogSelection: {
                  catalogCocktailId: selectedCocktail.id,
                  cocktailName: selectedCocktail.name,
                  containerIdx: 0,
                  bottleSizeLabel,
                  unitPrice,
                  imageUrl: selectedCocktail.imageUrl || null,
                  ingredients: (selectedCocktail.ingredients || []).map((i: any) => ({
                    fruitId: i.fruitId,
                    fruitName: i.fruitName,
                    priceSnapshot: i.priceSnapshot || 0,
                    isSupplement: i.role === 'supplement',
                  })),
                  fruits: (selectedCocktail.ingredients || []).map((i: any) => i.fruitName),
                  updatedAt: Date.now(),
                },
              }, { merge: true }).catch(() => null);
              await userDocRef.collection('whatsapp_messages').add({
                sender: 'nutrifys',
                text: qtyPrompt,
                timestamp: FieldValue.serverTimestamp(),
              }).catch(() => null);
            }
            return res.status(200).json({ status: 'ok', handled: 'catalog_juice_qty_prompt' });
          }
        } else if (interactiveButtonId.startsWith('btn_catfmt_')) {
          const parts = interactiveButtonId.replace('btn_catfmt_', '').split('_');
          const catId = parts[0];
          const containerIdx = parseInt(parts[1] || '0', 10);

          const allCat = catalogCocktails && catalogCocktails.length > 0
            ? catalogCocktails
            : await getActiveCatalogCocktails(db);
          const selectedCocktail = allCat.find((c) => c.id === catId) ||
            await db.collection('cocktails').doc(catId).get().then((d: any) => (d.exists ? { id: d.id, ...d.data() } : null));

          if (selectedCocktail) {
            const containers = Array.isArray(selectedCocktail.containers) && selectedCocktail.containers.length > 0
              ? selectedCocktail.containers
              : [{ label: '350ml', price: 500 }];
            const container = containers[containerIdx] || containers[0];
            const unitPrice = typeof container.price === 'number' ? container.price : 500;
            const bottleSizeLabel = container.label || '350ml';

            const qtyPrompt = `C'est noté pour le format ${bottleSizeLabel} (${unitPrice.toLocaleString('fr-FR')} XAF).\n\nCombien de bouteilles de « ${selectedCocktail.name} » souhaitez-vous ajouter ? (Vous pouvez combiner plusieurs jus du catalogue pour atteindre le minimum de 5 au total)`;
            await sendWhatsAppInteractiveButtons(
              senderPhone,
              qtyPrompt,
              [
                { id: `btn_catqty_${selectedCocktail.id}_${containerIdx}_1`, title: '1 Bouteille' },
                { id: `btn_catqty_${selectedCocktail.id}_${containerIdx}_2`, title: '2 Bouteilles' },
                { id: `btn_catqty_${selectedCocktail.id}_${containerIdx}_3`, title: '3 Bouteilles' },
              ],
              'FYS · Jus du catalogue',
              'Panier combinable (min. 5 au total)'
            );
            if (userDocRef) {
              await userDocRef.set({
                pendingCatalogSelection: {
                  catalogCocktailId: selectedCocktail.id,
                  cocktailName: selectedCocktail.name,
                  containerIdx,
                  bottleSizeLabel,
                  unitPrice,
                  imageUrl: selectedCocktail.imageUrl || null,
                  ingredients: (selectedCocktail.ingredients || []).map((i: any) => ({
                    fruitId: i.fruitId,
                    fruitName: i.fruitName,
                    priceSnapshot: i.priceSnapshot || 0,
                    isSupplement: i.role === 'supplement',
                  })),
                  fruits: (selectedCocktail.ingredients || []).map((i: any) => i.fruitName),
                  updatedAt: Date.now(),
                },
              }, { merge: true }).catch(() => null);
              await userDocRef.collection('whatsapp_messages').add({
                sender: 'nutrifys',
                text: qtyPrompt,
                timestamp: FieldValue.serverTimestamp(),
              }).catch(() => null);
            }
            return res.status(200).json({ status: 'ok', handled: 'catalog_format_selected' });
          }
        } else if (interactiveButtonId.startsWith('btn_catqty_')) {
          const parts = interactiveButtonId.replace('btn_catqty_', '').split('_');
          const catId = parts[0];
          const containerIdx = parseInt(parts[1] || '0', 10);
          const chosenQty = Math.max(1, parseInt(parts[2] || '1', 10));

          const allCat = catalogCocktails && catalogCocktails.length > 0
            ? catalogCocktails
            : await getActiveCatalogCocktails(db);
          const selectedCocktail = allCat.find((c) => c.id === catId) ||
            await db.collection('cocktails').doc(catId).get().then((d: any) => (d.exists ? { id: d.id, ...d.data() } : null));

          if (selectedCocktail) {
            const containers = Array.isArray(selectedCocktail.containers) && selectedCocktail.containers.length > 0
              ? selectedCocktail.containers
              : [{ label: '350ml', price: 500 }];
            const container = containers[containerIdx] || containers[0];
            const unitPrice = typeof container.price === 'number' ? container.price : 500;
            const bottleSizeLabel = container.label || '350ml';

            // Filtrer pour ne garder que les vrais jus du catalogue (exclure tout cocktail custom résiduel)
            const currentItems: WhatsAppCartItem[] = activeCart
              ? activeCart.items.filter((it) => it.isCatalog)
              : [];
            const existingIdx = currentItems.findIndex(
              (it) => it.catalogCocktailId === selectedCocktail.id && it.bottleSizeLabel === bottleSizeLabel
            );

            if (existingIdx >= 0) {
              currentItems[existingIdx].quantity = chosenQty;
              currentItems[existingIdx].lineTotal = unitPrice * chosenQty;
            } else {
              currentItems.push({
                id: `item_cat_${selectedCocktail.id}_${bottleSizeLabel.replace(/\s+/g, '')}`,
                cocktailName: selectedCocktail.name,
                fruits: (selectedCocktail.ingredients || []).map((i: any) => i.fruitName),
                ingredients: (selectedCocktail.ingredients || []).map((i: any) => ({
                  fruitId: i.fruitId,
                  fruitName: i.fruitName,
                  priceSnapshot: i.priceSnapshot || 0,
                  isSupplement: i.role === 'supplement',
                })),
                bottleSize: bottleSizeLabel,
                bottleSizeLabel,
                quantity: chosenQty,
                baseBottlePrice: 0,
                ingredientsPriceSum: unitPrice,
                unitPrice,
                lineTotal: unitPrice * chosenQty,
                isCatalog: true,
                catalogCocktailId: selectedCocktail.id,
                imageUrl: selectedCocktail.imageUrl,
              });
            }

            activeCart = computeCartFromRawItems(
              currentItems,
              availableFruits,
              bottle500Base,
              bottle1LBase,
              activeCart?.district,
              activeCart
            );

            if (userDocRef) {
              await saveActiveWhatsAppCart(userDocRef, activeCart);
              await userDocRef.set({ pendingCatalogSelection: FieldValue.delete() }, { merge: true }).catch(() => null);
            }
            pendingCatalogSelection = null;

            const totalCatalogBottles = activeCart.items.filter((i) => i.isCatalog).reduce((s, i) => s + i.quantity, 0);
            const cartLines = activeCart.items.map((it) => `• ${it.quantity} × ${it.cocktailName} (${it.bottleSizeLabel}) : ${(it.unitPrice * it.quantity).toLocaleString('fr-FR')} XAF`).join('\n');

            if (totalCatalogBottles < 5) {
              const missing = 5 - totalCatalogBottles;
              const feedbackText = `${chosenQty} × ${selectedCocktail.name} (${bottleSizeLabel}) ajouté à votre commande.\n\nVotre sélection actuelle :\n${cartLines}\n\nTotal jus du catalogue : ${totalCatalogBottles} / 5 bouteilles minimum\nIl vous manque encore ${missing} bouteille(s) pour valider votre commande. Vous pouvez combiner d'autres recettes du catalogue pour atteindre les 5 bouteilles.`;

              await sendWhatsAppInteractiveButtons(
                senderPhone,
                feedbackText,
                [
                  { id: 'btn_mode_catalog', title: 'Choisir un jus' },
                  { id: `btn_catcomp_${selectedCocktail.id}_${containerIdx}`, title: `Compléter (+${missing})` },
                  { id: 'btn_view_cart', title: 'Voir le panier' },
                ],
                'FYS · Panier catalogue',
                `Minimum 5 bouteilles (manque ${missing})`
              );
              if (userDocRef) {
                await userDocRef.collection('whatsapp_messages').add({
                  sender: 'nutrifys',
                  text: feedbackText,
                  timestamp: FieldValue.serverTimestamp(),
                }).catch(() => null);
              }
              return res.status(200).json({ status: 'ok', handled: 'catalog_item_added_under_min' });
            } else {
              const feedbackText = `${chosenQty} × ${selectedCocktail.name} (${bottleSizeLabel}) ajouté à votre commande.\n\nRécapitulatif de votre panier :\n${cartLines}\n\nTotal jus du catalogue : ${totalCatalogBottles} bouteilles (minimum de 5 atteint)\nSous-total : ${activeCart.subtotal.toLocaleString('fr-FR')} XAF\nLivraison Yaoundé : 1 000 XAF\nTotal à payer : ${activeCart.totalPrice.toLocaleString('fr-FR')} XAF`;

              await sendWhatsAppInteractiveButtons(
                senderPhone,
                feedbackText,
                [
                  { id: 'btn_order', title: 'Valider la commande' },
                  { id: 'btn_mode_catalog', title: 'Ajouter un jus' },
                ],
                'FYS · Commande prête',
                `Total : ${activeCart.totalPrice.toLocaleString('fr-FR')} XAF`
              );
              if (userDocRef) {
                await userDocRef.collection('whatsapp_messages').add({
                  sender: 'nutrifys',
                  text: feedbackText,
                  timestamp: FieldValue.serverTimestamp(),
                }).catch(() => null);
              }
              return res.status(200).json({ status: 'ok', handled: 'catalog_item_added_min_met' });
            }
          }
        } else if (interactiveButtonId.startsWith('btn_catcomp_') || interactiveButtonId === 'btn_complete_min') {
          let targetCatId: string | null = null;
          if (interactiveButtonId.startsWith('btn_catcomp_')) {
            const p = interactiveButtonId.replace('btn_catcomp_', '').split('_');
            targetCatId = p[0];
          }

          if (activeCart && activeCart.items.length > 0) {
            const currentCatalogQty = activeCart.items.filter((i) => i.isCatalog).reduce((s, i) => s + i.quantity, 0);
            const missing = Math.max(0, 5 - currentCatalogQty);

            let targetItemIndex = -1;
            if (targetCatId) {
              targetItemIndex = activeCart.items.findIndex((i) => i.catalogCocktailId === targetCatId);
            }
            if (targetItemIndex === -1) {
              for (let i = activeCart.items.length - 1; i >= 0; i--) {
                if (activeCart.items[i].isCatalog) {
                  targetItemIndex = i;
                  break;
                }
              }
            }

            if (targetItemIndex >= 0 && missing > 0) {
              activeCart.items[targetItemIndex].quantity += missing;
              activeCart.items[targetItemIndex].lineTotal = activeCart.items[targetItemIndex].unitPrice * activeCart.items[targetItemIndex].quantity;
            }

            activeCart = computeCartFromRawItems(
              activeCart.items,
              availableFruits,
              bottle500Base,
              bottle1LBase,
              activeCart.district,
              activeCart
            );

            if (userDocRef) {
              await saveActiveWhatsAppCart(userDocRef, activeCart);
            }

            const totalCatalogBottles = activeCart.items.filter((i) => i.isCatalog).reduce((s, i) => s + i.quantity, 0);
            const cartLines = activeCart.items.map((it) => `• ${it.quantity} × ${it.cocktailName} (${it.bottleSizeLabel}) : ${(it.unitPrice * it.quantity).toLocaleString('fr-FR')} XAF`).join('\n');

            const feedbackText = `Panier complété.\n\nRécapitulatif de votre panier :\n${cartLines}\n\nTotal jus du catalogue : ${totalCatalogBottles} bouteilles (minimum de 5 atteint)\nSous-total : ${activeCart.subtotal.toLocaleString('fr-FR')} XAF\nLivraison Yaoundé : 1 000 XAF\nTotal à payer : ${activeCart.totalPrice.toLocaleString('fr-FR')} XAF`;

            await sendWhatsAppInteractiveButtons(
              senderPhone,
              feedbackText,
              [
                { id: 'btn_order', title: 'Valider la commande' },
                { id: 'btn_mode_catalog', title: 'Ajouter un jus' },
              ],
              'FYS · Commande prête',
              `Total : ${activeCart.totalPrice.toLocaleString('fr-FR')} XAF`
            );
            if (userDocRef) {
              await userDocRef.collection('whatsapp_messages').add({
                sender: 'nutrifys',
                text: feedbackText,
                timestamp: FieldValue.serverTimestamp(),
              }).catch(() => null);
            }
            return res.status(200).json({ status: 'ok', handled: 'catalog_cart_completed_to_min' });
          }
        } else if (interactiveButtonId === 'btn_view_cart') {
          if (activeCart && activeCart.items.length > 0) {
            const totalCatalogBottles = activeCart.items.filter((i) => i.isCatalog).reduce((s, i) => s + i.quantity, 0);
            const cartLines = activeCart.items.map((it) => `• ${it.quantity} × ${it.cocktailName} (${it.bottleSizeLabel}) : ${(it.unitPrice * it.quantity).toLocaleString('fr-FR')} XAF`).join('\n');
            const hasCatalog = activeCart.items.some((i) => i.isCatalog);

            if (hasCatalog && totalCatalogBottles < 5) {
              const missing = 5 - totalCatalogBottles;
              const feedbackText = `Votre panier actuel :\n${cartLines}\n\nTotal jus du catalogue : ${totalCatalogBottles} / 5 bouteilles minimum\nIl vous manque encore ${missing} bouteille(s) pour valider votre commande.`;
              await sendWhatsAppInteractiveButtons(
                senderPhone,
                feedbackText,
                [
                  { id: 'btn_mode_catalog', title: 'Choisir un jus' },
                  { id: 'btn_complete_min', title: `Compléter (+${missing})` },
                ],
                'FYS · Panier catalogue',
                `Minimum : 5 bouteilles (actuel: ${totalCatalogBottles})`
              );
            } else {
              const feedbackText = `Récapitulatif de votre panier :\n${cartLines}\n\nSous-total : ${activeCart.subtotal.toLocaleString('fr-FR')} XAF\nLivraison Yaoundé : 1 000 XAF\nTotal à payer : ${activeCart.totalPrice.toLocaleString('fr-FR')} XAF`;
              await sendWhatsAppInteractiveButtons(
                senderPhone,
                feedbackText,
                [
                  { id: 'btn_order', title: 'Valider la commande' },
                  { id: 'btn_mode_catalog', title: 'Ajouter un jus' },
                ],
                'FYS · Commande prête',
                `Total : ${activeCart.totalPrice.toLocaleString('fr-FR')} XAF`
              );
            }
            return res.status(200).json({ status: 'ok', handled: 'view_cart_displayed' });
          }
        } else if (interactiveButtonId.startsWith('btn_nutrition')) {
          explicitAction = `[Le client a cliqué sur 'Fiche nutrition' : présente-lui la fiche nutritionnelle complète et détaillée de son cocktail.
RÈGLES STRICTES DE PRÉSENTATION :
1. Présente la fiche nutritionnelle complète avec un score santé calculé dynamiquement (entre 55 et 97, jamais 92 par défaut !).
2. Mise en page épurée, élégante et professionnelle (identique au web FYS), STRICTEMENT SANS EXCÈS D'ASTÉRISQUES (**) sur chaque mot ou chiffre.
3. Termine en proposant de passer à la commande avec le bouton :::BUTTONS [{"id": "btn_order", "title": "Commander"}].]`;
        } else if (
          interactiveButtonId.includes('melange') ||
          interactiveButtonId.includes('mix') ||
          interactiveButtonId.includes('valider') ||
          /(?:valider\s+(?:ce\s+)?m[ée]lange|je\s+valide|c'est\s+bon|parfait|garder\s+(?:ce\s+)?m[ée]lange)/i.test(senderText)
        ) {
          if (activeRecipeIngredients.length > 0) {
            activeCart = computeCartFromRawItems(
              [{
                cocktailName: activeRecipeName || 'Cocktail Santé FYS',
                fruits: activeRecipeIngredients.map((i) => i.fruitName),
                bottleSize: '500ml',
                quantity: 1,
              }],
              availableFruits,
              bottle500Base,
              bottle1LBase,
              undefined,
              undefined
            );
            if (userDocRef) {
              await saveActiveWhatsAppCart(userDocRef, activeCart);
              await userDocRef.set({
                activeWhatsAppDraft: {
                  cocktailName: activeRecipeName || 'Cocktail Santé FYS',
                  ingredients: activeRecipeIngredients,
                  updatedAt: FieldValue.serverTimestamp(),
                },
              }, { merge: true }).catch(() => null);
            }
          }
          const cocktailTitle = activeRecipeName || (activeCart?.items?.map(i => i.cocktailName).join(' + ')) || 'Cocktail Santé FYS';
          const fruitListStr = activeRecipeIngredients.map((i) => i.fruitName).join(', ') || (activeCart?.items?.flatMap(i => i.fruits).join(', ')) || 'fruits sélectionnés';
          explicitAction = `[Le client valide la composition de son cocktail « ${cocktailTitle} » (${fruitListStr}).
RÈGLE STRICTE ÉTAPE 2 :
Félicite-le chaleureusement pour ce superbe choix de fruits et demande-lui :
"Votre recette sur-mesure est prête ! Souhaitez-vous directement passer à la commande, ou préférez-vous d'abord découvrir la fiche nutritionnelle complète de votre mélange ?"
Propose IMPÉRATIVEMENT les boutons :::BUTTONS [{"id": "btn_order", "title": "Commander"}, {"id": "btn_nutrition", "title": "Fiche nutrition"}].]`;
        } else if (
          interactiveButtonId.includes('autre') ||
          interactiveButtonId.includes('change') ||
          /(?:choisir\s+d'autres|autres?\s+fruits?)/i.test(senderText)
        ) {
          activeCart = null;
          activeRecipeIngredients = [];
          activeRecipeName = '';
          if (userDocRef) {
            await userDocRef.set({
              activeWhatsAppCart: FieldValue.delete(),
              activeWhatsAppDraft: FieldValue.delete(),
            }, { merge: true }).catch(() => null);
          }
          explicitAction = `[Le client souhaite choisir d'autres fruits : invite-le chaleureusement à choisir 2 à 4 fruits parmi notre catalogue disponible en stock].`;
        } else if (
          interactiveButtonId.startsWith('btn_format_500ml') ||
          interactiveButtonId.startsWith('btn_format_1l') ||
          interactiveButtonId.startsWith('btn_format_all_500ml') ||
          interactiveButtonId.startsWith('btn_format_all_1l')
        ) {
          const chosenFormat: '500ml' | '1L' = interactiveButtonId.includes('500ml') ? '500ml' : '1L';
          const formatLabel = chosenFormat === '1L' ? '1 Litre' : '500ml';
          const isAll = interactiveButtonId.startsWith('btn_format_all_');

          // Filet de sécurité anti-amnésie : Si le panier n'est pas encore instancié, récupérer la recette
          if (!activeCart && activeRecipeIngredients.length > 0) {
            activeCart = computeCartFromRawItems(
              [{
                cocktailName: activeRecipeName || 'Cocktail Santé FYS',
                fruits: activeRecipeIngredients.map((i) => i.fruitName),
                bottleSize: chosenFormat,
                quantity: 1,
              }],
              availableFruits,
              bottle500Base,
              bottle1LBase,
              undefined,
              undefined
            );
            if (userDocRef) {
              await saveActiveWhatsAppCart(userDocRef, activeCart);
            }
          } else if (!activeCart && activeRecipeIngredients.length === 0) {
            // Scanner tout l'historique récent (utilisateur OU assistant) pour restaurer les fruits discutés
            for (let h = chatHistoryForGemini.length - 1; h >= 0; h--) {
              const msg = chatHistoryForGemini[h];
              if (msg.parts?.[0]?.text) {
                const found = extractCocktailsFromText(msg.parts[0].text, availableFruits);
                if (found && found.length > 0) {
                  activeCart = computeCartFromRawItems(
                    found.map((c) => ({ ...c, bottleSize: chosenFormat })),
                    availableFruits,
                    bottle500Base,
                    bottle1LBase,
                    undefined,
                    undefined
                  );
                  activeRecipeName = activeCart.items.map((i) => i.cocktailName).join(' + ');
                  activeRecipeIngredients = activeCart.items.flatMap((i) => i.ingredients);
                  if (userDocRef) {
                    await saveActiveWhatsAppCart(userDocRef, activeCart);
                    await userDocRef.set({
                      activeWhatsAppDraft: {
                        cocktailName: activeRecipeName,
                        ingredients: activeRecipeIngredients,
                        updatedAt: FieldValue.serverTimestamp(),
                      },
                    }, { merge: true }).catch(() => null);
                  }
                  break;
                }
              }
            }
          }

          if (activeCart && activeCart.items.length > 0) {
            let updatedRaw: any[] = [];
            if (isAll || activeCart.items.length === 1) {
              updatedRaw = activeCart.items.map((it) => ({
                cocktailName: it.cocktailName,
                fruits: it.fruits,
                bottleSize: chosenFormat,
                quantity: it.quantity,
                hasAddedSugar: it.hasAddedSugar,
              }));
            } else {
              // Panier multi-cocktails et format individuel choisi (ex: pour le dernier cocktail ajouté)
              updatedRaw = activeCart.items.map((it, idx) => ({
                cocktailName: it.cocktailName,
                fruits: it.fruits,
                bottleSize: (idx === activeCart!.items.length - 1) ? chosenFormat : it.bottleSize,
                quantity: it.quantity,
                hasAddedSugar: it.hasAddedSugar,
              }));
            }
            activeCart = computeCartFromRawItems(
              updatedRaw,
              availableFruits,
              bottle500Base,
              bottle1LBase,
              activeCart.district,
              activeCart
            );
            if (userDocRef) {
              await saveActiveWhatsAppCart(userDocRef, activeCart);
            }
            if (isAll && activeCart.items.length > 1) {
              explicitAction = `[Le client a choisi le format ${formatLabel} pour TOUTES ses boissons (${activeCart.items.map((i) => i.cocktailName).join(', ')}). RÈGLE STRICTE : Remercie-le et pose UNIQUEMENT la question du nombre de bouteilles avec les boutons :::BUTTONS [{"id": "btn_qty_each_1", "title": "1 de chaque"}, {"id": "btn_qty_each_2", "title": "2 de chaque"}, {"id": "btn_qty_diff", "title": "Quantités perso"}]. Précise aussi qu'il peut indiquer des formats différents s'il le souhaite.]`;
            } else if (!isAll && activeCart.items.length > 1) {
              const lastItem = activeCart.items[activeCart.items.length - 1];
              explicitAction = `[Le client a sélectionné le format ${formatLabel} pour son nouveau cocktail « ${lastItem.cocktailName} » (${lastItem.fruits.join(', ')}). RÈGLE STRICTE : Remercie-le et demande UNIQUEMENT le nombre de bouteilles pour ce cocktail avec les boutons :::BUTTONS [{"id": "btn_qty_1", "title": "1 Bouteille"}, {"id": "btn_qty_2", "title": "2 Bouteilles"}, {"id": "btn_qty_3", "title": "3 Bouteilles"}]. Ne demande PAS encore le quartier !]`;
            } else {
              explicitAction = `[Le client a sélectionné le format ${formatLabel} pour "${activeCart.items[0]?.cocktailName}". RÈGLE STRICTE : Remercie-le et pose UNIQUEMENT la question du nombre de bouteilles avec les boutons :::BUTTONS [{"id": "btn_qty_1", "title": "1 Bouteille"}, {"id": "btn_qty_2", "title": "2 Bouteilles"}, {"id": "btn_qty_3", "title": "3 Bouteilles"}]. Ne demande PAS encore le quartier !]`;
            }
          } else {
            explicitAction = `[Le client a cliqué sur 'Format ${formatLabel}', mais aucun cocktail n'a encore été composé. RÈGLE STRICTE : C'est bien noté pour le format ${formatLabel}, mais précise-lui que pour déterminer son tarif officiel, nous devons d'abord choisir les fruits de sa recette. Propose-lui de choisir 1 à 4 fruits parmi nos fruits disponibles en stock].`;
          }
        } else if (interactiveButtonId === 'btn_format_diff') {
          if (activeCart && activeCart.items.length > 0) {
            const cocktailList = activeCart.items.map((i, idx) => `Boisson ${idx + 1} : « ${i.cocktailName} »`).join(', ');
            explicitAction = `[Le client a cliqué sur 'Formats différents' : il souhaite des formats distincts pour ses cocktails (${cocktailList}). RÈGLE STRICTE : Demande-lui avec bienveillance quel format (500ml ou 1L) il souhaite pour chaque boisson (ex: "Quel format préférez-vous pour « ${activeCart.items[0]?.cocktailName} » et quel format pour « ${activeCart.items[1]?.cocktailName} » ?"). Précise qu'il peut simplement l'écrire en message (ex: "Le premier en 500ml et le deuxième en 1L"). Ne pose aucune autre question !]`;
          } else {
            explicitAction = `[Le client souhaite des formats différents : demande-lui quels formats (500ml ou 1L) il souhaite pour chacune de ses boissons.]`;
          }
        } else if (
          interactiveButtonId.startsWith('btn_qty_each_') ||
          interactiveButtonId.startsWith('btn_qty_')
        ) {
          let chosenQty = 1;
          const isEach = interactiveButtonId.startsWith('btn_qty_each_');
          if (isEach) {
            const match = interactiveButtonId.match(/\d+/);
            chosenQty = match ? parseInt(match[0], 10) : 1;
          } else {
            const match = interactiveButtonId.match(/\d+/) || senderText.match(/\d+/);
            chosenQty = match ? parseInt(match[0], 10) : 1;
          }

          if ((!activeCart || activeCart.items.length === 0) && pendingCatalogSelection) {
            const unitPrice = pendingCatalogSelection.unitPrice || 500;
            const bottleSizeLabel = pendingCatalogSelection.bottleSizeLabel || '350ml';
            const currentItems: WhatsAppCartItem[] = [{
              id: `item_cat_${pendingCatalogSelection.catalogCocktailId}_${bottleSizeLabel.replace(/\s+/g, '')}`,
              cocktailName: pendingCatalogSelection.cocktailName,
              fruits: pendingCatalogSelection.fruits || [],
              ingredients: pendingCatalogSelection.ingredients || [],
              bottleSize: bottleSizeLabel,
              bottleSizeLabel,
              quantity: chosenQty,
              baseBottlePrice: 0,
              ingredientsPriceSum: unitPrice,
              unitPrice,
              lineTotal: unitPrice * chosenQty,
              isCatalog: true,
              catalogCocktailId: pendingCatalogSelection.catalogCocktailId,
              imageUrl: pendingCatalogSelection.imageUrl || null,
            }];
            activeCart = computeCartFromRawItems(
              currentItems,
              availableFruits,
              bottle500Base,
              bottle1LBase,
              undefined,
              undefined
            );
            if (userDocRef) {
              await saveActiveWhatsAppCart(userDocRef, activeCart);
              await userDocRef.set({ pendingCatalogSelection: FieldValue.delete() }, { merge: true }).catch(() => null);
            }
            pendingCatalogSelection = null;
          } else if (!activeCart && activeRecipeIngredients.length > 0) {
            activeCart = computeCartFromRawItems(
              [{
                cocktailName: activeRecipeName || 'Cocktail Santé FYS',
                fruits: activeRecipeIngredients.map((i) => i.fruitName),
                bottleSize: '500ml',
                quantity: chosenQty,
              }],
              availableFruits,
              bottle500Base,
              bottle1LBase,
              undefined,
              undefined
            );
            if (userDocRef) {
              await saveActiveWhatsAppCart(userDocRef, activeCart);
            }
          }

          if (activeCart && activeCart.items.length > 0) {
            let updatedRaw: any[] = [];
            if (isEach || activeCart.items.length === 1) {
              updatedRaw = activeCart.items.map((it) => ({
                cocktailName: it.cocktailName,
                fruits: it.fruits,
                bottleSize: it.bottleSize,
                bottleSizeLabel: it.bottleSizeLabel,
                quantity: chosenQty,
                hasAddedSugar: it.hasAddedSugar,
                isCatalog: it.isCatalog,
                catalogCocktailId: it.catalogCocktailId,
                imageUrl: it.imageUrl,
                unitPrice: it.unitPrice,
              }));
            } else {
              // Panier multi-cocktails et quantité individuelle choisie (ex: pour le dernier cocktail ajouté)
              updatedRaw = activeCart.items.map((it, idx) => {
                const targetQty = (idx === activeCart!.items.length - 1) ? chosenQty : it.quantity;
                return {
                  cocktailName: it.cocktailName,
                  fruits: it.fruits,
                  bottleSize: it.bottleSize,
                  bottleSizeLabel: it.bottleSizeLabel,
                  quantity: targetQty,
                  hasAddedSugar: it.hasAddedSugar,
                  isCatalog: it.isCatalog,
                  catalogCocktailId: it.catalogCocktailId,
                  imageUrl: it.imageUrl,
                  unitPrice: it.unitPrice,
                };
              });
            }
            activeCart = computeCartFromRawItems(
              updatedRaw,
              availableFruits,
              bottle500Base,
              bottle1LBase,
              activeCart.district,
              activeCart
            );
            if (userDocRef) {
              await saveActiveWhatsAppCart(userDocRef, activeCart);
            }

            const isCat = activeCart.items.some((i) => i.isCatalog);
            const totalCat = activeCart.items.filter((i) => i.isCatalog).reduce((s, i) => s + i.quantity, 0);

            if (isCat && totalCat < 5) {
              const missing = 5 - totalCat;
              const cartLines = activeCart.items.map((it) => `• ${it.quantity} × ${it.cocktailName} (${it.bottleSizeLabel}) : ${(it.unitPrice * it.quantity).toLocaleString('fr-FR')} XAF`).join('\n');
              const warningText = `Votre sélection actuelle :\n${cartLines}\n\nTotal jus du catalogue : ${totalCat} / 5 bouteilles minimum\nIl vous manque encore ${missing} bouteille(s) pour valider votre commande. Vous pouvez combiner d'autres recettes du catalogue pour atteindre les 5 bouteilles.`;
              await sendWhatsAppInteractiveButtons(
                senderPhone,
                warningText,
                [
                  { id: 'btn_mode_catalog', title: 'Choisir un jus' },
                  { id: 'btn_complete_min', title: `Compléter (+${missing})` },
                  { id: 'btn_view_cart', title: 'Voir le panier' },
                ],
                'FYS · Minimum 5 bouteilles',
                `Manque ${missing} bouteille(s)`
              );
              if (userDocRef) {
                await userDocRef.collection('whatsapp_messages').add({
                  sender: 'nutrifys',
                  text: warningText,
                  timestamp: FieldValue.serverTimestamp(),
                }).catch(() => null);
              }
              return res.status(200).json({ status: 'ok', handled: 'catalog_min_qty_warning_btn' });
            }

            if (activeCart.district) {
              const devisExact = generateCartDevisText(activeCart, activeCart.district);
              explicitAction = `[Le client a choisi la quantité : ${chosenQty} bouteille(s) ${isEach ? 'de chaque boisson' : `pour « ${activeCart.items[activeCart.items.length - 1]?.cocktailName} »`}.
LE SERVEUR FYS A DÉJÀ CALCULÉ LE DEVIS OFFICIEL EXACT AVEC LIVRAISON À ${activeCart.district} :
${devisExact}

CONSIGNE STRICTE ET ABSOLUE :
Affiche exactement ce devis sans modifier aucun montant ni aucun cocktail !
Propose ensuite les boutons :::BUTTONS [{"id": "btn_confirm_order", "title": "Valider commande"}, {"id": "btn_edit_order", "title": "Modifier"}].]`;
            } else if (isCat) {
              const cartLines = activeCart.items.map((it) => `• ${it.quantity} × ${it.cocktailName} (${it.bottleSizeLabel}) : ${(it.unitPrice * it.quantity).toLocaleString('fr-FR')} XAF`).join('\n');
              explicitAction = `[Le client a choisi la quantité : ${chosenQty} bouteille(s) pour son panier de jus du catalogue (${cartLines}).
Total boissons : ${activeCart.subtotal.toLocaleString('fr-FR')} XAF + Livraison : 1 000 XAF = Total : ${activeCart.totalPrice.toLocaleString('fr-FR')} XAF.
RÈGLE STRICTE : Remercie-le chaleureusement et demande-lui UNIQUEMENT dans quel quartier de Yaoundé il souhaite être livré avec la liste déroulante :::LIST des quartiers, en précisant bien qu'il peut aussi l'écrire s'il ne figure pas dans la liste].`;
            } else {
              explicitAction = `[Le client a choisi la quantité : ${chosenQty} bouteille(s) ${isEach ? 'de chaque boisson' : `pour « ${activeCart.items[activeCart.items.length - 1]?.cocktailName} »`} (${activeCart.items.map((i) => `${i.cocktailName} en ${i.bottleSizeLabel}`).join(', ')}). RÈGLE STRICTE : Demande-lui UNIQUEMENT dans quel quartier de Yaoundé il souhaite être livré avec la liste déroulante :::LIST des quartiers, en précisant bien qu'il peut aussi l'écrire s'il ne figure pas dans la liste].`;
            }
          } else if (activeRecipeIngredients.length === 0) {
            explicitAction = `[Le client a cliqué sur la quantité : "${senderText}", mais aucun cocktail n'a été composé. RÈGLE STRICTE : Demande-lui d'abord quels fruits il souhaite mélanger].`;
          } else {
            explicitAction = `[Le client a choisi la quantité : "${senderText}". RÈGLE STRICTE : Demande-lui UNIQUEMENT dans quel quartier de Yaoundé il souhaite être livré avec la liste déroulante :::LIST des quartiers, en précisant bien qu'il peut aussi l'écrire s'il ne figure pas dans la liste].`;
          }
        } else if (interactiveButtonId === 'btn_qty_diff') {
          if (activeCart && activeCart.items.length > 0) {
            const cocktailList = activeCart.items.map((i) => `« ${i.cocktailName} » (${i.bottleSizeLabel})`).join(', ');
            explicitAction = `[Le client a cliqué sur 'Quantités perso' : il souhaite des quantités différentes pour ses boissons (${cocktailList}). RÈGLE STRICTE : Demande-lui avec bienveillance combien de bouteilles il désire pour chaque cocktail (ex: "Combien de bouteilles souhaitez-vous pour « ${activeCart.items[0]?.cocktailName} » et combien pour « ${activeCart.items[1]?.cocktailName} » ?"). Précise qu'il peut simplement l'écrire en message (ex: "1 du premier et 2 du deuxième").]`;
          } else {
            explicitAction = `[Le client souhaite des quantités différentes : demande-lui combien de bouteilles il souhaite pour chaque boisson.]`;
          }
        } else if (interactiveButtonId.startsWith('loc_')) {
          const chosenDistrict = senderText.trim();
          if (!activeCart && activeRecipeIngredients.length > 0) {
            activeCart = computeCartFromRawItems(
              [{
                cocktailName: activeRecipeName || 'Cocktail Santé FYS',
                fruits: activeRecipeIngredients.map((i) => i.fruitName),
                bottleSize: '500ml',
                quantity: 1,
              }],
              availableFruits,
              bottle500Base,
              bottle1LBase,
              chosenDistrict,
              undefined
            );
            if (userDocRef) {
              await saveActiveWhatsAppCart(userDocRef, activeCart);
            }
          }
          if (activeCart && activeCart.items.length > 0) {
            activeCart.district = chosenDistrict;
            activeCart = computeCartFromRawItems(
              activeCart.items,
              availableFruits,
              bottle500Base,
              bottle1LBase,
              chosenDistrict,
              activeCart
            );
            if (userDocRef) {
              await saveActiveWhatsAppCart(userDocRef, activeCart);
            }
            const devisExact = generateCartDevisText(activeCart, chosenDistrict);
            explicitAction = `[Le client a choisi son quartier de livraison : "${chosenDistrict}".
LE SERVEUR FYS A DÉJÀ CALCULÉ LE DEVIS OFFICIEL EXACT :
${devisExact}

CONSIGNE STRICTE ET ABSOLUE :
Affiche exactement ce devis sans modifier aucun montant ni aucun cocktail !
Propose ensuite les boutons :::BUTTONS [{"id": "btn_confirm_order", "title": "Valider commande"}, {"id": "btn_edit_order", "title": "Modifier"}].]`;
          } else if (activeRecipeIngredients.length === 0) {
            explicitAction = `[Le client a choisi son quartier : "${chosenDistrict}", mais aucun cocktail n'a été composé. RÈGLE STRICTE : Demande-lui d'abord quels fruits composer].`;
          } else {
            const districtFee = getDeliveryZoneForDistrict(chosenDistrict, activeDeliveryZones).fee;
            explicitAction = `[Le client a choisi son quartier de livraison : "${chosenDistrict}". RÈGLE STRICTE : Établis maintenant le récapitulatif devis complet avec calcul exact du prix : (Prix unitaire x Quantité) + ${districtFee.toLocaleString('fr-FR')} XAF de livraison pour ${chosenDistrict}. Demande-lui s'il valide avec les boutons :::BUTTONS [Valider commande] et [Modifier]].`;
          }
        } else if (interactiveButtonId.startsWith('btn_confirm_order')) {
          if (activeCart && activeCart.items.length > 0) {
            const recapText = generateCartConfirmationText(activeCart, activeCart.district, isDelivery24hActive);
            explicitAction = `[Le client a cliqué sur 'Valider commande' : il approuve et confirme son devis !
RÈGLE STRICTE :
Remercie-le chaleureusement et confirme que sa commande est officiellement validée.
Affiche le récapitulatif officiel suivant :
${recapText}
Insère le bloc :::ORDER_JSON pour finaliser l'enregistrement.]`;
          } else {
            const fallbackDistrict = (activeCart && activeCart.district) || 'Yaoundé';
            const fallbackFee = getDeliveryZoneForDistrict(fallbackDistrict, activeDeliveryZones).fee;
            explicitAction = `[Le client a cliqué sur 'Valider commande' : il approuve et confirme son devis ! Remercie-le chaleureusement, confirme que sa commande est enregistrée et insère le bloc :::ORDER_JSON avec les tarifs exacts convenus (livraison = ${fallbackFee} XAF)].`;
            if (webDraft) {
              const draftIngredients = Array.isArray(webDraft.cocktail?.ingredients) ? webDraft.cocktail.ingredients : [];
              const fruitNames = draftIngredients.map((i: any) => i.fruitName || i.name);
              explicitAction += ` [RAPPEL STRICT : Cette commande concerne la création du Lab FYS "${webDraft.cocktail?.name}". Dans :::ORDER_JSON, "cocktailName" DOIT être strictement "${webDraft.cocktail?.name}", "fruits" DOIT être strictement ${JSON.stringify(fruitNames)}].`;
            }
          }
        } else if (interactiveButtonId.startsWith('btn_edit_order')) {
          explicitAction = `[Le client a cliqué sur 'Modifier' : demande-lui avec bienveillance ce qu'il souhaite modifier : fruits, format, quantité ou adresse de livraison].`;
        }
        currentUserParts.push({ text: explicitAction });
      } else {
        // Anti-amnésie : si aucun panier actif, récupérer la recette en cours depuis les ingrédients ou l'historique
        if (!activeCart && activeRecipeIngredients.length > 0) {
          activeCart = computeCartFromRawItems(
            [{
              cocktailName: activeRecipeName || 'Cocktail Santé FYS',
              fruits: activeRecipeIngredients.map((i) => i.fruitName),
              bottleSize: '500ml',
              quantity: 1,
            }],
            availableFruits,
            bottle500Base,
            bottle1LBase,
            undefined,
            undefined
          );
          if (userDocRef) {
            await saveActiveWhatsAppCart(userDocRef, activeCart);
          }
        } else if (!activeCart && activeRecipeIngredients.length === 0) {
          for (let h = chatHistoryForGemini.length - 1; h >= 0; h--) {
            const msg = chatHistoryForGemini[h];
            if (msg.parts?.[0]?.text) {
              const found = extractCocktailsFromText(msg.parts[0].text, availableFruits);
              if (found && found.length > 0) {
                activeCart = computeCartFromRawItems(
                  found,
                  availableFruits,
                  bottle500Base,
                  bottle1LBase,
                  undefined,
                  undefined
                );
                activeRecipeName = activeCart.items.map((i) => i.cocktailName).join(' + ');
                activeRecipeIngredients = activeCart.items.flatMap((i) => i.ingredients);
                if (userDocRef) {
                  await saveActiveWhatsAppCart(userDocRef, activeCart);
                  await userDocRef.set({
                    activeWhatsAppDraft: {
                      cocktailName: activeRecipeName,
                      ingredients: activeRecipeIngredients,
                      updatedAt: FieldValue.serverTimestamp(),
                    },
                  }, { merge: true }).catch(() => null);
                  console.log(`[whatsapp-webhook] 🛡️ Anti-amnesia recovered cocktail in text mode:`, activeRecipeName);
                }
                break;
              }
            }
          }
        }

        // Détection intelligente de formats ou de quantités pour un panier multi-boissons en cours
        let textHandled = false;

        // 0. Ajout d'une autre boisson / cocktail à une commande en cours par texte
        if (!textHandled && isAddIntent && activeCart && activeCart.items.length >= 2) {
          const lastItem = activeCart.items[activeCart.items.length - 1];
          const summaryAll = activeCart.items
            .map((it, idx) => `• Boisson ${idx + 1} : « ${it.cocktailName} » (${it.fruits.join(', ')})`)
            .join('\n');
          currentUserParts.push({
            text: `${senderText}\n\n[SYSTÈME FYS : Le client a demandé d'ajouter un nouveau cocktail (« ${lastItem.cocktailName} » : ${lastItem.fruits.join(', ')}) à sa commande en cours.
Sa commande comporte désormais ${activeCart.items.length} boisson(s) :
${summaryAll}
RÈGLE STRICTE :
1. Remercie-le chaleureusement et confirme l'ajout de ce nouveau cocktail à son panier.
2. Demande-lui UNIQUEMENT quel format il souhaite pour CE nouveau cocktail (« ${lastItem.cocktailName} ») avec les boutons :::BUTTONS [{"id": "btn_format_500ml", "title": "Format 500ml"}, {"id": "btn_format_1l", "title": "Format 1 Litre"}].
Ne pose aucune autre question !]`,
          });
          textHandled = true;
        }

        // 1. Validation de la composition du cocktail par texte ("je valide", "valider ce mélange", "c'est bon", "on y va")
        const isValidateMixText = /(?:valider\s+(?:ce\s+)?m[ée]lange|je\s+valide|c'est\s+bon|parfait|garder\s+(?:ce\s+)?m[ée]lange|on\s+y\s+va|allons-y|allons\s+y|d'accord|ça\s+marche|ca\s+marche|ça\s+me\s+va|ca\s+me\s+va|top|super|excellent|j'aime\s+bien|je\s+prends|c'est\s+parti|go\b)/i.test(senderText);
        if (!textHandled && isValidateMixText) {
          // Synchroniser avec la recette proposée par l'assistant dans l'historique récent
          for (let h = chatHistoryForGemini.length - 1; h >= 0; h--) {
            const msg = chatHistoryForGemini[h];
            if (msg.role === 'model' && msg.parts?.[0]?.text) {
              const found = extractCocktailsFromText(msg.parts[0].text, availableFruits);
              if (found && found.length > 0 && found[0].fruits.length >= 2) {
                activeCart = computeCartFromRawItems(
                  found,
                  availableFruits,
                  bottle500Base,
                  bottle1LBase,
                  activeCart?.district,
                  undefined
                );
                activeRecipeName = activeCart.items.map((i) => i.cocktailName).join(' + ');
                activeRecipeIngredients = activeCart.items.flatMap((i) => i.ingredients);
                break;
              }
            }
          }

          if (activeRecipeIngredients.length > 0) {
            if (!activeCart || activeCart.items.length === 0) {
              activeCart = computeCartFromRawItems(
                [{
                  cocktailName: activeRecipeName || 'Cocktail Santé FYS',
                  fruits: activeRecipeIngredients.map((i) => i.fruitName),
                  bottleSize: '500ml',
                  quantity: 1,
                }],
                availableFruits,
                bottle500Base,
                bottle1LBase,
                activeCart?.district,
                undefined
              );
            }
            if (userDocRef) {
              await saveActiveWhatsAppCart(userDocRef, activeCart);
              await userDocRef.set({
                activeWhatsAppDraft: {
                  cocktailName: activeRecipeName || 'Cocktail Santé FYS',
                  ingredients: activeRecipeIngredients,
                  updatedAt: FieldValue.serverTimestamp(),
                },
              }, { merge: true }).catch(() => null);
            }
            const cocktailTitle = activeRecipeName || (activeCart?.items?.map(i => i.cocktailName).join(' + ')) || 'Cocktail Santé FYS';
            const fruitListStr = activeRecipeIngredients.map((i) => i.fruitName).join(', ') || (activeCart?.items?.flatMap(i => i.fruits).join(', ')) || 'fruits sélectionnés';
            currentUserParts.push({
              text: `${senderText}\n\n[SYSTÈME FYS : Le client valide la composition de son cocktail « ${cocktailTitle} » (${fruitListStr}).
RÈGLE STRICTE ÉTAPE 2 :
Félicite-le chaleureusement pour ce superbe choix de fruits et demande-lui :
"Votre recette sur-mesure est prête ! Souhaitez-vous directement passer à la commande, ou préférez-vous d'abord découvrir la fiche nutritionnelle complète de votre mélange ?"
Propose IMPÉRATIVEMENT les boutons :::BUTTONS [{"id": "btn_order", "title": "Commander"}, {"id": "btn_nutrition", "title": "Fiche nutrition"}].]`,
            });
            textHandled = true;
          }
        }

        // Intention explicite de pure consultation du catalogue des jus signatures par texte
        // (Uniquement si le client ne passe pas de commande, ne pose pas de question précise et ne mentionne ni quantité ni quartier)
        const hasOrderOrQuestionIntent =
          /\b(?:\d+\s*(?:bouteilles?|cols?|btls?)|je\s+(?:veux|voudrais|souhaite|prends|commande|suis)|commander|combien|prix|co[uû]te|livr(?:aison|er|ez)|nkoabang|bastos|odza|yaound[ée]|avez[- ]vous|y\s+a[- ]t[- ]il|proposez[- ]vous|faites[- ]vous|existe|baobab)\b/i.test(senderText);

        const isPureCatalogConsultation =
          !hasOrderOrQuestionIntent &&
          /(?:voir\s+(?:les|le)\s+(?:jus|catalogue|menu|carte)|consulter\s+le\s+catalogue|afficher\s+le\s+catalogue|envoyer?\s+le\s+catalogue|donne\s+le\s+catalogue|d[ée]couvrir\s+(?:les|le)\s+catalogue|carte\s+des\s+jus|c['’]est\s+quoi\s+le\s+catalogue|quelles?\s+sont\s+les\s+recettes\s+du\s+catalogue|quel\s+est\s+le\s+catalogue|menu\s+des\s+jus|^catalogue$|^menu$|^carte$)/i.test(senderText.trim());

        if (!textHandled && isPureCatalogConsultation) {
          const listToSendCatalog = catalogCocktails && catalogCocktails.length > 0
            ? catalogCocktails
            : await getActiveCatalogCocktails(db);
          if (listToSendCatalog.length > 0) {
            await sendCatalogJuicesList(senderPhone, listToSendCatalog);
            if (userDocRef) {
              await userDocRef.collection('whatsapp_messages').add({
                sender: 'nutrifys',
                text: `[Catalogue des jus signatures FYS envoyé : ${listToSendCatalog.map((c) => c.name).join(', ')}]`,
                timestamp: FieldValue.serverTimestamp(),
              }).catch(() => null);
            }
            return res.status(200).json({ status: 'ok', handled: 'catalog_cards_sent' });
          }
        }

        // Détection directe d'un jus du catalogue mentionné par son nom dans le texte
        const matchedCatalogCocktail = matchCatalogCocktailFromText(
          senderText,
          catalogCocktails && catalogCocktails.length > 0 ? catalogCocktails : await getActiveCatalogCocktails(db)
        );
        if (!textHandled && matchedCatalogCocktail) {
          const containers = Array.isArray(matchedCatalogCocktail.containers) && matchedCatalogCocktail.containers.length > 0
            ? matchedCatalogCocktail.containers
            : [{ label: '350ml', price: 500 }];

          if (containers.length > 1) {
            const formatButtons = containers.slice(0, 3).map((c: any, idx: number) => ({
              id: `btn_catfmt_${matchedCatalogCocktail.id}_${idx}`,
              title: `${c.label} (${(Number(c.price) || 0).toLocaleString('fr-FR')} XAF)`.slice(0, 20),
            }));
            const fmtPrompt = `Pour notre jus signature « ${matchedCatalogCocktail.name} », quel format préférez-vous ?`;
            await sendWhatsAppInteractiveButtons(
              senderPhone,
              fmtPrompt,
              formatButtons,
              'FYS · Choix du format',
              matchedCatalogCocktail.name
            );
            if (userDocRef) {
              await userDocRef.set({
                pendingCatalogSelection: {
                  catalogCocktailId: matchedCatalogCocktail.id,
                  cocktailName: matchedCatalogCocktail.name,
                  containerIdx: 0,
                  bottleSizeLabel: containers[0]?.label || '350ml',
                  unitPrice: containers[0]?.price || 500,
                  imageUrl: matchedCatalogCocktail.imageUrl || null,
                  ingredients: (matchedCatalogCocktail.ingredients || []).map((i: any) => ({
                    fruitId: i.fruitId,
                    fruitName: i.fruitName,
                    priceSnapshot: i.priceSnapshot || 0,
                    isSupplement: i.role === 'supplement',
                  })),
                  fruits: (matchedCatalogCocktail.ingredients || []).map((i: any) => i.fruitName),
                  updatedAt: Date.now(),
                },
              }, { merge: true }).catch(() => null);
              await userDocRef.collection('whatsapp_messages').add({
                sender: 'nutrifys',
                text: fmtPrompt,
                timestamp: FieldValue.serverTimestamp(),
              }).catch(() => null);
            }
            return res.status(200).json({ status: 'ok', handled: 'catalog_format_prompt_from_text' });
          }

          const container = containers[0];
          const unitPrice = typeof container.price === 'number' ? container.price : 500;
          const bottleSizeLabel = container.label || '350ml';

          const currentCatalogTotal = activeCart ? activeCart.items.filter((i) => i.isCatalog).reduce((s, i) => s + i.quantity, 0) : 0;
          const existingCartSummary = activeCart && activeCart.items.length > 0
            ? `\n\nVotre sélection actuelle :\n${activeCart.items.map((i) => `• ${i.quantity}x ${i.cocktailName} (${i.bottleSizeLabel})`).join('\n')}\n(Total actuel : ${currentCatalogTotal} / 5 bouteilles)`
            : '';

          const qtyPrompt = `Vous avez sélectionné ${matchedCatalogCocktail.name} (${bottleSizeLabel} à ${unitPrice.toLocaleString('fr-FR')} XAF l'unité).${existingCartSummary}\n\nCombien de bouteilles de cette recette souhaitez-vous ajouter ?\n(Vous pouvez combiner plusieurs jus du catalogue pour atteindre le minimum de 5 au total, ou taper directement un chiffre)`;
          await sendWhatsAppInteractiveButtons(
            senderPhone,
            qtyPrompt,
            [
              { id: `btn_catqty_${matchedCatalogCocktail.id}_0_1`, title: '1 Bouteille' },
              { id: `btn_catqty_${matchedCatalogCocktail.id}_0_2`, title: '2 Bouteilles' },
              { id: `btn_catqty_${matchedCatalogCocktail.id}_0_3`, title: '3 Bouteilles' },
            ],
            'FYS · Jus du catalogue',
            'Panier combinable (min. 5 au total)'
          );

          if (userDocRef) {
            await userDocRef.set({
              pendingCatalogSelection: {
                catalogCocktailId: matchedCatalogCocktail.id,
                cocktailName: matchedCatalogCocktail.name,
                containerIdx: 0,
                bottleSizeLabel,
                unitPrice,
                imageUrl: matchedCatalogCocktail.imageUrl || null,
                ingredients: (matchedCatalogCocktail.ingredients || []).map((i: any) => ({
                  fruitId: i.fruitId,
                  fruitName: i.fruitName,
                  priceSnapshot: i.priceSnapshot || 0,
                  isSupplement: i.role === 'supplement',
                })),
                fruits: (matchedCatalogCocktail.ingredients || []).map((i: any) => i.fruitName),
                updatedAt: Date.now(),
              },
            }, { merge: true }).catch(() => null);
            await userDocRef.collection('whatsapp_messages').add({
              sender: 'nutrifys',
              text: qtyPrompt,
              timestamp: FieldValue.serverTimestamp(),
            }).catch(() => null);
          }
          return res.status(200).json({ status: 'ok', handled: 'catalog_juice_prompt_from_text' });
        }

        // 1.75. Détection déterministe d'une quantité ou d'un incrément (ex: "ajoutes encore 3", "je veux 5 bouteilles", "5")
        const qtyIntent = (!textHandled && senderText) ? parseQuantityIntentFromText(senderText) : null;
        if (qtyIntent) {
          if (activeCart && activeCart.items.length > 0) {
            const lastIdx = activeCart.items.length - 1;
            const target = activeCart.items[lastIdx];
            const newQty = qtyIntent.isRelative ? (target.quantity + qtyIntent.quantity) : qtyIntent.quantity;
            if (newQty > 0 && newQty <= 50) {
              const updatedRaw = activeCart.items.map((it, idx) => ({
                cocktailName: it.cocktailName,
                fruits: it.fruits,
                bottleSize: it.bottleSize,
                bottleSizeLabel: it.bottleSizeLabel,
                quantity: (idx === lastIdx) ? newQty : it.quantity,
                hasAddedSugar: it.hasAddedSugar,
                isCatalog: it.isCatalog,
                catalogCocktailId: it.catalogCocktailId,
                imageUrl: it.imageUrl,
                unitPrice: it.unitPrice,
              }));
              activeCart = computeCartFromRawItems(
                updatedRaw,
                availableFruits,
                bottle500Base,
                bottle1LBase,
                activeCart.district,
                activeCart
              );
              if (userDocRef) {
                await saveActiveWhatsAppCart(userDocRef, activeCart);
                await userDocRef.set({ pendingCatalogSelection: FieldValue.delete() }, { merge: true }).catch(() => null);
              }
              pendingCatalogSelection = null;

              const hasCat = activeCart.items.some((i) => i.isCatalog);
              const totalCat = activeCart.items.filter((i) => i.isCatalog).reduce((s, i) => s + i.quantity, 0);

              if (hasCat && totalCat < 5) {
                const missing = 5 - totalCat;
                const cartLines = activeCart.items.map((it) => `• ${it.quantity} × ${it.cocktailName} (${it.bottleSizeLabel}) : ${(it.unitPrice * it.quantity).toLocaleString('fr-FR')} XAF`).join('\n');
                const warningText = `${newQty} × ${target.cocktailName} (${target.bottleSizeLabel}) mis à jour.\n\nVotre sélection actuelle :\n${cartLines}\n\nTotal jus du catalogue : ${totalCat} / 5 bouteilles minimum\nIl vous manque encore ${missing} bouteille(s) pour valider votre commande. Vous pouvez combiner d'autres recettes du catalogue pour atteindre les 5 bouteilles.`;
                await sendWhatsAppInteractiveButtons(
                  senderPhone,
                  warningText,
                  [
                    { id: 'btn_mode_catalog', title: 'Choisir un jus' },
                    { id: `btn_catcomp_${target.catalogCocktailId || ''}_0`, title: `Compléter (+${missing})` },
                    { id: 'btn_view_cart', title: 'Voir le panier' },
                  ],
                  'FYS · Minimum 5 bouteilles',
                  `Manque ${missing} bouteille(s)`
                );
                if (userDocRef) {
                  await userDocRef.collection('whatsapp_messages').add({
                    sender: 'nutrifys',
                    text: warningText,
                    timestamp: FieldValue.serverTimestamp(),
                  }).catch(() => null);
                }
                return res.status(200).json({ status: 'ok', handled: 'qty_text_under_min_updated' });
              } else if (hasCat) {
                const cartLines = activeCart.items.map((it) => `• ${it.quantity} × ${it.cocktailName} (${it.bottleSizeLabel}) : ${(it.unitPrice * it.quantity).toLocaleString('fr-FR')} XAF`).join('\n');
                const readyText = `${newQty} × ${target.cocktailName} (${target.bottleSizeLabel}) mis à jour.\n\nRécapitulatif de votre panier :\n${cartLines}\n\nTotal jus du catalogue : ${totalCat} bouteilles (minimum de 5 atteint)\nSous-total : ${activeCart.subtotal.toLocaleString('fr-FR')} XAF\nLivraison Yaoundé : 1 000 XAF\nTotal à payer : ${activeCart.totalPrice.toLocaleString('fr-FR')} XAF`;
                await sendWhatsAppInteractiveButtons(
                  senderPhone,
                  readyText,
                  [
                    { id: 'btn_order', title: 'Valider la commande' },
                    { id: 'btn_mode_catalog', title: 'Ajouter un jus' },
                  ],
                  'FYS · Commande prête',
                  `Total : ${activeCart.totalPrice.toLocaleString('fr-FR')} XAF`
                );
                if (userDocRef) {
                  await userDocRef.collection('whatsapp_messages').add({
                    sender: 'nutrifys',
                    text: readyText,
                    timestamp: FieldValue.serverTimestamp(),
                  }).catch(() => null);
                }
                return res.status(200).json({ status: 'ok', handled: 'qty_text_min_met_updated' });
              } else if (activeCart.district) {
                const devisExact = generateCartDevisText(activeCart, activeCart.district);
                currentUserParts.push({
                  text: `${senderText}\n\n[SYSTÈME FYS : Le client a choisi la quantité : ${newQty} bouteille(s) pour « ${target.cocktailName} ».
LE SERVEUR FYS A DÉJÀ CALCULÉ LE DEVIS OFFICIEL EXACT AVEC LIVRAISON À ${activeCart.district} :
${devisExact}

CONSIGNE STRICTE ET ABSOLUE :
Affiche exactement ce devis sans modifier aucun montant ni aucun cocktail !
Propose ensuite les boutons :::BUTTONS [{"id": "btn_confirm_order", "title": "Valider commande"}, {"id": "btn_edit_order", "title": "Modifier"}].]`,
                });
                textHandled = true;
              } else {
                currentUserParts.push({
                  text: `${senderText}\n\n[SYSTÈME FYS : Le client a choisi la quantité : ${newQty} bouteille(s) pour « ${target.cocktailName} ». RÈGLE STRICTE : Demande-lui UNIQUEMENT dans quel quartier de Yaoundé il souhaite être livré avec la liste déroulante :::LIST des quartiers !]`,
                });
                textHandled = true;
              }
            }
          } else if ((!activeCart || activeCart.items.length === 0) && pendingCatalogSelection) {
            const chosenQty = qtyIntent.quantity;
            const unitPrice = pendingCatalogSelection.unitPrice || 500;
            const bottleSizeLabel = pendingCatalogSelection.bottleSizeLabel || '350ml';
            const currentItems: WhatsAppCartItem[] = [{
              id: `item_cat_${pendingCatalogSelection.catalogCocktailId}_${bottleSizeLabel.replace(/\s+/g, '')}`,
              cocktailName: pendingCatalogSelection.cocktailName,
              fruits: pendingCatalogSelection.fruits || [],
              ingredients: pendingCatalogSelection.ingredients || [],
              bottleSize: bottleSizeLabel,
              bottleSizeLabel,
              quantity: chosenQty,
              baseBottlePrice: 0,
              ingredientsPriceSum: unitPrice,
              unitPrice,
              lineTotal: unitPrice * chosenQty,
              isCatalog: true,
              catalogCocktailId: pendingCatalogSelection.catalogCocktailId,
              imageUrl: pendingCatalogSelection.imageUrl || null,
            }];
            activeCart = computeCartFromRawItems(
              currentItems,
              availableFruits,
              bottle500Base,
              bottle1LBase,
              undefined,
              undefined
            );
            if (userDocRef) {
              await saveActiveWhatsAppCart(userDocRef, activeCart);
              await userDocRef.set({ pendingCatalogSelection: FieldValue.delete() }, { merge: true }).catch(() => null);
            }
            pendingCatalogSelection = null;

            if (chosenQty < 5) {
              const missing = 5 - chosenQty;
              const cartLines = `• ${chosenQty} × ${activeCart.items[0].cocktailName} (${activeCart.items[0].bottleSizeLabel}) : ${(activeCart.items[0].unitPrice * chosenQty).toLocaleString('fr-FR')} XAF`;
              const warningText = `${chosenQty} × ${activeCart.items[0].cocktailName} (${activeCart.items[0].bottleSizeLabel}) enregistré.\n\nVotre sélection actuelle :\n${cartLines}\n\nTotal jus du catalogue : ${chosenQty} / 5 bouteilles minimum\nIl vous manque encore ${missing} bouteille(s) pour valider votre commande. Vous pouvez combiner d'autres recettes du catalogue pour atteindre les 5 bouteilles.`;
              await sendWhatsAppInteractiveButtons(
                senderPhone,
                warningText,
                [
                  { id: 'btn_mode_catalog', title: 'Choisir un jus' },
                  { id: `btn_catcomp_${activeCart.items[0].catalogCocktailId || ''}_0`, title: `Compléter (+${missing})` },
                  { id: 'btn_view_cart', title: 'Voir le panier' },
                ],
                'FYS · Minimum 5 bouteilles',
                `Manque ${missing} bouteille(s)`
              );
              if (userDocRef) {
                await userDocRef.collection('whatsapp_messages').add({
                  sender: 'nutrifys',
                  text: warningText,
                  timestamp: FieldValue.serverTimestamp(),
                }).catch(() => null);
              }
              return res.status(200).json({ status: 'ok', handled: 'catalog_pending_qty_under_min' });
            } else {
              const cartLines = `• ${chosenQty} × ${activeCart.items[0].cocktailName} (${activeCart.items[0].bottleSizeLabel}) : ${(activeCart.items[0].unitPrice * chosenQty).toLocaleString('fr-FR')} XAF`;
              const readyText = `${chosenQty} × ${activeCart.items[0].cocktailName} (${activeCart.items[0].bottleSizeLabel}) enregistré.\n\nRécapitulatif de votre panier :\n${cartLines}\n\nTotal jus du catalogue : ${chosenQty} bouteilles (minimum de 5 atteint)\nSous-total : ${activeCart.subtotal.toLocaleString('fr-FR')} XAF\nLivraison Yaoundé : 1 000 XAF\nTotal à payer : ${activeCart.totalPrice.toLocaleString('fr-FR')} XAF`;
              await sendWhatsAppInteractiveButtons(
                senderPhone,
                readyText,
                [
                  { id: 'btn_order', title: 'Valider la commande' },
                  { id: 'btn_mode_catalog', title: 'Ajouter un jus' },
                ],
                'FYS · Commande prête',
                `Total : ${activeCart.totalPrice.toLocaleString('fr-FR')} XAF`
              );
              if (userDocRef) {
                await userDocRef.collection('whatsapp_messages').add({
                  sender: 'nutrifys',
                  text: readyText,
                  timestamp: FieldValue.serverTimestamp(),
                }).catch(() => null);
              }
              return res.status(200).json({ status: 'ok', handled: 'catalog_pending_qty_min_met' });
            }
          }
        }

        // 1.8. Salutations, reprise de contact ou envie de jus / demande de conseil / proposition
        const isGreetingOrGeneralInquiry =
          /(?:^|\b)(?:bonjour|salut|hello|bonsoir|coucou|yo|rebonjour|hey|allo|sant[ée]|bienvenue)(?:\b|$)/i.test(senderText) ||
          /(?:envie\s+d(?:'|\s+un)\s+jus|boire\s+un\s+jus|propose[rz]?(?:\s+moi)?|qu['’]est-ce\s+que\s+(?:tu|vous)\s+(?:avez|proposez)|qu['’]avez-vous|quelles?\s+sont\s+vos\s+formules?|carte\s+des\s+jus|menu\s+des\s+jus|quel\s+jus\s+choisir|je\s+veux\s+(?:un\s+)?jus)/i.test(senderText);

        if (!textHandled && isGreetingOrGeneralInquiry && !activeCart && activeRecipeIngredients.length === 0) {
          const salutationPrompt = customerFirstName
            ? `1. Salue-le chaleureusement et avec bienveillance EN L'APPELANT OBLIGATOIREMENT PAR SON PRÉNOM (« Bonjour ${customerFirstName} ! »). BANNIS ABSOLUMENT « cher(e) client(e) ».`
            : `1. Salue-le chaleureusement et avec bienveillance (« Bonjour et bienvenue chez FYS ! »). BANNIS ABSOLUMENT « cher(e) client(e) ».`;
          currentUserParts.push({
            text: `${senderText}\n\n[SYSTÈME FYS : Le client vous salue, reprend contact ou demande un jus / une recommandation.
RÈGLE COMMERCIALE FYS STRICTE - LE DOUBLE CHOIX SYSTÉMATIQUE & PROXIMITÉ :
${salutationPrompt}
2. Demande-lui s'il souhaite :
   - 1. Composer sur-mesure sa recette au Lab (selon ses objectifs de santé et ses fruits frais préférés).
   - 2. Partir sur une formule du catalogue (nos jus signatures prêts selon les formats et tarifs officiels — commande minimale de 5 bouteilles au total, combinables).
3. Demande-lui laquelle de ces deux options il préfère aujourd'hui.
4. Propose IMPÉRATIVEMENT les boutons :::BUTTONS [{"id": "btn_mode_custom", "title": "Composer sur-mesure"}, {"id": "btn_mode_catalog", "title": "Jus du catalogue"}]. Ne pose aucune autre question !]`,
          });
          textHandled = true;
        }

        // 2. Intention de commander par texte ("commander", "je veux commander", "passer la commande")
        const isOrderText = /(?:commander|passer\s+(?:[àa]\s+la\s+)?commande|je\s+commande)/i.test(senderText) && !/(?:valider\s+commande)/i.test(senderText);
        if (!textHandled && isOrderText && (activeCart || activeRecipeIngredients.length > 0)) {
          if (activeCart && activeCart.items.length > 1) {
            currentUserParts.push({
              text: `${senderText}\n\n[SYSTÈME FYS : Le client souhaite commander ses cocktails (${activeCart.items.map((i) => i.cocktailName).join(', ')}). RÈGLE STRICTE : Demande-lui quel format il préfère pour ses boissons avec les boutons :::BUTTONS [{"id": "btn_format_all_500ml", "title": "Tous en 500ml"}, {"id": "btn_format_all_1l", "title": "Tous en 1 Litre"}, {"id": "btn_format_diff", "title": "Formats différents"}]. Ne pose AUCUNE autre question !]`,
            });
          } else if (activeCart?.items?.[0]?.isCatalog) {
            currentUserParts.push({
              text: `${senderText}\n\n[SYSTÈME FYS : Le client souhaite commander son jus du catalogue « ${activeCart.items[0].cocktailName} » (${activeCart.items[0].bottleSizeLabel} à ${activeCart.items[0].unitPrice.toLocaleString('fr-FR')} XAF). RÈGLE COMMERCIALE STRICTE : Rappelle la commande minimale de 5 bouteilles au total (combinables) et demande la quantité avec les boutons :::BUTTONS [{"id": "btn_qty_1", "title": "1 Bouteille"}, {"id": "btn_qty_2", "title": "2 Bouteilles"}, {"id": "btn_qty_5", "title": "5 Bouteilles"}]. Ne pose AUCUNE autre question !]`,
            });
          } else {
            const cName = activeRecipeName || activeCart?.items?.[0]?.cocktailName || 'Cocktail Santé FYS';
            currentUserParts.push({
              text: `${senderText}\n\n[SYSTÈME FYS : Le client souhaite commander son cocktail "${cName}". RÈGLE STRICTE : Pose UNIQUEMENT la question du format (500ml ou 1L) avec les boutons :::BUTTONS [{"id": "btn_format_500ml", "title": "Format 500ml"}, {"id": "btn_format_1l", "title": "Format 1 Litre"}]. Ne pose AUCUNE autre question !]`,
            });
          }
          textHandled = true;
        } else if (!textHandled && isOrderText && !activeCart && activeRecipeIngredients.length === 0) {
          currentUserParts.push({
            text: `${senderText}\n\n[SYSTÈME FYS : Le client souhaite commander mais aucune boisson n'est encore choisie. RÈGLE STRICTE : Présente-lui chaleureusement les deux options FYS pour commander :
1. Composer votre cocktail sur-mesure au Lab (selon vos objectifs santé et vos fruits frais préférés).
2. Découvrir nos jus signatures du catalogue (recettes prêtes selon les formats et tarifs officiels - commande minimale de 5 bouteilles au total, combinables).
Propose IMPÉRATIVEMENT les boutons :::BUTTONS [{"id": "btn_mode_custom", "title": "Composer sur-mesure"}, {"id": "btn_mode_catalog", "title": "Jus du catalogue"}]. Ne pose aucune autre question !]`,
          });
          textHandled = true;
        }

        // 3. Demande de fiche nutritionnelle par texte
        const isNutritionText = /(?:fiche\s+nutrition(?:nelle)?|valeurs?\s+nutritionnelles?)/i.test(senderText);
        if (!textHandled && isNutritionText && (activeCart || activeRecipeIngredients.length > 0)) {
          const cocktailTitle = activeRecipeName || activeCart?.items?.[0]?.cocktailName || 'Cocktail Santé FYS';
          const fruitListStr = activeRecipeIngredients.map((i) => i.fruitName).join(', ') || activeCart?.items?.[0]?.fruits?.join(', ') || '';
          currentUserParts.push({
            text: `${senderText}\n\n[SYSTÈME FYS : Le client a demandé la fiche nutritionnelle de son cocktail « ${cocktailTitle} » (${fruitListStr}).
RÈGLES STRICTES DE PRÉSENTATION :
1. Présente la fiche nutritionnelle complète avec un score santé calculé dynamiquement (entre 55 et 97, jamais 92 par défaut !).
2. Mise en page épurée, élégante et professionnelle (identique au web FYS), STRICTEMENT SANS EXCÈS D'ASTÉRISQUES (**) sur chaque mot ou chiffre.
3. Termine en proposant de passer à la commande avec le bouton :::BUTTONS [{"id": "btn_order", "title": "Commander"}].]`,
          });
          textHandled = true;
        }

        if (!textHandled && activeCart && activeCart.items.length >= 2) {
          const cleanSenderLower = senderText.toLowerCase().trim();

          // Cas A : L'utilisateur dit "Tous en 500ml" ou "Tous en 1L" en texte libre
          const isAll500 = /(?:tous|toutes?|les\s+(?:deux|2|trois|3)|chacun(?:e)?)\s+(?:en\s+)?500\s*(?:ml)?/i.test(cleanSenderLower);
          const isAll1L = /(?:tous|toutes?|les\s+(?:deux|2|trois|3)|chacun(?:e)?)\s+(?:en\s+)?(?:1\s*(?:l|litre)|1000\s*ml)/i.test(cleanSenderLower);

          if (isAll500 || isAll1L) {
            const chosenSize: '500ml' | '1L' = isAll500 ? '500ml' : '1L';
            const label = chosenSize === '1L' ? '1 Litre' : '500ml';
            const updatedRaw = activeCart.items.map((it) => ({
              cocktailName: it.cocktailName,
              fruits: it.fruits,
              bottleSize: chosenSize,
              quantity: it.quantity,
              hasAddedSugar: it.hasAddedSugar,
            }));
            activeCart = computeCartFromRawItems(
              updatedRaw,
              availableFruits,
              bottle500Base,
              bottle1LBase,
              activeCart.district,
              activeCart
            );
            if (userDocRef) {
              await saveActiveWhatsAppCart(userDocRef, activeCart);
            }
            currentUserParts.push({
              text: `${senderText}\n\n[SYSTÈME FYS : Le client a choisi le format ${label} pour TOUTES ses boissons (${activeCart.items.map((i) => i.cocktailName).join(', ')}). Le panier a été recalculé avec succès par le serveur FYS. Remercie-le chaleureusement et demande la quantité avec :::BUTTONS [{"id": "btn_qty_each_1", "title": "1 de chaque"}, {"id": "btn_qty_each_2", "title": "2 de chaque"}, {"id": "btn_qty_diff", "title": "Quantités perso"}] !]`,
            });
            textHandled = true;
          } else if (
            /(?:formats?\s+diff[ée]rents?|pas\s+le\s+m[êe]me\s+format|tailles?\s+diff[ée]rentes?)/i.test(cleanSenderLower) &&
            !/500\s*(?:ml)?|1\s*(?:l|litre)/i.test(cleanSenderLower)
          ) {
            // Cas B : L'utilisateur dit juste qu'il veut des formats différents sans encore préciser lesquels
            const cocktailList = activeCart.items.map((i, idx) => `Boisson ${idx + 1} : « ${i.cocktailName} »`).join(', ');
            currentUserParts.push({
              text: `${senderText}\n\n[SYSTÈME FYS : Le client a indiqué souhaiter des formats différents pour ses boissons (${cocktailList}). RÈGLE STRICTE : Demande-lui avec bienveillance quel format (500ml ou 1L) il souhaite pour chaque boisson (ex: "Quel format préférez-vous pour « ${activeCart.items[0]?.cocktailName} » et quel format pour « ${activeCart.items[1]?.cocktailName} » ?"). Précise qu'il peut simplement l'écrire en message (ex: "Le premier en 500ml et le deuxième en 1L"). Ne pose aucune autre question !]`,
            });
            textHandled = true;
          } else {
            // Cas C : Détection fine de formats et/ou quantités distincts spécifiés
            const distinctUpdates = detectDistinctFormatsAndQuantitiesFromText(senderText, activeCart);
            if (distinctUpdates && distinctUpdates.length > 0) {
              console.log('[whatsapp-webhook] 🎯 Distinct formats/quantities detected from text:', distinctUpdates);
              const updatedRaw = activeCart.items.map((it, idx) => {
                const u = distinctUpdates.find((d) => d.index === idx);
                return {
                  cocktailName: it.cocktailName,
                  fruits: it.fruits,
                  bottleSize: u?.bottleSize || it.bottleSize,
                  quantity: u?.quantity !== undefined ? u.quantity : it.quantity,
                  hasAddedSugar: it.hasAddedSugar,
                };
              });
              activeCart = computeCartFromRawItems(
                updatedRaw,
                availableFruits,
                bottle500Base,
                bottle1LBase,
                activeCart.district,
                activeCart
              );
              if (userDocRef) {
                await saveActiveWhatsAppCart(userDocRef, activeCart);
              }
              const summaryFormats = activeCart.items
                .map((i) => `« ${i.cocktailName} » en ${i.quantity}x ${i.bottleSizeLabel} (${i.unitPrice.toLocaleString('fr-FR')} XAF)`)
                .join(' + ');
              currentUserParts.push({
                text: `${senderText}\n\n[SYSTÈME FYS : Le client a défini les formats de ses boissons : ${summaryFormats}. Le serveur FYS a recalculé les prix officiels exacts (sous-total: ${activeCart.subtotal.toLocaleString('fr-FR')} XAF, total avec livraison: ${activeCart.totalPrice.toLocaleString('fr-FR')} XAF). Remercie-le chaleureusement, confirme clairement ces formats attribués et demande dans quel quartier de Yaoundé il souhaite être livré avec la liste :::LIST !]`,
              });
              textHandled = true;
            } else if (/^(?:format\s+)?(?:500\s*(?:ml)?|1\s*(?:l|litre)|1000\s*ml)$/i.test(cleanSenderLower)) {
              // Cas D : L'utilisateur envoie simplement "500ml" ou "1L" pour le dernier cocktail ajouté
              const is500 = /500/i.test(cleanSenderLower);
              const chosenSize: '500ml' | '1L' = is500 ? '500ml' : '1L';
              const label = chosenSize === '1L' ? '1 Litre' : '500ml';
              const lastIdx = activeCart.items.length - 1;
              const updatedRaw = activeCart.items.map((it, idx) => ({
                cocktailName: it.cocktailName,
                fruits: it.fruits,
                bottleSize: (idx === lastIdx) ? chosenSize : it.bottleSize,
                quantity: it.quantity,
                hasAddedSugar: it.hasAddedSugar,
              }));
              activeCart = computeCartFromRawItems(
                updatedRaw,
                availableFruits,
                bottle500Base,
                bottle1LBase,
                activeCart.district,
                activeCart
              );
              if (userDocRef) {
                await saveActiveWhatsAppCart(userDocRef, activeCart);
              }
              const lastItem = activeCart.items[lastIdx];
              currentUserParts.push({
                text: `${senderText}\n\n[SYSTÈME FYS : Le client a choisi le format ${label} pour « ${lastItem.cocktailName} ». RÈGLE STRICTE : Remercie-le et demande UNIQUEMENT la quantité souhaitée pour ce cocktail avec les boutons :::BUTTONS [{"id": "btn_qty_1", "title": "1 Bouteille"}, {"id": "btn_qty_2", "title": "2 Bouteilles"}, {"id": "btn_qty_3", "title": "3 Bouteilles"}]. Ne demande pas encore le quartier !]`,
              });
              textHandled = true;
            } else if (/^(\d+)(?:\s*(?:bouteilles?|cols?|btls?))?$/i.test(cleanSenderLower)) {
              // Cas E : L'utilisateur envoie une quantité (ex: "1" ou "1 bouteille") pour le dernier cocktail ajouté
              const parsedQty = parseInt(cleanSenderLower.match(/\d+/)![0], 10);
              if (parsedQty > 0 && parsedQty <= 20) {
                const lastIdx = activeCart.items.length - 1;
                const updatedRaw = activeCart.items.map((it, idx) => ({
                  cocktailName: it.cocktailName,
                  fruits: it.fruits,
                  bottleSize: it.bottleSize,
                  bottleSizeLabel: it.bottleSizeLabel,
                  quantity: (idx === lastIdx) ? parsedQty : it.quantity,
                  hasAddedSugar: it.hasAddedSugar,
                  isCatalog: it.isCatalog,
                  catalogCocktailId: it.catalogCocktailId,
                  imageUrl: it.imageUrl,
                  unitPrice: it.unitPrice,
                }));
                activeCart = computeCartFromRawItems(
                  updatedRaw,
                  availableFruits,
                  bottle500Base,
                  bottle1LBase,
                  activeCart.district,
                  activeCart
                );
                if (userDocRef) {
                  await saveActiveWhatsAppCart(userDocRef, activeCart);
                }
                const lastItem = activeCart.items[lastIdx];
                const hasCat = activeCart.items.some((i) => i.isCatalog);
                const totalCat = activeCart.items.filter((i) => i.isCatalog).reduce((s, i) => s + i.quantity, 0);

                if (hasCat && totalCat < 5) {
                  const missing = 5 - totalCat;
                  const cartLines = activeCart.items.map((it) => `• ${it.quantity} × ${it.cocktailName} (${it.bottleSizeLabel}) : ${(it.unitPrice * it.quantity).toLocaleString('fr-FR')} XAF`).join('\n');
                  const warningText = `${parsedQty} × ${lastItem.cocktailName} (${lastItem.bottleSizeLabel}) mis à jour.\n\nVotre sélection actuelle :\n${cartLines}\n\nTotal jus du catalogue : ${totalCat} / 5 bouteilles minimum\nIl vous manque encore ${missing} bouteille(s) pour valider votre commande. Vous pouvez combiner d'autres recettes du catalogue pour atteindre les 5 bouteilles.`;
                  await sendWhatsAppInteractiveButtons(
                    senderPhone,
                    warningText,
                    [
                      { id: 'btn_mode_catalog', title: 'Choisir un jus' },
                      { id: 'btn_complete_min', title: `Compléter (+${missing})` },
                      { id: 'btn_view_cart', title: 'Voir le panier' },
                    ],
                    'FYS · Minimum 5 bouteilles',
                    `Manque ${missing} bouteille(s)`
                  );
                  if (userDocRef) {
                    await userDocRef.collection('whatsapp_messages').add({
                      sender: 'nutrifys',
                      text: warningText,
                      timestamp: FieldValue.serverTimestamp(),
                    }).catch(() => null);
                  }
                  return res.status(200).json({ status: 'ok', handled: 'catalog_qty_text_under_min_multi' });
                } else if (hasCat) {
                  const cartLines = activeCart.items.map((it) => `• ${it.quantity} × ${it.cocktailName} (${it.bottleSizeLabel}) : ${(it.unitPrice * it.quantity).toLocaleString('fr-FR')} XAF`).join('\n');
                  const readyText = `${parsedQty} × ${lastItem.cocktailName} (${lastItem.bottleSizeLabel}) mis à jour.\n\nRécapitulatif de votre panier :\n${cartLines}\n\nTotal jus du catalogue : ${totalCat} bouteilles (minimum de 5 atteint)\nSous-total : ${activeCart.subtotal.toLocaleString('fr-FR')} XAF\nLivraison Yaoundé : 1 000 XAF\nTotal à payer : ${activeCart.totalPrice.toLocaleString('fr-FR')} XAF`;
                  await sendWhatsAppInteractiveButtons(
                    senderPhone,
                    readyText,
                    [
                      { id: 'btn_order', title: 'Valider la commande' },
                      { id: 'btn_mode_catalog', title: 'Ajouter un jus' },
                    ],
                    'FYS · Commande prête',
                    `Total : ${activeCart.totalPrice.toLocaleString('fr-FR')} XAF`
                  );
                  if (userDocRef) {
                    await userDocRef.collection('whatsapp_messages').add({
                      sender: 'nutrifys',
                      text: readyText,
                      timestamp: FieldValue.serverTimestamp(),
                    }).catch(() => null);
                  }
                  return res.status(200).json({ status: 'ok', handled: 'catalog_qty_text_min_met_multi' });
                } else if (activeCart.district) {
                  const devisExact = generateCartDevisText(activeCart, activeCart.district);
                  currentUserParts.push({
                    text: `${senderText}\n\n[SYSTÈME FYS : Le client a choisi la quantité : ${parsedQty} bouteille(s) pour « ${lastItem.cocktailName} ».
LE SERVEUR FYS A DÉJÀ CALCULÉ LE DEVIS OFFICIEL EXACT AVEC LIVRAISON À ${activeCart.district} :
${devisExact}

CONSIGNE STRICTE ET ABSOLUE :
Affiche exactement ce devis sans modifier aucun montant ni aucun cocktail !
Propose ensuite les boutons :::BUTTONS [{"id": "btn_confirm_order", "title": "Valider commande"}, {"id": "btn_edit_order", "title": "Modifier"}].]`,
                  });
                } else {
                  currentUserParts.push({
                    text: `${senderText}\n\n[SYSTÈME FYS : Le client a choisi la quantité : ${parsedQty} bouteille(s) pour « ${lastItem.cocktailName} ». RÈGLE STRICTE : Demande-lui UNIQUEMENT dans quel quartier de Yaoundé il souhaite être livré avec la liste déroulante :::LIST des quartiers !]`,
                  });
                }
                textHandled = true;
              }
            }
          }
        } else if (!textHandled && activeCart && activeCart.items.length === 1) {
          const cleanSenderLower = senderText.toLowerCase().trim();
          const is500 = /500\s*(?:ml)?/i.test(cleanSenderLower);
          const is1L = /(?:1\s*(?:l|litre)|1000\s*ml)/i.test(cleanSenderLower);
          const qtyMatch = cleanSenderLower.match(/^(\d+)(?:\s*(?:bouteilles?|cols?|btls?))?$/i) || cleanSenderLower.match(/(\d+)\s*(?:bouteilles?|cols?|btls?)/i);

          if (is500 || is1L) {
            const chosenSize: '500ml' | '1L' = is500 ? '500ml' : '1L';
            const label = chosenSize === '1L' ? '1 Litre' : '500ml';
            let chosenQty = activeCart.items[0].quantity;
            if (qtyMatch) {
              const parsedQty = parseInt(qtyMatch[1], 10);
              if (parsedQty > 0 && parsedQty <= 20) chosenQty = parsedQty;
            }
            const updatedRaw = [{
              cocktailName: activeCart.items[0].cocktailName,
              fruits: activeCart.items[0].fruits,
              bottleSize: chosenSize,
              quantity: chosenQty,
              hasAddedSugar: activeCart.items[0].hasAddedSugar,
            }];
            activeCart = computeCartFromRawItems(
              updatedRaw,
              availableFruits,
              bottle500Base,
              bottle1LBase,
              activeCart.district,
              activeCart
            );
            if (userDocRef) {
              await saveActiveWhatsAppCart(userDocRef, activeCart);
            }
            if (qtyMatch) {
              currentUserParts.push({
                text: `${senderText}\n\n[SYSTÈME FYS : Le client a choisi le format ${label} et la quantité (${chosenQty} bouteille(s)) pour son cocktail "${activeCart.items[0].cocktailName}". Le montant exact est de ${activeCart.subtotal.toLocaleString('fr-FR')} XAF. Demande-lui UNIQUEMENT dans quel quartier de Yaoundé il souhaite être livré avec la liste déroulante :::LIST des quartiers !]`,
              });
            } else {
              currentUserParts.push({
                text: `${senderText}\n\n[SYSTÈME FYS : Le client a choisi le format ${label} pour son cocktail "${activeCart.items[0].cocktailName}". Le tarif exact a été recalculé (${activeCart.items[0].unitPrice.toLocaleString('fr-FR')} XAF). Remercie-le chaleureusement et demande la quantité avec :::BUTTONS [{"id": "btn_qty_1", "title": "1 Bouteille"}, {"id": "btn_qty_2", "title": "2 Bouteilles"}, {"id": "btn_qty_3", "title": "3 Bouteilles"}] !]`,
              });
            }
            textHandled = true;
          } else if (qtyMatch) {
            const chosenQty = parseInt(qtyMatch[1], 10);
            if (activeCart.items[0].isCatalog) {
              const updatedRaw = [{
                cocktailName: activeCart.items[0].cocktailName,
                fruits: activeCart.items[0].fruits,
                bottleSize: activeCart.items[0].bottleSize,
                bottleSizeLabel: activeCart.items[0].bottleSizeLabel,
                quantity: chosenQty,
                hasAddedSugar: activeCart.items[0].hasAddedSugar,
                isCatalog: true,
                catalogCocktailId: activeCart.items[0].catalogCocktailId,
                imageUrl: activeCart.items[0].imageUrl,
                unitPrice: activeCart.items[0].unitPrice,
              }];
              activeCart = computeCartFromRawItems(
                updatedRaw,
                availableFruits,
                bottle500Base,
                bottle1LBase,
                activeCart.district,
                activeCart
              );
              if (userDocRef) {
                await saveActiveWhatsAppCart(userDocRef, activeCart);
              }

              if (chosenQty < 5) {
                const missing = 5 - chosenQty;
                const cartLines = `• ${chosenQty} × ${activeCart.items[0].cocktailName} (${activeCart.items[0].bottleSizeLabel}) : ${(activeCart.items[0].unitPrice * chosenQty).toLocaleString('fr-FR')} XAF`;
                const feedbackText = `${chosenQty} × ${activeCart.items[0].cocktailName} (${activeCart.items[0].bottleSizeLabel}) enregistré.\n\nVotre sélection actuelle :\n${cartLines}\n\nTotal jus du catalogue : ${chosenQty} / 5 bouteilles minimum\nIl vous manque encore ${missing} bouteille(s) pour valider votre commande. Vous pouvez combiner d'autres recettes du catalogue pour atteindre les 5 bouteilles.`;

                await sendWhatsAppInteractiveButtons(
                  senderPhone,
                  feedbackText,
                  [
                    { id: 'btn_mode_catalog', title: 'Choisir un jus' },
                    { id: 'btn_complete_min', title: `Compléter (+${missing})` },
                    { id: 'btn_view_cart', title: 'Voir le panier' },
                  ],
                  'FYS · Minimum 5 bouteilles',
                  `Manque ${missing} bouteille(s)`
                );
                if (userDocRef) {
                  await userDocRef.collection('whatsapp_messages').add({
                    sender: 'nutrifys',
                    text: feedbackText,
                    timestamp: FieldValue.serverTimestamp(),
                  }).catch(() => null);
                }
                return res.status(200).json({ status: 'ok', handled: 'catalog_single_item_qty_under_min' });
              } else {
                const cartLines = `• ${chosenQty} × ${activeCart.items[0].cocktailName} (${activeCart.items[0].bottleSizeLabel}) : ${(activeCart.items[0].unitPrice * chosenQty).toLocaleString('fr-FR')} XAF`;
                const feedbackText = `${chosenQty} × ${activeCart.items[0].cocktailName} (${activeCart.items[0].bottleSizeLabel}) enregistré.\n\nRécapitulatif de votre panier :\n${cartLines}\n\nTotal jus du catalogue : ${chosenQty} bouteilles (minimum de 5 atteint)\nSous-total : ${activeCart.subtotal.toLocaleString('fr-FR')} XAF\nLivraison Yaoundé : 1 000 XAF\nTotal à payer : ${activeCart.totalPrice.toLocaleString('fr-FR')} XAF`;

                await sendWhatsAppInteractiveButtons(
                  senderPhone,
                  feedbackText,
                  [
                    { id: 'btn_order', title: 'Valider la commande' },
                    { id: 'btn_mode_catalog', title: 'Ajouter un jus' },
                  ],
                  'FYS · Commande prête',
                  `Total : ${activeCart.totalPrice.toLocaleString('fr-FR')} XAF`
                );
                if (userDocRef) {
                  await userDocRef.collection('whatsapp_messages').add({
                    sender: 'nutrifys',
                    text: feedbackText,
                    timestamp: FieldValue.serverTimestamp(),
                  }).catch(() => null);
                }
                return res.status(200).json({ status: 'ok', handled: 'catalog_single_item_qty_min_met' });
              }
            } else if (chosenQty > 0 && chosenQty <= 50) {
              const updatedRaw = [{
                cocktailName: activeCart.items[0].cocktailName,
                fruits: activeCart.items[0].fruits,
                bottleSize: activeCart.items[0].bottleSize,
                bottleSizeLabel: activeCart.items[0].bottleSizeLabel,
                quantity: chosenQty,
                hasAddedSugar: activeCart.items[0].hasAddedSugar,
                isCatalog: false,
                imageUrl: activeCart.items[0].imageUrl,
                unitPrice: activeCart.items[0].unitPrice,
              }];
              activeCart = computeCartFromRawItems(
                updatedRaw,
                availableFruits,
                bottle500Base,
                bottle1LBase,
                activeCart.district,
                activeCart
              );
              if (userDocRef) {
                await saveActiveWhatsAppCart(userDocRef, activeCart);
              }

              if (activeCart.district) {
                const devisExact = generateCartDevisText(activeCart, activeCart.district);
                currentUserParts.push({
                  text: `${senderText}\n\n[SYSTÈME FYS : Le client a choisi la quantité : ${chosenQty} bouteille(s) pour « ${activeCart.items[0].cocktailName} ».
LE SERVEUR FYS A DÉJÀ CALCULÉ LE DEVIS OFFICIEL EXACT AVEC LIVRAISON À ${activeCart.district} :
${devisExact}

CONSIGNE STRICTE ET ABSOLUE :
Affiche exactement ce devis sans modifier aucun montant ni aucun cocktail !
Propose ensuite les boutons :::BUTTONS [{"id": "btn_confirm_order", "title": "Valider commande"}, {"id": "btn_edit_order", "title": "Modifier"}].]`,
                });
              } else {
                currentUserParts.push({
                  text: `${senderText}\n\n[SYSTÈME FYS : Le client a choisi la quantité : ${chosenQty} bouteille(s) de "${activeCart.items[0].cocktailName}" en ${activeCart.items[0].bottleSizeLabel}. Le montant exact est de ${activeCart.subtotal.toLocaleString('fr-FR')} XAF + Livraison : 1 000 XAF = Total : ${activeCart.totalPrice.toLocaleString('fr-FR')} XAF. Demande-lui UNIQUEMENT dans quel quartier de Yaoundé il souhaite être livré avec la liste déroulante :::LIST des quartiers !]`,
                });
              }
              textHandled = true;
            }
          }
        }

        // 4. Détection du quartier de livraison en texte libre à Yaoundé
        const yaoundeDistrictMatch = senderText.match(/(?:(?:[àa]|vers|dans|au|sur)\s+)?\b(bastos|biyem-?assi|odza|omnisports|essos|mendong|simbock|nlongkak|elig-?essono|mokolo|madagascar|tsinga|ngousso|emombo|nkolmesseng|centre-?ville|nsimeyong|mvog-?mbi|mvog-?ada|ahala|dragages|messassi|mimboman|santa\s+barbara|damas|etoudi)\b/i);
        if (!textHandled && yaoundeDistrictMatch && activeCart && activeCart.items.length > 0) {
          const rawDistrictName = yaoundeDistrictMatch[1].trim();
          const cleanDistrict = rawDistrictName.charAt(0).toUpperCase() + rawDistrictName.slice(1);
          activeCart.district = cleanDistrict;
          activeCart = computeCartFromRawItems(
            activeCart.items,
            availableFruits,
            bottle500Base,
            bottle1LBase,
            cleanDistrict,
            activeCart
          );
          if (userDocRef) {
            await saveActiveWhatsAppCart(userDocRef, activeCart);
          }
          const devisExact = generateCartDevisText(activeCart, cleanDistrict);
          currentUserParts.push({
            text: `${senderText}\n\n[SYSTÈME FYS : Le client a indiqué son quartier de livraison : "${cleanDistrict}".
LE SERVEUR FYS A DÉJÀ CALCULÉ LE DEVIS OFFICIEL EXACT :
${devisExact}

CONSIGNE STRICTE ET ABSOLUE :
Affiche exactement ce devis sans modifier aucun montant ni aucun cocktail !
Propose ensuite les boutons :::BUTTONS [{"id": "btn_confirm_order", "title": "Valider commande"}, {"id": "btn_edit_order", "title": "Modifier"}].]`,
          });
          textHandled = true;
        }

        if (!textHandled) {
          const isUnknownRecipeOrUnavailable =
            unavailableFruitsCurrent.length > 0 ||
            (isCatalogRequestInText && (!extractedCatalogOrders || extractedCatalogOrders.length === 0) && !matchCatalogCocktailFromText(senderText, catalogCocktails));

          if (isUnknownRecipeOrUnavailable) {
            const requestedItem = unavailableFruitsCurrent.length > 0
              ? unavailableFruitsCurrent.join(', ')
              : 'recette non répertoriée au catalogue';
            const catalogListText = catalogCocktails && catalogCocktails.length > 0
              ? catalogCocktails.map((c) => `• « ${c.name} » (350ml : 500 XAF)`).join('\n')
              : '• « Ananas Gingembre » (350ml : 500 XAF)\n• « Ananas Papaye » (350ml : 500 XAF)\n• « Papaye Orange » (350ml : 500 XAF)';

            currentUserParts.push({
              text: `${senderText}\n\n[SYSTÈME FYS : Le client a demandé un ingrédient ou une recette NON DISPONIBLE dans notre Lab FYS ou notre catalogue (« ${requestedItem} »).
CONSIGNES STRICTES POUR VOTRE NUTRITIONNISTE DE POCHE :
1. Réponds avec beaucoup de politesse, de chaleur et de clarté.
2. Explique-lui avec bienveillance que cet ingrédient / cette recette n'est pas disponible (ex: le baobab n'est pas en stock au Lab FYS, et « Baobab ananas » n'existe pas dans nos recettes du catalogue).
3. Présente-lui avec clarté nos véritables options disponibles :
   - Nos 3 jus signatures du catalogue FYS prêts à déguster :
${catalogListText}
     (Précise que la commande minimale au catalogue est de 5 bouteilles au total, combinables entre plusieurs jus, soit 2 500 XAF pour les 5 bouteilles).
   - Ou la possibilité de composer un cocktail sur-mesure au Lab avec nos fruits frais en stock (formats 500ml et 1L).
4. S'il a fait une estimation erronée de prix (ex: 1 000f pour du 350ml catalogue au lieu de 500 XAF), rectifie gentiment avec le tarif officiel.
5. S'il a indiqué son quartier (ex: Nkoabang), confirme-lui directement les frais de livraison officiels : Nkoabang est en Zone 3 (2 000 XAF).
6. Demande-lui laquelle de ces options disponibles il préfère, et propose OBLIGATOIREMENT les boutons :::BUTTONS [{"id": "btn_mode_catalog", "title": "Jus du catalogue"}, {"id": "btn_mode_custom", "title": "Composer sur-mesure"}].
7. NE CRÉE AUCUN PANIER NI AUCUN DEVIS DE COMMANDE POUR UNE RECETTE INEXISTANTE (mets "action": "QUESTION" dans :::INTENT avec cocktails: [] et catalogItems: []).]`,
            });
            textHandled = true;
          } else if (extractedCurrent && extractedCurrent.length > 0) {
            currentUserParts.push({
              text: `${senderText}\n\n[SYSTÈME FYS : Le client a sélectionné des fruits pour sa recette : « ${activeRecipeName} ».
RÈGLE STRICTE ÉTAPE 2 : Félicite-le chaleureusement pour cette association de fruits frais.
Demande-lui OBLIGATOIREMENT : "Votre recette sur-mesure est prête ! Souhaitez-vous directement passer à la commande, ou préférez-vous d'abord découvrir la fiche nutritionnelle complète de votre mélange ?"
Propose IMPÉRATIVEMENT les boutons :::BUTTONS [{"id": "btn_order", "title": "Commander"}, {"id": "btn_nutrition", "title": "Fiche nutrition"}].
Ne saute PAS directement au choix du format ou de la livraison sans proposer la fiche nutritionnelle !]`,
            });
          } else {
            currentUserParts.push({ text: senderText });
          }
        }
      }

      const contentsPayload = [
        ...chatHistoryForGemini,
        { role: 'user' as const, parts: currentUserParts },
      ];

      const clientIdentification = customerFirstName
        ? `Client : ${senderName} (Prénom officiel pour les salutations : ${customerFirstName}) · Téléphone : ${senderPhone}`
        : `Client : Téléphone ${senderPhone} (Prénom encore inconnu)`;
      const fullSystemPrompt = `${NUTRIFYS_WHATSAPP_SYSTEM_PROMPT}\n\n${clientIdentification}${userProfileContext}${dynamicPricingContext}${conversationRules}`;

      // Modèles à très haute réactivité (< 1.5s) sans saturation de quota journalier
      const envModel = process.env.GEMINI_WHATSAPP_MODEL;
      const modelQueue = Array.from(new Set([
        'gemini-3.5-flash-lite',
        'gemini-3.1-flash-lite',
        'gemini-flash-lite-latest',
        ...(envModel && envModel !== 'gemini-3-flash-preview' ? [envModel] : []),
        'gemini-3.6-flash',
        'gemini-3-flash-preview',
      ])).filter(Boolean);

      for (const modelCandidate of modelQueue) {
        try {
          const isThinkingSupported = !modelCandidate.includes('lite');
          const genConfig: any = {
            temperature: 0.7,
            maxOutputTokens: 1200,
          };
          if (isThinkingSupported) {
            genConfig.thinkingConfig = { thinkingBudget: 0 };
          }

          const model = genAI.getGenerativeModel({
            model: modelCandidate,
            systemInstruction: fullSystemPrompt,
            generationConfig: genConfig,
          });
          console.log(`[whatsapp-webhook] Calling Gemini (${modelCandidate}) with conversation history & dynamic pricing...`);
          const timeoutMs = modelCandidate.includes('lite') ? 7000 : 15000;
          const result = await Promise.race([
            model.generateContent({ contents: contentsPayload }),
            new Promise<never>((_, reject) => setTimeout(() => reject(new Error(`Model ${modelCandidate} timed out after ${timeoutMs}ms`)), timeoutMs)),
          ]);
          const candidateText = result.response.text();
          if (candidateText && candidateText.trim().length > 0) {
            aiReply = candidateText.trim();
            break;
          }
        } catch (geminiErr: any) {
          console.warn(`[whatsapp-webhook] Gemini (${modelCandidate}) error, trying next fallback:`, geminiErr?.message);
        }
      }

      // 🛡️ GARANTIE DE RÉPONSE 100% : Si aucun modèle IA n'a pu répondre, NutriFYS ne reste JAMAIS muet
      if (!aiReply || aiReply.trim().length === 0) {
        console.warn('[whatsapp-webhook] ⚠️ All Gemini models failed or timed out. Triggering resilient NutriFYS fallback...');
        if (isNewDraftCodeInMessage) {
          aiReply = `Bonjour ${senderName} ! Votre mélange personnalisé FYS est bien reçu. Souhaitez-vous le commander dès maintenant ou découvrir sa composition et ses bienfaits nutritionnels ?`;
          buttonsToSend = [
            { id: 'btn_order', title: 'Commander' },
            { id: 'btn_nutrition', title: 'Fiche nutrition' },
          ];
        } else if (isInteractiveMessage && interactiveButtonId) {
          if (interactiveButtonId.startsWith('btn_order')) {
            aiReply = `Avec plaisir ${senderName} ! Quel format préférez-vous (500ml ou 1 Litre) et dans quel quartier de Yaoundé souhaitez-vous être livré ?`;
            buttonsToSend = [
              { id: 'btn_format_500ml', title: 'Format 500ml' },
              { id: 'btn_format_1l', title: 'Format 1 Litre' },
            ];
          } else if (interactiveButtonId.startsWith('btn_nutrition')) {
            aiReply = `Voici les atouts santé de votre mélange FYS : riche en antioxydants, vitamines naturelles et sans sucre ajouté. Souhaitez-vous passer à la commande ?`;
            buttonsToSend = [
              { id: 'btn_order', title: 'Commander' },
            ];
          } else {
            aiReply = `C'est bien noté ${senderName} ! Je prépare votre commande FYS. Dans quel quartier de Yaoundé souhaitez-vous être livré ?`;
          }
        } else {
          aiReply = `Bonjour ${senderName} ! Je suis ravi de vous retrouver chez FYS. Que puis-je faire pour vous aujourd'hui : une nouvelle commande de cocktail frais ou un conseil nutrition ?`;
          buttonsToSend = [
            { id: 'btn_order', title: 'Commander' },
            { id: 'btn_nutrition', title: 'Fiche nutrition' },
          ];
        }
      }
      console.log('[whatsapp-webhook] NutriFYS generated reply:', aiReply);

      // 0. ROUTEUR SÉMANTIQUE D'INTENTIONS IA (:::INTENT)
      // NutriFYS traduit les expressions naturelles du client en actions système codées en dur
      parsedIntent = null;

      const intentMatch = aiReply.match(/:::INTENT\s*([\s\S]*?)\s*:::?/);
      if (intentMatch) {
        try {
          parsedIntent = parseSafeJson<{
            action?: 'NEW_RECIPE' | 'VALIDATE_RECIPE' | 'ORDER' | 'ORDER_CATALOG' | 'CATALOG' | 'SHOW_NUTRITION' | 'SET_FORMAT' | 'SET_QUANTITY' | 'SET_DISTRICT' | 'CONFIRM_ORDER' | 'ADD_COCKTAIL' | 'RESET' | 'QUESTION';
            cocktails?: Array<{
              cocktailName?: string;
              fruits?: string[];
              bottleSize?: '500ml' | '1L';
              quantity?: number;
              hasAddedSugar?: boolean;
            }>;
            catalogItems?: Array<{
              cocktailName?: string;
              quantity?: number;
              bottleSize?: string;
            }>;
            district?: string;
            quantity?: number;
            format?: '500ml' | '1L';
          }>(intentMatch[1]);

          if (parsedIntent && parsedIntent.action) {
            console.log(`[whatsapp-webhook] 🧠 Semantic Intent parsed from NutriFYS: "${parsedIntent.action}"`, parsedIntent);

            switch (parsedIntent.action) {
              case 'RESET': {
                activeCart = null;
                activeRecipeIngredients = [];
                activeRecipeName = '';
                if (userDocRef) {
                  await userDocRef.set({
                    activeWhatsAppCart: FieldValue.delete(),
                    activeWhatsAppDraft: FieldValue.delete(),
                    pendingCatalogSelection: FieldValue.delete(),
                    selectedMode: FieldValue.delete(),
                  }, { merge: true }).catch(() => null);
                }
                break;
              }

              case 'ORDER_CATALOG': {
                if (Array.isArray(parsedIntent.catalogItems) && parsedIntent.catalogItems.length > 0) {
                  const rawCatalog: any[] = [];
                  for (const ci of parsedIntent.catalogItems) {
                    if (!ci.cocktailName) continue;
                    const matched = matchCatalogCocktailFromText(ci.cocktailName, catalogCocktails);
                    if (matched) {
                      const containers = Array.isArray(matched.containers) && matched.containers.length > 0
                        ? matched.containers
                        : [{ label: '350ml', price: 500 }];
                      const container = containers.find((c: any) => c.label === ci.bottleSize) || containers[0];
                      rawCatalog.push({
                        cocktailName: matched.name,
                        fruits: (matched.ingredients && matched.ingredients.length > 0)
                          ? matched.ingredients.map((i: any) => i.fruitName)
                          : [matched.name],
                        bottleSize: container.label || '350ml',
                        bottleSizeLabel: container.label || '350ml',
                        quantity: Math.max(1, Number(ci.quantity) || 1),
                        hasAddedSugar: false,
                        isCatalog: true,
                        catalogCocktailId: matched.id,
                        imageUrl: matched.imageUrl,
                        unitPrice: Number(container.price) || 500,
                      });
                    }
                  }
                  if (rawCatalog.length > 0) {
                    activeCart = computeCartFromRawItems(
                      rawCatalog,
                      availableFruits,
                      bottle500Base,
                      bottle1LBase,
                      parsedIntent.district || activeCart?.district,
                      activeCart
                    );
                    if (userDocRef) {
                      await saveActiveWhatsAppCart(userDocRef, activeCart);
                    }
                    console.log(`[whatsapp-webhook] 🛒 Synced activeWhatsAppCart from intent ORDER_CATALOG:`, rawCatalog.map((r) => `${r.quantity}x ${r.cocktailName}`));
                  }
                }
                break;
              }

              case 'NEW_RECIPE':
              case 'VALIDATE_RECIPE': {
                if (Array.isArray(parsedIntent.cocktails) && parsedIntent.cocktails.length > 0) {
                  activeCart = computeCartFromRawItems(
                    parsedIntent.cocktails,
                    availableFruits,
                    bottle500Base,
                    bottle1LBase,
                    parsedIntent.district || activeCart?.district,
                    parsedIntent.action === 'NEW_RECIPE' ? undefined : activeCart
                  );
                  activeRecipeName = activeCart.items.map((i) => i.cocktailName).join(' + ');
                  activeRecipeIngredients = activeCart.items.flatMap((i) => i.ingredients);
                  if (userDocRef) {
                    await saveActiveWhatsAppCart(userDocRef, activeCart);
                    await userDocRef.set({
                      activeWhatsAppDraft: {
                        cocktailName: activeRecipeName,
                        ingredients: activeRecipeIngredients,
                        updatedAt: FieldValue.serverTimestamp(),
                      },
                    }, { merge: true }).catch(() => null);
                    console.log(`[whatsapp-webhook] 💾 Synced activeWhatsAppCart from intent ${parsedIntent.action}: ${activeRecipeName}`);
                  }
                }
                break;
              }

              case 'ADD_COCKTAIL': {
                if (Array.isArray(parsedIntent.cocktails) && parsedIntent.cocktails.length > 0) {
                  activeCart = computeCartFromRawItems(
                    parsedIntent.cocktails,
                    availableFruits,
                    bottle500Base,
                    bottle1LBase,
                    parsedIntent.district || activeCart?.district,
                    activeCart
                  );
                  activeRecipeName = activeCart.items.map((i) => i.cocktailName).join(' + ');
                  activeRecipeIngredients = activeCart.items.flatMap((i) => i.ingredients);
                  if (userDocRef) {
                    await saveActiveWhatsAppCart(userDocRef, activeCart);
                  }
                }
                break;
              }

              case 'SET_FORMAT': {
                if (activeCart && activeCart.items.length > 0) {
                  let updatedRaw: any[] = [];
                  if (Array.isArray(parsedIntent.cocktails) && parsedIntent.cocktails.length > 0) {
                    updatedRaw = parsedIntent.cocktails;
                  } else if (parsedIntent.format) {
                    updatedRaw = activeCart.items.map((it) => ({
                      ...it,
                      bottleSize: parsedIntent.format,
                    }));
                  }
                  if (updatedRaw.length > 0) {
                    activeCart = computeCartFromRawItems(
                      updatedRaw,
                      availableFruits,
                      bottle500Base,
                      bottle1LBase,
                      activeCart.district,
                      activeCart
                    );
                    if (userDocRef) {
                      await saveActiveWhatsAppCart(userDocRef, activeCart);
                    }
                  }
                }
                break;
              }

              case 'SET_QUANTITY': {
                if (activeCart && activeCart.items.length > 0) {
                  let updatedRaw: any[] = [];
                  if (Array.isArray(parsedIntent.cocktails) && parsedIntent.cocktails.length > 0) {
                    updatedRaw = parsedIntent.cocktails;
                  } else if (typeof parsedIntent.quantity === 'number' && parsedIntent.quantity > 0) {
                    updatedRaw = activeCart.items.map((it) => ({
                      ...it,
                      quantity: parsedIntent.quantity,
                    }));
                  }
                  if (updatedRaw.length > 0) {
                    activeCart = computeCartFromRawItems(
                      updatedRaw,
                      availableFruits,
                      bottle500Base,
                      bottle1LBase,
                      activeCart.district,
                      activeCart
                    );
                    if (userDocRef) {
                      await saveActiveWhatsAppCart(userDocRef, activeCart);
                    }
                  }
                }
                break;
              }

              case 'SET_DISTRICT': {
                const targetDistrict = parsedIntent.district || (Array.isArray(parsedIntent.cocktails) ? parsedIntent.district : undefined);
                if (targetDistrict && activeCart) {
                  activeCart.district = targetDistrict.trim();
                  activeCart = computeCartFromRawItems(
                    activeCart.items,
                    availableFruits,
                    bottle500Base,
                    bottle1LBase,
                    activeCart.district,
                    activeCart
                  );
                  if (userDocRef) {
                    await saveActiveWhatsAppCart(userDocRef, activeCart);
                  }
                }
                break;
              }

              default:
                break;
            }
          }
        } catch (iErr) {
          console.warn('[whatsapp-webhook] Error parsing :::INTENT:', iErr);
        } finally {
          aiReply = aiReply.replace(/:::INTENT[\s\S]*?:::?/g, '').trim();
        }
      } else {
        aiReply = aiReply.replace(/:::INTENT[\s\S]*?:::?/g, '').trim();
      }

      // 0.1. Traitement automatique du panier multi-boissons WhatsApp (:::CART_ITEMS)
      const cartMatch = aiReply.match(/:::CART_ITEMS\s*([\s\S]*?)\s*:::?/);
      if (cartMatch) {
        try {
          const parsedCartRaw = parseSafeJson<any[]>(cartMatch[1]);
          if (Array.isArray(parsedCartRaw) && parsedCartRaw.length > 0) {
            console.log(`[whatsapp-webhook] 🛒 :::CART_ITEMS detected with ${parsedCartRaw.length} item(s):`, parsedCartRaw);
            activeCart = computeCartFromRawItems(
              parsedCartRaw,
              availableFruits,
              bottle500Base,
              bottle1LBase,
              activeCart?.district,
              activeCart
            );
            if (userDocRef) {
              await saveActiveWhatsAppCart(userDocRef, activeCart);
              console.log(`[whatsapp-webhook] 💾 Persisted activeWhatsAppCart to userDoc: ${activeCart.items.map(i => i.cocktailName).join(', ')} (Total: ${activeCart.totalPrice} XAF)`);
            }
          }
        } catch (cErr) {
          console.warn('[whatsapp-webhook] Error parsing :::CART_ITEMS:', cErr);
        } finally {
          aiReply = aiReply.replace(/:::CART_ITEMS[\s\S]*?:::?/g, '').trim();
        }
      } else {
        aiReply = aiReply.replace(/:::CART_ITEMS[\s\S]*?:::?/g, '').trim();
      }

      // Filet de sécurité anti-amnésie : si aucun panier n'est actif OU si nouvelle composition demandée, et que NutriFYS propose une recette
      const isUnavailableOrCatalogExplanation =
        unavailableFruitsCurrent.length > 0 ||
        (isCatalogRequestInText && (!extractedCatalogOrders || extractedCatalogOrders.length === 0) && !matchCatalogCocktailFromText(senderText, catalogCocktails)) ||
        Boolean(parsedIntent && (parsedIntent.action === 'QUESTION' || parsedIntent.action === 'CATALOG'));

      const autoProposed = (!isUnavailableOrCatalogExplanation)
        ? extractCocktailsFromText(aiReply, availableFruits)
        : null;
      if (autoProposed && autoProposed.length > 0 && autoProposed[0].fruits.length >= 2) {
        if (!resetIntentRegex.test(senderText) && (!activeCart || activeCart.items.length === 0 || isNewRecipeIntent) && (!activeCart?.items?.some((i) => i.isCatalog))) {
          console.log(`[whatsapp-webhook] 🌿 Auto-persisting proposed recipe from AI reply:`, autoProposed);
          if (autoProposed.length === 1 && (!autoProposed[0].cocktailName || autoProposed[0].cocktailName.startsWith('Cocktail Santé'))) {
            autoProposed[0].cocktailName = autoProposed[0].fruits.join(' + ');
          }
          activeCart = computeCartFromRawItems(
            autoProposed,
            availableFruits,
            bottle500Base,
            bottle1LBase,
            activeCart?.district,
            undefined
          );
          activeRecipeName = activeCart.items.map((i) => i.cocktailName).join(' + ');
          activeRecipeIngredients = activeCart.items.flatMap((i) => i.ingredients);
          if (userDocRef) {
            await saveActiveWhatsAppCart(userDocRef, activeCart);
            await userDocRef.set({
              activeWhatsAppDraft: {
                cocktailName: activeRecipeName,
                ingredients: activeRecipeIngredients,
                updatedAt: FieldValue.serverTimestamp(),
              },
            }, { merge: true }).catch(() => null);
            console.log(`[whatsapp-webhook] 💾 Persisted proposed activeWhatsAppCart to userDoc: ${activeRecipeName}`);
          }
        }
      }

      // ── NORMALISATION & SÉCURISATION DU TEXTE AFFICHÉ AU CLIENT ──
      // 1. Frais de livraison : Dynamique selon quartier (départ atelier Nsimeyong)
      const currentCartDistrict = activeCart?.district || '';
      const currentEffectiveFee = getDeliveryZoneForDistrict(currentCartDistrict, activeDeliveryZones).fee;
      if (currentCartDistrict) {
        aiReply = aiReply.replace(
          new RegExp(`(Livraison\\s*(?:à|a)?\\s*${escapeRegexString(currentCartDistrict)}\\s*:\\s*)(?:[0-9\\s]+)\\s*XAF`, 'gi'),
          `$1${currentEffectiveFee.toLocaleString('fr-FR')} XAF`
        );
      }
      aiReply = aiReply.replace(/à partir de 1\s*000\s*XAF/gi, `${currentEffectiveFee.toLocaleString('fr-FR')} XAF`);

      // 2. Vérification et recalcul exact du TOTAL et du DEVIS si un récapitulatif devis est affiché
      if (activeCart && activeCart.items.length > 0) {
        // Remplacement strict de la ligne TOTAL À PAYER par le total officiel FYS
        aiReply = aiReply.replace(/(👉\s*TOTAL\s*(?:À|A)\s*PAYER\s*:\s*)[0-9\s.,]+XAF/gi, `$1${activeCart.totalPrice.toLocaleString('fr-FR')} XAF`);

        // Si l'utilisateur a choisi son quartier ou si le devis est présenté avant confirmation
        const isConfirmingOrder = interactiveButtonId?.startsWith('btn_confirm_order');
        if (!isConfirmingOrder && (interactiveButtonId?.startsWith('loc_') || aiReply.includes('TOTAL À PAYER') || aiReply.includes('Voici le récapitulatif'))) {
          const devisOfficial = generateCartDevisText(activeCart, activeCart.district);
          if (aiReply.includes('Voici le récapitulatif') || aiReply.includes('TOTAL À PAYER')) {
            // Remplacer le récapitulatif incomplet ou erroné de l'IA par le devis officiel complet
            aiReply = aiReply.replace(/(?:Voici\s+le\s+récapitulatif[\s\S]*?(?:valider\s+cette\s+commande\s*\??|convient\s*\??|souhaitez-vous\s+valider\s*\??))/i, devisOfficial);
            if (!aiReply.includes(activeCart.totalPrice.toLocaleString('fr-FR'))) {
              aiReply = devisOfficial;
            }
          }
        }
      } else if (activeRecipeIngredients.length > 0 && aiReply.includes('TOTAL À PAYER')) {
        const is1L = /1\s*(?:litre|l)\b/i.test(aiReply);
        const unitP = is1L ? activePrice1L : activePrice500;
        const qtyMatch = aiReply.match(/•\s*(\d+)\s*bouteille/i);
        const qty = qtyMatch ? parseInt(qtyMatch[1], 10) : 1;
        const correctSubtotal = unitP * qty;
        const districtMatch = aiReply.match(/(?:Livraison\s*(?:à|a)?\s*([a-zA-ZÀ-ÿ0-9\s-]+):)/i);
        const detectedDistrictInReply = districtMatch ? districtMatch[1].trim() : '';
        const singleDeliveryFee = getDeliveryZoneForDistrict(detectedDistrictInReply, activeDeliveryZones).fee;
        const correctTotal = correctSubtotal + singleDeliveryFee;

        aiReply = aiReply.replace(/(👉\s*TOTAL\s*(?:À|A)\s*PAYER\s*:\s*)[0-9\s.,]+XAF/gi, `$1${correctTotal.toLocaleString('fr-FR')} XAF`);
      }

      // 1. Traitement automatique du profil de santé si complété par NutriFYS
      const profileMatch = aiReply.match(/:::PROFILE_JSON\s*([\s\S]*?)\s*:::?/);
      if (profileMatch && db && userDocRef) {
        try {
          const pData = parseSafeJson(profileMatch[1]);
          if (pData) {
            console.log('[whatsapp-webhook] Health profile completed via WhatsApp:', pData);

            const cList = Array.isArray(pData.healthConditions) ? pData.healthConditions : [];
            const aList = Array.isArray(pData.allergies) ? pData.allergies : [];
            const gList = Array.isArray(pData.goals) ? pData.goals : [];

            // Enregistrer dans users/{uid}/profile/main (identique au format du web FYS)
            await userDocRef.collection('profile').doc('main').set({
              userId: userDocRef.id,
              healthConditions: cList,
              allergies: aList,
              goals: gList,
              channel: 'whatsapp',
              updatedAt: FieldValue.serverTimestamp(),
            }, { merge: true });

            // Mettre à jour aussi le document utilisateur
            await userDocRef.set({
              healthConditions: cList,
              allergies: aList,
              goals: gList,
              hasHealthProfile: true,
              updatedAt: FieldValue.serverTimestamp(),
            }, { merge: true });

            console.log(`[whatsapp-webhook] ✅ Health profile successfully saved in profile/main for user ${userDocRef.id}`);
          }
        } catch (profErr) {
          console.error('[whatsapp-webhook] Error saving health profile:', profErr);
        } finally {
          aiReply = aiReply.replace(/:::PROFILE_JSON[\s\S]*?:::?/g, '').trim();
        }
      } else if (profileMatch) {
        aiReply = aiReply.replace(/:::PROFILE_JSON[\s\S]*?:::?/g, '').trim();
      }

      // 1.5. Traitement automatique de la recette personnalisée WhatsApp (:::RECIPE_JSON)
      const recipeMatch = aiReply.match(/:::RECIPE_JSON\s*([\s\S]*?)\s*:::?/);
      if (recipeMatch && userDocRef) {
        try {
          const rData = parseSafeJson(recipeMatch[1]);
          if (rData && Array.isArray(rData.fruits) && rData.fruits.length > 0) {
            const resolvedIngs: any[] = [];
            for (const fn of rData.fruits) {
              const clean = String(fn).trim().toLowerCase();
              const found = availableFruits.find(af => {
                const afClean = af.name.toLowerCase();
                const afId = af.id.toLowerCase();
                return afClean === clean || afId === clean || afClean.includes(clean) || clean.includes(afClean);
              });
              if (found && !resolvedIngs.some(x => x.fruitId === found.id)) {
                resolvedIngs.push({
                  fruitId: found.id,
                  fruitName: found.name,
                  priceSnapshot: found.price,
                  isSupplement: found.isSupplement,
                  incompatibleIds: found.incompatibleIds || [],
                });
              }
            }
            if (resolvedIngs.length > 0) {
              const customWaDraft = {
                cocktailName: rData.cocktailName || 'Cocktail Santé FYS',
                fruits: resolvedIngs.map(i => i.fruitName),
                ingredients: resolvedIngs,
                hasAddedSugar: !!rData.hasAddedSugar,
                updatedAt: Date.now(),
              };
              await userDocRef.set({ activeWhatsAppDraft: customWaDraft }, { merge: true });
              console.log(`[whatsapp-webhook] 🍹 Persisted activeWhatsAppDraft in user doc:`, customWaDraft.cocktailName, customWaDraft.fruits);
            }
          }
        } catch (rErr) {
          console.warn('[whatsapp-webhook] Error saving WhatsApp recipe draft:', rErr);
        } finally {
          aiReply = aiReply.replace(/:::RECIPE_JSON[\s\S]*?:::?/g, '').trim();
        }
      } else if (recipeMatch) {
        aiReply = aiReply.replace(/:::RECIPE_JSON[\s\S]*?:::?/g, '').trim();
      }

      // 1.6. Synchronisation déterministe du panier à partir des cocktails interprétés par NutriFYS (:::CART_ITEMS)
      const cartItemsMatch = aiReply.match(/:::CART_ITEMS\s*([\s\S]*?)\s*:::?/);
      if (cartItemsMatch && userDocRef) {
        try {
          const rawCartItems = parseSafeJson(cartItemsMatch[1]);
          if (Array.isArray(rawCartItems) && rawCartItems.length > 0) {
            activeCart = computeCartFromRawItems(
              rawCartItems,
              availableFruits,
              bottle500Base,
              bottle1LBase,
              activeCart?.district,
              activeCart
            );
            await saveActiveWhatsAppCart(userDocRef, activeCart);
            console.log(`[whatsapp-webhook] 🛒 Synchronized activeWhatsAppCart from Gemini :::CART_ITEMS with ${activeCart.items.length} item(s)`);
          }
        } catch (cErr) {
          console.warn('[whatsapp-webhook] Error saving WhatsApp cart items from Gemini:', cErr);
        } finally {
          aiReply = aiReply.replace(/:::CART_ITEMS[\s\S]*?:::?/g, '').trim();
        }
      } else if (cartItemsMatch) {
        aiReply = aiReply.replace(/:::CART_ITEMS[\s\S]*?:::?/g, '').trim();
      }

      // 2. Traitement automatique d'une commande validée par le client
      let createdOrderInfo: {
        orderId: string;
        orderDoc: any;
        ingredients: any[];
      } | null = null;

      const orderMatch = aiReply.match(/:::ORDER_JSON\s*([\s\S]*?)\s*:::?/);
      const isConfirmedViaButton = isInteractiveMessage && interactiveButtonId === 'btn_confirm_order';

      if ((orderMatch || (isConfirmedViaButton && activeCart && activeCart.items.length > 0)) && db) {
        try {
          const orderData = orderMatch ? (parseSafeJson(orderMatch[1]) || {}) : {};
          console.log('[whatsapp-webhook] Order detected or confirmed from WhatsApp:', { hasOrderMatch: Boolean(orderMatch), isConfirmedViaButton, activeCartItems: activeCart?.items?.length || 0 });

          // DÉDUPLICATION 2 (PROTECTION STRICTE CONTRE LES DOUBLONS D'ENREGISTREMENT) :
          // Vérifier si une commande WhatsApp a déjà été enregistrée pour ce client il y a moins de 120 secondes
          const safePhoneVariants = phoneVariants.length > 0 ? phoneVariants.slice(0, 30) : [senderPhone];
          const recentOrdersSnap = await db.collection('orders')
            .where('userPhoneSnapshot', 'in', safePhoneVariants)
            .limit(5)
            .get();

          const isDuplicateOrder = recentOrdersSnap.docs.some((doc: any) => {
            const d = doc.data();
            if (d.source !== 'whatsapp') return false;
            if (messageId && d.whatsappMessageId === messageId) return true;
            const createdAtMs = d.createdAt?.toMillis
              ? d.createdAt.toMillis()
              : (d.createdAt?._seconds ? d.createdAt._seconds * 1000 : 0);
            return Date.now() - createdAtMs < 120 * 1000;
          });

          if (isDuplicateOrder) {
            console.warn(`[whatsapp-webhook] ⚠️ Duplicate order blocked for ${senderPhone}: an order was already registered in the last 120 seconds.`);
          } else if (activeCart && activeCart.items.length > 0) {
            // ── CRÉATION MULTI-ARTICLES À PARTIR DU PANIER CALCULÉ PAR LE SERVEUR FYS ──
            const labViolations: string[] = [];

            // Validation des quotas et des incompatibilités pour chaque boisson du panier
            for (const item of activeCart.items) {
              const mainFruits = item.ingredients.filter((i: any) => !i.isSupplement);
              const supps = item.ingredients.filter((i: any) => !!i.isSupplement);
              if (mainFruits.length > maxMainFruits) {
                labViolations.push(`Trop de fruits principaux dans « ${item.cocktailName} » (${mainFruits.length}/${maxMainFruits} max).`);
              }
              if (supps.length > maxSupplements) {
                labViolations.push(`Trop de compléments dans « ${item.cocktailName} » (${supps.length}/${maxSupplements} max).`);
              }

              for (let i = 0; i < item.ingredients.length; i++) {
                for (let j = i + 1; j < item.ingredients.length; j++) {
                  const ingA = item.ingredients[i];
                  const ingB = item.ingredients[j];
                  const fruitA = availableFruits.find((f: any) => f.id.toLowerCase() === ingA.fruitId.toLowerCase() || f.name.toLowerCase() === ingA.fruitName.toLowerCase());
                  const fruitB = availableFruits.find((f: any) => f.id.toLowerCase() === ingB.fruitId.toLowerCase() || f.name.toLowerCase() === ingB.fruitName.toLowerCase());
                  const aIncompatibleWithB = (fruitA?.incompatibleIds || []).some((id: string) => id.toLowerCase() === (fruitB?.id || '').toLowerCase());
                  const bIncompatibleWithA = (fruitB?.incompatibleIds || []).some((id: string) => id.toLowerCase() === (fruitA?.id || '').toLowerCase());
                  if (aIncompatibleWithB || bIncompatibleWithA) {
                    labViolations.push(`Incompatibilité dans « ${item.cocktailName} » : ${ingA.fruitName} et ${ingB.fruitName} ne peuvent pas être associés.`);
                  }
                }
              }
            }

            if (labViolations.length > 0) {
              console.warn(`[whatsapp-webhook] ⚠️ Order health advisory notes (non-blocking):`, labViolations);
            }

            // RÈGLE COMMERCIALE STRICTE ET INFAILLIBLE FYS :
            // Pour tout jus du catalogue, la commande requiert MINIMUM 5 bouteilles au TOTAL !
            const totalCatalogQty = activeCart.items.filter((it) => it.isCatalog).reduce((s, it) => s + it.quantity, 0);
            const isCatalogOrder = activeCart.items.some((it) => it.isCatalog);
            if (isCatalogOrder && totalCatalogQty < 5) {
              const missing = 5 - totalCatalogQty;
              console.warn(`[whatsapp-webhook] ⚠️ Order blocked: total catalog quantity (${totalCatalogQty}) is under 5 for ${senderPhone}.`);
              const warningText = `Impossible de valider la commande : votre panier contient actuellement ${totalCatalogQty} bouteille(s) de jus du catalogue. La commande minimale est de 5 bouteilles au total (il vous en manque encore ${missing}).\n\nVous pouvez combiner d'autres recettes du catalogue ou compléter vos quantités :`;
              await sendWhatsAppInteractiveButtons(
                senderPhone,
                warningText,
                [
                  { id: 'btn_mode_catalog', title: 'Choisir un jus' },
                  { id: 'btn_complete_min', title: `Compléter (+${missing})` },
                ],
                'FYS · Jus du catalogue',
                `Minimum : 5 bouteilles (actuel: ${totalCatalogQty})`
              );
              if (userDocRef) {
                await userDocRef.collection('whatsapp_messages').add({
                  sender: 'nutrifys',
                  text: warningText,
                  timestamp: FieldValue.serverTimestamp(),
                }).catch(() => null);
              }
              return res.status(200).json({ status: 'ok', handled: 'catalog_order_blocked_under_5' });
            }

            const isWebDraft = Boolean(webDraft);
            const orderLines = activeCart.items.map((it) => ({
              cocktailName: it.cocktailName,
              fruits: it.fruits,
              ingredients: it.ingredients,
              bottleSize: it.bottleSize,
              bottleSizeLabel: it.bottleSizeLabel,
              quantity: it.quantity,
              bottleBasePriceSnapshot: it.baseBottlePrice,
              pricePerBottle: it.unitPrice,
              lineTotal: it.lineTotal,
              isCatalog: Boolean(it.isCatalog),
              catalogCocktailId: it.catalogCocktailId || null,
            }));

            const totalQuantity = activeCart.items.reduce((s, it) => s + it.quantity, 0);
            const allIngredients = activeCart.items.flatMap((it) => it.ingredients);
            const combinedCocktailName = activeCart.items.map((it) => it.cocktailName).join(' + ');

            const orderRef = db.collection('orders').doc();
            const newOrderDoc = {
              id: orderRef.id,
              orderCode: webDraftCode || null,
              type: isCatalogOrder ? 'catalog' : 'classic',
              source: 'whatsapp',
              whatsappMessageId: messageId || null,
              status: 'pending',
              userId: userDocRef?.id || 'whatsapp_customer',
              userNameSnapshot: (isWebDraft && webDraft.customerName?.trim()) || senderName,
              userPhoneSnapshot: senderPhone,
              userEmailSnapshot: matchedUserEmail || (isWebDraft && webDraft.customerEmail) || '',
              cocktailId: (isWebDraft && webDraft.cocktail?.id) || (isCatalogOrder ? (activeCart.items[0]?.catalogCocktailId || 'catalog') : 'whatsapp-custom'),
              cocktailNameSnapshot: combinedCocktailName,
              cocktailIngredientsSnapshot: allIngredients,
              hasAddedSugar: activeCart.items.some((i) => i.hasAddedSugar),
              quantity: totalQuantity,
              bottleSize: activeCart.items[0]?.bottleSize || (isCatalogOrder ? '350ml' : '1L'),
              bottleSizeLabel: activeCart.items.map((i) => `${i.quantity}x ${i.bottleSizeLabel}`).join(', '),
              bottleBasePriceSnapshot: activeCart.items[0]?.baseBottlePrice || (isCatalogOrder ? 0 : bottle1LBase),
              cocktailPriceSnapshot: activeCart.items[0]?.unitPrice || activeCart.subtotal,
              orderLines,
              subtotal: activeCart.subtotal,
              deliveryFee: activeCart.deliveryFee,
              totalPrice: activeCart.totalPrice,
                deliveryDetails: {
                  district: activeCart.district || (orderData && orderData.district) || 'Yaoundé',
                  phone: senderPhone,
                  instructions: (orderData && orderData.instructions) || 'Commande directe WhatsApp',
                },
                ...(isWebDraft && webDraft.aiAnalysis ? { aiAnalysisSnapshot: webDraft.aiAnalysis } : {}),
                createdAt: FieldValue.serverTimestamp(),
                updatedAt: FieldValue.serverTimestamp(),
              };

              await orderRef.set(newOrderDoc);
              console.log(`[whatsapp-webhook] ✅ Created Multi-Item WhatsApp Order ${orderRef.id} for ${senderName} (Total: ${activeCart.totalPrice} XAF)`);

              createdOrderInfo = {
                orderId: orderRef.id,
                orderDoc: newOrderDoc,
                ingredients: allIngredients,
              };

              // Marquer le brouillon web comme converti dans whatsapp_drafts et nettoyer activeDraftCode
              if (webDraftCode) {
                await db.collection('whatsapp_drafts').doc(webDraftCode).update({
                  status: 'converted',
                  orderId: orderRef.id,
                  convertedAt: FieldValue.serverTimestamp(),
                }).catch((e: any) => console.warn('[whatsapp-webhook] Could not mark draft as converted:', e));

                if (userDocRef) {
                  await userDocRef.set({ activeDraftCode: FieldValue.delete() }, { merge: true }).catch(() => null);
                }
              }

              // Nettoyer activeWhatsAppCart, activeWhatsAppDraft, selectedMode et pendingCatalogSelection dans Firestore
              if (userDocRef) {
                await userDocRef.set({
                  activeWhatsAppCart: FieldValue.delete(),
                  activeWhatsAppDraft: FieldValue.delete(),
                  pendingCatalogSelection: FieldValue.delete(),
                  selectedMode: FieldValue.delete(),
                }, { merge: true }).catch(() => null);
              }

              // Notifications Administrateurs (In-App + FCM Web Push)
              try {
                const adminsSnap = await db.collection('users').where('role', '==', 'admin').get();
                if (!adminsSnap.empty) {
                  const notifTitle = 'Nouvelle commande WhatsApp !';
                  const notifMessage = `${senderName} a commandé ${totalQuantity} bouteille(s) (${combinedCocktailName}) pour ${newOrderDoc.deliveryDetails.district} (${activeCart.totalPrice.toLocaleString()} XAF).`;
                  const notifLink = `/board/orders?order=${orderRef.id}`;

                  const batch = db.batch();
                  adminsSnap.docs.forEach((aDoc: any) => {
                    const notifRef = db.collection('notifications').doc();
                    batch.set(notifRef, {
                      id: notifRef.id,
                      userId: aDoc.id,
                      title: notifTitle,
                      message: notifMessage,
                      link: notifLink,
                      isRead: false,
                      createdAt: FieldValue.serverTimestamp(),
                    });
                  });
                  await batch.commit().catch((e: any) => console.warn('[whatsapp-webhook] In-app notification batch error:', e));

                  const adminUids = adminsSnap.docs.map((d: any) => d.id);
                  const tokensSnap = await db.collection('fcm_tokens').where('uid', 'in', adminUids.slice(0, 30)).get();
                  if (!tokensSnap.empty) {
                    const tokens = tokensSnap.docs.map((d: any) => d.data()?.token).filter(Boolean);
                    if (tokens.length > 0) {
                      const messaging = getAdminMessaging();
                      if (messaging) {
                        await messaging.sendEachForMulticast({
                          tokens,
                          notification: {
                            title: notifTitle,
                            body: notifMessage,
                          },
                          data: {
                            url: notifLink,
                            tag: `order-new-${orderRef.id}`,
                          },
                        }).catch((e: any) => console.warn('[whatsapp-webhook] FCM multicast error:', e));
                      }
                    }
                  }
                }
              } catch (adminNotifErr) {
                console.warn('[whatsapp-webhook] Warning during admin notification dispatch:', adminNotifErr);
              }
          } else {
            // Création mono-article classique (fallback si panier non initialisé)
            const isWebDraft = Boolean(webDraft);
            const bottleSize: '500ml' | '1L' = orderData.bottleSize === '1L' ? '1L' : '500ml';
            const bottleSizeLabel = bottleSize === '1L' ? '1 L' : '500 ml';
            const baseBottlePrice = bottleSize === '1L' ? bottle1LBase : bottle500Base;
              const quantity = Math.max(1, Number(orderData.quantity) || 1);

              // 1. Ingrédients et Nom du Cocktail :
              // Si commande initiée depuis le site FYS (brouillon web), priorité ABSOLUE aux ingrédients et au nom réels du brouillon
              let finalIngredients: any[] = [];
              let finalCocktailName = 'Cocktail Santé FYS';

              if (isWebDraft && Array.isArray(webDraft.cocktail?.ingredients) && webDraft.cocktail.ingredients.length > 0) {
                finalCocktailName = webDraft.cocktail?.name || 'Cocktail Personnalisé FYS';
                finalIngredients = webDraft.cocktail.ingredients.map((ing: any) => {
                  const snapPrice = Number(ing.priceSnapshot);
                  const foundInStock = availableFruits.find(f => f.id.toLowerCase() === (ing.fruitId || ing.id || '').toLowerCase() || f.name.toLowerCase() === (ing.fruitName || ing.name || '').toLowerCase());
                  return {
                    fruitId: ing.fruitId || ing.id || foundInStock?.id || 'fruit',
                    fruitName: ing.fruitName || ing.name || foundInStock?.name || 'Fruit',
                    quantityGrams: Number(ing.quantityGrams) || 100,
                    priceSnapshot: snapPrice > 0 ? snapPrice : (foundInStock?.price || 0),
                    role: ing.role || 'fruit',
                  };
                });
              } else if (existingUserDoc?.data()?.activeWhatsAppDraft && Array.isArray(existingUserDoc.data().activeWhatsAppDraft.ingredients) && existingUserDoc.data().activeWhatsAppDraft.ingredients.length > 0) {
                // Priorité 2 : Recette personnalisée WhatsApp mémorisée dans le profil utilisateur
                const waDraft = existingUserDoc.data().activeWhatsAppDraft;
                finalCocktailName = waDraft.cocktailName || orderData.cocktailName || 'Cocktail Santé WhatsApp';
                finalIngredients = waDraft.ingredients.map((ing: any) => {
                  const snapPrice = Number(ing.priceSnapshot);
                  const foundInStock = availableFruits.find(f => f.id.toLowerCase() === (ing.fruitId || ing.id || '').toLowerCase() || f.name.toLowerCase() === (ing.fruitName || ing.name || '').toLowerCase());
                  return {
                    fruitId: ing.fruitId || ing.id || foundInStock?.id || 'fruit',
                    fruitName: ing.fruitName || ing.name || foundInStock?.name || 'Fruit',
                    quantityGrams: 100,
                    priceSnapshot: snapPrice > 0 ? snapPrice : (foundInStock?.price || 0),
                    role: (foundInStock?.isSupplement ?? ing.isSupplement) ? ('supplement' as const) : ('fruit' as const),
                    isSupplement: foundInStock?.isSupplement ?? ing.isSupplement,
                    incompatibleIds: foundInStock?.incompatibleIds || [],
                  };
                });
              } else if (activeRecipeIngredients.length > 0) {
                finalCocktailName = activeRecipeName || orderData.cocktailName || 'Cocktail Sur-Mesure WhatsApp';
                finalIngredients = activeRecipeIngredients.map((ing) => ({
                  fruitId: ing.fruitId,
                  fruitName: ing.fruitName,
                  quantityGrams: 100,
                  priceSnapshot: ing.priceSnapshot,
                  role: ing.isSupplement ? ('supplement' as const) : ('fruit' as const),
                  isSupplement: ing.isSupplement,
                  incompatibleIds: ing.incompatibleIds || [],
                }));
              } else {
                // Création personnalisée sur WhatsApp : stricte restriction aux fruits disponibles en stock
                finalCocktailName = orderData.cocktailName || 'Cocktail Santé WhatsApp';
                const chosenFruitNames: string[] = Array.isArray(orderData.fruits) ? orderData.fruits : [];
                finalIngredients = [];
                for (const fName of chosenFruitNames) {
                  const clean = String(fName).trim().toLowerCase();
                  const found = availableFruits.find((af) => {
                    const afClean = af.name.toLowerCase();
                    const afId = af.id.toLowerCase();
                    return afClean === clean || afId === clean || afClean.includes(clean) || clean.includes(afClean);
                  });
                  if (found && !finalIngredients.some(i => i.fruitId === found.id)) {
                    finalIngredients.push({
                      fruitId: found.id,
                      fruitName: found.name,
                      quantityGrams: 100,
                      priceSnapshot: found.price,
                      role: 'fruit' as const,
                    });
                  }
                }
                if (finalIngredients.length === 0) {
                  const defaultFruit = availableFruits.find(f => f.name.toLowerCase().includes('ananas')) || availableFruits[0];
                  if (defaultFruit) {
                    finalIngredients.push({
                      fruitId: defaultFruit.id,
                      fruitName: defaultFruit.name,
                      quantityGrams: 100,
                      priceSnapshot: defaultFruit.price,
                      role: 'fruit' as const,
                    });
                  }
                }
              }

              // ── GARDE-FOU DÉTERMINISTE STRICT : RÈGLES DU FYS LAB ──
              // 1. Quotas : Max fruits principaux et Max compléments
              // 2. Incompatibilités : Vérification stricte des incompatibilités nutritionnelles
              const labViolations: string[] = [];

              const mainFruitsList = finalIngredients.filter((i: any) => !i.isSupplement);
              const supplementsList = finalIngredients.filter((i: any) => !!i.isSupplement);

              if (mainFruitsList.length > maxMainFruits) {
                labViolations.push(`Trop de fruits principaux (${mainFruitsList.length}/${maxMainFruits} autorisés). Au Lab FYS, nous limitons à ${maxMainFruits} fruits de base pour garantir l'onctuosité et la digestibilité.`);
              }
              if (supplementsList.length > maxSupplements) {
                labViolations.push(`Trop de compléments / super-aliments (${supplementsList.length}/${maxSupplements} autorisés). Au Lab FYS, nous limitons à ${maxSupplements} compléments pour une biodisponibilité optimale.`);
              }

              // Vérification des paires incompatibles
              for (let i = 0; i < finalIngredients.length; i++) {
                for (let j = i + 1; j < finalIngredients.length; j++) {
                  const ingA = finalIngredients[i];
                  const ingB = finalIngredients[j];

                  const fruitA = availableFruits.find((f: any) => f.id.toLowerCase() === ingA.fruitId.toLowerCase() || f.name.toLowerCase() === ingA.fruitName.toLowerCase());
                  const fruitB = availableFruits.find((f: any) => f.id.toLowerCase() === ingB.fruitId.toLowerCase() || f.name.toLowerCase() === ingB.fruitName.toLowerCase());

                  const aIncompatibleWithB = (fruitA?.incompatibleIds || []).some((id: string) => id.toLowerCase() === (fruitB?.id || '').toLowerCase());
                  const bIncompatibleWithA = (fruitB?.incompatibleIds || []).some((id: string) => id.toLowerCase() === (fruitA?.id || '').toLowerCase());

                  if (aIncompatibleWithB || bIncompatibleWithA) {
                    labViolations.push(`Incompatibilité nutritionnelle : ${ingA.fruitName} et ${ingB.fruitName} ne peuvent pas être associés dans un même jus.`);
                  }
                }
              }

              if (labViolations.length > 0) {
                console.warn(`[whatsapp-webhook] ⚠️ Order health advisory notes (non-blocking):`, labViolations);
              }
                // 2. VRAIE FORMULE OFFICIELLE STRICTE EXIGÉE PAR FYS :
                // Prix unitaire = Prix de base contenant (Firestore) + Somme des fruits et compléments (Firestore)
                // Règle pur fruit unique : si un seul fruit principal, son prix est multiplié par 2
                const mainFruits = finalIngredients.filter((i: any) => !i.isSupplement && i.role !== 'supplement');
                const isSingleFruit = mainFruits.length === 1;
                const ingredientsPriceSum = finalIngredients.reduce((sum: number, ing: any) => {
                  const isMain = !ing.isSupplement && ing.role !== 'supplement';
                  const multiplier = (isSingleFruit && isMain) ? 2 : 1;
                  return sum + ((Number(ing.priceSnapshot) || 0) * multiplier);
                }, 0);
                const pricePerBottle = baseBottlePrice + ingredientsPriceSum;

                const lineTotal = pricePerBottle * quantity;

                // Frais de livraison : Dynamique selon quartier (départ atelier Nsimeyong)
                const chosenDistrict = (orderData && orderData.district) || 'Yaoundé';
                const finalDeliveryFee = getDeliveryZoneForDistrict(chosenDistrict, activeDeliveryZones).fee;

                // Total à payer : Sous-total + Livraison
                const totalPrice = lineTotal + finalDeliveryFee;

                const orderRef = db.collection('orders').doc();
                const newOrderDoc = {
                  id: orderRef.id,
                  orderCode: webDraftCode || null,
                  type: 'classic',
                  source: 'whatsapp',
                  whatsappMessageId: messageId || null,
                  status: 'pending',
                  userId: userDocRef?.id || 'whatsapp_customer',
                  userNameSnapshot: (isWebDraft && webDraft.customerName?.trim()) || senderName,
                  userPhoneSnapshot: senderPhone,
                  userEmailSnapshot: matchedUserEmail || (isWebDraft && webDraft.customerEmail) || '',
                  cocktailId: (isWebDraft && webDraft.cocktail?.id) || 'whatsapp-custom',
                  cocktailNameSnapshot: finalCocktailName,
                  cocktailIngredientsSnapshot: finalIngredients,
                  hasAddedSugar: isWebDraft ? (webDraft.hasAddedSugar ?? false) : (orderData.hasAddedSugar !== undefined ? !!orderData.hasAddedSugar : false),
                  quantity,
                  bottleSize,
                  bottleSizeLabel,
                  bottleBasePriceSnapshot: baseBottlePrice,
                  cocktailPriceSnapshot: pricePerBottle,
                  orderLines: [
                    {
                      bottleSize,
                      bottleSizeLabel,
                      quantity,
                      bottleBasePriceSnapshot: baseBottlePrice,
                      pricePerBottle,
                      lineTotal,
                    },
                  ],
                  subtotal: lineTotal,
                  deliveryFee: finalDeliveryFee,
                  totalPrice,
                  deliveryDetails: {
                    district: chosenDistrict,
                    phone: senderPhone,
                    instructions: orderData.instructions || 'Commande directe WhatsApp',
                  },
                  ...(isWebDraft && webDraft.aiAnalysis ? { aiAnalysisSnapshot: webDraft.aiAnalysis } : {}),
                  createdAt: FieldValue.serverTimestamp(),
                  updatedAt: FieldValue.serverTimestamp(),
                };

                await orderRef.set(newOrderDoc);
                console.log(`[whatsapp-webhook] ✅ Created WhatsApp Order ${orderRef.id} for ${senderName} (Total: ${totalPrice} XAF)`);

                createdOrderInfo = {
                  orderId: orderRef.id,
                  orderDoc: newOrderDoc,
                  ingredients: finalIngredients,
                };

                // Marquer le brouillon web comme converti dans whatsapp_drafts et nettoyer activeDraftCode
                if (webDraftCode) {
                  await db.collection('whatsapp_drafts').doc(webDraftCode).update({
                    status: 'converted',
                    orderId: orderRef.id,
                    convertedAt: FieldValue.serverTimestamp(),
                  }).catch((e: any) => console.warn('[whatsapp-webhook] Could not mark draft as converted:', e));

                  if (userDocRef) {
                    await userDocRef.set({ activeDraftCode: FieldValue.delete() }, { merge: true }).catch((e: any) => console.warn('[whatsapp-webhook] Could not clear activeDraftCode:', e));
                  }
                  if (allPhoneUserDocs && allPhoneUserDocs.length > 0) {
                    for (const pDoc of allPhoneUserDocs) {
                      await pDoc.ref.set({ activeDraftCode: FieldValue.delete() }, { merge: true }).catch(() => null);
                    }
                  }
                }

                // Nettoyer la recette personnalisée activeWhatsAppDraft, activeWhatsAppCart, selectedMode et pendingCatalogSelection une fois la commande validée
                if (userDocRef) {
                  await userDocRef.set({
                    activeWhatsAppDraft: FieldValue.delete(),
                    activeWhatsAppCart: FieldValue.delete(),
                    pendingCatalogSelection: FieldValue.delete(),
                    selectedMode: FieldValue.delete(),
                  }, { merge: true }).catch(() => null);
                }
                if (allPhoneUserDocs && allPhoneUserDocs.length > 0) {
                  for (const pDoc of allPhoneUserDocs) {
                    await pDoc.ref.set({
                      activeWhatsAppDraft: FieldValue.delete(),
                      activeWhatsAppCart: FieldValue.delete(),
                      pendingCatalogSelection: FieldValue.delete(),
                      selectedMode: FieldValue.delete(),
                    }, { merge: true }).catch(() => null);
                  }
                }

                // ── Notifications Administrateurs (In-App + FCM Web Push) ──
                try {
                  const adminsSnap = await db.collection('users').where('role', '==', 'admin').get();
                  if (!adminsSnap.empty) {
                    const notifTitle = 'Nouvelle commande WhatsApp !';
                    const notifMessage = `${senderName} a commandé ${quantity}× ${bottleSize} (${newOrderDoc.cocktailNameSnapshot}) pour ${orderData.district || 'Yaoundé'} (${totalPrice.toLocaleString()} XAF).`;
                    const notifLink = `/board/orders?order=${orderRef.id}`;

                    // 1. Notification in-app dans la collection "notifications" pour chaque admin
                    const batch = db.batch();
                    adminsSnap.docs.forEach((aDoc: any) => {
                      const notifRef = db.collection('notifications').doc();
                      batch.set(notifRef, {
                        id: notifRef.id,
                        userId: aDoc.id,
                        title: notifTitle,
                        message: notifMessage,
                        link: notifLink,
                        isRead: false,
                        createdAt: FieldValue.serverTimestamp(),
                      });
                    });
                    await batch.commit().catch((e: any) => console.warn('[whatsapp-webhook] In-app notification batch error:', e));

                    // 2. Notification push FCM vers les navigateurs/smartphones des admins connectés
                    const adminUids = adminsSnap.docs.map((d: any) => d.id);
                    const tokensSnap = await db.collection('fcm_tokens').where('uid', 'in', adminUids.slice(0, 30)).get();
                    if (!tokensSnap.empty) {
                      const tokens = tokensSnap.docs.map((d: any) => d.data()?.token).filter(Boolean);
                      if (tokens.length > 0) {
                        const messaging = getAdminMessaging();
                        if (messaging) {
                          await messaging.sendEachForMulticast({
                            tokens,
                            notification: {
                              title: notifTitle,
                              body: notifMessage,
                            },
                            data: {
                              url: notifLink,
                              tag: `order-new-${orderRef.id}`,
                            },
                          }).catch((e: any) => console.warn('[whatsapp-webhook] FCM multicast error:', e));
                        }
                      }
                    }
                  }
                } catch (adminNotifErr) {
                  console.warn('[whatsapp-webhook] Warning during admin notification dispatch:', adminNotifErr);
                }
            }
        } catch (orderErr) {
          console.error('[whatsapp-webhook] Error creating WhatsApp order in Firestore:', orderErr);
        } finally {
          // Nettoyer le bloc technique avant envoi au client
          aiReply = aiReply.replace(/:::ORDER_JSON[\s\S]*?:::?/g, '').trim();

          // Nettoyer tout lien URL brut dans la réponse pour ne jamais afficher de lien long
          aiReply = aiReply.replace(/https?:\/\/fys-app\.com[^\s]*/g, '').replace(/👉\s*$/gm, '').trim();

          // 3. Garantir qu'un message unique, propre et sans doublon est envoyé pour la confirmation de commande
          if (createdOrderInfo) {
            const o = createdOrderInfo.orderDoc;
            const targetDistrict = o.deliveryDetails?.district || activeCart?.district || 'Yaoundé';
            const greetingName = customerFirstName ? ` ${customerFirstName}` : '';
            const intro = `C'est parfaitement noté${greetingName} ! Votre commande est validée et part immédiatement en préparation dans notre Lab à Yaoundé.`;

            const lines: string[] = ['Récapitulatif officiel de votre commande :'];

            if (o.isMultiItem && Array.isArray(o.items) && o.items.length > 0) {
              o.items.forEach((item: any) => {
                const fruitsList = Array.isArray(item.fruits) && item.fruits.length > 0 ? item.fruits.join(', ') : item.cocktailName;
                const typeLabel = item.isCatalog ? 'Jus signature du catalogue' : 'Cocktail sur-mesure Lab';
                lines.push(`• ${typeLabel} : ${item.cocktailName} (${fruitsList})`);
                lines.push(`• Format : ${item.quantity}x ${item.bottleSizeLabel || item.bottleSize || '500ml'} (${(item.unitPrice || 0).toLocaleString('fr-FR')} XAF la bouteille)`);
              });
              lines.push(`• Livraison à ${targetDistrict} : ${(o.deliveryFee || 1000).toLocaleString('fr-FR')} XAF`);
              lines.push(`Total à payer : ${(o.totalPrice || 0).toLocaleString('fr-FR')} XAF (Paiement Mobile Money ou à la livraison)`);
            } else if (activeCart && activeCart.items && activeCart.items.length > 0) {
              activeCart.items.forEach((item) => {
                const fruitsList = (item.fruits && item.fruits.length > 0) ? item.fruits.join(', ') : item.cocktailName;
                const typeLabel = item.isCatalog ? 'Jus signature du catalogue' : 'Cocktail sur-mesure Lab';
                lines.push(`• ${typeLabel} : ${item.cocktailName} (${fruitsList})`);
                lines.push(`• Format : ${item.quantity}x ${item.bottleSizeLabel} (${item.unitPrice.toLocaleString('fr-FR')} XAF la bouteille)`);
              });
              lines.push(`• Livraison à ${targetDistrict} : ${(activeCart.deliveryFee || 1000).toLocaleString('fr-FR')} XAF`);
              lines.push(`Total à payer : ${(activeCart.totalPrice || 0).toLocaleString('fr-FR')} XAF (Paiement Mobile Money ou à la livraison)`);
            } else {
              const ingNames = createdOrderInfo.ingredients && createdOrderInfo.ingredients.length > 0
                ? createdOrderInfo.ingredients.map((i: any) => i.fruitName || i.name).filter(Boolean).join(', ')
                : (o.cocktailNameSnapshot || 'Cocktail Santé FYS');
              lines.push(`• Cocktail sur-mesure Lab : ${o.cocktailNameSnapshot || 'Cocktail Santé FYS'} (${ingNames})`);
              lines.push(`• Format : ${o.quantity || 1}x ${o.bottleSizeLabel || 'Format 500ml'} (${(o.cocktailPriceSnapshot || 0).toLocaleString('fr-FR')} XAF la bouteille)`);
              lines.push(`• Livraison à ${targetDistrict} : 1 000 XAF`);
              lines.push(`Total à payer : ${(o.totalPrice || 0).toLocaleString('fr-FR')} XAF (Paiement Mobile Money ou à la livraison)`);
            }

            if (isDelivery24hActive) {
              lines.push('');
              lines.push('⚠️ VEUILLEZ NOTER QUE LA LIVRAISON S\'EFFECTUE APRÈS 24H.');
            }

            lines.push('');
            lines.push('Une question ou pour le suivi de votre livraison ? Notre équipe est à votre écoute :');
            lines.push(FYS_TEAM_CONTACTS_TEXT);

            // Message unique, clair, sans doublon de récapitulatif ni de contacts
            aiReply = `${intro}\n\n${lines.join('\n')}`;
          }
        }
      } else if (orderMatch) {
        aiReply = aiReply.replace(/:::ORDER_JSON[\s\S]*?:::?/g, '').trim();
      }

      // ── Extraction et détection des boutons CTA URL (Lien cliquable natif Meta) ──
      let ctaUrlToSend: WhatsAppCtaUrlData | null = null;
      const ctaMatch = aiReply.match(/:::CTA_URL\s*([\s\S]*?):::/);
      if (ctaMatch) {
        try {
          const parsed = JSON.parse(ctaMatch[1].trim());
          if (parsed && parsed.url) {
            ctaUrlToSend = {
              displayText: (parsed.displayText || parsed.title || 'Tableau de bord').slice(0, 20),
              url: parsed.url,
              headerText: parsed.headerText || 'NutriFYS · FYS',
              footerText: parsed.footerText || 'NutriFYS · Votre nutritionniste de poche',
            };
          }
        } catch (cErr) {
          console.warn('[whatsapp-webhook] Failed to parse :::CTA_URL JSON:', cErr);
        }
        aiReply = aiReply.replace(/:::CTA_URL[\s\S]*?:::?/g, '').trim();
      }

      // Si une commande vient d'être créée ou si un lien vers le tableau de bord est pertinent
      if (!ctaUrlToSend && (createdOrderInfo || aiReply.includes('fys-app.com/board'))) {
        const trackingUrl = `https://fys-app.com/board/orders?phone=${senderPhone}`;
        aiReply = aiReply.replace(/https?:\/\/fys-app\.com[^\s]*/g, '').replace(/👉\s*$/gm, '').trim();
        ctaUrlToSend = {
          displayText: 'Mon Tableau de bord',
          url: trackingUrl,
          headerText: 'NutriFYS · Commande confirmée',
          footerText: 'NutriFYS · Votre nutritionniste de poche',
        };
      }

      // ── Extraction et détection des listes interactives Meta (Menu déroulant) ────
      const listMatch = aiReply.match(/:::LIST\s*([\s\S]*?):::/);
      if (listMatch) {
        try {
          const parsed = JSON.parse(listMatch[1].trim());
          if (parsed && Array.isArray(parsed.sections)) {
            listToSend = parsed;
          }
        } catch (lErr) {
          console.warn('[whatsapp-webhook] Failed to parse :::LIST JSON:', lErr);
        }
        aiReply = aiReply.replace(/:::LIST[\s\S]*?:::?/g, '').trim();
      }

      // ── Extraction et détection des boutons interactifs Meta ────────────
      const buttonsMatch = aiReply.match(/:::BUTTONS\s*([\s\S]*?):::/);
      if (buttonsMatch) {
        try {
          const parsed = JSON.parse(buttonsMatch[1].trim());
          if (Array.isArray(parsed)) {
            buttonsToSend = parsed.filter((b: any) => b && typeof b.title === 'string');
          }
        } catch (bErr) {
          console.warn('[whatsapp-webhook] Failed to parse :::BUTTONS JSON:', bErr);
        }
        aiReply = aiReply.replace(/:::BUTTONS[\s\S]*?:::?/g, '').trim();
      }

      // Détection de sélection de mode (sur-mesure VS catalogue) pour éviter d'afficher les boutons en boucle
      const userSelectedCustom = !isUserExplicitGreeting && (
        interactiveButtonId === 'btn_mode_custom' ||
        /(?:composer\s+sur[- ]?mesure|cr[ée]+er\s+(?:un|mon)\s+jus|au\s+lab|sur[- ]?mesure)/i.test(senderText || '') ||
        existingUserDoc?.data()?.selectedMode === 'custom'
      );

      const userSelectedCatalog = !isUserExplicitGreeting && (
        interactiveButtonId === 'btn_mode_catalog' ||
        interactiveButtonId.startsWith('btn_cat_') ||
        /(?:jus\s+du\s+catalogue|catalogue|jus\s+signature)/i.test(senderText || '') ||
        existingUserDoc?.data()?.selectedMode === 'catalog'
      );

      const isFruitPrompt =
        /(?:choisir|choisissez|sélectionnez|selectionnez)\s+(?:2|deux|entre\s+2|\d)\s*(?:[àa]\s*4)?\s*fruits/i.test(aiReply) ||
        /(?:parmi\s+nos\s+fruits|fruits\s+frais\s+du\s+jour|quels\s+fruits|vos\s+fruits\s+préférés|choix\s+de\s+fruits|ingrédients\s+frais)/i.test(aiReply);

      // Si le client a déjà choisi sur-mesure ou catalogue, ou si on est en train de lui demander ses fruits :
      // INTERDICTION FORMELLE d'ajouter ou de conserver les boutons de choix de mode (sauf si on vient de lui expliquer qu'un ingrédient est indisponible et qu'on lui propose de re-choisir son mode) !
      if (!isUnavailableOrCatalogExplanation && (userSelectedCustom || userSelectedCatalog || isFruitPrompt)) {
        buttonsToSend = buttonsToSend.filter(
          (b) => b.id !== 'btn_mode_custom' && b.id !== 'btn_mode_catalog'
        );
      }

      // ── Détection automatique intelligente en renfort si l'IA n'a pas inclus les balises ────
      // 1. Choix du quartier de livraison à Yaoundé (Liste déroulante)
      if (
        !listToSend &&
        buttonsToSend.length === 0 &&
        !orderMatch &&
        (aiReply.toLowerCase().includes('quel quartier') ||
         aiReply.toLowerCase().includes('quartier de livraison') ||
         aiReply.toLowerCase().includes('quartier de yaoundé') ||
         aiReply.toLowerCase().includes('quartier souhaitez-vous') ||
         aiReply.toLowerCase().includes('dans quel quartier'))
      ) {
        listToSend = getWhatsAppDistrictsList(activeDeliveryZones);
      }

      // 1.5. Choix du mode de commande (Composer sur-mesure VS Jus du catalogue)
      if (
        !listToSend &&
        buttonsToSend.length === 0 &&
        !orderMatch &&
        !ctaUrlToSend &&
        !userSelectedCustom &&
        !userSelectedCatalog &&
        !isFruitPrompt &&
        (!activeCart || activeCart.items.length === 0) &&
        activeRecipeIngredients.length === 0
      ) {
        const lowerReply = aiReply.toLowerCase();
        const lowerText = (senderText || '').toLowerCase();
        const isExplicitDualChoice =
          (lowerReply.includes('sur-mesure') && lowerReply.includes('catalogue') && (
            lowerReply.includes('ou') ||
            lowerReply.includes('préférez-vous') ||
            lowerReply.includes('preferez-vous') ||
            lowerReply.includes('deux options') ||
            lowerReply.includes('2 options') ||
            lowerReply.includes('options s\'offrent') ||
            lowerReply.includes('laquelle de ces')
          )) ||
          lowerReply.includes('composer votre recette sur-mesure au lab ou') ||
          lowerReply.includes('souhaitez-vous composer votre recette');

        const isGreetingTrigger =
          !hasHistory &&
          (/(?:^|\b)(?:bonjour|salut|hello|bonsoir|coucou|yo|rebonjour|hey|allo|sant[ée]|bienvenue)(?:\b|$)/i.test(lowerText) ||
           /(?:envie\s+d(?:'|\s+un)\s+jus|boire\s+un\s+jus|propose|carte|menu|quel\s+jus)/i.test(lowerText));

        if (isExplicitDualChoice || isGreetingTrigger) {
          buttonsToSend = [
            { id: 'btn_mode_custom', title: 'Composer sur-mesure' },
            { id: 'btn_mode_catalog', title: 'Jus du catalogue' },
          ];

          // Si le texte de l'IA n'a pas posé explicitement la question, on s'assure qu'elle figure dans le message
          if (!lowerReply.includes('sur-mesure') && !lowerReply.includes('catalogue')) {
            aiReply = `${aiReply}\n\nSouhaitez-vous composer votre recette sur-mesure au Lab ou partir sur une formule du catalogue ?`;
          }
        }
      }

      // 2. Choix de la quantité de bouteilles (Boutons)
      if (
        !listToSend &&
        buttonsToSend.length === 0 &&
        !orderMatch &&
        (aiReply.toLowerCase().includes('combien de bouteilles') ||
         aiReply.toLowerCase().includes('nombre de bouteilles') ||
         aiReply.toLowerCase().includes('quantité de bouteilles') ||
         aiReply.toLowerCase().includes('combien de bouteille'))
      ) {
        if (activeCart && activeCart.items.some((i) => i.isCatalog)) {
          buttonsToSend = [
            { id: 'btn_qty_1', title: '1 Bouteille' },
            { id: 'btn_qty_2', title: '2 Bouteilles' },
            { id: 'btn_qty_5', title: '5 Bouteilles' },
          ];
        } else if (activeCart && activeCart.items.length > 1) {
          buttonsToSend = [
            { id: 'btn_qty_each_1', title: '1 de chaque' },
            { id: 'btn_qty_each_2', title: '2 de chaque' },
            { id: 'btn_qty_diff', title: 'Quantités perso' },
          ];
        } else {
          buttonsToSend = [
            { id: 'btn_qty_1', title: '1 Bouteille' },
            { id: 'btn_qty_2', title: '2 Bouteilles' },
            { id: 'btn_qty_3', title: '3 Bouteilles' },
          ];
        }
      }

      // 3. Choix du format si la question du format est posée
      if (
        !listToSend &&
        buttonsToSend.length === 0 &&
        !orderMatch &&
        (aiReply.toLowerCase().includes('quel format') ||
         aiReply.toLowerCase().includes('format souhaité') ||
         aiReply.toLowerCase().includes('format préférez-vous') ||
         aiReply.toLowerCase().includes('500ml ou 1l'))
      ) {
        if (activeCart && activeCart.items.length > 1) {
          buttonsToSend = [
            { id: 'btn_format_all_500ml', title: 'Tous en 500ml' },
            { id: 'btn_format_all_1l', title: 'Tous en 1 Litre' },
            { id: 'btn_format_diff', title: 'Formats différents' },
          ];
        } else {
          buttonsToSend = [
            { id: 'btn_format_500ml', title: 'Format 500ml' },
            { id: 'btn_format_1l', title: 'Format 1 Litre' },
          ];
        }
      }

      // 4. Devis récapitulatif demandant confirmation
      if (
        !listToSend &&
        buttonsToSend.length === 0 &&
        !orderMatch &&
        !createdOrderInfo &&
        (aiReply.includes('TOTAL À PAYER') || aiReply.includes('Total à payer')) &&
        (aiReply.toLowerCase().includes('convient') || aiReply.toLowerCase().includes('valider') || aiReply.toLowerCase().includes('bon pour vous'))
      ) {
        buttonsToSend = [
          { id: 'btn_confirm_order', title: 'Valider commande' },
          { id: 'btn_edit_order', title: 'Modifier' },
        ];
      }

      // 5. Accueil d'un brouillon Web FYS (#FYS-XXXX) ou proposition recette
      if (
        !listToSend &&
        buttonsToSend.length === 0 &&
        !orderMatch &&
        (isNewDraftCodeInMessage || aiReply.toLowerCase().includes('fiche nutritionnelle') || aiReply.toLowerCase().includes('passer à la commande'))
      ) {
        buttonsToSend = [
          { id: 'btn_order', title: 'Commander' },
          { id: 'btn_nutrition', title: 'Fiche nutrition' },
        ];
      }

      // ── CONTRÔLE DÉTERMINISTE D'AFFICHAGE DES CONTACTS FYS (3 CAS STRICTS) ──
      // Cas 1 : Message de bienvenue pour un nouveau client (!hasHistory && isNewClientUser)
      // Cas 2 : Message de fin de commande (Boolean(createdOrderInfo))
      // Cas 3 : Demande expresse du client de contacter l'équipe
      const isWelcomeNewClient = !hasHistory && isNewClientUser;
      const isOrderFinalConfirmation = Boolean(createdOrderInfo);
      const isContactExplicitlyRequested = Boolean(
        senderText &&
        /\b(contact|contacter|contacts|num[ée]ro|t[ée]l[ée]phone|t[ée]l|phone|appeler|appel|joindre|joignable|whatsapp\s+direct|coordonn[ée]es|parler\s+[àa]\s+(?:quelqu['’]un|un\s+humain|une\s+personne|l['’][ée]quipe|un\s+conseiller|un\s+responsable|un\s+commercial|un\s+vendeur)|humain|service\s+client|assistance|support|conseiller|responsable|g[ée]rant)\b/i.test(senderText)
      );

      const shouldShowTeamContacts = isWelcomeNewClient || isOrderFinalConfirmation || isContactExplicitlyRequested;

      if (!shouldShowTeamContacts) {
        // En dehors de ces 3 cas stricts, INTERDICTION STRICTE d'afficher les numéros FYS
        aiReply = removeTeamContactsFromText(aiReply);
      } else {
        // Dans les 3 cas autorisés, garantir la présence des numéros si l'IA ne les a pas déjà inclus
        const hasTeamContactsAlready = /(?:691\s*91\s*32\s*07|675\s*10\s*88\s*76|691913207|675108876)/.test(aiReply);
        if (!hasTeamContactsAlready) {
          if (isWelcomeNewClient) {
            aiReply = `${aiReply}\n\nBesoin d'informations ou d'une commande par téléphone ? Notre équipe est à votre écoute :\n${FYS_TEAM_CONTACTS_TEXT}`;
          } else if (isOrderFinalConfirmation) {
            aiReply = `${aiReply}\n\nUne question ou pour le suivi de votre livraison ? Notre équipe est à votre écoute :\n${FYS_TEAM_CONTACTS_TEXT}`;
          } else if (isContactExplicitlyRequested) {
            aiReply = `${aiReply}\n\nVoici les coordonnées directes de notre équipe FYS :\n${FYS_TEAM_CONTACTS_TEXT}`;
          }
        }
      }

      // ── CONTRÔLE DE PROXIMITÉ & SALUTATION NATURELLE ──
      if (hasHistory && !isUserExplicitGreeting && !createdOrderInfo) {
        // En cours de conversation (choix de fruits, commande, etc.), suppression des salutations répétitives
        aiReply = stripUnwantedMidConversationGreetings(aiReply);
        // Supprime tout "cher client" ou "cher(e) ami(e)" résiduel dans le corps du message
        aiReply = aiReply
          .replace(/ch[eè]r(?:e|\(e\)|\(ère\))?\s+(?:client(?:e|\(e\)|\(s\))?|ami(?:e|\(e\))?)/gi, customerFirstName || '')
          .replace(/\s{2,}/g, ' ')
          .trim();
      } else if (!createdOrderInfo) {
        // Accueil initial ou salutation expresse de l'utilisateur : accueil chaleureux personnalisé avec prénom
        aiReply = sanitizeCustomerGreeting(aiReply, customerFirstName);
      }

      // Sanitize standard service client professionnel (supprime emojis superflus, double astérisques et normalise la typographie)
      aiReply = sanitizeProfessionalCustomerServiceText(aiReply);

      // 3. Envoi de la réponse sur WhatsApp (Option 2 : Vocal + Texte si le client a parlé en vocal)
      let sentAudio = false;
      if (isAudioMessage && GEMINI_API_KEY) {
        try {
          console.log('[whatsapp-webhook] 🎙️ Synthesizing Gemini voice response for customer...');
          const mp3Buffer = await generateGeminiSpeech(aiReply, GEMINI_API_KEY);
          if (mp3Buffer) {
            const uploadedMediaId = await uploadWhatsAppAudio(mp3Buffer);
            if (uploadedMediaId) {
              sentAudio = await sendWhatsAppAudio(senderPhone, uploadedMediaId);
              console.log('[whatsapp-webhook] ✅ Voice note successfully sent to WhatsApp!');
            }
          }
        } catch (audioErr) {
          console.warn('[whatsapp-webhook] Voice reply generation skipped or failed:', audioErr);
        }
      }

      // Envoyer le message : avec bouton CTA URL natif si présent (zéro lien brut dans le texte), sinon liste déroulante, sinon boutons de réponse, sinon texte standard
      let sent = false;
      if (ctaUrlToSend) {
        console.log(`[whatsapp-webhook] 🔗 Sending message with native CTA URL button ("${ctaUrlToSend.displayText}") to ${senderPhone}...`);
        sent = await sendWhatsAppCtaUrl(senderPhone, aiReply, ctaUrlToSend);
      } else if (listToSend) {
        console.log(`[whatsapp-webhook] 📋 Sending message with interactive LIST to ${senderPhone}...`);
        sent = await sendWhatsAppInteractiveList(
          senderPhone,
          aiReply,
          listToSend,
          'NutriFYS · FYS',
          'NutriFYS · Votre nutritionniste de poche'
        );
      } else if (buttonsToSend.length > 0) {
        console.log(`[whatsapp-webhook] 🔘 Sending message with ${buttonsToSend.length} interactive buttons to ${senderPhone}...`);
        sent = await sendWhatsAppInteractiveButtons(
          senderPhone,
          aiReply,
          buttonsToSend,
          undefined,
          'NutriFYS - Votre nutritionniste de poche'
        );
      } else {
        sent = await sendWhatsAppMessage(senderPhone, aiReply);
      }
      console.log('[whatsapp-webhook] Message sent to WhatsApp successfully:', { sent, sentAudio, cta: Boolean(ctaUrlToSend), interactive: buttonsToSend.length > 0, list: Boolean(listToSend) });

      // ── Envoi automatique de la Facture PDF et de la Fiche Nutritionnelle PDF ──
      if (createdOrderInfo) {
        console.log(`[whatsapp-webhook] 🚀 Dispatching Facture & Nutrition PDFs for order #${createdOrderInfo.orderId}...`);
        try {
          // Attendre 400ms pour que WhatsApp affiche le message texte de récapitulatif avant les documents
          await new Promise((r) => setTimeout(r, 400));
          await sendOrderPdfsToCustomer(
            senderPhone,
            createdOrderInfo.orderDoc,
            createdOrderInfo.orderId,
            createdOrderInfo.ingredients
          );
        } catch (pdfDispatchErr) {
          console.error('[whatsapp-webhook] Error dispatching order PDFs:', pdfDispatchErr);
        }
      } else if (db && senderText) {
        // Support à la demande : si le client demande expressément sa facture ou sa fiche nutritionnelle en PDF
        const lowerText = senderText.toLowerCase();
        const wantsFacture = lowerText.includes('facture') && (
          lowerText.includes('pdf') ||
          lowerText.includes('envoie') ||
          lowerText.includes('envoyer') ||
          lowerText.includes('recevoir') ||
          lowerText.includes('télécharger') ||
          lowerText.includes('mon ticket') ||
          lowerText.includes('ma facture')
        );
        const wantsNutrition = (lowerText.includes('fiche nutrition') || lowerText.includes('fiche nutritionnelle')) && (
          lowerText.includes('pdf') ||
          lowerText.includes('document') ||
          lowerText.includes('télécharger') ||
          lowerText.includes('envoie') ||
          lowerText.includes('envoyer')
        );

        if (wantsFacture || wantsNutrition) {
          try {
            const safeVariants = phoneVariants.length > 0 ? phoneVariants.slice(0, 30) : [senderPhone];
            const pastOrdersSnap = await db.collection('orders')
              .where('userPhoneSnapshot', 'in', safeVariants)
              .limit(5)
              .get();

            if (!pastOrdersSnap.empty) {
              const sortedDocs = pastOrdersSnap.docs.sort((a: any, b: any) => {
                const tA = a.data().createdAt?._seconds || a.data().createdAt?.seconds || 0;
                const tB = b.data().createdAt?._seconds || b.data().createdAt?.seconds || 0;
                return tB - tA;
              });
              const latestOrderDoc = sortedDocs[0].data();
              const latestOrderId = sortedDocs[0].id;
              const ingredients = latestOrderDoc.cocktailIngredientsSnapshot || [];

              if (wantsFacture) {
                const shortId = latestOrderId.slice(0, 8).toUpperCase();
                const ingredientsStr = ingredients.map((i: any) => i.fruitName || i.name).filter(Boolean).join(', ');
                const fBuf = await generateOrderFacturePdfBuffer(
                  {
                    ...latestOrderDoc,
                    id: latestOrderId,
                    createdAt: latestOrderDoc.createdAt && typeof latestOrderDoc.createdAt.toDate === 'function'
                      ? latestOrderDoc.createdAt
                      : { toDate: () => new Date() },
                  },
                  ingredientsStr
                );
                if (fBuf) {
                  const mId = await uploadWhatsAppDocument(fBuf, `Facture_${shortId}.pdf`);
                  if (mId) {
                    await sendWhatsAppDocument(senderPhone, mId, `Facture_${shortId}.pdf`, `Voici votre facture officielle FYS #${shortId}`);
                  }
                }
              }

              if (wantsNutrition) {
                const cocktailName = latestOrderDoc.cocktailNameSnapshot || 'Cocktail Santé FYS';
                const fruitNames = ingredients.map((i: any) => i.fruitName || i.name).filter(Boolean);
                const analysis = await resolveOrGenerateNutritionAnalysis(cocktailName, fruitNames, Boolean(latestOrderDoc.hasAddedSugar), latestOrderDoc.aiAnalysisSnapshot, GEMINI_API_KEY);
                const nBuf = await generateOrderNutritionPdfBuffer(analysis, cocktailName, latestOrderDoc.userNameSnapshot, fruitNames);
                if (nBuf) {
                  const mId = await uploadWhatsAppDocument(nBuf, `Fiche_NutriFYS_${cocktailName.slice(0, 15).replace(/\s+/g, '_')}.pdf`);
                  if (mId) {
                    await sendWhatsAppDocument(senderPhone, mId, `Fiche_NutriFYS.pdf`, `Voici la fiche nutritionnelle de votre cocktail ${cocktailName}`);
                  }
                }
              }
            }
          } catch (reSendErr) {
            console.warn('[whatsapp-webhook] On-demand PDF dispatch skipped:', reSendErr);
          }
        }
      }

      // Enregistrer la réponse de l'IA dans Firestore pour garder l'historique de discussion
      if (db) {
        try {
          if (userDocRef) {
            await userDocRef.collection('whatsapp_messages').add({
              sender: 'nutrifys',
              text: aiReply,
              timestamp: FieldValue.serverTimestamp(),
            });
          } else {
            const usersRef = db.collection('users');
            const safeVariants = phoneVariants.length > 0 ? phoneVariants.slice(0, 10) : [senderPhone];
            const querySnap = await usersRef.where('phone', 'in', safeVariants).limit(1).get();
            if (!querySnap.empty) {
              await querySnap.docs[0].ref.collection('whatsapp_messages').add({
                sender: 'nutrifys',
                text: aiReply,
                timestamp: FieldValue.serverTimestamp(),
              });
            }
          }
        } catch (saveErr) {
          console.warn('[whatsapp-webhook] Error saving AI reply:', saveErr);
        }
      }

      return res.status(200).json({ status: 'success', sent });
    } catch (err: any) {
      console.error('[whatsapp-webhook] Processing error:', err);
      if (messageId) {
        try {
          const db = getAdminDb();
          if (db) await db.collection('processed_whatsapp_messages').doc(messageId).delete().catch(() => null);
        } catch (_) {}
      }
      return res.status(500).json({ error: err?.message || 'Internal Error' });
    }
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
}
