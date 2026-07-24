import { GoogleGenerativeAI } from '@google/generative-ai';
import type { Fruit, HealthProfile, AIAnalysis } from '@/entities';
import { 
  buildAnalysisPrompt, 
  parseAnalysisResponse, 
  buildChatSystemPrompt, 
  parseChatResponse, 
  type ChatHistoryMessage, 
  type ChatAIResponse,
  buildSupplementPrompt,
  parseSupplementResponse,
  type AIRecommendation
} from './ai.shared';
const genai = new GoogleGenerativeAI(
  import.meta.env.RASENGAN_GEMINI_API_KEY as string,
);

// gemini-2.0-flash is free-tier eligible in Google AI Studio
const model = genai.getGenerativeModel({
  model: 'gemini-3.1-flash-lite',
  generationConfig: {
    responseMimeType: 'application/json',
    maxOutputTokens: 900,
  },
});

export async function analyzeWithGemini(
  ingredients: { fruit: Fruit; grams: number }[],
  profile: HealthProfile | null,
): Promise<AIAnalysis> {
  const prompt = buildAnalysisPrompt(ingredients, profile);
  const result = await model.generateContent(prompt);
  const raw = result.response.text();
  return parseAnalysisResponse(raw);
}

export async function chatWithGemini(
  history: ChatHistoryMessage[],
  profile: HealthProfile | null,
  fruits: Fruit[] = [],
): Promise<ChatAIResponse> {
  const chatModel = genai.getGenerativeModel({
    model: 'gemini-3.1-flash-lite',
    systemInstruction: buildChatSystemPrompt(profile, fruits),
    generationConfig: {
      responseMimeType: 'application/json',
      maxOutputTokens: 1000,
    },
  });

  const contents = history.map((h) => ({
    role: h.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: h.content }],
  }));

  const result = await chatModel.generateContent({ contents });
  const raw = result.response.text();
  return parseChatResponse(raw);
}

export async function generateRegionInfoWithGemini(regionName: string): Promise<string> {
  const textModel = genai.getGenerativeModel({
    model: 'gemini-3.1-flash-lite',
  });
  const prompt = `Génère un paragraphe engageant (3 à 4 phrases maximum, percutant et direct) sur la réalité agronomique de la région "${regionName}" au Cameroun. Parle de son **climat spécifique** qui fait la force de son terroir. Valorise énormément la région ainsi que les **agriculteurs locaux** (leur savoir-faire, leur dévouement). Conclus en expliquant comment **FYS** aide à valoriser leurs productions locales en intégrant directement leurs récoltes dans nos jus santé. Mets en gras (avec **) les mots clés les plus importants pour les faire ressortir. Le ton doit être passionnant, chaleureux et fier. Ne mets pas de titre ni de retour à la ligne inutile, donne juste le texte continu.`;
  const result = await textModel.generateContent(prompt);
  return result.response.text();
}

export async function recommendSupplementsWithGemini(
  ingredients: { fruit: Fruit; grams: number }[],
  profile: HealthProfile | null,
  availableSupplements: Fruit[] = [],
): Promise<AIRecommendation> {
  const prompt = buildSupplementPrompt(ingredients, profile, availableSupplements);
  const result = await model.generateContent(prompt);
  const raw = result.response.text();
  const parsed = parseSupplementResponse(raw);
  // Ne garder que des IDs réellement présents dans le catalogue
  const validIds = new Set(availableSupplements.map((s) => s.id));
  return {
    ...parsed,
    recommendedIds: parsed.recommendedIds.filter((id) => validIds.has(id)),
    highlightedSupplementId: validIds.has(parsed.highlightedSupplementId)
      ? parsed.highlightedSupplementId
      : (parsed.recommendedIds.find((id) => validIds.has(id)) ?? ''),
  };
}
