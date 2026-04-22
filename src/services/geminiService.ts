import { auth } from '../firebase';

const PRIVATE_IP_PATTERN = /^https?:\/\/(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/i;

export function isSafeImageUrl(url: unknown): boolean {
  if (typeof url !== 'string' || !url) return false;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:') return false;
    if (PRIVATE_IP_PATTERN.test(url)) return false;
    return true;
  } catch {
    return false;
  }
}

function sanitizeRecipeImageUrls(recipes: any): any {
  if (!Array.isArray(recipes)) return recipes;
  return recipes.map((r: any) => ({
    ...r,
    imageUrl: isSafeImageUrl(r.imageUrl) ? r.imageUrl : null,
  }));
}

// Client-side cache for price/recipe results.
const searchCache: Record<string, { data: any; timestamp: number }> = {};
const CACHE_TTL = 30 * 60 * 1000;       // 30 min for price results (prices don't change that fast)
const TRENDING_CACHE_TTL = 60 * 60 * 1000; // 1 hour for trending recipes

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
    const raw = await res.text();
    let detail = raw;
    try {
      const parsed = JSON.parse(raw);
      detail = parsed.error || raw;
    } catch {
      // non-JSON response (e.g. HTML fallback): keep a short snippet
      detail = raw.slice(0, 200).replace(/<[^>]+>/g, '').trim() || `status ${res.status}`;
    }
    throw new Error(`[${endpoint} ${res.status}] ${detail}`);
  }

  return res.json();
}

export async function predictMultipleRestocks(
  items: { id: string; name: string; quantity: number; unit: string; usageFrequency: number; lastUpdated: string; restockHistory?: { date: string; quantity: number }[] }[],
  adults: number,
  children: number,
  uid?: string
) {
  if (items.length === 0) return {};
  return apiPost('/api/gemini/predict-restocks', { items, adults, children, uid });
}

export async function predictRestock(
  itemName: string,
  quantity: number,
  unit: string,
  members: number,
  usageFrequency: number
) {
  return apiPost('/api/gemini/predict-restock', { itemName, quantity, unit, members, usageFrequency });
}

export async function analyzeProductImage(base64Image: string, uid?: string) {
  return apiPost('/api/gemini/analyze-image', { base64Image, uid });
}

export async function analyzeInvoice(base64Data: string, mimeType: string, uid?: string) {
  return apiPost('/api/gemini/analyze-invoice', { base64Data, mimeType, uid });
}

export async function fetchProductImage(itemName: string) {
  const data = await apiPost('/api/gemini/fetch-product-image', { itemName });
  return data.imageUrl ?? null;
}

export async function getItemSuggestions(prefix: string) {
  if (prefix.length < 2) return [];
  return apiPost('/api/gemini/item-suggestions', { prefix });
}

export async function predictExpiryDate(itemName: string, category: string) {
  return apiPost('/api/gemini/predict-expiry', { itemName, category });
}

export async function searchCheapestSource(itemName: string, location?: string, previousPurchase?: string, uid?: string) {
  const cacheKey = `price-${itemName}-${location || 'global'}`;
  const now = Date.now();
  if (searchCache[cacheKey] && now - searchCache[cacheKey].timestamp < CACHE_TTL) {
    return searchCache[cacheKey].data;
  }

  const results = await apiPost('/api/gemini/search-price', { itemName, location, previousPurchase, uid });

  if (results?.length > 0) {
    searchCache[cacheKey] = { data: results, timestamp: now };
  }
  return results;
}

export async function getTrendingRecipes(location?: string, uid?: string) {
  const cacheKey = `trending-${location || 'global'}`;
  const now = Date.now();
  if (searchCache[cacheKey] && now - searchCache[cacheKey].timestamp < TRENDING_CACHE_TTL) {
    return searchCache[cacheKey].data;
  }
  const recipes = await apiPost('/api/gemini/trending-recipes', { location, uid });
  const sanitized = sanitizeRecipeImageUrls(recipes);
  if (sanitized?.length > 0) {
    searchCache[cacheKey] = { data: sanitized, timestamp: now };
  }
  return sanitized;
}

export async function searchRecipes(query: string, uid?: string) {
  const cacheKey = `recipe-${query}`;
  const now = Date.now();
  if (searchCache[cacheKey] && now - searchCache[cacheKey].timestamp < CACHE_TTL) {
    return searchCache[cacheKey].data;
  }

  const results = await apiPost('/api/gemini/search-recipes', { query, uid });
  const sanitized = sanitizeRecipeImageUrls(results);

  if (sanitized?.length > 0) {
    searchCache[cacheKey] = { data: sanitized, timestamp: now };
  }
  return sanitized;
}
