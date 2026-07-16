import { Timestamp } from 'firebase/firestore';

export enum UserRole {
  CUSTOMER = 'customer',
  ADMIN = 'admin',
}

export interface User {
  uid: string; // == Firebase Auth uid, utilisé comme document ID
  name: string;
  email: string;
  phone?: string;
  role: UserRole;
  lastActiveAt?: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// collection: "users/{uid}/profile" (doc unique "main")
export interface HealthProfile {
  userId: string; // FK vers User.uid
  healthConditions: string[];   // ex: ["diabetes", "hypertension"]
  allergies: string[];          // ex: ["kiwi", "strawberry"]
  goals?: string[];             // ex: ["weight_loss", "energy_boost"]
  updatedAt: Timestamp;
}
