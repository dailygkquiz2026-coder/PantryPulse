import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, ShoppingBag, X, CheckCircle2 } from 'lucide-react';
import { GroceryItem } from '../types';

interface StockoutConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: GroceryItem[];
  onConfirm: (items: GroceryItem[]) => void;
}

export default function StockoutConfirmationModal({ isOpen, onClose, items, onConfirm }: StockoutConfirmationModalProps) {
  if (!isOpen || items.length === 0) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="cred-card w-full max-w-lg p-8 relative overflow-hidden"
        >
          {/* Background Decoration */}
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl" />

          <div className="relative z-10">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 rounded-2xl flex items-center justify-center shadow-inner">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-2xl font-black tracking-tight">Stockout Alert</h2>
                  <p className="text-sm text-gray-500 font-medium">Predicted to be out of stock</p>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="p-2 hover:bg-gray-100 dark:hover:bg-cred-gray rounded-xl transition-colors"
              >
                <X className="w-6 h-6 text-gray-400" />
              </button>
            </div>

            <div className="space-y-4 mb-8">
              <p className="text-gray-600 dark:text-gray-300 font-medium leading-relaxed">
                Based on your usage patterns, the following items should have been depleted by now. 
                <span className="block mt-2 font-bold text-gray-900 dark:text-white">Would you like to move them to your shopping list?</span>
              </p>

              <div className="max-h-60 overflow-y-auto pr-2 space-y-2 custom-scrollbar">
                {items.map((item) => (
                  <div 
                    key={item.id}
                    className="flex items-center justify-between p-4 bg-gray-50 dark:bg-cred-gray/30 border border-gray-100 dark:border-white/5 rounded-2xl"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
                      <div>
                        <p className="font-bold text-sm">{item.name}</p>
                        <p className="text-[10px] text-gray-400 uppercase tracking-widest font-black">
                          {item.quantity} {item.unit} • {item.usageFrequency}x/day
                        </p>
                      </div>
                    </div>
                    <CheckCircle2 className="w-5 h-5 text-blue-600 dark:text-cred-accent" />
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={onClose}
                className="flex-1 px-6 py-4 bg-gray-100 dark:bg-cred-gray hover:bg-gray-200 dark:hover:bg-cred-dark text-gray-600 dark:text-gray-300 font-black uppercase tracking-widest text-xs rounded-2xl transition-all"
              >
                No, Keep in Pantry
              </button>
              <button
                onClick={() => onConfirm(items)}
                className="flex-1 px-6 py-4 bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-widest text-xs rounded-2xl transition-all shadow-lg shadow-blue-200 dark:shadow-none flex items-center justify-center gap-2"
              >
                <ShoppingBag className="w-4 h-4" />
                Yes, Move to List
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
