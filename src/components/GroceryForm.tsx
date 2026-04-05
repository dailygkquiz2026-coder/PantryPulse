import React, { useState, useRef } from 'react';
import { CATEGORIES, UNITS } from '../constants';
import { Plus, ShoppingCart, Camera, Loader2, FileText, Barcode } from 'lucide-react';
import { motion } from 'motion/react';
import AutocompleteInput from './AutocompleteInput';
import { analyzeProductImage, analyzeInvoiceImage, identifyProductByBarcode } from '../services/geminiService';
import InvoiceReviewModal from './InvoiceReviewModal';
import BarcodeScanner from './BarcodeScanner';

interface GroceryFormProps {
  onAdd: (item: any) => void;
  onAddMultiple: (items: any[]) => void;
}

export default function GroceryForm({ onAdd, onAddMultiple }: GroceryFormProps) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [quantity, setQuantity] = useState(1);
  const [unit, setUnit] = useState(UNITS[0]);
  const [price, setPrice] = useState(0);
  const [usageFrequency, setUsageFrequency] = useState(1);
  const [expiryDate, setExpiryDate] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isScanningInvoice, setIsScanningInvoice] = useState(false);
  const [isScanningBarcode, setIsScanningBarcode] = useState(false);
  const [isIdentifyingBarcode, setIsIdentifyingBarcode] = useState(false);
  
  // Invoice Review State
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [scannedInvoiceData, setScannedInvoiceData] = useState<{ purchaseDate: string | null, items: any[] } | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const invoiceInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) {
      alert("Please enter a product name");
      return;
    }
    
    console.log("Submitting manual input:", { name, category, quantity, unit, price, usageFrequency });

    const newItem: any = {
      name,
      category,
      quantity,
      unit,
      price,
      usageFrequency,
      purchaseDate: new Date().toISOString(),
      lastUpdated: new Date().toISOString()
    };

    if (expiryDate) {
      newItem.expiryDate = expiryDate;
    }

    onAdd(newItem);
    
    setName('');
    setQuantity(1);
    setPrice(0);
    setUsageFrequency(1);
    setExpiryDate('');
  };

  const handleImageCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsAnalyzing(true);
    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        const base64 = (reader.result as string).split(',')[1];
        const details = await analyzeProductImage(base64);
        
        setName(`${details.brand} ${details.productName}`);
        setCategory(details.category);
        setUnit(details.unit);
        setQuantity(details.suggestedQuantity || 1);
      } catch (error: any) {
        console.error("Image analysis failed:", error);
        alert(`Product analysis failed: ${error.message || 'Unknown error'}`);
      } finally {
        setIsAnalyzing(false);
      }
    };
    reader.onerror = () => {
      console.error("File reading failed");
      setIsAnalyzing(false);
    };
    reader.readAsDataURL(file);
  };

  const handleBarcodeScan = async (barcode: string) => {
    setIsIdentifyingBarcode(true);
    try {
      console.log("Identifying product by barcode:", barcode);
      const details = await identifyProductByBarcode(barcode);
      
      setName(`${details.brand} ${details.productName}`);
      setCategory(details.category);
      setUnit(details.unit);
      setQuantity(details.suggestedQuantity || 1);
    } catch (error: any) {
      console.error("Barcode identification failed:", error);
      alert(`Barcode identification failed: ${error.message || 'Unknown error'}`);
    } finally {
      setIsIdentifyingBarcode(false);
    }
  };

  const handleInvoiceCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsScanningInvoice(true);
    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        const base64 = (reader.result as string).split(',')[1];
        const data = await analyzeInvoiceImage(base64);
        setScannedInvoiceData(data);
        setIsInvoiceModalOpen(true);
      } catch (error: any) {
        console.error("Invoice analysis failed:", error);
        alert(`Invoice analysis failed: ${error.message || 'Unknown error'}`);
      } finally {
        setIsScanningInvoice(false);
      }
    };
    reader.onerror = () => {
      console.error("File reading failed");
      setIsScanningInvoice(false);
    };
    reader.readAsDataURL(file);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="cred-card p-8"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-10">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-black dark:bg-white rounded-2xl shadow-lg">
            <Plus className="w-6 h-6 text-white dark:text-black" />
          </div>
          <h2 className="text-3xl font-black tracking-tighter">Log Purchase</h2>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setIsScanningBarcode(true)}
            disabled={isIdentifyingBarcode}
            className="flex items-center gap-2 px-6 py-3 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 rounded-2xl hover:bg-purple-100 transition-all font-black uppercase tracking-widest text-[10px] disabled:opacity-50"
          >
            {isIdentifyingBarcode ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Barcode className="w-4 h-4" />
            )}
            {isIdentifyingBarcode ? 'Identifying...' : 'Scan Barcode'}
          </button>

          <button
            type="button"
            onClick={() => invoiceInputRef.current?.click()}
            disabled={isScanningInvoice}
            className="flex items-center gap-2 px-6 py-3 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 rounded-2xl hover:bg-amber-100 transition-all font-black uppercase tracking-widest text-[10px] disabled:opacity-50"
          >
            {isScanningInvoice ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <FileText className="w-4 h-4" />
            )}
            {isScanningInvoice ? 'Scanning...' : 'Scan Invoice'}
          </button>
          
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isAnalyzing}
            className="flex items-center gap-2 px-6 py-3 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-2xl hover:bg-blue-100 transition-all font-black uppercase tracking-widest text-[10px] disabled:opacity-50"
          >
            {isAnalyzing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Camera className="w-4 h-4" />
            )}
            {isAnalyzing ? 'Analyzing...' : 'Scan Product'}
          </button>
        </div>

        <input
          type="file"
          ref={fileInputRef}
          onChange={handleImageCapture}
          accept="image/*"
          capture="environment"
          className="hidden"
        />
        <input
          type="file"
          ref={invoiceInputRef}
          onChange={handleInvoiceCapture}
          accept="image/*"
          capture="environment"
          className="hidden"
        />
      </div>

      <InvoiceReviewModal
        isOpen={isInvoiceModalOpen}
        onClose={() => setIsInvoiceModalOpen(false)}
        purchaseDate={scannedInvoiceData?.purchaseDate || null}
        items={scannedInvoiceData?.items || []}
        onConfirm={onAddMultiple}
      />

      <BarcodeScanner
        isOpen={isScanningBarcode}
        onClose={() => setIsScanningBarcode(false)}
        onScan={handleBarcodeScan}
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-2">Item Name</label>
            <AutocompleteInput
              value={name}
              onChange={setName}
              placeholder="e.g. Milk, Bread"
              className="cred-input"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-2">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="cred-input appearance-none"
            >
              {CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-2">Quantity</label>
              <input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                min="0.1"
                step="0.1"
                className="cred-input"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-2">Unit</label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="cred-input appearance-none"
              >
                {UNITS.map(u => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-2">Price (Optional)</label>
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(Number(e.target.value))}
              min="0"
              step="0.01"
              className="cred-input"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-2">Usage Frequency (times/day)</label>
            <input
              type="number"
              value={usageFrequency}
              onChange={(e) => setUsageFrequency(Number(e.target.value))}
              min="0.1"
              step="0.1"
              className="cred-input"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-2">Expiry Date (Optional)</label>
            <input
              type="date"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
              className="cred-input"
            />
          </div>
        </div>

        <button
          type="submit"
          className="cred-button-primary w-full flex items-center justify-center gap-3 mt-4"
        >
          <ShoppingCart className="w-6 h-6" />
          Add to Inventory
        </button>
      </form>
    </motion.div>
  );
}
