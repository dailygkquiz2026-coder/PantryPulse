import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function predictRestock(
  itemName: string,
  quantity: number,
  unit: string,
  members: number,
  usageFrequency: number
) {
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
  return JSON.parse(response.text);
}

export async function analyzeProductImage(base64Image: string) {
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
  return JSON.parse(response.text);
}

export async function analyzeInvoiceImage(base64Image: string) {
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
  return JSON.parse(response.text);
}

export async function getItemSuggestions(prefix: string) {
  if (prefix.length < 2) return [];
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
      - Zepto: https://www.zepto.com/search?q=[Product+Name]
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
