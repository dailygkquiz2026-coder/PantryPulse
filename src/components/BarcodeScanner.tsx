import React, { useEffect, useRef, useState } from 'react';
import { Html5QrcodeScanner, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { X, Loader2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface BarcodeScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (barcode: string) => void;
}

export default function BarcodeScanner({ isOpen, onClose, onScan }: BarcodeScannerProps) {
  const [error, setError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  useEffect(() => {
    if (isOpen) {
      setIsInitializing(true);
      setError(null);
      
      // Small delay to ensure the DOM element is ready
      const timer = setTimeout(() => {
        try {
          const scanner = new Html5QrcodeScanner(
            "barcode-reader",
            { 
              fps: 10, 
              qrbox: { width: 250, height: 150 },
              aspectRatio: 1.0,
              formatsToSupport: [
                Html5QrcodeSupportedFormats.EAN_13,
                Html5QrcodeSupportedFormats.EAN_8,
                Html5QrcodeSupportedFormats.UPC_A,
                Html5QrcodeSupportedFormats.UPC_E,
                Html5QrcodeSupportedFormats.CODE_128,
              ]
            },
            /* verbose= */ false
          );

          scanner.render(
            (decodedText) => {
              scanner.clear().then(() => {
                onScan(decodedText);
                onClose();
              }).catch(err => {
                console.error("Failed to clear scanner", err);
                onScan(decodedText);
                onClose();
              });
            },
            (errorMessage) => {
              // Ignore common scan errors
            }
          );

          scannerRef.current = scanner;
          setIsInitializing(false);
        } catch (err: any) {
          console.error("Scanner initialization failed", err);
          setError("Could not access camera. Please ensure you have granted permission.");
          setIsInitializing(false);
        }
      }, 500);

      return () => {
        clearTimeout(timer);
        if (scannerRef.current) {
          scannerRef.current.clear().catch(err => console.error("Failed to clear scanner on unmount", err));
        }
      };
    }
  }, [isOpen, onScan, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col"
          >
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-blue-600 text-white">
              <div>
                <h2 className="text-2xl font-bold">Scan Barcode</h2>
                <p className="text-blue-100 text-sm">Point your camera at a product barcode</p>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-all">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6">
              <div className="relative aspect-square bg-gray-900 rounded-2xl overflow-hidden border-4 border-gray-100 shadow-inner">
                <div id="barcode-reader" className="w-full h-full"></div>
                
                {isInitializing && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900 text-white gap-4">
                    <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
                    <p className="font-medium">Initializing Camera...</p>
                  </div>
                )}

                {error && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900 text-white p-8 text-center gap-4">
                    <AlertCircle className="w-12 h-12 text-red-500" />
                    <p className="font-medium text-red-400">{error}</p>
                    <button 
                      onClick={onClose}
                      className="px-6 py-2 bg-white/10 hover:bg-white/20 rounded-xl transition-all text-sm"
                    >
                      Close
                    </button>
                  </div>
                )}
              </div>

              <div className="mt-6 space-y-4">
                <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-2xl text-blue-700 text-sm">
                  <div className="w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 font-bold">!</div>
                  <p>Works best with EAN-13 barcodes found on most Indian retail products.</p>
                </div>
                
                <button
                  onClick={onClose}
                  className="w-full py-3 bg-gray-100 text-gray-600 font-bold rounded-xl hover:bg-gray-200 transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
