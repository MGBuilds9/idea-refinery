import React, { useState } from 'react';
import { Send, Sparkles } from 'lucide-react';
import PromptSelector from './PromptSelector';

export default function InputStage({ idea, setIdea, onNext, selectedPersona, setSelectedPersona }) {
  const [isFocused, setIsFocused] = useState(false);

  const handleSubmit = async () => {
    if (!idea.trim()) return;
    onNext();
  };

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center px-4">
      {/* Prompt Persona Selector */}
      <PromptSelector 
        selectedPersona={selectedPersona} 
        onSelect={setSelectedPersona} 
      />
      
      <div 
        className={`w-full max-w-2xl transition-all duration-700 ${isFocused ? 'scale-105' : 'scale-100'}`}
      >
        <div className="relative group">
          <div className={`absolute -inset-1 bg-gradient-to-r from-gold/20 via-gold/10 to-gold/20 rounded-2xl blur-lg transition-opacity duration-500 ${isFocused ? 'opacity-100' : 'opacity-0'}`}></div>
          <div className="relative glass-panel rounded-2xl p-6 border border-gold/20">
            <textarea
              value={idea}
              onChange={(e) => setIdea(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder="Refine your raw idea..."
              className="w-full bg-transparent border-none focus:ring-0 text-xl md:text-2xl font-serif text-white/90 placeholder:text-zinc-600 resize-none min-h-[150px] leading-relaxed"
            />
            
            <div className="flex justify-between items-center mt-4 pt-4 border-t border-white/5">
              <span className="text-xs font-mono text-gold/50 uppercase tracking-widest">
                {isFocused ? 'System Active' : 'Ready'}
              </span>
              <button 
                onClick={handleSubmit}
                disabled={!idea.trim()}
                className="flex items-center gap-2 px-6 py-2 bg-gold/10 hover:bg-gold/20 text-gold rounded-full border border-gold/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-[0_0_15px_rgba(212,175,55,0.3)]"
              >
                <span className="font-mono text-sm uppercase tracking-wide">Refine</span>
                <Send size={16} />
              </button>
            </div>
          </div>
        </div>
        
        {!isFocused && (
          <div className="mt-12 flex justify-center gap-8 animate-fade-in text-zinc-500">
             <div className="flex flex-col items-center gap-2">
               <Sparkles size={20} className="text-gold/40" />
               <span className="text-xs font-mono uppercase">AI Enhanced</span>
             </div>
          </div>
        )}
      </div>
    </div>
  );
}
