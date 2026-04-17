import React from 'react';
import { Zap } from 'lucide-react';

interface ProBadgeProps {
  className?: string;
}

const ProBadge: React.FC<ProBadgeProps> = ({ className = "" }) => {
  return (
    <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 text-white text-[10px] font-black uppercase tracking-wider shadow-lg shadow-orange-500/20 ${className}`}>
      <Zap className="w-3 h-3 fill-current" />
      PRO
    </div>
  );
};

export default ProBadge;
