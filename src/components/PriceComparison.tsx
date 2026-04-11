import React, { useState } from 'react';
import { ShoppingCart, ExternalLink, X, MapPin, Loader2, Info, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { PriceComparisonResult } from '../types';

interface PriceComparisonProps {
  isOpen: boolean;
  onClose: () => void;
  itemName: string;
  results: PriceComparisonResult[] | null;
  error?: string | null;
  isLoading: boolean;
  userLocation: string | null;
  onLocationUpdate: (location: string) => void;
  onRetry: () => void;
}

const STORE_LOGOS: Record<string, string> = {
  'Zepto': 'https://logo.clearbit.com/zepto.com',
  'Blinkit': 'https://logo.clearbit.com/blinkit.com',
  'Amazon Fresh': 'https://logo.clearbit.com/amazon.in',
  'BigBasket': 'https://logo.clearbit.com/bigbasket.com',
  'Swiggy Instamart': 'https://logo.clearbit.com/swiggy.com',
  'Flipkart Grocery': 'https://logo.clearbit.com/flipkart.com'
};

export default function PriceComparison({ 
  isOpen, 
  onClose, 
  itemName, 
  results, 
  error,
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

  // Group results by store for the column layout
  const stores = ['Zepto', 'Blinkit', 'Amazon Fresh', 'BigBasket', 'Swiggy Instamart', 'Flipkart Grocery'];
  
  // Find unique product variants (by name/quantity) to create rows
  const variants = results ? Array.from(new Set(results.map(r => `${r.productName}|${r.quantity}`))) : [];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="bg-white dark:bg-cred-black w-full max-w-5xl rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-white/10"
          >
            {/* Header */}
            <div className="p-8 border-b border-gray-100 dark:border-white/5 flex items-center justify-between bg-gray-50/50 dark:bg-cred-gray/20 shrink-0">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-red-600 rounded-2xl shadow-lg shadow-red-200 dark:shadow-none transform -rotate-3">
                  <ShoppingCart className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tighter uppercase">Price Comparison</h2>
                  <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">
                    Best deals for <span className="text-red-600">{itemName}</span>
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-3 hover:bg-gray-100 dark:hover:bg-cred-gray rounded-2xl transition-all border border-transparent hover:border-gray-200 dark:hover:border-white/10"
              >
                <X className="w-6 h-6 text-gray-400" />
              </button>
            </div>

            <div className="p-8 overflow-y-auto flex-1 bg-white dark:bg-cred-black">
              {(!userLocation || isEditingPincode) && !isLoading && (
                <div className="flex flex-col items-center justify-center py-12 text-center space-y-8">
                  <div className="w-20 h-20 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 rounded-3xl flex items-center justify-center shadow-inner transform rotate-6">
                    <MapPin className="w-10 h-10" />
                  </div>
                  <div className="max-w-sm">
                    <h3 className="text-2xl font-black mb-3 tracking-tight">Location Required</h3>
                    <p className="text-gray-500 dark:text-gray-400 font-medium">Enter your pincode or share location to find the best local prices and availability.</p>
                  </div>
                  
                  <form onSubmit={handlePincodeSubmit} className="w-full max-w-xs space-y-4">
                    <input
                      type="text"
                      placeholder="6-digit Pincode"
                      value={manualPincode}
                      onChange={(e) => setManualPincode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      className="w-full px-6 py-4 bg-gray-50 dark:bg-cred-gray border border-gray-200 dark:border-white/10 rounded-2xl text-center text-xl font-black tracking-[0.3em] focus:ring-4 focus:ring-red-500/20 outline-none transition-all"
                    />
                    <button
                      type="submit"
                      disabled={manualPincode.length !== 6}
                      className="w-full cred-button-primary disabled:opacity-50 disabled:cursor-not-allowed py-4 text-lg"
                    >
                      Search Prices
                    </button>
                  </form>

                  <div className="flex items-center gap-6 w-full max-w-xs">
                    <div className="flex-1 h-px bg-gray-100 dark:bg-white/5" />
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em]">OR</span>
                    <div className="flex-1 h-px bg-gray-100 dark:bg-white/5" />
                  </div>

                  <button
                    onClick={handleRequestLocation}
                    disabled={isRequestingLocation}
                    className="flex items-center gap-3 text-red-600 dark:text-red-400 font-black text-xs uppercase tracking-widest hover:scale-105 transition-transform"
                  >
                    {isRequestingLocation ? <Loader2 className="w-5 h-5 animate-spin" /> : <MapPin className="w-5 h-5" />}
                    Detect My Location
                  </button>
                </div>
              )}

              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-6">
                  <div className="relative">
                    <div className="w-20 h-20 border-8 border-red-100 dark:border-red-900/20 border-t-red-600 dark:border-t-red-500 rounded-full animate-spin" />
                    <ShoppingCart className="w-8 h-8 text-red-600 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
                  </div>
                  <div className="text-center">
                    <p className="text-xl font-black tracking-tight mb-1">Scanning Platforms...</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 font-medium animate-pulse">Checking Zepto, Blinkit, and more</p>
                  </div>
                </div>
              ) : error ? (
                <div className="text-center py-20 space-y-6">
                  <div className="w-20 h-20 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-6">
                    <AlertTriangle className="w-10 h-10 text-red-600" />
                  </div>
                  <h3 className="text-xl font-black tracking-tight">Search Unavailable</h3>
                  <p className="text-gray-500 dark:text-gray-400 max-w-sm mx-auto font-medium leading-relaxed">
                    {error}
                  </p>
                  <button 
                    onClick={() => onRetry()}
                    className="mt-4 px-8 py-3 bg-red-600 text-white font-black uppercase tracking-widest text-[10px] rounded-2xl hover:bg-red-700 transition-all shadow-xl shadow-red-200 dark:shadow-none"
                  >
                    Try Again
                  </button>
                </div>
              ) : results && results.length > 0 && !isEditingPincode ? (
                <div className="space-y-8">
                  {userLocation && (
                    <div className="flex items-center justify-between px-6 py-4 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-2xl border border-emerald-100 dark:border-emerald-900/40 shadow-sm shadow-emerald-100/50 dark:shadow-none">
                      <div className="flex items-center gap-3 text-xs font-black uppercase tracking-widest">
                        <MapPin className="w-4 h-4" />
                        Location: {userLocation.includes(',') ? 'GPS Active' : `Pincode ${userLocation}`}
                      </div>
                      <button 
                        onClick={() => setIsEditingPincode(true)}
                        className="text-[10px] font-black uppercase tracking-widest hover:text-emerald-700 dark:hover:text-emerald-300 underline underline-offset-4"
                      >
                        Change
                      </button>
                    </div>
                  )}
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {results.map((result, idx) => {
                      const storeKey = Object.keys(STORE_LOGOS).find(k => 
                        result.storeName.toLowerCase().includes(k.toLowerCase())
                      ) || result.storeName;

                      const isBestValue = idx === 0;

                      return (
                        <motion.div
                          key={idx}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.05 }}
                          className={`relative flex flex-col bg-white dark:bg-cred-gray/10 rounded-[2.5rem] border ${isBestValue ? 'border-emerald-500/50 ring-1 ring-emerald-500/20' : 'border-gray-100 dark:border-white/5'} overflow-hidden hover:shadow-2xl transition-all group h-full`}
                        >
                          {isBestValue && (
                            <div className="absolute top-4 left-4 bg-emerald-500 text-white text-[10px] font-black px-4 py-1.5 rounded-full shadow-lg uppercase tracking-widest z-10">
                              Best Value
                            </div>
                          )}

                          {/* Card Header with Store Logo */}
                          <div className="p-6 border-b border-gray-100 dark:border-white/5 bg-gray-50/30 dark:bg-white/5 flex items-center justify-between">
                            <div className="h-8 flex items-center">
                              {STORE_LOGOS[storeKey] ? (
                                <img 
                                  src={STORE_LOGOS[storeKey]} 
                                  alt={storeKey} 
                                  className="h-full w-auto object-contain filter dark:brightness-110"
                                  referrerPolicy="no-referrer"
                                  onError={(e) => {
                                    e.currentTarget.onerror = null;
                                    e.currentTarget.style.display = 'none';
                                  }}
                                />
                              ) : (
                                <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">{result.storeName}</span>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-black text-red-600 uppercase tracking-widest bg-red-50 dark:bg-red-900/20 px-3 py-1 rounded-full">
                                {result.quantity}
                              </span>
                            </div>
                          </div>

                          {/* Content Section */}
                          <div className="p-6 flex flex-col flex-1">
                            <div className="mb-6">
                              <h3 className="text-lg font-black text-gray-900 dark:text-white leading-tight line-clamp-2 min-h-[3.5rem]">
                                {result.productName}
                              </h3>
                            </div>

                            <div className="mt-auto space-y-6">
                              <div className="flex items-end justify-between">
                                <div>
                                  <div className="text-4xl font-black tracking-tighter text-gray-900 dark:text-white">
                                    ₹{result.price}
                                  </div>
                                  <div className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mt-1">
                                    ₹{result.pricePerUnit} / {result.unit}
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="flex items-center justify-end gap-1 text-[8px] font-black text-emerald-600 uppercase tracking-widest mb-1">
                                    {result.sourceVerification || 'Verified'}
                                    <Info className="w-2 h-2" />
                                  </div>
                                  {result.sourceUrl && (
                                    <a 
                                      href={result.sourceUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-[8px] font-bold text-gray-400 hover:text-red-600 transition-colors uppercase tracking-widest flex items-center justify-end gap-1"
                                    >
                                      Source <ExternalLink className="w-2 h-2" />
                                    </a>
                                  )}
                                </div>
                              </div>

                              <a 
                                href={result.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-full cred-button-primary py-4 text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 group/btn"
                              >
                                Buy Now
                                <ExternalLink className="w-4 h-4 group-hover/btn:translate-x-1 group-hover/btn:-translate-y-1 transition-transform" />
                              </a>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>

                  <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-2xl border border-blue-100 dark:border-blue-900/40">
                    <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                    <p className="text-xs text-blue-700 dark:text-blue-300 font-medium leading-relaxed">
                      Prices are fetched in real-time from multiple platforms. Availability and final price may change based on your exact delivery address within the selected location.
                    </p>
                  </div>
                </div>
              ) : results && results.length === 0 && !isEditingPincode ? (
                <div className="text-center py-20 space-y-4">
                  <div className="w-20 h-20 bg-gray-50 dark:bg-cred-gray rounded-full flex items-center justify-center mx-auto mb-6">
                    <ShoppingCart className="w-10 h-10 text-gray-300" />
                  </div>
                  <h3 className="text-xl font-black tracking-tight">No results found</h3>
                  <p className="text-gray-500 dark:text-gray-400 max-w-xs mx-auto">We couldn't find any variants for "{itemName}" at your location. Try a different search term or location.</p>
                  <button 
                    onClick={() => onRetry()}
                    className="mt-4 text-red-600 font-black text-xs uppercase tracking-widest hover:underline"
                  >
                    Try Again
                  </button>
                </div>
              ) : null}
            </div>

            {/* Footer */}
            <div className="p-8 border-t border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-cred-gray/50 flex justify-between items-center shrink-0">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">
                Prices may vary by location • Links open in mobile apps if installed
              </p>
              <div className="flex gap-4 items-center">
                <button
                  onClick={() => window.open(`mailto:support@credgrocery.com?subject=Price%20Inaccuracy%20Report&body=Item:%20${encodeURIComponent(itemName)}%0ALocation:%20GPS%20Active%0AStore:%20Multiple`)}
                  className="text-[10px] font-black text-red-500 uppercase tracking-widest hover:underline"
                >
                  Report Inaccuracy
                </button>
                <div className="flex gap-4">
                  <button
                    onClick={onClose}
                    className="px-8 py-3 bg-white dark:bg-cred-gray border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-300 font-black uppercase tracking-widest text-[10px] rounded-2xl hover:bg-gray-100 dark:hover:bg-cred-dark transition-all shadow-sm"
                  >
                    Close
                  </button>
                  {results && results.length > 0 && (
                    <button
                      onClick={() => onRetry()}
                      className="px-8 py-3 bg-red-600 text-white font-black uppercase tracking-widest text-[10px] rounded-2xl hover:bg-red-700 transition-all shadow-xl shadow-red-200 dark:shadow-none"
                    >
                      Refresh Results
                    </button>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
