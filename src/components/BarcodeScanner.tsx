import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { X, Loader2, AlertCircle, Camera, RefreshCw, Zap, ZapOff, Image as ImageIcon, Keyboard } from 'lucide-react';
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
  const [isFlashOn, setIsFlashOn] = useState(false);
  const [hasFlash, setHasFlash] = useState(false);
  const [manualBarcode, setManualBarcode] = useState('');
  const [isManualInput, setIsManualInput] = useState(false);
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const toggleFlash = async () => {
    if (!html5QrCodeRef.current || !isScanning) return;
    try {
      const newState = !isFlashOn;
      await html5QrCodeRef.current.applyVideoConstraints({
        // @ts-ignore - Torch is an experimental constraint
        advanced: [{ torch: newState }]
      });
      setIsFlashOn(newState);
    } catch (err) {
      console.error("Failed to toggle flash", err);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !html5QrCodeRef.current) return;

    setIsInitializing(true);
    try {
      const decodedText = await html5QrCodeRef.current.scanFile(file, true);
      onScan(decodedText);
      onClose();
    } catch (err) {
      console.error("Failed to scan image", err);
      alert("Could not find a barcode in this image. Please try again or use the live camera.");
    } finally {
      setIsInitializing(false);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualBarcode.trim()) {
      onScan(manualBarcode.trim());
      onClose();
    }
  };

  const startScanner = async () => {
    if (!isOpen) return;
    
    setIsInitializing(true);
    setError(null);
    setHasFlash(false);
    setIsFlashOn(false);
    
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
        fps: 30, // Higher FPS for smoother scanning
        qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
          // Responsive qrbox
          const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
          const qrboxSize = Math.floor(minEdge * 0.7);
          return {
            width: qrboxSize,
            height: Math.floor(qrboxSize * 0.6) // Rectangular for barcodes
          };
        },
        aspectRatio: 1.0,
        experimentalFeatures: {
          useBarCodeDetectorIfSupported: true
        },
        formatsToSupport: [
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.CODE_93,
          Html5QrcodeSupportedFormats.ITF,
        ]
      };

      await html5QrCode.start(
        { 
          facingMode: "environment",
          // Request higher resolution for better barcode clarity
          width: { min: 640, ideal: 1280, max: 1920 },
          height: { min: 480, ideal: 720, max: 1080 }
        },
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

      // Check for flash support
      try {
        const track = (html5QrCode as any).getRunningTrack();
        const capabilities = track.getCapabilities();
        if (capabilities.torch) {
          setHasFlash(true);
        }
      } catch (e) {
        console.log("Flash support check failed", e);
      }

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
                
                {isScanning && !isManualInput && (
                  <>
                    <div className="absolute inset-0 border-[40px] border-black/40 pointer-events-none"></div>
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[280px] h-[180px] border-2 border-red-500 rounded-lg pointer-events-none shadow-[0_0_20px_rgba(239,68,68,0.5)]">
                      <motion.div 
                         animate={{ top: ['0%', '100%', '0%'] }}
                         transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                         className="absolute left-0 right-0 h-0.5 bg-red-500 shadow-[0_0_10px_rgba(239,68,68,1)]"
                      />
                    </div>
                    
                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-4">
                      {hasFlash && (
                        <button
                          onClick={toggleFlash}
                          className="p-4 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-2xl transition-all border border-white/10"
                        >
                          {isFlashOn ? <ZapOff className="w-6 h-6 text-yellow-400" /> : <Zap className="w-6 h-6 text-white" />}
                        </button>
                      )}
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="p-4 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-2xl transition-all border border-white/10"
                      >
                        <ImageIcon className="w-6 h-6 text-white" />
                      </button>
                      <button
                        onClick={() => setIsManualInput(true)}
                        className="p-4 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-2xl transition-all border border-white/10"
                      >
                        <Keyboard className="w-6 h-6 text-white" />
                      </button>
                    </div>
                  </>
                )}

                {isManualInput && (
                  <div className="absolute inset-0 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-8">
                    <form onSubmit={handleManualSubmit} className="w-full space-y-6">
                      <div className="text-center space-y-2">
                        <Keyboard className="w-12 h-12 text-blue-500 mx-auto" />
                        <h3 className="text-xl font-bold text-white">Manual Entry</h3>
                        <p className="text-gray-400 text-sm">Enter the barcode number manually</p>
                      </div>
                      <input
                        autoFocus
                        type="text"
                        value={manualBarcode}
                        onChange={(e) => setManualBarcode(e.target.value)}
                        placeholder="e.g. 8901234567890"
                        className="cred-input text-center text-2xl font-mono"
                      />
                      <div className="flex gap-3">
                        <button
                          type="button"
                          onClick={() => setIsManualInput(false)}
                          className="flex-1 py-4 bg-white/10 hover:bg-white/20 text-white font-bold rounded-2xl"
                        >
                          Back
                        </button>
                        <button
                          type="submit"
                          disabled={!manualBarcode.trim()}
                          className="flex-1 py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl disabled:opacity-50"
                        >
                          Confirm
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImageUpload}
                  accept="image/*"
                  className="hidden"
                />

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
