import React from 'react';
import { Sparkles, ArrowRight, Settings } from 'lucide-react';

export default function InputStage({ idea, setIdea, onNext, loading }) {
  return (
    <div className="space-y-8 animate-fade-in">
      <div className="glass-panel rounded-2xl p-1 relative shadow-2xl transition-all hover:shadow-[0_0_30px_rgba(212,175,55,0.05)]">
        <div className="bg-[#1A1A1A]/50 rounded-xl p-6 md:p-8">


          <label className="flex items-center gap-2 text-sm text-[#D4AF37] mb-4 tracking-widest font-mono uppercase opacity-90">
            <Sparkles className="w-4 h-4" />
            Initialize Concept
          </label>
          
          <textarea
            value={idea}
            onChange={(e) => setIdea(e.target.value)}
            placeholder="Describe your vision here..."
            className="w-full h-40 bg-[#0A0A0A] border border-[#333] rounded-lg px-6 py-5 text-white placeholder-gray-600 focus:outline-none input-glow transition-all resize-none font-sans text-lg leading-relaxed"
          />
          {/* Debug info */}
          <div className="flex justify-end mt-3">
             <span className="text-[10px] text-gray-600 font-mono tracking-wider">
               {idea.length} / CHARS
             </span>
          </div>
        </div>
      </div>

      <button
        onClick={onNext}
        disabled={!idea.trim() || loading}
        className="w-full bg-[#D4AF37] hover:bg-[#F5D058] disabled:bg-[#1A1A1A] disabled:text-gray-600 disabled:border disabled:border-gray-800 text-[#0A0A0A] font-bold py-5 rounded-xl transition-all flex items-center justify-center gap-3 group font-mono tracking-wider shadow-[0_0_20px_rgba(212,175,55,0.2)] hover:shadow-[0_0_30px_rgba(212,175,55,0.4)] transform hover:-translate-y-1 active:translate-y-0"
      >
        {loading ? (
          <>INITIALIZING PROTOCOL...</>
        ) : (
          <>
            BEGIN REFINEMENT
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </>
        )}
      </button>
    </div>
  );
}
