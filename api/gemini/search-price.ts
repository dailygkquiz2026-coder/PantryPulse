import { verifyToken, checkRateLimit } from '../_lib/auth';
import { getAI, parseGeminiResponse, sanitizeInput, Type, withErrorHandling } from '../_lib/gemini';

export default withErrorHandling(async (req: any, res: any) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const uid = await verifyToken(req.headers.authorization);
  if (!uid) return res.status(401).json({ error: 'Unauthorized' });
  if (!checkRateLimit(uid, { maxRequests: 10, windowMs: 60_000 }))
    return res.status(429).json({ error: 'Too many requests. Please slow down.' });

  const { itemName, location, previousPurchase } = req.body ?? {};
  if (!itemName) return res.status(400).json({ error: 'itemName required' });

  const safeItem = sanitizeInput(itemName, 100);
  if (!safeItem) return res.status(400).json({ error: 'Invalid itemName' });
  const safeLocation = sanitizeInput(location, 100);
  const safePrevPurchase = sanitizeInput(previousPurchase, 150);

  const ai = getAI();
  const locationContext = safeLocation
    ? ` for the location/pincode associated with coordinates: ${safeLocation}`
    : ' (assume a general search in India)';
  const purchaseContext = safePrevPurchase ? `The user previously bought "${safePrevPurchase}".` : '';

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `You are a shopping assistant for the Indian market. Find the best current prices for "${safeItem}"${locationContext}.
    ${purchaseContext}

    Search across Zepto, Blinkit, Swiggy Instamart, BigBasket, Amazon Fresh, and Flipkart Grocery.
    Return the top 4 best-value results ranked by price per unit (cheapest first).

    For each result provide:
    - productName: full product name as shown on the store
    - storeName: one of (Zepto, Blinkit, Swiggy Instamart, BigBasket, Amazon Fresh, Flipkart Grocery)
    - price: current price in INR as a number
    - quantity: pack size e.g. "500g", "1kg", "Pack of 6"
    - pricePerUnit: price per 100g or per unit as a number
    - unit: unit used e.g. "100g" or "1 unit"
    - link: direct product URL or store search URL for this item
    - sourceVerification: short string like "Google Shopping" or "Blinkit listing"
    - sourceUrl: URL where price was verified (use empty string if unavailable)
    - productImage: direct image URL for the product (use empty string if unavailable)`,
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
          required: ['productName', 'storeName', 'price', 'link', 'quantity', 'pricePerUnit', 'unit', 'sourceVerification'],
        },
      },
      tools: [{ googleSearch: {} }],
    },
  });

  return res.status(200).json(parseGeminiResponse(response.text));
});
