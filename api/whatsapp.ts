import type { VercelRequest, VercelResponse } from '@vercel/node';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
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

function getAdminDb() {
  try {
    if (!process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_CLIENT_EMAIL || !process.env.FIREBASE_PRIVATE_KEY) {
      return null;
    }
    const app = getApps().length
      ? getApps()[0]
      : initializeApp({
          credential: cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
          }),
        });
    return getFirestore(app);
  } catch (e) {
    console.warn('[whatsapp-webhook] Firebase Admin init bypassed:', e);
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

ÉTAPE 4 : COMMANDE & CALCUL STRICT DU PRIX
Quand le client souhaite commander (soit directement à l'étape 2, soit après avoir consulté sa fiche nutritionnelle) :
1. Demande le format souhaité (500ml ou 1L), la quantité de bouteilles et son quartier de livraison à Yaoundé.
2. CALCUL STRICT DU PRIX (TRANSPARENCE POUR LE CLIENT, CALCUL EXACT EN INTERNE) :
- En interne, Prix unitaire d'une bouteille = Prix de base du contenant (selon la grille officielle fournie) + Somme des prix de chaque fruit/supplément du mélange.
- RÈGLE DE DISCRÉTION ABSOLUE : Tu NE DOIS JAMAIS mentionner le prix du contenant vide ni le prix individuel des fruits au client !
- Tu affiches UNIQUEMENT le prix unitaire final de la bouteille composée.
- Tu ajoutes les frais de livraison pour afficher le TOTAL À PAYER.
Exemple de devis récapitulatif :
"Voici le récapitulatif de votre commande :
• 1 bouteille 500ml de [Nom du jus] : [Prix bouteille calculé] XAF
• Livraison à [Quartier] : [Frais livraison] XAF
👉 TOTAL À PAYER : [Total] XAF (Paiement par Mobile Money ou au comptant à la livraison).

Est-ce que cela vous convient pour valider votre commande ?"

3. INTERDICTION FORMELLE : Ne mets JAMAIS le bloc :::ORDER_JSON dans ce message de devis. Le client DOIT voir le prix d'abord et valider !
4. C'est SEULEMENT après que le client a vu le prix et qu'il a répondu OUI / confirmé explicitement son accord que tu le remercies chaleureusement et insères TOUT À LA FIN :
:::ORDER_JSON
{
  "cocktailName": "Nom de la recette",
  "fruits": ["Fruit1", "Fruit2", "Fruit3"],
  "bottleSize": "500ml",
  "quantity": 1,
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
- Pose UNE seule question à la fois pour laisser le client respirer et répondre aisément.`;

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

      // Vérifier si un message texte, audio ou image est présent
      const message = changes?.messages?.[0];
      const isAudioMessage = message?.type === 'audio' || message?.type === 'voice';
      const isImageMessage = message?.type === 'image';
      const isTextMessage = message?.type === 'text';

      if (!message || (!isTextMessage && !isAudioMessage && !isImageMessage)) {
        return res.status(200).json({ status: 'ignored_unsupported_type' });
      }

      const messageId = message.id;
      const senderPhone = message.from; // Numéro international (ex: 237699000000)
      let senderText = message.text?.body?.trim() || message.image?.caption?.trim() || '';
      const senderName = changes?.contacts?.[0]?.profile?.name || 'Cher client';

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

      const messageKind = isAudioMessage ? 'audio' : isImageMessage ? 'image' : 'text';
      console.log(`[whatsapp-webhook] Processing ${messageKind} message ${messageId || ''} from ${senderPhone} (${senderName}): "${senderText}"`);

      // Initialiser la base Firestore (si disponible) et charger le contexte client & tarifaire
      let userProfileContext = '';
      const chatHistoryForGemini: { role: 'user' | 'model'; parts: { text: string }[] }[] = [];
      const db = getAdminDb();
      let userDocRef: any = null;

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
      let deliveryFee = 500;
      const availableFruits: { id: string; name: string; price: number }[] = [];

      if (db) {
        try {
          // Charger en parallèle la tarification et le catalogue de fruits
          const [pricingDoc, fruitsSnap] = await Promise.all([
            db.collection('settings').doc('pricing').get().catch(() => null),
            db.collection('fruits').get().catch(() => null),
          ]);

          if (pricingDoc && pricingDoc.exists) {
            const p = pricingDoc.data();
            if (typeof p?.bottle500mlBase === 'number') bottle500Base = p.bottle500mlBase;
            if (typeof p?.bottle1LBase === 'number') bottle1LBase = p.bottle1LBase;
            if (typeof p?.deliveryFee === 'number') deliveryFee = p.deliveryFee;
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

          const usersRef = db.collection('users');
          const querySnap = await usersRef.where('phone', '==', senderPhone).limit(1).get();

          if (!querySnap.empty) {
            const userData = querySnap.docs[0].data();
            userDocRef = querySnap.docs[0].ref;

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
            const newDoc = await usersRef.add({
              name: senderName,
              phone: senderPhone,
              role: 'customer',
              channel: 'whatsapp',
              createdAt: FieldValue.serverTimestamp(),
            });
            userDocRef = newDoc;
            userProfileContext = `\n\nSTATUT PROFIL DE SANTÉ : NOUVEAU CLIENT SANS PROFIL ENREGISTRÉ.
CONSIGNE CRITIQUE : Accueille-le chaleureusement et réalise son bilan de santé bienveillant (objectifs, conditions de santé, allergies). Dès qu'il a répondu, insère le bloc :::PROFILE_JSON { "healthConditions": [...], "allergies": [...], "goals": [...] } ::: pour enregistrer son profil dans la base FYS.`;
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

      // Construction de la grille tarifaire exacte pour le calcul interne de NutriFYS
      const fruitsSummary = availableFruits.length
        ? availableFruits.map((f) => `- ${f.name} (prix ajout: ${f.price} XAF)`).join('\n')
        : '- Fruits standards (prix ajout: 0 XAF)';

      const dynamicPricingContext = `\n\nTARIFICATION OFFICIELLE FYS (POUR TON CALCUL INTERNE DU PRIX) :
- Base contenant 500ml : ${bottle500Base} XAF
- Base contenant 1L : ${bottle1LBase} XAF
- Frais de livraison Yaoundé : ${deliveryFee} XAF

LISTE DES FRUITS & SUPPLÉMENTS DISPONIBLES ET LEURS PRIX D'AJOUT :
${fruitsSummary}

MÉTHODE EXACTE DE CALCUL DU PRIX :
Pour chaque bouteille de jus que tu composes avec le client :
1. Prends le prix de base du contenant (${bottle500Base} XAF pour 500ml, ou ${bottle1LBase} XAF pour 1L).
2. Ajoute le prix d'ajout de chaque fruit présent dans la recette (selon la liste ci-dessus).
   Exemple : 500ml [Fruit A (0 XAF) + Fruit B (100 XAF)] = ${bottle500Base} + 0 + 100 = ${bottle500Base + 100} XAF par bouteille.
3. Multiplie par le nombre de bouteilles.
4. Ajoute les frais de livraison (${deliveryFee} XAF).

RÈGLE D'OR DE CONFIDENTIALITÉ :
NE RÉVÈLE JAMAIS AU CLIENT LE PRIX DU CONTENANT NI LE PRIX DE CHAQUE FRUIT !
Pour le client, affiche UNIQUEMENT le prix unitaire final de la bouteille.
Exemple :
"• 1 bouteille 500ml [Nom du jus] : [Prix bouteille calculé] XAF
• Livraison à [Quartier] : ${deliveryFee} XAF
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
      } else {
        currentUserParts.push({ text: senderText });
      }

      const contentsPayload = [
        ...chatHistoryForGemini,
        { role: 'user' as const, parts: currentUserParts },
      ];

      const fullSystemPrompt = `${NUTRIFYS_WHATSAPP_SYSTEM_PROMPT}\n\nClient : ${senderName} (${senderPhone})${userProfileContext}${dynamicPricingContext}${conversationRules}`;

      try {
        const model = genAI.getGenerativeModel({
          model: 'gemini-3.1-flash-lite',
          systemInstruction: fullSystemPrompt,
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 600,
          },
        });
        console.log('[whatsapp-webhook] Calling Gemini 3.1 Flash Lite with conversation history & dynamic pricing...');
        const result = await model.generateContent({ contents: contentsPayload });
        aiReply = result.response.text();
      } catch (geminiErr: any) {
        console.warn('[whatsapp-webhook] Gemini 3.1 Flash Lite error, fallback to gemini-3.8-flash:', geminiErr?.message);
        const modelFallback = genAI.getGenerativeModel({
          model: 'gemini-3.8-flash',
          systemInstruction: fullSystemPrompt,
        });
        const result = await modelFallback.generateContent({ contents: contentsPayload });
        aiReply = result.response.text();
      }
      console.log('[whatsapp-webhook] NutriFYS generated reply:', aiReply);

      // 1. Traitement automatique du profil de santé si complété par NutriFYS
      const profileMatch = aiReply.match(/:::PROFILE_JSON\s*([\s\S]*?)\s*:::?/);
      if (profileMatch && db && userDocRef) {
        try {
          const rawProfileJson = profileMatch[1].trim();
          const pData = JSON.parse(rawProfileJson);
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
          const rawOrderJson = orderMatch[1].trim();
          const orderData = JSON.parse(rawOrderJson);
          console.log('[whatsapp-webhook] Order detected from WhatsApp:', orderData);

          // DÉDUPLICATION 2 (PROTECTION STRICTE CONTRE LES DOUBLONS D'ENREGISTREMENT) :
          // Vérifier si une commande WhatsApp a déjà été enregistrée pour ce client il y a moins de 120 secondes
          const recentOrdersSnap = await db.collection('orders')
            .where('userPhoneSnapshot', '==', senderPhone)
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
            const baseBottlePrice = bottleSize === '1L' ? bottle1LBase : bottle500Base;
            const quantity = Math.max(1, Number(orderData.quantity) || 1);

            // Retrouver les fruits sélectionnés et leurs prix réels en base de données
            const chosenFruitNames: string[] = Array.isArray(orderData.fruits) ? orderData.fruits : [];
            const matchedIngredients = chosenFruitNames.map((fName: string) => {
              const clean = fName.trim().toLowerCase();
              const found = availableFruits.find(
                (af) => af.name.toLowerCase() === clean || af.id.toLowerCase() === clean
              );
              return {
                fruitId: found ? found.id : fName.toLowerCase().replace(/\s+/g, '_'),
                fruitName: found ? found.name : fName,
                quantityGrams: 100,
                priceSnapshot: found ? found.price : 0,
                role: 'fruit' as const,
              };
            });

            // Calcul fidèle FYS : prix bouteille = prix contenant de base + somme des prix des fruits du mélange
            const ingredientsPriceSum = matchedIngredients.reduce((sum, ing) => sum + (ing.priceSnapshot || 0), 0);
            const pricePerBottle = baseBottlePrice + ingredientsPriceSum;
            const lineTotal = pricePerBottle * quantity;
            const finalDeliveryFee = deliveryFee;
            const totalPrice = lineTotal + finalDeliveryFee;

            const orderRef = db.collection('orders').doc();
            const newOrderDoc = {
              id: orderRef.id,
              type: 'classic',
              source: 'whatsapp',
              whatsappMessageId: messageId || null,
              status: 'pending',
              userId: userDocRef?.id || 'whatsapp_customer',
              userNameSnapshot: senderName,
              userPhoneSnapshot: senderPhone,
              userEmailSnapshot: '',
              cocktailId: 'whatsapp-custom',
              cocktailNameSnapshot: orderData.cocktailName || 'Cocktail Santé WhatsApp',
              cocktailIngredientsSnapshot: matchedIngredients,
              hasAddedSugar: !!orderData.hasAddedSugar,
              orderLines: [
                {
                  bottleSize,
                  bottleSizeLabel: bottleSize === '1L' ? '1 L' : '500 ml',
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
              createdAt: FieldValue.serverTimestamp(),
              updatedAt: FieldValue.serverTimestamp(),
            };

            await orderRef.set(newOrderDoc);
            console.log(`[whatsapp-webhook] ✅ Created WhatsApp Order ${orderRef.id} for ${senderName} (Total: ${totalPrice} XAF)`);

            // Notifier les administrateurs
            await db.collection('notifications').add({
              title: 'Nouvelle commande WhatsApp !',
              message: `${senderName} a commandé ${quantity}× ${bottleSize} (${newOrderDoc.cocktailNameSnapshot}) pour ${orderData.district || 'Yaoundé'} (${totalPrice} XAF).`,
              link: `/board/orders?order=${orderRef.id}`,
              audience: 'admins',
              read: false,
              createdAt: FieldValue.serverTimestamp(),
            });
          }
        } catch (orderErr) {
          console.error('[whatsapp-webhook] Error creating WhatsApp order in Firestore:', orderErr);
        } finally {
          // Nettoyer le bloc technique avant envoi au client
          aiReply = aiReply.replace(/:::ORDER_JSON[\s\S]*?:::?/g, '').trim();
        }
      } else if (orderMatch) {
        aiReply = aiReply.replace(/:::ORDER_JSON[\s\S]*?:::?/g, '').trim();
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

      // Envoyer le récapitulatif textuel (toujours présent pour garder la trace des recettes/prix)
      const sent = await sendWhatsAppMessage(senderPhone, aiReply);
      console.log('[whatsapp-webhook] Message sent to WhatsApp successfully:', { sent, sentAudio });

      // Enregistrer la réponse de l'IA dans Firestore si actif
      if (db) {
        try {
          const usersRef = db.collection('users');
          const querySnap = await usersRef.where('phone', '==', senderPhone).limit(1).get();
          if (!querySnap.empty) {
            await querySnap.docs[0].ref.collection('whatsapp_messages').add({
              sender: 'nutrifys',
              text: aiReply,
              timestamp: FieldValue.serverTimestamp(),
            });
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
