import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { X, Loader2, AlertCircle, Camera, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface BarcodeScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (barcode: string) => void;
}

export default function BarcodeScanner({ isOpen, onClose, onScan }: BarcodeScannerProps) {
  const [error, setError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);

  const startScanner = async () => {
    if (!isOpen) return;
    
    setIsInitializing(true);
    setError(null);
    
    try {
      // Ensure any existing instance is cleared
      if (html5QrCodeRef.current) {
        try {
          await html5QrCodeRef.current.stop();
        } catch (e) {
          // Ignore stop errors
        }
      }

      const html5QrCode = new Html5Qrcode("barcode-reader");
      html5QrCodeRef.current = html5QrCode;

      const config = {
        fps: 20, // Higher FPS for better responsiveness
        qrbox: { width: 280, height: 180 },
        aspectRatio: 1.0,
        formatsToSupport: [
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
          Html5QrcodeSupportedFormats.CODE_128,
        ]
      };

      await html5QrCode.start(
        { facingMode: "environment" },
        config,
        (decodedText) => {
          setIsScanning(false);
          html5QrCode.stop().then(() => {
            onScan(decodedText);
            onClose();
          }).catch(err => {
            console.error("Failed to stop scanner", err);
            onScan(decodedText);
            onClose();
          });
        },
        (errorMessage) => {
          // Ignore common scan errors
        }
      );

      setIsInitializing(false);
      setIsScanning(true);
    } catch (err: any) {
      console.error("Scanner initialization failed", err);
      let msg = "Could not access camera. Please ensure you have granted permission.";
      if (err.name === "NotAllowedError") msg = "Camera permission denied. Please enable it in your browser settings.";
      if (err.name === "NotFoundError") msg = "No camera found on this device.";
      setError(msg);
      setIsInitializing(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      // Small delay to ensure the DOM element is ready
      const timer = setTimeout(() => {
        startScanner();
      }, 300);

      return () => {
        clearTimeout(timer);
        if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
          html5QrCodeRef.current.stop().catch(err => console.error("Failed to stop scanner on unmount", err));
        }
      };
    }
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="bg-white dark:bg-cred-black w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col border border-white/10"
          >
            <div className="p-8 border-b border-gray-100 dark:border-cred-gray flex items-center justify-between">
              <div>
                <h2 className="text-3xl font-black tracking-tighter text-gray-900 dark:text-white">Scan Barcode</h2>
                <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">Align barcode within the frame</p>
              </div>
              <button 
                onClick={onClose} 
                className="p-3 bg-gray-50 dark:bg-cred-gray hover:bg-gray-100 dark:hover:bg-cred-dark rounded-2xl transition-all"
              >
                <X className="w-6 h-6 text-gray-900 dark:text-white" />
              </button>
            </div>

            <div className="p-8">
              <div className="relative aspect-square bg-black rounded-[2rem] overflow-hidden shadow-inner ring-1 ring-white/10">
                <div id="barcode-reader" className="w-full h-full"></div>
                
                {isScanning && (
                  <>
                    <div className="absolute inset-0 border-[40px] border-black/40 pointer-events-none"></div>
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[280px] h-[180px] border-2 border-red-500 rounded-lg pointer-events-none shadow-[0_0_20px_rgba(239,68,68,0.5)]">
                      <motion.div 
                        animate={{ top: ['0%', '100%', '0%'] }}
                        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                        className="absolute left-0 right-0 h-0.5 bg-red-500 shadow-[0_0_10px_rgba(239,68,68,1)]"
                      />
                    </div>
                  </>
                )}

                {isInitializing && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black text-white gap-4">
                    <div className="w-16 h-16 border-4 border-white/10 border-t-white rounded-full animate-spin" />
                    <p className="font-black uppercase tracking-widest text-[10px]">Initializing Camera</p>
                  </div>
                )}

                {error && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black text-white p-10 text-center gap-6">
                    <div className="w-20 h-20 bg-red-500/20 rounded-[2rem] flex items-center justify-center">
                      <AlertCircle className="w-10 h-10 text-red-500" />
                    </div>
                    <p className="font-bold text-lg leading-tight">{error}</p>
                    <div className="flex flex-col w-full gap-3">
                      <button 
                        onClick={startScanner}
                        className="w-full py-4 bg-white text-black font-black uppercase tracking-widest text-[10px] rounded-2xl flex items-center justify-center gap-2"
                      >
                        <RefreshCw className="w-4 h-4" />
                        Try Again
                      </button>
                      <button 
                        onClick={onClose}
                        className="w-full py-4 bg-white/10 hover:bg-white/20 text-white font-black uppercase tracking-widest text-[10px] rounded-2xl"
                      >
                        Close
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-8 space-y-6">
                <div className="flex items-start gap-4 p-6 bg-blue-50 dark:bg-blue-900/20 rounded-3xl text-blue-700 dark:text-blue-400">
                  <Camera className="w-6 h-6 flex-shrink-0" />
                  <p className="text-sm font-medium leading-relaxed">
                    Ensure good lighting and hold the product steady. Works with EAN-13, UPC, and common retail barcodes.
                  </p>
                </div>
                
                <button
                  onClick={onClose}
                  className="w-full py-5 bg-gray-100 dark:bg-cred-gray text-gray-900 dark:text-white font-black uppercase tracking-widest text-[10px] rounded-2xl hover:bg-gray-200 dark:hover:bg-cred-dark transition-all"
                >
                  Cancel Scan
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
