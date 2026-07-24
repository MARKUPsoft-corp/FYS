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
  fruits: Fruit[] = [],
): Promise<ChatAIResponse> {
  // Currently only Gemini supports the conversational mode
  return chatWithGemini(history, profile, fruits);
}

export async function generateRegionInfo(regionName: string): Promise<string> {
  if (provider === 'claude') {
    return `La réalité agronomique de la région **${regionName}** est exceptionnelle grâce à son **climat spécifique** qui fait toute la force de son terroir. Nous sommes immensément fiers du savoir-faire et du dévouement de nos **agriculteurs locaux**. En intégrant directement leurs magnifiques récoltes dans nos jus santé, **FYS** s'engage à valoriser et faire rayonner leurs productions locales.`;
  }
  const { generateRegionInfoWithGemini } = await import('./ai.gemini');
  return generateRegionInfoWithGemini(regionName);
}

export async function recommendSupplements(
  ingredients: { fruit: Fruit; grams: number }[],
  profile: HealthProfile | null,
  availableSupplements: Fruit[] = [],
) {
  const { recommendSupplementsWithGemini } = await import('./ai.gemini');
  return recommendSupplementsWithGemini(ingredients, profile, availableSupplements);
}
