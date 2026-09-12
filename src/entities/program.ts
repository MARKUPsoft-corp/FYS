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
  day?: number; // Alias for dayNumber
  cocktailId?: string;
  cocktailName: string;
  juiceName?: string; // Alias
  title?: string; // Alias
  cocktailImage: string;
  imageUrl?: string; // Alias
  timing: ProgramTiming;
  timingLabel: string;
  focus?: string;
  tasteProfile?: string;
  benefits: string[];
  advice: string;
  nutrifysAdvice?: string; // Alias
  fruitNames: string[];
  fruits?: string[]; // Alias
  bottleSize?: BottleSize;
  instructions?: string;
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
  bundlePrice?: number; // Alias
  originalPrice?: number;
  badge?: string; // "Cure Express", "Bestseller", "Idéal Débutant"...
  difficulty?: 'Facile' | 'Intermédiaire' | 'Intense';
  imageUrl: string;
  colorAccent: string; // 'primary' | 'secondary' | 'accent'
  highlights: string[];
  benefits?: string[]; // Alias
  days: ProgramDayItem[];
  isActive: boolean;
  createdAt?: any;
  updatedAt?: any;
}

export interface UserProgramCheckin {
  dayNumber: number;
  day?: number;
  completedAt: string;
  note?: string;
  notes?: string;
}

export interface UserProgram {
  id: string;
  userId: string;
  userName?: string;
  userEmail?: string;
  userPhone?: string;
  programId: string;
  programTitle: string;
  programSlug?: string;
  programGoal: ProgramGoal;
  durationDays: number;
  startDate: string;
  endDate: string;
  currentDay: number;
  status: 'active' | 'completed' | 'paused' | 'cancelled' | 'saved';
  checkins: UserProgramCheckin[];
  dailyCheckins?: Record<number, UserProgramCheckin>;
  programSnapshot: Program;
  createdAt: string;
  lastCheckinDate?: string;
  cancelledAt?: string;
}

export interface ProgramsPageSettings {
  heroImageUrl: string;
  eyebrow: string;
  titleBefore: string;
  titleHighlight: string;
  titleAfter?: string;
  subtitle: string;
  sectionBefore: string;
  sectionHighlight: string;
  sectionSubtitle: string;
  flagshipProgramId?: string;
  updatedAt?: any;
}

export const DEFAULT_PROGRAMS_PAGE_SETTINGS: ProgramsPageSettings = {
  heroImageUrl:
    'https://images.pexels.com/photos/1337825/pexels-photo-1337825.jpeg?auto=compress&cs=tinysrgb&w=1600',
  eyebrow: 'FYS Program',
  titleBefore: 'Votre Cure Santé',
  titleHighlight: '100% Fraîche',
  titleAfter: '& Pressée à Froid',
  subtitle:
    'Des protocoles de 3 à 7 jours conçus avec rigueur pour purifier votre organisme, raviver votre énergie et instaurer une routine saine.',
  sectionBefore: 'Découvrez nos cures de jus frais',
  sectionHighlight: '100% pressés à froid',
  sectionSubtitle:
    'Choisissez une cure signature FYS ou laissez NutriFYS composer votre protocole sur-mesure.',
  flagshipProgramId: 'program-detox-3j',
};

// ── 3 Programmes de lancement avec images vérifiées & zéro emoji ───────────

export const DEFAULT_PROGRAMS: Program[] = [
  {
    id: 'program-detox-3j',
    slug: 'cure-detox-eclair',
    title: 'Cure Détox Éclair',
    subtitle: 'Purifiez votre organisme et dégonflez en 3 jours.',
    description:
      'Un protocole express conçu pour relancer votre système digestif, éliminer les toxines accumulées et retrouver une sensation immédiate de légèreté. Un jus pressé à froid ultra-frais chaque matin à jeun.',
    goal: 'detox',
    goalLabel: 'Détox & Élimination',
    durationDays: 3,
    bottlesTotal: 3,
    bottleSize: '500ml',
    price: 5500,
    bundlePrice: 5500,
    originalPrice: 6500,
    badge: 'Bestseller Express',
    difficulty: 'Facile',
    imageUrl:
      'https://images.pexels.com/photos/1337825/pexels-photo-1337825.jpeg?auto=compress&cs=tinysrgb&w=1200',
    colorAccent: 'primary',
    highlights: [
      '3 flacons 500ml 100% bruts sans eau ni sucres ajoutés',
      'Effet dégonflement et ventre léger garanti',
      'Drainage hépatique et rénal naturel en 72 heures',
      'Coaching quotidien NutriFYS pas à pas',
    ],
    benefits: [
      'Élimination accélérée des toxines métaboliques',
      'Sensation de légèreté digestive dès le deuxième matin',
      'Alcalinisation et hydratation cellulaire profonde',
      'Regain de vitalité et teint frais',
    ],
    isActive: true,
    days: [
      {
        dayNumber: 1,
        day: 1,
        title: 'Élixir Vert Détox',
        cocktailName: 'Élixir Vert Détox',
        juiceName: 'Élixir Vert Détox',
        cocktailImage:
          'https://images.pexels.com/photos/1337825/pexels-photo-1337825.jpeg?auto=compress&cs=tinysrgb&w=800',
        imageUrl:
          'https://images.pexels.com/photos/1337825/pexels-photo-1337825.jpeg?auto=compress&cs=tinysrgb&w=800',
        timing: 'morning_empty_stomach',
        timingLabel: 'À jeun au réveil (entre 7h00 et 8h30)',
        focus: 'Hydratation cellulaire et drainage',
        tasteProfile: 'Notes vives de menthe poivrée, vivacité du citron vert et douceur de pomme croquante',
        bottleSize: '500ml',
        benefits: ['Drainage des émonctoires', 'Alcalinisant puissant', 'Légèreté digestive'],
        fruitNames: ['Concombre', 'Pomme Verte', 'Menthe', 'Gingembre'],
        fruits: ['Concombre', 'Pomme Verte', 'Menthe', 'Gingembre'],
        advice:
          'Buvez lentement par petites gorgées 20 minutes avant votre premier repas. Hydratez-vous avec au moins 1,5L d’eau plate aujourd’hui pour accompagner le drainage naturel.',
        nutrifysAdvice:
          'Buvez lentement par petites gorgées 20 minutes avant votre premier repas. Hydratez-vous avec au moins 1,5L d’eau plate aujourd’hui pour accompagner le drainage naturel.',
        instructions: 'Conserver bien frais. Agiter délicatement avant de déguster.',
      },
      {
        dayNumber: 2,
        day: 2,
        title: 'Sunrise Purifiant',
        cocktailName: 'Sunrise Purifiant',
        juiceName: 'Sunrise Purifiant',
        cocktailImage:
          'https://images.pexels.com/photos/158053/fresh-orange-juice-squeezed-refreshing-citrus-158053.jpeg?auto=compress&cs=tinysrgb&w=800',
        imageUrl:
          'https://images.pexels.com/photos/158053/fresh-orange-juice-squeezed-refreshing-citrus-158053.jpeg?auto=compress&cs=tinysrgb&w=800',
        timing: 'morning_empty_stomach',
        timingLabel: 'À jeun au réveil (entre 7h00 et 8h30)',
        focus: 'Relance hépatique et élimination',
        tasteProfile: 'Douceur d’ananas mûr, chaleur du curcuma et acidité d’agrumes fraîchement cueillis',
        bottleSize: '500ml',
        benefits: ['Enzymes bromélaïne actives', 'Soutien hépatique', 'Antioxydants vivants'],
        fruitNames: ['Ananas', 'Carotte', 'Citron', 'Curcuma'],
        fruits: ['Ananas', 'Carotte', 'Citron', 'Curcuma'],
        advice:
          'La bromélaïne de l’ananas et la curcumine soutiennent votre foie dans sa phase d’élimination. Évitez les aliments ultra-transformés et les fritures pour maximiser l’effet.',
        nutrifysAdvice:
          'La bromélaïne de l’ananas et la curcumine soutiennent votre foie dans sa phase d’élimination. Évitez les aliments ultra-transformés et les fritures pour maximiser l’effet.',
        instructions: 'Idéal à température fraîche.',
      },
      {
        dayNumber: 3,
        day: 3,
        title: 'Grand Reset Vital',
        cocktailName: 'Grand Reset Vital',
        juiceName: 'Grand Reset Vital',
        cocktailImage:
          'https://images.pexels.com/photos/1435735/pexels-photo-1435735.jpeg?auto=compress&cs=tinysrgb&w=800',
        imageUrl:
          'https://images.pexels.com/photos/1435735/pexels-photo-1435735.jpeg?auto=compress&cs=tinysrgb&w=800',
        timing: 'morning_empty_stomach',
        timingLabel: 'À jeun au réveil (entre 7h00 et 8h30)',
        focus: 'Consolidation et vitalité durable',
        tasteProfile: 'Richesse douce de la betterave adoucie par la pomme croquante et le gingembre frais',
        bottleSize: '500ml',
        benefits: ['Oxygénation des tissus', 'Teint lumineux', 'Vitalité durable'],
        fruitNames: ['Pomme', 'Betterave', 'Gingembre', 'Citron'],
        fruits: ['Pomme', 'Betterave', 'Gingembre', 'Citron'],
        advice:
          'Dernier jour de votre cure. Vous devriez déjà ressentir un ventre plus plat, une digestion apaisée et un esprit clair. Privilégiez un dîner léger pour clore la cure en douceur.',
        nutrifysAdvice:
          'Dernier jour de votre cure. Vous devriez déjà ressentir un ventre plus plat, une digestion apaisée et un esprit clair. Privilégiez un dîner léger pour clore la cure en douceur.',
        instructions: 'Dégustez lentement pour savourer tous les nutriments.',
      },
    ],
  },
  {
    id: 'program-immunite-7j',
    slug: 'bouclier-immunite',
    title: 'Bouclier Immunité & Vitalité',
    subtitle: '7 jours pour fortifier vos défenses et recharger vos batteries.',
    description:
      'Une semaine complète d’apports massifs en vitamines C bioactives, bêtacarotène et polyphénols protecteurs. Idéal lors des coups de fatigue ou périodes de surmenage.',
    goal: 'immunity',
    goalLabel: 'Défenses & Énergie',
    durationDays: 7,
    bottlesTotal: 7,
    bottleSize: '500ml',
    price: 12000,
    bundlePrice: 12000,
    originalPrice: 14500,
    badge: 'Vitalité Maximale',
    difficulty: 'Intermédiaire',
    imageUrl:
      'https://images.pexels.com/photos/109275/pexels-photo-109275.jpeg?auto=compress&cs=tinysrgb&w=1200',
    colorAccent: 'secondary',
    highlights: [
      '7 flacons 500ml riches en vitamine C active',
      'Synergie curcuma doré, gingembre et agrumes du terroir',
      'Barrière protectrice naturelle contre les baisses d’énergie',
      'Accompagnement quotidien étape par étape avec NutriFYS',
    ],
    benefits: [
      'Renforcement naturel de la résistance physique',
      'Énergie naturelle stable sans coup de pompe',
      'Protection antioxydante contre le stress cellulaire',
      'Amélioration du dynamisme et de la concentration',
    ],
    isActive: true,
    days: [
      {
        dayNumber: 1,
        day: 1,
        title: 'Citrus Tonic Boost',
        cocktailName: 'Citrus Tonic Boost',
        juiceName: 'Citrus Tonic Boost',
        cocktailImage:
          'https://images.pexels.com/photos/158053/fresh-orange-juice-squeezed-refreshing-citrus-158053.jpeg?auto=compress&cs=tinysrgb&w=800',
        imageUrl:
          'https://images.pexels.com/photos/158053/fresh-orange-juice-squeezed-refreshing-citrus-158053.jpeg?auto=compress&cs=tinysrgb&w=800',
        timing: 'morning',
        timingLabel: 'Au petit-déjeuner',
        focus: 'Coup de fouet et éveil tonique',
        tasteProfile: 'Zestes d’orange gorgés de jus, pamplemousse rubis et pointe de gingembre revigorante',
        bottleSize: '500ml',
        benefits: ['Vitamine C pure', 'Hydratation tonifiante', 'Éveil métabolique'],
        fruitNames: ['Orange', 'Pamplemousse', 'Citron Vert', 'Gingembre'],
        fruits: ['Orange', 'Pamplemousse', 'Citron Vert', 'Gingembre'],
        advice: 'Lancez votre semaine avec une explosion d’agrumes frais pour réveiller instantanément votre métabolisme.',
        nutrifysAdvice: 'Lancez votre semaine avec une explosion d’agrumes frais pour réveiller instantanément votre métabolisme.',
      },
      {
        dayNumber: 2,
        day: 2,
        title: 'Orange Curcuma Énergie',
        cocktailName: 'Orange Curcuma Énergie',
        juiceName: 'Orange Curcuma Énergie',
        cocktailImage:
          'https://images.pexels.com/photos/109275/pexels-photo-109275.jpeg?auto=compress&cs=tinysrgb&w=800',
        imageUrl:
          'https://images.pexels.com/photos/109275/pexels-photo-109275.jpeg?auto=compress&cs=tinysrgb&w=800',
        timing: 'morning',
        timingLabel: 'Au petit-déjeuner',
        focus: 'Protection cellulaire et vitalité',
        tasteProfile: 'Douceur veloutée de la carotte mariée aux agrumes et à la chaleur du curcuma',
        bottleSize: '500ml',
        benefits: ['Curcumine bioactive', 'Bêtacarotène', 'Protection des cellules'],
        fruitNames: ['Carotte', 'Orange', 'Curcuma', 'Pomme'],
        fruits: ['Carotte', 'Orange', 'Curcuma', 'Pomme'],
        advice: 'Le curcuma et le bêtacarotène agissent en synergie pour stimuler la production de défenses naturelles.',
        nutrifysAdvice: 'Le curcuma et le bêtacarotène agissent en synergie pour stimuler la production de défenses naturelles.',
      },
      {
        dayNumber: 3,
        day: 3,
        title: 'Tropical Défense',
        cocktailName: 'Tropical Défense',
        juiceName: 'Tropical Défense',
        cocktailImage:
          'https://images.pexels.com/photos/1099680/pexels-photo-1099680.jpeg?auto=compress&cs=tinysrgb&w=800',
        imageUrl:
          'https://images.pexels.com/photos/1099680/pexels-photo-1099680.jpeg?auto=compress&cs=tinysrgb&w=800',
        timing: 'morning',
        timingLabel: 'Au petit-déjeuner',
        focus: 'Enzymes tropicales et régénération',
        tasteProfile: 'Parfum suave du fruit de la passion mûr combiné à l’ananas doré bien juteux',
        bottleSize: '500ml',
        benefits: ['Enzymes vivantes', 'Régénération des tissus', 'Antioxydants'],
        fruitNames: ['Ananas', 'Fruit de la Passion', 'Gingembre'],
        fruits: ['Ananas', 'Fruit de la Passion', 'Gingembre'],
        advice: 'Savourez ce mélange doux et tonique. Prenez le temps de respirer profondément avant de démarrer votre journée.',
        nutrifysAdvice: 'Savourez ce mélange doux et tonique. Prenez le temps de respirer profondément avant de démarrer votre journée.',
      },
      {
        dayNumber: 4,
        day: 4,
        title: 'Ruby Vitalité',
        cocktailName: 'Ruby Vitalité',
        juiceName: 'Ruby Vitalité',
        cocktailImage:
          'https://images.pexels.com/photos/1435735/pexels-photo-1435735.jpeg?auto=compress&cs=tinysrgb&w=800',
        imageUrl:
          'https://images.pexels.com/photos/1435735/pexels-photo-1435735.jpeg?auto=compress&cs=tinysrgb&w=800',
        timing: 'morning',
        timingLabel: 'Au petit-déjeuner',
        focus: 'Oxygénation et endurance',
        tasteProfile: 'Couleur grenat intense, douceur veloutée et coup de fouet citronné',
        bottleSize: '500ml',
        benefits: ['Oxygénation', 'Endurance naturelle', 'Circulation'],
        fruitNames: ['Betterave', 'Pomme', 'Carotte', 'Citron'],
        fruits: ['Betterave', 'Pomme', 'Carotte', 'Citron'],
        advice: 'La betterave améliore l’oxygénation des tissus. Idéal pour franchir le milieu de semaine avec dynamisme.',
        nutrifysAdvice: 'La betterave améliore l’oxygénation des tissus. Idéal pour franchir le milieu de semaine avec dynamisme.',
      },
      {
        dayNumber: 5,
        day: 5,
        title: 'Élixir Vert Protecteur',
        cocktailName: 'Élixir Vert Protecteur',
        juiceName: 'Élixir Vert Protecteur',
        cocktailImage:
          'https://images.pexels.com/photos/96974/pexels-photo-96974.jpeg?auto=compress&cs=tinysrgb&w=800',
        imageUrl:
          'https://images.pexels.com/photos/96974/pexels-photo-96974.jpeg?auto=compress&cs=tinysrgb&w=800',
        timing: 'morning',
        timingLabel: 'Au petit-déjeuner',
        focus: 'Chlorophylle et reminéralisation',
        tasteProfile: 'Pureté végétale croquante, menthe revigorante et fraîcheur désaltérante',
        bottleSize: '500ml',
        benefits: ['Chlorophylle active', 'Minéraux alcalinisants', 'Défenses renforcées'],
        fruitNames: ['Concombre', 'Pomme', 'Menthe', 'Gingembre'],
        fruits: ['Concombre', 'Pomme', 'Menthe', 'Gingembre'],
        advice: 'Les minéraux alcalinisants soulagent la fatigue accumulée. Pensez à dormir au moins 7h30 ce soir.',
        nutrifysAdvice: 'Les minéraux alcalinisants soulagent la fatigue accumulée. Pensez à dormir au moins 7h30 ce soir.',
      },
      {
        dayNumber: 6,
        day: 6,
        title: 'Golden Sunrise',
        cocktailName: 'Golden Sunrise',
        juiceName: 'Golden Sunrise',
        cocktailImage:
          'https://images.pexels.com/photos/452737/pexels-photo-452737.jpeg?auto=compress&cs=tinysrgb&w=800',
        imageUrl:
          'https://images.pexels.com/photos/452737/pexels-photo-452737.jpeg?auto=compress&cs=tinysrgb&w=800',
        timing: 'morning',
        timingLabel: 'Au petit-déjeuner',
        focus: 'Teint lumineux et tonus',
        tasteProfile: 'Harmonie d’agrumes tropicaux et douceur de carotte mûrie au soleil',
        bottleSize: '500ml',
        benefits: ['Teint lumineux', 'Tonus général', 'Défenses optimales'],
        fruitNames: ['Ananas', 'Orange', 'Carotte', 'Curcuma'],
        fruits: ['Ananas', 'Orange', 'Carotte', 'Curcuma'],
        advice: 'Plus qu’un jour. Vous avez apporté un stock précieux de micronutriments protecteurs à votre organisme.',
        nutrifysAdvice: 'Plus qu’un jour. Vous avez apporté un stock précieux de micronutriments protecteurs à votre organisme.',
      },
      {
        dayNumber: 7,
        day: 7,
        title: 'Bouclier Suprême',
        cocktailName: 'Bouclier Suprême',
        juiceName: 'Bouclier Suprême',
        cocktailImage:
          'https://images.pexels.com/photos/158053/fresh-orange-juice-squeezed-refreshing-citrus-158053.jpeg?auto=compress&cs=tinysrgb&w=800',
        imageUrl:
          'https://images.pexels.com/photos/158053/fresh-orange-juice-squeezed-refreshing-citrus-158053.jpeg?auto=compress&cs=tinysrgb&w=800',
        timing: 'morning',
        timingLabel: 'Au petit-déjeuner',
        focus: 'Apothéose de la cure et consolidation',
        tasteProfile: 'Harmonie tropicale intense, nectar de passion puissant et citron vert pétillant',
        bottleSize: '500ml',
        benefits: ['Consolidation finale', 'Énergie durable', 'Protection long terme'],
        fruitNames: ['Passion', 'Ananas', 'Gingembre', 'Citron'],
        fruits: ['Passion', 'Ananas', 'Gingembre', 'Citron'],
        advice: 'Félicitations pour ces 7 jours de régularité. Vos défenses naturelles sont rechargées au maximum.',
        nutrifysAdvice: 'Félicitations pour ces 7 jours de régularité. Vos défenses naturelles sont rechargées au maximum.',
      },
    ],
  },
  {
    id: 'program-ventre-plat-5j',
    slug: 'ventre-plat-confort',
    title: 'Ventre Plat & Confort Digestif',
    subtitle: '5 jours pour apaiser vos intestins et soulager les ballonnements.',
    description:
      'Conçu avec des fruits riches en enzymes digestives naturelles (bromélaïne de l’ananas), menthe fraîche apaisante et concombre hydratant. Soulage rapidement les inconforts après repas.',
    goal: 'digestion',
    goalLabel: 'Digestion & Confort',
    durationDays: 5,
    bottlesTotal: 5,
    bottleSize: '500ml',
    price: 9000,
    bundlePrice: 9000,
    originalPrice: 10500,
    badge: 'Confort Intestinal',
    difficulty: 'Facile',
    imageUrl:
      'https://images.pexels.com/photos/1267320/pexels-photo-1267320.jpeg?auto=compress&cs=tinysrgb&w=1200',
    colorAccent: 'primary',
    highlights: [
      '5 flacons 500ml ciblés sur le confort et la détente intestinale',
      'Bromélaïne d’ananas frais et menthe apaisante',
      'Soulagement durable des lourdeurs et ballonnements',
      'Protocole agréable sur 5 jours ouvrés',
    ],
    benefits: [
      'Diminution sensible des sensations de gonflement',
      'Apaisement de la muqueuse digestive',
      'Transit naturel doux et régulier',
      'Sensation de confort léger après chaque repas',
    ],
    isActive: true,
    days: [
      {
        dayNumber: 1,
        day: 1,
        title: 'Ananas Menthe Pure',
        cocktailName: 'Ananas Menthe Pure',
        juiceName: 'Ananas Menthe Pure',
        cocktailImage:
          'https://images.pexels.com/photos/1267320/pexels-photo-1267320.jpeg?auto=compress&cs=tinysrgb&w=800',
        imageUrl:
          'https://images.pexels.com/photos/1267320/pexels-photo-1267320.jpeg?auto=compress&cs=tinysrgb&w=800',
        timing: 'morning_empty_stomach',
        timingLabel: 'Le matin à jeun',
        focus: 'Détente intestinale et amorce enzymatique',
        tasteProfile: 'Douceur acidulée d’ananas mûr et fraîcheur vivifiante de menthe verte',
        bottleSize: '500ml',
        benefits: ['Bromélaïne active', 'Fraîcheur intestinale', 'Effet décongestionnant'],
        fruitNames: ['Ananas', 'Menthe', 'Citron Vert'],
        fruits: ['Ananas', 'Menthe', 'Citron Vert'],
        advice: 'Prenez ce premier jus lentement. La menthe détend la paroi intestinale tandis que l’ananas amorce la digestion.',
        nutrifysAdvice: 'Prenez ce premier jus lentement. La menthe détend la paroi intestinale tandis que l’ananas amorce la digestion.',
      },
      {
        dayNumber: 2,
        day: 2,
        title: 'Douceur Verte Concombre',
        cocktailName: 'Douceur Verte Concombre',
        juiceName: 'Douceur Verte Concombre',
        cocktailImage:
          'https://images.pexels.com/photos/1337825/pexels-photo-1337825.jpeg?auto=compress&cs=tinysrgb&w=800',
        imageUrl:
          'https://images.pexels.com/photos/1337825/pexels-photo-1337825.jpeg?auto=compress&cs=tinysrgb&w=800',
        timing: 'morning_empty_stomach',
        timingLabel: 'Le matin à jeun',
        focus: 'Hydratation profonde et fibres solubles',
        tasteProfile: 'Légèreté absolue, notes croquantes de pomme et concombre rafraîchissant',
        bottleSize: '500ml',
        benefits: ['Hydratation profonde', 'Fibres solubles bio', 'Zéro sensation de lourdeur'],
        fruitNames: ['Concombre', 'Pomme', 'Gingembre'],
        fruits: ['Concombre', 'Pomme', 'Gingembre'],
        advice: 'Mangez assis et prenez le temps de bien mâcher vos repas aujourd’hui pour accompagner le travail du jus.',
        nutrifysAdvice: 'Mangez assis et prenez le temps de bien mâcher vos repas aujourd’hui pour accompagner le travail du jus.',
      },
      {
        dayNumber: 3,
        day: 3,
        title: 'Passion Gingembre Apaisant',
        cocktailName: 'Passion Gingembre Apaisant',
        juiceName: 'Passion Gingembre Apaisant',
        cocktailImage:
          'https://images.pexels.com/photos/1099680/pexels-photo-1099680.jpeg?auto=compress&cs=tinysrgb&w=800',
        imageUrl:
          'https://images.pexels.com/photos/1099680/pexels-photo-1099680.jpeg?auto=compress&cs=tinysrgb&w=800',
        timing: 'morning_empty_stomach',
        timingLabel: 'Le matin à jeun',
        focus: 'Feu digestif et confort',
        tasteProfile: 'Nectar exotique de fruit de la passion relevé par un piquant doux de gingembre',
        bottleSize: '500ml',
        benefits: ['Tonus gastrique', 'Flore apaisée', 'Élimination des gaz'],
        fruitNames: ['Fruit de la Passion', 'Ananas', 'Gingembre'],
        fruits: ['Fruit de la Passion', 'Ananas', 'Gingembre'],
        advice: 'Le gingembre réchauffe le système digestif et soutient les sucs gastriques naturels sans irriter.',
        nutrifysAdvice: 'Le gingembre réchauffe le système digestif et soutient les sucs gastriques naturels sans irriter.',
      },
      {
        dayNumber: 4,
        day: 4,
        title: 'Élixir Confort Total',
        cocktailName: 'Élixir Confort Total',
        juiceName: 'Élixir Confort Total',
        cocktailImage:
          'https://images.pexels.com/photos/96974/pexels-photo-96974.jpeg?auto=compress&cs=tinysrgb&w=800',
        imageUrl:
          'https://images.pexels.com/photos/96974/pexels-photo-96974.jpeg?auto=compress&cs=tinysrgb&w=800',
        timing: 'morning_empty_stomach',
        timingLabel: 'Le matin à jeun',
        focus: 'Décongestion et bien-être abdominal',
        tasteProfile: 'Fraîcheur limpide, subtil parfum de menthe froissée et pomme acidulée',
        bottleSize: '500ml',
        benefits: ['Légèreté abdominale', 'Décongestion', 'Bien-être post-repas'],
        fruitNames: ['Pomme', 'Concombre', 'Menthe', 'Citron'],
        fruits: ['Pomme', 'Concombre', 'Menthe', 'Citron'],
        advice: 'Remarquez comme votre ventre est plus souple au réveil. Continuez à boire suffisamment d’eau tempérée.',
        nutrifysAdvice: 'Remarquez comme votre ventre est plus souple au réveil. Continuez à boire suffisamment d’eau tempérée.',
      },
      {
        dayNumber: 5,
        day: 5,
        title: 'Zen Digest Final',
        cocktailName: 'Zen Digest Final',
        juiceName: 'Zen Digest Final',
        cocktailImage:
          'https://images.pexels.com/photos/338713/pexels-photo-338713.jpeg?auto=compress&cs=tinysrgb&w=800',
        imageUrl:
          'https://images.pexels.com/photos/338713/pexels-photo-338713.jpeg?auto=compress&cs=tinysrgb&w=800',
        timing: 'morning_empty_stomach',
        timingLabel: 'Le matin à jeun',
        focus: 'Consolidation et équilibre pérenne',
        tasteProfile: 'Harmonie veloutée ananas-passion rafraîchie d’une pointe de menthe bio',
        bottleSize: '500ml',
        benefits: ['Équilibre pérenne', 'Ventre plat durable', 'Microbiote revitalisé'],
        fruitNames: ['Ananas', 'Passion', 'Menthe'],
        fruits: ['Ananas', 'Passion', 'Menthe'],
        advice: 'Dernier jour du rituel. Vous avez réinitialisé votre confort digestif pour les semaines à venir.',
        nutrifysAdvice: 'Dernier jour du rituel. Vous avez réinitialisé votre confort digestif pour les semaines à venir.',
      },
    ],
  },
];
