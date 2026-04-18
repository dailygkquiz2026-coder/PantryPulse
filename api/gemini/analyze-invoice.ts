import { verifyToken } from '../_lib/auth';
import { getAI, parseGeminiResponse, Type } from '../_lib/gemini';

export const config = { api: { bodyParser: { sizeLimit: '10mb' } } };

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const uid = await verifyToken(req.headers.authorization);
  if (!uid) return res.status(401).json({ error: 'Unauthorized' });

  const { base64Data, mimeType } = req.body ?? {};
  if (!base64Data || !mimeType) return res.status(400).json({ error: 'base64Data and mimeType required' });

  const ai = getAI();
  const response = await ai.models.generateContent({
    model: 'gemini-3.1-pro-preview',
    contents: [
      { inlineData: { data: base64Data, mimeType } },
      {
        text: `Analyze this grocery invoice/receipt (image or PDF).

        CRITICAL INSTRUCTIONS:
        1. This is likely an invoice from an Indian quick-commerce store (Zepto, Blinkit, Swiggy Instamart) or a retailer (Dmart, BigBasket).
        2. These invoices use a tabular format. You MUST find the table and extract EVERY row that represents a product.
        3. Look for columns like 'SR No', 'Item & Description', 'Qty', 'MRP', 'Product Rate', and 'Total Amt'.
        4. If the document has multiple pages, you MUST extract items from ALL pages. Do not stop after the first page.
        5. UNIT ACCURACY:
           - Be extremely precise with units. Distinguish between 'kg', 'g', 'ml', 'L', 'packet', 'pcs', 'bundle'.
           - If a product says "Bread 400g", the unit is "400g" and quantity is "1".
           - If a product says "Milk 500ml", the unit is "500ml".
           - If the unit is unclear, mark 'isUnclear' as true.
        6. For each item:
           - 'name': Extract the full product name.
           - 'quantity': The number of units purchased.
           - 'unit': The pack size or unit.
           - 'price': The final amount paid for that line item.
           - 'category': Predict the food category (Dairy, Produce, Bakery, Snacks, Household, etc.).
           - 'isGrocery': True for food/grocery, False for non-food household items.
           - 'isUnclear': True if the text is hard to read or abbreviated.
        7. For 'purchaseDate', extract the date of the invoice.

        Output the result as a JSON object.`,
      },
    ],
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          purchaseDate: { type: Type.STRING },
          items: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                quantity: { type: Type.NUMBER },
                unit: { type: Type.STRING },
                price: { type: Type.NUMBER },
                category: { type: Type.STRING },
                isGrocery: { type: Type.BOOLEAN },
                isUnclear: { type: Type.BOOLEAN },
              },
              required: ['name', 'quantity', 'unit', 'price', 'category', 'isGrocery', 'isUnclear'],
            },
          },
        },
        required: ['purchaseDate', 'items'],
      },
    },
  });

  return res.status(200).json(parseGeminiResponse(response.text));
}
