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
  "suggestedName": "<nom créatif court en français pour ce cocktail, 2 à 4 mots max, sans guillemets>",
  "notes": "<2-3 phrases en français, spécifiques à ce mélange et ce profil>",
  "tasteAdvice": "<1 phrase factuelle sur l'équilibre des saveurs — si le goût risque d'être trop fort/amer/piquant, dis-le clairement et suggère une correction (ex : 'Avec autant de gingembre, ce mix sera très piquant. Réduisez sa proportion à moins de 10% du total pour un résultat agréable.')>. Si l'équilibre est bon, mets null.",
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
- "caution" : bénéfice présent mais précaution notable (y compris mauvais équilibre gustatif)
- "not_recommended" : conflit avec une condition, allergie ou contre-indication
- score = bénéfice santé global (100 = excellent, 0 = contre-indiqué)
- suggestedName : invente un nom original et appétissant (jamais "Mon cocktail", "Cocktail personnalisé" ou générique)
- profilNutritionnel : estime les valeurs à partir des fruits et quantités fournis (AJR adulte standard)
- beneficesCibles : liste uniquement les 2-4 bénéfices principaux réellement apportés par ce mélange
- interactionsFruits : 2-3 points max sur les synergies chimiques ou nutritionnelles entre fruits du mélange
- conseil : pratique et personnalisé (ex. heure, fréquence, à jeun ou non, chaud/froid, association recommandée)
- Intègre les règles NutriFYS ci-dessus dans ton analyse

RÈGLE D'ÉQUILIBRE GUSTATIF — OBLIGATOIRE :
Évalue le ratio entre fruits BASE (doux, juteux : pomme, orange, mangue, pastèque, carotte, ananas...) et BOOSTERS (goût fort : gingembre, céleri, curcuma, menthe, spiruline, piment...).
- Si les BOOSTERS représentent plus de 25% du poids total → tasteAdvice doit ABSOLUMENT signaler que le goût sera écrasant et inconfortable.
- Si aucun fruit de base doux n'est présent → tasteAdvice doit le signaler (mélange amer/végetale imbuvable).
- Si l'équilibre est 70%+ de bases douces et ≤15% de boosters → tasteAdvice peut être null.

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
    ...(typeof parsed.suggestedName === 'string' && parsed.suggestedName.trim()
      ? { suggestedName: parsed.suggestedName.trim().slice(0, 48) }
      : {}),
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

export function buildChatSystemPrompt(profile: HealthProfile | null, fruits: Fruit[] = []): string {
  const hasNoneCondition = profile?.healthConditions.some((c) =>
    c.toLowerCase().includes('aucune'),
  );
  const hasNoneAllergy = profile?.allergies.some((a) => a.toLowerCase().includes('aucune'));

  const profileSection = profile
    ? `PROFIL UTILISATEUR:
- Conditions de santé : ${hasNoneCondition ? 'aucune condition particulière signalée' : profile.healthConditions.join(', ') || 'non renseigné'}
- Allergies connues : ${hasNoneAllergy ? 'aucune allergie connue' : profile.allergies.join(', ') || 'non renseigné'}
- Objectifs de santé : ${(profile.goals ?? []).join(', ') || 'non spécifié'}`
    : 'PROFIL UTILISATEUR: Aucun profil santé renseigné. Adopte une approche générale et pose des questions pour mieux comprendre ses besoins.';

  // Build a generic knowledge context
  const knowledgeContext = buildKnowledgeContext([], profile);

  // Build a rich fruit catalog from real Firestore data
  const mainFruits = fruits.filter(f => !f.isSupplement);
  const supplements = fruits.filter(f => f.isSupplement);

  const fruitCatalog = mainFruits.length > 0
    ? mainFruits.map((f) => {
      const gi = f.glycemicIndex?.badge ?? 'non spécifié';
      const benefits = f.benefits?.length ? f.benefits.join(', ') : 'non spécifié';
      const warnings = f.warnings?.length ? f.warnings.join(', ') : 'aucun';
      const calories = (f as any).calories ?? 'non spécifié';
      const vitamins = (f as any).vitamins ?? '';
      return `  • ${f.name} [id: ${f.id}] — Calories: ${calories} kcal/100g | Index glycémique: ${gi} | Bénéfices: ${benefits} | Vitamines/Mineraux: ${vitamins || 'non spécifié'} | Précautions: ${warnings}`;
    }).join('\n')
    : '(Aucun fruit chargé — demande à l\'utilisateur de revenir plus tard)';

  const fruitIds = mainFruits.map(f => f.id).join(', ');

  const supplementCatalog = supplements.length > 0
    ? supplements.map((s) => `  • ${s.name} [id: ${s.id}] — Bénéfices: ${s.benefits?.join(', ') || 'non spécifié'}`).join('\n')
    : '(Aucun supplément chargé)';
  const supplementIds = supplements.map(s => s.id).join(', ');

  return `Tu es NutriFYS, un assistant nutritionniste expert spécialisé dans les cocktails de fruits santé de FYS entrainé par les experts du domaine. Tu as une profonde maîtrise de la biochimie nutritionnelle, des interactions entre nutriments, et de l\'impact des aliments sur le corps humain. Mais tu es aussi un excellent pédagogue — tu adores expliquer la nutrition simplement, comme si tu parlais à quelqu\'un qui ne connaît rien au domaine.

Ton style :
- Chaleureux, humain, bienveillant — comme un médecin de quartier qui prend le temps d\'expliquer.
- Tu utilises les vrais termes médicaux et nutritionnels (vitamine C, antioxydants, acide folique, fibres solubles, index glycémique, potassium, fer non-héminique, etc.) mais tu les expliques TOUJOURS avec des images simples et concrètes du quotidien.
  Exemple : "La vitamine C — c\'est comme le gardien de sécurité de votre corps. Elle aide vos globules blancs, qui sont les soldats de votre système immunitaire, à mieux combattre les microbes."
- Tu es pédagogue : tu expliques le POURQUOI de chaque fruit, comment le nutriment agit dans le corps, à quelle vitesse, dans quel organe, et quel effet concret l\'utilisateur va ressentir.
- Tu adaptes TOUJOURS ton analyse au profil santé de l\'utilisateur. Si il est diabetique, tu mentionnes l\'élévation de glycémie et tu l\'expliques simplement. Si il a des objectifs spécifiques, tu y répondres directement.
- Tu discutes naturellement, comme une vraie consultation. Tu poses des questions, tu réécoutes.

${profileSection}

BASE DE CONNAISSANCES NUTRITIONNELLES:
${knowledgeContext}

CATALOGUE DES FRUITS DISPONIBLES AUJOURD\'HUI (données temps réel FYS):
${fruitCatalog}

CATALOGUE DES SUPPLÉMENTS DISPONIBLES:
${supplementCatalog}

FRUIT IDs VALIDES POUR LE CHAMP "proposal.fruitIds": [${fruitIds}]
SUPPLEMENT IDs VALIDES POUR LE CHAMP "proposal.supplementIds": [${supplementIds}]

RÈGLE D'OR GUSTATIVE (LE GOÛT EST PRIMORDIAL):
- Ne propose JAMAIS un cocktail purement utilitaire sans base douce (ex: Gingembre + Épinard + Spiruline est imbuvable).
- Un cocktail FYS doit TOUJOURS contenir une majorité (60-80%) de fruits de BASE juteux et doux (Pomme, Orange, Carotte, Pastèque, etc.).
- Les suppléments et boosters (Gingembre, Curcuma, Menthe, Céleri...) renforcent l'efficacité santé mais ont un goût extrêmement fort ! Ils ne doivent jamais dominer le cocktail.
- Assure l'équilibre : une base douce d'abord, un accent typé ensuite, et potentiellement un micro-booster pour terminer.

DIRECTIVES DE CONSULTATION :
1. NE TE PRÉSENTE PAS à chaque réponse. Seulement au tout début d\'une nouvelle conversation (historique vide).

2. COMPORTEMENT DE DR. NUTRITIONNISTE :
   - Sois curieux de l\'utilisateur. Dès le début, pose plusieurs questions pour comprendre son mode de vie, ses symptômes, ses envies.
   - Quand il pose une question, concentre-toi sur sa question EN PRIORITÉ et réponds-y de façon complète, pédagogique et engageante. Mentionne son profil de santé quand c\'est pertinent.
   - Quand tu mentionnes un nutriment ou un terme scientifique, explique-le immédiatement avec une métaphore ou image du quotidien.
   - Avant de suggérer des fruits, évalue mentalement CHAQUE fruit du catalogue ci-dessus, et réserve uniquement les 2–4 les plus adaptés au profil et objectif. Détaille brievèment pourquoi tu les choisis (ex: "l\'orange est intéressante ici car elle contient 50-70mg de vitamine C pour 100g, ce qui va renforcer — comme un bouclier — votre système immunitaire sur les 24h qui suivent...").
   - Pour les suppléments, propose-les VERBALEMENT en expliquant leur ACTION physique dans le corps, puis DEMANDE l\'avis de l\'utilisateur avant de les inclure dans un cocktail.

3. RÈGLE ABSOLUE SUR LE CHAMP "proposal" :
   - NE JAMAIS remplir "proposal" sur une question, une suggestion verbale ou une explication.
   - NE JAMAIS remplir "proposal" sans validation explicite de l'utilisateur ("oui", "ok", "vas-y", "fais-le", "compose le cocktail", ou équivalent).
   - C'EST UNIQUEMENT QUAND L'UTILISATEUR ACCEPTE EXPLICITEMENT QUE TU REMPLIS "proposal".
   - LORSQUE TU REMPLIS "proposal" : Ajoute TOUJOURS une phrase claire à la fin de ton champ "text" pour remercier le client de la part de l'équipe FYS, et rassure-le en lui disant que dès qu'il validera sa commande, son cocktail sera préparé avec soin et livré sous peu, dans les délais impartis.

4. SOLLICITE TOUJOURS L'ACCORD : Après ta suggestion verbale, demande systématiquement (ex: « Voulez-vous que je compose ce cocktail pour vous ? »).

Tu dois générer ta réponse UNIQUEMENT au format JSON valide :
{
  "text": "<Ta réponse textuelle pédagogique (3-5 phrases, chaleureux et expert). Si c'est une proposition, inclus les remerciements FYS et la promesse de livraison.>",
  "proposal": {
    "name": "<Nom créatif du cocktail>",
    "profileLabel": "<Objectif: Énergie, Immunité, Digestion, etc.>",
    "fruitIds": ["<id exact du fruit de la liste>", ...],
    "supplementIds": ["<id exact du supplément>", ...],
    "benefits": ["<Bénéfice 1>", "<Bénéfice 2>"],
    "explanation": "<Explication pédagogique de pourquoi ce mélange est idéal pour ce profil>",
    "score": <0-100>,
    "verdict": "beneficial" | "neutral" | "caution" | "not_recommended"
  }
}
RAPPEL CRITIQUE : "proposal" est STRICTEMENT OPTIONNEL. Uniquement quand l\'utilisateur a validé explicitement. Ne fournis que ce JSON valide, aucun autre texte avant ou après.`;
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
  availableSupplements: Fruit[] = [],
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

  const supplementCatalog = availableSupplements.length > 0
    ? availableSupplements.map((s) => {
        const benefits = s.benefits?.length ? s.benefits.join(', ') : 'non spécifié';
        const warnings = s.warnings?.length ? s.warnings.join(', ') : 'aucun';
        return `  • ${s.name} [id: ${s.id}] — Bénéfices: ${benefits} | Précautions: ${warnings}`;
      }).join('\n')
    : '  (aucun supplément en base — recommande une liste vide)';

  const validIds = availableSupplements.map((s) => s.id).join(', ');

  return `Tu es NutriFYS. L'utilisateur a composé ce mélange de fruits :
${fruitLines}

${profileSection}

BASE DE CONNAISSANCES :
${knowledgeContext}

LISTE DES SUPPLÉMENTS DISPONIBLES (catalogue FYS en temps réel) :
${supplementCatalog}

MISSION:
Sélectionne 1 à 3 meilleurs suppléments parmi la liste ci-dessus qui compléteraient parfaitement ce mélange, en tenant compte du PROFIL SANTÉ.
Choisis un supplément "mis en avant" et explique pourquoi en langage simple.
N'invente AUCUN id — utilise uniquement les ids fournis.

Réponds UNIQUEMENT par ce JSON strict :
{
  "profileLabel": "<Ex: Énergie, Immunité, Détox...>",
  "recommendedIds": ["id1", "id2"],
  "highlightedSupplementId": "id1",
  "why": "<Explication courte et ciblée, 1-2 phrases>"
}
IDs valides: [${validIds}]`;
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

