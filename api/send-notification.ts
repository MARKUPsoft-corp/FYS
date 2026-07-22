import type { VercelRequest, VercelResponse } from '@vercel/node';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, QueryDocumentSnapshot, type Query, type DocumentReference } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';

// ── Firebase Admin init (lazy singleton) ─────────────────────────────────────

function getFirebaseAdminApp() {
  if (!getApps().length) {
    return initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID!,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
    });
  }
  return getApps()[0];
}

// ── Request shape ─────────────────────────────────────────────────────────────

interface SendPayload {
  secret: string;
  title: string;
  body: string;
  url?: string;
  targetUid?: string;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { title, body, url, targetUid } = req.body as SendPayload;

  try {
    const app = getFirebaseAdminApp();
    const db = getFirestore(app);
    const messaging = getMessaging(app);

    let q: Query = db.collection('fcm_tokens');
    if (targetUid) q = q.where('uid', '==', targetUid);

    const snapshot = await q.get();
    if (snapshot.empty) return res.status(200).json({ sent: 0, failed: 0 });

    const tokens: string[] = [];
    const docRefs: DocumentReference[] = [];

    snapshot.docs.forEach((docSnap: QueryDocumentSnapshot) => {
      const token = docSnap.data().token;
      if (token) {
        tokens.push(token);
        docRefs.push(docSnap.ref);
      }
    });

    if (tokens.length === 0) return res.status(200).json({ sent: 0, failed: 0 });

    const messagePayload = {
      notification: {
        title,
        body,
      },
      data: {
        click_action: url ?? '/',
      },
      tokens,
    };

    const response = await messaging.sendEachForMulticast(messagePayload);
    
    // Cleanup invalid tokens (unregistered devices)
    if (response.failureCount > 0) {
      const failedTokensToCleanup: Promise<any>[] = [];
      response.responses.forEach((resp, idx) => {
        if (!resp.success && resp.error?.code === 'messaging/registration-token-not-registered') {
          failedTokensToCleanup.push(docRefs[idx].delete());
        }
      });
      await Promise.allSettled(failedTokensToCleanup);
    }

    return res.status(200).json({ 
      sent: response.successCount, 
      failed: response.failureCount 
    });
  } catch (err) {
    console.error('[push] FCM send error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
