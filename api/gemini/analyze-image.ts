import { verifyToken, checkRateLimit } from '../_lib/auth';
import { getAI, parseGeminiResponse, Type, withErrorHandling } from '../_lib/gemini';

const MAX_BASE64_LEN = 10 * 1024 * 1024; // 10 MB encoded

export default withErrorHandling(async (req: any, res: any) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const uid = await verifyToken(req.headers.authorization);
  if (!uid) return res.status(401).json({ error: 'Unauthorized' });
  if (!checkRateLimit(uid, { maxRequests: 15, windowMs: 60_000 }))
    return res.status(429).json({ error: 'Too many requests. Please slow down.' });

  const { base64Image } = req.body ?? {};
  if (!base64Image || typeof base64Image !== 'string') return res.status(400).json({ error: 'base64Image required' });
  if (base64Image.length > MAX_BASE64_LEN) return res.status(413).json({ error: 'Image too large' });

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
