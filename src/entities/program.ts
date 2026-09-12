import { Timestamp } from 'firebase/firestore';
import type { BottleSize } from './settings';

export type ProgramGoal =
  | 'detox'
  | 'immunity'
  | 'digestion'
  | 'energy'
  | 'weight_loss'
  | 'glow';

export type ProgramTiming =
  | 'morning_empty_stomach'
  | 'morning'
  | 'afternoon'
  | 'evening';

export const PROGRAM_TIMING_LABELS: Record<ProgramTiming, string> = {
  morning_empty_stomach: 'À jeun au réveil',
  morning: 'Au petit-déjeuner',
  afternoon: 'En collation (16h)',
  evening: 'En début de soirée',
};

export interface ProgramDayItem {
  dayNumber: number; // 1, 2, 3...
  cocktailId?: string;
  cocktailName: string;
  cocktailImage: string;
  timing: ProgramTiming;
  timingLabel: string;
  benefits: string[];
  advice: string;
  fruitNames: string[];
}

export interface Program {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  description: string;
  goal: ProgramGoal;
  goalLabel: string;
  durationDays: number;
  bottlesTotal: number;
  bottleSize: BottleSize;
  price: number; // Prix pack complet en XAF
  originalPrice?: number; // Prix avant réduction (optionnel)
  badge?: string; // "Cure Express", "Bestseller", "Idéal Débutant"...
  imageUrl: string;
  colorAccent: string; // Tailwind color class or hex
  highlights: string[];
  days: ProgramDayItem[];
  isActive: boolean;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface UserProgramCheckin {
  checkedAt: Timestamp;
  note?: string;
}

export interface UserProgram {
  id: string;
  userId: string;
  userName?: string;
  userPhone?: string;
  programId: string;
  programTitle: string;
  programGoal: ProgramGoal;
  durationDays: number;
  startDate: Timestamp;
  endDate: Timestamp;
  status: 'active' | 'completed' | 'paused';
  dailyCheckins: Record<number, UserProgramCheckin>; // Clé: jour (ex: 1, 2, 3)
  progressPercent: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ── 3 Programmes de lancement pré-configurés ────────────────────────────────

export const DEFAULT_PROGRAMS: Program[] = [
  {
    id: 'program-detox-3j',
    slug: 'cure-detox-eclair',
    title: 'Cure Détox Éclair',
    subtitle: 'Purifiez votre organisme et dégonflez en 3 jours chrono.',
    description:
      'Un protocole express conçu pour relancer votre système digestif, drainer les toxines accumulées et retrouver une sensation immédiate de légèreté. 1 jus pressé à froid chaque matin à jeun.',
    goal: 'detox',
    goalLabel: 'Détox & Élimination',
    durationDays: 3,
    bottlesTotal: 3,
    bottleSize: '500ml',
    price: 5500,
    originalPrice: 6500,
    badge: 'Cure Express Bestseller',
    imageUrl:
      'https://images.pexels.com/photos/1337825/pexels-photo-1337825.jpeg?auto=compress&cs=tinysrgb&w=1200',
    colorAccent: 'emerald',
    highlights: [
      '3 bouteilles 500ml 100% brutes sans eau ni sucre',
      'Effet dégonflement et ventre léger garanti',
      'Drainage hépatique & rénal naturel',
      'Conseils NutriFYS personnalisés chaque matin',
    ],
    isActive: true,
    days: [
      {
        dayNumber: 1,
        cocktailName: 'Élixir Vert Détox',
        cocktailImage:
          'https://images.unsplash.com/photo-1622597467836-f3885f2011ea?q=80&w=800&auto=format&fit=crop',
        timing: 'morning_empty_stomach',
        timingLabel: 'À jeun au réveil (entre 7h et 8h30)',
        benefits: ['Drainage', 'Alcalinisant', 'Légèreté'],
        fruitNames: ['Concombre', 'Pomme Verte', 'Menthe', 'Gingembre'],
        advice:
          'Buvez lentement par petites gorgées 20 minutes avant votre petit-déjeuner. Hydratez-vous avec au moins 1,5L d’eau plate aujourd’hui pour faciliter l’évacuation des toxines.',
      },
      {
        dayNumber: 2,
        cocktailName: 'Sunrise Purifiant',
        cocktailImage:
          'https://images.pexels.com/photos/158053/fresh-orange-juice-squeezed-refreshing-citrus-158053.jpeg?auto=compress&cs=tinysrgb&w=800',
        timing: 'morning_empty_stomach',
        timingLabel: 'À jeun au réveil (entre 7h et 8h30)',
        benefits: ['Vitamine C', 'Activation Hépatique', 'Antioxydant'],
        fruitNames: ['Ananas', 'Carotte', 'Citron', 'Curcuma'],
        advice:
          'La bromélaïne de l’ananas et la curcumine soutiennent votre foie dans sa phase de nettoyage. Évitez les aliments ultra-transformés et les fritures pour la journée.',
      },
      {
        dayNumber: 3,
        cocktailName: 'Grand Reset Vital',
        cocktailImage:
          'https://images.unsplash.com/photo-1546173159-315724a31696?q=80&w=800&auto=format&fit=crop',
        timing: 'morning_empty_stomach',
        timingLabel: 'À jeun au réveil (entre 7h et 8h30)',
        benefits: ['Clarté Mentale', 'Énergie Naturelle', 'Renouveau'],
        fruitNames: ['Pomme', 'Betterave', 'Gingembre', 'Citron'],
        advice:
          'Dernier jour de votre cure ! Vous devriez déjà ressentir un regain de dynamisme et une digestion apaisée. Privilégiez un dîner léger pour clore la cure en douceur.',
      },
    ],
  },
  {
    id: 'program-immunite-7j',
    slug: 'bouclier-immunite',
    title: 'Bouclier Immunité & Énergie',
    subtitle: '7 jours pour blinder vos défenses et recharger vos batteries.',
    description:
      'Une semaine complète d’apports massifs en vitamines C, bêtacarotène et antioxydants puissants. Idéal lors des changements de saison, coups de fatigue ou périodes intenses.',
    goal: 'immunity',
    goalLabel: 'Défenses & Vitalité',
    durationDays: 7,
    bottlesTotal: 7,
    bottleSize: '500ml',
    price: 12000,
    originalPrice: 14000,
    badge: 'Vitalité Maximale',
    imageUrl:
      'https://images.pexels.com/photos/109275/pexels-photo-109275.jpeg?auto=compress&cs=tinysrgb&w=1200',
    colorAccent: 'amber',
    highlights: [
      '7 bouteilles 500ml riches en vitamine C active',
      'Synergie gingembre, curcuma & agrumes du terroir',
      'Barrière protectrice naturelle contre la fatigue',
      'Accompagnement quotidien étape par étape',
    ],
    isActive: true,
    days: [
      {
        dayNumber: 1,
        cocktailName: 'Citrus Tonic Boost',
        cocktailImage:
          'https://images.pexels.com/photos/158053/fresh-orange-juice-squeezed-refreshing-citrus-158053.jpeg?auto=compress&cs=tinysrgb&w=800',
        timing: 'morning',
        timingLabel: 'Au réveil ou petit-déjeuner',
        benefits: ['Vitamine C', 'Coup de fouet', 'Hydratation'],
        fruitNames: ['Orange', 'Pamplemousse', 'Citron Vert', 'Gingembre'],
        advice: 'Lancez votre semaine avec une explosion de fraîcheur acidulée pour réveiller votre métabolisme.',
      },
      {
        dayNumber: 2,
        cocktailName: 'Orange Curcuma Énergie',
        cocktailImage:
          'https://images.unsplash.com/photo-1600271886742-f049cd451bba?q=80&w=800&auto=format&fit=crop',
        timing: 'morning',
        timingLabel: 'Au réveil ou petit-déjeuner',
        benefits: ['Anti-inflammatoire', 'Protection cellulaire'],
        fruitNames: ['Carotte', 'Orange', 'Curcuma', 'Pomme'],
        advice: 'Le curcuma et le bêtacarotène agissent en synergie pour stimuler la production de globules blancs.',
      },
      {
        dayNumber: 3,
        cocktailName: 'Tropical Défense',
        cocktailImage:
          'https://images.unsplash.com/photo-1546173159-315724a31696?q=80&w=800&auto=format&fit=crop',
        timing: 'morning',
        timingLabel: 'Au réveil ou petit-déjeuner',
        benefits: ['Enzymes vivantes', 'Vitalité', 'Antioxydants'],
        fruitNames: ['Ananas', 'Fruit de la Passion', 'Gingembre'],
        advice: 'Savourez ce mélange doux et tonique. Prenez le temps de respirer profondément avant de démarrer votre journée.',
      },
      {
        dayNumber: 4,
        cocktailName: 'Ruby Vitalité',
        cocktailImage:
          'https://images.unsplash.com/photo-1534353473418-4cfa6c56fd38?q=80&w=800&auto=format&fit=crop',
        timing: 'morning',
        timingLabel: 'Au réveil ou petit-déjeuner',
        benefits: ['Oxygénation', 'Endurance', 'Circulation'],
        fruitNames: ['Betterave', 'Pomme', 'Carotte', 'Citron'],
        advice: 'La betterave améliore l’oxygénation sanguine. Idéal pour passer le cap du milieu de semaine sans coup de pompe.',
      },
      {
        dayNumber: 5,
        cocktailName: 'Élixir Vert Protecteur',
        cocktailImage:
          'https://images.unsplash.com/photo-1622597467836-f3885f2011ea?q=80&w=800&auto=format&fit=crop',
        timing: 'morning',
        timingLabel: 'Au réveil ou petit-déjeuner',
        benefits: ['Chlorophylle', 'Reminéralisant', 'Défenses'],
        fruitNames: ['Concombre', 'Pomme', 'Menthe', 'Gingembre'],
        advice: 'Les minéraux alcalinisants soulagent la fatigue accumulée. Pensez à dormir au moins 7h30 ce soir.',
      },
      {
        dayNumber: 6,
        cocktailName: 'Golden Sunrise',
        cocktailImage:
          'https://images.pexels.com/photos/158053/fresh-orange-juice-squeezed-refreshing-citrus-158053.jpeg?auto=compress&cs=tinysrgb&w=800',
        timing: 'morning',
        timingLabel: 'Au réveil ou petit-déjeuner',
        benefits: ['Teint éclatant', 'Tonus général', 'Défenses'],
        fruitNames: ['Ananas', 'Orange', 'Carotte', 'Curcuma'],
        advice: 'Plus qu’un jour ! Vous apportez un stock précieux de micronutriments protecteurs à votre corps.',
      },
      {
        dayNumber: 7,
        cocktailName: 'Bouclier Suprême',
        cocktailImage:
          'https://images.unsplash.com/photo-1600271886742-f049cd451bba?q=80&w=800&auto=format&fit=crop',
        timing: 'morning',
        timingLabel: 'Au réveil ou petit-déjeuner',
        benefits: ['Consolidation', 'Énergie durable', 'Bien-être global'],
        fruitNames: ['Passion', 'Ananas', 'Gingembre', 'Citron'],
        advice: 'Félicitations pour ces 7 jours de régularité ! Vos défenses naturelles sont rechargées au maximum.',
      },
    ],
  },
  {
    id: 'program-ventre-plat-5j',
    slug: 'ventre-plat-confort',
    title: 'Ventre Plat & Confort Digestif',
    subtitle: '5 jours pour apaiser vos intestins et dire adieu aux ballonnements.',
    description:
      'Conçu avec des fruits riches en enzymes protéolytiques (bromélaïne de l’ananas), menthe fraîche apaisante et concombre hydratant. Soulage rapidement les inconforts après repas.',
    goal: 'digestion',
    goalLabel: 'Digestion & Confort',
    durationDays: 5,
    bottlesTotal: 5,
    bottleSize: '500ml',
    price: 9000,
    originalPrice: 10500,
    badge: 'Confort Intestinal',
    imageUrl:
      'https://images.pexels.com/photos/1267320/pexels-photo-1267320.jpeg?auto=compress&cs=tinysrgb&w=1200',
    colorAccent: 'teal',
    highlights: [
      '5 bouteilles 500ml ciblées bien-être intestinal',
      'Bromélaïne d’ananas & menthe fraîche bio',
      'Soulagement visible des ballonnements',
      'Routine simple et agréable sur 5 jours ouvrés',
    ],
    isActive: true,
    days: [
      {
        dayNumber: 1,
        cocktailName: 'Ananas Menthe Pure',
        cocktailImage:
          'https://images.unsplash.com/photo-1546173159-315724a31696?q=80&w=800&auto=format&fit=crop',
        timing: 'morning_empty_stomach',
        timingLabel: 'Le matin à jeun',
        benefits: ['Enzymes digestives', 'Fraîcheur', 'Apaisement'],
        fruitNames: ['Ananas', 'Menthe', 'Citron Vert'],
        advice: 'Prenez ce premier jus lentement. La menthe détend la paroi intestinale tandis que l’ananas amorce la digestion.',
      },
      {
        dayNumber: 2,
        cocktailName: 'Douceur Verte Concombre',
        cocktailImage:
          'https://images.unsplash.com/photo-1622597467836-f3885f2011ea?q=80&w=800&auto=format&fit=crop',
        timing: 'morning_empty_stomach',
        timingLabel: 'Le matin à jeun',
        benefits: ['Hydratation profonde', 'Fibres solubles', 'Zéro lourdeur'],
        fruitNames: ['Concombre', 'Pomme', 'Gingembre'],
        advice: 'Mangez assis et mâchez bien vos repas aujourd’hui pour accompagner le travail bienfaisant du jus.',
      },
      {
        dayNumber: 3,
        cocktailName: 'Passion Gingembre Apaisant',
        cocktailImage:
          'https://images.unsplash.com/photo-1560717789-0ac7c58ac90a?q=80&w=800&auto=format&fit=crop',
        timing: 'morning_empty_stomach',
        timingLabel: 'Le matin à jeun',
        benefits: ['Tonus digestif', 'Flore apaisée', 'Drainage'],
        fruitNames: ['Fruit de la Passion', 'Ananas', 'Gingembre'],
        advice: 'Le gingembre réchauffe le système digestif et stimule les sucs gastriques naturels.',
      },
      {
        dayNumber: 4,
        cocktailName: 'Élixir Confort Total',
        cocktailImage:
          'https://images.unsplash.com/photo-1600271886742-f049cd451bba?q=80&w=800&auto=format&fit=crop',
        timing: 'morning_empty_stomach',
        timingLabel: 'Le matin à jeun',
        benefits: ['Légèreté abdominale', 'Décongestion'],
        fruitNames: ['Pomme', 'Concombre', 'Menthe', 'Citron'],
        advice: 'Remarquez comme votre ventre est plus souple au réveil. Continuez à boire suffisamment d’eau tempérée.',
      },
      {
        dayNumber: 5,
        cocktailName: 'Zen Digest Final',
        cocktailImage:
          'https://images.unsplash.com/photo-1546173159-315724a31696?q=80&w=800&auto=format&fit=crop',
        timing: 'morning_empty_stomach',
        timingLabel: 'Le matin à jeun',
        benefits: ['Équilibre durable', 'Confort pérenne'],
        fruitNames: ['Ananas', 'Passion', 'Menthe'],
        advice: 'Dernier jour du rituel ! Vous avez réinitialisé votre confort digestif pour les semaines à venir.',
      },
    ],
  },
];
