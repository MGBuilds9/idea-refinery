import React, { useState, useEffect } from 'react';
import { Send, Sparkles } from 'lucide-react';
import PromptSelector from './PromptSelector';

export default function InputStage({ idea, setIdea, onNext, selectedPersona, setSelectedPersona, loading }) {
  const [isFocused, setIsFocused] = useState(false);
  const [localIdea, setLocalIdea] = useState(idea);

  useEffect(() => {
    setLocalIdea(idea);
  }, [idea]);

  const handleSubmit = async () => {
    if (!localIdea.trim()) return;
    setIdea(localIdea);
    onNext(localIdea);
  };

  const handleBlur = () => {
    setIsFocused(false);
    setIdea(localIdea);
  };

  const handleKeyDown = (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="flex flex-col items-center w-full max-w-4xl mx-auto pt-0 md:pt-4 min-h-[calc(100vh-100px)]">
      {/* Hero Section */}
      <div className="w-full text-center mb-8 md:mb-12 px-4">
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-sans font-bold text-white mb-4">
          Transform Your Ideas
        </h1>
        <p className="text-lg md:text-xl text-zinc-400 font-sans max-w-2xl mx-auto">
          Describe your concept and watch it become a comprehensive blueprint
        </p>
      </div>

      {/* Persona Selector */}
      <div className="w-full mb-8 shrink-0">
        <PromptSelector
          selectedPersona={selectedPersona}
          onSelect={setSelectedPersona}
        />
      </div>

      {/* Input Box */}
      <div className="flex-1 w-full flex flex-col items-center justify-start max-w-2xl px-4 pb-20 pt-8 md:pt-12">
        <div
          className={`w-full transition-all duration-300 ${isFocused ? 'scale-[1.02]' : 'scale-100'}`}
        >
          <div className="relative group">
            {/* Card Container */}
            <div className="relative glass-panel rounded-2xl p-6 md:p-8 transition-all duration-200 hover:shadow-lg">
              <textarea
                value={localIdea}
                onChange={(e) => setLocalIdea(e.target.value)}
                onKeyDown={handleKeyDown}
                onFocus={() => setIsFocused(true)}
                onBlur={handleBlur}
                placeholder="What are you building today?"
                aria-label="Idea description"
                className="w-full bg-transparent border-none focus:ring-0 text-xl md:text-2xl font-sans text-white placeholder:text-zinc-600 resize-none min-h-[120px] md:min-h-[160px] leading-relaxed selection:bg-[#d4af37]/20 selection:text-white outline-none"
                style={{ minHeight: '160px' }}
              />

              <div className="flex justify-between items-center mt-4 md:mt-6 pt-4 md:pt-6 border-t border-white/10">
                <div className="flex flex-col gap-1">
                  <span className={`text-xs font-sans font-semibold uppercase tracking-wide transition-colors duration-200 ${isFocused ? 'text-[#d4af37]' : 'text-zinc-500'}`}>
                    {isFocused ? 'Ready to Refine' : 'Start Typing'}
                  </span>
                  {/* Keyboard shortcut hint */}
                  <span className="text-[10px] text-zinc-600 font-sans hidden md:block">
                    Press Cmd+Enter to submit
                  </span>
                </div>

                <button
                  onClick={handleSubmit}
                  disabled={!localIdea.trim() || loading}
                  aria-disabled={!localIdea.trim() || loading}
                  title={!localIdea.trim() ? "Please describe your idea first" : "Generate blueprint (Cmd+Enter)"}
                  className="btn-primary cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <span className="font-semibold flex items-center gap-2">
                       <Sparkles className="animate-spin" size={18} />
                       Refining...
                    </span>
                  ) : (
                    <>
                      <span className="font-semibold">Refine</span>
                      <Send size={18} className="transition-transform group-hover:translate-x-1" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Feature Indicators */}
          {!isFocused && (
            <div className="mt-8 md:mt-12 flex justify-center gap-8 animate-fade-in">
              <div className="flex flex-col items-center gap-2 group cursor-default">
                <Sparkles size={20} className="text-[#d4af37] transition-colors group-hover:text-[#c5a028]" />
                <span className="text-xs font-sans font-medium text-zinc-500 group-hover:text-zinc-300 transition-colors">
                  AI Enhanced
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
