import React from 'react';
import { GroceryItem } from '../types';
import { AlertTriangle, Trash2, X, Calendar } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ExpiringItemsModalProps {
  isOpen: boolean;
  onClose: () => void;
  expiringItems: GroceryItem[];
  expiredItems: GroceryItem[];
  onRemoveItem: (id: string) => void;
}

export default function ExpiringItemsModal({
  isOpen,
  onClose,
  expiringItems,
  expiredItems,
  onRemoveItem
}: ExpiringItemsModalProps) {
  if (!isOpen || (expiringItems.length === 0 && expiredItems.length === 0)) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        />
        
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="relative w-full max-w-lg bg-white dark:bg-cred-black rounded-[2.5rem] shadow-2xl overflow-hidden border border-gray-100 dark:border-white/10 flex flex-col max-h-[90vh]"
        >
          <div className="p-8 flex flex-col h-full">
            <div className="flex items-center justify-between mb-8 shrink-0">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-amber-100 dark:bg-amber-900/40 rounded-2xl">
                  <AlertTriangle className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                </div>
                <h2 className="text-2xl font-black tracking-tight">Inventory Warning</h2>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-cred-gray rounded-xl transition-all">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
              {expiredItems.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-xs font-black uppercase tracking-widest text-red-500">Items Expired</h3>
                  {expiredItems.map(item => (
                    <div key={item.id} className="flex items-center justify-between p-4 bg-red-50 dark:bg-red-950/20 rounded-2xl border border-red-100 dark:border-red-900/30">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-red-100 dark:bg-red-900/40 rounded-xl flex items-center justify-center">
                          <Trash2 className="w-5 h-5 text-red-600 dark:text-red-400" />
                        </div>
                        <div>
                          <p className="font-bold text-gray-900 dark:text-white">{item.name}</p>
                          <p className="text-xs text-red-600 dark:text-red-400 font-medium">Expired on {new Date(item.expiryDate!).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => onRemoveItem(item.id)}
                        className="px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-all font-bold text-xs"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {expiringItems.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-xs font-black uppercase tracking-widest text-amber-500">Expiring Soon</h3>
                  {expiringItems.map(item => (
                    <div key={item.id} className="flex items-center justify-between p-4 bg-amber-50 dark:bg-amber-950/20 rounded-2xl border border-amber-100 dark:border-amber-900/30">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/40 rounded-xl flex items-center justify-center">
                          <Calendar className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                        </div>
                        <div>
                          <p className="font-bold text-gray-900 dark:text-white">{item.name}</p>
                          <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">Expires on {new Date(item.expiryDate!).toLocaleDateString()}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={onClose}
              className="w-full mt-8 py-4 bg-black dark:bg-white text-white dark:text-black rounded-2xl font-black uppercase tracking-widest text-sm hover:opacity-90 transition-all shrink-0"
            >
              Got it
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
