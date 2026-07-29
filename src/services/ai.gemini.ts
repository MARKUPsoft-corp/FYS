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
  const lang = i18n.language?.startsWith('en') ? 'en' : 'fr';
  const prompt = buildAnalysisPrompt(ingredients, profile, lang);
  const result = await model.generateContent(prompt);
  const raw = result.response.text();
  return parseAnalysisResponse(raw);
}

export async function chatWithGemini(
  history: ChatHistoryMessage[],
  profile: HealthProfile | null,
  fruits: Fruit[] = [],
): Promise<ChatAIResponse> {
  const lang = i18n.language?.startsWith('en') ? 'en' : 'fr';
  const chatModel = genai.getGenerativeModel({
    model: 'gemini-3.1-flash-lite',
    systemInstruction: buildChatSystemPrompt(profile, fruits, lang),
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

export async function generateRegionInfoWithGemini(regionName: string, lang?: string): Promise<string> {
  const isEn = (lang ?? (i18n.language?.startsWith('en') ? 'en' : 'fr')) === 'en';
  const textModel = genai.getGenerativeModel({
    model: 'gemini-3.1-flash-lite',
  });
  const prompt = isEn
    ? `Generate an engaging paragraph (3-4 sentences, punchy and direct) about the agronomic reality of the "${regionName}" region in Cameroon. Talk about its **specific climate** that makes its terroir strong. Greatly value the region and the **local farmers** (their know-how, their dedication). Conclude by explaining how **FYS** helps to promote their local production by directly integrating their harvests into our healthy juices. Bold (with **) the most important keywords. The tone must be passionate, warm, and proud. Don't add a title or unnecessary line breaks, just give the continuous text.`
    : `Génère un paragraphe engageant (3 à 4 phrases maximum, percutant et direct) sur la réalité agronomique de la région "${regionName}" au Cameroun. Parle de son **climat spécifique** qui fait la force de son terroir. Valorise énormément la région ainsi que les **agriculteurs locaux** (leur savoir-faire, leur dévouement). Conclus en expliquant comment **FYS** aide à valoriser leurs productions locales en intégrant directement leurs récoltes dans nos jus santé. Mets en gras (avec **) les mots clés les plus importants pour les faire ressortir. Le ton doit être passionnant, chaleureux et fier. Ne mets pas de titre ni de retour à la ligne inutile, donne juste le texte continu.`;
  const result = await textModel.generateContent(prompt);
  return result.response.text();
}

export async function recommendSupplementsWithGemini(
  ingredients: { fruit: Fruit; grams: number }[],
  profile: HealthProfile | null,
  availableSupplements: Fruit[] = [],
): Promise<AIRecommendation> {
  const lang = i18n.language?.startsWith('en') ? 'en' : 'fr';
  const prompt = buildSupplementPrompt(ingredients, profile, availableSupplements, lang);
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
