import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createHmac, timingSafeEqual } from 'crypto';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import type { KPayWebhookPayload } from '../src/entities/kpay';

// ── Firebase Admin init (lazy singleton) ─────────────────────────────────────

function getAdminDb() {
  const app = getApps().length
    ? getApps()[0]
    : initializeApp({
        credential: cert({
          projectId: process.env.FIREBASE_PROJECT_ID!,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
          privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        }),
      });
  return getFirestore(app);
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function verifySignature(rawBody: Buffer, signature: string, secret: string): boolean {
  try {
    const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
    if (signature.length !== expected.length) return false;
    return timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch {
    return false;
  }
}

// ── Handler ───────────────────────────────────────────────────────────────────

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // 1. Méthode
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // 2. Vérification de la signature HMAC-SHA256
  const signature = req.headers['x-kpay-signature'] as string | undefined;
  const webhookSecret = process.env.KPAY_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error('[kpay-webhook] KPAY_WEBHOOK_SECRET env variable is not set!');
    return res.status(500).json({ error: 'Server misconfiguration' });
  }

  // Vercel parse automatiquement le body JSON — on a besoin du raw pour la signature
  // On utilise le Buffer brut via req.body (configuré en raw dans vercel.json si nécessaire)
  const rawBody = Buffer.from(JSON.stringify(req.body));

  if (signature && !verifySignature(rawBody, signature, webhookSecret)) {
    console.warn('[kpay-webhook] Invalid signature — request rejected');
    return res.status(400).json({ error: 'Invalid signature' });
  }

  // 3. Parsing du payload
  const payload = req.body as KPayWebhookPayload;

  if (!payload?.paymentId || !payload?.event) {
    return res.status(400).json({ error: 'Invalid payload: missing paymentId or event' });
  }

  const db = getAdminDb();

  try {
    // 4. Idempotency — si déjà traité, on répond 200 sans re-traiter
    const docRef = db.collection('kpay_transactions').doc(payload.paymentId);
    const existing = await docRef.get();

    if (!existing.exists) {
      // 5. Stocker la transaction dans Firestore
      await docRef.set({
        id: payload.paymentId,
        event: payload.event,
        reference: payload.reference,
        status: payload.status,
        amount: payload.amount,
        currency: 'XAF',
        phoneNumber: payload.phoneNumber,
        externalId: payload.externalId ?? null,
        metadata: payload.metadata ?? null,
        failureReason: payload.failureReason ?? null,
        completedAt: payload.completedAt ?? null,
        failedAt: payload.failedAt ?? null,
        rawTimestamp: payload.timestamp,
        receivedAt: FieldValue.serverTimestamp(),
      });

      // 6. Si paiement complété et commande liée → mettre à jour le statut de la commande
      if (payload.status === 'COMPLETED' && payload.externalId) {
        const orderRef = db.collection('orders').doc(payload.externalId);
        const orderSnap = await orderRef.get();

        if (orderSnap.exists) {
          await orderRef.update({
            paymentStatus: 'paid',
            kpayPaymentId: payload.paymentId,
            kpayReference: payload.reference,
            updatedAt: FieldValue.serverTimestamp(),
          });
        }
      }
    }

    // 7. Répondre 200 rapidement (avant tout traitement long)
    return res.status(200).send('OK');

  } catch (err) {
    console.error('[kpay-webhook] Error processing webhook:', err);
    // On répond 500 pour que K-Pay retente (retry policy: 5xx)
    return res.status(500).json({ error: 'Internal server error' });
  }
}
