import React, { useState } from 'react';
import { ShoppingListItem } from '../types';
import { Trash2, CheckCircle2, ShoppingBag, Search, ExternalLink, Plus, Share2, MessageSquare, Mail } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import AutocompleteInput from './AutocompleteInput';

interface ShoppingListProps {
  items: ShoppingListItem[];
  onDelete: (id: string) => void;
  onToggleStatus: (id: string) => void;
  onSearchPrice: (name: string) => void;
  onAddItem: (name: string) => void;
}

export default function ShoppingList({ items, onDelete, onToggleStatus, onSearchPrice, onAddItem }: ShoppingListProps) {
  const [newItemName, setNewItemName] = useState('');
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (newItemName.trim()) {
      onAddItem(newItemName.trim());
      setNewItemName('');
    }
  };

  const getListText = () => {
    const toBuy = items.filter(i => i.status === 'to-buy');
    if (toBuy.length === 0) return "My shopping list is empty!";
    return `🛒 *My Shopping List*:\n\n${toBuy.map(i => `• ${i.name} (${i.quantity} ${i.unit})`).join('\n')}\n\n_Sent via PantryPulse_`;
  };

  const exportToWhatsApp = () => {
    const text = encodeURIComponent(getListText());
    window.open(`https://wa.me/?text=${text}`, '_blank');
    setIsExportMenuOpen(false);
  };

  const exportToEmail = () => {
    const subject = encodeURIComponent("My Shopping List");
    const body = encodeURIComponent(getListText().replace(/\*/g, ''));
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
    setIsExportMenuOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <form onSubmit={handleAddItem} className="flex-1 relative group">
          <div className="flex gap-2">
            <div className="flex-1">
              <AutocompleteInput
                value={newItemName}
                onChange={setNewItemName}
                placeholder="Search or add items (e.g. Milk, Eggs)..."
                className="w-full pl-12 pr-4 py-4 bg-white border-2 border-gray-100 rounded-2xl focus:border-blue-500 focus:ring-4 focus:ring-blue-50/50 outline-none transition-all text-lg shadow-sm group-hover:shadow-md"
              />
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
            </div>
            <button
              type="submit"
              disabled={!newItemName.trim()}
              className="px-6 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 disabled:opacity-50 disabled:hover:bg-blue-600 transition-all shadow-lg shadow-blue-200 flex items-center gap-2 font-bold"
            >
              <Plus className="w-5 h-5" />
              <span className="hidden sm:inline">Add</span>
            </button>
          </div>
        </form>

        <div className="relative">
          <button
            onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
            className="p-4 bg-gray-50 dark:bg-cred-gray text-gray-600 dark:text-gray-400 rounded-2xl hover:bg-gray-100 dark:hover:bg-cred-dark transition-all border border-gray-100 dark:border-white/5 shadow-sm"
            title="Export List"
          >
            <Share2 className="w-6 h-6" />
          </button>

          <AnimatePresence>
            {isExportMenuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsExportMenuOpen(false)} />
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 10 }}
                  className="absolute right-0 mt-2 w-56 bg-white dark:bg-cred-black rounded-2xl shadow-2xl border border-gray-100 dark:border-white/10 z-50 overflow-hidden"
                >
                  <div className="p-2 space-y-1">
                    <button
                      onClick={exportToWhatsApp}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-green-50 dark:hover:bg-green-950/20 text-green-600 rounded-xl transition-all font-bold text-sm"
                    >
                      <MessageSquare className="w-5 h-5" />
                      Share via WhatsApp
                    </button>
                    <button
                      onClick={exportToEmail}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-blue-50 dark:hover:bg-blue-950/20 text-blue-600 rounded-xl transition-all font-bold text-sm"
                    >
                      <Mail className="w-5 h-5" />
                      Send via Email
                    </button>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="space-y-4">
        {items.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
            <ShoppingBag className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 font-medium">Your shopping list is empty.</p>
            <p className="text-sm text-gray-400 mt-1">Use the search bar above to add items.</p>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {items.map((item, index) => (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -10 }}
                transition={{ duration: 0.2 }}
                className={`p-4 rounded-2xl shadow-sm border transition-all flex items-center justify-between group ${
                  item.status === 'bought' ? 'bg-gray-50 border-gray-100 opacity-60' : 'bg-white border-gray-100 hover:shadow-md'
                }`}
              >
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => onToggleStatus(item.id)}
                    className={`p-2 rounded-xl transition-all ${
                      item.status === 'bought' ? 'bg-green-100 text-green-600' : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                    }`}
                  >
                    <CheckCircle2 className={`w-6 h-6 ${item.status === 'bought' ? 'fill-current' : ''}`} />
                  </button>
                  <div>
                    <h3 className={`font-semibold text-gray-900 dark:text-white ${item.status === 'bought' ? 'line-through' : ''}`}>
                      {item.name}
                    </h3>
                    <p className="text-sm text-gray-500">{item.quantity} {item.unit}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {item.status === 'to-buy' && (
                    <button
                      onClick={() => onSearchPrice(item.name)}
                      className="px-4 py-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-xl transition-all flex items-center gap-2 text-sm font-bold"
                    >
                      <Search className="w-4 h-4" />
                      <span>Compare Variants</span>
                    </button>
                  )}
                  <button
                    onClick={() => onDelete(item.id)}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
