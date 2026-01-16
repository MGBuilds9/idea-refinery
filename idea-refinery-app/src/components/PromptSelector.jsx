import React from 'react';
import { Sparkles, Target, Lightbulb, Rocket, Zap } from 'lucide-react';

// Prompt personas that modify the system prompt tone
export const PROMPT_PERSONAS = [
  { 
    id: 'balanced', 
    name: 'Balanced Builder', 
    description: 'Practical and creative',
    icon: Target,
    modifier: 'Balance innovation with practicality. Provide well-rounded recommendations that are both creative and achievable.',
    color: '#D4AF37' // Gold
  },
  { 
    id: 'strict', 
    name: 'Strict Architect', 
    description: 'Precise, technical, no fluff',
    icon: Zap,
    modifier: 'Be extremely precise and technical. Focus on concrete implementation details, best practices, and proven patterns. Avoid vague suggestions.',
    color: '#60A5FA' // Blue
  },
  { 
    id: 'creative', 
    name: 'Creative Dreamer', 
    description: 'Innovative, exploratory',
    icon: Lightbulb,
    modifier: 'Think outside the box and push boundaries. Suggest innovative approaches, emerging technologies, and creative solutions that might not be obvious.',
    color: '#A78BFA' // Purple
  },
  { 
    id: 'mvp', 
    name: 'MVP Focus', 
    description: 'Minimal, fast shipping',
    icon: Rocket,
    modifier: 'Focus on the smallest viable implementation. Ruthlessly prioritize core features. Suggest the fastest path to a working product with minimal complexity.',
    color: '#34D399' // Green
  }
];

export default function PromptSelector({ selectedPersona, onSelect }) {
  return (
    <div className="w-full max-w-2xl mx-auto mb-6">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles size={14} className="text-gold/60" />
        <span className="text-xs font-mono text-gray-500 uppercase tracking-widest">AI Persona</span>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {PROMPT_PERSONAS.map((persona) => {
          const Icon = persona.icon;
          const isSelected = selectedPersona === persona.id;
          
          return (
            <button
              key={persona.id}
              onClick={() => onSelect(persona.id)}
              className={`
                relative p-3 rounded-xl border transition-all duration-300
                ${isSelected 
                  ? 'bg-[#1A1A1A] border-[#D4AF37]/50 shadow-[0_0_15px_rgba(212,175,55,0.1)]' 
                  : 'bg-[#111] border-[#333] hover:border-[#444] hover:bg-[#1A1A1A]'
                }
              `}
            >
              {/* Selection indicator */}
              {isSelected && (
                <div 
                  className="absolute inset-0 rounded-xl opacity-10"
                  style={{ backgroundColor: persona.color }}
                />
              )}
              
              <div className="relative flex flex-col items-center gap-2 text-center">
                <Icon 
                  size={18} 
                  style={{ color: isSelected ? persona.color : '#666' }}
                  className="transition-colors"
                />
                <div>
                  <div className={`text-xs font-medium transition-colors ${isSelected ? 'text-white' : 'text-gray-400'}`}>
                    {persona.name}
                  </div>
                  <div className="text-[10px] text-gray-600 mt-0.5 hidden md:block">
                    {persona.description}
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
