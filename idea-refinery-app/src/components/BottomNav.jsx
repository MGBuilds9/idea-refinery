import React from 'react';
import { PlusCircle, History, Settings, Terminal } from 'lucide-react';

export default function BottomNav({ activeView, onViewChange }) {
  const menuItems = [
    { id: 'input', label: 'New', icon: PlusCircle },
    { id: 'history', label: 'History', icon: History },
    { id: 'prompts', label: 'Prompts', icon: Terminal },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-[var(--color-bg-surface)] border-t border-[var(--glass-border)] z-50 backdrop-blur-xl pb-safe">
      <div className="grid grid-cols-4 h-full">
        {menuItems.map((item) => {
          const isActive = activeView === item.id || (item.id === 'input' && (activeView === 'questions' || activeView === 'blueprint' || activeView === 'mockup'));
          
          return (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className="flex flex-col items-center justify-center gap-1 relative group"
            >
              {/* Active Indicator Line */}
              {isActive && (
                <div className="absolute top-0 left-1 right-1 h-0.5 bg-[var(--color-gold-primary)] shadow-[0_0_10px_var(--color-gold-primary)]" />
              )}
              
              {/* Icon */}
              <item.icon 
                className={`w-5 h-5 transition-all duration-300 ${
                  isActive 
                    ? 'text-[var(--color-gold-primary)] drop-shadow-[0_0_5px_rgba(212,175,55,0.5)]' 
                    : 'text-zinc-500 group-hover:text-zinc-300'
                }`} 
              />
              
              {/* Label */}
              <span className={`text-[10px] font-mono tracking-wide transition-colors duration-300 ${
                isActive 
                  ? 'text-[var(--color-gold-primary)]' 
                  : 'text-zinc-500 group-hover:text-zinc-300'
              }`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
