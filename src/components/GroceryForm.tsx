import React, { useState, useRef } from 'react';
import { CATEGORIES, UNITS, CATEGORY_IMAGES, CATEGORY_COLORS } from '../constants';
import { Plus, ShoppingCart, Camera, Loader2, FileText, Upload, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import AutocompleteInput from './AutocompleteInput';
import { analyzeProductImage, analyzeInvoice, fetchProductImage, predictExpiryDate } from '../services/geminiService';
import InvoiceReviewModal from './InvoiceReviewModal';
import DuplicateCheckModal from './DuplicateCheckModal';
import { GroceryItem } from '../types';
import { db, auth } from '../firebase';
import { collection, addDoc } from 'firebase/firestore';

interface GroceryFormProps {
  onAdd: (item: any) => void;
  onAddMultiple: (items: any[]) => void;
  inventory: GroceryItem[];
  onUpdateQuantity: (id: string, newQuantity: number) => void;
}

export default function GroceryForm({ onAdd, onAddMultiple, inventory, onUpdateQuantity }: GroceryFormProps) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [quantity, setQuantity] = useState<string | number>(1);
  const [unit, setUnit] = useState(UNITS[0]);
  const [price, setPrice] = useState<string | number>(0);
  const [usageFrequency, setUsageFrequency] = useState<string | number>(1);
  const [expiryDate, setExpiryDate] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isScanningInvoice, setIsScanningInvoice] = useState(false);
  const [isFetchingImage, setIsFetchingImage] = useState(false);
  const [isPredictingExpiry, setIsPredictingExpiry] = useState(false);
  
  // Duplicate Check State
  const [isDuplicateModalOpen, setIsDuplicateModalOpen] = useState(false);
  const [duplicateItem, setDuplicateItem] = useState<GroceryItem | null>(null);
  const [pendingItem, setPendingItem] = useState<any | null>(null);
  
  // Invoice Review State
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [scannedInvoiceData, setScannedInvoiceData] = useState<{ purchaseDate: string | null, items: any[] } | null>(null);
  const [unitSuggestion, setUnitSuggestion] = useState<{ message: string; type: 'warning' | 'info' } | null>(null);

  const checkUnitLogic = (name: string, unit: string) => {
    const lowerName = name.toLowerCase();
    const lowerUnit = unit.toLowerCase();

    if (lowerName.includes('bread') && lowerUnit.includes('kg')) {
      setUnitSuggestion({ message: "Bread is usually sold in packets or grams. Are you sure about 1kg?", type: 'warning' });
    } else if (lowerName.includes('sugar') && (lowerUnit.includes('packet') || lowerUnit.includes('pc'))) {
      setUnitSuggestion({ message: "Entering sugar in 'kg' helps the AI predict depletion more accurately. Consider switching to kg.", type: 'info' });
    } else if (lowerName.includes('milk') && lowerUnit.includes('kg')) {
      setUnitSuggestion({ message: "Milk is typically measured in 'L' or 'ml'.", type: 'info' });
    } else {
      setUnitSuggestion(null);
    }
  };

  React.useEffect(() => {
    checkUnitLogic(name, unit);
  }, [name, unit]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fileUploadRef = useRef<HTMLInputElement>(null);
  const invoiceInputRef = useRef<HTMLInputElement>(null);
  const invoiceUploadRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) {
      alert("Please enter a product name");
      return;
    }

    const numQuantity = Number(quantity);
    const numUsage = Number(usageFrequency);

    if (isNaN(numQuantity) || numQuantity <= 0 || quantity === '') {
      alert("Please enter a valid quantity");
      return;
    }

    if (isNaN(numUsage) || numUsage <= 0 || usageFrequency === '') {
      alert("Please enter a valid usage frequency");
      return;
    }
    
    let finalExpiryDate = expiryDate;

    // Auto-predict expiry if not provided
    if (!finalExpiryDate) {
      try {
        setIsPredictingExpiry(true);
        const prediction = await predictExpiryDate(name, category);
        finalExpiryDate = prediction.predictedExpiryDate;
        console.log("Predicted expiry date:", prediction);
      } catch (error) {
        console.error("Expiry prediction failed:", error);
      } finally {
        setIsPredictingExpiry(false);
      }
    }

    const newItem: any = {
      name,
      category,
      quantity: numQuantity,
      unit,
      price: Number(price) || 0,
      usageFrequency: numUsage,
      purchaseDate: new Date().toISOString(),
      lastUpdated: new Date().toISOString()
    };

    if (finalExpiryDate) {
      newItem.expiryDate = finalExpiryDate;
    }

    onAdd(newItem);
    
    setName('');
    setQuantity(1);
    setPrice(0);
    setUsageFrequency(1);
    setExpiryDate('');
  };

  const handleImageCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsAnalyzing(true);
    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        const base64 = (reader.result as string).split(',')[1];
        const details = await analyzeProductImage(base64);
        
        const fullName = `${details.brand} ${details.productName}`;
        setName(fullName);
        setCategory(details.category);
        setUnit(details.unit);
        setQuantity(details.suggestedQuantity || 1);

        // Fetch image from web
        setIsFetchingImage(true);
        const imageUrl = await fetchProductImage(fullName);
        setIsFetchingImage(false);

        const newItem = {
          name: fullName,
          category: details.category,
          unit: details.unit,
          quantity: details.suggestedQuantity || 1,
          imageUrl,
          purchaseDate: new Date().toISOString(),
          lastUpdated: new Date().toISOString()
        };

        // Check for duplicates
        const existing = inventory.find(i => i.name.toLowerCase() === fullName.toLowerCase());
        if (existing) {
          setDuplicateItem(existing);
          setPendingItem(newItem);
          setIsDuplicateModalOpen(true);
        }
      } catch (error: any) {
        console.error("Image analysis failed:", error);
        alert(`Product analysis failed: ${error.message || 'Unknown error'}`);
      } finally {
        setIsAnalyzing(false);
        setIsFetchingImage(false);
      }
    };
    reader.onerror = () => {
      console.error("File reading failed");
      setIsAnalyzing(false);
    };
    reader.readAsDataURL(file);
  };

  const handleInvoiceCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsScanningInvoice(true);
    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        const base64 = (reader.result as string).split(',')[1];
        const mimeType = file.type;
        const data = await analyzeInvoice(base64, mimeType);
        setScannedInvoiceData(data);
        setIsInvoiceModalOpen(true);
      } catch (error: any) {
        console.error("Invoice analysis failed:", error);
        
        // Log failure to database for developers
        try {
          if (auth.currentUser) {
            await addDoc(collection(db, 'scanFailures'), {
              timestamp: new Date().toISOString(),
              error: error.message || 'Unknown error during scan',
              mimeType: file.type,
              uid: auth.currentUser.uid,
              userEmail: auth.currentUser.email
            });
          }
        } catch (logError) {
          console.error("Failed to log scan failure:", logError);
        }

        alert(`Invoice analysis failed: ${error.message || 'Unknown error'}`);
      } finally {
        setIsScanningInvoice(false);
      }
    };
    reader.onerror = () => {
      console.error("File reading failed");
      setIsScanningInvoice(false);
    };
    reader.readAsDataURL(file);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="cred-card cred-card-glow-amber p-8"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-10">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-black dark:bg-white rounded-2xl shadow-lg">
            <Plus className="w-6 h-6 text-white dark:text-black" />
          </div>
          <h2 className="text-3xl font-black tracking-tighter">Log Purchase</h2>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => invoiceInputRef.current?.click()}
            disabled={isScanningInvoice}
            className="flex items-center gap-2 px-4 py-3 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 rounded-2xl hover:bg-amber-100 transition-all font-black uppercase tracking-widest text-[10px] disabled:opacity-50"
          >
            {isScanningInvoice ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Camera className="w-4 h-4" />
            )}
            {isScanningInvoice ? 'Scanning...' : 'Scan Invoice'}
          </button>

          <button
            type="button"
            onClick={() => invoiceUploadRef.current?.click()}
            disabled={isScanningInvoice}
            className="flex items-center gap-2 px-4 py-3 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 rounded-2xl hover:bg-amber-100 transition-all font-black uppercase tracking-widest text-[10px] disabled:opacity-50"
          >
            <Upload className="w-4 h-4" />
            Upload Invoice (PDF/Image)
          </button>
          
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isAnalyzing}
            className="flex items-center gap-2 px-4 py-3 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-2xl hover:bg-blue-100 transition-all font-black uppercase tracking-widest text-[10px] disabled:opacity-50"
          >
            {isAnalyzing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Camera className="w-4 h-4" />
            )}
            {isAnalyzing ? 'Analyzing...' : 'Scan Product'}
          </button>

          <button
            type="button"
            onClick={() => fileUploadRef.current?.click()}
            disabled={isAnalyzing}
            className="flex items-center gap-2 px-4 py-3 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-2xl hover:bg-blue-100 transition-all font-black uppercase tracking-widest text-[10px] disabled:opacity-50"
          >
            <Upload className="w-4 h-4" />
            Upload Product
          </button>
        </div>

        <input
          type="file"
          ref={fileInputRef}
          onChange={handleImageCapture}
          accept="image/*"
          capture="environment"
          className="hidden"
        />
        <input
          type="file"
          ref={fileUploadRef}
          onChange={handleImageCapture}
          accept="image/*"
          className="hidden"
        />
        <input
          type="file"
          ref={invoiceInputRef}
          onChange={handleInvoiceCapture}
          accept="image/*,application/pdf"
          capture="environment"
          className="hidden"
        />
        <input
          type="file"
          ref={invoiceUploadRef}
          onChange={handleInvoiceCapture}
          accept="image/*,application/pdf"
          className="hidden"
        />
      </div>

      <InvoiceReviewModal
        isOpen={isInvoiceModalOpen}
        onClose={() => setIsInvoiceModalOpen(false)}
        purchaseDate={scannedInvoiceData?.purchaseDate || null}
        items={scannedInvoiceData?.items || []}
        onConfirm={onAddMultiple}
      />

      <DuplicateCheckModal
        isOpen={isDuplicateModalOpen}
        onClose={() => {
          setIsDuplicateModalOpen(false);
          setDuplicateItem(null);
          setPendingItem(null);
        }}
        itemName={duplicateItem?.name || ''}
        onAddToExisting={() => {
          if (duplicateItem && pendingItem) {
            onUpdateQuantity(duplicateItem.id, duplicateItem.quantity + pendingItem.quantity);
            setIsDuplicateModalOpen(false);
            setDuplicateItem(null);
            setPendingItem(null);
          }
        }}
        onAddNew={() => {
          if (pendingItem) {
            onAdd(pendingItem);
            setIsDuplicateModalOpen(false);
            setDuplicateItem(null);
            setPendingItem(null);
          }
        }}
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-2">Item Name</label>
            <AutocompleteInput
              value={name}
              onChange={setName}
              placeholder="e.g. Milk, Bread"
              className="cred-input"
              required
            />
          </div>

          <div className="space-y-4 col-span-full">
            <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-2">Category</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {CATEGORIES.map(cat => {
                const isActive = category === cat;
                const color = CATEGORY_COLORS[cat] || 'gray';
                const colorClasses: Record<string, string> = {
                  emerald: 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400',
                  blue: 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400',
                  amber: 'border-amber-500 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400',
                  red: 'border-red-500 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400',
                  orange: 'border-orange-500 bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400',
                  sky: 'border-sky-500 bg-sky-50 dark:bg-sky-900/20 text-sky-600 dark:text-sky-400',
                  indigo: 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400',
                  purple: 'border-purple-500 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400',
                  pink: 'border-pink-500 bg-pink-50 dark:bg-pink-900/20 text-pink-600 dark:text-pink-400',
                  gray: 'border-gray-500 bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                };

                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategory(cat)}
                    className={`flex flex-col items-center gap-2 p-3 rounded-2xl border-2 transition-all hover:scale-105 ${
                      isActive 
                        ? colorClasses[color]
                        : 'border-gray-100 dark:border-cred-gray bg-white dark:bg-cred-dark text-gray-500 dark:text-gray-400'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-xl overflow-hidden shadow-sm">
                      <img 
                        src={CATEGORY_IMAGES[cat]} 
                        alt="" 
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-center leading-tight">{cat}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-2">Quantity</label>
              <input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                min="0.1"
                step="0.1"
                className="cred-input"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-2">Unit</label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="cred-input appearance-none"
              >
                {UNITS.map(u => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </div>
          </div>

          <AnimatePresence>
            {unitSuggestion && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className={`p-4 rounded-2xl flex items-start gap-3 border ${
                  unitSuggestion.type === 'warning' 
                    ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-100 dark:border-amber-900/40 text-amber-700 dark:text-amber-400' 
                    : 'bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-900/40 text-blue-700 dark:text-blue-400'
                }`}
              >
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <p className="text-xs font-bold leading-relaxed">{unitSuggestion.message}</p>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-2">Price (Optional)</label>
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              min="0"
              step="0.01"
              className="cred-input"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-2">Usage Frequency (times/day)</label>
            <input
              type="number"
              value={usageFrequency}
              onChange={(e) => setUsageFrequency(e.target.value)}
              min="0.1"
              step="0.1"
              className="cred-input"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-2">Expiry Date (Optional)</label>
            <div className="flex gap-2">
              <input
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                className="cred-input flex-1"
              />
              <button
                type="button"
                onClick={async () => {
                  if (!name) {
                    alert("Please enter an item name first");
                    return;
                  }
                  setIsPredictingExpiry(true);
                  try {
                    const prediction = await predictExpiryDate(name, category);
                    setExpiryDate(prediction.predictedExpiryDate);
                  } catch (error) {
                    console.error("Prediction failed:", error);
                    alert("Could not predict expiry date. Please enter manually.");
                  } finally {
                    setIsPredictingExpiry(false);
                  }
                }}
                disabled={isPredictingExpiry}
                className="px-4 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 rounded-2xl hover:bg-purple-100 transition-all font-black uppercase tracking-widest text-[10px] disabled:opacity-50"
              >
                {isPredictingExpiry ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Predict'}
              </button>
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={isPredictingExpiry}
          className="cred-button-primary w-full flex items-center justify-center gap-3 mt-4 disabled:opacity-50"
        >
          {isPredictingExpiry ? (
            <Loader2 className="w-6 h-6 animate-spin" />
          ) : (
            <ShoppingCart className="w-6 h-6" />
          )}
          {isPredictingExpiry ? 'Predicting Expiry...' : 'Add to Inventory'}
        </button>
      </form>
    </motion.div>
  );
}
