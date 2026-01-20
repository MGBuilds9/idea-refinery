import React, { memo } from 'react';
import { PlusCircle, History, Settings, Terminal } from 'lucide-react';

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
      <div className={`w-64 bg-[var(--color-surface)] border-r border-[var(--color-border)] hidden md:flex md:flex-col h-screen fixed left-0 top-0 z-50 shadow-[var(--shadow-lg)] transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
      }`}>
        {/* Logo Area */}
        <div className="p-8 border-b border-[var(--color-border)] flex flex-col items-center justify-center gap-4">
          <div className="relative group cursor-pointer" onClick={() => onViewChange('input')}>
             <img 
              src="/idea-refinery-logo.svg" 
              alt="Idea Refinery" 
              className="w-32 h-32 object-contain relative z-10 transition-transform duration-200 group-hover:scale-105"
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
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 font-[var(--font-body)] font-medium text-sm group relative overflow-hidden cursor-pointer ${
                  isActive 
                    ? 'text-[var(--color-primary)] bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/20' 
                    : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-background)]'
                }`}
                style={{ minHeight: '44px' }}
              >
                <item.icon className={`w-5 h-5 transition-colors ${isActive ? 'text-[var(--color-primary)]' : 'text-[var(--color-text-muted)] group-hover:text-[var(--color-text)]'}`} />
                <span className="relative z-10">{item.label}</span>
                
                {isActive && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-[var(--color-primary)] rounded-r" />
                )}
              </button>
            );
          })}
        </nav>
  
        {/* Footer / Version */}
        <div className="p-6 border-t border-[var(--color-border)] bg-[var(--color-background)]">
          <div className="text-[10px] text-[var(--color-text-muted)] font-[var(--font-body)] text-center leading-relaxed">
            <span className="text-[var(--color-primary)] font-[var(--font-heading)] font-bold tracking-widest text-xs">IDEA REFINERY</span>
            <br/>
            <span className="opacity-70">v2.1 • Premium Edition</span>
          </div>
        </div>
      </div>
    </>
  );
});

Sidebar.displayName = 'Sidebar';

export default Sidebar;
