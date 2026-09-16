import { GoogleGenerativeAI } from '@google/generative-ai';
import type { Fruit, HealthProfile, AIAnalysis } from '@/entities';
import i18n from '@/i18n';
import { 
  buildAnalysisPrompt, 
  parseAnalysisResponse, 
  buildChatSystemPrompt, 
  parseChatResponse, 
  type ChatHistoryMessage, 
  type ChatAIResponse,
  buildSupplementPrompt,
  parseSupplementResponse,
  type AIRecommendation,
  type AnalysisOptions,
  buildCustomProgramPrompt,
  parseCustomProgramResponse,
  type CustomProgramOptions,
  type GeneratedCustomProgram,
} from './ai.shared';

interface GeminiCallParams {
  model?: string;
  prompt?: string;
  contents?: { role: string; parts: { text: string }[] }[];
  systemInstruction?: string;
  generationConfig?: {
    responseMimeType?: string;
    maxOutputTokens?: number;
  };
}

let devGenAIInstance: GoogleGenerativeAI | null = null;

/**
 * Exécute une requête vers l'API Gemini.
 * En production : passe par le proxy backend sécurisé (/api/gemini) qui conserve la clé secrète côté serveur.
 * En développement local : bascule automatiquement sur le SDK local si le backend serverless n'est pas actif.
 */
async function executeGeminiRequest(params: GeminiCallParams): Promise<string> {
  // 1. Tentative d'appel via le proxy sécurisé Vercel
  try {
    const response = await fetch('/api/gemini', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    if (response.ok) {
      const data = await response.json();
      if (data?.text) {
        return data.text;
      }
    } else {
      console.warn('[Gemini] /api/gemini returned status', response.status);
    }
  } catch (backendError) {
    if (import.meta.env.DEV) {
      console.log('[Gemini] Proxy backend indisponible en dev local, utilisation du SDK client.');
    } else {
      console.error('[Gemini] Erreur proxy backend:', backendError);
      throw backendError;
    }
  }

  // 2. Fallback développement local si RASENGAN_GEMINI_API_KEY est disponible
  const devKey = import.meta.env.RASENGAN_GEMINI_API_KEY as string;
  if (devKey) {
    if (!devGenAIInstance) {
      devGenAIInstance = new GoogleGenerativeAI(devKey);
    }
    const model = devGenAIInstance.getGenerativeModel({
      model: params.model || 'gemini-3.1-flash-lite',
      ...(params.systemInstruction ? { systemInstruction: params.systemInstruction } : {}),
      ...(params.generationConfig ? { generationConfig: params.generationConfig } : {}),
    });

    const payload = params.contents ? { contents: params.contents } : (params.prompt || '');
    const result = await model.generateContent(payload);
    return result.response.text();
  }

  throw new Error('Service IA indisponible. Veuillez vérifier la configuration de la clé API.');
}

export async function analyzeWithGemini(
  ingredients: { fruit: Fruit; grams: number }[],
  profile: HealthProfile | null,
  options?: AnalysisOptions,
): Promise<AIAnalysis> {
  const lang = i18n.language?.startsWith('en') ? 'en' : 'fr';
  const prompt = buildAnalysisPrompt(ingredients, profile, lang, options);
  
  const raw = await executeGeminiRequest({
    model: 'gemini-3.1-flash-lite',
    prompt,
    generationConfig: {
      responseMimeType: 'application/json',
      maxOutputTokens: 900,
    },
  });

  return parseAnalysisResponse(raw);
}

export async function chatWithGemini(
  history: ChatHistoryMessage[],
  profile: HealthProfile | null,
  fruits: Fruit[] = [],
): Promise<ChatAIResponse> {
  const lang = i18n.language?.startsWith('en') ? 'en' : 'fr';
  const contents = history.map((h) => ({
    role: h.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: h.content }],
  }));

  const raw = await executeGeminiRequest({
    model: 'gemini-3.1-flash-lite',
    contents,
    systemInstruction: buildChatSystemPrompt(profile, fruits, lang),
    generationConfig: {
      responseMimeType: 'application/json',
      maxOutputTokens: 1000,
    },
  });

  return parseChatResponse(raw);
}

export async function generateRegionInfoWithGemini(regionName: string, lang?: string): Promise<string> {
  const isEn = (lang ?? (i18n.language?.startsWith('en') ? 'en' : 'fr')) === 'en';
  const prompt = isEn
    ? `Generate an engaging paragraph (3-4 sentences, punchy and direct) about the agronomic reality of the "${regionName}" region in Cameroon. Talk about its **specific climate** that makes its terroir strong. Greatly value the region and the **local farmers** (their know-how, their dedication). Conclude by explaining how **FYS** helps to promote their local production by directly integrating their harvests into our healthy juices. Bold (with **) the most important keywords. The tone must be passionate, warm, and proud. Don't add a title or unnecessary line breaks, just give the continuous text.`
    : `Génère un paragraphe engageant (3 à 4 phrases maximum, percutant et direct) sur la réalité agronomique de la région "${regionName}" au Cameroun. Parle de son **climat spécifique** qui fait la force de son terroir. Valorise énormément la région ainsi que les **agriculteurs locaux** (leur savoir-faire, leur dévouement). Conclus en expliquant comment **FYS** aide à valoriser leurs productions locales en intégrant directement leurs récoltes dans nos jus santé. Mets en gras (avec **) les mots clés les plus importants pour les faire ressortir. Le ton doit être passionnant, chaleureux et fier. Ne mets pas de titre ni de retour à la ligne inutile, donne juste le texte continu.`;

  return executeGeminiRequest({
    model: 'gemini-3.1-flash-lite',
    prompt,
  });
}

export async function recommendSupplementsWithGemini(
  ingredients: { fruit: Fruit; grams: number }[],
  profile: HealthProfile | null,
  availableSupplements: Fruit[] = [],
): Promise<AIRecommendation> {
  const lang = i18n.language?.startsWith('en') ? 'en' : 'fr';
  const prompt = buildSupplementPrompt(ingredients, profile, availableSupplements, lang);
  
  const raw = await executeGeminiRequest({
    model: 'gemini-3.1-flash-lite',
    prompt,
  });

  const parsed = parseSupplementResponse(raw);
  const validIds = new Set(availableSupplements.map((s) => s.id));
  return {
    ...parsed,
    recommendedIds: parsed.recommendedIds.filter((id) => validIds.has(id)),
    highlightedSupplementId: validIds.has(parsed.highlightedSupplementId)
      ? parsed.highlightedSupplementId
      : (parsed.recommendedIds.find((id) => validIds.has(id)) ?? ''),
  };
}

export async function generateCustomProgramWithGemini(
  options: CustomProgramOptions
): Promise<GeneratedCustomProgram> {
  const lang = options.lang || (i18n.language?.startsWith('en') ? 'en' : 'fr');
  const prompt = buildCustomProgramPrompt({ ...options, lang });

  const raw = await executeGeminiRequest({
    model: 'gemini-3.1-flash-lite',
    prompt,
    generationConfig: {
      responseMimeType: 'application/json',
      maxOutputTokens: 2800,
    },
  });

  return parseCustomProgramResponse(raw, options.durationDays);
}
