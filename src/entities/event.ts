import { Timestamp } from 'firebase/firestore';

export type FysEventType = 
  | 'seminar'
  | 'seminaire'
  | 'conference'
  | 'cocktail'
  | 'cocktail_entreprise'
  | 'team_building'
  | 'gala'
  | 'soiree_entreprise'
  | 'lancement_produit'
  | 'wedding'
  | 'mariage_prive'
  | 'meeting'
  | 'other'
  | 'autre';

export const FYS_EVENT_TYPE_LABELS: Record<string, string> = {
  seminar: 'Séminaire & Conférence',
  seminaire: 'Séminaire d\'entreprise',
  conference: 'Conférence & Forum',
  cocktail: 'Cocktail & Réception',
  cocktail_entreprise: 'Cocktail d\'entreprise',
  team_building: 'Team Building & Afterwork',
  gala: 'Gala & Cérémonie',
  soiree_entreprise: 'Soirée d\'entreprise / Gala',
  lancement_produit: 'Lancement de produit',
  wedding: 'Célébration & Fête',
  mariage_prive: 'Événement privé / Réception',
  meeting: 'Réunion de Direction',
  other: 'Autre Événement',
  autre: 'Autre Événement',
};

export type FysEventStatus = 
  | 'draft'
  | 'submitted'
  | 'confirmed'
  | 'in_preparation'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled';

export const FYS_EVENT_STATUS_LABELS: Record<FysEventStatus, string> = {
  draft: 'Brouillon',
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
  bottleSize?: '500ml' | '1L';
  bottleVolume?: '500ml' | '1L';
  quantity: number;
  unitPrice: number;
  lineTotal?: number;
  totalPrice?: number;
}

export interface FysEventLogistics {
  coolerBoxesNeeded?: boolean;
  needCoolerBoxes?: boolean;
  coolerBoxesCount?: number;
  coolerBoxFee?: number;

  ecoCupsNeeded?: boolean;
  needEcoCups?: boolean;
  ecoCupsCount?: number;
  ecoCupsFee?: number;

  bartenderServiceNeeded?: boolean;
  needBartenderService?: boolean;
  bartenderHours?: number;
  bartenderHourlyRate?: number;
  bartenderFee?: number;

  logisticsFee?: number;
  notes?: string;
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
  eventName?: string;
  eventTitle?: string;
  eventType: FysEventType;
  customEventType?: string;
  eventDate: string;        // YYYY-MM-DD
  deliveryTime?: string;     // HH:mm
  guestCount: number;       // Nombre de participants estimés
  location?: string;
  locationDistrict?: string;
  locationAddress?: string;
  specialInstructions?: string;

  // Contenu & Tarification
  selectedJuices?: FysEventJuiceItem[];
  items?: FysEventJuiceItem[];
  logistics?: FysEventLogistics;
  totalBottles: number;
  totalLiters?: number;
  subtotalJuices?: number;
  rawJuiceTotal?: number;
  volumeDiscountPercent?: number;
  discountPercent?: number;
  volumeDiscountAmount?: number;
  discountAmount?: number;
  deliveryFee?: number;
  totalLogisticsFee?: number;
  totalPrice?: number;
  totalAmount?: number;

  status: FysEventStatus;
  statusNotes?: string;
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
  volumeDiscountTiers: EventVolumeDiscountTier[];
  coolerBoxUnitPrice: number;
  coolerBoxPricePerUnit: number;
  ecoCupUnitPrice: number;
  ecoCupPricePerUnit: number;
  bartenderHalfDayRate: number;
  bartenderServiceHourlyRate: number;
  baseEventDeliveryFee: number;
  whatsappNumber?: string;
  updatedAt?: Timestamp | any;
}

export const DEFAULT_FYS_EVENT_PRICING: FysEventPricingSettings = {
  volumeDiscounts: [
    { minBottles: 30, discountPercent: 5 },
    { minBottles: 50, discountPercent: 10 },
    { minBottles: 100, discountPercent: 15 },
    { minBottles: 200, discountPercent: 20 },
  ],
  volumeDiscountTiers: [
    { minBottles: 30, discountPercent: 5 },
    { minBottles: 50, discountPercent: 10 },
    { minBottles: 100, discountPercent: 15 },
    { minBottles: 200, discountPercent: 20 },
  ],
  coolerBoxUnitPrice: 2500,
  coolerBoxPricePerUnit: 2500,
  ecoCupUnitPrice: 75,
  ecoCupPricePerUnit: 75,
  bartenderHalfDayRate: 15000,
  bartenderServiceHourlyRate: 5000,
  baseEventDeliveryFee: 3000,
  whatsappNumber: '+237699000000',
};
