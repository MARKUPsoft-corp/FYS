import { Timestamp } from 'firebase/firestore';

export type FysEventType = 
  | 'seminar'        // Séminaire / Conférence
  | 'cocktail'       // Cocktail / Réception
  | 'team_building'  // Team building / Afterwork
  | 'gala'           // Gala / Soirée d'entreprise
  | 'wedding'        // Célébration privée / Fête d'entreprise
  | 'meeting'        // Réunion de direction
  | 'other';         // Autre événement

export const FYS_EVENT_TYPE_LABELS: Record<FysEventType, string> = {
  seminar: 'Séminaire & Conférence',
  cocktail: 'Cocktail & Réception',
  team_building: 'Team Building & Afterwork',
  gala: 'Gala & Cérémonie',
  wedding: 'Célébration & Fête',
  meeting: 'Réunion de Direction',
  other: 'Autre Événement',
};

export type FysEventStatus = 
  | 'submitted'        // Demande / Commande envoyée
  | 'confirmed'        // Confirmée par FYS
  | 'in_preparation'   // En cours de pressage / préparation
  | 'out_for_delivery' // En cours de livraison
  | 'delivered'        // Livrée à l'événement
  | 'cancelled';       // Annulée

export const FYS_EVENT_STATUS_LABELS: Record<FysEventStatus, string> = {
  submitted: 'Commande reçue',
  confirmed: 'Confirmée',
  in_preparation: 'En préparation',
  out_for_delivery: 'En cours de livraison',
  delivered: 'Livrée avec succès',
  cancelled: 'Annulée',
};

export interface FysEventJuiceItem {
  cocktailId: string;
  name: string;
  imageUrl?: string;
  description?: string;
  bottleSize: '500ml' | '1L';
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface FysEventLogistics {
  coolerBoxesNeeded: boolean;      // Glacières isothermes avec glace
  coolerBoxesCount?: number;
  ecoCupsNeeded: boolean;          // Gobelets écologiques biodégradables
  ecoCupsCount?: number;
  bartenderServiceNeeded: boolean; // Service barman / hôte FYS sur site
  logisticsFee: number;
}

export interface FysEvent {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  userPhone?: string;

  // Coordonnées Entreprise & Événement
  companyName: string;
  contactPerson: string;
  contactEmail: string;
  contactPhone: string;
  eventName: string;
  eventType: FysEventType;
  eventDate: string;        // YYYY-MM-DD
  deliveryTime: string;     // HH:mm
  guestCount: number;       // Nombre de participants estimés
  locationDistrict: string; // Quartier Yaoundé
  locationAddress: string;  // Salle / Étage / Adresse précise
  specialInstructions?: string;

  // Contenu & Tarification
  selectedJuices: FysEventJuiceItem[];
  logistics: FysEventLogistics;
  totalBottles: number;
  subtotalJuices: number;
  volumeDiscountPercent: number;
  volumeDiscountAmount: number;
  deliveryFee: number;
  totalPrice: number;

  status: FysEventStatus;
  statusHistory?: { status: FysEventStatus; timestamp: string; note?: string }[];
  adminNotes?: string;

  createdAt: Timestamp | any;
  updatedAt: Timestamp | any;
}

export interface EventVolumeDiscountTier {
  minBottles: number;
  discountPercent: number; // ex: 30 = 5%, 50 = 10%, 100 = 15%, 200 = 20%
}

export interface FysEventPricingSettings {
  volumeDiscounts: EventVolumeDiscountTier[];
  coolerBoxUnitPrice: number;       // Prix par glacière mise à disposition (ex: 2 500 XAF)
  ecoCupUnitPrice: number;           // Prix unitaire par gobelet biodégradable (ex: 75 XAF)
  bartenderHalfDayRate: number;     // Forfait barman / animateur demi-journée (ex: 15 000 XAF)
  baseEventDeliveryFee: number;     // Frais de livraison événementielle (ex: 3 000 XAF)
  updatedAt?: Timestamp | any;
}

export const DEFAULT_FYS_EVENT_PRICING: FysEventPricingSettings = {
  volumeDiscounts: [
    { minBottles: 30, discountPercent: 5 },
    { minBottles: 50, discountPercent: 10 },
    { minBottles: 100, discountPercent: 15 },
    { minBottles: 200, discountPercent: 20 },
  ],
  coolerBoxUnitPrice: 2500,
  ecoCupUnitPrice: 75,
  bartenderHalfDayRate: 15000,
  baseEventDeliveryFee: 3000,
};
