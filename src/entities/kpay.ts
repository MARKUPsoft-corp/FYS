import { Timestamp } from 'firebase/firestore';

export type KPayEventType =
  | 'payment.completed'
  | 'payment.failed'
  | 'payment.cancelled'
  | 'payout.completed'
  | 'payout.failed'
  | 'refund.completed'
  | 'refund.failed';

export type KPayStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';

export type KPayProvider = 'MTN_MOMO_CMR' | 'ORANGE_CMR' | string;

/** Document stocké dans Firestore (collection: kpay_transactions) */
export interface KPayTransaction {
  id: string;                        // = paymentId de K-Pay (ex: "pay_abc123")
  event: KPayEventType;              // ex: "payment.completed"
  reference: string;                 // référence interne K-Pay
  status: KPayStatus;
  amount: number;                    // montant brut (XAF)
  currency: string;                  // "XAF"
  phoneNumber: string;               // numéro du client
  provider?: KPayProvider;           // "MTN_MOMO_CMR" | "ORANGE_CMR"
  externalId?: string;               // = orderId passé à l'init
  metadata?: Record<string, string>; // données libres passées à l'init
  failureReason?: string | null;
  completedAt?: string | null;
  failedAt?: string | null;
  rawTimestamp: string;              // timestamp K-Pay (ISO 8601)
  receivedAt: Timestamp;             // timestamp de réception Firestore
}

/** Payload brut envoyé par K-Pay en webhook */
export interface KPayWebhookPayload {
  event: KPayEventType;
  paymentId: string;
  reference: string;
  status: KPayStatus;
  amount: number;
  phoneNumber: string;
  externalId?: string;
  metadata?: Record<string, string>;
  completedAt: string | null;
  failedAt: string | null;
  failureReason: string | null;
  timestamp: string;
}
