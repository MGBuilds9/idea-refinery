import React, { memo } from 'react';
import { Reorder, useDragControls } from 'framer-motion';
import { GripVertical, Layers, CheckCircle2 } from 'lucide-react';

// Optimized: Wrapped in React.memo to prevent unnecessary re-renders during drag operations or parent updates
const FeatureCard = memo(function FeatureCard({ feature, isDragging }) {
  const controls = useDragControls();

  const complexityColors = {
    low: 'bg-green-50 text-green-700 border-green-200',
    medium: 'bg-amber-50 text-amber-700 border-amber-200',
    high: 'bg-red-50 text-red-700 border-red-200'
  };

  const complexityColorsDark = {
    low: 'dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/20',
    medium: 'dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20',
    high: 'dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20'
  };

  return (
    <div className={`
      card relative group flex items-start gap-3 p-4 rounded-lg border 
      ${isDragging ? 'border-[var(--color-primary)] shadow-[var(--shadow-xl)] scale-[1.02] z-50' : 'border-[var(--color-border)] hover:border-[var(--color-primary)]/50'}
      transition-all duration-200 select-none cursor-pointer
    `}>
      {/* Drag Handle */}
      <div 
        onPointerDown={(e) => controls.start(e)}
        className="mt-1 p-1 text-[var(--color-text-muted)] hover:text-[var(--color-primary)] hover:bg-[var(--color-background)] rounded cursor-grab active:cursor-grabbing transition-colors duration-200"
        style={{ minWidth: '44px', minHeight: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        <GripVertical className="w-5 h-5" />
      </div>

      <div className="flex-1 space-y-2">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-[var(--color-text)] font-[var(--font-heading)] font-semibold text-lg">
            {feature.title}
          </h3>
          <span className={`text-[10px] uppercase tracking-wider font-[var(--font-body)] font-semibold px-2 py-1 rounded border whitespace-nowrap ${complexityColors[feature.complexity] || 'bg-gray-50 text-gray-700 border-gray-200'} ${complexityColorsDark[feature.complexity] || ''}`}>
            {feature.complexity}
          </span>
        </div>
        
        {feature.user_story && (
          <p className="text-sm text-[var(--color-text-muted)] font-[var(--font-body)] italic">
            "{feature.user_story}"
          </p>
        )}

        {feature.acceptance_criteria && feature.acceptance_criteria.length > 0 && (
          <div className="pt-2 space-y-1">
            {feature.acceptance_criteria.map((criteria, i) => (
              <div key={i} className="flex items-center gap-2 text-xs text-[var(--color-text-muted)] font-[var(--font-body)]">
                <CheckCircle2 className="w-3 h-3 text-[var(--color-primary)] flex-shrink-0" />
                <span>{criteria}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-1 text-[var(--color-text-muted)]">
        <Layers className="w-4 h-4" />
      </div>
    </div>
  );
});

export default FeatureCard;
