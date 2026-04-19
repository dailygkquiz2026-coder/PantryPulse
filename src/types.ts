export interface GroceryItem {
  id: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  purchaseDate: string;
  expiryDate?: string;
  price?: number;
  usageFrequency: number; // times per day
  lastUpdated: string;
  uid: string;
  restockHistory?: { date: string; quantity: number }[];
}

export interface HouseholdInfo {
  members: number;
  adults: number;
  children: number;
  preferences: string[];
  uid: string;
  name?: string;
  address?: string;
  phone?: string;
}

export interface ShoppingListItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  category: string;
  usageFrequency: number;
  status: 'to-buy' | 'bought';
  suggestedSource?: string;
  price?: number;
  uid: string;
}

export interface SavedRecipe {
  id: string;
  title: string;
  description: string;
  source: string;
  imageUrl: string;
  link?: string;
  ingredients: {
    name: string;
    typicalQuantityPerPerson: string;
  }[];
  instructions: string[];
  prepTime?: string;
  cookTime?: string;
  difficulty?: 'Easy' | 'Medium' | 'Hard';
  tips?: string[];
  uid: string;
  createdAt: string;
}

export interface PriceComparisonResult {
  productName: string;
  storeName: string;
  price: number;
  link: string;
  quantity: string;
  productImage: string;
  sourceVerification: string;
  pricePerUnit: number;
  unit: string;
  sourceUrl?: string;
}

export interface DeletedItem extends GroceryItem {
  deletedAt: string;
}

export type UserTier = 'vanilla' | 'pro';

export interface UserProfile {
  uid: string;
  email?: string;
  weight: number;
  height: number;
  age: number;
  gender: 'male' | 'female' | 'other';
  ethnicity: string;
  shareAnonymousData: boolean;
  bmr: number;
  tdee: number;
  tier: UserTier;
  createdAt: string;
  hasSeenIntro?: boolean;
  introViewCount?: number;
}
