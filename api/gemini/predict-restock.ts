import { verifyToken } from '../_lib/auth';
import { getAI, parseGeminiResponse, Type, withErrorHandling } from '../_lib/gemini';

export default withErrorHandling(async (req: any, res: any) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const uid = await verifyToken(req.headers.authorization);
  if (!uid) return res.status(401).json({ error: 'Unauthorized' });

  const { itemName, quantity, unit, members, usageFrequency } = req.body ?? {};
  if (!itemName) return res.status(400).json({ error: 'itemName required' });

  const ai = getAI();
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Predict how many days it will take for a household of ${members} people to consume ${quantity} ${unit} of ${itemName}, given it's used ${usageFrequency} times per day. Provide a single number representing days.`,
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
