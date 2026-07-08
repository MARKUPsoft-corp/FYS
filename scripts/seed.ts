/**
 * Firestore seed script — imports fruits_db.json into Firestore.
 *
 * Run:  pnpm install   (first time, installs tsx + dotenv)
 *       pnpm seed
 */

import { config } from 'dotenv';
config({ path: '.env.local' });

import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, Timestamp } from 'firebase/firestore';
import fruitsDb from '../src/data/fruits_db.json' assert { type: 'json' };
import type {
  Fruit,
  Category,
  CocktailRole,
  DataStatus,
  GlycemicBadge,
  NutrientValue,
  FruitMacros,
  FruitVitamins,
  FruitMinerals,
  Bioactive,
} from '../src/entities/fruit';

// ── Firebase init ─────────────────────────────────────────────────────────

const app = initializeApp({
  apiKey:            process.env.RASENGAN_FIREBASE_API_KEY,
  authDomain:        process.env.RASENGAN_FIREBASE_AUTH_DOMAIN,
  projectId:         process.env.RASENGAN_FIREBASE_PROJECT_ID,
  storageBucket:     process.env.RASENGAN_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.RASENGAN_FIREBASE_MESSAGING_SENDER_ID,
  appId:             process.env.RASENGAN_FIREBASE_APP_ID,
});

const db = getFirestore(app);

// ── Categories ────────────────────────────────────────────────────────────

const CATEGORIES: Category[] = [
  { id: 'fruit_principal',      name: 'Main Fruit' },
  { id: 'fruit_rare_superfruit', name: 'Rare Fruit / Superfruit' },
  { id: 'fruit_courant',        name: 'Common Fruit' },
  { id: 'legume_fruit',         name: 'Vegetable-Fruit' },
  { id: 'supplement_herbe',     name: 'Supplement / Herb' },
];

// ── Mapping helpers ───────────────────────────────────────────────────────

function glycemicBadge(raw: string): GlycemicBadge {
  const map: Record<string, GlycemicBadge> = {
    bas: 'low', modere: 'moderate', eleve: 'high', variable: 'variable',
  };
  return map[raw] ?? 'low';
}

function cocktailRole(raw: string): CocktailRole {
  const map: Record<string, CocktailRole> = {
    acide: 'acid', sucre: 'sweet', antioxydant: 'antioxidant',
    mineral: 'mineral', base: 'base',
  };
  return map[raw] ?? 'base';
}

const BENEFIT_MAP: Record<string, string> = {
  'Digestion': 'Digestion',
  'Immunité': 'Immunity',
  'Immunité n°1': 'Immunity #1',
  'Anti-inflammatoire': 'Anti-inflammatory',
  'Énergie': 'Energy',
  'Hydratation': 'Hydration',
  'Antioxydant': 'Antioxidant',
  'Antioxydant n°1': 'Antioxidant #1',
  'Peau': 'Skin',
  'Peau n°1': 'Skin #1',
  'Peau (Éclat)': 'Skin (Radiance)',
  'Récupération sportive': 'Sports Recovery',
  'Récupération': 'Recovery',
  'Tonus musculaire': 'Muscle Tone',
  'Sérénité': 'Serenity',
  'Sommeil (tryptophane)': 'Sleep (Tryptophan)',
  'Sommeil': 'Sleep',
  'Détox': 'Detox',
  'Équilibre acide': 'Acid Balance',
  'Anti-infectieux': 'Anti-infective',
  'Santé cardiaque': 'Heart Health',
  'Antistress': 'Anti-stress',
  'Os & dents': 'Bones & Teeth',
  'Prébiotique': 'Prebiotic',
  'Anti-fatigue': 'Anti-fatigue',
  'Diabète-friendly': 'Diabetes-friendly',
  'Cholestérol': 'Cholesterol',
  'Énergie régulière': 'Steady Energy',
  'Vision': 'Vision',
  'Éclat du teint': 'Radiant Complexion',
  'Fraîcheur': 'Freshness',
  'Antispasmodique': 'Antispasmodic',
  'Anti-nausées': 'Anti-nausea',
  'Base idéale': 'Ideal Base',
  'Grossesse (B9)': 'Pregnancy (B9)',
  'Grossesse': 'Pregnancy',
  'Sport': 'Sport',
  'Cardiovasculaire': 'Cardiovascular',
  'Hypertension': 'Blood Pressure',
  'Yeux': 'Eyes',
};

function mapBenefits(badges: string[]): string[] {
  return badges.map((b) => BENEFIT_MAP[b] ?? b);
}

function nv(obj: Record<string, unknown> | null | undefined): NutrientValue | undefined {
  if (!obj || obj['valeur'] == null) return undefined;
  return {
    value: obj['valeur'] as number,
    ...(obj['pourcentage_vnr'] != null ? { nrvPercent: obj['pourcentage_vnr'] as number } : {}),
  };
}

function num(v: unknown): number | undefined {
  if (v == null || v === false) return undefined;
  const n = Number(v);
  return isNaN(n) ? undefined : n;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function stripUndefined(obj: any): any {
  if (Array.isArray(obj)) return obj.map(stripUndefined);
  if (obj !== null && typeof obj === 'object') {
    return Object.fromEntries(
      Object.entries(obj)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => [k, stripUndefined(v)]),
    );
  }
  return obj;
}

function str(v: unknown): string | undefined {
  if (!v || typeof v !== 'string') return undefined;
  return v;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapFruit(json: any): Omit<Fruit, 'createdAt' | 'updatedAt'> {
  const sc  = json.donnees_scientifiques ?? {};
  const mac = sc.macronutriments ?? {};
  const vit = sc.vitamines ?? {};
  const min = sc.mineraux ?? {};
  const gi  = json.index_glycemique ?? {};
  const ter = json.terrain_nutrifys ?? {};
  const fic = json.fiche_conversationnelle ?? {};
  const bio: Bioactive[] = (sc.polyphenols_composes_bioactifs ?? []).map(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (b: any) => ({
      name: b.nom,
      ...(b.valeur_approx  ? { approximateValue: b.valeur_approx } : {}),
      ...(b.description    ? { description: b.description }        : {}),
    }),
  );

  const macros: FruitMacros = {
    calories_kcal:  num(mac.calories_kcal),
    water_g:        num(mac.eau_g),
    carbs_g:        num(mac.glucides_g),
    sugar_g:        num(mac.sucres_g),
    fiber_g:        num(mac.fibres_g),
    fat_g:          num(mac.lipides_g),
    saturatedFat_g: num(mac.acides_gras_satures_g),
    protein_g:      num(mac.proteines_g),
  };

  const vitamins: FruitVitamins = {
    vitaminC_mg:  nv(vit.vitamine_c_mg),
    vitaminA_ug:  nv(vit.equivalent_vitamine_a_ug),
    vitaminB1_mg: nv(vit.vitamine_b1_mg),
    vitaminB2_mg: nv(vit.vitamine_b2_mg),
    vitaminB3_mg: nv(vit.vitamine_b3_mg),
    vitaminB5_mg: nv(vit.vitamine_b5_mg),
    vitaminB6_mg: nv(vit.vitamine_b6_mg),
    vitaminB9_ug: nv(vit.vitamine_b9_ug),
    vitaminE_mg:  nv(vit.vitamine_e_mg),
    vitaminK1_ug: nv(vit.vitamine_k1_ug),
  };

  const minerals: FruitMinerals = {
    calcium_mg:   nv(min.calcium_mg),
    iron_mg:      nv(min.fer_mg),
    magnesium_mg: nv(min.magnesium_mg),
    phosphorus_mg:nv(min.phosphore_mg),
    potassium_mg: nv(min.potassium_mg),
    zinc_mg:      nv(min.zinc_mg),
    copper_mg:    nv(min.cuivre_mg),
    manganese_mg: nv(min.manganese_mg),
    sodium_mg:    nv(min.sodium_mg),
  };

  const warnings: string[] = [
    ...(ter.precautions        ? [ter.precautions]        : []),
    ...(ter.contre_indications ? [ter.contre_indications] : []),
  ];

  return {
    id: json.id,
    name: json.nom,
    ...(json.nom_scientifique ? { scientificName: json.nom_scientifique } : {}),
    pricePerGram: undefined,
    categoryIds: [json.categorie],
    imageUrl: undefined,

    benefits: mapBenefits(ter.badges_benefices ?? []),
    warnings,
    ...(fic.role_cocktail ? { cocktailRole: cocktailRole(fic.role_cocktail) } : {}),
    ...(fic.a_eviter_si?.length ? { avoidIf: fic.a_eviter_si } : {}),
    ...(fic.timing ? { timing: fic.timing } : {}),

    glycemicIndex: gi.badge ? {
      ...(gi.valeur_min    != null ? { min: gi.valeur_min }           : {}),
      ...(gi.valeur_max    != null ? { max: gi.valeur_max }           : {}),
      badge: glycemicBadge(gi.badge),
      ...(gi.charge_glycemique != null ? { glycemicLoad: gi.charge_glycemique } : {}),
      ...(gi.note ? { note: gi.note } : {}),
    } : undefined,

    nutrients: { macros, vitamins, minerals },
    ...(bio.length ? { bioactives: bio } : {}),

    healthProfile: {
      benefitBadges: ter.badges_benefices ?? [],
      ...(str(ter.regles_ok)           ? { okRules: ter.regles_ok }                      : {}),
      ...(str(ter.precautions)         ? { precautions: ter.precautions }                : {}),
      ...(str(ter.contre_indications)  ? { contraindications: ter.contre_indications }   : {}),
      ...(str(ter.note_nutritionniste) ? { nutritionistNote: ter.note_nutritionniste }   : {}),
    },

    dataStatus: json.statut_donnees === 'complet' ? 'complete' : 'partial' as DataStatus,
    ...(json.sources?.length ? { sources: json.sources } : {}),
    validatedByNutritionist: json.metadata?.valide_par_nutritionniste ?? false,
  };
}

// ── Main ──────────────────────────────────────────────────────────────────

async function seed() {
  console.log('🌱  Seeding categories…');
  for (const cat of CATEGORIES) {
    await setDoc(doc(db, 'categories', cat.id), cat);
    console.log(`   ✓ ${cat.name}`);
  }

  console.log('\n🌱  Seeding fruits…');
  const now = Timestamp.now();
  for (const json of fruitsDb) {
    const fruit = mapFruit(json);
    await setDoc(doc(db, 'fruits', fruit.id), stripUndefined({
      ...fruit,
      createdAt: now,
      updatedAt: now,
    }));
    console.log(`   ✓ ${fruit.name}`);
  }

  console.log('\n✅  Seed complete.');
  process.exit(0);
}

seed().catch((err) => {
  console.error('❌  Seed failed:', err);
  process.exit(1);
});
