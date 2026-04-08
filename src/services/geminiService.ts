import { GoogleGenAI, Type } from "@google/genai";

let aiInstance: any = null;

function getAI() {
  if (!aiInstance) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === "dummy_key") {
      throw new Error("GEMINI_API_KEY is missing. Please add it to your Vercel Environment Variables and trigger a new deployment.");
    }
    aiInstance = new GoogleGenAI({ apiKey });
  }
  return aiInstance;
}

function parseGeminiResponse(text: string) {
  try {
    // Try direct parsing first
    return JSON.parse(text);
  } catch (e) {
    // Try to extract JSON from markdown code blocks
    const match = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (match && match[1]) {
      try {
        return JSON.parse(match[1]);
      } catch (innerE) {
        console.error("Failed to parse extracted JSON:", innerE);
      }
    }
    // If all fails, throw original error
    throw new Error(`Failed to parse AI response as JSON: ${text.substring(0, 100)}...`);
  }
}

export async function predictMultipleRestocks(
  items: { id: string; name: string; quantity: number; unit: string; usageFrequency: number; restockHistory?: { date: string; quantity: number }[] }[],
  members: number
) {
  if (items.length === 0) return {};
  
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Predict how many days it will take for a household of ${members} people to consume these grocery items. 
    
    CRITICAL: 
    1. Use the 'restockHistory' to identify individual user patterns. If an item is restocked frequently, it means this specific family consumes it faster than average.
    2. Use the EXACT item names provided in the 'Items' list as keys in your response.
    3. Provide realistic predictions. Most household grocery items last between 1 and 30 days. Do not exceed 90 days for any item.
    
    Items: ${JSON.stringify(items.map(i => ({ 
      name: i.name, 
      quantity: i.quantity, 
      unit: i.unit, 
      usageFrequency: i.usageFrequency,
      history: i.restockHistory 
    })))}.
    
    Return a JSON object where keys are the EXACT item names from the list above and values are the predicted days remaining.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: items.reduce((acc, item) => ({
          ...acc,
          [item.name]: { type: Type.NUMBER }
        }), {})
      }
    }
  });
  
  const predictions = parseGeminiResponse(response.text);
  // Map back to item IDs
  const result: Record<string, number> = {};
  items.forEach(item => {
    if (predictions[item.name] !== undefined) {
      result[item.id] = predictions[item.name];
    }
  });
  return result;
}

export async function predictRestock(
  itemName: string,
  quantity: number,
  unit: string,
  members: number,
  usageFrequency: number
) {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Predict how many days it will take for a household of ${members} people to consume ${quantity} ${unit} of ${itemName}, given it's used ${usageFrequency} times per day. Provide a single number representing days.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          daysRemaining: { type: Type.NUMBER },
          reasoning: { type: Type.STRING }
        },
        required: ["daysRemaining", "reasoning"]
      }
    }
  });
  return parseGeminiResponse(response.text);
}

export async function analyzeProductImage(base64Image: string) {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: [
      {
        inlineData: {
          data: base64Image,
          mimeType: "image/jpeg"
        }
      },
      {
        text: "Identify this grocery product from the image. Provide the full brand name, product name, common unit (e.g., g, ml, kg, pcs), and category. Format the output as JSON."
      }
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          brand: { type: Type.STRING },
          productName: { type: Type.STRING },
          unit: { type: Type.STRING },
          category: { type: Type.STRING },
          suggestedQuantity: { type: Type.NUMBER }
        },
        required: ["brand", "productName", "unit", "category", "suggestedQuantity"]
      }
    }
  });
  return parseGeminiResponse(response.text);
}

export async function analyzeInvoice(base64Data: string, mimeType: string) {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: "gemini-3.1-pro-preview",
    contents: [
      {
        inlineData: {
          data: base64Data,
          mimeType: mimeType
        }
      },
      {
        text: `Analyze this grocery invoice/receipt (image or PDF). 
        
        CRITICAL INSTRUCTIONS:
        1. This is likely an invoice from an Indian quick-commerce store (Zepto, Blinkit, Swiggy Instamart) or a retailer (Dmart, BigBasket).
        2. These invoices use a tabular format. You MUST find the table and extract EVERY row that represents a product.
        3. Look for columns like 'SR No', 'Item & Description', 'Qty', 'MRP', 'Product Rate', and 'Total Amt'.
        4. If the document has multiple pages, you MUST extract items from ALL pages. Do not stop after the first page.
        5. For each item:
           - 'name': Extract the full product name (e.g., "Amul Gold Full Cream Fresh Milk").
           - 'quantity': The number of units purchased (e.g., 1, 2).
           - 'unit': The pack size or unit (e.g., "500 ml", "1 pack", "3 L", "pcs").
           - 'price': The final amount paid for that line item (e.g., 33.00, 288.00).
           - 'category': Predict the food category (Dairy, Produce, Bakery, Snacks, Household, etc.).
           - 'isGrocery': True for food/grocery, False for non-food household items (cleaners, detergents, etc.).
           - 'isUnclear': True if the text is hard to read or abbreviated.
        
        6. For 'purchaseDate', extract the date of the invoice (e.g., "27-03-2026").
        
        Output the result as a JSON object.`
      }
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          purchaseDate: { type: Type.STRING, description: "ISO date string or empty string" },
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
                isUnclear: { type: Type.BOOLEAN }
              },
              required: ["name", "quantity", "unit", "price", "category", "isGrocery", "isUnclear"]
            }
          }
        },
        required: ["purchaseDate", "items"]
      }
    }
  });
  return parseGeminiResponse(response.text);
}

export async function fetchProductImage(itemName: string) {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Find a high-quality, direct image URL for the grocery product: "${itemName}". 
    The URL must be a public, direct link to an image (jpg, png, or webp). 
    Return only the URL as a string in a JSON object.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          imageUrl: { type: Type.STRING }
        },
        required: ["imageUrl"]
      },
      tools: [{ googleSearch: {} }]
    }
  });
  const data = parseGeminiResponse(response.text);
  return data.imageUrl;
}

export async function getItemSuggestions(prefix: string) {
  if (prefix.length < 2) return [];
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Provide a list of 5 common grocery items that start with or are similar to "${prefix}". Provide only the names as a JSON array of strings.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: { type: Type.STRING }
      }
    }
  });
  return JSON.parse(response.text);
}

export async function predictExpiryDate(itemName: string, category: string) {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Research the typical shelf life and expiry duration for the grocery item: "${itemName}" in the category: "${category}". 
    
    Consider factors like:
    - Packaging (e.g., Tetra pack vs. Pouch, Canned vs. Fresh).
    - Storage conditions (assume refrigerated for dairy/meat, room temperature for others unless specified).
    - Brand specific information if the brand is mentioned in the name (e.g., Amul Taaza Tetra Pack vs regular pouch milk).
    
    Calculate a probable expiry date starting from TODAY (${new Date().toISOString().split('T')[0]}).
    
    Return a JSON object with:
    - predictedExpiryDate: ISO date string (YYYY-MM-DD).
    - typicalShelfLifeDays: Number of days.
    - reasoning: A brief explanation of why this date was chosen (e.g., "Tetra pack milk typically lasts 6 months unopened").`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          predictedExpiryDate: { type: Type.STRING },
          typicalShelfLifeDays: { type: Type.NUMBER },
          reasoning: { type: Type.STRING }
        },
        required: ["predictedExpiryDate", "typicalShelfLifeDays", "reasoning"]
      },
      tools: [{ googleSearch: {} }]
    }
  });
  return parseGeminiResponse(response.text);
}

export async function searchCheapestSource(itemName: string, location?: string, previousPurchase?: string) {
  const ai = getAI();
  const locationContext = location ? ` near ${location}` : "";
  const purchaseContext = previousPurchase ? `The user previously bought "${previousPurchase}".` : "";
  
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `You are a smart shopping assistant. Find and compare all possible variants of ${itemName}${locationContext}. 
    ${purchaseContext}
    
    Your task:
    1. Identify common variants (e.g., if it's Milk, look for 500ml, 1L, Full Cream, Toned, etc.).
    2. Search across quick commerce (Blinkit, Zepto, BigBasket, Swiggy Instamart) and e-commerce (Amazon Fresh, Flipkart Grocery).
    3. Compare prices per unit (e.g., price per liter) to find the best value.
    4. List the exact product name, store, price, and a direct hyperlink.
    
    CRITICAL INSTRUCTIONS FOR LINKS:
    - DO NOT hallucinate direct product URLs with internal IDs (e.g., /product/123). These often break.
    - INSTEAD, use stable SEARCH URLs for each platform. This ensures the user sees available items for their specific location.
    - Format examples:
      - Zepto: https://www.zepto.com/search?query=[Product+Name]
      - Blinkit: https://blinkit.com/s/?q=[Product+Name]
      - BigBasket: https://www.bigbasket.com/ps/?q=[Product+Name]
      - Swiggy Instamart: https://www.swiggy.com/instamart/search?query=[Product+Name]
      - Amazon Fresh: https://www.amazon.in/s?k=[Product+Name]&i=nowstore
    
    Format the output in clear Markdown with these sections:
    - **Recommended for You**: (Prioritize the EXACT brand and product if provided in the previous purchase context)
    - **All Available Variants**: (Grouped by brand or size, ensuring the requested brand is listed first)
    - **Best Value (Price per Unit)**: (Highlight the cheapest option per unit)
    
    Ensure all links are full absolute URLs and open in a new tab.`,
    config: {
      tools: [{ googleSearch: {} }]
    }
  });
  return response.text;
}
