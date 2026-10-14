import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = process.env.GEMINI_API_KEY || process.env.RASENGAN_GEMINI_API_KEY;

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

  const primaryModel = requestedModel || process.env.GEMINI_MODEL || 'gemini-flash-lite-latest';
  const modelQueue = Array.from(new Set(['gemini-flash-lite-latest', primaryModel, 'gemini-3.1-flash-lite', 'gemini-3.8-flash']));

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

      const result = await generativeModel.generateContent(requestPayload);
      const text = result.response.text();
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
