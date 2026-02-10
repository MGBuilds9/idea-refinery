import React, { memo } from 'react';
import { Reorder, useDragControls } from 'framer-motion';
import { GripVertical, Layers, CheckCircle2 } from 'lucide-react';

// Complexity colors for dark theme
const complexityColors = {
  low: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  medium: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  high: 'bg-red-500/10 text-red-400 border-red-500/20'
};

const FeatureCard = memo(function FeatureCard({ feature, isDragging }) {
  const controls = useDragControls();

  return (
    <div className={`
      card relative group flex items-start gap-3 p-4 rounded-lg border
      ${isDragging ? 'border-[#d4af37] shadow-xl scale-[1.02] z-50' : 'border-white/10 hover:border-[#d4af37]/30'}
      transition-all duration-200 select-none cursor-pointer
    `}>
      {/* Drag Handle */}
      <div
        onPointerDown={(e) => controls.start(e)}
        className="mt-1 p-1 text-zinc-600 hover:text-[#d4af37] hover:bg-[#d4af37]/10 rounded cursor-grab active:cursor-grabbing transition-colors duration-200"
        style={{ minWidth: '44px', minHeight: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        <GripVertical className="w-5 h-5" />
      </div>

      <div className="flex-1 space-y-2">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-white font-sans font-semibold text-lg">
            {feature.title}
          </h3>
          <span className={`text-[10px] uppercase tracking-wider font-sans font-semibold px-2 py-1 rounded border whitespace-nowrap ${complexityColors[feature.complexity] || 'bg-zinc-800 text-zinc-400 border-zinc-700'}`}>
            {feature.complexity}
          </span>
        </div>

        {feature.user_story && (
          <p className="text-sm text-zinc-400 font-sans italic">
            "{feature.user_story}"
          </p>
        )}

        {feature.acceptance_criteria && feature.acceptance_criteria.length > 0 && (
          <div className="pt-2 space-y-1">
            {feature.acceptance_criteria.map((criteria, i) => (
              <div key={i} className="flex items-center gap-2 text-xs text-zinc-500 font-sans">
                <CheckCircle2 className="w-3 h-3 text-[#d4af37] flex-shrink-0" />
                <span>{criteria}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-1 text-zinc-600">
        <Layers className="w-4 h-4" />
      </div>
    </div>
  );
});

export default FeatureCard;
