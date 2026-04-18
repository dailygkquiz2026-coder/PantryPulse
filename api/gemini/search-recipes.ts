import { verifyToken } from '../_lib/auth';
import { getAI, parseGeminiResponse, sanitizeRecipeImageUrls, Type } from '../_lib/gemini';

const recipeSchema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      title: { type: Type.STRING },
      description: { type: Type.STRING },
      source: { type: Type.STRING },
      imageUrl: { type: Type.STRING },
      ingredients: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            typicalQuantityPerPerson: { type: Type.STRING },
          },
          required: ['name', 'typicalQuantityPerPerson'],
        },
      },
      instructions: { type: Type.ARRAY, items: { type: Type.STRING } },
      prepTime: { type: Type.STRING },
      cookTime: { type: Type.STRING },
      difficulty: { type: Type.STRING, enum: ['Easy', 'Medium', 'Hard'] },
      tips: { type: Type.ARRAY, items: { type: Type.STRING } },
    },
    required: ['title', 'description', 'source', 'imageUrl', 'ingredients', 'instructions', 'prepTime', 'cookTime', 'difficulty', 'tips'],
  },
};

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const uid = await verifyToken(req.headers.authorization);
  if (!uid) return res.status(401).json({ error: 'Unauthorized' });

  const { query } = req.body ?? {};
  if (!query) return res.status(400).json({ error: 'query required' });

  const ai = getAI();
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Search for the top 3 best recipes for: "${query}".
    For each recipe provide title, description, source, imageUrl (direct https link), ingredients, instructions, prepTime, cookTime, difficulty, and tips.
    Return the result as a JSON array of objects.`,
    config: {
      responseMimeType: 'application/json',
      responseSchema: recipeSchema as any,
      tools: [{ googleSearch: {} }],
    },
  });

  return res.status(200).json(sanitizeRecipeImageUrls(parseGeminiResponse(response.text)));
}
