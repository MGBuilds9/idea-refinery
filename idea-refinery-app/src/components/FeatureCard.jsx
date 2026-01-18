import React from 'react';
import { Reorder, useDragControls } from 'framer-motion';
import { GripVertical, Layers, CheckCircle2 } from 'lucide-react';

export default function FeatureCard({ feature, isDragging }) {
  const controls = useDragControls();

  const complexityColors = {
    low: 'bg-green-500/10 text-green-400 border-green-500/20',
    medium: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    high: 'bg-red-500/10 text-red-400 border-red-500/20'
  };

  return (
    <div className={`
      relative group flex items-start gap-3 p-4 rounded-lg border 
      ${isDragging ? 'bg-slate-800 border-amber-500/50 shadow-lg scale-[1.02] z-50' : 'bg-slate-800/50 border-slate-700 hover:border-slate-600'}
      transition-all duration-200 select-none
    `}>
      {/* Drag Handle */}
      <div 
        onPointerDown={(e) => controls.start(e)}
        className="mt-1 p-1 text-slate-500 hover:text-amber-400 hover:bg-slate-700 rounded cursor-grab active:cursor-grabbing"
      >
        <GripVertical className="w-5 h-5" />
      </div>

      <div className="flex-1 space-y-2">
        <div className="flex items-start justify-between">
          <h3 className="text-white font-medium font-sans">
            {feature.title}
          </h3>
          <span className={`text-[10px] uppercase tracking-wider font-mono px-2 py-0.5 rounded border ${complexityColors[feature.complexity] || 'bg-slate-700 text-slate-300'}`}>
            {feature.complexity}
          </span>
        </div>
        
        {feature.user_story && (
          <p className="text-sm text-slate-400 italic">
            "{feature.user_story}"
          </p>
        )}

        {feature.acceptance_criteria && feature.acceptance_criteria.length > 0 && (
          <div className="pt-2 space-y-1">
            {feature.acceptance_criteria.map((criteria, i) => (
              <div key={i} className="flex items-center gap-2 text-xs text-slate-500">
                <CheckCircle2 className="w-3 h-3 text-slate-600" />
                <span>{criteria}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-1 text-slate-600">
        <Layers className="w-4 h-4" />
      </div>
    </div>
  );
}
