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
  const [quantity, setQuantity] = useState(0);
  const [unit, setUnit] = useState('');
  const [usageFrequency, setUsageFrequency] = useState(0);
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
    
    const updates: Partial<GroceryItem> = {
      name,
      category,
      quantity,
      unit,
      usageFrequency,
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="bg-white dark:bg-cred-black w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border border-white/10"
          >
            <div className="p-6 border-b border-gray-100 dark:border-cred-gray flex items-center justify-between">
              <h2 className="text-xl font-bold">Edit Item</h2>
              <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-all">
                <X className="w-6 h-6 text-gray-400" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
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
                    onChange={(e) => setQuantity(Number(e.target.value))}
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
                  onChange={(e) => setUsageFrequency(Number(e.target.value))}
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

              <button
                type="submit"
                className="cred-button-primary w-full flex items-center justify-center gap-2 mt-4"
              >
                <Save className="w-5 h-5" />
                Save Changes
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
