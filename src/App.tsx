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
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Users,
  LogIn,
  LogOut,
  Camera,
  X,
  RefreshCw
} from 'lucide-react';
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
  getDocFromServer
} from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from './firebase';
import { Analytics } from '@vercel/analytics/react';
import GroceryForm from './components/GroceryForm';
import InventoryList from './components/InventoryList';
import ShoppingList from './components/ShoppingList';
import HouseholdSettings from './components/HouseholdSettings';
import PriceComparison from './components/PriceComparison';
import AdminDashboard from './components/AdminDashboard';
import RestockModal from './components/RestockModal';
import UpdateQuantityModal from './components/UpdateQuantityModal';
import EditItemModal from './components/EditItemModal';
import ExpiringItemsModal from './components/ExpiringItemsModal';
import { GroceryItem, HouseholdInfo, ShoppingListItem } from './types';
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
  const [activeTab, setActiveTab] = useState<'inventory' | 'add' | 'shopping' | 'settings'>('inventory');
  const [inventory, setInventory] = useState<GroceryItem[]>([]);
  const [shoppingList, setShoppingList] = useState<ShoppingListItem[]>([]);
  const [household, setHousehold] = useState<HouseholdInfo>({ members: 2, preferences: [], uid: '' });
  const [isPriceModalOpen, setIsPriceModalOpen] = useState(false);
  const [searchItem, setSearchItem] = useState('');
  const [searchResults, setSearchResults] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [predictions, setPredictions] = useState<Record<string, number>>({});
  const [notifiedItems, setNotifiedItems] = useState<Set<string>>(new Set());
  const [hasChanges, setHasChanges] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  // Notification Logic for Low Stock
  useEffect(() => {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;

    const lowStockItems = inventory.filter(item => {
      const days = predictions[item.id];
      // Notify if 1 day left or out of stock, and not notified yet
      return days !== undefined && days <= 1 && !notifiedItems.has(item.id);
    });

    if (lowStockItems.length > 0) {
      const itemNames = lowStockItems.map(i => i.name).join(', ');
      new Notification("Low Stock Alert", {
        body: `The following items are running out: ${itemNames}. Consider restocking soon!`,
        icon: "/favicon.ico"
      });

      setNotifiedItems(prev => {
        const next = new Set(prev);
        lowStockItems.forEach(i => next.add(i.id));
        return next;
      });
    }
  }, [inventory, predictions, notifiedItems]);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [userLocation, setUserLocation] = useState<string | null>(null);

  // New Modal States
  const [isRestockModalOpen, setIsRestockModalOpen] = useState(false);
  const [restockItem, setRestockItem] = useState<ShoppingListItem | null>(null);
  const [isUpdateQuantityModalOpen, setIsUpdateQuantityModalOpen] = useState(false);
  const [itemToUpdate, setItemToUpdate] = useState<GroceryItem | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [itemToEdit, setItemToEdit] = useState<GroceryItem | null>(null);
  const [isTroubleshootingOpen, setIsTroubleshootingOpen] = useState(false);
  const [isExpiryModalOpen, setIsExpiryModalOpen] = useState(false);
  const [lastShoppingActivity, setLastShoppingActivity] = useState(Date.now());

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

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

  // Real-time Household
  useEffect(() => {
    if (!user || !isAuthReady) return;
    const unsubscribe = onSnapshot(doc(db, 'households', user.uid), (snapshot) => {
      if (snapshot.exists()) {
        setHousehold(snapshot.data() as HouseholdInfo);
      } else {
        // Initialize household for new user
        const initialHousehold: HouseholdInfo = { members: 2, preferences: [], uid: user.uid };
        setDoc(doc(db, 'households', user.uid), initialHousehold)
          .catch(err => handleFirestoreError(err, OperationType.WRITE, `households/${user.uid}`));
      }
    }, (error) => handleFirestoreError(error, OperationType.GET, `households/${user.uid}`));
    return () => unsubscribe();
  }, [user, isAuthReady]);

  // Run predictions
  useEffect(() => {
    const runPredictions = async () => {
      if (inventory.length === 0) {
        setPredictions({});
        return;
      }

      const newPredictions: Record<string, number> = {};
      
      // Local fallback calculation to avoid unnecessary API calls
      inventory.forEach(item => {
        // Ensure values are numbers and not NaN
        const qty = Number(item.quantity) || 0;
        const usage = Number(item.usageFrequency) || 0;
        const members = Number(household.members) || 1;

        // Simple heuristic: quantity / (usageFrequency * members)
        // usageFrequency is times per day. members is number of people.
        // We assume 1 unit per usage per member as a baseline.
        const dailyUsage = usage * members;
        
        let localPrediction = 30; // Default fallback
        if (dailyUsage > 0) {
          localPrediction = Math.ceil(qty / dailyUsage);
        }

        // Sanity cap: No item should realistically last more than 90 days 
        // in a household inventory without being considered "long-term storage"
        // which isn't the focus of this app's restock alerts.
        newPredictions[item.id] = Math.min(Math.max(0, localPrediction), 90);
      });

      // Only use AI for items that might need smarter prediction (e.g., complex units or names)
      // For now, we'll batch all items to get a single AI refinement if possible
      try {
        const aiPredictions = await predictMultipleRestocks(
          inventory.map(i => ({
            id: i.id,
            name: i.name,
            quantity: i.quantity,
            unit: i.unit,
            usageFrequency: i.usageFrequency,
            restockHistory: i.restockHistory
          })),
          household.members
        );
        
        // Merge AI predictions over local ones, ensuring they are also capped
        Object.entries(aiPredictions).forEach(([id, days]) => {
          if (typeof days === 'number' && !isNaN(days)) {
            newPredictions[id] = Math.min(Math.max(0, Math.ceil(days)), 90);
          }
        });
      } catch (error) {
        console.warn("AI Prediction failed, using local fallback:", error);
      }
      
      setPredictions(newPredictions);
    };

    if (inventory.length > 0) {
      // Debounce predictions to avoid rapid API calls during multiple inventory updates
      const timer = setTimeout(() => {
        runPredictions();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [inventory, household]);

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
      setActiveTab('inventory');
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
      setActiveTab('inventory');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'inventory');
    }
  };

  const handleDeleteGrocery = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'inventory', id));
      setHasChanges(true);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `inventory/${id}`);
    }
  };

  const handleAddShoppingItem = async (name: string, details?: Partial<GroceryItem>) => {
    if (!user) return;
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
      setHasChanges(true);
      setActiveTab('shopping');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'shoppingList');
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
      setActiveTab('inventory');
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

  const handleSearchPrice = async (name: string) => {
    setSearchItem(name);
    setIsPriceModalOpen(true);
    setIsSearching(true);
    setSearchResults(null);
    try {
      // Find previous purchase of this item
      const previous = inventory.find(i => i.name.toLowerCase().includes(name.toLowerCase()));
      const previousPurchase = previous ? `${previous.name} (${previous.quantity} ${previous.unit})` : undefined;
      
      const results = await searchCheapestSource(name, userLocation || undefined, previousPurchase);
      setSearchResults(results);
    } catch (error: any) {
      console.error('Search failed:', error);
      let errorMessage = error.message || 'Unknown error';
      
      if (errorMessage.includes('RESOURCE_EXHAUSTED') || errorMessage.includes('429')) {
        errorMessage = "You've hit the Gemini API Free Tier limit. To fix this, enable billing in Google AI Studio or wait a few minutes for the quota to reset.";
      }
      
      setSearchResults(`Failed to find price information: ${errorMessage}. Please ensure GEMINI_API_KEY is set in Vercel.`);
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

          <button
            onClick={handleLogin}
            className="w-full cred-button-primary flex items-center justify-center gap-3"
          >
            <LogIn className="w-6 h-6" />
            Get Started with Google
          </button>

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
            Deployment Troubleshooting
          </button>
        </motion.div>

        {/* Troubleshooting Modal */}
        <AnimatePresence>
          {isTroubleshootingOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="cred-card w-full max-w-lg p-8"
              >
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-black">Vercel Setup Guide</h2>
                  <button onClick={() => setIsTroubleshootingOpen(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-cred-gray rounded-full">
                    <X className="w-6 h-6 text-gray-400" />
                  </button>
                </div>
                <div className="space-y-6 text-gray-600 dark:text-gray-400">
                  <div className="flex gap-4">
                    <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/20 text-blue-600 rounded-full flex items-center justify-center font-bold flex-shrink-0">1</div>
                    <p>Go to <strong>Vercel Dashboard &gt; Project &gt; Settings &gt; Environment Variables</strong>.</p>
                  </div>
                  <div className="flex gap-4">
                    <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/20 text-blue-600 rounded-full flex items-center justify-center font-bold flex-shrink-0">2</div>
                    <p>Add <strong>GEMINI_API_KEY</strong> with your key from <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-blue-600 underline">Google AI Studio</a>.</p>
                  </div>
                  <div className="flex gap-4">
                    <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/20 text-blue-600 rounded-full flex items-center justify-center font-bold flex-shrink-0">3</div>
                    <p><strong>IMPORTANT:</strong> You must <strong>Redeploy</strong> (Deployments &gt; Redeploy) for the changes to take effect.</p>
                  </div>
                  <div className="flex gap-4">
                    <div className="w-8 h-8 bg-amber-100 dark:bg-amber-900/20 text-amber-600 rounded-full flex items-center justify-center font-bold flex-shrink-0">5</div>
                    <p><strong>Quota Exceeded (429):</strong> If you see "Resource Exhausted", go to <a href="https://aistudio.google.com/app/billing" target="_blank" rel="noreferrer" className="text-blue-600 underline font-bold">AI Studio Billing</a> and enable Pay-as-you-go to get higher search limits.</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsTroubleshootingOpen(false)}
                  className="w-full mt-8 py-4 bg-gray-100 dark:bg-cred-gray hover:bg-gray-200 dark:hover:bg-cred-dark font-black uppercase tracking-widest rounded-2xl transition-all"
                >
                  Got it!
                </button>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  const lowStockItems = inventory.filter(item => (predictions[item.id] || 10) < 3);

  return (
    <div className="min-h-screen bg-cred-black font-sans transition-colors duration-500">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 bg-cred-black/80 backdrop-blur-md border-b border-white/5 px-6 py-4 z-40 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-red-600 rounded-xl flex items-center justify-center shadow-lg transform rotate-3 hover:rotate-0 transition-transform cursor-default">
            <span className="text-white font-black text-xl italic tracking-tighter">PP</span>
          </div>
          <h1 className="text-2xl font-black tracking-tighter text-red-600">PantryPulse</h1>
        </div>

        <div className="flex items-center gap-2 md:gap-4">
          <AnimatePresence>
            {hasChanges && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8, x: 20 }}
                animate={{ opacity: 1, scale: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.8, x: 20 }}
                onClick={handleRefresh}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg hover:bg-red-700 transition-all"
              >
                <RefreshCw className="w-4 h-4 animate-spin-slow" />
                <span>Refresh</span>
              </motion.button>
            )}
          </AnimatePresence>
          
          <div className="flex items-center gap-2 md:gap-3 pl-2 md:pl-4 border-l border-cred-gray">
            <div className="text-right">
              <p className="hidden sm:block text-[10px] md:text-xs font-black uppercase tracking-widest text-gray-400">{user.displayName}</p>
              <button onClick={handleLogout} className="text-[10px] font-black uppercase tracking-widest text-red-500 hover:text-red-600">Sign Out</button>
            </div>
            <img src={user.photoURL || ''} alt="" className="w-8 h-8 md:w-10 md:h-10 rounded-full border-2 border-cred-dark shadow-sm" />
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="fixed bottom-6 md:bottom-8 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur-xl px-2 py-2 md:px-4 md:py-3 rounded-[2rem] md:rounded-[2.5rem] z-50 flex items-center gap-1 md:gap-2 shadow-2xl border border-black/10 w-[90%] max-w-fit overflow-x-auto no-scrollbar">
        <NavButton 
          active={activeTab === 'inventory'} 
          onClick={() => setActiveTab('inventory')}
          icon={<LayoutDashboard className="w-5 h-5" />}
          label="Inventory"
        />
        <NavButton 
          active={activeTab === 'add'} 
          onClick={() => setActiveTab('add')}
          icon={<PlusCircle className="w-5 h-5" />}
          label="Log"
        />
        <NavButton 
          active={activeTab === 'shopping'} 
          onClick={() => setActiveTab('shopping')}
          icon={<ShoppingBag className="w-5 h-5" />}
          label="Shop"
          badge={shoppingList.filter(i => i.status === 'to-buy').length}
        />
        <NavButton 
          active={activeTab === 'settings'} 
          onClick={() => setActiveTab('settings')}
          icon={<Settings className="w-5 h-5" />}
          label="Settings"
        />
      </nav>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-6 pt-32 pb-40">
        <AnimatePresence mode="wait">
          {activeTab === 'inventory' && (
            <motion.div
              key="inventory"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-12"
            >
              <header className="flex flex-col md:flex-row md:items-end justify-between gap-8">
                <div>
                  <h2 className="text-5xl font-black tracking-tighter mb-2">Your Pantry</h2>
                  <p className="text-gray-500 dark:text-gray-400 font-medium text-lg">Smart tracking for your household of {household.members}</p>
                </div>
                <div className="flex gap-4">
                  <div className="cred-card px-6 py-3 flex items-center gap-3">
                    <Users className="w-5 h-5 text-purple-500" />
                    <span className="text-sm font-black uppercase tracking-widest">{household.members} Members</span>
                  </div>
                  <div className="cred-card px-6 py-3 flex items-center gap-3">
                    <TrendingUp className="w-5 h-5 text-green-500" />
                    <span className="text-sm font-black uppercase tracking-widest">{inventory.length} Items</span>
                  </div>
                </div>
              </header>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="cred-card p-8 group hover:scale-[1.02] transition-all cursor-default">
                  <p className="text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] mb-2">Total Items</p>
                  <p className="text-5xl font-black tracking-tighter">{inventory.length}</p>
                </div>
                <button 
                  onClick={() => setActiveTab('inventory')}
                  className="cred-card p-8 group hover:scale-[1.02] transition-all text-left"
                >
                  <p className="text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] mb-2">Low Stock</p>
                  <p className="text-5xl font-black tracking-tighter text-red-500">{lowStockItems.length}</p>
                </button>
                <button 
                  onClick={() => setActiveTab('shopping')}
                  className="cred-card p-8 group hover:scale-[1.02] transition-all text-left"
                >
                  <p className="text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] mb-2">Shopping List</p>
                  <p className="text-5xl font-black tracking-tighter text-blue-500">{shoppingList.filter(i => i.status === 'to-buy').length}</p>
                </button>
              </div>

              <InventoryList 
                items={inventory} 
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
            </motion.div>
          )}

          {activeTab === 'add' && (
            <motion.div
              key="add"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <GroceryForm 
                onAdd={handleAddGrocery} 
                onAddMultiple={handleAddMultipleGrocery} 
                inventory={inventory}
                onUpdateQuantity={handleUpdateInventoryQuantity}
              />
            </motion.div>
          )}

          {activeTab === 'shopping' && (
            <motion.div
              key="shopping"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-12"
            >
              <header>
                <h2 className="text-5xl font-black tracking-tighter">Shopping List</h2>
                <p className="text-gray-500 dark:text-gray-400 font-medium text-lg mt-2">Search and compare variants across all platforms</p>
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
              />
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
        isLoading={isSearching}
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

      <AdminDashboard />
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
      <Analytics />
    </ErrorBoundary>
  );
}

function NavButton({ active, onClick, icon, label, badge }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string, badge?: number }) {
  return (
    <button
      onClick={onClick}
      className={`relative flex flex-col md:flex-row items-center gap-1 md:gap-3 px-3 py-2 md:px-6 md:py-4 rounded-xl md:rounded-2xl transition-all duration-300 ${
        active 
          ? 'bg-white text-black shadow-xl' 
          : 'text-gray-400 hover:text-white hover:bg-cred-gray'
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
