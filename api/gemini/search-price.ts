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
    model: 'gemini-3.1-pro-preview',
    contents: `You are a highly accurate real-time shopping assistant for the Indian market.
    Find and compare current prices for ${itemName}${locationContext}.
    ${purchaseContext}

    Your task:
    1. Search across Zepto, Blinkit, Swiggy Instamart, BigBasket, Amazon Fresh, and Flipkart Grocery.
    2. CRITICAL: You MUST use Google Search to find the ACTUAL CURRENT PRICES.
       - Use specific search queries like: 'site:blinkit.com [item] price', 'site:zepto.com [item] price', etc.
       - Do not guess or use old data. If you cannot find a real-time price for a store, do NOT include it.
    3. NORMALIZE VALUE: Calculate the price per 100g (for weight-based items like nuts, grains, vegetables) or per unit (for count-based items like eggs, soap). This is the most important metric for comparison.
    4. BRAND MATCHING: If the user specifies a brand (e.g., "Tata Sampann"), prioritize that brand. If they search for a general item (e.g., "Walnut"), show the best value options across all reputable brands.
    5. Verify availability for the specific location/pincode if provided. If an item is out of stock or not available in that area, do NOT include it.
    6. For each result, provide:
       - productName: The exact full name of the product as shown on the store.
       - storeName: Exact Store Name (Zepto, Blinkit, Swiggy Instamart, BigBasket, Amazon Fresh, Flipkart Grocery).
       - price: The current price in INR (number only).
       - link: A direct link to the product page or a highly specific search URL.
         - PREFER direct product URLs (e.g., https://blinkit.com/prn/[product-id]) if found in search results.
         - FALLBACK to these search formats ONLY if a direct link is unavailable:
           - The search query in the URL MUST match the 'productName' EXACTLY.
           - Zepto: https://www.zepto.com/search?query=[EXACT_PRODUCT_NAME]
           - Blinkit: https://blinkit.com/s/?q=[EXACT_PRODUCT_NAME]
           - BigBasket: https://www.bigbasket.com/ps/?q=[EXACT_PRODUCT_NAME]
           - Swiggy Instamart: https://www.swiggy.com/instamart/search?query=[EXACT_PRODUCT_NAME]
           - Amazon Fresh: https://www.amazon.in/s?k=[EXACT_PRODUCT_NAME]&i=nowstore
           - Flipkart Grocery: https://www.flipkart.com/search?q=[EXACT_PRODUCT_NAME]&marketplace=GROCERY
       - sourceUrl: The EXACT URL from Google Search results where you verified this price. This is MANDATORY for every result.
       - quantity: The exact pack size (e.g., "500g", "1kg", "Pack of 2").
       - productImage: A direct, high-quality image URL for this specific product.
       - sourceVerification: A detailed string: "Verified on [Store] ([Date])" or "Google Shopping Snippet".
       - pricePerUnit: Calculate the price per 100g or per unit (number only).
       - unit: The unit used for calculation (e.g., "100g", "1 unit").

    7. Rank results by total value (lowest price per unit first).
    8. Provide 5-6 high-quality, verified results.

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
});
