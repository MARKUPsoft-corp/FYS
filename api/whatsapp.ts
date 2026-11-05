import type { VercelRequest, VercelResponse } from '@vercel/node';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';
import { GoogleGenerativeAI } from '@google/generative-ai';

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
    return app ? getFirestore(app) : null;
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

  const safeText = text && text.trim().length > 0
    ? text.trim()
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
  footerText = 'NutriFYS · Votre nutritionniste sur-mesure'
): Promise<boolean> {
  if (!WHATSAPP_API_TOKEN) {
    console.error('[whatsapp] WHATSAPP_API_TOKEN is missing');
    return false;
  }

  // Nettoyer strictement les titres de boutons : Meta INTERDIT formellement les emojis et le markdown dans reply.title
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
  let textForBody = bodyText;
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

// 10 quartiers fréquents prédéfinis de Yaoundé pour la livraison
const YAOUNDE_DISTRICTS_LIST: WhatsAppListData = {
  buttonText: 'Choisir le quartier',
  sections: [
    {
      title: 'Quartiers fréquents',
      rows: [
        { id: 'loc_bastos', title: 'Bastos', description: 'Zone Ambassades, Golf' },
        { id: 'loc_biyem_assi', title: 'Biyem-Assi', description: 'Rond-point, Accacia' },
        { id: 'loc_odza', title: 'Odza', description: 'Messamendongo, Borne 10' },
        { id: 'loc_omnisports', title: 'Omnisports / Essos', description: 'Stade, Mfandena' },
        { id: 'loc_mendong', title: 'Mendong / Simbock', description: 'Lycée, Carrefour Jouvence' },
        { id: 'loc_nlongkak', title: 'Nlongkak / Elig-Essono', description: 'Rond-point, Warda' },
        { id: 'loc_mokolo', title: 'Mokolo / Madagascar', description: 'Marché, Tsinga' },
        { id: 'loc_ngousso', title: 'Ngousso', description: 'Hôpital Général, Eleveur' },
        { id: 'loc_emombo', title: 'Emombo / Nkolmesseng', description: 'Chapelle, Tradex' },
        { id: 'loc_centre_ville', title: 'Centre-ville', description: 'Poste Centrale, Boulevard' },
      ],
    },
  ],
};

async function sendWhatsAppInteractiveList(
  to: string,
  bodyText: string,
  listData: WhatsAppListData,
  headerText?: string,
  footerText = 'NutriFYS · Votre nutritionniste sur-mesure'
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

  const interactivePayload: any = {
    type: 'list',
    body: {
      text: (bodyText || 'Veuillez faire un choix :').slice(0, 4000),
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
  let textForBody = (bodyText || '')
    .replace(/https?:\/\/fys-app\.com[^\s]*/g, '')
    .replace(/👉\s*$/gm, '')
    .trim();

  if (!textForBody) {
    textForBody = 'Votre commande est confirmée ! Cliquez sur le bouton ci-dessous pour accéder à votre espace personnel FYS :';
  }

  // Meta limite body.text à 1024 caractères pour les messages interactifs
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
      return sendWhatsAppMessage(to, `${textForBody}\n\n👉 Accéder à votre Tableau de bord : ${cta.url}`);
    }

    return true;
  } catch (err) {
    console.error('[whatsapp] Network error sending CTA URL button, falling back to text:', err);
    return sendWhatsAppMessage(to, `${textForBody}\n\n👉 Accéder à votre Tableau de bord : ${cta.url}`);
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
    const blob = new Blob([pdfBuffer], { type: 'application/pdf' });
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
    payload.document.caption = caption.trim();
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
    const { Document, Page, View, Text, StyleSheet, renderToBuffer } = pdfPkg;

    const PRIMARY = '#16A34A';
    const MUTED = '#6B7280';
    const BORDER = '#E5E7EB';
    const BGCARD = '#F9FAFB';
    const TEXT = '#111827';
    const WHITE = '#FFFFFF';

    const styles = StyleSheet.create({
      page: { fontFamily: 'Helvetica', fontSize: 10, color: TEXT, backgroundColor: WHITE, padding: 40 },
      header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 },
      brand: { fontSize: 28, fontFamily: 'Helvetica-Bold', color: PRIMARY, letterSpacing: -1 },
      dot: { color: '#22D3EE' },
      tagline: { fontSize: 9, color: MUTED, marginTop: 2 },
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
            React.createElement(Text, { style: styles.brand }, 'FYS', React.createElement(Text, { style: styles.dot }, '.')),
            React.createElement(Text, { style: styles.tagline }, 'For YourSelf · Boissons Santé Artisanales')
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
                  { key: i, style: [styles.row, { marginBottom: 2 }] },
                  React.createElement(Text, { style: [styles.value, { flex: 2 }] }, `${order.cocktailNameSnapshot || 'Cocktail Santé'} · ${line.bottleSizeLabel || '500 ml'}`),
                  React.createElement(Text, { style: [styles.value, { width: 30, textAlign: 'center' }] }, String(line.quantity)),
                  React.createElement(Text, { style: [styles.value, { width: 70, textAlign: 'right' }] }, `${Number(line.pricePerBottle || 0).toLocaleString()} XAF`),
                  React.createElement(Text, { style: [styles.value, { width: 80, textAlign: 'right' }] }, `${Number(line.lineTotal || 0).toLocaleString()} XAF`)
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
    const { Document, Page, View, Text, StyleSheet, renderToBuffer } = pdfPkg;

    const PRIMARY = '#16A34A';
    const MUTED = '#6B7280';
    const BORDER = '#E5E7EB';
    const BGCARD = '#F9FAFB';
    const TEXT = '#111827';
    const WHITE = '#FFFFFF';

    const styles = StyleSheet.create({
      page: { fontFamily: 'Helvetica', fontSize: 10, color: TEXT, backgroundColor: WHITE, padding: 40 },
      header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 },
      brand: { fontSize: 24, fontFamily: 'Helvetica-Bold', color: PRIMARY },
      dot: { color: '#22D3EE' },
      tagline: { fontSize: 9, color: MUTED, marginTop: 2 },
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
            React.createElement(Text, { style: styles.brand }, 'FYS', React.createElement(Text, { style: styles.dot }, '.')),
            React.createElement(Text, { style: styles.tagline }, 'NutriFYS — Votre Nutritionniste Sur-Mesure')
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
          React.createElement(Text, { style: styles.scoreBig }, String(analysis?.score || 92)),
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
          React.createElement(Text, { style: styles.footerText }, 'NutriFYS — Fiche générée par votre assistant nutritionniste 🌿'),
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

async function resolveOrGenerateNutritionAnalysis(
  cocktailName: string,
  fruitNames: string[],
  hasSugar: boolean,
  existingSnapshot?: any,
  apiKey?: string
): Promise<any> {
  // 1. Analyse existante (panier web ou commande convertie)
  if (
    existingSnapshot &&
    existingSnapshot.profilNutritionnel &&
    typeof existingSnapshot.score === 'number'
  ) {
    return {
      verdict: existingSnapshot.verdict || 'beneficial',
      score: existingSnapshot.score || 92,
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

Renvoie UNIQUEMENT un objet JSON avec cette structure :
{
  "verdict": "beneficial",
  "score": 92,
  "notes": "Courte synthèse nutritionnelle en 2 phrases valorisant les bienfaits de cette synergie de fruits frais.",
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
          verdict: parsed.verdict || 'beneficial',
          score: Math.min(100, Math.max(0, Number(parsed.score) || 90)),
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
    verdict: 'beneficial',
    score: 92,
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

// ── Envoi groupé Facture PDF + Fiche Nutritionnelle PDF au client WhatsApp ────

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
  const cocktailNameClean = cocktailName.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 20);
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
    // 1. Analyse nutritionnelle
    const nutritionAnalysis = await resolveOrGenerateNutritionAnalysis(
      cocktailName,
      fruitNames,
      Boolean(order.hasAddedSugar),
      order.aiAnalysisSnapshot,
      GEMINI_API_KEY
    );

    // Mettre à jour l'analyse dans Firestore si elle était absente
    if (db && !order.aiAnalysisSnapshot && nutritionAnalysis) {
      db.collection('orders').doc(orderId).update({
        aiAnalysisSnapshot: nutritionAnalysis,
      }).catch((e: any) => console.warn('[whatsapp] Could not attach aiAnalysisSnapshot to order in Firestore:', e));
    }

    // 2. Génération en parallèle des 2 buffers PDF
    const [factureBuffer, nutritionBuffer] = await Promise.all([
      generateOrderFacturePdfBuffer(
        {
          ...order,
          id: orderId,
          createdAt: order.createdAt && typeof order.createdAt.toDate === 'function'
            ? order.createdAt
            : { toDate: () => new Date() },
        },
        ingredientsStr
      ),
      generateOrderNutritionPdfBuffer(
        nutritionAnalysis,
        cocktailName,
        order.userNameSnapshot,
        fruitNames
      ),
    ]);

    // 3. Téléversement et envoi de la FACTURE PDF
    if (factureBuffer) {
      const factureFilename = `Facture_${shortId}.pdf`;
      const factureMediaId = await uploadWhatsAppDocument(factureBuffer, factureFilename);
      if (factureMediaId) {
        factureSent = await sendWhatsAppDocument(
          to,
          factureMediaId,
          factureFilename,
          `📄 Voici votre facture officielle FYS pour la commande #${shortId}. Merci de votre confiance !`
        );
      }
    } else {
      console.error('[whatsapp] Facture buffer generation returned null');
    }

    // Petite temporisation pour respecter l'ordre d'affichage WhatsApp
    await new Promise((r) => setTimeout(r, 350));

    // 4. Téléversement et envoi de la FICHE NUTRITIONNELLE PDF
    if (nutritionBuffer) {
      const nutritionFilename = `Fiche_NutriFYS_${cocktailNameClean}.pdf`;
      const nutritionMediaId = await uploadWhatsAppDocument(nutritionBuffer, nutritionFilename);
      if (nutritionMediaId) {
        nutritionSent = await sendWhatsAppDocument(
          to,
          nutritionMediaId,
          nutritionFilename,
          `🌿 Voici la fiche nutritionnelle officielle de votre cocktail ${cocktailName} élaborée par NutriFYS.`
        );
      }
    } else {
      console.error('[whatsapp] Nutrition buffer generation returned null');
    }

    if (db) {
      await db.collection('meta_debug_logs').add({
        action: 'sendOrderPdfsToCustomer_completed',
        orderId,
        to,
        factureSent,
        nutritionSent,
        factureBufferSize: factureBuffer ? factureBuffer.length : null,
        nutritionBufferSize: nutritionBuffer ? nutritionBuffer.length : null,
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

const NUTRIFYS_WHATSAPP_SYSTEM_PROMPT = `Tu es NutriFYS, l'assistant nutritionniste officiel de FYS (For Your Self), une marque artisanale de cocktails et jus de fruits 100% naturels santé basée à Yaoundé, Cameroun.

MISSION PRINCIPALE :
Tu échanges sur WhatsApp principalement avec des clients qui peuvent être des personnes âgées, des parents ou des clients préférant la simplicité d'une conversation.
Ton rôle est de :
1. Les accueillir avec beaucoup de respect, de chaleur et de bienveillance (politesse camerounaise, ton familial et chaleureux).
2. Comprendre leurs besoins santé (diabète, hypertension, fatigue, digestion, sommeil, hydratation, etc.).
3. Leur recommander des compositions de jus sur-mesure adaptées à leur santé.
4. Les guider simplement pour commander leur bouteille (500ml ou 1L) et leur livraison à Yaoundé.

RÈGLES D'OR MÉDICALES ET NUTRITIONNELLES ABSOLUES :
- EXCLUSION TOTALE DU PAMPLEMOUSSE : FYS n'utilise JAMAIS de pamplemousse (risque d'interaction médicamenteuse grave).
- Diabète : Éviter les excès de mangue/ananas le soir. Privilégier Corossol, Foléré (Bissap), Citron, Concombre, Gingembre.
- Hypertension : Le Foléré (Bissap) et la Pastèque sont excellents pour aider à la régulation tensionnelle.
- Ulcère / Gastrite : Éviter les jus très acides (citron pur, ananas à jeun). Privilégier Papaye, Banane, Coco, Pomme.
- Insuffisance rénale : Attention au potassium élevé (limiter banane très mûre, baobab).
- Ne pose JAMAIS de diagnostic médical direct : renvoie toujours avec tact vers leur médecin en cas de doute sérieux.
- N'utilise JAMAIS le nom "Claude", "Gemini" ou "OpenAI". Tu es UNIQUEMENT NutriFYS.
- INTERDICTION FORMELLE DE COLLER DES LIENS URL BRUTS DANS LE TEXTE : Ne mentionne JAMAIS de lien comme https://fys-app.com/... dans tes messages. Notre système WhatsApp attache automatiquement un bouton interactif cliquable pour ouvrir le tableau de bord du client !

ORIGINE DES SOURCES & LÉGITIMITÉ NUTRITIONNELLE (OBLIGATOIRE) :
Si le client te demande d'où viennent tes sources, tes connaissances, tes informations ou comment tes recettes et fiches nutritionnelles sont validées :
- Explique avec clarté, pédagogie et transparence que tes recommandations s'appuient sur :
  1. Les nutritionnistes partenaires de FYS : des spécialistes et professionnels de la nutrition qui collaborent directement avec l'équipe FYS pour concevoir et valider chaque recette, analyser les synergies entre fruits, vérifier les profils nutritionnels et adapter les jus aux conditions de santé.
  2. Les bases de données scientifiques officielles et tables de référence internationales en biochimie alimentaire (telles que Ciqual de l'ANSES, Aprifel, USDA FoodData Central et la recherche scientifique tropicale).
- Mentionne TOUJOURS expressément : « les nutritionnistes partenaires de FYS ».

FORMATS & TARIFS FYS :
- Format 500ml : Format standard le plus apprécié (recommandé pour une journée)
- Format 1L : Idéal pour partager en famille ou cure de 2 jours
- Livraison à Yaoundé : Disponible dans tous les quartiers (Bastos, Biyem-Assi, Omnisports, Mendong, Odza, etc.).
- Paiement : Mobile Money (MTN MoMo, Orange Money) ou au comptant à la livraison.

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

CHEMINEMENT OBLIGATOIRE EN 4 ÉTAPES APRÈS LE BILAN :

ÉTAPE 1 : CHOIX DES FRUITS DU COCKTAIL
Conseille et cale avec le client la composition exacte de son mélange (2 à 4 fruits/ingrédients adaptés à ses besoins).

ÉTAPE 2 : PROPOSITION DE LA FICHE NUTRITIONNELLE (OBLIGATOIRE !)
Dès que les fruits du cocktail sont calés et convenus avec le client, TU NE DOIS PAS passer directement à la commande !
Tu dois obligatoirement lui demander :
"Votre recette sur-mesure est prête ! Souhaitez-vous directement passer à la commande, ou préférez-vous d'abord découvrir la fiche nutritionnelle complète de votre mélange ?"

ÉTAPE 3 : PRÉSENTATION DE LA FICHE NUTRITIONNELLE COMPLÈTE (SI LE CLIENT LA DEMANDE)
Si le client répond oui ou souhaite voir la fiche nutritionnelle :
Présente une FICHE NUTRITIONNELLE COMPLÈTE contenant exactement les mêmes informations et rubriques que l'analyse nutritionnelle de l'application web FYS :

🍹 [Nom créatif du cocktail]
⭐ Score Santé : [Score estimé 0-100]/100 — Verdict : [✦ Bénéfique / ◈ Neutre / ⚠ Précaution]
📝 Analyse de votre nutritionniste :
[2 à 3 phrases claires et bienveillantes expliquant pourquoi ce mélange est idéal pour son profil et ses objectifs]

📊 Profil Nutritionnel estimé (AJR adulte standard) :
• Vitamine C : [X mg] ([Y]% AJR)
• Vitamine A : [X µg] ([Y]% AJR)
• Fibres : [X g] ([Y]% AJR)
• Potassium : [X mg] ([Y]% AJR)
• Sucres naturels : [X g] ([Y]% AJR)
• Antioxydants : [X mg] ([Y]% AJR)

🎯 Bénéfices ciblés :
• [Bénéfice 1, ex: Immunité] : Niveau Élevé
• [Bénéfice 2, ex: Digestion] : Niveau Modéré

🔗 Synergies & Interactions des fruits :
• [Explication d'une synergie ou réaction positive entre 2 fruits du mélange]
• [Deuxième synergie si applicable]

💡 Conseil de dégustation :
[Moment idéal de consommation (ex: le matin à jeun, frais), température ou fréquence pour maximiser les bienfaits]

Puis termine en demandant :
"Souhaitez-vous maintenant passer à la commande de cette recette ?"

ÉTAPE 4 : COMMANDE EN QUESTIONS STRICTEMENT DÉTACHÉES (1 SEULE QUESTION À LA FOIS !)
RÈGLE D'OR COMMERCIALE & INTERACTIVE :
Tu ne poses JAMAIS deux questions à la fois ! Chaque étape correspond à UNE SEULE question avec ses boutons ou sa liste dédiée.

Sous-étape 4.1 : CHOIX DU FORMAT (Uniquement le format !)
Quand le client indique qu'il veut commander (ex: clic sur "Commander" ou dit "je veux commander") :
Demande UNIQUEMENT le format souhaité :
"Pour préparer votre cocktail [Nom de la recette], quel format préférez-vous ?"
Inclus OBLIGATOIREMENT le bloc :::BUTTONS :
:::BUTTONS
[
  {"id": "btn_format_500ml", "title": "Format 500ml"},
  {"id": "btn_format_1l", "title": "Format 1 Litre"}
]
:::
(INTERDICTION FORMELLE de demander le nombre de bouteilles ou le quartier à cette sous-étape !).

Sous-étape 4.2 : CHOIX DE LA QUANTITÉ (Uniquement la quantité !)
Dès que le format est choisi par le client (ex: 500ml ou 1L) :
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
1. Tu calcules le montant total : Prix unitaire de la bouteille x Quantité + Frais de livraison Yaoundé (minimum 1 000 XAF selon le quartier) = TOTAL À PAYER.
2. CONFIDENTIALITÉ STRICTE : Tu n'affiches JAMAIS le coût des fruits ou du contenant vide, seulement le prix unitaire tout compris de la bouteille finie.
3. Tu présentes le récapitulatif clair :
"Voici le récapitulatif de votre commande :
• [Quantité] bouteille(s) [Format] de [Nom de la recette] : [Prix unitaire] XAF (soit [Sous-total] XAF)
• Livraison à [Quartier] : [Frais livraison à partir de 1 000 XAF] XAF
👉 TOTAL À PAYER : [Total] XAF (Paiement Mobile Money ou à la livraison).

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
Tu le remercies chaleureusement, tu lui annonces avec enthousiasme que sa commande est validée et part en préparation, et qu'il reçoit immédiatement ci-dessous sa facture officielle FYS ainsi que la fiche nutritionnelle de son cocktail en PDF ! Tu insères TOUT À LA FIN le bloc technique :
:::ORDER_JSON
{
  "cocktailName": "Nom de la recette",
  "fruits": ["Fruit1", "Fruit2", "Fruit3"],
  "bottleSize": "500ml",
  "quantity": 1,
  "unitPrice": 2000,
  "deliveryFee": 1000,
  "totalPrice": 3000,
  "district": "Quartier de livraison",
  "instructions": "Précisions particulières",
  "hasAddedSugar": false
}
:::

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
    try {
      const entry = req.body?.entry?.[0];
      const changes = entry?.changes?.[0]?.value;

      // Vérifier si un message texte, audio, image ou interactif (bouton cliqué) est présent
      const message = changes?.messages?.[0];
      const isAudioMessage = message?.type === 'audio' || message?.type === 'voice';
      const isImageMessage = message?.type === 'image';
      const isTextMessage = message?.type === 'text';
      const isInteractiveMessage = message?.type === 'interactive';

      if (!message || (!isTextMessage && !isAudioMessage && !isImageMessage && !isInteractiveMessage)) {
        return res.status(200).json({ status: 'ignored_unsupported_type' });
      }

      const messageId = message.id;
      const senderPhone = message.from; // Numéro international (ex: 237699000000)
      const rawSenderName = changes?.contacts?.[0]?.profile?.name || '';
      const cleanSenderName = rawSenderName
        .replace(/[\p{Extended_Pictographic}\uFE0F\u200D\u20E3]/gu, '')
        .replace(/[^\p{L}\p{N}\s'-]/gu, '')
        .replace(/\s+/g, ' ')
        .trim();
      const senderName = cleanSenderName || 'Cher client';
      let senderText = message.text?.body?.trim() || message.image?.caption?.trim() || '';
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
      let matchedUserEmail = '';

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

      let bottle500Base = 1500;
      let bottle1LBase = 2500;
      let deliveryFee = 1000;
      const availableFruits: { id: string; name: string; price: number }[] = [];

      if (db) {
        try {
          // ── Détection d'un brouillon de commande web FYS (ex: #FYS-7K2X) ──
          const draftMatch = senderText.match(/#?(FYS-[A-Z0-9]{4})/i);
          if (draftMatch) {
            webDraftCode = draftMatch[1].toUpperCase();
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

          // Charger en parallèle la tarification et le catalogue de fruits
          const [pricingDoc, fruitsSnap] = await Promise.all([
            db.collection('settings').doc('pricing').get().catch(() => null),
            db.collection('fruits').get().catch(() => null),
          ]);

          if (pricingDoc && pricingDoc.exists) {
            const p = pricingDoc.data();
            if (typeof p?.bottle500mlBase === 'number') bottle500Base = p.bottle500mlBase;
            if (typeof p?.bottle1LBase === 'number') bottle1LBase = p.bottle1LBase;
            if (typeof p?.deliveryFee === 'number') deliveryFee = Math.max(1000, p.deliveryFee);
          }

          if (fruitsSnap) {
            fruitsSnap.docs.forEach((doc: any) => {
              const d = doc.data();
              if (d.isActive !== false) {
                availableFruits.push({
                  id: doc.id,
                  name: d.name || doc.id,
                  price: typeof d.price === 'number' ? d.price : 0,
                });
              }
            });
          }

          // Pré-calcul des tarifs stricts si commande initiée depuis le site FYS
          const webDraftIngredients = Array.isArray(webDraft?.cocktail?.ingredients) ? webDraft.cocktail.ingredients : [];
          const webDraftIngredientsSum = webDraftIngredients.reduce((s: number, i: any) => s + (Number(i.priceSnapshot) || 0), 0);
          const exactDraftPrice500 = (typeof webDraft?.cocktail?.totalPrice === 'number' && webDraft.cocktail.totalPrice > 0)
            ? webDraft.cocktail.totalPrice
            : (bottle500Base + webDraftIngredientsSum);
          const exactDraftPrice1L = bottle1LBase + webDraftIngredientsSum;
          const exactDraftDeliveryFee = typeof webDraft?.deliveryFee === 'number'
            ? Math.max(1000, webDraft.deliveryFee)
            : Math.max(1000, deliveryFee);

          const usersRef = db.collection('users');
          let existingUserDoc: any = null;

          // 1. Si le brouillon web a été initié par un utilisateur connecté sur le site
          if (webDraft?.userId && webDraft.userId !== 'guest') {
            const draftUserSnap = await usersRef.doc(webDraft.userId).get().catch(() => null);
            if (draftUserSnap && draftUserSnap.exists) {
              existingUserDoc = draftUserSnap;
            }
          }

          // 2. Sinon, rechercher par les variantes du numéro WhatsApp (format local, international, etc.)
          if (!existingUserDoc) {
            const safeUserVariants = phoneVariants.length > 0 ? phoneVariants.slice(0, 30) : [senderPhone];
            const querySnap = await usersRef.where('phone', 'in', safeUserVariants).limit(1).get();
            if (!querySnap.empty) {
              existingUserDoc = querySnap.docs[0];
            }
          }

          // 3. Sinon, si le message contient un email (ex: compte Google existant), lier automatiquement le compte
          if (!existingUserDoc && senderText) {
            const emailMatch = senderText.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
            if (emailMatch) {
              const email = emailMatch[1].toLowerCase().trim();
              const emailSnap = await usersRef.where('email', '==', email).limit(1).get();
              if (!emailSnap.empty) {
                existingUserDoc = emailSnap.docs[0];
                console.log(`[whatsapp-webhook] 🔗 Google account linked via email ${email} to phone ${senderPhone}`);
              }
            }
          }

          if (existingUserDoc) {
            const userData = existingUserDoc.data();
            userDocRef = existingUserDoc.ref;
            matchedUserEmail = userData?.email || '';

            // Assurer que le document utilisateur possède bien son uid et son numéro certifié
            const userUpdates: any = {};
            if (!userData?.uid) userUpdates.uid = userDocRef.id;
            if (!userData?.phone) userUpdates.phone = senderPhone;

            // Si le brouillon web fournit un prénom et que le nom actuel est générique, le mettre à jour
            if (webDraft?.customerName && (!userData.name || userData.name === senderPhone || userData.name === 'Client WhatsApp')) {
              userUpdates.name = webDraft.customerName.trim();
            }

            if (Object.keys(userUpdates).length > 0) {
              await userDocRef.set(userUpdates, { merge: true });
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

              userProfileContext = `\n\nCOMMANDE EN COURS INITIÉE SUR LE SITE FYS (RÉFÉRENCE #${webDraftCode}) :
- Client : ${customerGreetingName}
- Cocktail composé sur le web : "${cocktailName}"
- Ingrédients du mélange : ${ingredientsNames}
- Sucre : ${sugarMention}
- Profil de santé du client :
  * Objectifs : ${goals.length ? goals.join(', ') : (webDraft.healthProfile?.goals?.join(', ') || 'Forme & Bien-être')}
  * Conditions médicales : ${conditions.length ? conditions.join(', ') : (webDraft.healthProfile?.healthConditions?.join(', ') || 'Aucune condition particulière')}
  * Allergies / Intolérances : ${allergies.length ? allergies.join(', ') : (webDraft.healthProfile?.allergies?.join(', ') || 'Aucune allergie')}

TARIFS OFFICIELS DU SITE POUR CETTE RECETTE (PRIX FERMES ET DÉFINITIFS, NE RECALCULE RIEN) :
- Format 500ml : ${exactDraftPrice500} XAF par bouteille
- Format 1L : ${exactDraftPrice1L} XAF par bouteille
- Frais de livraison Yaoundé : à partir de ${exactDraftDeliveryFee} XAF (selon le quartier)

CONSIGNE CRITIQUE D'ACCUEIL & DE TARIFICATION :
1. Accueille très chaleureusement ${customerGreetingName} par son prénom.
2. Confirme-lui expressément que sa commande #${webDraftCode} pour le jus "${cocktailName}" (${ingredientsNames}) et son profil de santé ont bien été reçus.
3. NE LUI REPOSE SURTOUT PAS le questionnaire de santé (son profil est déjà enregistré).
4. Propose-lui simplement de choisir le format de sa bouteille (500ml ou 1L) et demande son quartier de livraison pour finaliser.
5. RÈGLE COMMERCIALE CRITIQUE SUR LE PRIX : Utilise UNIQUEMENT les tarifs officiels ci-dessus (${exactDraftPrice500} XAF pour 500ml, ou ${exactDraftPrice1L} XAF pour 1L) + la livraison (à partir de ${exactDraftDeliveryFee} XAF, minimum 1 000 XAF selon le quartier). INTERDICTION FORMELLE d'annoncer 500 XAF. Tu annonces UNIQUEMENT le prix de vente total par bouteille.`;
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

            // Récupérer les 8 derniers messages pour garder le fil naturel
            const historySnap = await userDocRef
              .collection('whatsapp_messages')
              .orderBy('timestamp', 'desc')
              .limit(8)
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
            }
          } else {
            // NOUVEAU CLIENT : Création officielle du compte avec son numéro au moment de l'envoi WhatsApp
            const newDocRef = usersRef.doc();
            const rawInitName = webDraft?.customerName?.trim() || senderName;
            const initialName = rawInitName
              .replace(/[\p{Extended_Pictographic}\uFE0F\u200D\u20E3]/gu, '')
              .replace(/[^\p{L}\p{N}\s'-]/gu, '')
              .replace(/\s+/g, ' ')
              .trim() || 'Cher client';
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
              createdAt: FieldValue.serverTimestamp(),
              updatedAt: FieldValue.serverTimestamp(),
            });
            userDocRef = newDocRef;

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

            if (webDraft) {
              const cocktailName = webDraft.cocktail?.name || 'Mon Jus Personnalisé';
              const ingredientsNames = webDraftIngredients.length
                ? webDraftIngredients.map((i: any) => i.fruitName || i.name).filter(Boolean).join(', ')
                : 'Fruits frais';
              const sugarMention = webDraft.hasAddedSugar ? 'Avec sucre ajouté' : 'Sans sucre ajouté (100% pur)';

              userProfileContext = `\n\nCOMMANDE EN COURS INITIÉE SUR LE SITE FYS (RÉFÉRENCE #${webDraftCode}) :
- Client : ${initialName}
- Cocktail composé sur le web : "${cocktailName}"
- Ingrédients du mélange : ${ingredientsNames}
- Sucre : ${sugarMention}
- Profil de santé du client :
  * Objectifs : ${initialGoals.length ? initialGoals.join(', ') : 'Forme & Bien-être'}
  * Conditions médicales : ${initialConditions.length ? initialConditions.join(', ') : 'Aucune condition particulière'}
  * Allergies / Intolérances : ${initialAllergies.length ? initialAllergies.join(', ') : 'Aucune allergie'}

TARIFS OFFICIELS DU SITE POUR CETTE RECETTE (PRIX FERMES ET DÉFINITIFS, NE RECALCULE RIEN) :
- Format 500ml : ${exactDraftPrice500} XAF par bouteille
- Format 1L : ${exactDraftPrice1L} XAF par bouteille
- Frais de livraison Yaoundé : à partir de ${exactDraftDeliveryFee} XAF (selon le quartier)

CONSIGNE CRITIQUE D'ACCUEIL & DE TARIFICATION :
1. Accueille très chaleureusement ${initialName} par son prénom.
2. Confirme-lui expressément que sa commande #${webDraftCode} pour le jus "${cocktailName}" (${ingredientsNames}) et son profil de santé ont bien été reçus.
3. NE LUI REPOSE SURTOUT PAS le questionnaire de santé (son profil est déjà enregistré).
4. Propose-lui simplement de choisir le format de sa bouteille (500ml ou 1L) et demande son quartier de livraison pour finaliser.
5. RÈGLE COMMERCIALE CRITIQUE SUR LE PRIX : Utilise UNIQUEMENT les tarifs officiels ci-dessus (${exactDraftPrice500} XAF pour 500ml, ou ${exactDraftPrice1L} XAF pour 1L) + la livraison (à partir de ${exactDraftDeliveryFee} XAF, minimum 1 000 XAF selon le quartier). INTERDICTION FORMELLE d'annoncer 500 XAF. Tu annonces UNIQUEMENT le prix de vente total par bouteille.`;
            } else {
              userProfileContext = `\n\nSTATUT PROFIL DE SANTÉ : NOUVEAU CLIENT SANS PROFIL ENREGISTRÉ.
CONSIGNE CRITIQUE : Accueille-le chaleureusement et réalise son bilan de santé bienveillant (objectifs, conditions de santé, allergies). Dès qu'il a répondu, insère le bloc :::PROFILE_JSON { "healthConditions": [...], "allergies": [...], "goals": [...] } ::: pour enregistrer son profil dans la base FYS.`;
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

      // Appeler le modèle Gemini avec le prompt NutriFYS et tout l'historique
      if (!GEMINI_API_KEY) {
        console.error('[whatsapp-webhook] GEMINI_API_KEY missing');
        await sendWhatsAppMessage(
          senderPhone,
          `Bonjour ${senderName} ! Bienvenue chez FYS. Notre assistant NutriFYS est en cours d'initialisation. Nous vous répondons dans un instant.`,
        );
        return res.status(200).json({ status: 'no_gemini_key' });
      }

      const hasHistory = chatHistoryForGemini.length > 0;
      const conversationRules = hasHistory
        ? `\nRÈGLE CRITIQUE DE CONTINUITÉ : La conversation est DÉJÀ ENGAGÉE. Ne dis SURTOUT PAS 'Bonjour', ne te représente pas, ne dis pas 'Bienvenue chez FYS'. Réponds directement et naturellement en rebondissant sur la réponse du client.`
        : `\nRÈGLE D'ACCUEIL : C'est le tout premier message, salue chaleureusement avec respect.`;

      // Construction de la grille tarifaire interne pour NutriFYS
      const fruitsSummary = availableFruits.length
        ? availableFruits.map((f) => `- ${f.name} : +${f.price} XAF`).join('\n')
        : '- Fruits standards';

      const dynamicPricingContext = `\n\nTARIFICATION FYS (GUIDE INTERNE STRICTEMENT CONFIDENTIEL) :
Barème interne (uniquement pour les créations en direct sur WhatsApp sans commande préalable du site) :
- Bouteille 500ml : base ${bottle500Base} XAF + suppléments fruits
- Bouteille 1L : base ${bottle1LBase} XAF + suppléments fruits
- Frais de livraison Yaoundé : à partir de ${deliveryFee} XAF (selon quartier)
Suppléments fruits disponibles :
${fruitsSummary}

RÈGLE COMMERCIALE CRITIQUE (OBLIGATION ABSOLUE) :
🚫 INTERDICTION TOTALE DE DÉTAILLER LES ÉLÉMENTS DE COÛT AU CLIENT :
- Ne mentionne JAMAIS le prix de base du contenant (${bottle500Base} ou ${bottle1LBase} XAF).
- Ne mentionne JAMAIS le prix d'ajout individuel de chaque fruit.
- Ne montre JAMAIS d'opération mathématique ("${bottle500Base} + ...").
- Le client doit voir UNIQUEMENT le prix de vente unitaire final de la bouteille composée.
- Frais de livraison : À PARTIR DE 1 000 XAF (minimum 1 000 XAF selon la distance et le quartier à Yaoundé). INTERDICTION FORMELLE d'annoncer 500 XAF ou tout montant inférieur à 1 000 XAF.
Exemple conforme :
"• 1 bouteille 500ml [Nom du jus] : [Prix unitaire final calculé] XAF
• Livraison à [Quartier] : [Frais de livraison, à partir de ${deliveryFee} XAF] XAF
👉 TOTAL À PAYER : [Total] XAF"`;

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
        if (interactiveButtonId.startsWith('btn_order')) {
          explicitAction = `[Le client a cliqué sur 'Commander'. RÈGLE STRICTE : Pose UNIQUEMENT la question du format (500ml ou 1L) avec les boutons :::BUTTONS. Ne pose AUCUNE autre question (pas de quantité, pas de quartier à cette étape) !]`;
        } else if (interactiveButtonId.startsWith('btn_nutrition')) {
          explicitAction = `[Le client a cliqué sur 'Fiche nutrition' : présente-lui la fiche nutritionnelle complète et détaillée de son cocktail].`;
        } else if (interactiveButtonId.startsWith('btn_format_500ml')) {
          explicitAction = `[Le client a sélectionné le format 500ml. RÈGLE STRICTE : Remercie-le et pose UNIQUEMENT la question du nombre de bouteilles avec les boutons :::BUTTONS (1 Bouteille, 2 Bouteilles, 3 Bouteilles). Ne demande PAS encore le quartier !]`;
        } else if (interactiveButtonId.startsWith('btn_format_1l')) {
          explicitAction = `[Le client a sélectionné le format 1 Litre. RÈGLE STRICTE : Remercie-le et pose UNIQUEMENT la question du nombre de bouteilles avec les boutons :::BUTTONS (1 Bouteille, 2 Bouteilles, 3 Bouteilles). Ne demande PAS encore le quartier !]`;
        } else if (interactiveButtonId.startsWith('btn_qty_')) {
          explicitAction = `[Le client a choisi la quantité : "${senderText}". RÈGLE STRICTE : Demande-lui UNIQUEMENT dans quel quartier de Yaoundé il souhaite être livré avec la liste déroulante :::LIST des quartiers, en précisant bien qu'il peut aussi l'écrire s'il ne figure pas dans la liste].`;
        } else if (interactiveButtonId.startsWith('loc_')) {
          explicitAction = `[Le client a choisi son quartier de livraison : "${senderText}". RÈGLE STRICTE : Établis maintenant le récapitulatif devis complet avec calcul des frais de livraison (à partir de 1 000 XAF selon la zone) et demande-lui s'il valide avec les boutons :::BUTTONS [Valider commande] et [Modifier]].`;
        } else if (interactiveButtonId.startsWith('btn_confirm_order')) {
          explicitAction = `[Le client a cliqué sur 'Valider commande' : il approuve et confirme son devis ! Remercie-le chaleureusement, confirme que sa commande est enregistrée et insère le bloc :::ORDER_JSON avec les tarifs exacts convenus].`;
        } else if (interactiveButtonId.startsWith('btn_edit_order')) {
          explicitAction = `[Le client a cliqué sur 'Modifier' : demande-lui avec bienveillance ce qu'il souhaite modifier : fruits, format, quantité ou adresse de livraison].`;
        }
        currentUserParts.push({ text: explicitAction });
      } else {
        currentUserParts.push({ text: senderText });
      }

      const contentsPayload = [
        ...chatHistoryForGemini,
        { role: 'user' as const, parts: currentUserParts },
      ];

      const fullSystemPrompt = `${NUTRIFYS_WHATSAPP_SYSTEM_PROMPT}\n\nClient : ${senderName} (${senderPhone})${userProfileContext}${dynamicPricingContext}${conversationRules}`;

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
        if (webDraftCode) {
          aiReply = `Bonjour ${senderName} ! 🍹 Votre mélange personnalisé FYS est bien reçu. Souhaitez-vous le commander dès maintenant ou découvrir sa composition et ses bienfaits nutritionnels ?`;
          buttonsToSend = [
            { id: 'btn_order', title: 'Commander' },
            { id: 'btn_nutrition', title: 'Fiche nutrition' },
          ];
        } else if (isInteractiveMessage && interactiveButtonId) {
          if (interactiveButtonId.startsWith('btn_order')) {
            aiReply = `Avec grand plaisir ${senderName} ! 🥤 Quel format préférez-vous (500ml ou 1 Litre) et dans quel quartier de Yaoundé souhaitez-vous être livré ?`;
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
          aiReply = `Bonjour ${senderName} ! 🌿 Je suis ravi de vous retrouver chez FYS. Que puis-je faire pour vous aujourd'hui : une nouvelle commande de cocktail frais ou un conseil nutrition ?`;
          buttonsToSend = [
            { id: 'btn_order', title: 'Commander' },
            { id: 'btn_nutrition', title: 'Fiche nutrition' },
          ];
        }
      }
      console.log('[whatsapp-webhook] NutriFYS generated reply:', aiReply);

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

      // 2. Traitement automatique d'une commande validée par le client
      let createdOrderInfo: {
        orderId: string;
        orderDoc: any;
        ingredients: any[];
      } | null = null;

      const orderMatch = aiReply.match(/:::ORDER_JSON\s*([\s\S]*?)\s*:::?/);
      if (orderMatch && db) {
        try {
          const orderData = parseSafeJson(orderMatch[1]);
          if (!orderData) {
            console.warn('[whatsapp-webhook] Could not parse ORDER_JSON from AI reply');
          } else {
            console.log('[whatsapp-webhook] Order detected from WhatsApp:', orderData);

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
            } else {
              const bottleSize: '500ml' | '1L' = orderData.bottleSize === '1L' ? '1L' : '500ml';
              const bottleSizeLabel = bottleSize === '1L' ? '1 L' : '500 ml';
              const baseBottlePrice = bottleSize === '1L' ? bottle1LBase : bottle500Base;
              const quantity = Math.max(1, Number(orderData.quantity) || 1);

              // 1. Ingrédients du mélange : priorité absolue aux ingrédients réels et complets du brouillon web s'il existe
              let finalIngredients: any[] = [];
              if (Array.isArray(webDraft?.cocktail?.ingredients) && webDraft.cocktail.ingredients.length > 0) {
                finalIngredients = webDraft.cocktail.ingredients.map((ing: any) => ({
                  fruitId: ing.fruitId || ing.id || 'fruit',
                  fruitName: ing.fruitName || ing.name || 'Fruit',
                  quantityGrams: Number(ing.quantityGrams) || 100,
                  priceSnapshot: Number(ing.priceSnapshot) || 0,
                  role: ing.role || 'fruit',
                }));
              } else {
                const chosenFruitNames: string[] = Array.isArray(orderData.fruits) ? orderData.fruits : [];
                finalIngredients = chosenFruitNames.map((fName: string) => {
                  const clean = fName.trim().toLowerCase();
                  const found = availableFruits.find((af) => {
                    const afClean = af.name.toLowerCase();
                    return afClean === clean || af.id.toLowerCase() === clean || afClean.includes(clean) || clean.includes(afClean);
                  });
                  return {
                    fruitId: found ? found.id : fName.toLowerCase().replace(/\s+/g, '_'),
                    fruitName: found ? found.name : fName,
                    quantityGrams: 100,
                    priceSnapshot: found ? found.price : 0,
                    role: 'fruit' as const,
                  };
                });
              }

              const ingredientsPriceSum = finalIngredients.reduce((sum: number, ing: any) => sum + (Number(ing.priceSnapshot) || 0), 0);

              // 2. SYNCHRONISATION ABSOLUE DU PRIX (ZÉRO ÉCART AVEC LE PRIX ANNONCÉ PAR NUTRIFYS) :
              // Si commande initiée sur le web : tarif officiel du site (500ml ou 1L)
              // Si commande créée sur WhatsApp : prix unitaire convenu et validé avec le client dans la discussion
              let pricePerBottle = baseBottlePrice + ingredientsPriceSum;

              if (webDraft) {
                if (bottleSize === '500ml' && typeof webDraft.cocktail?.totalPrice === 'number' && webDraft.cocktail.totalPrice > 0) {
                  pricePerBottle = webDraft.cocktail.totalPrice;
                } else if (bottleSize === '1L') {
                  pricePerBottle = bottle1LBase + ingredientsPriceSum;
                }
              } else if (typeof orderData.unitPrice === 'number' && orderData.unitPrice >= baseBottlePrice) {
                // Synchronisation exacte avec le prix unitaire annoncé par NutriFYS dans le chat
                pricePerBottle = Math.round(orderData.unitPrice);
              }

              const lineTotal = pricePerBottle * quantity;

              // Frais de livraison : priorité au draft web, puis au prix convenu dans orderData, sinon barème par défaut (minimum 1000 XAF)
              let finalDeliveryFee = Math.max(1000, deliveryFee);
              if (webDraft && typeof webDraft.deliveryFee === 'number') {
                finalDeliveryFee = Math.max(1000, webDraft.deliveryFee);
              } else if (typeof orderData.deliveryFee === 'number' && orderData.deliveryFee >= 0) {
                finalDeliveryFee = Math.max(1000, Math.round(orderData.deliveryFee));
              }

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
                userNameSnapshot: webDraft?.customerName?.trim() || senderName,
                userPhoneSnapshot: senderPhone,
                userEmailSnapshot: matchedUserEmail || webDraft?.customerEmail || '',
                cocktailId: webDraft?.cocktail?.id || 'whatsapp-custom',
                cocktailNameSnapshot: orderData.cocktailName || webDraft?.cocktail?.name || 'Cocktail Santé WhatsApp',
                cocktailIngredientsSnapshot: finalIngredients,
                hasAddedSugar: orderData.hasAddedSugar !== undefined ? !!orderData.hasAddedSugar : (webDraft?.hasAddedSugar ?? false),
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
                deliveryFee: finalDeliveryFee,
                totalPrice,
                deliveryDetails: {
                  district: orderData.district || 'Yaoundé',
                  phone: senderPhone,
                  instructions: orderData.instructions || 'Commande directe WhatsApp',
                },
                ...(webDraft?.aiAnalysis ? { aiAnalysisSnapshot: webDraft.aiAnalysis } : {}),
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

              // Marquer le brouillon web comme converti dans whatsapp_drafts
              if (webDraftCode) {
                await db.collection('whatsapp_drafts').doc(webDraftCode).update({
                  status: 'converted',
                  orderId: orderRef.id,
                  convertedAt: FieldValue.serverTimestamp(),
                }).catch((e: any) => console.warn('[whatsapp-webhook] Could not mark draft as converted:', e));
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
          }
        } catch (orderErr) {
          console.error('[whatsapp-webhook] Error creating WhatsApp order in Firestore:', orderErr);
        } finally {
          // Nettoyer le bloc technique avant envoi au client
          aiReply = aiReply.replace(/:::ORDER_JSON[\s\S]*?:::?/g, '').trim();

          // Nettoyer tout lien URL brut dans la réponse pour ne jamais afficher de lien long
          aiReply = aiReply.replace(/https?:\/\/fys-app\.com[^\s]*/g, '').replace(/👉\s*$/gm, '').trim();
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
              footerText: parsed.footerText || 'NutriFYS · Votre nutritionniste sur-mesure',
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
          footerText: 'NutriFYS · Votre nutritionniste sur-mesure',
        };
      }

      // ── Extraction et détection des listes interactives Meta (Menu déroulant) ────
      let listToSend: WhatsAppListData | null = null;
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
      let buttonsToSend: WhatsAppInteractiveButton[] = [];
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
        listToSend = YAOUNDE_DISTRICTS_LIST;
      }

      // 2. Choix de la quantité de bouteilles (Boutons 1, 2, 3)
      if (
        !listToSend &&
        buttonsToSend.length === 0 &&
        !orderMatch &&
        (aiReply.toLowerCase().includes('combien de bouteilles') ||
         aiReply.toLowerCase().includes('nombre de bouteilles') ||
         aiReply.toLowerCase().includes('quantité de bouteilles') ||
         aiReply.toLowerCase().includes('combien de bouteille'))
      ) {
        buttonsToSend = [
          { id: 'btn_qty_1', title: '1 Bouteille' },
          { id: 'btn_qty_2', title: '2 Bouteilles' },
          { id: 'btn_qty_3', title: '3 Bouteilles' },
        ];
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
        buttonsToSend = [
          { id: 'btn_format_500ml', title: 'Format 500ml' },
          { id: 'btn_format_1l', title: 'Format 1 Litre' },
        ];
      }

      // 4. Devis récapitulatif demandant confirmation
      if (
        !listToSend &&
        buttonsToSend.length === 0 &&
        !orderMatch &&
        aiReply.includes('TOTAL À PAYER') &&
        (aiReply.toLowerCase().includes('convient') || aiReply.toLowerCase().includes('valider'))
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
        (webDraftCode || aiReply.toLowerCase().includes('fiche nutritionnelle') || aiReply.toLowerCase().includes('passer à la commande'))
      ) {
        buttonsToSend = [
          { id: 'btn_order', title: 'Commander' },
          { id: 'btn_nutrition', title: 'Fiche nutrition' },
        ];
      }

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
          'NutriFYS · Votre nutritionniste sur-mesure'
        );
      } else if (buttonsToSend.length > 0) {
        console.log(`[whatsapp-webhook] 🔘 Sending message with ${buttonsToSend.length} interactive buttons to ${senderPhone}...`);
        sent = await sendWhatsAppInteractiveButtons(
          senderPhone,
          aiReply,
          buttonsToSend,
          'NutriFYS · FYS',
          'NutriFYS · Votre nutritionniste sur-mesure'
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
                    await sendWhatsAppDocument(senderPhone, mId, `Facture_${shortId}.pdf`, `📄 Voici votre facture officielle FYS #${shortId}`);
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
                    await sendWhatsAppDocument(senderPhone, mId, `Fiche_NutriFYS.pdf`, `🌿 Voici la fiche nutritionnelle de votre cocktail ${cocktailName}`);
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
      return res.status(500).json({ error: err?.message || 'Internal Error' });
    }
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
}
