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
  X
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
import GroceryForm from './components/GroceryForm';
import InventoryList from './components/InventoryList';
import ShoppingList from './components/ShoppingList';
import HouseholdSettings from './components/HouseholdSettings';
import PriceComparison from './components/PriceComparison';
import RestockModal from './components/RestockModal';
import UpdateQuantityModal from './components/UpdateQuantityModal';
import EditItemModal from './components/EditItemModal';
import { GroceryItem, HouseholdInfo, ShoppingListItem } from './types';
import { predictRestock, searchCheapestSource } from './services/geminiService';

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
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
          <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full text-center">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Oops!</h2>
            <p className="text-gray-600 mb-6">{message}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all"
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
  const [user, setUser] = useState<User | null>(null);
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
      const newPredictions: Record<string, number> = {};
      for (const item of inventory) {
        try {
          const result = await predictRestock(
            item.name,
            item.quantity,
            item.unit,
            household.members,
            item.usageFrequency
          );
          newPredictions[item.id] = result.daysRemaining;
        } catch (error) {
          console.error(`Prediction failed for ${item.name}:`, error);
        }
      }
      setPredictions(newPredictions);
    };

    if (inventory.length > 0) {
      runPredictions();
    }
  }, [inventory, household]);

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

  const handleAddGrocery = async (item: Omit<GroceryItem, 'id'>) => {
    if (!user) return;
    try {
      await addDoc(collection(db, 'inventory'), { ...item, uid: user.uid });
      setActiveTab('inventory');
    } catch (error) {
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
      setActiveTab('inventory');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'inventory');
    }
  };

  const handleDeleteGrocery = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'inventory', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `inventory/${id}`);
    }
  };

  const handleAddShoppingItem = async (name: string, details?: Partial<GroceryItem>) => {
    if (!user) return;
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
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'shoppingList');
    }
  };

  const handleDeleteShoppingItem = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'shoppingList', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `shoppingList/${id}`);
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
      if (existing) {
        await updateDoc(doc(db, 'inventory', existing.id), {
          quantity: existing.quantity + item.quantity,
          usageFrequency: item.usageFrequency,
          lastUpdated: new Date().toISOString()
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
          uid: user.uid
        });
      }
      setIsRestockModalOpen(false);
      setActiveTab('inventory');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'inventory');
    }
  };

  const handleUpdateInventoryQuantity = async (id: string, newQuantity: number) => {
    try {
      await updateDoc(doc(db, 'inventory', id), {
        quantity: newQuantity,
        lastUpdated: new Date().toISOString()
      });
      setIsUpdateQuantityModalOpen(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `inventory/${id}`);
    }
  };

  const handleEditInventory = async (id: string, updates: Partial<GroceryItem>) => {
    try {
      await updateDoc(doc(db, 'inventory', id), updates);
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
      setSearchResults(`Failed to find price information: ${error.message || 'Unknown error'}. Please ensure GEMINI_API_KEY is set in Vercel.`);
    } finally {
      setIsSearching(false);
    }
  };

  if (!isAuthReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-12 h-12 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white p-6 relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-50 rounded-full blur-3xl opacity-50" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-amber-50 rounded-full blur-3xl opacity-50" />

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-10 rounded-[3rem] shadow-2xl shadow-blue-100 max-w-md w-full text-center border border-gray-100 relative z-10"
        >
          <div className="w-24 h-24 bg-blue-600 rounded-[2rem] flex items-center justify-center shadow-2xl shadow-blue-200 mx-auto mb-10 transform -rotate-6">
            <ShoppingBag className="text-white w-12 h-12" />
          </div>
          <h1 className="text-5xl font-black text-gray-900 mb-4 tracking-tighter">PantryPulse</h1>
          <p className="text-gray-600 mb-12 text-lg leading-relaxed font-medium">
            Your AI-powered kitchen companion for smarter shopping and zero waste.
          </p>
          
          <div className="space-y-4 mb-12 text-left">
            <div className="flex items-center gap-3 text-gray-500">
              <div className="w-8 h-8 bg-green-50 rounded-lg flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              </div>
              <span className="text-sm font-semibold">Track freshness automatically</span>
            </div>
            <div className="flex items-center gap-3 text-gray-500">
              <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
                <Camera className="w-5 h-5 text-blue-600" />
              </div>
              <span className="text-sm font-semibold">Scan receipts with Gemini AI</span>
            </div>
            <div className="flex items-center gap-3 text-gray-500">
              <div className="w-8 h-8 bg-amber-50 rounded-lg flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
              </div>
              <span className="text-sm font-semibold">Reduce food waste & save money</span>
            </div>
          </div>

          <button
            onClick={handleLogin}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-5 rounded-2xl transition-all flex items-center justify-center gap-3 shadow-xl shadow-blue-200 group active:scale-95"
          >
            <LogIn className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
            Get Started with Google
          </button>

          {loginError && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-sm font-medium"
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
            className="mt-8 text-xs text-gray-400 font-bold hover:text-blue-600 transition-colors uppercase tracking-widest"
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
                className="bg-white w-full max-w-lg rounded-3xl shadow-2xl p-8"
              >
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">Vercel Setup Guide</h2>
                  <button onClick={() => setIsTroubleshootingOpen(false)} className="p-2 hover:bg-gray-100 rounded-full">
                    <X className="w-6 h-6 text-gray-400" />
                  </button>
                </div>
                <div className="space-y-6 text-gray-600">
                  <div className="flex gap-4">
                    <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold flex-shrink-0">1</div>
                    <p>Go to <strong>Vercel Dashboard &gt; Project &gt; Settings &gt; Environment Variables</strong>.</p>
                  </div>
                  <div className="flex gap-4">
                    <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold flex-shrink-0">2</div>
                    <p>Add <strong>GEMINI_API_KEY</strong> with your key from <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-blue-600 underline">Google AI Studio</a>.</p>
                  </div>
                  <div className="flex gap-4">
                    <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold flex-shrink-0">3</div>
                    <p><strong>IMPORTANT:</strong> You must <strong>Redeploy</strong> (Deployments &gt; Redeploy) for the changes to take effect.</p>
                  </div>
                  <div className="flex gap-4">
                    <div className="w-8 h-8 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center font-bold flex-shrink-0">4</div>
                    <p><strong>Authorized Domains:</strong> Add your Vercel domain to <strong>Firebase Console &gt; Auth &gt; Settings</strong>.</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsTroubleshootingOpen(false)}
                  className="w-full mt-8 py-4 bg-gray-100 hover:bg-gray-200 text-gray-900 font-bold rounded-2xl transition-all"
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
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans selection:bg-blue-100 selection:text-blue-900">
      {/* Sidebar / Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-6 py-3 z-40 md:top-0 md:bottom-auto md:border-t-0 md:border-b md:flex md:items-center md:justify-between">
        <div className="flex items-center gap-2 mb-4 md:mb-0">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-200">
            <ShoppingBag className="text-white w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-gray-900 hidden md:block">PantryPulse</h1>
        </div>

        <div className="flex items-center justify-between md:gap-2">
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
            label="Log Purchase"
          />
          <NavButton 
            active={activeTab === 'shopping'} 
            onClick={() => setActiveTab('shopping')}
            icon={<ShoppingBag className="w-5 h-5" />}
            label="Shopping List"
            badge={shoppingList.filter(i => i.status === 'to-buy').length}
          />
          <NavButton 
            active={activeTab === 'settings'} 
            onClick={() => setActiveTab('settings')}
            icon={<Settings className="w-5 h-5" />}
            label="Settings"
          />
          <button
            onClick={handleLogout}
            className="flex flex-col md:flex-row items-center gap-2 px-4 py-2 rounded-2xl text-gray-400 hover:text-red-600 hover:bg-red-50 transition-all"
          >
            <LogOut className="w-5 h-5" />
            <span className="text-[10px] md:text-sm font-bold uppercase md:capitalize tracking-wider md:tracking-normal">Logout</span>
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-6 pt-24 pb-32 md:pt-32">
        <AnimatePresence mode="wait">
          {activeTab === 'inventory' && (
            <motion.div
              key="inventory"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                  <h2 className="text-3xl font-bold text-gray-900">Your Pantry</h2>
                  <p className="text-gray-500 mt-1">Smart tracking for your household of {household.members}</p>
                </div>
                <div className="flex gap-3">
                  <div className="bg-white px-4 py-2 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-2">
                    <Users className="w-4 h-4 text-purple-600" />
                    <span className="text-sm font-semibold text-gray-700">{household.members} Members</span>
                  </div>
                  <div className="bg-white px-4 py-2 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-green-600" />
                    <span className="text-sm font-semibold text-gray-700">{inventory.length} Items</span>
                  </div>
                </div>
              </header>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                  <p className="text-sm font-medium text-gray-500 mb-1">Total Items</p>
                  <p className="text-3xl font-bold text-gray-900">{inventory.length}</p>
                </div>
                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                  <p className="text-sm font-medium text-gray-500 mb-1">Low Stock</p>
                  <p className="text-3xl font-bold text-amber-600">{lowStockItems.length}</p>
                </div>
                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                  <p className="text-sm font-medium text-gray-500 mb-1">Shopping List</p>
                  <p className="text-3xl font-bold text-blue-600">{shoppingList.filter(i => i.status === 'to-buy').length}</p>
                </div>
              </div>


              {lowStockItems.length > 0 && (
                <div className="bg-amber-50 border border-amber-100 p-4 rounded-2xl flex items-start gap-4">
                  <div className="p-2 bg-amber-100 rounded-xl">
                    <AlertCircle className="w-6 h-6 text-amber-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-amber-900">Restock Soon</h3>
                    <p className="text-amber-700 text-sm">
                      {lowStockItems.map(i => i.name).join(', ')} might run out in the next 3 days.
                    </p>
                    <button 
                      onClick={() => {
                        lowStockItems.forEach(item => {
                          if (!shoppingList.find(s => s.name === item.name)) {
                            handleAddShoppingItem(item.name, item);
                          }
                        });
                        setActiveTab('shopping');
                      }}
                      className="mt-2 text-sm font-bold text-amber-900 hover:underline"
                    >
                      Add all to shopping list →
                    </button>
                  </div>
                </div>
              )}

              <InventoryList 
                items={inventory} 
                onDelete={handleDeleteGrocery} 
                onAddToShopping={(name) => {
                  const item = inventory.find(i => i.name === name);
                  handleAddShoppingItem(name, item);
                  setActiveTab('shopping');
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
              <GroceryForm onAdd={handleAddGrocery} onAddMultiple={handleAddMultipleGrocery} />
            </motion.div>
          )}

          {activeTab === 'shopping' && (
            <motion.div
              key="shopping"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              <header>
                <h2 className="text-3xl font-bold text-gray-900">Shopping List</h2>
                <p className="text-gray-500 mt-1">Search and compare variants across all platforms</p>
              </header>

              <ShoppingList 
                items={shoppingList} 
                onDelete={handleDeleteShoppingItem}
                onToggleStatus={handleToggleShoppingStatus}
                onSearchPrice={handleSearchPrice}
                onAddItem={handleAddShoppingItem}
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
      />

      <UpdateQuantityModal
        isOpen={isUpdateQuantityModalOpen}
        onClose={() => setIsUpdateQuantityModalOpen(false)}
        item={itemToUpdate}
        onConfirm={handleUpdateInventoryQuantity}
      />
    </div>
  );
}

export default function App() {
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
      className={`relative flex flex-col md:flex-row items-center gap-2 px-4 py-2 rounded-2xl transition-all ${
        active 
          ? 'bg-blue-50 text-blue-600 md:bg-blue-600 md:text-white' 
          : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
      }`}
    >
      {icon}
      <span className="text-[10px] md:text-sm font-bold uppercase md:capitalize tracking-wider md:tracking-normal">{label}</span>
      {badge !== undefined && badge > 0 && (
        <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white">
          {badge}
        </span>
      )}
    </button>
  );
}

