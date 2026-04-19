import { GoogleGenAI, Type } from '@google/genai';

export { Type };

export function getAI(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY is not configured');
  return new GoogleGenAI({ apiKey });
}

export function withErrorHandling(
  fn: (req: any, res: any) => Promise<any>
) {
  return async (req: any, res: any) => {
    try {
      await fn(req, res);
    } catch (err: any) {
      // Log full detail server-side only — never send internal errors to the client.
      console.error('[api]', req.url, err?.message, err?.stack);
      if (!res.headersSent) {
        res.status(500).json({ error: 'AI request failed. Please try again.' });
      }
    }
  };
}

// Strip characters that enable prompt injection before interpolating into AI prompts.
// Removes newlines, null bytes, and non-printable ASCII. Enforces a max length.
export function sanitizeInput(value: unknown, maxLen = 200): string {
  if (typeof value !== 'string') return '';
  return value
    .replace(/[\x00-\x1F\x7F]/g, ' ') // control chars (newlines, tabs, etc.) → space
    .replace(/\s+/g, ' ')              // collapse whitespace
    .slice(0, maxLen)
    .trim();
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
