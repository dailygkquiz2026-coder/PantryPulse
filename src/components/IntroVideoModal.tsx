import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ArrowRight, PlayCircle } from 'lucide-react';

interface IntroVideoModalProps {
  isOpen: boolean;
  onClose: () => void;
  viewCount: number;
}

const VIDEO_ID = '5wqJIKIwB9Q';
export const INTRO_MAX_VIEWS = 10;

export default function IntroVideoModal({ isOpen, onClose, viewCount }: IntroVideoModalProps) {
  const remaining = INTRO_MAX_VIEWS - viewCount;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 24 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="w-full max-w-2xl bg-cred-black rounded-3xl overflow-hidden shadow-[0_32px_80px_rgba(0,0,0,0.9)] border border-white/10"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 pt-6 pb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-6 h-6 bg-red-600 rounded-md flex items-center justify-center">
                    <span className="text-white font-black text-[10px] italic">PP</span>
                  </div>
                  <span className="text-xs font-black text-red-500 uppercase tracking-widest">
                    Welcome
                  </span>
                </div>
                <h2 className="text-xl font-black text-white leading-tight">
                  See how PantryPulse works
                </h2>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Video */}
            <div className="relative w-full aspect-video bg-black">
              <iframe
                src={`https://www.youtube.com/embed/${VIDEO_ID}?rel=0&modestbranding=1&showinfo=0`}
                title="PantryPulse Introduction"
                allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                referrerPolicy="strict-origin-when-cross-origin"
                className="absolute inset-0 w-full h-full"
              />
            </div>

            {/* Footer */}
            <div className="px-6 py-5 flex items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-gray-500 text-sm">
                <PlayCircle className="w-4 h-4 shrink-0" />
                <span>
                  {remaining > 1
                    ? `You can replay this ${remaining - 1} more time${remaining - 1 === 1 ? '' : 's'}`
                    : 'Last time this will appear'}
                </span>
              </div>
              <button
                onClick={onClose}
                className="flex items-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-bold rounded-xl transition-all whitespace-nowrap shadow-lg shadow-red-900/40"
              >
                Get Started
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
