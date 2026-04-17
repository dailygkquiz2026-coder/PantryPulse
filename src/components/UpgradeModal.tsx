import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Check, Zap, Sparkles, ShieldCheck, Rocket } from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  uid: string;
}

const UpgradeModal: React.FC<UpgradeModalProps> = ({ isOpen, onClose, uid }) => {
  const [isUpgrading, setIsUpgrading] = useState(false);

  const handleUpgrade = async () => {
    setIsUpgrading(true);
    try {
      await updateDoc(doc(db, 'userProfiles', uid), {
        tier: 'pro'
      });
      onClose();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `userProfiles/${uid}`);
    } finally {
      setIsUpgrading(false);
    }
  };

  const features = [
    { icon: <Sparkles className="w-5 h-5 text-amber-500" />, title: "AI Predictive Restocking", desc: "Advanced algorithms to predict exactly when you'll run out." },
    { icon: <Rocket className="w-5 h-5 text-blue-500" />, title: "Unlimited Recipes", desc: "Save as many recipes as you want with AI meal planning." },
    { icon: <ShieldCheck className="w-5 h-5 text-emerald-500" />, title: "Priority Support", desc: "Get help faster with dedicated support channels." },
    { icon: <Zap className="w-5 h-5 text-purple-500" />, title: "Advanced Analytics", desc: "Deep insights into your household consumption patterns." }
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-lg bg-white dark:bg-cred-black rounded-[2.5rem] overflow-hidden shadow-2xl border border-white/10"
          >
            {/* Header */}
            <div className="relative h-48 bg-gradient-to-br from-amber-400 via-orange-500 to-rose-600 p-8 flex flex-col justify-end">
              <button 
                onClick={onClose}
                className="absolute top-6 right-6 p-2 rounded-full bg-black/20 text-white hover:bg-black/40 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-white/20 rounded-xl backdrop-blur-md">
                  <Zap className="w-6 h-6 text-white fill-current" />
                </div>
                <h2 className="text-3xl font-black text-white">Go Pro</h2>
              </div>
              <p className="text-white/80 font-medium">Unlock the full power of PantryPulse</p>
            </div>

            <div className="p-8">
              <div className="space-y-6 mb-8">
                {features.map((f, i) => (
                  <div key={i} className="flex gap-4">
                    <div className="mt-1">{f.icon}</div>
                    <div>
                      <h4 className="font-black text-gray-900 dark:text-white">{f.title}</h4>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{f.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-900/30 rounded-2xl p-4 mb-8">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-amber-600 dark:text-amber-500 mb-1">Limited Time Offer</p>
                    <p className="text-lg font-black text-gray-900 dark:text-white">Free for Early Adopters</p>
                  </div>
                  <div className="text-right">
                    <span className="text-sm text-gray-400 line-through block">$9.99/mo</span>
                    <span className="text-xl font-black text-amber-600 dark:text-amber-500">$0.00</span>
                  </div>
                </div>
              </div>

              <button
                onClick={handleUpgrade}
                disabled={isUpgrading}
                className="w-full py-4 rounded-2xl bg-gray-900 dark:bg-white text-white dark:text-black font-black text-lg hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isUpgrading ? (
                  <Sparkles className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Rocket className="w-5 h-5" />
                    Unlock Pro Features
                  </>
                )}
              </button>
              
              <p className="text-center text-[10px] text-gray-400 mt-4 uppercase tracking-widest font-bold">
                No credit card required • Cancel anytime
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default UpgradeModal;
