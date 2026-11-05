import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = process.env.GEMINI_API_KEY || process.env.RASENGAN_GEMINI_API_KEY;

// Cache mémoire serveur pour les requêtes identiques (TTL 15 min)
const geminiCache = new Map<string, { text: string; model: string; exp: number }>();

function withTimeout<T>(promise: Promise<T>, ms: number, errorMsg: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(errorMsg)), ms)),
  ]);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Autoriser uniquement les requêtes POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  if (!apiKey) {
    console.error('[gemini-api] GEMINI_API_KEY is not configured on server');
    return res.status(500).json({ error: 'Gemini API key is not configured on server' });
  }

  const {
    model: requestedModel,
    prompt,
    contents,
    systemInstruction,
    generationConfig,
  } = req.body || {};

  if (!prompt && !contents) {
    return res.status(400).json({ error: 'Missing prompt or contents in request body' });
  }

  // Vérifier le cache mémoire (pour accélérer instantanément les analyses répétées à 0ms)
  const cacheKey = JSON.stringify({ prompt, contents, systemInstruction, generationConfig });
  const cached = geminiCache.get(cacheKey);
  if (cached && cached.exp > Date.now()) {
    return res.status(200).json({ text: cached.text, model: cached.model, cached: true });
  }

  // Priorité absolue aux modèles les plus rapides, stables et sans dépassement de quota (évite les 503 et 429)
  const envModel = process.env.GEMINI_MODEL;
  const modelQueue = Array.from(new Set([
    'gemini-3.5-flash-lite',
    'gemini-3.1-flash-lite',
    'gemini-flash-lite-latest',
    requestedModel,
    ...(envModel && envModel !== 'gemini-3-flash-preview' ? [envModel] : []),
    'gemini-3.6-flash',
    'gemini-3-flash-preview',
  ])).filter(Boolean) as string[];

  const genAI = new GoogleGenerativeAI(apiKey);
  const requestPayload = contents ? { contents } : prompt;

  let lastError: any = null;

  for (const modelName of modelQueue) {
    try {
      const isThinkingSupported = !modelName.includes('lite');
      const effectiveGenConfig: any = {
        ...(generationConfig || {}),
        maxOutputTokens: Math.max(2048, Number(generationConfig?.maxOutputTokens) || 2048),
      };
      if (isThinkingSupported) {
        effectiveGenConfig.thinkingConfig = { thinkingBudget: 0 };
      }

      const generativeModel = genAI.getGenerativeModel({
        model: modelName,
        ...(systemInstruction ? { systemInstruction } : {}),
        generationConfig: effectiveGenConfig as any,
      });

      const timeoutMs = modelName.includes('lite') ? 7000 : 15000;
      const result = await withTimeout(
        generativeModel.generateContent(requestPayload),
        timeoutMs,
        `Model ${modelName} timed out after ${timeoutMs}ms`
      );
      const text = result.response.text();

      // Mettre en cache pour 15 minutes
      if (geminiCache.size > 200) {
        const firstKey = geminiCache.keys().next().value;
        if (firstKey) geminiCache.delete(firstKey);
      }
      geminiCache.set(cacheKey, { text, model: modelName, exp: Date.now() + 15 * 60 * 1000 });

      return res.status(200).json({ text, model: modelName });
    } catch (err: any) {
      lastError = err;
      console.warn(`[gemini-api] Model ${modelName} failed (${err?.message || err}). Trying fallback...`);
    }
  }

  console.error('[gemini-api] All Gemini models failed:', lastError);
  return res.status(500).json({
    error: lastError?.message || 'Error generating content from Gemini',
  });
}
