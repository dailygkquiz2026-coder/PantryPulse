import { verifyToken, checkRateLimit } from '../_lib/auth';
import { getAI, parseGeminiResponse, isSafeImageUrl, sanitizeInput, Type, withErrorHandling } from '../_lib/gemini';

export default withErrorHandling(async (req: any, res: any) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const uid = await verifyToken(req.headers.authorization);
  if (!uid) return res.status(401).json({ error: 'Unauthorized' });
  if (!checkRateLimit(uid, { maxRequests: 20, windowMs: 60_000 }))
    return res.status(429).json({ error: 'Too many requests. Please slow down.' });

  const { itemName } = req.body ?? {};
  if (!itemName) return res.status(400).json({ error: 'itemName required' });

  const safeItem = sanitizeInput(itemName, 100);
  if (!safeItem) return res.status(400).json({ error: 'Invalid itemName' });

  const ai = getAI();
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Find a high-quality, direct image URL for the grocery product: "${safeItem}". The URL must be a public, direct link to an image (jpg, png, or webp). Return only the URL as a string in a JSON object.`,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: { imageUrl: { type: Type.STRING } },
        required: ['imageUrl'],
      },
      tools: [{ googleSearch: {} }],
    },
  });

  const data = parseGeminiResponse(response.text);
  return res.status(200).json({ imageUrl: isSafeImageUrl(data.imageUrl) ? data.imageUrl : null });
});
