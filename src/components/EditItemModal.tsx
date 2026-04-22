import React, { useState, useEffect } from 'react';
import { GroceryItem } from '../types';
import { CATEGORIES, UNITS } from '../constants';
import { X, Save } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface EditItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: GroceryItem | null;
  onUpdate: (id: string, updates: Partial<GroceryItem>) => void;
}

export default function EditItemModal({ isOpen, onClose, item, onUpdate }: EditItemModalProps) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [quantity, setQuantity] = useState<string | number>(0);
  const [unit, setUnit] = useState('');
  const [usageFrequency, setUsageFrequency] = useState<string | number>(0);
  const [expiryDate, setExpiryDate] = useState('');

  useEffect(() => {
    if (item) {
      setName(item.name);
      setCategory(item.category);
      setQuantity(item.quantity);
      setUnit(item.unit);
      setUsageFrequency(item.usageFrequency);
      setExpiryDate(item.expiryDate || '');
    }
  }, [item]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!item) return;

    const numQty = Number(quantity);
    const numUsage = Number(usageFrequency);

    if (isNaN(numQty) || quantity === '') {
      alert("Please enter a valid quantity");
      return;
    }

    if (isNaN(numUsage) || numUsage <= 0 || usageFrequency === '') {
      alert("Please enter a valid usage frequency");
      return;
    }
    
    const updates: Partial<GroceryItem> = {
      name,
      category,
      quantity: numQty,
      unit,
      usageFrequency: numUsage,
      lastUpdated: new Date().toISOString()
    };
    
    if (expiryDate) {
      updates.expiryDate = expiryDate;
    }

    onUpdate(item.id, updates);
  };

  return (
    <AnimatePresence>
      {isOpen && item && (
        <div className="fixed inset-0 z-50 flex items-center justify-center sm:p-4 bg-black/40 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="cred-card w-full h-full sm:h-auto sm:max-w-md sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col sm:max-h-[90vh]"
          >
            <div className="p-6 border-b border-white/5 flex items-center justify-between shrink-0 bg-white/5">
              <h2 className="text-xl font-bold">Edit Item</h2>
              <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-all">
                <X className="w-6 h-6 text-gray-400" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-2">Item Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="cred-input"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-2">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="cred-input appearance-none"
                >
                  {CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-2">Quantity</label>
                  <input
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    min="0"
                    step="0.1"
                    className="cred-input"
                    required
                  />
                </div>
                <div className="space-y-1">
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

              <div className="space-y-1">
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

              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-2">Expiry Date (Optional)</label>
                <input
                  type="date"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                  className="cred-input"
                />
              </div>

              <div className="pt-4 sm:pt-0">
                <button
                  type="submit"
                  className="cred-button-primary w-full flex items-center justify-center gap-2"
                >
                  <Save className="w-5 h-5" />
                  Save Changes
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
