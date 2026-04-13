import React, { useEffect, useState } from 'react';
import { auth } from '../firebase';
import { getTrendingRecipes, searchRecipes } from '../services/geminiService';
import { GroceryItem, SavedRecipe } from '../types';
import { 
  ChefHat, 
  ExternalLink, 
  Loader2, 
  Sparkles, 
  Camera, 
  Music, 
  Pin, 
  Video,
  Share2,
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
  X,
  Clock,
  BarChart,
  Lightbulb
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
  link?: string;
  ingredients: Ingredient[];
  instructions: string[];
  prepTime?: string;
  cookTime?: string;
  difficulty?: 'Easy' | 'Medium' | 'Hard';
  tips?: string[];
}

interface TrendingRecipesProps {
  inventory: GroceryItem[];
  userLocation: string | null;
  onAddToShopping: (name: string, details?: any) => void;
  defaultMembers: number;
  savedRecipes: SavedRecipe[];
  onSaveRecipe: (recipe: Omit<SavedRecipe, 'id' | 'uid' | 'createdAt'>) => void;
  onDeleteRecipe: (id: string) => void;
  // Persisted State Props
  cachedRecipes: Recipe[];
  setCachedRecipes: (recipes: Recipe[]) => void;
  cachedSearchResults: Recipe[];
  setCachedSearchResults: (recipes: Recipe[]) => void;
  lastRecipeFetch: number;
  setLastRecipeFetch: (timestamp: number) => void;
  recipeView: 'trending' | 'saved' | 'search';
  setRecipeView: (view: 'trending' | 'saved' | 'search') => void;
  isRecipeLoading: boolean;
  setIsRecipeLoading: (isLoading: boolean) => void;
}

export default function TrendingRecipes({ 
  inventory, 
  userLocation, 
  onAddToShopping, 
  defaultMembers,
  savedRecipes,
  onSaveRecipe,
  onDeleteRecipe,
  cachedRecipes,
  setCachedRecipes,
  cachedSearchResults,
  setCachedSearchResults,
  lastRecipeFetch,
  setLastRecipeFetch,
  recipeView,
  setRecipeView,
  isRecipeLoading,
  setIsRecipeLoading
}: TrendingRecipesProps) {
  const [error, setError] = useState<string | null>(null);
  const [servingSize, setServingSize] = useState(defaultMembers);
  const [addedItems, setAddedItems] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [expandedRecipe, setExpandedRecipe] = useState<string | null>(null);

  useEffect(() => {
    async function fetchRecipes() {
      // Only fetch if we don't have cached recipes OR if lastRecipeFetch was reset to 0 (auto-refresh)
      if (cachedRecipes.length > 0 && lastRecipeFetch !== 0) {
        return;
      }

      try {
        setIsRecipeLoading(true);
        const data = await getTrendingRecipes(userLocation || undefined, auth.currentUser?.uid);
        setCachedRecipes(data);
        setLastRecipeFetch(Date.now());
      } catch (err: any) {
        console.error('Failed to fetch recipes:', err);
        setError(err.message || 'Failed to load trending recipes');
      } finally {
        setIsRecipeLoading(false);
      }
    }
    fetchRecipes();
  }, [userLocation, lastRecipeFetch]); // lastRecipeFetch reset to 0 triggers re-fetch

  const handleRefresh = () => {
    setLastRecipeFetch(0);
  };

  const getSourceIcon = (source: string) => {
    const s = source.toLowerCase();
    if (s.includes('youtube')) return <Video className="w-4 h-4" />;
    if (s.includes('facebook')) return <Share2 className="w-4 h-4" />;
    if (s.includes('tiktok')) return <Music className="w-4 h-4" />;
    if (s.includes('instagram')) return <Camera className="w-4 h-4" />;
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
    // User requested to keep quantity/unit blank/default so they can edit it in shopping list
    // Recipe quantities like '1 cup' are not standard for shopping
    onAddToShopping(ingName, { quantity: 1, unit: 'pcs' });
    setAddedItems(prev => new Set(prev).add(`${recipeTitle}-${ingName}`));
  };

  const isRecipeSaved = (title: string) => {
    return savedRecipes.some(r => r.title === title);
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setRecipeView('search');
    setError(null);
    try {
      const results = await searchRecipes(searchQuery, auth.currentUser?.uid);
      setCachedSearchResults(results);
    } catch (err: any) {
      console.error('Search failed:', err);
      let message = err.message || 'Failed to find recipes';
      if (err.message?.includes('RESOURCE_EXHAUSTED')) {
        message = "AI Search quota exceeded. Google Search grounding is currently unavailable. Please try again in a few minutes.";
      }
      setError(message);
    } finally {
      setIsSearching(false);
    }
  };

  const displayRecipes = recipeView === 'trending' ? cachedRecipes : (recipeView === 'saved' ? savedRecipes : cachedSearchResults);

  if (isRecipeLoading && cachedRecipes.length === 0) {
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
            placeholder="Search recipes..."
            className="cred-input pl-14 pr-32 text-lg"
          />
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-6 h-6 text-gray-500 group-focus-within:text-cred-primary transition-colors" />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
            {searchQuery && (
              <button 
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  if (recipeView === 'search') setRecipeView('trending');
                }}
                className="p-2 hover:bg-white/5 rounded-full text-gray-500"
              >
                <X className="w-5 h-5" />
              </button>
            )}
            <button 
              type="submit"
              disabled={isSearching}
              className="cred-button-primary"
            >
              {isSearching ? '...' : 'Search'}
            </button>
          </div>
        </form>
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-2">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-white/5 rounded-2xl">
            <ChefHat className="w-6 h-6 text-cred-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-black text-white tracking-tight">
                {recipeView === 'trending' ? 'Trending' : (recipeView === 'saved' ? 'Saved' : 'Results')}
              </h2>
              {recipeView === 'trending' && (
                <button 
                  onClick={handleRefresh}
                  className="p-1.5 hover:bg-white/5 rounded-lg transition-colors text-gray-500 hover:text-white"
                  title="Refresh"
                >
                  <History className={`w-4 h-4 ${isRecipeLoading ? 'animate-spin' : ''}`} />
                </button>
              )}
            </div>
            <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">
              {recipeView === 'trending' 
                ? (userLocation ? 'Popular nearby' : 'Global trends')
                : (recipeView === 'saved' ? `${savedRecipes.length} saved` : `Found ${cachedSearchResults.length}`)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex bg-white/5 p-1 rounded-2xl border border-white/5">
            <button
              onClick={() => setRecipeView('trending')}
              className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                recipeView === 'trending' 
                  ? 'bg-white text-black shadow-lg' 
                  : 'text-gray-500 hover:text-white'
              }`}
            >
              Trending
            </button>
            <button
              onClick={() => setRecipeView('saved')}
              className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                recipeView === 'saved' 
                  ? 'bg-white text-black shadow-lg' 
                  : 'text-gray-500 hover:text-white'
              }`}
            >
              Saved
            </button>
          </div>

          <div className="flex items-center gap-3 bg-white/5 p-2 rounded-2xl border border-white/5">
            <Users className="w-4 h-4 text-gray-500 ml-2" />
            <div className="flex items-center gap-1">
              <button 
                onClick={() => setServingSize(Math.max(1, servingSize - 1))}
                className="w-8 h-8 flex items-center justify-center bg-white/5 rounded-xl hover:bg-white/10 transition-all font-bold"
              >
                -
              </button>
              <span className="w-6 text-center font-black text-sm">{servingSize}</span>
              <button 
                onClick={() => setServingSize(servingSize + 1)}
                className="w-8 h-8 flex items-center justify-center bg-white/5 rounded-xl hover:bg-white/10 transition-all font-bold"
              >
                +
              </button>
            </div>
          </div>
        </div>
      </div>

      {error && recipeView === 'trending' && (
        <div className="p-8 text-center cred-card border-red-100 dark:border-red-900 bg-red-50/30 dark:bg-red-950/20">
          <p className="text-red-600 dark:text-red-400 font-bold mb-4">{error}</p>
          <button onClick={() => handleRefresh()} className="cred-button-primary">Try Again</button>
        </div>
      )}

      {recipeView === 'saved' && savedRecipes.length === 0 && (
        <div className="text-center py-20 cred-card border-2 border-dashed border-gray-100 dark:border-white/5 flex flex-col items-center justify-center gap-4">
          <div className="w-16 h-16 bg-gray-50 dark:bg-cred-gray rounded-2xl flex items-center justify-center">
            <Bookmark className="w-8 h-8 text-gray-300" />
          </div>
          <h3 className="text-lg font-bold">No saved recipes yet</h3>
          <p className="text-sm text-gray-500 max-w-xs">Save trending recipes to view them later and check your pantry stock.</p>
          <button onClick={() => setRecipeView('trending')} className="cred-button-primary">Explore Trending</button>
        </div>
      )}

      {isSearching && (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
          <p className="text-gray-500 dark:text-gray-400 font-medium animate-pulse">Gemini is searching for the best recipes...</p>
        </div>
      )}

      {recipeView === 'search' && !isSearching && cachedSearchResults.length === 0 && !error && (
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
              className="cred-card overflow-hidden flex flex-col group transition-all border-white/5 hover:border-white/10 bg-white/[0.02]"
            >
              <div className="p-6 border-b border-white/5 bg-white/5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-cred-accent/10 rounded-xl text-cred-accent">
                    {getSourceIcon(recipe.source)}
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Source</p>
                    <p className="text-xs font-bold text-white">{recipe.source}</p>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  {recipeView === 'saved' ? (
                    <button
                      onClick={() => onDeleteRecipe((recipe as SavedRecipe).id)}
                      className="p-2.5 bg-cred-primary/10 text-cred-primary rounded-xl hover:bg-cred-primary/20 transition-all"
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
                      className={`p-2.5 rounded-xl transition-all ${
                        isRecipeSaved(recipe.title) 
                          ? 'bg-cred-accent text-white shadow-lg shadow-cred-accent/20' 
                          : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
                      }`}
                    >
                      {isRecipeSaved(recipe.title) ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
                    </button>
                  )}
                </div>
              </div>
              
              <div className="p-6 flex-1 flex flex-col">
                <h3 className="text-xl font-black tracking-tight text-white mb-2 group-hover:text-cred-accent transition-colors">{recipe.title}</h3>
                <p className="text-sm text-gray-500 font-medium mb-6 line-clamp-2 leading-relaxed">{recipe.description}</p>
                  
                  {/* Quick Info Bar */}
                  <div className="flex items-center gap-4 mb-6 p-4 bg-white/5 rounded-[1.5rem] border border-white/5">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-cred-accent" />
                      <span className="text-[10px] font-black text-white uppercase tracking-widest">
                        {recipe.prepTime || '15m'} Prep
                      </span>
                    </div>
                    <div className="w-1 h-1 rounded-full bg-white/10" />
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-amber-500" />
                      <span className="text-[10px] font-black text-white uppercase tracking-widest">
                        {recipe.cookTime || '30m'} Cook
                      </span>
                    </div>
                    <div className="w-1 h-1 rounded-full bg-white/10" />
                    <div className="flex items-center gap-1.5">
                      <BarChart className="w-3.5 h-3.5 text-emerald-500" />
                      <span className="text-[10px] font-black text-white uppercase tracking-widest">
                        {recipe.difficulty || 'Easy'}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-4 mb-8">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Ingredients Check</p>
                      <div className="flex items-center gap-1 text-[10px] font-black text-cred-accent uppercase tracking-widest">
                        <Info className="w-3 h-3" />
                        <span>For {servingSize} people</span>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 gap-2">
                      {recipe.ingredients.map((ing, i) => {
                        const inInventory = checkInventory(ing.name);
                        const isAdded = addedItems.has(`${recipe.title}-${ing.name}`);
                        return (
                          <div key={i} className="flex items-center justify-between p-3 rounded-2xl bg-white/5 border border-white/5">
                            <div className="flex items-center gap-3">
                              <div className={`w-2 h-2 rounded-full ${inInventory ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]' : 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.4)]'}`} />
                              <div>
                                <p className="text-xs font-black text-white">{ing.name}</p>
                                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Need: {ing.typicalQuantityPerPerson} x {servingSize}</p>
                              </div>
                            </div>
                            
                            {inInventory ? (
                              <div className="flex items-center gap-1 text-emerald-400 text-[8px] font-black uppercase tracking-widest">
                                <CheckCircle2 className="w-3 h-3" />
                                <span>In Pantry</span>
                              </div>
                            ) : (
                              <button
                                onClick={() => handleAdd(ing.name, servingSize, ing.typicalQuantityPerPerson, recipe.title)}
                                disabled={isAdded}
                                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg transition-all text-[8px] font-black uppercase tracking-widest ${
                                  isAdded 
                                    ? 'bg-emerald-500/10 text-emerald-400' 
                                    : 'bg-cred-primary/10 text-cred-primary hover:bg-cred-primary/20'
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

                {recipe.instructions && recipe.instructions.length > 0 && (
                  <div className="mb-6">
                    <button 
                      onClick={() => setExpandedRecipe(expandedRecipe === recipe.title ? null : recipe.title)}
                      className="flex items-center justify-between w-full p-4 bg-white/5 rounded-2xl hover:bg-white/10 transition-all border border-white/5"
                    >
                      <span className="text-[10px] font-black uppercase tracking-widest text-white">Cooking Steps</span>
                      <ArrowRight className={`w-4 h-4 text-gray-500 transition-transform ${expandedRecipe === recipe.title ? 'rotate-90' : ''}`} />
                    </button>
                    
                    <AnimatePresence>
                      {expandedRecipe === recipe.title && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="pt-4 space-y-4">
                            {recipe.instructions.map((step, i) => (
                              <div key={i} className="flex gap-4 p-4 bg-white/[0.02] rounded-2xl border border-white/5">
                                <span className="flex-shrink-0 w-6 h-6 bg-cred-accent/10 text-cred-accent rounded-lg flex items-center justify-center text-[10px] font-black">
                                  {i + 1}
                                </span>
                                <p className="text-xs text-gray-400 font-medium leading-relaxed">{step}</p>
                              </div>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}

                {recipe.tips && recipe.tips.length > 0 && (
                  <div className="mb-8 p-5 bg-cred-accent/5 rounded-[1.5rem] border border-cred-accent/10">
                    <div className="flex items-center gap-2 mb-4">
                      <Lightbulb className="w-4 h-4 text-amber-500" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-cred-accent">Pro Tips</span>
                    </div>
                    <ul className="space-y-3">
                      {recipe.tips.map((tip, i) => (
                        <li key={i} className="text-[11px] text-gray-400 font-medium leading-relaxed flex gap-3">
                          <span className="text-cred-accent shrink-0">•</span>
                          {tip}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
