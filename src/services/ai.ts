import type { Fruit, HealthProfile, AIAnalysis } from '@/entities';
import { analyzeWithClaude } from './ai.claude';
import { analyzeWithGemini } from './ai.gemini';

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
