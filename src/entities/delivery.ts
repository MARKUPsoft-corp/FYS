export interface DeliveryZone {
  id: string;
  name: string;
  fee: number;
  description?: string;
  districts: string[];
}

export const DEFAULT_DELIVERY_ZONES: DeliveryZone[] = [
  {
    id: 'zone_1',
    name: 'Zone 1 : Proximité Nsimeyong & Rayon Court',
    fee: 1000,
    description: 'Nsimeyong, Biyem-Assi, Mendong, Damase, Etoug-Ebe, Jouvence, Melen, Ngoa-Ekellé, Obili, Simbock',
    districts: [
      'Nsimeyong',
      'Nsimeyong I',
      'Nsimeyong II',
      'Nsimeyong III',
      'Biyem-Assi',
      'Accacia',
      'Rond-point Biyem-Assi',
      'Montée des Sœurs',
      'Damase',
      'Rond-point Damase',
      'Mendong',
      'Jouvence',
      'Carrefour Jouvence',
      'Etoug-Ebe',
      'Melen',
      'Mini-ferme',
      'Ngoa-Ekele',
      'Obili',
      'Simbock',
      'Elig-Effa',
    ],
  },
  {
    id: 'zone_2',
    name: 'Zone 2 : Centre-ville & Rayon Moyen',
    fee: 1500,
    description: 'Bastos, Centre-ville, Tsinga, Nlongkak, Mokolo, Nsam, Mvog-Mbi, Omnisports, Essos, Mbankolo...',
    districts: [
      'Centre-ville (Plateau)',
      'Poste Centrale',
      'Boulevard du 20 mai',
      'Hippodrome',
      'Bastos',
      'Golf',
      'Dragages',
      'Tsinga',
      'Messa',
      'Mokolo',
      'Madagascar',
      'Ekoudou',
      'Nlongkak',
      'Elig-Essono',
      'Elig-Edzoa',
      'Warda',
      'Mbankolo',
      'Nsam',
      'Ahala',
      'Obobogo',
      'Mvog-Mbi',
      'Mvog-Ada',
      'Coron',
      'Omnisports',
      'Essos',
      'Mfandena',
      'Kondengui',
      'Emombo',
      'Nkol-Eton',
      'Bonamoussadi',
      'Santa Barbara',
      'Ekié',
      'Djoungolo',
    ],
  },
  {
    id: 'zone_3',
    name: 'Zone 3 : Longue Distance & Périphérie',
    fee: 2000,
    description: 'Odza, Messamendongo, Ngousso, Emana, Messassi, Olembe, Nkomo, Biteng, Nkoabang, Awae...',
    districts: [
      'Odza',
      'Messamendongo',
      'Borne 10',
      'Auberge bleue',
      'Koweït',
      'Ngousso',
      'Hôpital Général',
      'Eleveurs',
      'Emana',
      'Messassi',
      'Olembe',
      'Nkomo',
      'Biteng',
      'Awae',
      'Nkolmesseng',
      'Mimboman',
      'Nkol-Afeme',
      'Nkoabang',
      'Nkolnda',
      'Mvogbeti-Messala',
      'Nkolbisson',
    ],
  },
];

/**
 * Normalise un nom de quartier pour une correspondance robuste
 */
export function normalizeDistrictName(name: string): string {
  return (name || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Détermine la zone de livraison et les frais exacts pour un quartier donné.
 */
export function getDeliveryZoneForDistrict(
  districtName?: string | null,
  zones: DeliveryZone[] = DEFAULT_DELIVERY_ZONES,
): { zone: DeliveryZone | null; fee: number; isDefault: boolean } {
  const activeZones = Array.isArray(zones) && zones.length > 0 ? zones : DEFAULT_DELIVERY_ZONES;

  if (!districtName || !districtName.trim()) {
    return { zone: activeZones[0] || null, fee: activeZones[0]?.fee ?? 1000, isDefault: true };
  }

  const clean = normalizeDistrictName(districtName);

  // 1. Recherche par correspondance exacte
  for (const zone of activeZones) {
    for (const d of zone.districts) {
      if (normalizeDistrictName(d) === clean) {
        return { zone, fee: zone.fee, isDefault: false };
      }
    }
  }

  // 2. Recherche par inclusion de mot-clé (ex: "Odza Borne 10" match avec "Odza")
  for (const zone of activeZones) {
    for (const d of zone.districts) {
      const normD = normalizeDistrictName(d);
      if (normD.length >= 4 && (clean.includes(normD) || normD.includes(clean))) {
        return { zone, fee: zone.fee, isDefault: false };
      }
    }
  }

  // 3. Fallback : si quartier inconnu ou non répertorié, tarif intermédiaire standard
  const fallbackFee = activeZones[1]?.fee ?? 1500;
  return { zone: activeZones[1] || null, fee: fallbackFee, isDefault: true };
}
