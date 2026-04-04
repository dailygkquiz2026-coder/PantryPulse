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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden"
          >
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-amber-50/50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-100 rounded-xl">
                  <TrendingDown className="w-6 h-6 text-amber-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Update Quantity</h2>
                  <p className="text-sm text-gray-500">Correcting inventory for <span className="font-semibold text-amber-600">{item.name}</span></p>
                </div>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-all">
                <X className="w-6 h-6 text-gray-400" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-amber-50 p-4 rounded-2xl flex gap-3 items-start border border-amber-100">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-sm text-amber-700 leading-relaxed">
                  Enter the estimated quantity left. This will help the AI recalculate your probable reordering date.
                </p>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Estimated Quantity Left ({item.unit})</label>
                <input
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                  min="0"
                  step="0.1"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-amber-500 outline-none text-lg font-semibold"
                />
              </div>
            </div>

            <div className="p-6 border-t border-gray-100 bg-gray-50 flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 px-6 py-3 bg-white border border-gray-200 text-gray-600 font-bold rounded-xl hover:bg-gray-100 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => onConfirm(item.id, quantity)}
                className="flex-1 px-6 py-3 bg-amber-600 text-white font-bold rounded-xl hover:bg-amber-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-200"
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
