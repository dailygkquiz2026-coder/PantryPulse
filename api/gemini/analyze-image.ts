import { verifyToken } from '../_lib/auth';
import { getAI, parseGeminiResponse, Type, withErrorHandling } from '../_lib/gemini';

export default withErrorHandling(async (req: any, res: any) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const uid = await verifyToken(req.headers.authorization);
  if (!uid) return res.status(401).json({ error: 'Unauthorized' });

  const { base64Image } = req.body ?? {};
  if (!base64Image) return res.status(400).json({ error: 'base64Image required' });

  const ai = getAI();
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: [
      { inlineData: { data: base64Image, mimeType: 'image/jpeg' } },
      { text: 'Identify this grocery product from the image. Provide the full brand name, product name, common unit (e.g., g, ml, kg, pcs), and category. Format the output as JSON.' },
    ],
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          brand: { type: Type.STRING },
          productName: { type: Type.STRING },
          unit: { type: Type.STRING },
          category: { type: Type.STRING },
          suggestedQuantity: { type: Type.NUMBER },
        },
        required: ['brand', 'productName', 'unit', 'category', 'suggestedQuantity'],
      },
    },
  });

  return res.status(200).json(parseGeminiResponse(response.text));
});
