import { verifyToken } from '../_lib/auth';
import { getAI, parseGeminiResponse, Type, withErrorHandling } from '../_lib/gemini';

export default withErrorHandling(async (req: any, res: any) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const uid = await verifyToken(req.headers.authorization);
  if (!uid) return res.status(401).json({ error: 'Unauthorized' });

  const { itemName, location, previousPurchase } = req.body ?? {};
  if (!itemName) return res.status(400).json({ error: 'itemName required' });

  const ai = getAI();
  const locationContext = location
    ? ` for the location/pincode associated with coordinates: ${location}`
    : ' (assume a general search in India)';
  const purchaseContext = previousPurchase ? `The user previously bought "${previousPurchase}".` : '';

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Indian grocery price comparison for "${itemName}"${locationContext}. ${purchaseContext}

    Use Google Search to find CURRENT prices on Zepto, Blinkit, Swiggy Instamart, BigBasket, Amazon Fresh, Flipkart Grocery.
    Return the top 3-4 best-value results, ranked by lowest price per unit (100g or per piece).

    For each result provide:
    - productName, storeName, price (INR number), link, sourceUrl, quantity (pack size),
      productImage (direct URL), sourceVerification ("Verified on [Store]"), pricePerUnit (number), unit ("100g" or "1 unit").

    Return ONLY a JSON array. Be concise.`,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            productName: { type: Type.STRING },
            storeName: { type: Type.STRING },
            price: { type: Type.NUMBER },
            link: { type: Type.STRING },
            quantity: { type: Type.STRING },
            productImage: { type: Type.STRING },
            sourceVerification: { type: Type.STRING },
            pricePerUnit: { type: Type.NUMBER },
            unit: { type: Type.STRING },
            sourceUrl: { type: Type.STRING },
          },
          required: ['productName', 'storeName', 'price', 'link', 'quantity', 'productImage', 'sourceVerification', 'pricePerUnit', 'unit', 'sourceUrl'],
        },
      },
      tools: [{ googleSearch: {} }],
    },
  });

  return res.status(200).json(parseGeminiResponse(response.text));
});
