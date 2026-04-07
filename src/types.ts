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
  preferences: string[];
  uid: string;
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
