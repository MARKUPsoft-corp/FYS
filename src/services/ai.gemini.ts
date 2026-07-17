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

export async function recommendSupplementsWithGemini(
  ingredients: { fruit: Fruit; grams: number }[],
  profile: HealthProfile | null,
): Promise<AIRecommendation> {
  const prompt = buildSupplementPrompt(ingredients, profile);
  const result = await model.generateContent(prompt);
  const raw = result.response.text();
  return parseSupplementResponse(raw);
}
