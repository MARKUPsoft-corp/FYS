import { Timestamp } from 'firebase/firestore';
import { AIVerdict } from '@/entities';
import type { Fruit, HealthProfile, AIAnalysis, NutrientInfo, BeneficeCible } from '@/entities';
import {
  TIMING_RULES,
  COCKTAIL_BALANCE,
  BEST_BASE,
  FRUIT_INTERACTIONS,
  GOAL_RULES,
  CRITICAL_ALERTS,
  RISK_PROFILES,
  MEDICATION_RULE,
  VITAMIN_A_RICH_FRUITS,
} from '@/data/nutrifys-knowledge';

// ── Context selector ──────────────────────────────────────────────────────────
// Builds only the rule sections relevant to this cocktail and this profile.
// Never dumps the full knowledge base — keeps the prompt lean.

function buildKnowledgeContext(
  ingredients: { fruit: Fruit; grams: number }[],
  profile: HealthProfile | null,
): string {
  const sections: string[] = [];

  const fruitNames = ingredients.map((i) => i.fruit.name.toLowerCase());
  const conditions = (profile?.healthConditions ?? [])
    .filter((c) => !c.toLowerCase().includes('aucune'))
    .map((c) => c.toLowerCase());
  const goals = (profile?.goals ?? []).map((g) => g.toLowerCase());

  // ── Always: cocktail balance fundamentals ────────────────────────────────
  sections.push(
    `PRINCIPES D'UN BON COCKTAIL:
${COCKTAIL_BALANCE.dimensions.map((d) => `  • ${d}`).join('\n')}
  Exemple équilibré : ${COCKTAIL_BALANCE.example}
  Base idéale : ${BEST_BASE.formula} — ${BEST_BASE.rationale}`,
  );

  // ── Always: core fruit interaction rules ─────────────────────────────────
  sections.push(
    `INTERACTIONS FRUITS:\n` +
    FRUIT_INTERACTIONS.map((r) => `  • ${'rule' in r ? r.rule : ''}`).join('\n'),
  );

  // ── Pamplemousse: absolute critical alert (always check) ─────────────────
  const pamplemoussAlert = CRITICAL_ALERTS.find((a) => a.id === 'pamplemousse')!;
  const hasPamplemousse = fruitNames.some(
    (n) => n.includes('pamplemousse') || n.includes('grapefruit'),
  );
  if (hasPamplemousse) {
    sections.push(
      `⛔ ALERTE CRITIQUE — ${pamplemoussAlert.title}:\n  ${pamplemoussAlert.detail}`,
    );
  } else {
    sections.push(
      `ALERTE ENZYME CYP: Si le mélange contient du pamplemousse, signaler impérativement : ${pamplemoussAlert.detail}`,
    );
  }

  // ── Ananas: côlon warning ────────────────────────────────────────────────
  if (fruitNames.some((n) => n.includes('ananas'))) {
    const alert = CRITICAL_ALERTS.find((a) => a.id === 'ananas_colon')!;
    sections.push(`⚠️ ${alert.title}: ${alert.detail}`);
  }

  // ── Vitamin-A fruits: timing rule ────────────────────────────────────────
  const hasVitAFruit = (VITAMIN_A_RICH_FRUITS as readonly string[]).some((vf) =>
    fruitNames.some((fn) => fn.includes(vf)),
  );
  if (hasVitAFruit) {
    sections.push(`TIMING VITAMINE A: ${TIMING_RULES.vitaminAInsomnia}`);
  }

  // ── Per-condition risk profiles ──────────────────────────────────────────
  if (conditions.length > 0) {
    const matched: string[] = [];
    for (const profile of RISK_PROFILES) {
      const hit = (profile.conditions as readonly string[]).some((kw) =>
        conditions.some((c) => c.includes(kw)),
      );
      if (hit) matched.push(`  • ${profile.rule}`);
    }
    if (matched.length > 0) {
      sections.push(`RÈGLES SPÉCIFIQUES AU PROFIL:\n${matched.join('\n')}`);
    }

    // Diabetes timing (separate because it's timing-specific)
    const isDiabetic = conditions.some(
      (c) => c.includes('diabèt') || c.includes('diabete') || c.includes('diabetes'),
    );
    if (isDiabetic) {
      sections.push(`TIMING DIABÈTE: ${TIMING_RULES.diabetesEvening}`);
    }
  }

  // ── Per-goal guidance ────────────────────────────────────────────────────
  if (goals.length > 0) {
    const goalMatches: string[] = [];
    for (const [key, rule] of Object.entries(GOAL_RULES)) {
      if (goals.some((g) => g.includes(key) || key.includes(g.split(' ')[0]))) {
        goalMatches.push(`  • [${key}] ${rule}`);
      }
    }
    if (goalMatches.length > 0) {
      sections.push(`RÈGLES PAR OBJECTIF:\n${goalMatches.join('\n')}`);
    }
  }

  // ── Medication rule: append whenever conditions are declared ─────────────
  const medicationKeywords = [
    'médicament', 'traitement', 'anticoagulant', 'metformine',
    'antiacide', 'diurétique', 'contraceptif', 'pilule',
    'antihypertenseur', 'hypotension', 'warfarine', 'coumadine',
  ];
  const hasMedicationContext =
    conditions.some((c) => medicationKeywords.some((kw) => c.includes(kw))) ||
    conditions.length > 0; // show if any condition is declared — stays cautious
  if (hasMedicationContext) {
    sections.push(`RÈGLE MÉDICAMENTS: ${MEDICATION_RULE}`);
  }

  return sections.join('\n\n');
}

// ── Prompt builder (shared between providers) ─────────────────────────────────

export function buildAnalysisPrompt(
  ingredients: { fruit: Fruit; grams: number }[],
  profile: HealthProfile | null,
): string {
  const fruitLines = ingredients
    .map(({ fruit, grams }) => {
      const benefits = fruit.benefits.length ? fruit.benefits.join(', ') : 'non spécifié';
      const warnings = fruit.warnings.length ? fruit.warnings.join(', ') : 'aucun';
      const gi = fruit.glycemicIndex?.badge ?? 'non spécifié';
      return `• ${fruit.name} (${grams}g) — bénéfices: ${benefits} | précautions: ${warnings} | IG: ${gi}`;
    })
    .join('\n');

  const hasNoneCondition = profile?.healthConditions.some((c) =>
    c.toLowerCase().includes('aucune'),
  );
  const hasNoneAllergy = profile?.allergies.some((a) => a.toLowerCase().includes('aucune'));

  const profileSection = profile
    ? `Profil de santé :
- Conditions : ${hasNoneCondition ? 'aucune condition particulière' : profile.healthConditions.join(', ') || 'non renseigné'}
- Allergies : ${hasNoneAllergy ? 'aucune allergie connue' : profile.allergies.join(', ') || 'non renseigné'}
- Objectifs : ${(profile.goals ?? []).join(', ') || 'non spécifié'}`
    : 'Aucun profil de santé renseigné. Analyse basée uniquement sur les propriétés des fruits.';

  const knowledgeContext = buildKnowledgeContext(ingredients, profile);

  return `Tu es NutriFYS, l'Assistant nutritionnelle de FYS (cocktails de fruits santé). Analyse ce mélange.

INGRÉDIENTS:
${fruitLines}

${profileSection}

BASE DE CONNAISSANCES NUTRITIONNISTE FYS:
${knowledgeContext}

Réponds UNIQUEMENT avec un objet JSON valide (pas de texte avant ni après) :
{
  "verdict": "beneficial" | "neutral" | "caution" | "not_recommended",
  "score": <entier 0-100>,
  "notes": "<2-3 phrases en français, spécifiques à ce mélange et ce profil>",
  "profilNutritionnel": {
    "vitamineC":     { "pourcentage": <0-100>, "valeur": "<X mg>" },
    "vitamineA":     { "pourcentage": <0-100>, "valeur": "<X µg>" },
    "fibres":        { "pourcentage": <0-100>, "valeur": "<X g>" },
    "potassium":     { "pourcentage": <0-100>, "valeur": "<X mg>" },
    "sucresNaturels":{ "pourcentage": <0-100>, "valeur": "<X g>" },
    "antioxydants":  { "pourcentage": <0-100>, "valeur": "<X mg>" }
  },
  "beneficesCibles": [
    { "nom": "immunité" | "énergie" | "digestion" | "hydratation" | "anti-inflammatoire" | "peau" | "sommeil", "niveau": "faible" | "modéré" | "élevé" }
  ],
  "interactionsFruits": [
    "<phrase courte décrivant une synergie ou un effet produit par la combinaison de deux fruits ou plus>"
  ],
  "conseil": "<1-2 phrases sur le moment idéal de consommation, la température, la fréquence ou la préparation pour maximiser les bénéfices>"
}

Règles de verdict :
- "beneficial" : mélange bien adapté au profil et aux objectifs
- "neutral" : acceptable, sans bénéfice ni risque notable
- "caution" : bénéfice présent mais précaution notable
- "not_recommended" : conflit avec une condition, allergie ou contre-indication
- score = bénéfice santé global (100 = excellent, 0 = contre-indiqué)
- profilNutritionnel : estime les valeurs à partir des fruits et quantités fournis (AJR adulte standard)
- beneficesCibles : liste uniquement les 2-4 bénéfices principaux réellement apportés par ce mélange
- interactionsFruits : 2-3 points max sur les synergies chimiques ou nutritionnelles entre fruits du mélange
- conseil : pratique et personnalisé (ex. heure, fréquence, à jeun ou non, chaud/froid, association recommandée)
- Intègre les règles NutriFYS ci-dessus dans ton analyse

LANGAGE — RÈGLE ABSOLUE:
Le client qui lira cette analyse n'est pas médecin ni nutritionniste. Rédige TOUS les champs textes (notes, interactionsFruits, conseil) dans un langage simple et accessible, comme si tu expliquais à un ami.
- Jamais de jargon scientifique ou médical sans explication immédiate
- Préfère des images concrètes et des mots du quotidien
- Si un terme technique est incontournable, ajoute une courte explication entre parenthèses
Exemples de reformulations attendues :
  ❌ "inhibe l'enzyme CYP3A4" → ✅ "peut rendre certains médicaments plus puissants qu'attendu"
  ❌ "propriétés anti-inflammatoires des polyphénols" → ✅ "aide le corps à mieux récupérer et à réduire les petites inflammations"
  ❌ "charge glycémique élevée" → ✅ "fait monter le taux de sucre dans le sang assez rapidement"
  ❌ "synergie entre les caroténoïdes et les acides gras" → ✅ "ces fruits s'associent bien : l'un aide l'autre à mieux agir dans le corps"
  ❌ "potentiel antioxydant élevé" → ✅ "protège les cellules du corps contre le vieillissement prématuré"`;
}

// ── Response parser (shared between providers) ────────────────────────────────

function parseNutrient(raw: unknown): NutrientInfo | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const n = raw as Record<string, unknown>;
  const pct = Number(n.pourcentage);
  if (isNaN(pct)) return undefined;
  return {
    pourcentage: Math.min(100, Math.max(0, pct)),
    valeur: String(n.valeur ?? ''),
  };
}

const VALID_NIVEAUX = new Set(['faible', 'modéré', 'élevé']);

function parseBenefices(raw: unknown): BeneficeCible[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((item) => item && typeof item === 'object' && typeof item.nom === 'string')
    .map((item) => ({
      nom: String(item.nom),
      niveau: VALID_NIVEAUX.has(item.niveau) ? (item.niveau as BeneficeCible['niveau']) : 'modéré',
    }))
    .slice(0, 5);
}

export function parseAnalysisResponse(raw: string): AIAnalysis {
  const jsonText = raw
    .trim()
    .replace(/^```json?\s*/i, '')
    .replace(/\s*```$/i, '');

  const parsed = JSON.parse(jsonText);

  const validVerdicts = Object.values(AIVerdict) as string[];
  const verdict = validVerdicts.includes(parsed.verdict)
    ? (parsed.verdict as AIVerdict)
    : AIVerdict.NEUTRAL;

  const pn = parsed.profilNutritionnel ?? {};

  const rawInteractions = parsed.interactionsFruits;
  const interactionsFruits: string[] = Array.isArray(rawInteractions)
    ? rawInteractions.filter((s: unknown) => typeof s === 'string').slice(0, 3)
    : [];

  return {
    verdict,
    score: Math.min(100, Math.max(0, Number(parsed.score) || 50)),
    notes: String(parsed.notes || ''),
    profilNutritionnel: {
      vitamineC: parseNutrient(pn.vitamineC),
      vitamineA: parseNutrient(pn.vitamineA),
      fibres: parseNutrient(pn.fibres),
      potassium: parseNutrient(pn.potassium),
      sucresNaturels: parseNutrient(pn.sucresNaturels),
      antioxydants: parseNutrient(pn.antioxydants),
    },
    beneficesCibles: parseBenefices(parsed.beneficesCibles),
    interactionsFruits,
    conseil: String(parsed.conseil || ''),
    analyzedAt: Timestamp.now(),
  };
}

// ── Conversational Chatbot (V3) ───────────────────────────────────────────────

export type ChatHistoryMessage = {
  role: 'user' | 'assistant';
  content: string;
};

export type ChatAIResponse = {
  text: string;
  proposal?: {
    name: string;
    profileLabel: string;
    fruitIds: string[];
    supplementIds: string[];
    benefits: string[];
    explanation: string;
    score: number;
    verdict: 'beneficial' | 'neutral' | 'caution' | 'not_recommended';
  };
};

export function buildChatSystemPrompt(profile: HealthProfile | null): string {
  const hasNoneCondition = profile?.healthConditions.some((c) =>
    c.toLowerCase().includes('aucune'),
  );
  const hasNoneAllergy = profile?.allergies.some((a) => a.toLowerCase().includes('aucune'));

  const profileSection = profile
    ? `PROFIL UTILISATEUR:
- Conditions : ${hasNoneCondition ? 'aucune condition particulière' : profile.healthConditions.join(', ') || 'non renseigné'}
- Allergies : ${hasNoneAllergy ? 'aucune allergie connue' : profile.allergies.join(', ') || 'non renseigné'}
- Objectifs : ${(profile.goals ?? []).join(', ') || 'non spécifié'}`
    : 'PROFIL UTILISATEUR: Aucun profil renseigné.';

  // Build a generic knowledge context (without specifying ingredients)
  const knowledgeContext = buildKnowledgeContext([], profile);

  return `Tu es NutriFYS, un assistant nutritionnel expert et convivial. Ton but est de converser avec l'utilisateur pour comprendre ses envies (énergie, relax, digestion, immunité) et son profil santé, puis de lui recommer l'assemblage parfait de fruits et suppléments pour un cocktail sur-mesure.

${profileSection}

BASE DE CONNAISSANCES:
${knowledgeContext}

LISTE DES INGRÉDIENTS DISPONIBLES:
Fruits: ananas, pasteque, mangue, papaye, banane, citron, corossol, baobab, orange, pomme, folere, goyave
Suppléments: gingembre, menthe, curcuma, chia, miel

DIRECTIVES:
1. Ne te présente PAS par ton nom à chaque réponse. Ton nom n'apparaît qu'au début d'une toute nouvelle conversation (premier message vide = historique vide). Ensuite, continue la conversation naturellement.
2. COMPORTEMENT DE NUTRITIONNISTE THÉRAPEUTE : Ne te presse pas de proposer un cocktail ! Discute d'abord avec le client, entraine-le dans une vraie discussion jusqu'à ce qu'il te demande clairement de composer un cocktail. Tant qu'il ne t'a pas demandé de composer un cocktail ou donner l'autorisation de composer un cocktail que tu as suggéré ne le rempli jamais au grand jamais le champ rpoposal. la discussion doit être naturelle comme avec un theurapeute. vous discuterez autant de fois tu lui posera des questions autant de fois jusqu'à ce qu'il soit satisfait. quand tu propose des fruits ne les propose jamais au grand jamais dans le champ proposal. c'est quand il accepte ta proposition que tu rempli le champ proposal. je repète en majuscule pour que tu n'oublie pas: C'EST QUAND IL ACCEPTE DE VALIDER TA PROPOSITION QUE TU REMPLIS LE CHAMP PROPOSAL. lorsqu'il te pose une question concentre toi sur sa question et tareponse doit avoir quelques mots clé de sa question comme ça il saura que tu l'as compris. tu dois parler de son profil de santé en complément. la priorité reside sur la question qu'il a posé. par exemple s'il te dit qu'il veut un cocktail comme complément alimentaire, repond en disant que c'est bien qu'il veuille un complément alimentaire ca ça sera benéfique pour sa santé parceque son profil... etc...
3. VULGARISATION : N'utilise jamais de jargon médical ou scientifique sans l'expliquer immédiatement avec des mots très simples du quotidien et des images concrètes (ex: "ça aide vos cellules à respirer").
4. SOLLICITE L'ACCORD : Fais des suggestions et demande l'accord du client (« Voulez-vous que je vous concocte une recette sur cette base ? »). C'est seulement lorsqu'il accepte explicitement la création que tu remplis le champ "proposal".
5. Si l'utilisateur pose juste une question générale, réponds chaleureusement sans générer le champ "proposal".

Tu dois ABSOLUMENT générer ta réponse au format JSON selon ce schéma :
{
  "text": "<Ta réponse textuelle à l'utilisateur (2-3 phrases max)>",
  "proposal": {
    "name": "<Nom fun du cocktail>",
    "profileLabel": "<Mot clé de l'objectif: Énergie, Immunité, etc.>",
    "fruitIds": ["<id d'un fruit dispo>", ...],
    "supplementIds": ["<id d'un supplément dispo>", ...],
    "benefits": ["<Bénéfice 1>", "<Bénéfice 2>"],
    "explanation": "<Pourquoi ce mélange est parfait pour lui>",
    "score": <0-100 calculé selon le profil>,
    "verdict": "beneficial" | "neutral" | "caution" | "not_recommended"
  }
}
Note : Le champ "proposal" est optionnel si tu ne fais que poser une question de clarification. Si tu proposes un cocktail, "proposal" est obligatoire.
Ne fournis que ce JSON valide, aucun autre texte avant ou après.`;
}

export function parseChatResponse(raw: string): ChatAIResponse {
  const jsonText = raw
    .trim()
    .replace(/^```json?\s*/i, '')
    .replace(/\s*```$/i, '');

  try {
    const parsed = JSON.parse(jsonText);
    return {
      text: parsed.text || "Désolé, je n'ai pas bien compris. Pouvez-vous reformuler ?",
      proposal: parsed.proposal,
    };
  } catch (e) {
    return {
      text: "Je rencontre une difficulté avec ma connexion. Veuillez réessayer.",
    };
  }
}

// ── Supplements Recommendation ────────────────────────────────────────────────

export type AIRecommendation = {
  profileLabel: string;
  recommendedIds: string[];
  highlightedSupplementId: string;
  why: string;
};

export function buildSupplementPrompt(
  ingredients: { fruit: Fruit; grams: number }[],
  profile: HealthProfile | null,
): string {
  const fruitLines = ingredients.map(({ fruit, grams }) => `• ${fruit.name} (${grams}g)`).join('\n');

  const hasNoneCondition = profile?.healthConditions.some((c) => c.toLowerCase().includes('aucune'));
  const hasNoneAllergy = profile?.allergies.some((a) => a.toLowerCase().includes('aucune'));

  const profileSection = profile
    ? `Profil de santé :
- Conditions : ${hasNoneCondition ? 'aucune condition' : profile.healthConditions.join(', ') || 'non renseigné'}
- Allergies : ${hasNoneAllergy ? 'aucune allergie' : profile.allergies.join(', ') || 'non renseigné'}
- Objectifs : ${(profile.goals ?? []).join(', ') || 'non spécifié'}`
    : 'Aucun profil de santé renseigné.';

  const knowledgeContext = buildKnowledgeContext(ingredients, profile);

  return `Tu es NutriFYS. L'utilisateur a composé ce mélange de fruits :
${fruitLines}

${profileSection}

BASE DE CONNAISSANCES :
${knowledgeContext}

LISTE DES SUPPLÉMENTS DISPONIBLES :
gingembre, menthe, curcuma, chia, miel

MISSION:
Sélectionne les meilleurs suppléments parmi la liste ci-dessus qui complèteraient parfaitement cette mixture, en tenant compte du PROFIL SANTÉ.
Choisis particulièrement un supplément "mis en avant" et explique pourquoi.

Réponds UNIQUEMENT par ce JSON stricte :
{
  "profileLabel": "<Ex: Énergie, Immunité, Détox...>",
  "recommendedIds": ["id1", "id2"],
  "highlightedSupplementId": "id1",
  "why": "<Explication courte et ciblée, 1-2 phrases>"
}
Rappel: les IDs sont exactement les noms en minuscules ("gingembre", "menthe", "curcuma", "chia", "miel").`;
}

export function parseSupplementResponse(raw: string): AIRecommendation {
  const jsonText = raw.trim().replace(/^```json?\s*/i, '').replace(/\s*```$/i, '');
  try {
    const parsed = JSON.parse(jsonText);
    return {
      profileLabel: parsed.profileLabel || 'Vitalité',
      recommendedIds: Array.isArray(parsed.recommendedIds) ? parsed.recommendedIds : [],
      highlightedSupplementId: parsed.highlightedSupplementId || '',
      why: parsed.why || '',
    };
  } catch (e) {
    return { profileLabel: 'Vitalité', recommendedIds: [], highlightedSupplementId: '', why: 'Erreur réseau.' };
  }
}

