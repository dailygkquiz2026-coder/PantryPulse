import React, { useState } from 'react';
import Markdown from 'react-markdown';
import { ShoppingCart, ExternalLink, X, MapPin, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface PriceComparisonProps {
  isOpen: boolean;
  onClose: () => void;
  itemName: string;
  results: string | null;
  isLoading: boolean;
  userLocation: string | null;
  onLocationUpdate: (location: string) => void;
  onRetry: () => void;
}

export default function PriceComparison({ 
  isOpen, 
  onClose, 
  itemName, 
  results, 
  isLoading, 
  userLocation,
  onLocationUpdate,
  onRetry
}: PriceComparisonProps) {
  const [isRequestingLocation, setIsRequestingLocation] = useState(false);
  const [manualPincode, setManualPincode] = useState('');
  const [isEditingPincode, setIsEditingPincode] = useState(false);

  const handleRequestLocation = () => {
    setIsRequestingLocation(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          const locString = `${latitude}, ${longitude}`;
          onLocationUpdate(locString);
          setIsRequestingLocation(false);
          // Auto-retry search after location update
          onRetry();
        },
        (error) => {
          console.error("Error getting location:", error);
          alert("Could not get location. Please enable location permissions in your browser.");
          setIsRequestingLocation(false);
        }
      );
    } else {
      alert("Geolocation is not supported by this browser.");
      setIsRequestingLocation(false);
    }
  };

  const handlePincodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualPincode.length === 6 && /^\d+$/.test(manualPincode)) {
      onLocationUpdate(manualPincode);
      setIsEditingPincode(false);
      onRetry();
    } else {
      alert("Please enter a valid 6-digit pincode");
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="bg-white dark:bg-cred-black w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-white/10"
          >
            <div className="p-6 border-b border-gray-100 dark:border-white/5 flex items-center justify-between bg-blue-50/50 dark:bg-blue-950/20 shrink-0">
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
              {(!userLocation || isEditingPincode) && !isLoading && (
                <div className="flex flex-col items-center justify-center py-8 text-center space-y-6">
                  <div className="w-16 h-16 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 rounded-full flex items-center justify-center">
                    <MapPin className="w-8 h-8" />
                  </div>
                  <div className="max-w-xs">
                    <h3 className="text-lg font-bold mb-2">Location Required</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Enter your pincode or share location to find the best local prices.</p>
                  </div>
                  
                  <form onSubmit={handlePincodeSubmit} className="w-full max-w-xs space-y-3">
                    <input
                      type="text"
                      placeholder="Enter 6-digit Pincode"
                      value={manualPincode}
                      onChange={(e) => setManualPincode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-cred-gray border border-gray-200 dark:border-white/10 rounded-xl text-center font-bold tracking-widest focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    />
                    <button
                      type="submit"
                      disabled={manualPincode.length !== 6}
                      className="w-full cred-button-primary disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Use Pincode
                    </button>
                  </form>

                  <div className="flex items-center gap-4 w-full max-w-xs">
                    <div className="flex-1 h-px bg-gray-100 dark:bg-white/5" />
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">OR</span>
                    <div className="flex-1 h-px bg-gray-100 dark:bg-white/5" />
                  </div>

                  <button
                    onClick={handleRequestLocation}
                    disabled={isRequestingLocation}
                    className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-bold text-sm hover:underline"
                  >
                    {isRequestingLocation ? <Loader2 className="w-4 h-4 animate-spin" /> : <MapPin className="w-4 h-4" />}
                    Detect My Location
                  </button>
                </div>
              )}

              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-12 gap-4">
                  {userLocation && (
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 dark:bg-cred-gray text-gray-500 dark:text-gray-400 rounded-lg text-[10px] font-black uppercase tracking-widest mb-2">
                      <MapPin className="w-3 h-3" />
                      Searching near: {userLocation.includes(',') ? 'GPS' : userLocation}
                    </div>
                  )}
                  <div className="w-12 h-12 border-4 border-blue-100 dark:border-blue-900/40 border-t-blue-600 dark:border-t-blue-400 rounded-full animate-spin" />
                  <p className="text-gray-500 dark:text-gray-400 font-medium animate-pulse">Searching e-commerce sites...</p>
                </div>
              ) : results && !isEditingPincode ? (
                <div className="space-y-6">
                  {userLocation && (
                    <div className="flex items-center justify-between px-4 py-3 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-xl border border-emerald-100 dark:border-emerald-900/40">
                      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest">
                        <MapPin className="w-3 h-3" />
                        Location: {userLocation.includes(',') ? 'GPS Active' : `Pincode ${userLocation}`}
                      </div>
                      <button 
                        onClick={() => setIsEditingPincode(true)}
                        className="text-[10px] font-black uppercase tracking-widest hover:underline"
                      >
                        Change
                      </button>
                    </div>
                  )}
                  
                  <div className="prose prose-blue dark:prose-invert max-w-none">
                    <div className="markdown-body prose-table:border prose-table:border-gray-200 dark:prose-table:border-white/10 prose-th:bg-gray-50 dark:prose-th:bg-cred-gray prose-th:p-3 prose-th:text-[10px] prose-th:font-black prose-th:uppercase prose-th:tracking-widest prose-td:p-3 prose-td:border-t prose-td:border-gray-100 dark:prose-td:border-white/5">
                      <Markdown
                        components={{
                          a: ({ node, ...props }) => (
                            <a 
                              {...props} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-black uppercase tracking-widest rounded-lg transition-all flex items-center gap-2 inline-flex no-underline"
                            >
                              Buy Now
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          ),
                          table: ({ children }) => (
                            <div className="overflow-x-auto my-4 rounded-2xl border border-gray-200 dark:border-white/10 shadow-sm bg-white dark:bg-cred-gray/30">
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
                </div>
              ) : userLocation && (
                <div className="text-center py-12">
                  <p className="text-gray-500 dark:text-gray-400">No results found. Try again later.</p>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-cred-gray/50 flex justify-between items-center shrink-0">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                Prices may vary by location
              </p>
              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="px-6 py-2 bg-white dark:bg-cred-gray border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-300 font-semibold rounded-xl hover:bg-gray-100 dark:hover:bg-cred-dark transition-all text-sm"
                >
                  Close
                </button>
                {results && (
                  <button
                    onClick={() => onRetry()}
                    className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-all text-sm shadow-lg shadow-blue-200 dark:shadow-none"
                  >
                    Refresh
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
