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
            <div className="p-6 md:p-8 border-b border-white/5 flex items-center justify-between bg-white/5 shrink-0">
              <div className="flex items-center gap-3 md:gap-4">
                <div className="p-2 md:p-3 bg-cred-primary rounded-xl md:rounded-2xl shadow-lg transform -rotate-3">
                  <ShoppingCart className="w-5 h-5 md:w-6 md:h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-lg md:text-2xl font-black text-white tracking-tighter uppercase">Price Check</h2>
                  <p className="text-[10px] md:text-sm font-bold text-gray-500 uppercase tracking-widest">
                    Best deals for <span className="text-cred-primary">{itemName}</span>
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 md:p-3 hover:bg-white/5 rounded-xl md:rounded-2xl transition-all border border-transparent hover:border-white/10"
              >
                <X className="w-5 h-5 md:w-6 md:h-6 text-gray-500" />
              </button>
            </div>

            <div className="p-4 md:p-8 overflow-y-auto flex-1 bg-cred-black">
              {(!userLocation || isEditingPincode) && !isLoading && (
                <div className="flex flex-col items-center justify-center py-8 md:py-12 text-center space-y-6 md:space-y-8">
                  <div className="w-16 h-16 md:w-20 md:h-20 bg-white/5 text-cred-accent rounded-3xl flex items-center justify-center shadow-inner transform rotate-6 border border-white/5">
                    <MapPin className="w-8 h-8 md:w-10 md:h-10" />
                  </div>
                  <div className="max-w-sm px-4">
                    <h3 className="text-xl md:text-2xl font-black mb-2 md:mb-3 tracking-tight text-white">Location Required</h3>
                    <p className="text-sm md:text-base text-gray-500 font-medium">Enter your pincode to find local prices.</p>
                  </div>
                  
                  <form onSubmit={handlePincodeSubmit} className="w-full max-w-xs space-y-4 px-4">
                    <input
                      type="text"
                      placeholder="Pincode"
                      value={manualPincode}
                      onChange={(e) => setManualPincode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-center text-xl font-black tracking-[0.3em] focus:border-cred-primary outline-none transition-all text-white"
                    />
                    <button
                      type="submit"
                      disabled={manualPincode.length !== 6}
                      className="w-full cred-button-primary py-4 text-lg"
                    >
                      Search
                    </button>
                  </form>

                  <div className="flex items-center gap-6 w-full max-w-xs px-4">
                    <div className="flex-1 h-px bg-white/5" />
                    <span className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em]">OR</span>
                    <div className="flex-1 h-px bg-white/5" />
                  </div>

                  <button
                    onClick={handleRequestLocation}
                    disabled={isRequestingLocation}
                    className="flex items-center gap-3 text-cred-accent font-black text-xs uppercase tracking-widest hover:scale-105 transition-transform"
                  >
                    {isRequestingLocation ? <Loader2 className="w-5 h-5 animate-spin" /> : <MapPin className="w-5 h-5" />}
                    Detect My Location
                  </button>
                </div>
              )}

              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-6">
                  <div className="relative">
                    <div className="w-20 h-20 border-8 border-white/5 border-t-cred-primary rounded-full animate-spin" />
                    <ShoppingCart className="w-8 h-8 text-cred-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
                  </div>
                  <div className="text-center">
                    <p className="text-xl font-black tracking-tight mb-1 text-white">Scanning Platforms...</p>
                    <p className="text-sm text-gray-500 font-medium animate-pulse">Checking Zepto, Blinkit, and more</p>
                  </div>
                </div>
              ) : error ? (
                <div className="text-center py-12 md:py-20 space-y-6 px-4">
                  <div className="w-16 h-16 md:w-20 md:h-20 bg-cred-primary/10 rounded-full flex items-center justify-center mx-auto mb-4 md:mb-6">
                    <AlertTriangle className="w-8 h-8 md:w-10 md:h-10 text-cred-primary" />
                  </div>
                  <h3 className="text-lg md:text-xl font-black tracking-tight text-white">Search Unavailable</h3>
                  <p className="text-sm md:text-base text-gray-500 max-w-sm mx-auto font-medium leading-relaxed">
                    {error}
                  </p>
                  <button 
                    onClick={() => onRetry()}
                    className="mt-4 cred-button-primary px-8"
                  >
                    Try Again
                  </button>
                </div>
              ) : results && results.length > 0 && !isEditingPincode ? (
                <div className="space-y-6 md:space-y-8">
                  {userLocation && (
                    <div className="flex items-center justify-between px-4 md:px-6 py-3 md:py-4 bg-white/5 text-cred-accent rounded-2xl border border-white/5 shadow-sm">
                      <div className="flex items-center gap-2 md:gap-3 text-[10px] md:text-xs font-black uppercase tracking-widest truncate">
                        <MapPin className="w-3 h-3 md:w-4 md:h-4 shrink-0" />
                        <span className="truncate">Location: {userLocation.includes(',') ? 'GPS Active' : `Pincode ${userLocation}`}</span>
                      </div>
                      <button 
                        onClick={() => setIsEditingPincode(true)}
                        className="text-[10px] font-black uppercase tracking-widest hover:text-white underline underline-offset-4 shrink-0 ml-2"
                      >
                        Change
                      </button>
                    </div>
                  )}
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
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
                          className={`relative flex flex-col bg-white/5 rounded-[2rem] border ${isBestValue ? 'border-cred-accent/50 ring-1 ring-cred-accent/20' : 'border-white/5'} overflow-hidden hover:border-white/10 transition-all group h-full`}
                        >
                          {isBestValue && (
                            <div className="absolute top-4 left-4 bg-cred-accent text-white text-[8px] font-black px-3 py-1 rounded-full shadow-lg uppercase tracking-widest z-10">
                              Best Value
                            </div>
                          )}

                          {/* Card Header with Store Logo */}
                          <div className="p-5 border-b border-white/5 bg-white/5 flex items-center justify-between">
                            <div className="h-6 md:h-8 flex items-center">
                              {STORE_LOGOS[storeKey] ? (
                                <img 
                                  src={STORE_LOGOS[storeKey]} 
                                  alt={storeKey} 
                                  className="h-full w-auto object-contain filter brightness-110"
                                  referrerPolicy="no-referrer"
                                  onError={(e) => {
                                    e.currentTarget.onerror = null;
                                    e.currentTarget.style.display = 'none';
                                  }}
                                />
                              ) : (
                                <span className="text-[8px] md:text-[10px] font-black uppercase tracking-widest text-gray-500">{result.storeName}</span>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-[8px] md:text-[10px] font-black text-cred-primary uppercase tracking-widest bg-cred-primary/10 px-2 md:px-3 py-1 rounded-full">
                                {result.quantity}
                              </span>
                            </div>
                          </div>

                          {/* Content Section */}
                          <div className="p-5 flex flex-col flex-1">
                            <div className="mb-4 md:mb-6">
                              <h3 className="text-base md:text-lg font-black text-white leading-tight line-clamp-2 min-h-[2.5rem] md:min-h-[3.5rem]">
                                {result.productName}
                              </h3>
                            </div>

                            <div className="mt-auto space-y-4 md:space-y-6">
                              <div className="flex items-end justify-between">
                                <div>
                                  <div className="text-3xl md:text-4xl font-black tracking-tighter text-white">
                                    ₹{result.price}
                                  </div>
                                  <div className="text-[8px] md:text-[10px] font-bold text-gray-500 uppercase tracking-wider mt-1">
                                    ₹{result.pricePerUnit} / {result.unit}
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="flex items-center justify-end gap-1 text-[8px] font-black text-cred-accent uppercase tracking-widest mb-1">
                                    {result.sourceVerification || 'Verified'}
                                    <Info className="w-2 h-2" />
                                  </div>
                                  {result.sourceUrl && (
                                    <a 
                                      href={result.sourceUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-[8px] font-bold text-gray-500 hover:text-cred-primary transition-colors uppercase tracking-widest flex items-center justify-end gap-1"
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
                                className="w-full cred-button-primary py-4 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 group/btn"
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

                  <div className="flex items-start gap-3 p-4 bg-cred-accent/5 rounded-2xl border border-cred-accent/10">
                    <Info className="w-4 h-4 md:w-5 md:h-5 text-cred-accent shrink-0 mt-0.5" />
                    <p className="text-[10px] md:text-xs text-cred-accent/80 font-medium leading-relaxed">
                      Prices are fetched in real-time. Availability may change based on your exact address.
                    </p>
                  </div>
                </div>
              ) : results && results.length === 0 && !isEditingPincode ? (
                <div className="text-center py-12 md:py-20 space-y-4 px-4">
                  <div className="w-16 h-16 md:w-20 md:h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 md:mb-6 border border-white/5">
                    <ShoppingCart className="w-8 h-8 md:w-10 md:h-10 text-gray-500" />
                  </div>
                  <h3 className="text-lg md:text-xl font-black tracking-tight text-white">No results found</h3>
                  <p className="text-sm text-gray-500 max-w-xs mx-auto">Try a different search term or location.</p>
                  <button 
                    onClick={() => onRetry()}
                    className="mt-4 text-cred-primary font-black text-xs uppercase tracking-widest hover:underline"
                  >
                    Try Again
                  </button>
                </div>
              ) : null}
            </div>

            {/* Footer */}
            <div className="p-4 md:p-8 border-t border-white/5 bg-white/5 flex flex-col md:flex-row justify-between items-center gap-4 md:gap-6 shrink-0">
              <p className="text-[8px] md:text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] text-center md:text-left">
                Prices vary by location • Links open in apps
              </p>
              <div className="flex flex-col sm:flex-row gap-3 md:gap-4 items-center w-full md:w-auto">
                <button
                  onClick={() => window.open(`mailto:support@credgrocery.com?subject=Price%20Inaccuracy%20Report&body=Item:%20${encodeURIComponent(itemName)}%0ALocation:%20GPS%20Active%0AStore:%20Multiple`)}
                  className="text-[8px] md:text-[10px] font-black text-cred-primary uppercase tracking-widest hover:underline"
                >
                  Report Inaccuracy
                </button>
                <div className="flex gap-2 w-full sm:w-auto">
                  <button
                    onClick={onClose}
                    className="flex-1 sm:flex-none px-4 md:px-8 py-3 bg-white/5 border border-white/10 text-white font-black uppercase tracking-widest text-[10px] rounded-xl md:rounded-2xl hover:bg-white/10 transition-all"
                  >
                    Close
                  </button>
                  {results && results.length > 0 && (
                    <button
                      onClick={() => onRetry()}
                      className="flex-1 sm:flex-none px-4 md:px-8 py-3 bg-cred-primary text-white font-black uppercase tracking-widest text-[10px] rounded-xl md:rounded-2xl hover:bg-cred-primary/90 transition-all shadow-lg shadow-cred-primary/20"
                    >
                      Refresh
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
