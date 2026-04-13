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
                placeholder="Add to list..."
                className="cred-input pl-14 text-lg"
              />
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-6 h-6 text-gray-500 group-focus-within:text-cred-primary transition-colors" />
            </div>
            <button
              type="submit"
              disabled={!newItemName.trim()}
              className="cred-button-primary flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              <span className="hidden sm:inline">Add</span>
            </button>
          </div>
        </form>

        <div className="relative">
          <button
            onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
            className="p-5 bg-white/5 text-gray-500 rounded-2xl hover:bg-white/10 transition-all border border-white/5 shadow-sm"
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
                  className="absolute right-0 mt-2 w-56 bg-cred-gray border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden p-2"
                >
                  <button
                    onClick={exportToWhatsApp}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 text-white rounded-xl transition-all font-bold text-sm"
                  >
                    <MessageSquare className="w-5 h-5 text-green-500" />
                    WhatsApp
                  </button>
                  <button
                    onClick={exportToEmail}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 text-white rounded-xl transition-all font-bold text-sm"
                  >
                    <Mail className="w-5 h-5 text-blue-500" />
                    Email
                  </button>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="space-y-4">
        {items.length === 0 ? (
          <div className="text-center py-20 cred-card border-2 border-dashed border-white/5 flex flex-col items-center justify-center gap-4 px-6">
            <div className="w-20 h-20 bg-white/5 rounded-3xl flex items-center justify-center mb-2">
              <ShoppingBag className="text-gray-500 w-10 h-10" />
            </div>
            <h3 className="text-xl font-bold text-white">List is empty</h3>
            <p className="text-gray-500 max-w-xs mx-auto">
              Add items you need to buy to keep your pantry stocked.
            </p>
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
                className={`p-5 rounded-[2rem] border transition-all flex items-center justify-between group ${
                  item.status === 'bought' 
                    ? 'bg-white/5 border-white/5 opacity-40' 
                    : 'bg-cred-gray/40 border-white/5 hover:border-white/10'
                }`}
              >
                <div className="flex items-center gap-5 flex-1 min-w-0">
                  <button
                    onClick={() => onToggleStatus(item.id)}
                    className={`p-3 rounded-2xl transition-all flex-shrink-0 ${
                      item.status === 'bought' 
                        ? 'bg-green-500 text-white' 
                        : 'bg-white/5 text-gray-500 hover:bg-white/10'
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
                        className="flex-1 cred-input py-2 px-4 text-sm"
                        autoFocus
                      />
                      <div className="flex gap-2">
                        <input
                          type="number"
                          value={editQuantity}
                          onChange={(e) => setEditQuantity(Number(e.target.value))}
                          className="w-20 cred-input py-2 px-4 text-sm"
                        />
                        <button
                          onClick={() => handleSaveEdit(item.id)}
                          className="px-4 py-2 bg-green-600 text-white rounded-xl text-xs font-bold"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="px-4 py-2 bg-white/5 text-gray-400 rounded-xl text-xs font-bold"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex-1 min-w-0">
                      <h3 className={`font-black text-lg tracking-tight text-white break-words ${item.status === 'bought' ? 'line-through' : ''}`}>
                        {item.name || 'Unnamed Item'}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-xs text-gray-500 font-bold">{item.quantity} {item.unit}</p>
                        {item.category && (
                          <>
                            <span className="text-white/10">•</span>
                            <span className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest ${
                              CATEGORY_COLORS[item.category] === 'emerald' ? 'bg-emerald-500/20 text-emerald-400' :
                              CATEGORY_COLORS[item.category] === 'blue' ? 'bg-blue-500/20 text-blue-400' :
                              CATEGORY_COLORS[item.category] === 'amber' ? 'bg-amber-500/20 text-amber-400' :
                              CATEGORY_COLORS[item.category] === 'red' ? 'bg-red-500/20 text-red-400' :
                              CATEGORY_COLORS[item.category] === 'orange' ? 'bg-orange-500/20 text-orange-400' :
                              CATEGORY_COLORS[item.category] === 'sky' ? 'bg-sky-500/20 text-sky-400' :
                              CATEGORY_COLORS[item.category] === 'indigo' ? 'bg-indigo-500/20 text-indigo-400' :
                              CATEGORY_COLORS[item.category] === 'purple' ? 'bg-purple-500/20 text-purple-400' :
                              CATEGORY_COLORS[item.category] === 'pink' ? 'bg-pink-500/20 text-pink-400' :
                              'bg-white/5 text-gray-500'
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
                        className="p-3 text-gray-500 hover:text-white hover:bg-white/5 rounded-2xl transition-all"
                        title="Edit"
                      >
                        <Edit2 className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => onSearchPrice(item.name)}
                        className="px-5 py-3 bg-cred-accent/10 text-cred-accent hover:bg-cred-accent/20 rounded-2xl transition-all flex items-center gap-2 text-[10px] font-black uppercase tracking-widest"
                      >
                        <Search className="w-4 h-4" />
                        <span className="hidden md:inline">Compare</span>
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => onDelete(item.id)}
                    className="p-3 text-gray-500 hover:text-red-500 hover:bg-white/5 rounded-2xl transition-all opacity-0 group-hover:opacity-100"
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
