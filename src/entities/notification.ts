import type { Timestamp } from 'firebase/firestore';

export interface AppNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  isRead: boolean;
  link?: string;
  createdAt: Timestamp | Date;
}

export type CreateNotificationPayload = Omit<AppNotification, 'id' | 'isRead' | 'createdAt'>;
