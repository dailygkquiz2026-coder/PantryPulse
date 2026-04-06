import React from 'react';
import Markdown from 'react-markdown';
import { ShoppingCart, ExternalLink, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface PriceComparisonProps {
  isOpen: boolean;
  onClose: () => void;
  itemName: string;
  results: string | null;
  isLoading: boolean;
}

export default function PriceComparison({ isOpen, onClose, itemName, results, isLoading }: PriceComparisonProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="bg-white dark:bg-cred-black w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh] border border-white/10"
          >
            <div className="p-6 border-b border-gray-100 dark:border-white/5 flex items-center justify-between bg-blue-50/50 dark:bg-blue-950/20">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/40 rounded-xl">
                  <ShoppingCart className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">Price Comparison</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Finding best deals for <span className="font-semibold text-blue-600 dark:text-blue-400">{itemName}</span></p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 dark:hover:bg-cred-gray rounded-full transition-all"
              >
                <X className="w-6 h-6 text-gray-400" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 bg-white dark:bg-cred-black">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-12 gap-4">
                  <div className="w-12 h-12 border-4 border-blue-100 dark:border-blue-900/40 border-t-blue-600 dark:border-t-blue-400 rounded-full animate-spin" />
                  <p className="text-gray-500 dark:text-gray-400 font-medium animate-pulse">Searching e-commerce sites...</p>
                </div>
              ) : results ? (
                <div className="prose prose-blue dark:prose-invert max-w-none">
                  <div className="markdown-body prose-table:border prose-table:border-gray-200 dark:prose-table:border-white/10 prose-th:bg-gray-50 dark:prose-th:bg-cred-gray prose-th:p-2 prose-td:p-2 prose-td:border-t prose-td:border-gray-100 dark:prose-td:border-white/5">
                    <Markdown
                      components={{
                        a: ({ node, ...props }) => (
                          <a 
                            {...props} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline flex items-center gap-1 inline-flex font-medium"
                          >
                            {props.children}
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        ),
                        table: ({ children }) => (
                          <div className="overflow-x-auto my-4 rounded-xl border border-gray-200 dark:border-white/10 shadow-sm">
                            <table className="w-full text-sm text-left">
                              {children}
                            </table>
                          </div>
                        )
                      }}
                    >
                      {results}
                    </Markdown>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-gray-500 dark:text-gray-400">No results found. Try again later.</p>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-cred-gray/50 flex justify-end">
              <button
                onClick={onClose}
                className="px-6 py-2 bg-white dark:bg-cred-gray border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-300 font-semibold rounded-xl hover:bg-gray-100 dark:hover:bg-cred-dark transition-all"
              >
                Close
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
