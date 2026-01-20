import React, { useState } from 'react';
import { Send, Sparkles } from 'lucide-react';
import PromptSelector from './PromptSelector';

export default function InputStage({ idea, setIdea, onNext, selectedPersona, setSelectedPersona }) {
  const [isFocused, setIsFocused] = useState(false);

  const handleSubmit = async () => {
    if (!idea.trim()) return;
    onNext();
  };

  const handleKeyDown = (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="flex flex-col items-center w-full max-w-4xl mx-auto pt-0 md:pt-4 min-h-[calc(100vh-100px)]">



      {/* 2. Persona Selector */}
      <div className="w-full mb-8 shrink-0">
        <PromptSelector
          selectedPersona={selectedPersona}
          onSelect={setSelectedPersona}
        />
      </div>

      {/* 3. Input Box - Flex Grow to take remaining space but centered */}
      <div className="flex-1 w-full flex flex-col items-center justify-start max-w-2xl px-4 pb-20 pt-8 md:pt-12">
        <div
          className={`w-full transition-all duration-700 ${isFocused ? 'scale-105' : 'scale-100'}`}
        >
          <div className="relative group">
            {/* Breathing Glow Behind */}
            <div className={`absolute -inset-1 bg-gradient-to-r from-[var(--color-gold-glow)] via-[var(--color-gold-subtle)] to-[var(--color-gold-glow)] rounded-2xl blur-2xl transition-opacity duration-1000 ${isFocused ? 'opacity-40 animate-pulse' : 'opacity-0'}`}></div>

            <div className="relative glass-panel rounded-2xl p-6 md:p-8 border border-[var(--glass-border)] transition-all duration-500 hover:border-[var(--color-gold-subtle)]">
              <textarea
                value={idea}
                onChange={(e) => setIdea(e.target.value)}
                onKeyDown={handleKeyDown}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                placeholder="What are you building today?"
                aria-label="Idea description"
                className="w-full bg-transparent border-none focus:ring-0 text-xl md:text-2xl font-serif text-white/95 placeholder:text-zinc-700 resize-none min-h-[120px] md:min-h-[160px] leading-relaxed selection:bg-[var(--color-gold-subtle)] selection:text-white"
              />

              <div className="flex justify-between items-center mt-4 md:mt-6 pt-4 md:pt-6 border-t border-white/5">
                <div className="flex flex-col gap-1">
                  <span className={`text-xs font-mono uppercase tracking-widest transition-colors duration-300 ${isFocused ? 'text-[var(--color-gold-primary)]' : 'text-zinc-600'}`}>
                    {isFocused ? 'System Online' : 'Standard Mode'}
                  </span>
                  {/* UX: Keyboard shortcut hint for power users */}
                  <span className="text-[10px] text-zinc-600 font-mono hidden md:block opacity-60">
                    CMD + ENTER to submit
                  </span>
                </div>

                <button
                  onClick={handleSubmit}
                  disabled={!idea.trim()}
                  aria-disabled={!idea.trim()}
                  title={!idea.trim() ? "Please describe your idea first" : "Generate blueprint (Cmd+Enter)"}
                  className="flex items-center gap-3 px-6 py-2 md:px-8 md:py-3 bg-[var(--color-gold-subtle)] hover:bg-[var(--color-gold-primary)] text-[var(--color-gold-primary)] hover:text-black rounded-full border border-[var(--color-gold-primary)] transition-all disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-[var(--color-gold-primary)] hover:shadow-[0_0_20px_var(--color-gold-glow)] group/btn"
                >
                  <span className="font-mono text-sm uppercase tracking-wide font-bold">Refine</span>
                  <Send size={16} className="transition-transform group-hover/btn:translate-x-1" />
                </button>
              </div>
            </div>
          </div>

          {!isFocused && (
            <div className="mt-8 md:mt-12 flex justify-center gap-8 animate-fade-in text-zinc-600">
              <div className="flex flex-col items-center gap-2 group cursor-default">
                <Sparkles size={16} className="text-[var(--color-gold-dim)] transition-colors group-hover:text-[var(--color-gold-primary)]" />
                <span className="text-[10px] font-mono uppercase tracking-widest opacity-60 group-hover:opacity-100 transition-opacity">AI Enhanced</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
