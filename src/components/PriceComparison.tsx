import React, { useState } from 'react';
import { ShoppingCart, ExternalLink, X, MapPin, Loader2, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { PriceComparisonResult } from '../types';

interface PriceComparisonProps {
  isOpen: boolean;
  onClose: () => void;
  itemName: string;
  results: PriceComparisonResult[] | null;
  isLoading: boolean;
  userLocation: string | null;
  onLocationUpdate: (location: string) => void;
  onRetry: () => void;
}

const STORE_LOGOS: Record<string, string> = {
  'Zepto': 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7d/Zepto_Logo.svg/512px-Zepto_Logo.svg.png',
  'Blinkit': 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2f/Blinkit_logo.svg/512px-Blinkit_logo.svg.png',
  'Amazon Fresh': 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a9/Amazon_logo.svg/512px-Amazon_logo.svg.png',
  'BigBasket': 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d2/BigBasket_Logo.svg/512px-BigBasket_Logo.svg.png',
  'Swiggy Instamart': 'https://upload.wikimedia.org/wikipedia/en/thumb/1/12/Swiggy_logo.svg/512px-Swiggy_logo.svg.png',
  'Flipkart Grocery': 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/17/Flipkart_logo.png/512px-Flipkart_logo.png'
};

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
                  
                  <div className="overflow-x-auto rounded-[2rem] border border-gray-100 dark:border-white/5 shadow-xl bg-white dark:bg-cred-gray/10">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="bg-gray-50/50 dark:bg-cred-gray/30">
                          {stores.map(store => (
                            <th key={store} className="p-6 text-center border-b border-gray-100 dark:border-white/5 min-w-[180px]">
                              <div className="flex flex-col items-center gap-3">
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Buy On</span>
                                <div className="h-10 flex items-center justify-center">
                                  {STORE_LOGOS[store] ? (
                                    <img 
                                      src={STORE_LOGOS[store]} 
                                      alt={store} 
                                      className="max-h-full max-w-[120px] object-contain filter dark:brightness-110"
                                      referrerPolicy="no-referrer"
                                    />
                                  ) : (
                                    <span className="text-lg font-black tracking-tighter">{store}</span>
                                  )}
                                </div>
                                <span className="text-[10px] font-black text-red-600 uppercase tracking-widest mt-1">Price</span>
                              </div>
                            </th>
                          ))}
                          <th className="p-6 text-center border-b border-gray-100 dark:border-white/5 min-w-[120px]">
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Quantity</span>
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {variants.map((variantKey, idx) => {
                          const [productName, quantity] = variantKey.split('|');
                          return (
                            <tr key={idx} className="group hover:bg-gray-50/50 dark:hover:bg-white/5 transition-colors">
                              {stores.map(store => {
                                const result = results.find(r => r.storeName === store && r.productName === productName && r.quantity === quantity);
                                return (
                                  <td key={store} className="p-6 text-center border-b border-gray-50 dark:border-white/5">
                                    {result ? (
                                      <div className="flex flex-col items-center gap-3">
                                        <span className="text-2xl font-black tracking-tighter text-gray-900 dark:text-white">
                                          ₹{result.price}
                                        </span>
                                        <a 
                                          href={result.link}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-red-200 dark:shadow-none hover:scale-105"
                                        >
                                          Buy Now
                                          <ExternalLink className="w-3 h-3" />
                                        </a>
                                      </div>
                                    ) : (
                                      <span className="text-[10px] font-black text-gray-300 dark:text-gray-600 uppercase tracking-widest">
                                        Not Available
                                      </span>
                                    )}
                                  </td>
                                );
                              })}
                              <td className="p-6 text-center border-b border-gray-50 dark:border-white/5">
                                <div className="flex flex-col items-center gap-1">
                                  <span className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight">{quantity}</span>
                                  <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest text-center leading-tight max-w-[100px] line-clamp-2">
                                    {productName}
                                  </span>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
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
                Prices may vary by location • Real-time data
              </p>
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
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
