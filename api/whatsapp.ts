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

  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to,
    type: 'text',
    text: { preview_url: false, body: text },
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
  const safeButtons = (buttons || [])
    .filter((b) => b && typeof b.title === 'string' && b.title.trim().length > 0)
    .slice(0, 3)
    .map((b, idx) => ({
      type: 'reply' as const,
      reply: {
        id: (b.id || `btn_${idx}`).slice(0, 256),
        // Limite stricte de Meta : 20 caractères max, 100% sans emoji ni markdown
        title: cleanButtonTitle(b.title, `Option ${idx + 1}`),
      },
    }));

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
      type: 'text',
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

    if (!response.ok) {
      console.warn('[whatsapp] Interactive message not accepted by Meta, falling back to text message...');
      return sendWhatsAppMessage(to, textForBody);
    }

    return true;
  } catch (fetchErr) {
    console.error('[whatsapp] Network error sending interactive buttons, falling back to text:', fetchErr);
    return sendWhatsAppMessage(to, textForBody);
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

ÉTAPE 4 : COMMANDE & CALCUL COMMERCIAL DU PRIX
Quand le client souhaite commander (soit directement à l'étape 2, soit après avoir consulté sa fiche nutritionnelle) :
1. Demande le format souhaité (500ml ou 1L), la quantité de bouteilles et son quartier de livraison à Yaoundé.
2. CALCUL COMMERCIAL DU PRIX (PRODUIT FINI UNIQUEMENT, CONFIDENTIALITÉ TOTALE DES COÛTS INTERNES) :
- RÈGLE COMMERCIALE CRITIQUE : Tu ne vends JAMAIS de bouteilles vides ni de fruits au détail. Tu vends des jus et cocktails santé d'excellence déjà embouteillés.
- INTERDICTION FORMELLE ET ABSOLUE : Tu NE DOIS JAMAIS mentionner le prix du contenant vide, ni le prix individuel des fruits, ni aucune opération d'addition (interdit d'écrire "1500 + 200"). Le détail des éléments fait perdre de l'argent et décrédibilise l'offre FYS.
- Tu annonces EXCLUSIVEMENT le prix unitaire final tout compris de la bouteille composée.
- Tu multiplies par la quantité et tu ajoutes les frais de livraison pour afficher le TOTAL À PAYER.
Exemple strict de récapitulatif devis :
"Voici le récapitulatif de votre commande :
• [Quantité] bouteille(s) [Format: 500ml ou 1L] de [Nom du jus] : [Prix unitaire] XAF (soit [Sous-total] XAF)
• Livraison à [Quartier] : [Frais livraison à partir de 1 000 XAF selon la zone] XAF
👉 TOTAL À PAYER : [Total] XAF (Paiement par Mobile Money ou au comptant à la livraison).

Est-ce que cela vous convient pour valider votre commande ?"

3. INTERDICTION FORMELLE : Ne mets JAMAIS le bloc :::ORDER_JSON dans ce message de devis. Le client DOIT voir le prix d'abord et valider !
4. C'est SEULEMENT après que le client a vu le prix et qu'il a répondu OUI / confirmé explicitement son accord que tu le remercies chaleureusement, tu lui indiques avec enthousiasme que sa commande est enregistrée et qu'il pourra retrouver tout son suivi et ses factures sur son tableau de bord client FYS, et tu insères TOUT À LA FIN le bloc technique avec les prix EXACTS convenus (pour synchronisation parfaite à 100% avec l'administration) :
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

STYLE DE COMMUNICATION WHATSAPP :
- Réponses aérées, faciles à lire sur un écran de smartphone (puces claires, émojis sobres).
- Phrases chaleureuses, empathiques et accessibles sans jargon médical hermétique.
- Pose UNE seule question à la fois pour laisser le client respirer et répondre aisément.

BOUTONS D'INTERACTION CLIC-DIRECT META WHATSAPP :
Pour éviter au client de taper du texte au clavier, tu peux ajouter TOUT À LA FIN de ton message un bloc de boutons cliquables :::BUTTONS [...] ::: (maximum 3 boutons, titre de chaque bouton STRICTEMENT SANS AUCUN ÉMOJI NI SYMBOLE, 20 caractères max) :

1. À l'accueil d'un brouillon web FYS (#FYS-XXXX) :
Propose le choix entre commander directement ou voir sa fiche santé :
:::BUTTONS
[
  {"id": "btn_order", "title": "Commander"},
  {"id": "btn_nutrition", "title": "Fiche nutrition"}
]
:::

2. Lors du choix du format de bouteille :
:::BUTTONS
[
  {"id": "btn_format_500ml", "title": "Format 500ml"},
  {"id": "btn_format_1l", "title": "Format 1 Litre"}
]
:::

3. Lors de la présentation du devis récapitulatif pour validation en 1 clic :
:::BUTTONS
[
  {"id": "btn_confirm_order", "title": "Valider commande"},
  {"id": "btn_edit_order", "title": "Modifier"}
]
:::`;

// ── Handler principal ─────────────────────────────────────────────────────────

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // 1. Vérification Webhook (GET) demandé par Meta
  if (req.method === 'GET') {
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
              const customerGreetingName = webDraft.customerName?.trim() || userData.name || senderName;

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
            const initialName = webDraft?.customerName?.trim() || senderName;
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
        let explicitAction = `[Action bouton cliqué : "${senderText}"]`;
        if (interactiveButtonId === 'btn_order') {
          explicitAction = `[Le client a cliqué sur le bouton 'Commander' : il souhaite commander ce mélange. Demande-lui le format souhaité (500ml ou 1L) et son quartier de livraison].`;
        } else if (interactiveButtonId === 'btn_nutrition') {
          explicitAction = `[Le client a cliqué sur le bouton 'Fiche nutrition' : présente-lui la fiche nutritionnelle complète et détaillée de son cocktail].`;
        } else if (interactiveButtonId === 'btn_confirm_order') {
          explicitAction = `[Le client a cliqué sur 'Valider commande' : il approuve et confirme son devis ! Remercie-le chaleureusement, confirme que sa commande est enregistrée et insère le bloc :::ORDER_JSON avec les tarifs exacts convenus].`;
        } else if (interactiveButtonId === 'btn_edit_order') {
          explicitAction = `[Le client a cliqué sur 'Modifier' : demande-lui avec bienveillance ce qu'il souhaite modifier : fruits, format ou adresse de livraison].`;
        } else if (interactiveButtonId === 'btn_format_500ml') {
          explicitAction = `[Le client a sélectionné le format 500ml].`;
        } else if (interactiveButtonId === 'btn_format_1l') {
          explicitAction = `[Le client a sélectionné le format 1 Litre].`;
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

      const primaryModel = process.env.GEMINI_WHATSAPP_MODEL || 'gemini-3-flash-preview';
      const fallbackModels = ['gemini-3.6-flash', 'gemini-flash-lite-latest'];
      const modelQueue = Array.from(new Set(['gemini-3-flash-preview', primaryModel, ...fallbackModels]));

      for (const modelCandidate of modelQueue) {
        try {
          const model = genAI.getGenerativeModel({
            model: modelCandidate,
            systemInstruction: fullSystemPrompt,
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 1200,
              thinkingConfig: { thinkingBudget: 0 },
            } as any,
          });
          console.log(`[whatsapp-webhook] Calling Gemini (${modelCandidate}) with conversation history & dynamic pricing...`);
          const result = await Promise.race([
            model.generateContent({ contents: contentsPayload }),
            new Promise<never>((_, reject) => setTimeout(() => reject(new Error(`Model ${modelCandidate} timed out after 5000ms`)), 5000)),
          ]);
          aiReply = result.response.text();
          if (aiReply) break;
        } catch (geminiErr: any) {
          console.warn(`[whatsapp-webhook] Gemini (${modelCandidate}) error, trying next fallback:`, geminiErr?.message);
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

          // Ajouter le lien direct vers le tableau de bord client FYS pour le suivi et les factures
          const trackingUrl = `https://fys-app.com/board/orders?phone=${senderPhone}`;
          if (!aiReply.includes('fys-app.com/board')) {
            aiReply += `\n\n📲 *Votre Tableau de bord FYS :*\nSuivez l'état de préparation de votre commande et retrouvez toutes vos factures ici :\n👉 ${trackingUrl}`;
          }
        }
      } else if (orderMatch) {
        aiReply = aiReply.replace(/:::ORDER_JSON[\s\S]*?:::?/g, '').trim();
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

      // Détection automatique intelligente en renfort si l'IA n'a pas inclus le bloc :::BUTTONS :
      // 1. Accueil d'un brouillon Web FYS (#FYS-XXXX)
      if (webDraftCode && buttonsToSend.length === 0 && !orderMatch) {
        buttonsToSend = [
          { id: 'btn_order', title: 'Commander' },
          { id: 'btn_nutrition', title: 'Fiche nutrition' },
        ];
      }

      // 2. Devis récapitulatif demandant confirmation
      if (
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

      // 3. Choix du format si la question du format est posée
      if (
        buttonsToSend.length === 0 &&
        !orderMatch &&
        (aiReply.toLowerCase().includes('quel format') || aiReply.toLowerCase().includes('format souhaité') || aiReply.toLowerCase().includes('500ml ou 1l'))
      ) {
        buttonsToSend = [
          { id: 'btn_format_500ml', title: 'Format 500ml' },
          { id: 'btn_format_1l', title: 'Format 1 Litre' },
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

      // Envoyer le message : avec boutons natifs interactifs si présents, sinon texte standard
      let sent = false;
      if (buttonsToSend.length > 0) {
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
      console.log('[whatsapp-webhook] Message sent to WhatsApp successfully:', { sent, sentAudio, interactive: buttonsToSend.length > 0 });

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
