import type { VercelRequest, VercelResponse } from '@vercel/node';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

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

function getPhoneVariants(rawPhone: string): string[] {
  if (!rawPhone) return [];
  const digits = rawPhone.replace(/\D/g, '');
  if (!digits) return [];
  const local9 = digits.slice(-9);
  return Array.from(new Set([
    rawPhone,
    digits,
    local9,
    `+237${local9}`,
    `237${local9}`,
    `00237${local9}`,
  ].filter(Boolean)));
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { uid, phone, email, name } = req.body || {};

  if (!uid) {
    return res.status(400).json({ error: 'Missing uid' });
  }

  const app = getAdminApp();
  if (!app) {
    return res.status(500).json({ error: 'Firebase Admin not configured on server' });
  }

  const db = getFirestore(app);

  try {
    const userDocRef = db.collection('users').doc(uid);
    const userSnap = await userDocRef.get();

    // 1. Déterminer le numéro à synchroniser
    const currentPhone = userSnap.exists ? (userSnap.data()?.phone || '') : '';
    const rawTargetPhone = (phone || currentPhone || '').trim();
    const cleanDigits = rawTargetPhone.replace(/\D/g, '');
    const cleanPhone = cleanDigits.length === 9 ? `237${cleanDigits}` : cleanDigits;
    const phoneVariants = getPhoneVariants(cleanPhone || rawTargetPhone);

    const userUpdates: any = {
      updatedAt: FieldValue.serverTimestamp(),
    };

    if (cleanPhone && !currentPhone) {
      userUpdates.phone = cleanPhone;
    }
    if (email && (!userSnap.exists || !userSnap.data()?.email)) {
      userUpdates.email = email;
    }
    if (name && (!userSnap.exists || !userSnap.data()?.name)) {
      userUpdates.name = name;
    }

    // 2. Fusionner le profil de santé s'il existait déjà un compte temporaire WhatsApp
    let syncedProfile = false;
    if (phoneVariants.length > 0) {
      const waUsersSnap = await db.collection('users')
        .where('phone', 'in', phoneVariants.slice(0, 30))
        .get();

      for (const waDoc of waUsersSnap.docs) {
        if (waDoc.id !== uid) {
          const waData = waDoc.data();
          const currentData = userSnap.exists ? userSnap.data() : {};
          
          if ((!currentData?.healthConditions || currentData.healthConditions.length === 0) && waData?.healthConditions?.length) {
            userUpdates.healthConditions = waData.healthConditions;
            syncedProfile = true;
          }
          if ((!currentData?.allergies || currentData.allergies.length === 0) && waData?.allergies?.length) {
            userUpdates.allergies = waData.allergies;
            syncedProfile = true;
          }
          if ((!currentData?.goals || currentData.goals.length === 0) && waData?.goals?.length) {
            userUpdates.goals = waData.goals;
            syncedProfile = true;
          }
          if (waData?.hasHealthProfile) {
            userUpdates.hasHealthProfile = true;
          }
        }
      }
    }

    await userDocRef.set(userUpdates, { merge: true });

    // Copier également dans subcollection profile/main si profil de santé présent
    if (userUpdates.healthConditions || userUpdates.allergies || userUpdates.goals) {
      try {
        await userDocRef.collection('profile').doc('main').set({
          userId: uid,
          healthConditions: userUpdates.healthConditions || userSnap.data()?.healthConditions || [],
          allergies: userUpdates.allergies || userSnap.data()?.allergies || [],
          goals: userUpdates.goals || userSnap.data()?.goals || [],
          updatedAt: FieldValue.serverTimestamp(),
        }, { merge: true });
      } catch (profErr) {
        console.warn('[api/sync-user] Warning updating subcollection profile/main:', profErr);
      }
    }

    // 3. Réassigner toutes les commandes passées avec ce numéro au compte Google connecté
    let updatedOrdersCount = 0;
    if (phoneVariants.length > 0) {
      const ordersSnap = await db.collection('orders')
        .where('userPhoneSnapshot', 'in', phoneVariants.slice(0, 30))
        .get();

      if (!ordersSnap.empty) {
        const batch = db.batch();
        for (const oDoc of ordersSnap.docs) {
          const oData = oDoc.data();
          if (oData.userId !== uid) {
            batch.update(oDoc.ref, {
              userId: uid,
              userNameSnapshot: name || userSnap.data()?.name || oData.userNameSnapshot || '',
              userEmailSnapshot: email || userSnap.data()?.email || oData.userEmailSnapshot || '',
              updatedAt: FieldValue.serverTimestamp(),
            });
            updatedOrdersCount++;
          }
        }
        if (updatedOrdersCount > 0) {
          await batch.commit();
          console.log(`[api/sync-user] 🔗 Linked ${updatedOrdersCount} orders to user ${uid}`);
        }
      }
    }

    return res.status(200).json({
      ok: true,
      uid,
      phone: userUpdates.phone || currentPhone || cleanPhone,
      updatedOrdersCount,
      syncedProfile,
    });
  } catch (err: any) {
    console.error('[api/sync-user] Error syncing user with phone:', err);
    return res.status(500).json({ error: err?.message || 'Sync failed' });
  }
}
