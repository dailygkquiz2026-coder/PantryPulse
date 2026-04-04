import React, { useState, useRef } from 'react';
import { CATEGORIES, UNITS } from '../constants';
import { Plus, ShoppingCart, Camera, Loader2, FileText } from 'lucide-react';
import { motion } from 'motion/react';
import AutocompleteInput from './AutocompleteInput';
import { analyzeProductImage, analyzeInvoiceImage } from '../services/geminiService';
import InvoiceReviewModal from './InvoiceReviewModal';

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
  
  // Invoice Review State
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [scannedInvoiceData, setScannedInvoiceData] = useState<{ purchaseDate: string | null, items: any[] } | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const invoiceInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;
    onAdd({
      name,
      category,
      quantity,
      unit,
      price,
      usageFrequency,
      expiryDate: expiryDate || undefined,
      purchaseDate: new Date().toISOString(),
      lastUpdated: new Date().toISOString()
    });
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
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = (reader.result as string).split(',')[1];
        const details = await analyzeProductImage(base64);
        
        setName(`${details.brand} ${details.productName}`);
        setCategory(details.category);
        setUnit(details.unit);
        setQuantity(details.suggestedQuantity || 1);
        setIsAnalyzing(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error("Image analysis failed:", error);
      setIsAnalyzing(false);
    }
  };

  const handleInvoiceCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsScanningInvoice(true);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = (reader.result as string).split(',')[1];
        const data = await analyzeInvoiceImage(base64);
        setScannedInvoiceData(data);
        setIsInvoiceModalOpen(true);
        setIsScanningInvoice(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error("Invoice analysis failed:", error);
      setIsScanningInvoice(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-blue-50 rounded-lg">
            <Plus className="w-5 h-5 text-blue-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900">Log Purchase</h2>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => invoiceInputRef.current?.click()}
            disabled={isScanningInvoice}
            className="flex items-center gap-2 px-4 py-2 bg-amber-50 text-amber-600 rounded-xl hover:bg-amber-100 transition-all font-medium disabled:opacity-50"
          >
            {isScanningInvoice ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <FileText className="w-5 h-5" />
            )}
            {isScanningInvoice ? 'Scanning...' : 'Scan Invoice'}
          </button>
          
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isAnalyzing}
            className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-all font-medium disabled:opacity-50"
          >
            {isAnalyzing ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Camera className="w-5 h-5" />
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

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Item Name</label>
            <AutocompleteInput
              value={name}
              onChange={setName}
              placeholder="e.g. Milk, Bread"
              className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
            >
              {CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">Quantity</label>
              <input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                min="0.1"
                step="0.1"
                className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">Unit</label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
              >
                {UNITS.map(u => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Price (Optional)</label>
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(Number(e.target.value))}
              min="0"
              step="0.01"
              className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Usage Frequency (times/day)</label>
            <input
              type="number"
              value={usageFrequency}
              onChange={(e) => setUsageFrequency(Number(e.target.value))}
              min="0.1"
              step="0.1"
              className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Expiry Date (Optional)</label>
            <input
              type="date"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
              className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
            />
          </div>
        </div>

        <button
          type="submit"
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
        >
          <ShoppingCart className="w-5 h-5" />
          Add to Inventory
        </button>
      </form>
    </motion.div>
  );
}
