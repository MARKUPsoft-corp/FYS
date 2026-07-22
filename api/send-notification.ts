import type { VercelRequest, VercelResponse } from '@vercel/node';
import webpush from 'web-push';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, QueryDocumentSnapshot } from 'firebase-admin/firestore';

// ── Firebase Admin init (lazy singleton) ─────────────────────────────────────

function getDb() {
  if (!getApps().length) {
    initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID!,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
    });
  }
  return getFirestore();
}

// ── VAPID config ─────────────────────────────────────────────────────────────

webpush.setVapidDetails(
  process.env.VAPID_CONTACT!,
  process.env.VITE_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!,
);

// ── Request shape ─────────────────────────────────────────────────────────────

interface SendPayload {
  /** Secret token checked against NOTIFY_SECRET env var */
  secret: string;
  title: string;
  body: string;
  /** Optional URL the notification click should open */
  url?: string;
  /** Optional: send to one user UID — leave empty to broadcast to all */
  targetUid?: string;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { secret, title, body, url, targetUid } = req.body as SendPayload;

  // Simple shared-secret guard — set NOTIFY_SECRET in Vercel dashboard
  if (!secret || secret !== process.env.NOTIFY_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const db = getDb();
    let q = db.collection('push_subscriptions') as FirebaseFirestore.Query;
    if (targetUid) q = q.where('uid', '==', targetUid);

    const snapshot = await q.get();
    if (snapshot.empty) return res.status(200).json({ sent: 0 });

    const payload = JSON.stringify({ title, body, url: url ?? '/' });

    const results = await Promise.allSettled(
      snapshot.docs.map(async (docSnap: QueryDocumentSnapshot) => {
        const sub = docSnap.data().subscription;
        try {
          await webpush.sendNotification(sub, payload);
        } catch (err: unknown) {
          const code = (err as { statusCode?: number }).statusCode;
          // Remove expired / invalid subscriptions automatically
          if (code === 410 || code === 404) await docSnap.ref.delete();
          throw err;
        }
      }),
    );

    const sent = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.length - sent;
    return res.status(200).json({ sent, failed });
  } catch (err) {
    console.error('[push] send error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
