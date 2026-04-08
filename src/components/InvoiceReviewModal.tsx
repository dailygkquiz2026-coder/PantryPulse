import React, { useState } from 'react';
import { X, Save, Trash2, Calendar, Plus, AlertCircle, CheckCircle2, Loader2, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { CATEGORIES, UNITS } from '../constants';
import { predictExpiryDate } from '../services/geminiService';

interface InvoiceItem {
  name: string;
  quantity: number;
  unit: string;
  price: number;
  category: string;
  isGrocery: boolean;
  isUnclear: boolean;
  expiryDate?: string;
}

interface InvoiceReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  purchaseDate: string | null;
  items: InvoiceItem[];
  onConfirm: (items: any[], date: string) => void;
}

export default function InvoiceReviewModal({ isOpen, onClose, purchaseDate, items: initialItems, onConfirm }: InvoiceReviewModalProps) {
  const [items, setItems] = useState<InvoiceItem[]>(initialItems);
  const [date, setDate] = useState(purchaseDate ? new Date(purchaseDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);
  const [confirmedIndices, setConfirmedIndices] = useState<Set<number>>(new Set());
  const [skippedIndices, setSkippedIndices] = useState<Set<number>>(new Set());
  const [isPredictingAll, setIsPredictingAll] = useState(false);
  const [predictingIndices, setPredictingIndices] = useState<Set<number>>(new Set());

  // Sync state with props when modal opens or items change
  React.useEffect(() => {
    if (isOpen) {
      setItems(initialItems);
      setConfirmedIndices(new Set());
      setSkippedIndices(new Set());
      if (purchaseDate) {
        setDate(new Date(purchaseDate).toISOString().split('T')[0]);
      } else {
        setDate(new Date().toISOString().split('T')[0]);
      }
    }
  }, [isOpen, initialItems, purchaseDate]);

  const handleUpdateItem = (index: number, updates: Partial<InvoiceItem>) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], ...updates };
    setItems(newItems);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
    const newConfirmed = new Set(confirmedIndices);
    newConfirmed.delete(index);
    setConfirmedIndices(newConfirmed);
    const newSkipped = new Set(skippedIndices);
    newSkipped.delete(index);
    setSkippedIndices(newSkipped);
  };

  const handleToggleConfirm = (index: number) => {
    const newConfirmed = new Set(confirmedIndices);
    if (newConfirmed.has(index)) {
      newConfirmed.delete(index);
    } else {
      newConfirmed.add(index);
      const newSkipped = new Set(skippedIndices);
      newSkipped.delete(index);
      setSkippedIndices(newSkipped);
    }
    setConfirmedIndices(newConfirmed);
  };

  const handleToggleSkip = (index: number) => {
    const newSkipped = new Set(skippedIndices);
    if (newSkipped.has(index)) {
      newSkipped.delete(index);
    } else {
      newSkipped.add(index);
      const newConfirmed = new Set(confirmedIndices);
      newConfirmed.delete(index);
      setConfirmedIndices(newConfirmed);
    }
    setSkippedIndices(newSkipped);
  };

  const handleAddItem = () => {
    setItems([...items, { name: '', quantity: 1, unit: UNITS[0], price: 0, category: CATEGORIES[0], isGrocery: true, isUnclear: false, expiryDate: '' }]);
  };

  const handlePredictExpiry = async (index: number) => {
    const item = items[index];
    if (!item.name) return;

    setPredictingIndices(prev => new Set(prev).add(index));
    try {
      const prediction = await predictExpiryDate(item.name, item.category);
      handleUpdateItem(index, { expiryDate: prediction.predictedExpiryDate });
    } catch (error) {
      console.error("Prediction failed for item:", item.name, error);
    } finally {
      setPredictingIndices(prev => {
        const next = new Set(prev);
        next.delete(index);
        return next;
      });
    }
  };

  const handlePredictAll = async () => {
    setIsPredictingAll(true);
    const indicesToPredict = items
      .map((item, index) => (!item.expiryDate ? index : -1))
      .filter(index => index !== -1);

    // Predict in batches of 3 to avoid rate limits/timeouts
    for (let i = 0; i < indicesToPredict.length; i += 3) {
      const batch = indicesToPredict.slice(i, i + 3);
      await Promise.all(batch.map(index => handlePredictExpiry(index)));
    }
    setIsPredictingAll(false);
  };

  const handleConfirmAll = () => {
    const finalItems = items.map(item => ({
      ...item,
      purchaseDate: new Date(date).toISOString(),
      lastUpdated: new Date().toISOString(),
      usageFrequency: 1
    }));
    onConfirm(finalItems, date);
    onClose();
  };

  const handleConfirmSelected = () => {
    const selectedItems = items.filter((_, index) => confirmedIndices.has(index)).map(item => ({
      ...item,
      purchaseDate: new Date(date).toISOString(),
      lastUpdated: new Date().toISOString(),
      usageFrequency: 1
    }));
    
    if (selectedItems.length === 0) {
      alert("Please select at least one item to confirm");
      return;
    }

    onConfirm(selectedItems, date);
    onClose();
  };

  const allProcessed = (confirmedIndices.size + skippedIndices.size) === items.length;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center sm:p-4 bg-black/40 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="bg-white dark:bg-cred-black w-full h-full sm:h-auto sm:max-w-4xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col sm:max-h-[90vh] border border-white/10"
          >
            <div className="p-4 sm:p-6 border-b border-gray-100 dark:border-white/5 flex items-center justify-between bg-amber-600 text-white">
              <div>
                <h2 className="text-xl sm:text-2xl font-black tracking-tighter">Review Invoice</h2>
                <p className="text-amber-100 text-[10px] sm:text-xs font-medium uppercase tracking-widest opacity-80">Verify and confirm items to add</p>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-all">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-4 sm:p-6 bg-gray-50 dark:bg-cred-gray/50 border-b border-gray-100 dark:border-white/5 flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-gray-400" />
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Purchase Date</span>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="cred-input py-2 px-4 text-sm w-full sm:w-auto"
                />
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-full border border-blue-100 dark:border-blue-900/40 text-[10px] font-black uppercase tracking-widest">
                  {confirmedIndices.size} Confirmed
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 dark:bg-gray-800 text-gray-400 rounded-full border border-gray-100 dark:border-white/5 text-[10px] font-black uppercase tracking-widest">
                  {skippedIndices.size} Skipped
                </div>
                <button
                  onClick={handlePredictAll}
                  disabled={isPredictingAll}
                  className="flex items-center gap-2 px-3 py-1.5 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 rounded-full border border-purple-100 dark:border-purple-900/40 text-[10px] font-black uppercase tracking-widest hover:bg-purple-100 transition-all disabled:opacity-50"
                >
                  {isPredictingAll ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                  Predict All Expiry
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-white dark:bg-cred-black">
              {items.map((item, index) => {
                const isConfirmed = confirmedIndices.has(index);
                const isSkipped = skippedIndices.has(index);
                
                return (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={`p-4 sm:p-5 rounded-2xl border transition-all ${
                      isConfirmed 
                        ? 'bg-emerald-50/50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-900/40' 
                        : isSkipped
                        ? 'bg-gray-50/50 dark:bg-gray-900/10 border-gray-200 dark:border-white/5 opacity-60'
                        : 'bg-white dark:bg-cred-gray border-gray-100 dark:border-white/5 shadow-sm'
                    }`}
                  >
                    <div className="flex flex-col gap-4">
                      <div className="w-full space-y-1">
                        <div className="flex items-center gap-2 ml-2">
                          <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Item Name</label>
                          {item.isUnclear && (
                            <span className="flex items-center gap-1 px-2 py-0.5 bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 rounded text-[8px] font-black uppercase tracking-tighter">
                              <AlertCircle className="w-2 h-2" /> Unclear
                            </span>
                          )}
                          {!item.isGrocery && (
                            <span className="flex items-center gap-1 px-2 py-0.5 bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 rounded text-[8px] font-black uppercase tracking-tighter">
                              <X className="w-2 h-2" /> Non-Grocery
                            </span>
                          )}
                        </div>
                        <input
                          type="text"
                          value={item.name}
                          onChange={(e) => handleUpdateItem(index, { name: e.target.value })}
                          className="cred-input py-2 px-4 text-sm"
                        />
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-2">Qty</label>
                          <input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => handleUpdateItem(index, { quantity: Number(e.target.value) })}
                            className="cred-input py-2 px-4 text-sm"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-2">Unit</label>
                          <select
                            value={item.unit}
                            onChange={(e) => handleUpdateItem(index, { unit: e.target.value })}
                            className="cred-input py-2 px-4 text-sm appearance-none"
                          >
                            {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                          </select>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-2">Price</label>
                          <input
                            type="number"
                            value={item.price}
                            onChange={(e) => handleUpdateItem(index, { price: Number(e.target.value) })}
                            className="cred-input py-2 px-4 text-sm"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-2">Category</label>
                          <select
                            value={item.category}
                            onChange={(e) => handleUpdateItem(index, { category: e.target.value })}
                            className="cred-input py-2 px-4 text-sm appearance-none"
                          >
                            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-2">Expiry Date</label>
                          <div className="flex gap-2">
                            <input
                              type="date"
                              value={item.expiryDate || ''}
                              onChange={(e) => handleUpdateItem(index, { expiryDate: e.target.value })}
                              className="cred-input py-2 px-4 text-sm"
                            />
                            <button
                              onClick={() => handlePredictExpiry(index)}
                              disabled={predictingIndices.has(index)}
                              className="p-2 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 rounded-xl hover:bg-purple-100 transition-all disabled:opacity-50"
                              title="Predict Expiry"
                            >
                              {predictingIndices.has(index) ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-2 pt-2 border-t border-gray-100 dark:border-white/5">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleToggleConfirm(index)}
                            className={`px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 font-black uppercase tracking-widest text-[9px] ${
                              isConfirmed 
                                ? 'bg-emerald-600 text-white' 
                                : 'bg-gray-100 dark:bg-gray-800 text-gray-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 hover:text-emerald-600'
                            }`}
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            {isConfirmed ? 'Confirmed' : 'Confirm'}
                          </button>
                          <button
                            onClick={() => handleToggleSkip(index)}
                            className={`px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 font-black uppercase tracking-widest text-[9px] ${
                              isSkipped 
                                ? 'bg-red-600 text-white' 
                                : 'bg-gray-100 dark:bg-gray-800 text-gray-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600'
                            }`}
                          >
                            <X className="w-4 h-4" />
                            {isSkipped ? 'Skipped' : 'Skip'}
                          </button>
                        </div>
                        <button
                          onClick={() => handleRemoveItem(index)}
                          className="p-2.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}

              <button
                onClick={handleAddItem}
                className="w-full py-6 border-2 border-dashed border-gray-200 dark:border-white/10 rounded-2xl text-gray-400 hover:text-amber-600 dark:hover:text-amber-400 hover:border-amber-200 dark:hover:border-amber-900/40 hover:bg-amber-50 dark:hover:bg-amber-900/10 transition-all flex items-center justify-center gap-3 font-bold uppercase tracking-widest text-xs"
              >
                <Plus className="w-5 h-5" />
                Add Another Item
              </button>
            </div>

            <div className="p-4 sm:p-6 border-t border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-cred-gray/50 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  {items.length} total items found
                </p>
                <button
                  onClick={onClose}
                  className="sm:hidden text-[10px] font-black text-gray-400 uppercase tracking-widest"
                >
                  Close
                </button>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 sm:justify-end">
                <button
                  onClick={onClose}
                  className="hidden sm:block px-8 py-4 text-gray-600 dark:text-gray-400 font-bold hover:bg-gray-100 dark:hover:bg-cred-dark rounded-2xl transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmSelected}
                  disabled={confirmedIndices.size === 0}
                  className="w-full sm:w-auto px-6 py-4 bg-white dark:bg-cred-gray border border-gray-200 dark:border-white/10 text-black dark:text-white font-bold rounded-2xl hover:bg-gray-50 dark:hover:bg-cred-dark transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                >
                  <Save className="w-5 h-5" />
                  Add Confirmed ({confirmedIndices.size})
                </button>
                <button
                  onClick={handleConfirmAll}
                  className="w-full sm:w-auto px-8 py-4 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-2xl shadow-lg shadow-amber-200 dark:shadow-none transition-all flex items-center justify-center gap-3"
                >
                  <Save className="w-5 h-5" />
                  Add All
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
