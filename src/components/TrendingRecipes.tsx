import React, { useEffect, useState } from 'react';
import { getTrendingRecipes, searchRecipes } from '../services/geminiService';
import { GroceryItem, SavedRecipe } from '../types';
import { 
  ChefHat, 
  ExternalLink, 
  Loader2, 
  Sparkles, 
  Instagram, 
  Music, 
  Pin, 
  Youtube,
  Facebook,
  Users, 
  ShoppingCart, 
  CheckCircle2, 
  Plus,
  ArrowRight,
  Info,
  Bookmark,
  BookmarkCheck,
  Trash2,
  History,
  Search,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Ingredient {
  name: string;
  typicalQuantityPerPerson: string;
}

interface Recipe {
  title: string;
  description: string;
  source: string;
  imageUrl: string;
  link: string;
  ingredients: Ingredient[];
}

interface TrendingRecipesProps {
  inventory: GroceryItem[];
  userLocation: string | null;
  onAddToShopping: (name: string, details?: any) => void;
  defaultMembers: number;
  savedRecipes: SavedRecipe[];
  onSaveRecipe: (recipe: Omit<SavedRecipe, 'id' | 'uid' | 'createdAt'>) => void;
  onDeleteRecipe: (id: string) => void;
}

export default function TrendingRecipes({ 
  inventory, 
  userLocation, 
  onAddToShopping, 
  defaultMembers,
  savedRecipes,
  onSaveRecipe,
  onDeleteRecipe
}: TrendingRecipesProps) {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [servingSize, setServingSize] = useState(defaultMembers);
  const [view, setView] = useState<'trending' | 'saved' | 'search'>('trending');
  const [addedItems, setAddedItems] = useState<Set<string>>(new Set());
  const [refreshKey, setRefreshKey] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Recipe[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    async function fetchRecipes() {
      try {
        setIsLoading(true);
        const data = await getTrendingRecipes(userLocation || undefined);
        setRecipes(data);
      } catch (err: any) {
        console.error('Failed to fetch recipes:', err);
        setError(err.message || 'Failed to load trending recipes');
      } finally {
        setIsLoading(false);
      }
    }
    fetchRecipes();
  }, [userLocation, refreshKey]);

  const getSourceIcon = (source: string) => {
    const s = source.toLowerCase();
    if (s.includes('youtube')) return <Youtube className="w-4 h-4" />;
    if (s.includes('facebook')) return <Facebook className="w-4 h-4" />;
    if (s.includes('tiktok')) return <Music className="w-4 h-4" />;
    if (s.includes('instagram')) return <Instagram className="w-4 h-4" />;
    if (s.includes('pinterest')) return <Pin className="w-4 h-4" />;
    return <Sparkles className="w-4 h-4" />;
  };

  const checkInventory = (ingredientName: string) => {
    return inventory.find(item => 
      item.name.toLowerCase().includes(ingredientName.toLowerCase()) ||
      ingredientName.toLowerCase().includes(item.name.toLowerCase())
    );
  };

  const handleAdd = (ingName: string, servingSize: number, typicalQty: string, recipeTitle: string) => {
    onAddToShopping(ingName, { quantity: servingSize, unit: typicalQty });
    setAddedItems(prev => new Set(prev).add(`${recipeTitle}-${ingName}`));
  };

  const isRecipeSaved = (title: string) => {
    return savedRecipes.some(r => r.title === title);
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setView('search');
    setError(null);
    try {
      const results = await searchRecipes(searchQuery);
      setSearchResults(results);
    } catch (err: any) {
      console.error('Search failed:', err);
      setError(err.message || 'Failed to find recipes');
    } finally {
      setIsSearching(false);
    }
  };

  const displayRecipes = view === 'trending' ? recipes : (view === 'saved' ? savedRecipes : searchResults);

  if (isLoading && view === 'trending') {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
        <p className="text-gray-500 dark:text-gray-400 font-medium animate-pulse">Searching for trending recipes in your area...</p>
      </div>
    );
  }

  const cleanUrl = (url: string) => {
    try {
      // Fix common malformed YouTube search URLs
      if (url.includes('youtube.com/search?q=')) {
        return url.replace('youtube.com/search?q=', 'youtube.com/results?search_query=');
      }
      return url;
    } catch (e) {
      return url;
    }
  };

  return (
    <div className="space-y-8 pb-20">
      {/* Search Bar */}
      <div className="relative group">
        <form onSubmit={handleSearch} className="relative">
          <input 
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search for any recipe (e.g., 'Authentic Butter Chicken', 'Healthy Smoothie')..."
            className="w-full pl-14 pr-32 py-5 bg-white dark:bg-cred-gray/30 border-2 border-gray-100 dark:border-white/5 rounded-[2rem] text-lg font-medium focus:border-blue-500 dark:focus:border-cred-accent outline-none transition-all shadow-xl shadow-blue-500/5"
          />
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-6 h-6 text-gray-400 group-focus-within:text-blue-600 transition-colors" />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
            {searchQuery && (
              <button 
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  if (view === 'search') setView('trending');
                }}
                className="p-2 hover:bg-gray-100 dark:hover:bg-cred-gray rounded-full text-gray-400"
              >
                <X className="w-5 h-5" />
              </button>
            )}
            <button 
              type="submit"
              disabled={isSearching}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-blue-200 dark:shadow-none transition-all disabled:opacity-50"
            >
              {isSearching ? 'Searching...' : 'Search'}
            </button>
          </div>
        </form>
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-2">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-100 dark:bg-amber-900/40 rounded-xl">
            <ChefHat className="w-6 h-6 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">
                {view === 'trending' ? 'Trending Now' : 'Saved Recipes'}
              </h2>
              {view === 'trending' && (
                <button 
                  onClick={() => setRefreshKey(prev => prev + 1)}
                  className="p-1.5 hover:bg-gray-100 dark:hover:bg-cred-gray rounded-lg transition-colors text-gray-400 hover:text-blue-600"
                  title="Refresh trends"
                >
                  <History className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                </button>
              )}
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
              {view === 'trending' 
                ? (userLocation ? 'Popular in your region' : 'Global food trends')
                : `${savedRecipes.length}/5 recipes saved`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex bg-gray-100 dark:bg-cred-gray p-1 rounded-xl">
            <button
              onClick={() => setView('trending')}
              className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${
                view === 'trending' 
                  ? 'bg-white dark:bg-cred-dark text-blue-600 dark:text-cred-accent shadow-sm' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <div className="flex items-center gap-2">
                <Sparkles className="w-3 h-3" />
                Trending
              </div>
            </button>
            <button
              onClick={() => setView('saved')}
              className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${
                view === 'saved' 
                  ? 'bg-white dark:bg-cred-dark text-blue-600 dark:text-cred-accent shadow-sm' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <div className="flex items-center gap-2">
                <Bookmark className="w-3 h-3" />
                Saved
              </div>
            </button>
          </div>

          <div className="flex items-center gap-4 bg-gray-50 dark:bg-cred-gray p-2 rounded-2xl border border-gray-100 dark:border-white/5">
            <div className="flex items-center gap-2 px-3">
              <Users className="w-4 h-4 text-gray-400" />
              <span className="text-xs font-black uppercase tracking-widest text-gray-500">Servings</span>
            </div>
            <div className="flex items-center gap-1">
              <button 
                onClick={() => setServingSize(Math.max(1, servingSize - 1))}
                className="w-8 h-8 flex items-center justify-center bg-white dark:bg-cred-dark rounded-lg hover:bg-gray-100 transition-all font-bold"
              >
                -
              </button>
              <span className="w-8 text-center font-black text-lg">{servingSize}</span>
              <button 
                onClick={() => setServingSize(servingSize + 1)}
                className="w-8 h-8 flex items-center justify-center bg-white dark:bg-cred-dark rounded-lg hover:bg-gray-100 transition-all font-bold"
              >
                +
              </button>
            </div>
          </div>
        </div>
      </div>

      {error && view === 'trending' && (
        <div className="p-8 text-center cred-card border-red-100 dark:border-red-900 bg-red-50/30 dark:bg-red-950/20">
          <p className="text-red-600 dark:text-red-400 font-bold mb-4">{error}</p>
          <button onClick={() => window.location.reload()} className="cred-button-primary">Try Again</button>
        </div>
      )}

      {view === 'saved' && savedRecipes.length === 0 && (
        <div className="text-center py-20 cred-card border-2 border-dashed border-gray-100 dark:border-white/5 flex flex-col items-center justify-center gap-4">
          <div className="w-16 h-16 bg-gray-50 dark:bg-cred-gray rounded-2xl flex items-center justify-center">
            <Bookmark className="w-8 h-8 text-gray-300" />
          </div>
          <h3 className="text-lg font-bold">No saved recipes yet</h3>
          <p className="text-sm text-gray-500 max-w-xs">Save trending recipes to view them later and check your pantry stock.</p>
          <button onClick={() => setView('trending')} className="cred-button-primary">Explore Trending</button>
        </div>
      )}

      {isSearching && (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
          <p className="text-gray-500 dark:text-gray-400 font-medium animate-pulse">Gemini is searching for the best recipes...</p>
        </div>
      )}

      {view === 'search' && !isSearching && searchResults.length === 0 && !error && (
        <div className="text-center py-20 cred-card border-2 border-dashed border-gray-100 dark:border-white/5 flex flex-col items-center justify-center gap-4">
          <div className="w-16 h-16 bg-gray-50 dark:bg-cred-gray rounded-2xl flex items-center justify-center">
            <Search className="w-8 h-8 text-gray-300" />
          </div>
          <h3 className="text-lg font-bold">No results found</h3>
          <p className="text-sm text-gray-500 max-w-xs">Try searching for something else or check your spelling.</p>
        </div>
      )}

      {!isSearching && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {displayRecipes.map((recipe, index) => (
            <motion.div
              key={recipe.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="cred-card overflow-hidden flex flex-col group hover:shadow-2xl transition-all border-gray-100 dark:border-cred-gray"
            >
              <div className="relative h-56 overflow-hidden bg-gray-100 dark:bg-cred-gray flex items-center justify-center">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-amber-500/5 animate-pulse" />
                <ChefHat className="w-12 h-12 text-gray-200 dark:text-cred-gray absolute" />
                <img 
                  src={recipe.imageUrl} 
                  alt={recipe.title}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 relative z-10"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    // Use LoremFlickr with more specific keywords for better fallback relevance
                    const keywords = encodeURIComponent(`${recipe.title},cooked,food,dish`);
                    target.src = `https://loremflickr.com/800/600/${keywords}`;
                  }}
                />
                <div className="absolute top-4 left-4 px-3 py-1 bg-white/90 dark:bg-black/80 backdrop-blur-md rounded-full flex items-center gap-2 text-[10px] font-black uppercase tracking-widest shadow-lg">
                  {getSourceIcon(recipe.source)}
                  {recipe.source}
                </div>
                
                <div className="absolute top-4 right-4 flex gap-2">
                  {view === 'saved' ? (
                    <button
                      onClick={() => {
                        const saved = savedRecipes.find(r => r.title === recipe.title);
                        if (saved) onDeleteRecipe(saved.id);
                      }}
                      className="p-2 bg-red-500 text-white rounded-full shadow-lg hover:bg-red-600 transition-all"
                      title="Remove from saved"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        if (isRecipeSaved(recipe.title)) {
                          const saved = savedRecipes.find(r => r.title === recipe.title);
                          if (saved) onDeleteRecipe(saved.id);
                        } else {
                          onSaveRecipe(recipe);
                        }
                      }}
                      className={`p-2 rounded-full shadow-lg transition-all ${
                        isRecipeSaved(recipe.title) 
                          ? 'bg-blue-600 text-white hover:bg-blue-700' 
                          : 'bg-white/90 dark:bg-black/80 text-gray-600 dark:text-gray-300 hover:bg-white'
                      }`}
                    >
                      {isRecipeSaved(recipe.title) ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
                    </button>
                  )}
                </div>
              </div>
              
              <div className="p-6 flex-1 flex flex-col">
                <h3 className="text-xl font-bold mb-2 group-hover:text-blue-600 dark:group-hover:text-cred-accent transition-colors">{recipe.title}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 line-clamp-2">{recipe.description}</p>
                
                <div className="space-y-4 mb-8">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Ingredients Check</p>
                    <div className="flex items-center gap-1 text-[10px] font-bold text-blue-600 dark:text-cred-accent">
                      <Info className="w-3 h-3" />
                      <span>For {servingSize} people</span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-2">
                    {recipe.ingredients.map((ing, i) => {
                      const inInventory = checkInventory(ing.name);
                      const isAdded = addedItems.has(`${recipe.title}-${ing.name}`);
                      return (
                        <div key={i} className="flex items-center justify-between p-2 rounded-xl bg-gray-50/50 dark:bg-cred-gray/30 border border-gray-100 dark:border-white/5">
                          <div className="flex items-center gap-3">
                            <div className={`w-2 h-2 rounded-full ${inInventory ? 'bg-green-500' : 'bg-amber-500'}`} />
                            <div>
                              <p className="text-xs font-bold">{ing.name}</p>
                              <p className="text-[10px] text-gray-400">Need: {ing.typicalQuantityPerPerson} x {servingSize}</p>
                            </div>
                          </div>
                          
                          {inInventory ? (
                            <div className="flex items-center gap-1 text-green-600 dark:text-green-400 text-[10px] font-black uppercase tracking-widest">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>In Pantry</span>
                            </div>
                          ) : (
                            <button
                              onClick={() => handleAdd(ing.name, servingSize, ing.typicalQuantityPerPerson, recipe.title)}
                              disabled={isAdded}
                              className={`flex items-center gap-1 px-2 py-1 rounded-lg transition-all text-[10px] font-black uppercase tracking-widest ${
                                isAdded 
                                  ? 'bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400' 
                                  : 'bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 hover:bg-amber-200'
                              }`}
                            >
                              {isAdded ? <CheckCircle2 className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                              {isAdded ? 'Added' : 'Buy'}
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <a 
                  href={cleanUrl(recipe.link)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full cred-button-primary flex items-center justify-center gap-2 py-3 mt-auto"
                >
                  {recipe.source.toLowerCase().includes('youtube') || 
                   recipe.source.toLowerCase().includes('reels') || 
                   recipe.source.toLowerCase().includes('tiktok') 
                    ? 'Watch Video' 
                    : 'View Full Recipe'}
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
