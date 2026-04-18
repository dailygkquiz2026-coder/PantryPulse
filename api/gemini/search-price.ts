import { verifyToken } from '../_lib/auth';
import { getAI, parseGeminiResponse, Type } from '../_lib/gemini';

export default async function handler(req: any, res: any) {
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
    model: 'gemini-3.1-pro-preview',
    contents: `You are a highly accurate real-time shopping assistant for the Indian market.
    Find and compare current prices for ${itemName}${locationContext}.
    ${purchaseContext}

    Your task:
    1. Search across Zepto, Blinkit, Swiggy Instamart, BigBasket, Amazon Fresh, and Flipkart Grocery.
    2. CRITICAL: You MUST use Google Search to find the ACTUAL CURRENT PRICES. Do not guess or use old data.
    3. NORMALIZE VALUE: Calculate the price per 100g or per unit for comparison.
    4. For each result, provide:
       - productName: The exact full name of the product.
       - storeName: Exact Store Name.
       - price: The current price in INR (number only).
       - link: A direct link to the product page or specific search URL.
       - sourceUrl: The EXACT URL from Google Search results where you verified this price.
       - quantity: The exact pack size.
       - productImage: A direct, high-quality image URL for this specific product.
       - sourceVerification: "Verified on [Store] ([Date])" or "Google Shopping Snippet".
       - pricePerUnit: Price per 100g or per unit (number only).
       - unit: The unit used for calculation.
    5. Rank results by lowest price per unit first.
    6. Provide 5-6 high-quality, verified results.

    Return the result as a JSON array of objects.`,
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
}
