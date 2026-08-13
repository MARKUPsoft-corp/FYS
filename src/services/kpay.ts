import {
  collection,
  doc,
  getDocs,
  getDoc,
  query,
  orderBy,
  where,
  limit,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { COLLECTIONS } from '@/entities/constants';
import type { KPayTransaction } from '@/entities/kpay';

const col = () => collection(db, COLLECTIONS.KPAY_TRANSACTIONS);

/** Récupère toutes les transactions K-Pay (admin) */
export async function getKPayTransactions(maxResults = 100): Promise<KPayTransaction[]> {
  const q = query(col(), orderBy('receivedAt', 'desc'), limit(maxResults));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as KPayTransaction));
}

/** Récupère les transactions filtrées par statut */
export async function getKPayTransactionsByStatus(
  status: KPayTransaction['status'],
  maxResults = 50,
): Promise<KPayTransaction[]> {
  const q = query(
    col(),
    where('status', '==', status),
    orderBy('receivedAt', 'desc'),
    limit(maxResults),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as KPayTransaction));
}

/** Retrouve la transaction liée à une commande (via externalId) */
export async function getKPayTransactionByOrder(orderId: string): Promise<KPayTransaction | null> {
  const q = query(col(), where('externalId', '==', orderId), orderBy('receivedAt', 'desc'), limit(1));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...d.data() } as KPayTransaction;
}

/** Récupère une transaction par son paymentId K-Pay */
export async function getKPayTransactionById(paymentId: string): Promise<KPayTransaction | null> {
  const d = await getDoc(doc(db, COLLECTIONS.KPAY_TRANSACTIONS, paymentId));
  if (!d.exists()) return null;
  return { id: d.id, ...d.data() } as KPayTransaction;
}
