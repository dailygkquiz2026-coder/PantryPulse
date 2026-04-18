import { auth } from '../firebase';

export interface AnalyzedFoodItem {
  name: string;
  calories: number;
  portion: string;
}

async function apiPost(endpoint: string, body: object): Promise<any> {
  const user = auth.currentUser;
  if (!user) throw new Error('Not authenticated');
  const token = await user.getIdToken();

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(err.error || `API error ${res.status}`);
  }

  return res.json();
}

export async function analyzeMealImage(base64Image: string, userDescription?: string, uid?: string): Promise<AnalyzedFoodItem[]> {
  return apiPost('/api/calorie/analyze-meal', { base64Image, userDescription, uid });
}

export async function analyzeMealDescription(description: string, uid?: string): Promise<AnalyzedFoodItem[]> {
  return apiPost('/api/calorie/analyze-meal', { description, uid });
}

export function calculateRequiredCalories(
  weight: number,
  height: number,
  age: number,
  gender: 'male' | 'female' | 'other',
  activityLevel: number = 1.2
): { bmr: number; tdee: number } {
  let bmr: number;
  if (gender === 'male') {
    bmr = 10 * weight + 6.25 * height - 5 * age + 5;
  } else {
    bmr = 10 * weight + 6.25 * height - 5 * age - 161;
  }
  const tdee = bmr * activityLevel;
  return { bmr: Math.round(bmr), tdee: Math.round(tdee) };
}
