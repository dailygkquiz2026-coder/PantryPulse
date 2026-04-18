import { GoogleGenAI, Type } from '@google/genai';

export { Type };

export function getAI(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY is not configured');
  return new GoogleGenAI({ apiKey });
}

export function parseGeminiResponse(text: string): any {
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (match?.[1]) {
      try {
        return JSON.parse(match[1]);
      } catch {}
    }
    throw new Error(`Failed to parse AI response: ${text.substring(0, 100)}`);
  }
}

const PRIVATE_IP_PATTERN = /^https?:\/\/(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/i;

export function isSafeImageUrl(url: unknown): boolean {
  if (typeof url !== 'string' || !url) return false;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:') return false;
    if (PRIVATE_IP_PATTERN.test(url)) return false;
    return true;
  } catch {
    return false;
  }
}

export function sanitizeRecipeImageUrls(recipes: any): any {
  if (!Array.isArray(recipes)) return recipes;
  return recipes.map((r: any) => ({
    ...r,
    imageUrl: isSafeImageUrl(r.imageUrl) ? r.imageUrl : null,
  }));
}
