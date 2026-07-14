import type { Fruit, HealthProfile, AIAnalysis } from '@/entities';
import { analyzeWithClaude } from './ai.claude';
import { analyzeWithGemini, chatWithGemini } from './ai.gemini';
import type { ChatHistoryMessage, ChatAIResponse } from './ai.shared';

type AIProvider = 'gemini' | 'claude';

const provider: AIProvider =
  (import.meta.env.RASENGAN_AI_PROVIDER as AIProvider) ?? 'gemini';

export async function analyzeCocktail(
  ingredients: { fruit: Fruit; grams: number }[],
  profile: HealthProfile | null,
): Promise<AIAnalysis> {
  if (provider === 'claude') {
    return analyzeWithClaude(ingredients, profile);
  }
  return analyzeWithGemini(ingredients, profile);
}

export async function chatCocktail(
  history: ChatHistoryMessage[],
  profile: HealthProfile | null,
): Promise<ChatAIResponse> {
  // Currently only Gemini supports the conversational mode
  return chatWithGemini(history, profile);
}

export async function recommendSupplements(
  ingredients: { fruit: Fruit; grams: number }[],
  profile: HealthProfile | null,
) {
  // We use Gemini for supplements recommendation
  const { recommendSupplementsWithGemini } = await import('./ai.gemini');
  return recommendSupplementsWithGemini(ingredients, profile);
}
