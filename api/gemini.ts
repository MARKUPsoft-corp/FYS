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

  // Priorité absolue aux modèles les plus rapides et stables (évite les 503 et les modèles lents à 15-20s)
  const primaryModel = requestedModel || process.env.GEMINI_MODEL || 'gemini-3-flash-preview';
  const modelQueue = Array.from(new Set([
    'gemini-3-flash-preview',
    primaryModel,
    'gemini-3.6-flash',
    'gemini-flash-lite-latest',
  ]));

  const genAI = new GoogleGenerativeAI(apiKey);
  const requestPayload = contents ? { contents } : prompt;

  let lastError: any = null;

  for (const modelName of modelQueue) {
    try {
      const generativeModel = genAI.getGenerativeModel({
        model: modelName,
        ...(systemInstruction ? { systemInstruction } : {}),
        ...(generationConfig ? { generationConfig } : {}),
      });

      // Timeout strict de 5 secondes par tentative pour éviter tout blocage
      const result = await withTimeout(
        generativeModel.generateContent(requestPayload),
        5000,
        `Model ${modelName} timed out after 5000ms`
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
