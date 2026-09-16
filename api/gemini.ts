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
    model = 'gemini-3.1-flash-lite',
    prompt,
    contents,
    systemInstruction,
    generationConfig,
  } = req.body || {};

  if (!prompt && !contents) {
    return res.status(400).json({ error: 'Missing prompt or contents in request body' });
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const generativeModel = genAI.getGenerativeModel({
      model,
      ...(systemInstruction ? { systemInstruction } : {}),
      ...(generationConfig ? { generationConfig } : {}),
    });

    const requestPayload = contents ? { contents } : prompt;
    const result = await generativeModel.generateContent(requestPayload);
    const text = result.response.text();

    return res.status(200).json({ text });
  } catch (err: any) {
    console.error('[gemini-api] Generation error:', err);
    return res.status(500).json({
      error: err?.message || 'Error generating content from Gemini',
    });
  }
}
