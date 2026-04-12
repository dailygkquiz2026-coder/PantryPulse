import { GoogleGenAI, Type } from "@google/genai";
import { db } from "../firebase";
import { collection, addDoc } from "firebase/firestore";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export interface AnalyzedFoodItem {
  name: string;
  calories: number;
  portion: string;
}

async function logAIUsage(uid: string, type: string) {
  try {
    await addDoc(collection(db, 'aiUsageLogs'), {
      uid,
      type,
      timestamp: new Date().toISOString(),
      model: "gemini-3-flash-preview",
      estimatedCost: 0.0005 // Rough estimate for Gemini Flash
    });
  } catch (error) {
    console.error("Failed to log AI usage:", error);
  }
}

export async function analyzeMealImage(base64Image: string, userDescription?: string, uid?: string): Promise<AnalyzedFoodItem[]> {
  if (uid) {
    logAIUsage(uid, 'meal_analysis');
  }
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        {
          inlineData: {
            mimeType: "image/jpeg",
            data: base64Image,
          },
        },
        {
          text: `Analyze this food image (likely an Indian plate or box meal). Identify each food item, estimate its portion size, and calculate the probable calorie count for that portion. ${userDescription ? `The user provided this description to help identify items: "${userDescription}". ` : ""}Return the result as a JSON array of objects with 'name', 'calories' (number), and 'portion' (string) properties.`,
        },
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              calories: { type: Type.NUMBER },
              portion: { type: Type.STRING },
            },
            required: ["name", "calories", "portion"],
          },
        },
      },
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");
    return JSON.parse(text);
  } catch (error) {
    console.error("Meal analysis failed:", error);
    throw error;
  }
}

export function calculateRequiredCalories(
  weight: number,
  height: number,
  age: number,
  gender: 'male' | 'female' | 'other',
  activityLevel: number = 1.2 // Sedentary by default
): { bmr: number; tdee: number } {
  // Mifflin-St Jeor Equation
  let bmr: number;
  if (gender === 'male') {
    bmr = 10 * weight + 6.25 * height - 5 * age + 5;
  } else {
    bmr = 10 * weight + 6.25 * height - 5 * age - 161;
  }
  
  const tdee = bmr * activityLevel;
  return { bmr: Math.round(bmr), tdee: Math.round(tdee) };
}
