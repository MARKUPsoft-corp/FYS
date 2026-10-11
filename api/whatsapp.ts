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

// ── Prompt Système NutriFYS WhatsApp (Chaleureux & Adapté aux seniors) ────────

const NUTRIFYS_WHATSAPP_SYSTEM_PROMPT = `Tu es NutriFYS, l'assistant nutritionniste officiel de FYS (For Your Self), une marque artisanale de cocktails et jus de fruits 100% naturels santé basée à Yaoundé, Cameroun.

MISSION PRINCIPALE :
Tu échanges sur WhatsApp principalement avec des clients qui peuvent être des personnes âgées, des parents ou des clients préférant la simplicité d'une conversation.
Ton rôle est de :
1. Les accueillir avec beaucoup de respect, de chaleur et de bienveillance (politesse camerounaise, ton familial et chaleureux).
2. Comprendre leurs besoins santé (diabète, hypertension, fatigue, digestion, sommeil, hydratation, etc.).
3. Leur recommander des compositions de jus sur-mesure adaptées à leur santé.
4. Les guider simplement pour commander leur bouteille (250ml, 500ml ou 1L) et leur livraison à Yaoundé.

RÈGLES D'OR MÉDICALES ET NUTRITIONNELLES ABSOLUES :
- EXCLUSION TOTALE DU PAMPLEMOUSSE : FYS n'utilise JAMAIS de pamplemousse (risque d'interaction médicamenteuse grave).
- Diabète : Éviter les excès de mangue/ananas le soir. Privilégier Corossol, Foléré (Bissap), Citron, Concombre, Gingembre.
- Hypertension : Le Foléré (Bissap) et la Pastèque sont excellents pour aider à la régulation tensionnelle.
- Ulcère / Gastrite : Éviter les jus très acides (citron pur, ananas à jeun). Privilégier Papaye, Banane, Coco, Pomme.
- Insuffisance rénale : Attention au potassium élevé (limiter banane très mûre, baobab).
- Ne pose JAMAIS de diagnostic médical direct : renvoie toujours avec tact vers leur médecin en cas de doute sérieux.
- N'utilise JAMAIS le nom "Claude", "Gemini" ou "OpenAI". Tu es UNIQUEMENT NutriFYS.

FORMATS & TARIFS FYS :
- Format 250ml : Idéal pour tester ou cure express
- Format 500ml : Format standard le plus apprécié (recommandé pour une journée)
- Format 1L : Idéal pour partager en famille ou cure 2 jours
- Livraison à Yaoundé : Disponible dans tous les quartiers (Bastos, Biyem-Assi, Omnisports, Mendong, Odza, etc.).
- Paiement : Mobile Money (MTN MoMo, Orange Money) ou au comptant.

STYLE DE COMMUNICATION WHATSAPP :
- Réponses courtes, aérées, faciles à lire sur un écran de téléphone (utilise des puces et des émojis sobres).
- Phrases claires, sans jargon scientifique pompeux.
- Pose UNE seule question à la fois pour ne pas submerger le client.`;

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

      // Vérifier si un message texte est présent
      const message = changes?.messages?.[0];
      if (!message || message.type !== 'text') {
        return res.status(200).json({ status: 'ignored_not_text' });
      }

      const senderPhone = message.from; // Numéro international (ex: 237699000000)
      const senderText = message.text?.body?.trim();
      const senderName = changes?.contacts?.[0]?.profile?.name || 'Cher client';

      if (!senderPhone || !senderText) {
        return res.status(200).json({ status: 'ignored_empty' });
      }

      console.log(`[whatsapp-webhook] Processing message from ${senderPhone} (${senderName}): "${senderText}"`);

      // Initialiser la base Firestore (si disponible)
      let userProfileContext = '';
      const db = getAdminDb();
      if (db) {
        try {
          const usersRef = db.collection('users');
          const querySnap = await usersRef.where('phone', '==', senderPhone).limit(1).get();
          let userDocRef;

          if (!querySnap.empty) {
            const userData = querySnap.docs[0].data();
            userDocRef = querySnap.docs[0].ref;
            if (userData.healthConditions?.length) {
              userProfileContext += `\nConditions médicales connues du client : ${userData.healthConditions.join(', ')}`;
            }
            if (userData.allergies?.length) {
              userProfileContext += `\nAllergies connues : ${userData.allergies.join(', ')}`;
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
          }

          if (userDocRef) {
            await userDocRef.collection('whatsapp_messages').add({
              sender: 'user',
              text: senderText,
              timestamp: FieldValue.serverTimestamp(),
            });
          }
        } catch (dbErr) {
          console.warn('[whatsapp-webhook] Firestore write skipped:', dbErr);
        }
      }

      // Appeler le modèle Gemini avec le prompt NutriFYS
      if (!GEMINI_API_KEY) {
        console.error('[whatsapp-webhook] GEMINI_API_KEY missing');
        await sendWhatsAppMessage(
          senderPhone,
          `Bonjour ${senderName} ! Bienvenue chez FYS. Notre assistant NutriFYS est en cours d'initialisation. Nous vous répondons dans un instant.`,
        );
        return res.status(200).json({ status: 'no_gemini_key' });
      }

      const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
      let aiReply = '';
      try {
        const model = genAI.getGenerativeModel({
          model: 'gemini-3.1-flash-lite',
          systemInstruction: `${NUTRIFYS_WHATSAPP_SYSTEM_PROMPT}\n\nClient : ${senderName} (${senderPhone})${userProfileContext}`,
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 600,
          },
        });
        console.log('[whatsapp-webhook] Calling Gemini 3.1 Flash Lite for NutriFYS answer...');
        const result = await model.generateContent(senderText);
        aiReply = result.response.text();
      } catch (geminiErr: any) {
        console.warn('[whatsapp-webhook] Gemini error, fallback to gemini-2.0-flash:', geminiErr?.message);
        const modelFallback = genAI.getGenerativeModel({
          model: 'gemini-2.0-flash',
          systemInstruction: `${NUTRIFYS_WHATSAPP_SYSTEM_PROMPT}\n\nClient : ${senderName} (${senderPhone})${userProfileContext}`,
        });
        const result = await modelFallback.generateContent(senderText);
        aiReply = result.response.text();
      }
      console.log('[whatsapp-webhook] NutriFYS generated reply:', aiReply);

      // Envoyer la réponse sur WhatsApp (await obligatoire avant res.status(200))
      const sent = await sendWhatsAppMessage(senderPhone, aiReply);
      console.log('[whatsapp-webhook] Message sent to WhatsApp successfully:', sent);

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
