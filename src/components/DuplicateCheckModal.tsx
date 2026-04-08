import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertCircle, Plus, RefreshCw, X } from 'lucide-react';

interface DuplicateCheckModalProps {
  isOpen: boolean;
  onClose: () => void;
  itemName: string;
  onAddToExisting: () => void;
  onAddNew: () => void;
}

export default function DuplicateCheckModal({
  isOpen,
  onClose,
  itemName,
  onAddToExisting,
  onAddNew
}: DuplicateCheckModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center sm:p-4 bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="bg-white dark:bg-cred-black w-full h-full sm:h-auto sm:max-w-md sm:rounded-3xl shadow-2xl overflow-hidden border border-white/10 flex flex-col"
          >
            <div className="p-6 border-b border-gray-100 dark:border-white/5 flex items-center justify-between bg-amber-50/50 dark:bg-amber-950/20 shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-100 dark:bg-amber-900/40 rounded-xl">
                  <AlertCircle className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">Item Already Exists</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">We found <span className="font-semibold text-amber-600 dark:text-amber-400">{itemName}</span> in your inventory.</p>
                </div>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-cred-gray rounded-full transition-all">
                <X className="w-6 h-6 text-gray-400" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <button
                onClick={onAddToExisting}
                className="w-full flex items-center justify-between p-4 bg-gray-50 dark:bg-cred-gray hover:bg-gray-100 dark:hover:bg-cred-dark rounded-2xl transition-all group border border-gray-100 dark:border-white/5"
              >
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-blue-100 dark:bg-blue-900/40 rounded-xl text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform">
                    <RefreshCw className="w-6 h-6" />
                  </div>
                  <div className="text-left">
                    <p className="font-bold">Add to existing stock</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Update quantity of the current item</p>
                  </div>
                </div>
              </button>

              <button
                onClick={onAddNew}
                className="w-full flex items-center justify-between p-4 bg-gray-50 dark:bg-cred-gray hover:bg-gray-100 dark:hover:bg-cred-dark rounded-2xl transition-all group border border-gray-100 dark:border-white/5"
              >
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-green-100 dark:bg-green-900/40 rounded-xl text-green-600 dark:text-green-400 group-hover:scale-110 transition-transform">
                    <Plus className="w-6 h-6" />
                  </div>
                  <div className="text-left">
                    <p className="font-bold">Add as new item</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Create a separate entry in inventory</p>
                  </div>
                </div>
              </button>
            </div>

            <div className="p-6 bg-gray-50 dark:bg-cred-dark/50 flex flex-col sm:flex-row gap-3 mt-auto sm:mt-0">
              <button
                onClick={onClose}
                className="w-full sm:flex-1 py-4 bg-white dark:bg-cred-gray font-black uppercase tracking-widest text-[10px] rounded-2xl border border-gray-100 dark:border-white/5 hover:bg-gray-50 transition-all"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
