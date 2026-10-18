import type { VercelRequest, VercelResponse } from '@vercel/node';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const WHATSAPP_API_TOKEN = process.env.WHATSAPP_API_TOKEN;
const WHATSAPP_PHONE_NUMBER_ID =
  process.env.WHATSAPP_PHONE_NUMBER_ID || '1420693941130535';

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
    console.warn('[whatsapp-status] Firebase Admin init bypassed:', e);
    return null;
  }
}

function formatWhatsAppRecipient(rawPhone: string): string {
  const digits = rawPhone.replace(/\D/g, '');
  if (digits.startsWith('237') && digits.length >= 12) {
    return digits;
  }
  if (digits.length === 9) {
    return `237${digits}`;
  }
  return digits;
}

async function sendWhatsAppMessage(to: string, text: string) {
  if (!WHATSAPP_API_TOKEN) {
    console.error('[whatsapp-status] WHATSAPP_API_TOKEN is missing');
    return { ok: false, error: 'WHATSAPP_API_TOKEN missing' };
  }

  const recipient = formatWhatsAppRecipient(to);
  const url = `https://graph.facebook.com/v22.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`;

  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: recipient,
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
    const data = await response.json();
    console.log('[whatsapp-status] Meta response status:', response.status, data);
    return { ok: response.ok, status: response.status, data };
  } catch (err: any) {
    console.error('[whatsapp-status] Network error sending to WhatsApp:', err);
    return { ok: false, error: err?.message };
  }
}

function buildStatusMessage(status: string, order: any): string | null {
  const rawName = (order.userNameSnapshot || 'Cher client').trim();
  const firstName = rawName.split(' ')[0] || 'Cher client';
  const cocktail = order.cocktailNameSnapshot || 'votre cocktail santé';
  const district = order.deliveryDetails?.district || 'Yaoundé';

  // Formatage du résumé des bouteilles (ex: 2× 500 ml)
  let formatInfo = '';
  if (Array.isArray(order.orderLines) && order.orderLines.length > 0) {
    formatInfo = order.orderLines
      .map((l: any) => `${l.quantity || 1}× ${l.bottleSizeLabel || l.bottleSize || '500ml'}`)
      .join(' + ');
  } else if (order.quantity) {
    formatInfo = `${order.quantity}× ${order.bottleSizeLabel || order.bottleSize || '500ml'}`;
  }

  switch (status) {
    case 'confirmed':
      return `🌿 *Bonjour ${firstName} !*

C'est *NutriFYS*. Bonne nouvelle : votre commande a bien été *confirmée* par notre équipe ! 🎉

🍹 *Recette :* ${cocktail}${formatInfo ? `\n📦 *Format :* ${formatInfo}` : ''}
📍 *Livraison prévue :* ${district}

Votre commande est enregistrée et va bientôt entrer en atelier. Nous préparons vos fruits frais avec le plus grand soin ! ✨`;

    case 'preparing':
      return `🍓 *Bonjour ${firstName} !*

C'est *NutriFYS*. Vos fruits sont actuellement en cours de découpe et de pressage dans notre atelier ! 🍍✨

🍹 *${cocktail}*
🌿 *100% Naturel* · Fruits frais de saison & sans additifs.

Nos mixologues veillent à préserver toutes les vitamines et nutriments de votre recette sur-mesure. Dès que votre bouteille est prête et bien fraîche, nous vous tenons informé(e) ! ❄️`;

    case 'ready':
      return `🧊 *Bonjour ${firstName} !*

C'est *NutriFYS*. Votre commande de *${cocktail}* est prête, fraîchement embouteillée et mise au frais ! ❄️

🛵 Notre livreur la prend en charge pour votre livraison à *${district}*. Gardez votre téléphone à portée de main ! 📞`;

    case 'delivered':
      return `🥂 *Bonjour ${firstName} !*

C'est *NutriFYS*. Votre commande de *${cocktail}* a été livrée ! 🎉

Nous vous souhaitons une excellente dégustation bien fraîche et pleine de vitalité. Prenez bien soin de vous avec FYS ! 💚
N'hésitez pas à me donner votre retour sur la recette ou à me dire comment vous vous sentez après l'avoir dégustée !`;

    case 'cancelled':
      return `Bonjour ${firstName},

C'est *NutriFYS*. Votre commande de *${cocktail}* a été annulée.

Si vous avez la moindre question ou si vous souhaitez reprogrammer votre recette à un autre moment, je reste entièrement à votre écoute ! 🌿`;

    default:
      return null;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { orderId, status } = req.body || {};
  if (!orderId || !status) {
    return res.status(400).json({ error: 'orderId and status are required' });
  }

  const db = getAdminDb();
  if (!db) {
    return res.status(500).json({ error: 'Database unavailable' });
  }

  try {
    const orderDoc = await db.collection('orders').doc(orderId).get();
    if (!orderDoc.exists) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const orderData = orderDoc.data() || {};
    const recipientPhone = orderData.userPhoneSnapshot || orderData.deliveryDetails?.phone;

    if (!recipientPhone) {
      console.warn(`[whatsapp-status] No phone number found for order ${orderId}`);
      return res.status(200).json({ status: 'no_phone', sent: false });
    }

    const messageText = buildStatusMessage(status, orderData);
    if (!messageText) {
      console.log(`[whatsapp-status] No message template for status "${status}"`);
      return res.status(200).json({ status: 'unsupported_status', sent: false });
    }

    console.log(`[whatsapp-status] Sending WhatsApp status "${status}" to ${recipientPhone} for order ${orderId}...`);
    const sendResult = await sendWhatsAppMessage(recipientPhone, messageText);

    // Enregistrer le message dans l'historique WhatsApp du client dans Firestore
    try {
      let targetUserRef: any = null;
      if (orderData.userId && orderData.userId !== 'whatsapp_customer') {
        const uDoc = await db.collection('users').doc(orderData.userId).get();
        if (uDoc.exists) targetUserRef = uDoc.ref;
      }

      if (!targetUserRef) {
        const cleanDigits = recipientPhone.replace(/\D/g, '');
        const local9 = cleanDigits.replace(/^(237|00237)/, '');
        const phoneVariants = Array.from(new Set([
          recipientPhone,
          `+${cleanDigits}`,
          cleanDigits,
          local9,
          `+237${local9}`,
          `237${local9}`,
        ].filter(Boolean))).slice(0, 10);

        const uSnap = await db.collection('users').where('phone', 'in', phoneVariants).limit(1).get();
        if (!uSnap.empty) {
          targetUserRef = uSnap.docs[0].ref;
        }
      }

      if (targetUserRef) {
        await targetUserRef.collection('whatsapp_messages').add({
          sender: 'nutrifys',
          text: messageText,
          timestamp: FieldValue.serverTimestamp(),
          isStatusUpdate: true,
          orderId,
          orderStatus: status,
        });
        console.log(`[whatsapp-status] Logged NutriFYS status message in whatsapp_messages for user ${targetUserRef.id}`);
      }
    } catch (historyErr) {
      console.warn('[whatsapp-status] Could not save status message to user history:', historyErr);
    }

    // Tracer la notification sur la commande
    await orderDoc.ref.set({
      whatsappStatusLogs: {
        [status]: {
          sent: sendResult.ok,
          timestamp: FieldValue.serverTimestamp(),
        },
      },
    }, { merge: true });

    return res.status(200).json({
      status: 'success',
      sent: sendResult.ok,
      sendResult,
    });
  } catch (err: any) {
    console.error('[whatsapp-status] Error processing status notification:', err);
    return res.status(500).json({ error: err?.message || 'Internal Error' });
  }
}
