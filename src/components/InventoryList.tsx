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
          className="text-center py-20 cred-card border-2 border-dashed border-gray-100 flex flex-col items-center justify-center gap-4 px-6"
        >
          <div className="w-20 h-20 bg-blue-50 dark:bg-cred-gray rounded-3xl flex items-center justify-center mb-2">
            <ShoppingBag className="text-blue-600 dark:text-cred-accent w-10 h-10" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">Your pantry is empty</h3>
          <p className="text-gray-500 dark:text-gray-400 max-w-xs mx-auto">
            Start by logging your recent grocery purchases or scanning a receipt to see your inventory here.
          </p>
        </motion.div>
      ) : (
        items.map((item, index) => {
          const daysRemaining = predictions[item.id];
          const isLow = daysRemaining !== undefined && daysRemaining < 3;
          
          const expiryDate = item.expiryDate ? new Date(item.expiryDate) : null;
          const isExpiringSoon = expiryDate ? (expiryDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24) < 3 : false;
          const isExpired = expiryDate ? expiryDate.getTime() < new Date().getTime() : false;

          const categoryImage = CATEGORY_IMAGES[item.category] || CATEGORY_IMAGES['Other'];
          const categoryColor = CATEGORY_COLORS[item.category] || CATEGORY_COLORS['Other'];

          const colorMap: Record<string, string> = {
            emerald: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400',
            blue: 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400',
            amber: 'bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400',
            red: 'bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400',
            orange: 'bg-orange-100 dark:bg-orange-900/40 text-orange-600 dark:text-orange-400',
            sky: 'bg-sky-100 dark:bg-sky-900/40 text-sky-600 dark:text-sky-400',
            indigo: 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400',
            purple: 'bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400',
            pink: 'bg-pink-100 dark:bg-pink-900/40 text-pink-600 dark:text-pink-400',
            gray: 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
          };

          return (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className={`cred-card p-4 flex items-center justify-between group hover:shadow-lg transition-all gap-4 ${
                isExpired ? 'border-red-300 dark:border-red-900 bg-red-50/30 dark:bg-red-950/20' : 
                isExpiringSoon ? 'border-amber-300 dark:border-amber-900 bg-amber-50/30 dark:bg-amber-950/20' : 
                'border-gray-100 dark:border-cred-gray'
              }`}
            >
              <div className="flex items-center gap-4 flex-1 min-w-0">
                <div className="relative w-16 h-16 flex-shrink-0">
                  <img 
                    src={categoryImage} 
                    alt={item.category}
                    className="w-full h-full object-crop rounded-2xl shadow-sm"
                    referrerPolicy="no-referrer"
                  />
                  <div className={`absolute -top-2 -right-2 p-1.5 rounded-lg shadow-sm ${
                    isExpired ? 'bg-red-500 text-white' : 
                    isExpiringSoon ? 'bg-amber-500 text-white' : 
                    isLow ? 'bg-red-500 text-white' : 
                    'bg-green-500 text-white'
                  }`}>
                    {isExpired || isExpiringSoon || isLow ? <AlertTriangle className="w-3 h-3" /> : <CheckCircle2 className="w-3 h-3" />}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-lg leading-tight break-words">{item.name}</h3>
                  <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400 font-medium">
                    <span>{item.quantity} {item.unit}</span>
                    <span className="text-gray-300 dark:text-cred-gray">•</span>
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-widest ${colorMap[categoryColor]}`}>
                      {item.category}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 mt-1">
                    <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-gray-400">
                      <Clock className="w-3 h-3" />
                      <span>{formatDistanceToNow(new Date(item.purchaseDate))} ago</span>
                    </div>
                    {item.expiryDate && (
                      <div className={`flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest ${
                        isExpired ? 'text-red-500' : isExpiringSoon ? 'text-amber-500' : 'text-gray-400'
                      }`}>
                        <AlertTriangle className="w-3 h-3" />
                        <span>Exp: {new Date(item.expiryDate).toLocaleDateString()}</span>
                      </div>
                    )}
                    {daysRemaining !== undefined && (
                      <div className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-tighter ${
                        isLow ? 'bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400' : 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400'
                      }`}>
                        {daysRemaining} days left
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="text-right hidden md:block mr-4">
                  <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Usage</p>
                  <p className="text-sm font-bold text-gray-700 dark:text-gray-300">{item.usageFrequency}x / day</p>
                </div>
                
                <div className="flex items-center gap-1 bg-gray-50 dark:bg-cred-gray p-1 rounded-xl">
                  <button
                    onClick={() => onEdit(item)}
                    className="p-2 text-gray-500 hover:text-blue-600 dark:hover:text-cred-accent hover:bg-white dark:hover:bg-cred-dark rounded-lg transition-all"
                    title="Edit Item"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => onUpdateQuantity(item)}
                    className="p-2 text-gray-500 hover:text-amber-600 hover:bg-white dark:hover:bg-cred-dark rounded-lg transition-all"
                    title="Update Quantity Left"
                  >
                    <Clock className="w-4 h-4" />
                  </button>

                  {isLow && (
                    <button
                      onClick={() => onAddToShopping(item.name, item)}
                      className="p-2 text-gray-500 hover:text-blue-600 dark:hover:text-cred-accent hover:bg-white dark:hover:bg-cred-dark rounded-lg transition-all"
                      title="Add to Shopping List"
                    >
                      <ShoppingBag className="w-4 h-4" />
                    </button>
                  )}

                  <button
                    onClick={() => onDelete(item.id)}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-white dark:hover:bg-cred-dark rounded-lg transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
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


