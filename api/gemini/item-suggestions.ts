import { verifyToken, checkRateLimit } from '../_lib/auth';
import { getAI, sanitizeInput, Type, withErrorHandling } from '../_lib/gemini';

export default withErrorHandling(async (req: any, res: any) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const uid = await verifyToken(req.headers.authorization);
  if (!uid) return res.status(401).json({ error: 'Unauthorized' });
  if (!checkRateLimit(uid, { maxRequests: 30, windowMs: 60_000 }))
    return res.status(429).json({ error: 'Too many requests. Please slow down.' });

  const { prefix } = req.body ?? {};
  if (!prefix || prefix.length < 2) return res.status(200).json([]);

  const safePrefix = sanitizeInput(prefix, 50);
  if (!safePrefix) return res.status(200).json([]);

  const ai = getAI();
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Provide a list of 5 common grocery items that start with or are similar to "${safePrefix}". Provide only the names as a JSON array of strings.`,
    config: {
      responseMimeType: 'application/json',
      responseSchema: { type: Type.ARRAY, items: { type: Type.STRING } },
    },
  });

  return res.status(200).json(JSON.parse(response.text));
});
