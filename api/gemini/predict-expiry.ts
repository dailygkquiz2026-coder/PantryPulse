import { verifyToken } from '../_lib/auth';
import { getAI, parseGeminiResponse, Type, withErrorHandling } from '../_lib/gemini';

export default withErrorHandling(async (req: any, res: any) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const uid = await verifyToken(req.headers.authorization);
  if (!uid) return res.status(401).json({ error: 'Unauthorized' });

  const { itemName, category } = req.body ?? {};
  if (!itemName || !category) return res.status(400).json({ error: 'itemName and category required' });

  const ai = getAI();
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Research the typical shelf life and expiry duration for the grocery item: "${itemName}" in the category: "${category}".

    Consider factors like:
    - Packaging (e.g., Tetra pack vs. Pouch, Canned vs. Fresh).
    - Storage conditions (assume refrigerated for dairy/meat, room temperature for others unless specified).
    - Brand specific information if the brand is mentioned in the name.

    Calculate a probable expiry date starting from TODAY (${new Date().toISOString().split('T')[0]}).

    Return a JSON object with:
    - predictedExpiryDate: ISO date string (YYYY-MM-DD).
    - typicalShelfLifeDays: Number of days.
    - reasoning: A brief explanation.`,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          predictedExpiryDate: { type: Type.STRING },
          typicalShelfLifeDays: { type: Type.NUMBER },
          reasoning: { type: Type.STRING },
        },
        required: ['predictedExpiryDate', 'typicalShelfLifeDays', 'reasoning'],
      },
    },
  });

  return res.status(200).json(parseGeminiResponse(response.text));
});
