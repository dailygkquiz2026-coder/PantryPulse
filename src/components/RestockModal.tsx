import React, { useState } from 'react';
import { ShoppingListItem } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { ShoppingBag, CheckCircle2, X, Info } from 'lucide-react';

interface RestockModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: ShoppingListItem | null;
  onConfirm: (item: ShoppingListItem) => void;
  onSkip: (item: ShoppingListItem) => void;
}

export default function RestockModal({ isOpen, onClose, item, onConfirm, onSkip }: RestockModalProps) {
  const [quantity, setQuantity] = useState(item?.quantity || 1);
  const [usageFrequency, setUsageFrequency] = useState(item?.usageFrequency || 1);

  React.useEffect(() => {
    if (item) {
      setQuantity(item.quantity);
      setUsageFrequency(item.usageFrequency);
    }
  }, [item]);

  if (!item) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="bg-white dark:bg-cred-black w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border border-white/10 flex flex-col max-h-[90vh]"
          >
            <div className="p-6 border-b border-gray-100 dark:border-white/5 flex items-center justify-between bg-green-50/50 dark:bg-green-950/20 shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 dark:bg-green-900/40 rounded-xl">
                  <ShoppingBag className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">Add to Inventory?</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">You just bought <span className="font-semibold text-green-600 dark:text-green-400">{item.name}</span></p>
                </div>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-cred-gray rounded-full transition-all">
                <X className="w-6 h-6 text-gray-400" />
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-2xl flex gap-3 items-start border border-blue-100 dark:border-blue-900/40">
                <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                <p className="text-sm text-blue-700 dark:text-blue-300 leading-relaxed font-medium">
                  Confirm the details below to add this item back to your pantry. This will help recalculate your next restock date.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-2">Quantity</label>
                  <input
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(Number(e.target.value))}
                    className="cred-input"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-2">Usage (x/day)</label>
                  <input
                    type="number"
                    value={usageFrequency}
                    onChange={(e) => setUsageFrequency(Number(e.target.value))}
                    className="cred-input"
                  />
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-cred-gray/50 flex gap-3 shrink-0">
              <button
                onClick={() => onSkip(item)}
                className="flex-1 px-6 py-3 bg-white dark:bg-cred-gray border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-300 font-bold rounded-xl hover:bg-gray-100 dark:hover:bg-cred-dark transition-all"
              >
                Skip
              </button>
              <button
                onClick={() => onConfirm({ ...item, quantity, usageFrequency })}
                className="flex-1 px-6 py-3 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-green-200 dark:shadow-none"
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
