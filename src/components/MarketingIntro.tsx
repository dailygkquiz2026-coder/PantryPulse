import React from 'react';
import { motion } from 'motion/react';
import { 
  ChefHat, 
  ShoppingCart, 
  Search, 
  Zap, 
  ArrowRight, 
  Smartphone, 
  Globe, 
  ShieldCheck,
  X
} from 'lucide-react';

interface MarketingIntroProps {
  onClose: () => void;
}

export default function MarketingIntro({ onClose }: MarketingIntroProps) {
  return (
    <div className="fixed inset-0 z-[100] bg-white dark:bg-cred-black overflow-y-auto selection:bg-red-600 selection:text-white">
      {/* Close Button */}
      <button 
        onClick={onClose}
        className="fixed top-6 right-6 z-[110] p-3 bg-gray-100 dark:bg-cred-gray rounded-full hover:scale-110 transition-transform"
      >
        <X className="w-6 h-6 text-gray-900 dark:text-white" />
      </button>

      {/* Hero Section */}
      <section className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute inset-0 opacity-10 dark:opacity-20 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-red-600 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-yellow-400 rounded-full blur-[120px]" />
      </div>

        <motion.div 
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="text-center max-w-4xl z-10"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-full text-xs font-black uppercase tracking-widest mb-8">
            <Zap className="w-3 h-3" />
            The Future of Grocery Management
          </div>
          
          <div className="flex flex-col items-center mb-8">
            <div className="w-20 h-20 bg-red-600 rounded-2xl flex items-center justify-center shadow-2xl mb-6 transform rotate-3">
              <span className="text-white font-black text-4xl italic tracking-tighter">PP</span>
            </div>
            <h1 className="text-7xl md:text-9xl font-black text-gray-900 dark:text-white leading-[0.85] tracking-tighter">
              PANTRY<br />
              <span className="text-red-600">PULSE.</span>
            </h1>
          </div>
          
          <p className="text-xl md:text-2xl text-gray-500 dark:text-gray-400 font-medium max-w-2xl mx-auto mb-12 leading-relaxed">
            Smart inventory tracking, AI-powered price comparison, and trending recipes—all in one place.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button 
              onClick={onClose}
              className="px-8 py-4 bg-red-600 text-white rounded-2xl font-bold text-lg hover:bg-red-700 transition-all flex items-center gap-2 shadow-xl shadow-red-200 dark:shadow-none"
            >
              Get Started Now
              <ArrowRight className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-4 text-sm font-bold text-gray-400 uppercase tracking-widest">
              <div className="flex -space-x-2">
                {[1,2,3].map(i => (
                  <img 
                    key={i}
                    src={`https://picsum.photos/seed/${i+10}/100/100`} 
                    className="w-8 h-8 rounded-full border-2 border-white dark:border-cred-black"
                    alt="User"
                    referrerPolicy="no-referrer"
                  />
                ))}
              </div>
              <span>Trusted by 10k+ Households</span>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Video Section */}
      <section className="py-24 px-6">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-10"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-full text-xs font-black uppercase tracking-widest mb-4">
              <Zap className="w-3 h-3" />
              2 minute walkthrough
            </div>
            <h2 className="text-4xl md:text-5xl font-black text-gray-900 dark:text-white">
              See it in action
            </h2>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="relative rounded-3xl overflow-hidden shadow-2xl border border-gray-100 dark:border-white/10 aspect-video"
          >
            <video
              src="https://firebasestorage.googleapis.com/v0/b/dailygkquiz-490312.firebasestorage.app/o/Video%20Project.mp4?alt=media&token=c46f4f46-aa52-4261-a5eb-f653cfae0d00"
              controls
              playsInline
              className="absolute inset-0 w-full h-full object-cover"
            />
          </motion.div>
        </div>
      </section>

      {/* Feature Grid */}
      <section className="py-24 px-6 bg-gray-50 dark:bg-cred-gray/20">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <FeatureCard 
              icon={<Smartphone className="w-8 h-8" />}
              title="Predictive Restock"
              description="AI analyzes your consumption patterns to tell you exactly when you'll run out of milk or eggs."
              delay={0.1}
            />
            <FeatureCard 
              icon={<Search className="w-8 h-8" />}
              title="Price Comparison"
              description="Instantly find the cheapest source for your groceries across top quick-commerce platforms."
              delay={0.2}
            />
            <FeatureCard 
              icon={<ChefHat className="w-8 h-8" />}
              title="Trending Recipes"
              description="Discover what's trending globally and check if you have the ingredients in your pantry."
              delay={0.3}
            />
          </div>
        </div>
      </section>

      {/* Social Proof Section */}
      <section className="py-24 px-6 overflow-hidden">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center gap-16">
          <div className="flex-1">
            <h2 className="text-5xl font-black text-gray-900 dark:text-white leading-tight mb-6">
              Stop wasting food.<br />
              <span className="text-yellow-500">Start saving money.</span>
            </h2>
            <p className="text-lg text-gray-500 dark:text-gray-400 mb-8">
              PantryPulse helps you manage your household inventory with precision. No more double-buying, no more expired items.
            </p>
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-gray-700 dark:text-gray-300 font-bold">
                <ShieldCheck className="w-6 h-6 text-emerald-500" />
                Secure Firebase Data Sync
              </div>
              <div className="flex items-center gap-3 text-gray-700 dark:text-gray-300 font-bold">
                <Globe className="w-6 h-6 text-red-500" />
                Location-Aware Shopping
              </div>
            </div>
          </div>
          <div className="flex-1 relative">
            <div className="aspect-square bg-red-600 rounded-[40px] rotate-6 absolute inset-0 opacity-10" />
            <img 
              src="https://picsum.photos/seed/pantry/800/800" 
              className="rounded-[40px] shadow-2xl relative z-10 grayscale hover:grayscale-0 transition-all duration-700"
              alt="Pantry Management"
              referrerPolicy="no-referrer"
            />
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <section className="py-24 px-6 text-center bg-red-600">
        <h2 className="text-4xl md:text-6xl font-black text-white mb-8">Ready to pulse?</h2>
        <button 
          onClick={onClose}
          className="px-12 py-6 bg-white text-red-600 rounded-3xl font-black text-xl hover:scale-105 transition-transform shadow-2xl"
        >
          Launch PantryPulse.in
        </button>
      </section>
    </div>
  );
}

function FeatureCard({ icon, title, description, delay }: { icon: React.ReactNode, title: string, description: string, delay: number }) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay, duration: 0.5 }}
      className="p-8 bg-white dark:bg-cred-black rounded-[32px] border border-gray-100 dark:border-white/5 shadow-sm hover:shadow-xl transition-all group"
    >
      <div className="w-16 h-16 bg-gray-50 dark:bg-cred-gray rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-red-600 group-hover:text-white transition-all text-red-600 dark:text-red-400">
        {icon}
      </div>
      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">{title}</h3>
      <p className="text-gray-500 dark:text-gray-400 leading-relaxed">{description}</p>
    </motion.div>
  );
}
