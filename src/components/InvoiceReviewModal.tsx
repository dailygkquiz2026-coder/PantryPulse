import React, { useState } from 'react';
import { X, Save, Trash2, Calendar, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { CATEGORIES, UNITS } from '../constants';

interface InvoiceItem {
  name: string;
  quantity: number;
  unit: string;
  price: number;
  category: string;
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
  const [showDatePicker, setShowDatePicker] = useState(!purchaseDate);

  const handleUpdateItem = (index: number, updates: Partial<InvoiceItem>) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], ...updates };
    setItems(newItems);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleAddItem = () => {
    setItems([...items, { name: '', quantity: 1, unit: UNITS[0], price: 0, category: CATEGORIES[0] }]);
  };

  const handleConfirm = () => {
    const finalItems = items.map(item => ({
      ...item,
      purchaseDate: new Date(date).toISOString(),
      lastUpdated: new Date().toISOString(),
      usageFrequency: 1 // Default
    }));
    onConfirm(finalItems, date);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
          >
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-blue-600 text-white">
              <div>
                <h2 className="text-2xl font-bold">Review Invoice</h2>
                <p className="text-blue-100 text-sm">Verify and edit the extracted items</p>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-all">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 bg-gray-50 border-b border-gray-100 flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-gray-400" />
                <span className="text-sm font-medium text-gray-700">Purchase Date:</span>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="px-3 py-1 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                />
              </div>
              {!purchaseDate && (
                <span className="text-xs text-amber-600 font-medium bg-amber-50 px-2 py-1 rounded-full">
                  Date not found on invoice, using current date.
                </span>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {items.map((item, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-wrap gap-4 items-end"
                >
                  <div className="flex-1 min-w-[200px] space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Item Name</label>
                    <input
                      type="text"
                      value={item.name}
                      onChange={(e) => handleUpdateItem(index, { name: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-gray-100 focus:border-blue-500 outline-none text-sm"
                    />
                  </div>

                  <div className="w-24 space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Qty</label>
                    <input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => handleUpdateItem(index, { quantity: Number(e.target.value) })}
                      className="w-full px-3 py-2 rounded-xl border border-gray-100 focus:border-blue-500 outline-none text-sm"
                    />
                  </div>

                  <div className="w-24 space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Unit</label>
                    <select
                      value={item.unit}
                      onChange={(e) => handleUpdateItem(index, { unit: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-gray-100 focus:border-blue-500 outline-none text-sm"
                    >
                      {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                    </select>
                  </div>

                  <div className="w-28 space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Price</label>
                    <input
                      type="number"
                      value={item.price}
                      onChange={(e) => handleUpdateItem(index, { price: Number(e.target.value) })}
                      className="w-full px-3 py-2 rounded-xl border border-gray-100 focus:border-blue-500 outline-none text-sm"
                    />
                  </div>

                  <div className="w-32 space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Category</label>
                    <select
                      value={item.category}
                      onChange={(e) => handleUpdateItem(index, { category: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-gray-100 focus:border-blue-500 outline-none text-sm"
                    >
                      {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>

                  <button
                    onClick={() => handleRemoveItem(index)}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </motion.div>
              ))}

              <button
                onClick={handleAddItem}
                className="w-full py-4 border-2 border-dashed border-gray-200 rounded-2xl text-gray-400 hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50 transition-all flex items-center justify-center gap-2 font-medium"
              >
                <Plus className="w-5 h-5" />
                Add Another Item
              </button>
            </div>

            <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end gap-4">
              <button
                onClick={onClose}
                className="px-6 py-3 text-gray-600 font-bold hover:bg-gray-100 rounded-xl transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-200 transition-all flex items-center gap-2"
              >
                <Save className="w-5 h-5" />
                Add All to Inventory
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
