import { PlusCircle, History, Settings, LogOut, Terminal } from 'lucide-react';
import React, { memo } from 'react';

const Sidebar = memo(({ activeView, onViewChange, isOpen, onClose }) => {
  const menuItems = [
    { id: 'input', label: 'New Project', icon: PlusCircle },
    { id: 'history', label: 'History', icon: History },
    { id: 'prompts', label: 'Prompts', icon: Terminal },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div 
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden animate-fade-in"
            onClick={onClose}
        />
      )}

      {/* Sidebar Drawer */}
      <div className={`w-64 bg-[var(--color-bg-surface)] border-r border-[var(--glass-border)] hidden md:flex md:flex-col h-screen fixed left-0 top-0 z-50 backdrop-blur-md transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
      }`}>
        {/* Logo Area */}
        <div className="p-8 border-b border-[var(--glass-border)] flex flex-col items-center justify-center gap-4">
          <div className="relative group cursor-pointer" onClick={() => onViewChange('input')}>
             <div className="absolute -inset-4 bg-[var(--color-gold-glow)] opacity-0 group-hover:opacity-20 blur-xl transition-opacity duration-500 rounded-full"></div>
             <img 
              src="/idea-refinery-logo.svg" 
              alt="Idea Refinery" 
              className="w-32 h-32 object-contain relative z-10 transition-transform duration-500 group-hover:scale-105 drop-shadow-[0_0_15px_rgba(212,175,55,0.1)]"
            />
          </div>
        </div>
  
        {/* Navigation */}
        <nav className="flex-1 py-8 space-y-1 px-4">
          {menuItems.map((item) => {
            const isActive = activeView === item.id || (item.id === 'input' && (activeView === 'questions' || activeView === 'blueprint' || activeView === 'mockup'));
            
            return (
              <button
                key={item.id}
                onClick={() => onViewChange(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300 font-mono text-sm group relative overflow-hidden ${
                  isActive 
                    ? 'text-[var(--color-gold-primary)] bg-[var(--color-gold-subtle)] border border-[var(--color-gold-subtle)]' 
                    : 'text-zinc-400 hover:text-zinc-100 hover:bg-white/5'
                }`}
              >
                <item.icon className={`w-4 h-4 transition-colors ${isActive ? 'text-[var(--color-gold-primary)]' : 'text-zinc-500 group-hover:text-zinc-300'}`} />
                <span className="tracking-wide relative z-10">{item.label}</span>
                
                {isActive && (
                  <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-[var(--color-gold-primary)] shadow-[0_0_10px_var(--color-gold-primary)]" />
                )}
              </button>
            );
          })}
        </nav>
  
        {/* Footer / Version */}
        <div className="p-6 border-t border-[var(--glass-border)] bg-black/20">
          <div className="text-[10px] text-zinc-600 font-mono text-center leading-relaxed">
            <span className="text-gold-gradient font-bold tracking-widest">IDEA REFINERY</span>
            <br/>
            <span className="opacity-50">v2.1 • CLASSIFIED</span>
          </div>
        </div>
      </div>
    </>
  );
});

Sidebar.displayName = 'Sidebar';

export default Sidebar;
