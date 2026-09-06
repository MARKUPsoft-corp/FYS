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
  secret?: string;
  title: string;
  body: string;
  url?: string;
  targetUid?: string;
  audience?: 'all' | 'admins' | 'user';
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { title, body, url, targetUid, audience = 'all' } = req.body as SendPayload;

  if (!title || !body) {
    return res.status(400).json({ error: 'Title and body are required' });
  }

  try {
    // Validate that Firebase Admin credentials exist
    if (!process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_CLIENT_EMAIL || !process.env.FIREBASE_PRIVATE_KEY) {
      return res.status(500).json({
        error: 'Firebase Admin credentials missing',
        details: {
          hasProjectId: !!process.env.FIREBASE_PROJECT_ID,
          hasClientEmail: !!process.env.FIREBASE_CLIENT_EMAIL,
          hasPrivateKey: !!process.env.FIREBASE_PRIVATE_KEY,
        },
      });
    }

    const app = getFirebaseAdminApp();
    const db = getFirestore(app);
    const messaging = getMessaging(app);

    // ── 1. Déterminer les UIDs destinataires ──────────────────────────────────
    let targetUids: string[] = [];
    const effectiveAudience = targetUid ? 'user' : audience;

    if (effectiveAudience === 'user' && targetUid) {
      targetUids = [targetUid];
    } else if (effectiveAudience === 'admins') {
      const adminsSnap = await db.collection('users').where('role', '==', 'admin').get();
      targetUids = adminsSnap.docs.map((docSnap) => docSnap.id);
    } else {
      // 'all' : tous les utilisateurs enregistrés
      const allUsersSnap = await db.collection('users').get();
      targetUids = allUsersSnap.docs.map((docSnap) => docSnap.id);
    }

    // ── 2. Enregistrer dans la collection Firestore "notifications" ───────────
    // C'est ce qui permet au volet / sidebar (la cloche) d'afficher ces notifications
    if (targetUids.length > 0) {
      const now = new Date();
      // Le batch Firestore supporte jusqu'à 500 opérations
      const chunks = [];
      for (let i = 0; i < targetUids.length; i += 400) {
        chunks.push(targetUids.slice(i, i + 400));
      }

      for (const chunk of chunks) {
        const batch = db.batch();
        chunk.forEach((uid) => {
          const notifRef = db.collection('notifications').doc();
          batch.set(notifRef, {
            id: notifRef.id,
            userId: uid,
            title: title.trim(),
            message: body.trim(),
            link: url || '/',
            isRead: false,
            createdAt: now,
          });
        });
        await batch.commit().catch((e) => console.warn('[push] In-app notifications batch write failed:', e));
      }
    }

    // ── 3. Récupérer les tokens FCM pour les appareils ────────────────────────
    let tokens: string[] = [];
    let docRefs: DocumentReference[] = [];

    if (effectiveAudience === 'all') {
      const allTokensSnap = await db.collection('fcm_tokens').get();
      allTokensSnap.docs.forEach((docSnap) => {
        const token = docSnap.data().token;
        if (token) {
          tokens.push(token);
          docRefs.push(docSnap.ref);
        }
      });
    } else if (targetUids.length > 0) {
      // Requête par lot de 30 pour la clause Firestore 'in'
      for (let i = 0; i < targetUids.length; i += 30) {
        const subUids = targetUids.slice(i, i + 30);
        const subSnap = await db.collection('fcm_tokens').where('uid', 'in', subUids).get();
        subSnap.docs.forEach((docSnap) => {
          const token = docSnap.data().token;
          if (token && !tokens.includes(token)) {
            tokens.push(token);
            docRefs.push(docSnap.ref);
          }
        });
      }
    }

    // Si aucun appareil n'a enregistré de push token, les notifications in-app ont quand même été créées !
    if (tokens.length === 0) {
      return res.status(200).json({
        sent: 0,
        failed: 0,
        inAppSaved: targetUids.length,
        message: 'Notifications enregistrées dans la sidebar, mais aucun appareil push abonné trouvé.',
      });
    }

    // ── 4. Envoyer les pushs FCM aux appareils ────────────────────────────────
    const targetLink = url || '/';
    const messagePayload = {
      notification: {
        title: title.trim(),
        body: body.trim(),
      },
      webpush: {
        headers: {
          Urgency: 'high',
          TTL: '86400',
        },
        notification: {
          title: title.trim(),
          body: body.trim(),
          icon: '/icons/icon-192.png',
          badge: '/icons/icon-192.png',
          tag: `fys-${Date.now()}`,
          vibrate: [200, 100, 200],
          requireInteraction: true,
        },
        fcmOptions: {
          link: targetLink,
        },
      },
      data: {
        title: title.trim(),
        body: body.trim(),
        click_action: targetLink,
        url: targetLink,
      },
      tokens,
    };

    const response = await messaging.sendEachForMulticast(messagePayload);

    // ── 5. Nettoyer les tokens expirés / désinstallés ─────────────────────────
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
      failed: response.failureCount,
      inAppSaved: targetUids.length,
    });
  } catch (err) {
    console.error('[push] FCM send error:', err);
    const message = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ error: 'Internal server error', details: message });
  }
}
