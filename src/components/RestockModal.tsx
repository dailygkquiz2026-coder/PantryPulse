import React, { useState } from 'react';
import { ShoppingListItem } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { ShoppingBag, CheckCircle2, X, Info } from 'lucide-react';
import { UNITS, CATEGORIES } from '../constants';

interface RestockModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: ShoppingListItem | null;
  onConfirm: (item: ShoppingListItem) => void;
  onSkip: (item: ShoppingListItem) => void;
}

export default function RestockModal({ isOpen, onClose, item, onConfirm, onSkip }: RestockModalProps) {
  const [quantity, setQuantity] = useState<string | number>(item?.quantity || 1);
  const [unit, setUnit] = useState(item?.unit || 'pcs');
  const [category, setCategory] = useState(item?.category || 'Other');
  const [usageFrequency, setUsageFrequency] = useState<string | number>(item?.usageFrequency || 1);

  React.useEffect(() => {
    if (item) {
      setQuantity(item.quantity);
      setUnit(item.unit);
      setCategory(item.category);
      setUsageFrequency(item.usageFrequency);
    }
  }, [item]);

  if (!item) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center sm:p-4 bg-black/40 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="cred-card w-full h-full sm:h-auto sm:max-w-md sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col sm:max-h-[90vh]"
          >
            <div className="p-6 border-b border-white/5 flex items-center justify-between bg-green-500/10 shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500/20 rounded-xl">
                  <ShoppingBag className="w-6 h-6 text-green-400" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Add to Inventory?</h2>
                  <p className="text-sm text-gray-400">You just bought <span className="font-semibold text-green-400">{item.name}</span></p>
                </div>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-cred-gray rounded-full transition-all">
                <X className="w-6 h-6 text-gray-400" />
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              <div className="bg-blue-500/10 p-4 rounded-2xl flex gap-3 items-start border border-blue-500/20">
                <Info className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                <p className="text-sm text-blue-300 leading-relaxed font-medium">
                  Confirm the details below to add this item back to your pantry. This will help recalculate your next restock date.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Quantity</label>
                  <input
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="w-full px-6 py-4 rounded-xl bg-white text-black font-bold outline-none focus:ring-2 focus:ring-green-500 transition-all shadow-inner"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Unit</label>
                  <select
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    className="w-full px-6 py-4 rounded-xl bg-white text-black font-bold outline-none focus:ring-2 focus:ring-green-500 transition-all shadow-inner appearance-none border-r-8 border-transparent"
                  >
                    {UNITS.map(u => (
                      <option key={u} value={u} className="text-black bg-white">{u}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1 col-span-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-6 py-4 rounded-xl bg-white text-black font-bold outline-none focus:ring-2 focus:ring-green-500 transition-all shadow-inner appearance-none border-r-8 border-transparent"
                  >
                    {CATEGORIES.map(cat => (
                      <option key={cat} value={cat} className="text-black bg-white">{cat}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1 col-span-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Usage (x/day)</label>
                  <input
                    type="number"
                    value={usageFrequency}
                    onChange={(e) => setUsageFrequency(e.target.value)}
                    className="w-full px-6 py-4 rounded-xl bg-white text-black font-bold outline-none focus:ring-2 focus:ring-green-500 transition-all shadow-inner"
                  />
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-white/5 bg-cred-gray/50 flex flex-col sm:flex-row gap-3 shrink-0 mt-auto sm:mt-0">
              <button
                onClick={() => onSkip(item)}
                className="w-full sm:flex-1 px-6 py-3 bg-cred-gray border border-white/10 text-gray-300 font-bold rounded-xl hover:bg-cred-dark transition-all"
              >
                Skip
              </button>
              <button
                onClick={() => {
                  const numQty = Number(quantity);
                  const numUsage = Number(usageFrequency);
                  if (isNaN(numQty) || numQty <= 0 || quantity === '') {
                    alert("Please enter a valid quantity");
                    return;
                  }
                  if (isNaN(numUsage) || numUsage <= 0 || usageFrequency === '') {
                    alert("Please enter a valid usage frequency");
                    return;
                  }
                  onConfirm({ ...item, quantity: numQty, unit, category, usageFrequency: numUsage });
                }}
                className="w-full sm:flex-1 px-6 py-3 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-green-200 dark:shadow-none"
              >
                <CheckCircle2 className="w-5 h-5" />
                Add to Pantry
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
