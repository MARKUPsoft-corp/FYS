import Anthropic from '@anthropic-ai/sdk';
import type { Fruit, HealthProfile, AIAnalysis } from '@/entities';
import { buildAnalysisPrompt, parseAnalysisResponse } from './ai.shared';

const client = new Anthropic({
  apiKey: import.meta.env.RASENGAN_ANTHROPIC_API_KEY as string,
  dangerouslyAllowBrowser: true,
});

export async function analyzeWithClaude(
  ingredients: { fruit: Fruit; grams: number }[],
  profile: HealthProfile | null,
): Promise<AIAnalysis> {
  const prompt = buildAnalysisPrompt(ingredients, profile);

  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 900,
    messages: [{ role: 'user', content: prompt }],
  });

  const raw = message.content[0].type === 'text' ? message.content[0].text : '{}';
  return parseAnalysisResponse(raw);
}
