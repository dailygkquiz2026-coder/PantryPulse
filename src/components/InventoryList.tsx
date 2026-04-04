import React from 'react';
import { GroceryItem } from '../types';
import { Trash2, AlertTriangle, CheckCircle2, Clock, ShoppingBag, Edit2 } from 'lucide-react';
import { motion } from 'motion/react';
import { formatDistanceToNow } from 'date-fns';

interface InventoryListProps {
  items: GroceryItem[];
  onDelete: (id: string) => void;
  onAddToShopping: (name: string) => void;
  onUpdateQuantity: (item: GroceryItem) => void;
  onEdit: (item: GroceryItem) => void;
  predictions: Record<string, number>;
}

export default function InventoryList({ items, onDelete, onAddToShopping, onUpdateQuantity, onEdit, predictions }: InventoryListProps) {
  return (
    <div className="space-y-4">
      {items.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
          <p className="text-gray-500">Your pantry is empty. Log some purchases!</p>
        </div>
      ) : (
        items.map((item, index) => {
          const daysRemaining = predictions[item.id];
          const isLow = daysRemaining !== undefined && daysRemaining < 3;
          
          const expiryDate = item.expiryDate ? new Date(item.expiryDate) : null;
          const isExpiringSoon = expiryDate ? (expiryDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24) < 3 : false;
          const isExpired = expiryDate ? expiryDate.getTime() < new Date().getTime() : false;

          return (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className={`bg-white p-4 rounded-2xl shadow-sm border flex items-center justify-between group hover:shadow-md transition-all ${
                isExpired ? 'border-red-300 bg-red-50/30' : isExpiringSoon ? 'border-amber-300 bg-amber-50/30' : 'border-gray-100'
              }`}
            >
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-xl ${
                  isExpired ? 'bg-red-100 text-red-600' : isExpiringSoon ? 'bg-amber-100 text-amber-600' : isLow ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'
                }`}>
                  {isExpired || isExpiringSoon || isLow ? <AlertTriangle className="w-6 h-6" /> : <CheckCircle2 className="w-6 h-6" />}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{item.name}</h3>
                  <div className="flex items-center gap-3 text-sm text-gray-500">
                    <span>{item.quantity} {item.unit}</span>
                    <span>•</span>
                    <span>{item.category}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 mt-1">
                    <div className="flex items-center gap-1 text-xs text-gray-400">
                      <Clock className="w-3 h-3" />
                      <span>Purchased {formatDistanceToNow(new Date(item.purchaseDate))} ago</span>
                    </div>
                    {item.expiryDate && (
                      <div className={`flex items-center gap-1 text-xs font-medium ${
                        isExpired ? 'text-red-600' : isExpiringSoon ? 'text-amber-600' : 'text-gray-400'
                      }`}>
                        <AlertTriangle className="w-3 h-3" />
                        <span>Exp: {new Date(item.expiryDate).toLocaleDateString()}</span>
                      </div>
                    )}
                    {daysRemaining !== undefined && (
                      <div className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        isLow ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'
                      }`}>
                        {daysRemaining} days left
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="text-right hidden md:block mr-4">
                  <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Usage</p>
                  <p className="text-sm font-semibold text-gray-700">{item.usageFrequency}x / day</p>
                </div>
                
                <button
                  onClick={() => onEdit(item)}
                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all flex items-center gap-1 text-xs font-bold uppercase tracking-wider"
                  title="Edit Item"
                >
                  <Edit2 className="w-4 h-4" />
                  <span className="hidden lg:inline">Edit</span>
                </button>

                <button
                  onClick={() => onUpdateQuantity(item)}
                  className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg transition-all flex items-center gap-1 text-xs font-bold uppercase tracking-wider"
                  title="Update Quantity Left"
                >
                  <Clock className="w-4 h-4" />
                  <span className="hidden lg:inline">Stock</span>
                </button>

                {isLow && (
                  <button
                    onClick={() => onAddToShopping(item.name)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all flex items-center gap-1 text-xs font-bold uppercase tracking-wider"
                    title="Add to Shopping List"
                  >
                    <ShoppingBag className="w-4 h-4" />
                    <span className="hidden lg:inline">Restock</span>
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
          );
        })
      )}
    </div>
  );
}


