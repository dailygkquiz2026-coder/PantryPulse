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
            className="bg-cred-black w-full h-full sm:h-auto sm:max-w-md sm:rounded-[2.5rem] shadow-2xl overflow-hidden border border-white/10 flex flex-col"
          >
            <div className="p-6 border-b border-white/5 flex items-center justify-between bg-amber-500/10 shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-500/20 rounded-xl">
                  <AlertCircle className="w-6 h-6 text-amber-400" />
                </div>
                <div>
                  <h2 className="text-xl font-black tracking-tighter text-white">Item Exists</h2>
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Found <span className="text-amber-400">{itemName}</span></p>
                </div>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-all">
                <X className="w-6 h-6 text-gray-500" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <button
                onClick={onAddToExisting}
                className="w-full flex items-center justify-between p-5 bg-white/[0.02] hover:bg-white/5 rounded-[1.5rem] transition-all group border border-white/5"
              >
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-cred-accent/10 rounded-xl text-cred-accent group-hover:scale-110 transition-transform border border-cred-accent/20">
                    <RefreshCw className="w-6 h-6" />
                  </div>
                  <div className="text-left">
                    <p className="font-black uppercase tracking-widest text-xs text-white">Add to existing</p>
                    <p className="text-[10px] text-gray-500 font-medium">Update current item quantity</p>
                  </div>
                </div>
              </button>

              <button
                onClick={onAddNew}
                className="w-full flex items-center justify-between p-5 bg-white/[0.02] hover:bg-white/5 rounded-[1.5rem] transition-all group border border-white/5"
              >
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-400 group-hover:scale-110 transition-transform border border-emerald-500/20">
                    <Plus className="w-6 h-6" />
                  </div>
                  <div className="text-left">
                    <p className="font-black uppercase tracking-widest text-xs text-white">Add as new</p>
                    <p className="text-[10px] text-gray-500 font-medium">Create a separate entry</p>
                  </div>
                </div>
              </button>
            </div>

            <div className="p-6 bg-white/5 flex flex-col sm:flex-row gap-3 mt-auto sm:mt-0">
              <button
                onClick={onClose}
                className="w-full sm:flex-1 py-4 bg-white/5 font-black uppercase tracking-widest text-[10px] rounded-2xl border border-white/10 hover:bg-white/10 transition-all text-gray-500"
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
