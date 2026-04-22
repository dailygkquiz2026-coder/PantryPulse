import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, ShoppingBag, X, CheckCircle2, Circle, Check } from 'lucide-react';
import { GroceryItem } from '../types';

interface StockoutConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: GroceryItem[];
  onConfirm: (selectedItems: GroceryItem[], unselectedItems: GroceryItem[]) => void;
}

export default function StockoutConfirmationModal({ isOpen, onClose, items, onConfirm }: StockoutConfirmationModalProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (isOpen) {
      // By default, select all items as out of stock
      setSelectedIds(new Set(items.map(i => i.id)));
    }
  }, [isOpen, items]);

  if (!isOpen || items.length === 0) return null;

  const toggleItem = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleApply = () => {
    const selectedItems = items.filter(i => selectedIds.has(i.id));
    const unselectedItems = items.filter(i => !selectedIds.has(i.id));
    onConfirm(selectedItems, unselectedItems);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 100 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 100 }}
          className="cred-card w-full max-w-lg p-6 sm:p-8 relative overflow-hidden rounded-t-[2.5rem] sm:rounded-[2.5rem]"
        >
          {/* Background Decoration */}
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10">
            {/* Handle for mobile drawer feel */}
            <div className="w-12 h-1.5 bg-gray-200 dark:bg-white/10 rounded-full mx-auto mb-6 sm:hidden" />

            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 rounded-2xl flex items-center justify-center shadow-inner shrink-0">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-2xl font-black tracking-tight text-gray-900 dark:text-white">Inventory Check</h2>
                  <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest">Verify stock levels</p>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="p-2 hover:bg-gray-100 dark:hover:bg-cred-gray rounded-xl transition-colors"
              >
                <X className="w-6 h-6 text-gray-400" />
              </button>
            </div>

            <div className="space-y-6 mb-8">
              <p className="text-sm text-gray-600 dark:text-gray-400 font-medium leading-relaxed">
                Our AI predicts these items are <span className="text-amber-500 font-bold uppercase tracking-tight">running extremely low</span> or <span className="text-red-500 font-bold uppercase tracking-tight">out of stock</span>. 
                Check items to move them to your <span className="text-blue-500 font-bold uppercase tracking-tight">shopping list</span>.
              </p>

              <div className="max-h-[40vh] overflow-y-auto -mx-2 px-2 py-1 space-y-3 custom-scrollbar">
                {items.map((item) => {
                  const isSelected = selectedIds.has(item.id);
                  return (
                    <motion.button
                      key={item.id}
                      onClick={() => toggleItem(item.id)}
                      whileTap={{ scale: 0.98 }}
                      className={`w-full flex items-center justify-between p-4 rounded-[1.5rem] border-2 transition-all text-left ${
                        isSelected 
                          ? 'bg-blue-50/50 dark:bg-blue-500/10 border-blue-500/50' 
                          : 'bg-gray-50/50 dark:bg-white/5 border-transparent hover:border-gray-200 dark:hover:border-white/10'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                          isSelected ? 'bg-blue-500 border-blue-500 text-white' : 'border-gray-300 dark:border-white/10'
                        }`}>
                          {isSelected && <Check className="w-4 h-4" />}
                        </div>
                        <div>
                          <p className={`font-bold text-sm transition-colors ${isSelected ? 'text-blue-600 dark:text-blue-400' : 'text-gray-900 dark:text-white'}`}>
                            {item.name}
                          </p>
                          <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest">
                            Stock: {item.quantity} {item.unit}
                          </p>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-lg ${
                          isSelected ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600' : 'bg-gray-100 dark:bg-white/5 text-gray-500'
                        }`}>
                          {isSelected ? 'Out of Stock' : 'In Pantry'}
                        </span>
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <button
                onClick={handleApply}
                className={`w-full px-6 py-5 text-white font-black uppercase tracking-widest text-xs rounded-2xl transition-all shadow-xl dark:shadow-none flex items-center justify-center gap-3 active:scale-95 ${
                  selectedIds.size > 0 
                    ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/20' 
                    : 'bg-green-600 hover:bg-green-700 shadow-green-500/20'
                }`}
              >
                {selectedIds.size > 0 ? (
                  <>
                    <ShoppingBag className="w-4 h-4" />
                    Move {selectedIds.size} to List
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    Everything is still here
                  </>
                )}
              </button>
              
              <button
                onClick={onClose}
                className="w-full px-6 py-4 bg-transparent hover:bg-gray-100 dark:hover:bg-white/5 text-gray-500 dark:text-gray-400 font-black uppercase tracking-widest text-[10px] rounded-2xl transition-all"
              >
                Remind me later
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
