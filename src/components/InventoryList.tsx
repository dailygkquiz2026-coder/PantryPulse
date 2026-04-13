import React from 'react';
import { GroceryItem } from '../types';
import { Trash2, AlertTriangle, CheckCircle2, Clock, ShoppingBag, Edit2 } from 'lucide-react';
import { motion } from 'motion/react';
import { formatDistanceToNow } from 'date-fns';
import { CATEGORY_IMAGES, CATEGORY_COLORS } from '../constants';

interface InventoryListProps {
  items: GroceryItem[];
  onDelete: (id: string) => void;
  onAddToShopping: (name: string, details?: any) => void;
  onUpdateQuantity: (item: GroceryItem) => void;
  onEdit: (item: GroceryItem) => void;
  predictions: Record<string, number>;
}

export default function InventoryList({ items, onDelete, onAddToShopping, onUpdateQuantity, onEdit, predictions }: InventoryListProps) {
  return (
    <div className="space-y-4">
      {items.length === 0 ? (
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center py-24 cred-card border border-white/5 flex flex-col items-center justify-center gap-6 px-6 bg-white/5"
        >
          <div className="w-24 h-24 bg-white/5 rounded-[2.5rem] flex items-center justify-center mb-2 border border-white/5 shadow-inner">
            <ShoppingBag className="text-cred-accent w-10 h-10" />
          </div>
          <div className="space-y-2">
            <h3 className="text-2xl font-black tracking-tight text-white">Pantry is empty</h3>
            <p className="text-gray-500 max-w-xs mx-auto font-medium">
              Start by adding items or scanning a receipt to see your inventory here.
            </p>
          </div>
        </motion.div>
      ) : (
        items.map((item, index) => {
          const daysRemaining = predictions[item.id];
          const isStockout = daysRemaining !== undefined && daysRemaining <= 0;
          const isLow = daysRemaining !== undefined && daysRemaining > 0 && daysRemaining < 3;
          
          const expiryDate = item.expiryDate ? new Date(item.expiryDate) : null;
          const isExpiringSoon = expiryDate ? (expiryDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24) < 3 : false;
          const isExpired = expiryDate ? expiryDate.getTime() < new Date().getTime() : false;

          const categoryImage = CATEGORY_IMAGES[item.category] || CATEGORY_IMAGES['Other'];
          const categoryColor = CATEGORY_COLORS[item.category] || CATEGORY_COLORS['Other'];

          const colorMap: Record<string, string> = {
            emerald: 'bg-emerald-500/10 text-emerald-400',
            blue: 'bg-blue-500/10 text-blue-400',
            amber: 'bg-amber-500/10 text-amber-400',
            red: 'bg-red-500/10 text-red-400',
            orange: 'bg-orange-500/10 text-orange-400',
            sky: 'bg-sky-500/10 text-sky-400',
            indigo: 'bg-indigo-500/10 text-indigo-400',
            purple: 'bg-purple-500/10 text-purple-400',
            pink: 'bg-pink-500/10 text-pink-400',
            gray: 'bg-white/10 text-gray-400'
          };

          return (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="cred-card p-4 md:p-6 flex flex-col sm:flex-row sm:items-center justify-between group transition-all gap-4 border-white/5 hover:border-white/10 hover:bg-white/[0.02]"
            >
              <div className="flex items-center gap-4 md:gap-6 flex-1 min-w-0 w-full">
                <div className="relative w-16 h-16 md:w-20 md:h-20 flex-shrink-0 group/img">
                  <div className="absolute inset-0 bg-gradient-to-tr from-black/40 to-transparent z-10 rounded-[1.5rem] md:rounded-[2rem]" />
                  <img 
                    src={categoryImage} 
                    alt={item.category}
                    className="w-full h-full object-cover rounded-[1.5rem] md:rounded-[2rem] transition-transform duration-500 group-hover/img:scale-110"
                    referrerPolicy="no-referrer"
                  />
                  {(isExpired || isStockout || isExpiringSoon || isLow) && (
                    <div className={`absolute -top-1 -right-1 p-1.5 rounded-full shadow-xl z-20 ${
                      isExpired || isStockout ? 'bg-cred-primary' : 'bg-amber-500'
                    }`}>
                      <AlertTriangle className="w-3 h-3 text-white" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className={`px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest ${colorMap[categoryColor]}`}>
                      {item.category}
                    </span>
                    {daysRemaining !== undefined && (
                      <span className={`px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest ${
                        isStockout ? 'bg-cred-primary text-white' :
                        isLow ? 'bg-amber-500/20 text-amber-500' : 'bg-cred-accent/20 text-cred-accent'
                      }`}>
                        {isStockout ? 'Stockout' : `${daysRemaining}d left`}
                      </span>
                    )}
                  </div>
                  <h3 className="font-black text-lg md:text-xl tracking-tight text-white mb-1 truncate">{item.name}</h3>
                  <div className="flex items-center gap-3 text-[10px] md:text-xs text-gray-500 font-bold uppercase tracking-wider">
                    <span className="text-white">{item.quantity} {item.unit}</span>
                    <span className="text-white/10">•</span>
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {formatDistanceToNow(new Date(item.purchaseDate))}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-2 md:gap-3 w-full sm:w-auto pt-4 sm:pt-0 border-t sm:border-t-0 border-white/5">
                <div className="hidden lg:block text-right mr-4">
                  <p className="text-[8px] font-black text-gray-600 uppercase tracking-widest mb-0.5">Usage</p>
                  <p className="text-xs font-bold text-gray-400">{item.usageFrequency}x/day</p>
                </div>
                
                <div className="flex items-center gap-1 md:gap-2">
                  <button
                    onClick={() => onEdit(item)}
                    className="p-2.5 md:p-3 text-gray-500 hover:text-white hover:bg-white/5 rounded-xl md:rounded-2xl transition-all"
                    title="Edit"
                  >
                    <Edit2 className="w-4 h-4 md:w-5 md:h-5" />
                  </button>

                  <button
                    onClick={() => onUpdateQuantity(item)}
                    className="p-2.5 md:p-3 text-gray-500 hover:text-cred-accent hover:bg-white/5 rounded-xl md:rounded-2xl transition-all"
                    title="Update"
                  >
                    <Clock className="w-4 h-4 md:w-5 md:h-5" />
                  </button>

                  {(isLow || isStockout) && (
                    <button
                      onClick={() => onAddToShopping(item.name, item)}
                      className="flex items-center gap-2 px-4 md:px-6 py-2.5 md:py-3 bg-cred-primary text-white rounded-xl md:rounded-2xl font-black uppercase tracking-widest text-[8px] md:text-[10px] hover:bg-cred-primary/90 transition-all shadow-lg shadow-cred-primary/20"
                    >
                      <ShoppingBag className="w-3.5 h-3.5 md:w-4 md:h-4" />
                      <span>Restock</span>
                    </button>
                  )}

                  <button
                    onClick={() => onDelete(item.id)}
                    className="p-2.5 md:p-3 text-gray-500 hover:text-cred-primary hover:bg-white/5 rounded-xl md:rounded-2xl transition-all"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4 md:w-5 md:h-5" />
                  </button>
                </div>
              </div>
            </motion.div>
          );
        })
      )}
    </div>
  );
}


