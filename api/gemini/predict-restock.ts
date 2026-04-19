import { verifyToken, checkRateLimit } from '../_lib/auth';
import { getAI, parseGeminiResponse, sanitizeInput, Type, withErrorHandling } from '../_lib/gemini';

export default withErrorHandling(async (req: any, res: any) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const uid = await verifyToken(req.headers.authorization);
  if (!uid) return res.status(401).json({ error: 'Unauthorized' });
  if (!checkRateLimit(uid, { maxRequests: 30, windowMs: 60_000 }))
    return res.status(429).json({ error: 'Too many requests. Please slow down.' });

  const { itemName, quantity, unit, members, usageFrequency } = req.body ?? {};
  if (!itemName) return res.status(400).json({ error: 'itemName required' });

  const safeItem = sanitizeInput(itemName, 100);
  const safeUnit = sanitizeInput(unit, 20);
  const safeQty = Math.max(0, Math.min(Number(quantity) || 0, 100_000));
  const safeMembers = Math.max(1, Math.min(Number(members) || 1, 50));
  const safeUsage = Math.max(0.01, Math.min(Number(usageFrequency) || 1, 100));

  const ai = getAI();
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Predict how many days it will take for a household of ${safeMembers} people to consume ${safeQty} ${safeUnit} of ${safeItem}, given it's used ${safeUsage} times per day. Provide a single number representing days.`,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          daysRemaining: { type: Type.NUMBER },
          reasoning: { type: Type.STRING },
        },
        required: ['daysRemaining', 'reasoning'],
      },
    },
  });

  return res.status(200).json(parseGeminiResponse(response.text));
});
