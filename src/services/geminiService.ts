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
  items: { id: string; name: string; quantity: number; unit: string; usageFrequency: number }[],
  members: number
) {
  if (items.length === 0) return {};
  
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Predict how many days it will take for a household of ${members} people to consume these grocery items. 
    Items: ${JSON.stringify(items.map(i => ({ name: i.name, quantity: i.quantity, unit: i.unit, usageFrequency: i.usageFrequency })))}.
    Return a JSON object where keys are the item names and values are the predicted days remaining.`,
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

export async function analyzeInvoiceImage(base64Image: string) {
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
        text: `Analyze this grocery invoice/receipt. 
        Extract:
        1. Date of purchase (if visible, else null).
        2. List of items, each with: name, quantity, unit (guess if not clear, e.g., pcs, kg, g), price, and category.
        
        If item names are unclear, use your knowledge to predict the most likely grocery item name.
        Format the output as JSON.`
      }
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          purchaseDate: { type: Type.STRING, description: "ISO date string or null" },
          items: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                quantity: { type: Type.NUMBER },
                unit: { type: Type.STRING },
                price: { type: Type.NUMBER },
                category: { type: Type.STRING }
              },
              required: ["name", "quantity", "unit", "price", "category"]
            }
          }
        },
        required: ["purchaseDate", "items"]
      }
    }
  });
  return parseGeminiResponse(response.text);
}

export async function identifyProductByBarcode(barcode: string) {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Identify this grocery product from its barcode (EAN/GTIN/UPC): ${barcode}. 
    
    CRITICAL INSTRUCTIONS:
    1. Search for the product using the barcode number.
    2. Identify the brand name, product name, and standard unit (e.g., g, ml, kg, pcs, pack).
    3. Determine the most appropriate category from: Dairy, Bakery, Produce, Meat, Pantry, Beverages, Snacks, Household, Personal Care.
    4. If the product is not found, use your knowledge of barcode prefixes (e.g., 890 for India) to guess the likely origin or type.
    5. Format the output as JSON.`,
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
      },
      tools: [{ googleSearch: {} }]
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
