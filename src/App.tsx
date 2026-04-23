/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, Component, ErrorInfo, ReactNode } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LayoutDashboard, 
  PlusCircle, 
  ShoppingBag, 
  Settings, 
  Search, 
  TrendingUp,
  ChefHat,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Users,
  LogIn,
  LogOut,
  Camera,
  X,
  Zap,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Trash,
  ShieldAlert,
  Info,
  Activity
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut,
  User
} from 'firebase/auth';
import { 
  collection, 
  onSnapshot, 
  query, 
  where, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  setDoc,
  getDocFromServer,
  orderBy
} from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType, messaging } from './firebase';
import { getToken } from 'firebase/messaging';
import GroceryForm from './components/GroceryForm';
import InventoryList from './components/InventoryList';
import ShoppingList from './components/ShoppingList';
import HouseholdSettings from './components/HouseholdSettings';
import PriceComparison from './components/PriceComparison';
import TrendingRecipes from './components/TrendingRecipes';
import MarketingIntro from './components/MarketingIntro';
import AdminDashboard from './components/AdminDashboard';
import StockoutConfirmationModal from './components/StockoutConfirmationModal';
import RestockModal from './components/RestockModal';
import UpdateQuantityModal from './components/UpdateQuantityModal';
import EditItemModal from './components/EditItemModal';
import ExpiringItemsModal from './components/ExpiringItemsModal';
import CalorieTracker from './components/CalorieTracker';
import UpgradeModal from './components/UpgradeModal';
import ProBadge from './components/ProBadge';
import { GroceryItem, HouseholdInfo, ShoppingListItem, SavedRecipe, PriceComparisonResult, DeletedItem, UserProfile } from './types';
import { predictMultipleRestocks, searchCheapestSource } from './services/geminiService';

// Error Boundary Component
class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean, error: Error | null }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      let message = "Something went wrong.";
      try {
        const parsed = JSON.parse(this.state.error?.message || "{}");
        if (parsed.error) message = `Firestore Error: ${parsed.error}`;
      } catch (e) {
        message = this.state.error?.message || message;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-white dark:bg-cred-black p-6">
          <div className="cred-card p-8 max-w-md w-full text-center">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 text-red-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-black mb-2">Oops!</h2>
            <p className="text-gray-500 dark:text-gray-400 mb-8">{message}</p>
            <button
              onClick={() => window.location.reload()}
              className="cred-button-primary w-full"
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

function AppContent() {
  const [activeTab, setActiveTab] = useState<'pantry' | 'shop' | 'cook' | 'health' | 'settings' | 'dev'>(() => {
    const saved = localStorage.getItem('activeTab');
    return (saved as any) || 'pantry';
  });
  
  useEffect(() => {
    localStorage.setItem('activeTab', activeTab);
  }, [activeTab]);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSettingsMenuOpen, setIsSettingsMenuOpen] = useState(false);
  const [inventory, setInventory] = useState<GroceryItem[]>([]);
  const [shoppingList, setShoppingList] = useState<ShoppingListItem[]>([]);
  const [household, setHousehold] = useState<HouseholdInfo>({ members: 2, adults: 2, children: 0, preferences: [], uid: '' });
  const [isPriceModalOpen, setIsPriceModalOpen] = useState(false);
  const [searchItem, setSearchItem] = useState('');
  const [searchResults, setSearchResults] = useState<PriceComparisonResult[] | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [predictions, setPredictions] = useState<Record<string, number>>({});
  const [notifiedItems, setNotifiedItems] = useState<Set<string>>(new Set());
  const [hasChanges, setHasChanges] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [savedRecipes, setSavedRecipes] = useState<SavedRecipe[]>([]);
  const [deletedItems, setDeletedItems] = useState<DeletedItem[]>([]);
  const [isBinOpen, setIsBinOpen] = useState(false);
  const [isMarketingOpen, setIsMarketingOpen] = useState(false);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [userLocation, setUserLocation] = useState<string | null>(null);
  
  // Registering initial view
  useEffect(() => {
    if (isAuthReady) {
      setIsMarketingOpen(true);
    }
  }, [isAuthReady]);

  const handleCloseMarketing = () => {
    setIsMarketingOpen(false);
  };
  const [cachedRecipes, setCachedRecipes] = useState<any[]>([]);
  const [cachedSearchResults, setCachedSearchResults] = useState<any[]>([]);
  const [lastRecipeFetch, setLastRecipeFetch] = useState<number>(0);
  const [recipeView, setRecipeView] = useState<'trending' | 'saved' | 'search'>(() => {
    const saved = localStorage.getItem('recipeView');
    return (saved as any) || 'trending';
  });
  const [isRecipeLoading, setIsRecipeLoading] = useState(false);
  const [inventoryFilter, setInventoryFilter] = useState<'all' | 'low-stock'>(() => {
    const saved = localStorage.getItem('inventoryFilter');
    return (saved as any) || 'all';
  });

  useEffect(() => {
    localStorage.setItem('recipeView', recipeView);
  }, [recipeView]);

  useEffect(() => {
    localStorage.setItem('inventoryFilter', inventoryFilter);
  }, [inventoryFilter]);

  const lowStockItems = inventory.filter(item => {
    const days = predictions[item.id];
    return days !== undefined && days <= 3;
  });

  const filteredInventory = inventoryFilter === 'low-stock' ? lowStockItems : inventory;

  // Notification Logic for Low Stock
  useEffect(() => {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;

    const itemsToNotify = inventory.filter(item => {
      const days = predictions[item.id];
      // Notify if 1 day left or out of stock, and not notified yet
      return days !== undefined && days <= 1 && !notifiedItems.has(item.id);
    });

    if (itemsToNotify.length > 0) {
      const itemNames = itemsToNotify.map(i => i.name).join(', ');
      new Notification("Low Stock Alert", {
        body: `The following items are running out: ${itemNames}. Consider restocking soon!`,
        icon: "/favicon.ico"
      });

      setNotifiedItems(prev => {
        const next = new Set(prev);
        itemsToNotify.forEach(i => next.add(i.id));
        return next;
      });
    }
  }, [inventory, predictions, notifiedItems]);

  // New Modal States
  const [isRestockModalOpen, setIsRestockModalOpen] = useState(false);
  const [restockItem, setRestockItem] = useState<ShoppingListItem | null>(null);
  const [isUpdateQuantityModalOpen, setIsUpdateQuantityModalOpen] = useState(false);
  const [itemToUpdate, setItemToUpdate] = useState<GroceryItem | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [itemToEdit, setItemToEdit] = useState<GroceryItem | null>(null);
  const [isTroubleshootingOpen, setIsTroubleshootingOpen] = useState(false);
  const [isExpiryModalOpen, setIsExpiryModalOpen] = useState(false);
  const [isStockoutModalOpen, setIsStockoutModalOpen] = useState(false);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [stockoutItems, setStockoutItems] = useState<GroceryItem[]>([]);
  const [lastShoppingActivity, setLastShoppingActivity] = useState(Date.now());
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>(
    (typeof window !== 'undefined' && 'Notification' in window) ? Notification.permission : 'default'
  );
  
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  // Push Notification Logic
  const requestNotificationPermission = async () => {
    if (!user || !messaging || !('Notification' in window)) return;
    
    try {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      
      if (permission === 'granted') {
        // Get FCM Token
        // Note: User needs to provide their own VAPID key from Firebase Console
        // For now, we attempt to get it. If it fails, we log it.
        const token = await getToken(messaging, {
          vapidKey: 'BIXKRElY3xay1BnpkP5PmLJGZawnVcbNmgDWu6jUJGVqcPC-Oh92yZYyaxNAR2XY8YgnUjChBDgdePIngQMVozg'
        }).catch(err => {
          console.warn("FCM Token generation failed. This usually requires a valid VAPID key from Firebase Console.", err);
          return null;
        });

        if (token) {
          console.log("FCM Token acquired:", token);
          await setDoc(doc(db, 'fcmTokens', token), {
            uid: user.uid,
            updatedAt: new Date().toISOString(),
            platform: 'web'
          });
        }
      }
    } catch (error) {
      console.error("Error requesting notification permission:", error);
    }
  };

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setIsAuthReady(true);
      
      if (currentUser) {
        // Log activity for DAU tracking
        try {
          const today = new Date().toISOString().split('T')[0];
          const activityId = `${currentUser.uid}_${today}`;
          await setDoc(doc(db, 'userActivityLogs', activityId), {
            uid: currentUser.uid,
            email: currentUser.email,
            date: today,
            timestamp: new Date().toISOString(),
            location: userLocation // If available
          }, { merge: true });

          // Initialize profile if missing
          const profileRef = doc(db, 'userProfiles', currentUser.uid);
          const profileSnap = await getDocFromServer(profileRef).catch(() => null);
          if (!profileSnap?.exists()) {
            const initialProfile: UserProfile = {
              uid: currentUser.uid,
              email: currentUser.email || undefined,
              createdAt: new Date().toISOString(),
              shareAnonymousData: false,
              weight: 0,
              height: 0,
              age: 0,
              gender: 'male',
              ethnicity: 'Unknown',
              bmr: 0,
              tdee: 2000,
              tier: 'vanilla'
            };
            await setDoc(profileRef, initialProfile);
            setUserProfile(initialProfile);
          } else {
            setUserProfile(profileSnap.data() as UserProfile);
          }
        } catch (error) {
          console.error("Failed to log activity or init profile:", error);
        }
      }
    });
    return () => unsubscribe();
  }, [userLocation]);

  useEffect(() => {
    if (user && isAuthReady) {
      requestNotificationPermission();
    }
  }, [user, isAuthReady]);

  // Location Listener
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setUserLocation(`${latitude}, ${longitude}`);
        },
        (error) => {
          console.error("Error getting location:", error);
        }
      );
    }
  }, []);

  // Connection Test
  useEffect(() => {
    async function testConnection() {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if (error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration. The client is offline.");
        }
      }
    }
    testConnection();
  }, []);

  // Real-time Inventory
  useEffect(() => {
    if (!user || !isAuthReady) return;
    const q = query(collection(db, 'inventory'), where('uid', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as GroceryItem));
      setInventory(items);
    }, (error) => handleFirestoreError(error, OperationType.GET, 'inventory'));
    return () => unsubscribe();
  }, [user, isAuthReady]);

  // Real-time Saved Recipes
  useEffect(() => {
    if (!user || !isAuthReady) return;
    const q = query(collection(db, 'savedRecipes'), where('uid', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as SavedRecipe));
      setSavedRecipes(items);
    }, (error) => handleFirestoreError(error, OperationType.GET, 'savedRecipes'));
    return () => unsubscribe();
  }, [user, isAuthReady]);

  // Real-time Shopping List
  useEffect(() => {
    if (!user || !isAuthReady) return;
    const q = query(collection(db, 'shoppingList'), where('uid', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as ShoppingListItem));
      setShoppingList(items);
    }, (error) => handleFirestoreError(error, OperationType.GET, 'shoppingList'));
    return () => unsubscribe();
  }, [user, isAuthReady]);

  // Real-time Deleted Items
  useEffect(() => {
    if (!user || !isAuthReady) return;
    const q = query(
      collection(db, 'deletedItems'), 
      where('uid', '==', user.uid),
      orderBy('deletedAt', 'desc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as DeletedItem));
      setDeletedItems(items);
    }, (error) => handleFirestoreError(error, OperationType.GET, 'deletedItems'));
    return () => unsubscribe();
  }, [user, isAuthReady]);

  // Real-time Household
  useEffect(() => {
    if (!user || !isAuthReady) return;
    const unsubscribe = onSnapshot(doc(db, 'userProfiles', user.uid), (snapshot) => {
      if (snapshot.exists()) {
        setUserProfile(snapshot.data() as UserProfile);
      }
    }, (error) => handleFirestoreError(error, OperationType.GET, `userProfiles/${user.uid}`));
    return () => unsubscribe();
  }, [user, isAuthReady]);

  // Real-time Household
  useEffect(() => {
    if (!user || !isAuthReady) return;
    const unsubscribe = onSnapshot(doc(db, 'households', user.uid), (snapshot) => {
      if (snapshot.exists()) {
        setHousehold(snapshot.data() as HouseholdInfo);
      } else {
        // Initialize household for new user
        const initialHousehold: HouseholdInfo = { members: 2, adults: 2, children: 0, preferences: [], uid: user.uid };
        setDoc(doc(db, 'households', user.uid), initialHousehold)
          .catch(err => handleFirestoreError(err, OperationType.WRITE, `households/${user.uid}`));
      }
    }, (error) => handleFirestoreError(error, OperationType.GET, `households/${user.uid}`));
    return () => unsubscribe();
  }, [user, isAuthReady]);

  // Auto-refresh recipes every 1 hour
  useEffect(() => {
    const ONE_HOUR = 60 * 60 * 1000;
    const checkRefresh = () => {
      const now = Date.now();
      if (now - lastRecipeFetch > ONE_HOUR && lastRecipeFetch !== 0) {
        console.log("Auto-refreshing recipes (1 hour passed)");
        setLastRecipeFetch(0); 
      }
    };

    const interval = setInterval(checkRefresh, 60000); 
    return () => clearInterval(interval);
  }, [lastRecipeFetch]);

  // Run predictions
  const [lastPredictionRun, setLastPredictionRun] = useState(0);

  const runPredictionsManually = () => {
    setPredictions({}); // Force refresh
    setNotifiedItems(new Set()); // Allow re-notifying if fixed
    setLastPredictionRun(Date.now());
  };

  useEffect(() => {
    const runPredictions = async () => {
      if (inventory.length === 0) {
        setPredictions({});
        return;
      }

      const newPredictions: Record<string, number> = {};
      const now = Date.now();
      
      // Local fallback calculation
      inventory.forEach(item => {
        const qty = Number(item.quantity) || 0;
        const usage = Number(item.usageFrequency) || 0;
        const adults = Number(household.adults) || (Number(household.members) || 2);
        const children = Number(household.children) || 0;
        const effectiveMembers = adults + (children * 0.5);
        const dailyUsage = usage * effectiveMembers;
        
        // Calculate days passed since last update
        const lastUpdated = new Date(item.lastUpdated || item.purchaseDate).getTime();
        const daysPassed = (now - lastUpdated) / (1000 * 60 * 60 * 24);
        
        let localPrediction = 30;
        let multiplier = 1;

        if (['pcs', 'bottle', 'pack', 'packet', 'box', 'can', 'jar'].includes(item.unit.toLowerCase())) {
          // Assume these standard packaging formats contain an average of 15-30 uses 
          multiplier = 20; 
        } else if (['kg', 'l'].includes(item.unit.toLowerCase()) && item.category !== 'Produce') {
          // A kg of rice or a Liter of milk has multiple servings
          multiplier = 5;
        }

        if (dailyUsage > 0) {
          // Total days it would last - days already passed
          localPrediction = ((qty * multiplier) / dailyUsage) - daysPassed;

          // CATEGORY-SPECIFIC CAP: Bread/Dairy/Produce usually don't last > 4-7 days total
          if (['Bakery', 'Produce', 'Dairy'].includes(item.category || '')) {
            const maxLifespan = (item.category === 'Bakery') ? 5 : 7;
            localPrediction = Math.min(localPrediction, maxLifespan - daysPassed);
          }
        }

        newPredictions[item.id] = Math.max(-10, Math.ceil(localPrediction));
      });

      // AI refinement
      try {
        const aiPredictions = await predictMultipleRestocks(
          inventory.map(i => ({
            id: i.id,
            name: i.name,
            quantity: i.quantity,
            unit: i.unit,
            usageFrequency: i.usageFrequency,
            lastUpdated: i.lastUpdated || i.purchaseDate,
            restockHistory: i.restockHistory
          })),
          household.adults || 2,
          household.children || 0,
          user?.uid
        );
        
        Object.entries(aiPredictions).forEach(([id, days]) => {
          if (typeof days === 'number' && !isNaN(days)) {
            newPredictions[id] = Math.max(-10, Math.ceil(days));
          }
        });
      } catch (error) {
        console.warn("AI Prediction failed, using local fallback:", error);
      }
      
      setPredictions(newPredictions);

      // Check for new stockouts to show modal
      const potentialStockouts = inventory.filter(item => {
        const days = newPredictions[item.id];
        
        // Calculate hours since the item was last added/updated
        const updateTime = Math.max(
          new Date(item.lastUpdated || item.purchaseDate).getTime(),
          new Date(item.purchaseDate).getTime()
        );
        const hoursSinceUpdate = (new Date().getTime() - updateTime) / (1000 * 60 * 60);

        // Smarter trigger: Only warn if it's been in the pantry for >24h (so we don't annoy users who just added it)
        // OR the quantity is actually zero. Warn if it predicts it will be out in <= 2 days
        if (days !== undefined && days <= 2 && (hoursSinceUpdate > 24 || item.quantity <= 0)) {
          // Check if already in shopping list to avoid duplicates
          const inShoppingList = shoppingList.some(si => si.name.toLowerCase() === item.name.toLowerCase());
          // Check if we already asked about this item in this session
          const alreadyAsked = notifiedItems.has(`stockout-${item.id}`);
          return !inShoppingList && !alreadyAsked;
        }
        return false;
      });

      if (potentialStockouts.length > 0) {
        setStockoutItems(potentialStockouts);
        setIsStockoutModalOpen(true);
        
        // Mark as notified so we don't show it again immediately
        setNotifiedItems(prev => {
          const next = new Set(prev);
          potentialStockouts.forEach(i => next.add(`stockout-${i.id}`));
          return next;
        });
      }
    };

    if (inventory.length > 0) {
      // Debounce predictions to avoid rapid API calls during multiple inventory updates
      const timer = setTimeout(() => {
        runPredictions();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [inventory, household, shoppingList, notifiedItems, lastPredictionRun]);

  // Expiry Warning Logic
  useEffect(() => {
    if (inventory.length === 0 || !isAuthReady) return;

    const today = new Date().toDateString();
    const lastShown = localStorage.getItem('lastExpiryWarningShown');

    if (lastShown !== today) {
      const expiring = inventory.filter(item => {
        if (!item.expiryDate) return false;
        const expiryDate = new Date(item.expiryDate);
        const diff = (expiryDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24);
        return diff >= 0 && diff < 3;
      });

      const expired = inventory.filter(item => {
        if (!item.expiryDate) return false;
        const expiryDate = new Date(item.expiryDate);
        return expiryDate.getTime() < new Date().getTime();
      });

      if (expiring.length > 0 || expired.length > 0) {
        setIsExpiryModalOpen(true);
        localStorage.setItem('lastExpiryWarningShown', today);
      }
    }
  }, [inventory, isAuthReady]);

  // Cleanup old deleted items (older than 2 days)
  useEffect(() => {
    if (!user || deletedItems.length === 0) return;
    
    const cleanup = async () => {
      const now = new Date().getTime();
      const twoDaysInMs = 2 * 24 * 60 * 60 * 1000;
      
      const itemsToDelete = deletedItems.filter(item => {
        const deletedAt = new Date(item.deletedAt).getTime();
        return now - deletedAt > twoDaysInMs;
      });
      
      if (itemsToDelete.length > 0) {
        console.log(`Cleaning up ${itemsToDelete.length} old deleted items`);
        const batch = itemsToDelete.map(item => deleteDoc(doc(db, 'deletedItems', item.id)));
        await Promise.all(batch);
      }
    };
    
    const timer = setTimeout(cleanup, 5000); // Run cleanup 5 seconds after load
    return () => clearTimeout(timer);
  }, [deletedItems, user]);

  const [loginError, setLoginError] = useState<string | null>(null);

  const handleLogin = async () => {
    setLoginError(null);
    try {
      const provider = new GoogleAuthProvider();
      // Set custom parameters to force account selection if needed
      provider.setCustomParameters({ prompt: 'select_account' });
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      console.error("Login failed", error);
      if (error.code === 'auth/unauthorized-domain') {
        setLoginError("This domain is not authorized in Firebase. Please add your Vercel URL to 'Authorized Domains' in the Firebase Console.");
      } else if (error.code === 'auth/popup-closed-by-user') {
        setLoginError("Login popup was closed before completion.");
      } else if (error.code === 'auth/cancelled-popup-request') {
        // Ignore this one, it happens when multiple clicks occur
      } else {
        setLoginError(error.message || "An unexpected error occurred during login.");
      }
    }
  };

  const handleLogout = () => signOut(auth);

  const handleRefresh = () => {
    window.location.reload();
  };

  const handleAddGrocery = async (item: Omit<GroceryItem, 'id'>) => {
    if (!user) {
      console.error("No user found in handleAddGrocery");
      return;
    }
    try {
      console.log("Adding grocery item:", item);
      await addDoc(collection(db, 'inventory'), { ...item, uid: user.uid });
      console.log("Successfully added item to inventory");
      setHasChanges(true);
      setIsAddModalOpen(false);
      setActiveTab('pantry');
      showToast(`${item.name} added to pantry`);
    } catch (error) {
      console.error("Error in handleAddGrocery:", error);
      handleFirestoreError(error, OperationType.CREATE, 'inventory');
    }
  };

  const handleAddMultipleGrocery = async (items: any[]) => {
    if (!user) return;
    try {
      const batch = items.map(item => 
        addDoc(collection(db, 'inventory'), { ...item, uid: user.uid })
      );
      await Promise.all(batch);
      setHasChanges(true);
      setIsAddModalOpen(false);
      setActiveTab('pantry');
      showToast(`${items.length} items added to pantry`);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'inventory');
    }
  };

  const handleDeleteGrocery = async (id: string) => {
    if (!user) return;
    const item = inventory.find(i => i.id === id);
    try {
      if (item) {
        // Add to deleted items bin
        await addDoc(collection(db, 'deletedItems'), {
          ...item,
          deletedAt: new Date().toISOString(),
          uid: user.uid
        });
      }
      await deleteDoc(doc(db, 'inventory', id));
      setHasChanges(true);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `inventory/${id}`);
    }
  };

  const handleRestoreGrocery = async (item: DeletedItem) => {
    if (!user) return;
    try {
      const { id, deletedAt, ...groceryData } = item;
      await addDoc(collection(db, 'inventory'), {
        ...groceryData,
        uid: user.uid,
        lastUpdated: new Date().toISOString()
      });
      await deleteDoc(doc(db, 'deletedItems', id));
      setHasChanges(true);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'inventory');
    }
  };

  const handlePermanentDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'deletedItems', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `deletedItems/${id}`);
    }
  };

  const handleAddShoppingItem = async (name: string, details?: Partial<GroceryItem>, preventTabSwitch = false) => {
    if (!user) return;
    
    // Check if the item already exists in the "to-buy" shopping list
    const existingItem = shoppingList.find(i => i.name.toLowerCase() === name.toLowerCase() && i.status === 'to-buy');
    if (existingItem) {
      const confirmAdd = window.confirm(`You already have "${name}" in your shopping list. Do you want to add it again?`);
      if (!confirmAdd) {
        if (!preventTabSwitch) {
          setActiveTab('shop');
        }
        return; // User canceled adding the duplicate
      }
    }

    setLastShoppingActivity(Date.now());
    try {
      await addDoc(collection(db, 'shoppingList'), {
        name,
        quantity: details?.quantity || 1,
        unit: details?.unit || 'pcs',
        category: details?.category || 'Other',
        usageFrequency: details?.usageFrequency || 1,
        status: 'to-buy',
        uid: user.uid
      });

      // If moved from inventory, delete it from inventory (which adds to bin)
      if (details?.id) {
        await handleDeleteGrocery(details.id);
      }

      setHasChanges(true);
      if (!preventTabSwitch) {
        setActiveTab('shop');
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'shoppingList');
    }
  };

  const handleSaveRecipe = async (recipe: Omit<SavedRecipe, 'id' | 'uid' | 'createdAt'>) => {
    if (!user) {
      console.warn("Cannot save recipe: No user authenticated");
      return;
    }
    if (savedRecipes.length >= 5) {
      alert("You can only save up to 5 recipes. Please delete one to save a new one.");
      return;
    }
    try {
      console.log("Saving recipe:", recipe.title);
      await addDoc(collection(db, 'savedRecipes'), {
        ...recipe,
        uid: user.uid,
        createdAt: new Date().toISOString()
      });
      console.log("Recipe saved successfully");
    } catch (error) {
      console.error("Error saving recipe:", error);
      handleFirestoreError(error, OperationType.CREATE, 'savedRecipes');
    }
  };

  const handleDeleteRecipe = async (id: string) => {
    if (!id) {
      console.warn("Cannot delete recipe: No ID provided");
      return;
    }
    try {
      console.log("Deleting recipe with ID:", id);
      await deleteDoc(doc(db, 'savedRecipes', id));
      console.log("Recipe deleted successfully");
    } catch (error) {
      console.error("Error deleting recipe:", error);
      handleFirestoreError(error, OperationType.DELETE, `savedRecipes/${id}`);
    }
  };

  const handleDeleteShoppingItem = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'shoppingList', id));
      setHasChanges(true);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `shoppingList/${id}`);
    }
  };

  const handleUpdateShoppingItem = async (id: string, updates: Partial<ShoppingListItem>) => {
    try {
      await updateDoc(doc(db, 'shoppingList', id), updates);
      setHasChanges(true);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `shoppingList/${id}`);
    }
  };

  const handleToggleShoppingStatus = async (id: string) => {
    const item = shoppingList.find(i => i.id === id);
    if (!item) return;
    const newStatus = item.status === 'to-buy' ? 'bought' : 'to-buy';
    try {
      await updateDoc(doc(db, 'shoppingList', id), {
        status: newStatus
      });
      setHasChanges(true);
      if (newStatus === 'bought') {
        setRestockItem(item);
        setIsRestockModalOpen(true);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `shoppingList/${id}`);
    }
  };

  const handleConfirmRestock = async (item: ShoppingListItem) => {
    if (!user) return;
    try {
      // Check if item already exists in inventory
      const existing = inventory.find(i => i.name.toLowerCase() === item.name.toLowerCase());
      const restockEntry = { date: new Date().toISOString(), quantity: item.quantity };
      
      if (existing) {
        const history = existing.restockHistory || [];
        await updateDoc(doc(db, 'inventory', existing.id), {
          quantity: existing.quantity + item.quantity,
          unit: item.unit, // Update unit to match what was just bought/confirmed
          category: item.category, // Update category to match what was confirmed
          usageFrequency: item.usageFrequency,
          lastUpdated: new Date().toISOString(),
          restockHistory: [...history, restockEntry].slice(-5) // Keep last 5 restocks for context
        });
      } else {
        await addDoc(collection(db, 'inventory'), {
          name: item.name,
          category: item.category,
          quantity: item.quantity,
          unit: item.unit,
          usageFrequency: item.usageFrequency,
          purchaseDate: new Date().toISOString(),
          lastUpdated: new Date().toISOString(),
          uid: user.uid,
          restockHistory: [restockEntry]
        });
      }
      
      // Remove from shopping list
      await deleteDoc(doc(db, 'shoppingList', item.id));
      
      setHasChanges(true);
      setIsRestockModalOpen(false);
      setActiveTab('pantry');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'inventory');
    }
  };

  const handleSkipRestock = async (item: ShoppingListItem) => {
    try {
      await deleteDoc(doc(db, 'shoppingList', item.id));
      setHasChanges(true);
      setIsRestockModalOpen(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `shoppingList/${item.id}`);
    }
  };

  const handleUpdateInventoryQuantity = async (id: string, newQuantity: number) => {
    try {
      await updateDoc(doc(db, 'inventory', id), {
        quantity: newQuantity,
        lastUpdated: new Date().toISOString()
      });
      setHasChanges(true);
      setIsUpdateQuantityModalOpen(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `inventory/${id}`);
    }
  };

  const handleEditInventory = async (id: string, updates: Partial<GroceryItem>) => {
    try {
      await updateDoc(doc(db, 'inventory', id), updates);
      setHasChanges(true);
      setIsEditModalOpen(false);
      setItemToEdit(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `inventory/${id}`);
    }
  };

  const handleUpdateHousehold = async (info: HouseholdInfo) => {
    if (!user) return;
    try {
      await setDoc(doc(db, 'households', user.uid), { ...info, uid: user.uid });
      setHasChanges(true);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `households/${user.uid}`);
    }
  };

  const handleConfirmStockouts = async (selectedItems: GroceryItem[], unselectedItems: GroceryItem[]) => {
    if (!user) return;
    try {
      // 1. Move selected items to shopping list
      const shoppingPromises = selectedItems.map(item => 
        addDoc(collection(db, 'shoppingList'), {
          name: item.name,
          quantity: 1, // Default to 1 unit for restock
          unit: item.unit,
          category: item.category,
          usageFrequency: item.usageFrequency,
          status: 'to-buy',
          uid: user.uid
        })
      );
      
      // 2. Delete selected items from inventory
      const deletePromises = selectedItems.map(item => 
        handleDeleteGrocery(item.id)
      );

      // 3. Refresh unselected items in pantry to reset prediction
      const refreshPromises = unselectedItems.map(item =>
        updateDoc(doc(db, 'inventory', item.id), {
          lastUpdated: new Date().toISOString()
        })
      );

      await Promise.all([...shoppingPromises, ...deletePromises, ...refreshPromises]);
      setIsStockoutModalOpen(false);
      
      if (selectedItems.length > 0) {
        setActiveTab('shop');
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'shoppingList');
    }
  };

  const handleSearchPrice = async (name: string) => {
    setSearchItem(name);
    setIsPriceModalOpen(true);
    setSearchError(null);
    setIsSearching(true);
    setSearchResults(null);

    setIsSearching(true);
    setSearchResults(null);
    try {
      // Find previous purchase of this item
      const previous = inventory.find(i => i.name.toLowerCase().includes(name.toLowerCase()));
      const previousPurchase = previous ? `${previous.name} (${previous.quantity} ${previous.unit})` : undefined;
      
      const results = await searchCheapestSource(name, userLocation || undefined, previousPurchase, user?.uid);
      setSearchResults(results);
    } catch (error: any) {
      console.error('Search failed:', error);
      let message = "Search failed. Please try again later.";
      if (error.message?.includes('RESOURCE_EXHAUSTED')) {
        message = "AI Search quota exceeded. Google Search grounding is currently unavailable. Please try again in a few minutes.";
      }
      setSearchError(message);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  if (!isAuthReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-cred-black transition-colors duration-500">
        <div className="w-12 h-12 border-4 border-gray-100 dark:border-cred-gray border-t-black dark:border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-cred-black p-6 relative overflow-hidden transition-colors duration-500">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="cred-card p-10 max-w-md w-full text-center relative z-10"
        >
          <div className="w-24 h-24 bg-yellow-400 rounded-[2rem] flex items-center justify-center shadow-2xl mx-auto mb-10 transform -rotate-6">
            <ShoppingBag className="text-red-600 w-12 h-12" />
          </div>
          <h1 className="text-5xl font-black text-red-600 bg-yellow-400 px-4 py-2 rounded-xl mb-4 tracking-tighter transform rotate-1 shadow-lg">PantryPulse</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-12 text-lg leading-relaxed font-medium">
            Your AI-powered kitchen companion for smarter shopping and zero waste.
          </p>
          
          <div className="space-y-4 mb-12 text-left">
            <div className="flex items-center gap-3 text-gray-500 dark:text-gray-400">
              <div className="w-8 h-8 bg-gray-50 dark:bg-cred-gray rounded-lg flex items-center justify-center">
                <Activity className="w-5 h-5 text-blue-500" />
              </div>
              <span className="text-sm font-bold uppercase tracking-widest text-[10px]">AI Calorie & Nutrition Tracking</span>
            </div>
            <div className="flex items-center gap-3 text-gray-500 dark:text-gray-400">
              <div className="w-8 h-8 bg-gray-50 dark:bg-cred-gray rounded-lg flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-black dark:text-white" />
              </div>
              <span className="text-sm font-bold uppercase tracking-widest text-[10px]">Track freshness automatically</span>
            </div>
            <div className="flex items-center gap-3 text-gray-500 dark:text-gray-400">
              <div className="w-8 h-8 bg-gray-50 dark:bg-cred-gray rounded-lg flex items-center justify-center">
                <Camera className="w-5 h-5 text-black dark:text-white" />
              </div>
              <span className="text-sm font-bold uppercase tracking-widest text-[10px]">Scan receipts with Gemini AI</span>
            </div>
            <div className="flex items-center gap-3 text-gray-500 dark:text-gray-400">
              <div className="w-8 h-8 bg-gray-50 dark:bg-cred-gray rounded-lg flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-black dark:text-white" />
              </div>
              <span className="text-sm font-bold uppercase tracking-widest text-[10px]">Reduce food waste & save money</span>
            </div>
          </div>

          <div className="mb-8 p-4 bg-blue-50/50 dark:bg-blue-900/10 rounded-2xl border border-blue-100/50 dark:border-blue-900/20 text-left">
            <div className="flex items-center gap-2 mb-2">
              <Info className="w-4 h-4 text-blue-500" />
              <span className="text-[10px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-400">Beta Testing Phase</span>
            </div>
            <p className="text-[10px] text-gray-500 dark:text-gray-400 leading-relaxed">
              PantryPulse is currently in public beta. During this phase, all features are free to use. In the future, advanced AI features (like Calorie Scanning and Recipe Generation) will be part of a <strong>Pro Subscription</strong>. This will come with a <strong>monthly subscription cost</strong> to cover the high operational and AI processing costs.
            </p>
          </div>

          <button
            onClick={handleLogin}
            className="w-full cred-button-primary flex items-center justify-center gap-3 mb-4"
          >
            <LogIn className="w-6 h-6" />
            Get Started with Google
          </button>

          <p className="text-[9px] text-gray-400 dark:text-gray-500 font-medium px-4">
            By continuing, you agree to our <button onClick={() => setIsTroubleshootingOpen(true)} className="underline hover:text-black dark:hover:text-white">Data Usage & Security Policy</button>. We use your data solely to provide personalized nutrition and pantry insights.
          </p>

          {loginError && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 p-4 bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900 rounded-2xl text-red-600 dark:text-red-400 text-sm font-medium"
            >
              <div className="flex items-center gap-2 mb-1">
                <AlertCircle className="w-4 h-4" />
                <span className="font-bold">Login Error</span>
              </div>
              {loginError}
            </motion.div>
          )}
          
          <button 
            onClick={() => setIsTroubleshootingOpen(true)}
            className="mt-8 text-[10px] text-gray-400 font-black hover:text-black dark:hover:text-white transition-colors uppercase tracking-[0.2em]"
          >
            Privacy Policy & Setup
          </button>
        </motion.div>

        {/* Troubleshooting & Policy Modal */}
        <AnimatePresence>
          {isTroubleshootingOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="cred-card w-full max-w-lg p-8 max-h-[80vh] overflow-y-auto no-scrollbar"
              >
                <div className="flex items-center justify-between mb-6 sticky top-0 bg-white dark:bg-cred-dark py-2 z-10">
                  <h2 className="text-2xl font-black">Policy & Setup</h2>
                  <button onClick={() => setIsTroubleshootingOpen(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-cred-gray rounded-full">
                    <X className="w-6 h-6 text-gray-400" />
                  </button>
                </div>

                <div className="space-y-8">
                  <section>
                    <h3 className="text-xs font-black uppercase tracking-widest text-purple-500 mb-4">Security & Data Policy</h3>
                    <div className="space-y-4 text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                      <p>
                        <strong>Data Usage:</strong> We collect your inventory items, meal logs, and nutritional profiles to provide AI-driven insights. Your data is stored securely in Firebase and is only accessible by you.
                      </p>
                      <p>
                        <strong>Sharing:</strong> We do not sell your personal data. If you enable "Community Comparison", your calorie data is shared <strong>anonymously</strong> to generate aggregate benchmarks.
                      </p>
                      <p>
                        <strong>AI Processing:</strong> Images and text are processed via Google Gemini AI. These interactions are subject to Google's privacy standards for API usage.
                      </p>
                      <div className="p-4 bg-emerald-50 dark:bg-emerald-900/10 rounded-xl border border-emerald-100 dark:border-emerald-900/20">
                        <p className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400">
                          By using PantryPulse, you agree to this data policy and acknowledge that your information is used to improve your personalized experience.
                        </p>
                      </div>
                    </div>
                  </section>

                  <section>
                    <h3 className="text-xs font-black uppercase tracking-widest text-blue-500 mb-4">Vercel Setup Guide</h3>
                    <div className="space-y-6 text-gray-600 dark:text-gray-400">
                      <div className="flex gap-4">
                        <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/20 text-blue-600 rounded-full flex items-center justify-center font-bold flex-shrink-0">1</div>
                        <p className="text-sm">Go to <strong>Vercel Dashboard &gt; Project &gt; Settings &gt; Environment Variables</strong>.</p>
                      </div>
                      <div className="flex gap-4">
                        <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/20 text-blue-600 rounded-full flex items-center justify-center font-bold flex-shrink-0">2</div>
                        <p className="text-sm">Add <strong>GEMINI_API_KEY</strong> with your key from <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-blue-600 underline">Google AI Studio</a>.</p>
                      </div>
                      <div className="flex gap-4">
                        <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/20 text-blue-600 rounded-full flex items-center justify-center font-bold flex-shrink-0">3</div>
                        <p className="text-sm"><strong>IMPORTANT:</strong> You must <strong>Redeploy</strong> (Deployments &gt; Redeploy) for the changes to take effect.</p>
                      </div>
                    </div>
                  </section>
                </div>

                <button
                  onClick={() => setIsTroubleshootingOpen(false)}
                  className="w-full mt-8 py-4 bg-gray-100 dark:bg-cred-gray hover:bg-gray-200 dark:hover:bg-cred-dark font-black uppercase tracking-widest rounded-2xl transition-all"
                >
                  I Understand
                </button>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    );
  }


  return (
    <div className="min-h-screen bg-cred-black font-sans transition-colors duration-500">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-cred-black/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-cred-primary rounded-lg flex items-center justify-center shadow-lg shadow-red-500/20">
              <span className="text-white font-black text-xs">PP</span>
            </div>
            <h1 className="text-lg font-black tracking-tighter text-white">PantryPulse</h1>
          </div>

          <div className="flex items-center gap-3">
            {userProfile?.tier === 'pro' ? (
              <ProBadge />
            ) : (
              <button 
                onClick={() => setIsUpgradeModalOpen(true)}
                className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-100 dark:bg-amber-900/20 text-amber-600 dark:text-amber-500 text-xs font-black uppercase tracking-widest hover:bg-amber-200 dark:hover:bg-amber-900/40 transition-all"
              >
                <Zap className="w-4 h-4 fill-current" />
                Go Pro
              </button>
            )}
            <div className="flex items-center gap-2">
              <AnimatePresence>
              {hasChanges && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  onClick={handleRefresh}
                  className="flex items-center gap-2 px-3 py-1.5 bg-cred-primary text-white rounded-xl font-black uppercase tracking-widest text-[8px] shadow-lg"
                >
                  <RefreshCw className="w-3 h-3 animate-spin-slow" />
                  <span>Refresh</span>
                </motion.button>
              )}
            </AnimatePresence>

            <button 
              onClick={() => setActiveTab('settings')}
              className={`p-2 rounded-xl transition-all ${activeTab === 'settings' ? 'bg-white/10 text-cred-accent' : 'text-gray-500 hover:bg-white/5'}`}
            >
              <Settings className="w-5 h-5" />
            </button>
            
            <div className="relative">
              <button 
                onClick={() => setIsSettingsMenuOpen(!isSettingsMenuOpen)}
                className="w-8 h-8 rounded-full bg-cred-gray border border-white/10 flex items-center justify-center text-[10px] font-black uppercase tracking-widest overflow-hidden hover:border-white/20 transition-all"
              >
                {user?.photoURL ? (
                  <img src={user.photoURL} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  user?.displayName?.charAt(0) || 'U'
                )}
              </button>
              
              <AnimatePresence>
                {isSettingsMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute top-full right-0 mt-4 w-64 bg-cred-gray border border-white/10 rounded-2xl shadow-2xl p-2 z-50"
                  >
                    <div className="p-3 border-b border-white/5 mb-1">
                      <p className="text-xs font-bold truncate">{user?.displayName || 'User'}</p>
                      <p className="text-[10px] text-gray-500 truncate">{user?.email}</p>
                    </div>
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 p-3 hover:bg-red-500/10 rounded-xl transition-all text-left group"
                    >
                      <div className="p-2 bg-red-500/10 text-red-500 rounded-lg group-hover:bg-red-500 group-hover:text-white transition-all">
                        <LogOut className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs font-bold group-hover:text-red-500 transition-all">Sign Out</p>
                        <p className="text-[8px] text-gray-500 uppercase font-black tracking-widest">End Session</p>
                      </div>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </header>

      <StockoutConfirmationModal 
        isOpen={isStockoutModalOpen}
        onClose={() => setIsStockoutModalOpen(false)}
        items={stockoutItems}
        onConfirm={handleConfirmStockouts}
      />

      {/* Navigation */}
      <nav className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-cred-gray/60 backdrop-blur-3xl px-2 py-2 rounded-[2.5rem] z-50 flex items-center gap-1 shadow-[0_20px_50px_rgba(0,0,0,0.8)] border border-white/5 w-fit max-w-[95%] overflow-x-auto no-scrollbar">
        <NavButton 
          active={activeTab === 'pantry'} 
          onClick={() => {
            setActiveTab('pantry');
            setInventoryFilter('all');
          }}
          icon={<LayoutDashboard className="w-5 h-5" />}
          label="Pantry"
        />
        <NavButton 
          active={activeTab === 'shop'} 
          onClick={() => setActiveTab('shop')}
          icon={<ShoppingBag className="w-5 h-5" />}
          label="Shop"
          badge={shoppingList.filter(i => i.status === 'to-buy').length}
        />
        <NavButton 
          active={activeTab === 'cook'} 
          onClick={() => setActiveTab('cook')}
          icon={<ChefHat className="w-5 h-5" />}
          label="Cook"
        />
        <NavButton 
          active={activeTab === 'health'} 
          onClick={() => setActiveTab('health')}
          icon={<Activity className="w-5 h-5" />}
          label="Health"
        />
        {user?.email === "dailygkquiz2026@gmail.com" && (
          <NavButton 
            active={activeTab === 'dev'} 
            onClick={() => setActiveTab('dev')}
            icon={<ShieldAlert className="w-5 h-5" />}
            label="Dev"
          />
        )}
      </nav>

      {/* FAB */}
      <button
        onClick={() => setIsAddModalOpen(true)}
        className="fixed bottom-24 right-6 w-16 h-16 bg-cred-primary text-white rounded-full shadow-2xl shadow-red-500/40 flex items-center justify-center z-40 active:scale-90 transition-all hover:scale-110"
      >
        <PlusCircle className="w-8 h-8" />
      </button>

      {/* Add Item Modal */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="w-full max-w-4xl max-h-[90vh] overflow-y-auto no-scrollbar relative"
            >
              <button 
                onClick={() => setIsAddModalOpen(false)}
                className="absolute top-6 right-6 p-2 bg-white/10 hover:bg-white/20 text-white rounded-full z-10 transition-all"
              >
                <X className="w-6 h-6" />
              </button>
              <GroceryForm 
                onAdd={handleAddGrocery} 
                onAddMultiple={handleAddMultipleGrocery} 
                inventory={inventory}
                onUpdateQuantity={handleUpdateInventoryQuantity}
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 pt-24 pb-40">
        <AnimatePresence mode="wait">
          {activeTab === 'pantry' && (
            <motion.div
              key="pantry"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-10"
            >
              <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                  <h2 className="text-4xl font-black tracking-tighter mb-1 text-white">
                    {household.name ? household.name : 'Your Pantry'}
                  </h2>
                  <div className="flex items-center gap-4 text-gray-500 font-bold text-xs uppercase tracking-widest">
                    <span className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5" /> {household.members} members</span>
                    <span className="flex items-center gap-1.5"><TrendingUp className="w-3.5 h-3.5 text-cred-accent" /> {inventory.length} items</span>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <button 
                    onClick={runPredictionsManually}
                    className="p-3 bg-white/5 border border-white/5 text-gray-500 hover:text-white rounded-2xl hover:bg-white/10 transition-all active:rotate-180 duration-500"
                    title="Refresh Predictions"
                  >
                    <RotateCcw className="w-5 h-5" />
                  </button>
                  <div className="flex bg-white/5 p-1 rounded-2xl border border-white/5">
                    <button 
                      onClick={() => setInventoryFilter('all')}
                      className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${inventoryFilter === 'all' ? 'bg-white text-black' : 'text-gray-500 hover:text-white'}`}
                    >
                      All
                    </button>
                    <button 
                      onClick={() => setInventoryFilter('low-stock')}
                      className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${inventoryFilter === 'low-stock' ? 'bg-red-600 text-white' : 'text-gray-500 hover:text-white'}`}
                    >
                      Low Stock
                    </button>
                  </div>
                </div>
              </header>

              <InventoryList 
                items={filteredInventory} 
                onDelete={handleDeleteGrocery} 
                onAddToShopping={(name, details) => {
                  setLastShoppingActivity(Date.now());
                  // Use the passed details if available, otherwise find in inventory
                  const itemDetails = details || inventory.find(i => i.name === name);
                  handleAddShoppingItem(name, itemDetails);
                }}
                onUpdateQuantity={(item) => {
                  setItemToUpdate(item);
                  setIsUpdateQuantityModalOpen(true);
                }}
                onEdit={(item) => {
                  setItemToEdit(item);
                  setIsEditModalOpen(true);
                }}
                predictions={predictions}
              />

              {/* Recently Deleted Bin */}
              {deletedItems.length > 0 && (
                <div className="mt-12 border-t border-gray-100 dark:border-white/5 pt-8">
                  <button 
                    onClick={() => setIsBinOpen(!isBinOpen)}
                    className="flex items-center justify-between w-full group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-gray-100 dark:bg-cred-gray rounded-xl text-gray-500">
                        <Trash className="w-5 h-5" />
                      </div>
                      <div className="text-left">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">Recently Deleted Bin</h3>
                        <p className="text-xs text-gray-500">Items are permanently removed after 2 days</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-1 bg-gray-100 dark:bg-cred-gray rounded-lg text-xs font-bold text-gray-500">
                        {deletedItems.length}
                      </span>
                      {isBinOpen ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                    </div>
                  </button>

                  <AnimatePresence>
                    {isBinOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                          {deletedItems.map((item) => (
                            <motion.div
                              key={item.id}
                              layout
                              initial={{ opacity: 0, scale: 0.95 }}
                              animate={{ opacity: 1, scale: 1 }}
                              className="p-4 bg-gray-50/50 dark:bg-cred-gray/30 rounded-2xl border border-gray-100 dark:border-white/5 flex items-center justify-between group"
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-gray-200 dark:bg-cred-gray flex items-center justify-center text-gray-400">
                                  <ShoppingBag className="w-5 h-5" />
                                </div>
                                <div>
                                  <p className="font-bold text-gray-900 dark:text-white">{item.name}</p>
                                  <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest">
                                    Deleted {formatDistanceToNow(new Date(item.deletedAt))} ago
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => handleRestoreGrocery(item)}
                                  className="p-2 text-gray-700 dark:text-white hover:bg-gray-200 dark:hover:bg-white/20 rounded-lg transition-all"
                                  title="Restore to Inventory"
                                >
                                  <RotateCcw className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handlePermanentDelete(item.id)}
                                  className="p-2 text-gray-700 dark:text-white hover:bg-red-100 dark:hover:bg-red-500/40 rounded-lg transition-all"
                                  title="Delete Permanently"
                                >
                                  <Trash className="w-4 h-4" />
                                </button>
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'shop' && (
            <motion.div
              key="shop"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-10"
            >
              <header>
                <div className="flex items-center gap-3">
                  <h2 className="text-4xl font-black tracking-tighter">Shopping List</h2>
                  <ProBadge className="mt-1" />
                </div>
                <p className="text-gray-500 font-medium text-sm mt-1">Compare prices across platforms</p>
              </header>

              <ShoppingList 
                items={shoppingList} 
                onDelete={handleDeleteShoppingItem}
                onToggleStatus={handleToggleShoppingStatus}
                onSearchPrice={handleSearchPrice}
                onAddItem={handleAddShoppingItem}
                onUpdateItem={handleUpdateShoppingItem}
              />
            </motion.div>
          )}

          {activeTab === 'cook' && (
            <motion.div
              key="cook"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <TrendingRecipes 
                inventory={inventory}
                userLocation={userLocation}
                onAddToShopping={(name, details) => handleAddShoppingItem(name, details, true)}
                defaultMembers={household.members}
                savedRecipes={savedRecipes}
                onSaveRecipe={handleSaveRecipe}
                onDeleteRecipe={handleDeleteRecipe}
                // Persisted State Props
                cachedRecipes={cachedRecipes}
                setCachedRecipes={setCachedRecipes}
                cachedSearchResults={cachedSearchResults}
                setCachedSearchResults={setCachedSearchResults}
                lastRecipeFetch={lastRecipeFetch}
                setLastRecipeFetch={setLastRecipeFetch}
                recipeView={recipeView}
                setRecipeView={setRecipeView}
                isRecipeLoading={isRecipeLoading}
                setIsRecipeLoading={setIsRecipeLoading}
              />
            </motion.div>
          )}

          {activeTab === 'health' && (
            <motion.div
              key="health"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <CalorieTracker inventory={inventory} />
            </motion.div>
          )}

          {activeTab === 'settings' && (
            <motion.div
              key="settings"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <HouseholdSettings 
                info={household} 
                onUpdate={handleUpdateHousehold} 
                inventory={inventory}
              />
            </motion.div>
          )}

          {activeTab === 'dev' && user?.email === "dailygkquiz2026@gmail.com" && user?.emailVerified && (
            <motion.div
              key="dev"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <AdminDashboard />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <EditItemModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setItemToEdit(null);
        }}
        item={itemToEdit}
        onUpdate={handleEditInventory}
      />

      <PriceComparison 
        isOpen={isPriceModalOpen}
        onClose={() => setIsPriceModalOpen(false)}
        itemName={searchItem}
        results={searchResults}
        error={searchError}
        isLoading={isSearching}
        userLocation={userLocation}
        onLocationUpdate={(loc) => setUserLocation(loc)}
        onRetry={() => handleSearchPrice(searchItem)}
      />

      <RestockModal
        isOpen={isRestockModalOpen}
        onClose={() => setIsRestockModalOpen(false)}
        item={restockItem}
        onConfirm={handleConfirmRestock}
        onSkip={handleSkipRestock}
      />

      <ExpiringItemsModal
        isOpen={isExpiryModalOpen}
        onClose={() => setIsExpiryModalOpen(false)}
        expiringItems={inventory.filter(item => {
          if (!item.expiryDate) return false;
          const expiryDate = new Date(item.expiryDate);
          const diff = (expiryDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24);
          return diff >= 0 && diff < 3;
        })}
        expiredItems={inventory.filter(item => {
          if (!item.expiryDate) return false;
          const expiryDate = new Date(item.expiryDate);
          return expiryDate.getTime() < new Date().getTime();
        })}
        onRemoveItem={handleDeleteGrocery}
      />

      <UpdateQuantityModal
        isOpen={isUpdateQuantityModalOpen}
        onClose={() => setIsUpdateQuantityModalOpen(false)}
        item={itemToUpdate}
        onConfirm={handleUpdateInventoryQuantity}
      />

      <UpgradeModal 
        isOpen={isUpgradeModalOpen} 
        onClose={() => setIsUpgradeModalOpen(false)} 
        uid={user?.uid || ''} 
      />

      {isMarketingOpen && (
        <MarketingIntro onClose={handleCloseMarketing} />
      )}

      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 pointer-events-none"
          >
            <div className="bg-white dark:bg-cred-gray text-black dark:text-white px-6 py-4 rounded-2xl shadow-2xl border border-gray-200 dark:border-white/10 flex items-center gap-3">
              <CheckCircle2 className="w-6 h-6 text-emerald-500" />
              <p className="font-bold text-sm">{toastMessage}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function App() {
  useEffect(() => {
    document.documentElement.classList.add('dark');
  }, []);

  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  );
}

function NavButton({ active, onClick, icon, label, badge }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string, badge?: number }) {
  return (
    <button
      onClick={onClick}
      className={`relative flex flex-col md:flex-row items-center gap-1 md:gap-3 px-3 py-2 md:px-6 md:py-4 rounded-xl md:rounded-2xl transition-all duration-300 ${
        active 
          ? 'bg-red-600 text-white shadow-xl' 
          : 'text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20'
      }`}
    >
      {icon}
      <span className="text-[9px] md:text-base font-black uppercase md:capitalize tracking-widest md:tracking-tight">{label}</span>
      {badge !== undefined && badge > 0 && (
        <span className="absolute top-1 right-1 md:static md:ml-auto w-4 h-4 md:w-5 md:h-5 bg-red-500 text-white text-[8px] md:text-[10px] font-black rounded-full flex items-center justify-center border-2 border-white dark:border-cred-dark">
          {badge}
        </span>
      )}
    </button>
  );
}

