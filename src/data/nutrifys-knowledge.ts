/**
 * NutriFYS Knowledge Base v2.0
 * Source: FYS Fiche individuelle V2 — Règles Générales Nutritionniste FYS
 * Last updated: 2026-07-04
 * Validated by nutritionist: false (pending)
 */

// ── Timing rules ──────────────────────────────────────────────────────────────

export const TIMING_RULES = {
  vitaminAInsomnia:
    "Les fruits riches en vitamine A (carotte, betterave, orange, foléré, mangue, papaye) peuvent perturber le sommeil s'ils sont consommés après 20h. En compote ou salade de fruits le soir : acceptable.",
  diabetesEvening:
    "Un diabétique peut consommer des fruits sucrés le matin (métabolisme actif). Le soir, le métabolisme est au repos : risque d'hyperglycémie. Exception : concombre et pastèque mi-mûre (sucrosité très faible) peuvent être consommés en grande quantité même par un diabétique.",
} as const;

// ── Cocktail balance ───────────────────────────────────────────────────────────

export const COCKTAIL_BALANCE = {
  dimensions: [
    "Sucrosité (fructose) → énergie",
    "Antioxydants (vit. A, C, polyphénols) → protection cellulaire et immunité",
    "Minéraux → fonctions organiques",
    "Acidité → équilibre et biodisponibilité des vitamines",
  ],
  example: "Ananas + Mangue · ou · Pomme + Mangue + Citron (si trop sucrés)",
} as const;

// ── Best base composition ─────────────────────────────────────────────────────

export const BEST_BASE = {
  formula: "Noix de coco + Gingembre + fruit vitaminé",
  rationale:
    "Noix de coco : minéraux + oméga 3 & 9 + lipides insaturés + protéines. Gingembre : gestion de l'inflammation et de la fatigue. Fruit vitaminé : complète les vitamines. Meilleure composition de base selon les nutritionnistes FYS.",
} as const;

// ── Fruit interactions ────────────────────────────────────────────────────────

export const FRUIT_INTERACTIONS = [
  {
    rule: "Acide + Sucré : meilleure association générale",
    examples: ["Ananas + Pastèque", "Ananas + Mangue"],
  },
  {
    rule: "Acidité + fruits sans protéines : améliore la biodisponibilité des vitamines (digestion externe → interne).",
  },
  {
    rule: "Acidité + protéines : découpe les liaisons peptidiques. Aucun impact nutritionnel négatif, seulement sur la texture.",
  },
  {
    rule: "Vitamine A + Vitamine C : synergie puissante pour le renforcement immunitaire.",
  },
  {
    rule: "Fructose en grande quantité (long terme) : peut induire des maladies rhumatologiques (goutte, arthrose, arthrite).",
  },
] as const;

// ── Rules per health goal ─────────────────────────────────────────────────────

export const GOAL_RULES: Record<string, string> = {
  immunite:         "Vitamine A + Vitamine C (la vitamine A est dominante pour l'immunité).",
  energie:          "Fruits sucrés riches en fructose.",
  peau:             "Fruits à caroténoïdes : carotte, betterave, orange, foléré (1 caroténoïde → 2 molécules de vitamine A).",
  "sante cardiaque":"Oméga 3 (noix de coco) → aident également à brûler les graisses.",
  antioxydants:     "Vitamine A, C, E, zinc, sélénium, polyphénols (foléré).",
  digestion:        "Fibres solubles et insolubles (ananas) — avec modération.",
  sommeil:          "Éviter les fruits riches en vitamine A après 20h.",
  stress:           "Magnésium (banane, noix de coco) + antioxydants.",
};

// ── Critical alerts ───────────────────────────────────────────────────────────

export const CRITICAL_ALERTS = [
  {
    id: "pamplemousse",
    level: "critique" as const,
    title: "Pamplemousse — exclusion absolue",
    detail:
      "Le pamplemousse inhibe les enzymes CYP3A4 et CYP1A2 pendant 3 jours, entraînant l'accumulation de nombreux médicaments courants → risque de surdosage grave. NutriFYS l'exclut définitivement du FYS Lab.",
    triggerFruits: ["pamplemousse"],
  },
  {
    id: "ananas_colon",
    level: "modere" as const,
    title: "Ananas — côlon",
    detail:
      "La consommation quotidienne intensive d'ananas (riche en fibres) peut irriter le côlon à long terme. Déconseiller la consommation quotidienne intensive.",
    triggerFruits: ["ananas"],
  },
  {
    id: "mineral_excess",
    level: "modere" as const,
    title: "Excès de minéraux",
    detail:
      "Théoriquement, une surconsommation de fruits très minéraux peut calcifier les tissus mous. Les phytates ralentissent l'absorption ; le risque par seule consommation de fruits reste faible.",
    triggerFruits: [],
  },
] as const;

// ── Risk profiles ─────────────────────────────────────────────────────────────

export const RISK_PROFILES = [
  {
    conditions: ["diabète", "diabete", "diabetes"],
    rule: "Autoriser les fruits sucrés le matin. Éviter les cocktails sucrés le soir (risque d'hyperglycémie). Exception : pastèque mi-mûre et concombre (sucrosité très faible).",
  },
  {
    conditions: ["insuffisance rénale", "rein"],
    rule: "Alerter fortement ou bloquer : banane mûre, carotte, betterave, baobab (potassium élevé). L'excès de potassium est dangereux en insuffisance rénale.",
  },
  {
    conditions: ["grossesse"],
    rule: "Papaye verte, foléré en excès et corossol (extraits) : déconseillés pendant la grossesse. Fruits sûrs autorisés. Message médecin recommandé.",
  },
  {
    conditions: ["rgo", "gastrite", "reflux"],
    rule: "Réduire ou éviter : citron en excès, menthe, gingembre en excès (stimulent l'acidité gastrique).",
  },
  {
    conditions: ["rhumatologie", "goutte", "arthrose", "arthrite"],
    rule: "Limiter les fruits très riches en fructose (mangue, banane, ananas) — le fructose en excès chronique favorise les maladies rhumatologiques.",
  },
  {
    conditions: ["anticoagulant", "warfarine", "coumadine"],
    rule: "Gingembre en grande quantité, foléré et betterave (vitamine K élevée) peuvent interférer avec les anticoagulants. Message médecin obligatoire.",
  },
  {
    conditions: ["insomnie", "sommeil"],
    rule: "Éviter les fruits riches en vitamine A (mangue, papaye, orange, foléré, carotte) après 20h — ils peuvent perturber le sommeil.",
  },
  {
    conditions: ["hypotension", "antihypertenseur"],
    rule: "Foléré en grande quantité peut amplifier l'effet hypotenseur. Message médecin obligatoire.",
  },
  {
    conditions: ["antiacide"],
    rule: "Les antiacides élèvent le pH gastrique et empêchent l'absorption du fer. Signaler si fruits riches en fer.",
  },
  {
    conditions: ["diurétique", "furosémide"],
    rule: "Les diurétiques entraînent des pertes de potassium, zinc et thiamine. Recommander des fruits compensateurs.",
  },
  {
    conditions: ["metformine"],
    rule: "La metformine peut induire une malabsorption de la vitamine B12. Signaler.",
  },
  {
    conditions: ["contraceptif", "pilule"],
    rule: "Les contraceptifs oraux diminuent les réserves de vitamine A. Valoriser les fruits à caroténoïdes.",
  },
] as const;

// ── Mandatory medication rule ─────────────────────────────────────────────────

export const MEDICATION_RULE =
  "Si l'utilisateur déclare un traitement médical ou une médication quelconque : afficher OBLIGATOIREMENT « Consultez votre médecin avant toute consommation régulière de ce cocktail. » Ne jamais formuler de recommandation autonome sur les interactions médicament-fruit. L'achat reste possible mais le message d'avertissement doit être visible et non ignorable.";

// ── Vitamin-A-rich fruits (for timing rules) ───────────────────────────────────

export const VITAMIN_A_RICH_FRUITS = [
  "carotte", "betterave", "orange", "foléré", "folere", "mangue", "papaye",
] as const;
