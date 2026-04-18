import { verifyToken } from '../_lib/auth';
import { getAI, Type, withErrorHandling } from '../_lib/gemini';

export default withErrorHandling(async (req: any, res: any) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const uid = await verifyToken(req.headers.authorization);
  if (!uid) return res.status(401).json({ error: 'Unauthorized' });

  const { base64Image, description, userDescription } = req.body ?? {};
  if (!base64Image && !description) return res.status(400).json({ error: 'base64Image or description required' });

  const ai = getAI();
  const responseSchema = {
    type: Type.ARRAY,
    items: {
      type: Type.OBJECT,
      properties: {
        name: { type: Type.STRING },
        calories: { type: Type.NUMBER },
        portion: { type: Type.STRING },
      },
      required: ['name', 'calories', 'portion'],
    },
  };

  let contents: any[];

  if (base64Image) {
    contents = [
      { inlineData: { mimeType: 'image/jpeg', data: base64Image } },
      {
        text: `Analyze this food image (likely an Indian plate or box meal). Identify each food item, estimate its portion size, and calculate the probable calorie count for that portion. ${userDescription ? `The user provided this description: "${userDescription}". ` : ''}Return the result as a JSON array of objects with 'name', 'calories' (number), and 'portion' (string) properties.`,
      },
    ];
  } else {
    contents = [
      {
        text: `The user has described a meal: "${description}". Identify each food item mentioned, estimate its portion size, and calculate the probable calorie count for that portion. Return the result as a JSON array of objects with 'name', 'calories' (number), and 'portion' (string) properties.`,
      },
    ];
  }

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents,
    config: { responseMimeType: 'application/json', responseSchema },
  });

  const text = response.text;
  if (!text) return res.status(500).json({ error: 'No response from AI' });

  return res.status(200).json(JSON.parse(text));
});
