import React, { useState } from 'react';
import { ShoppingListItem } from '../types';
import { CATEGORY_COLORS } from '../constants';
import { Trash2, CheckCircle2, ShoppingBag, Search, ExternalLink, Plus, Share2, MessageSquare, Mail, Edit2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import AutocompleteInput from './AutocompleteInput';

interface ShoppingListProps {
  items: ShoppingListItem[];
  onDelete: (id: string) => void;
  onToggleStatus: (id: string) => void;
  onSearchPrice: (name: string) => void;
  onAddItem: (name: string) => void;
  onUpdateItem: (id: string, updates: Partial<ShoppingListItem>) => void;
}

export default function ShoppingList({ items, onDelete, onToggleStatus, onSearchPrice, onAddItem, onUpdateItem }: ShoppingListProps) {
  const [newItemName, setNewItemName] = useState('');
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editQuantity, setEditQuantity] = useState(1);
  const [editUnit, setEditUnit] = useState('pcs');

  const handleStartEdit = (item: ShoppingListItem) => {
    setEditingId(item.id);
    setEditName(item.name);
    setEditQuantity(item.quantity);
    setEditUnit(item.unit);
  };

  const handleSaveEdit = (id: string) => {
    onUpdateItem(id, {
      name: editName,
      quantity: editQuantity,
      unit: editUnit
    });
    setEditingId(null);
  };

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
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <AutocompleteInput
                value={newItemName}
                onChange={setNewItemName}
                placeholder="Search or add items..."
                className="cred-input pl-14 text-lg"
              />
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-6 h-6 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
            </div>
            <button
              type="submit"
              disabled={!newItemName.trim()}
              className="px-8 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 disabled:opacity-50 transition-all shadow-lg shadow-blue-200 dark:shadow-none flex items-center gap-2 font-bold"
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
                  item.status === 'bought' 
                    ? 'bg-gray-50 dark:bg-cred-gray/50 border-gray-100 dark:border-white/5 opacity-60' 
                    : 'bg-white dark:bg-cred-dark border-blue-500/10 hover:shadow-[0_0_20px_rgba(59,130,246,0.15)] hover:border-blue-500/30'
                }`}
              >
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <button
                    onClick={() => onToggleStatus(item.id)}
                    className={`p-2 rounded-xl transition-all flex-shrink-0 ${
                      item.status === 'bought' 
                        ? 'bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400' 
                        : 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100'
                    }`}
                  >
                    <CheckCircle2 className={`w-6 h-6 ${item.status === 'bought' ? 'fill-current' : ''}`} />
                  </button>
                  
                  {editingId === item.id ? (
                    <div className="flex-1 flex flex-col sm:flex-row gap-2">
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="flex-1 cred-input py-1 px-2 text-sm"
                        autoFocus
                      />
                      <div className="flex gap-2">
                        <input
                          type="number"
                          value={editQuantity}
                          onChange={(e) => setEditQuantity(Number(e.target.value))}
                          className="w-20 cred-input py-1 px-2 text-sm"
                        />
                        <button
                          onClick={() => handleSaveEdit(item.id)}
                          className="px-3 py-1 bg-green-600 text-white rounded-lg text-xs font-bold"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="px-3 py-1 bg-gray-200 dark:bg-cred-gray text-gray-600 dark:text-gray-400 rounded-lg text-xs font-bold"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex-1 min-w-0">
                      <h3 className={`font-bold text-gray-900 dark:text-white break-words ${item.status === 'bought' ? 'line-through opacity-50' : ''}`}>
                        {item.name || 'Unnamed Item'}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">{item.quantity} {item.unit}</p>
                        {item.category && (
                          <>
                            <span className="text-gray-300 dark:text-cred-gray">•</span>
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-widest ${
                              CATEGORY_COLORS[item.category] === 'emerald' ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400' :
                              CATEGORY_COLORS[item.category] === 'blue' ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400' :
                              CATEGORY_COLORS[item.category] === 'amber' ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400' :
                              CATEGORY_COLORS[item.category] === 'red' ? 'bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400' :
                              CATEGORY_COLORS[item.category] === 'orange' ? 'bg-orange-100 dark:bg-orange-900/40 text-orange-600 dark:text-orange-400' :
                              CATEGORY_COLORS[item.category] === 'sky' ? 'bg-sky-100 dark:bg-sky-900/40 text-sky-600 dark:text-sky-400' :
                              CATEGORY_COLORS[item.category] === 'indigo' ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400' :
                              CATEGORY_COLORS[item.category] === 'purple' ? 'bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400' :
                              CATEGORY_COLORS[item.category] === 'pink' ? 'bg-pink-100 dark:bg-pink-900/40 text-pink-600 dark:text-pink-400' :
                              'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                            }`}>
                              {item.category}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {item.status === 'to-buy' && editingId !== item.id && (
                    <>
                      <button
                        onClick={() => handleStartEdit(item)}
                        className="p-2 text-gray-500 hover:text-blue-600 dark:hover:text-cred-accent hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all"
                        title="Edit Item"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onSearchPrice(item.name)}
                        className="px-4 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40 rounded-xl transition-all flex items-center gap-2 text-sm font-bold"
                      >
                        <Search className="w-4 h-4" />
                        <span className="hidden md:inline">Compare Variants</span>
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => onDelete(item.id)}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all opacity-0 group-hover:opacity-100"
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
