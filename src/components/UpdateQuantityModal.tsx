import React, { useState } from 'react';
import { GroceryItem } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, CheckCircle2, X, TrendingDown } from 'lucide-react';

interface UpdateQuantityModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: GroceryItem | null;
  onConfirm: (id: string, newQuantity: number) => void;
}

export default function UpdateQuantityModal({ isOpen, onClose, item, onConfirm }: UpdateQuantityModalProps) {
  const [quantity, setQuantity] = useState(item?.quantity || 0);

  React.useEffect(() => {
    if (item) setQuantity(item.quantity);
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
            className="bg-white dark:bg-cred-black w-full h-full sm:h-auto sm:max-w-md sm:rounded-3xl shadow-2xl overflow-hidden border border-white/10 flex flex-col sm:max-h-[90vh]"
          >
            <div className="p-6 border-b border-gray-100 dark:border-white/5 flex items-center justify-between bg-amber-50/50 dark:bg-amber-950/20 shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-100 dark:bg-amber-900/40 rounded-xl">
                  <TrendingDown className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">Update Quantity</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Correcting inventory for <span className="font-semibold text-amber-600 dark:text-amber-400">{item.name}</span></p>
                </div>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-cred-gray rounded-xl transition-all">
                <X className="w-6 h-6 text-gray-400" />
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-2xl flex gap-3 items-start border border-amber-100 dark:border-amber-900/40">
                <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <p className="text-sm text-amber-700 dark:text-amber-300 leading-relaxed font-medium">
                  Enter the estimated quantity left. This will help the AI recalculate your probable reordering date.
                </p>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-2">Estimated Quantity Left ({item.unit})</label>
                <input
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                  min="0"
                  step="0.1"
                  className="cred-input text-lg font-bold"
                />
              </div>
            </div>

            <div className="p-6 border-t border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-cred-gray/50 flex flex-col sm:flex-row gap-3 shrink-0 mt-auto sm:mt-0">
              <button
                onClick={onClose}
                className="w-full sm:flex-1 px-6 py-3 bg-white dark:bg-cred-gray border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-300 font-bold rounded-xl hover:bg-gray-100 dark:hover:bg-cred-dark transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => onConfirm(item.id, quantity)}
                className="w-full sm:flex-1 px-6 py-3 bg-amber-600 text-white font-bold rounded-xl hover:bg-amber-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-200 dark:shadow-none"
              >
                <CheckCircle2 className="w-5 h-5" />
                Update Stock
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
