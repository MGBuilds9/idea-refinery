import React from 'react';
import { PlusCircle, History, Settings, LogOut } from 'lucide-react';

export default function Sidebar({ activeView, onViewChange }) {
  const menuItems = [
    { id: 'input', label: 'New Project', icon: PlusCircle },
    { id: 'history', label: 'History', icon: History },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="w-64 bg-[#111111] border-r border-[#333] flex flex-col h-screen fixed left-0 top-0 z-50 animate-slide-in-left">
      {/* Logo Area */}
      <div className="p-6 border-b border-[#333] flex items-center justify-center">
        <img 
          src="/idea-refinery-logo.svg" 
          alt="Idea Refinery" 
          className="w-40 h-40 object-contain drop-shadow-[0_0_15px_rgba(212,175,55,0.3)]"
        />
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-6 space-y-2 px-3">
        {menuItems.map((item) => {
          const isActive = activeView === item.id || (item.id === 'input' && (activeView === 'questions' || activeView === 'blueprint' || activeView === 'mockup'));
          
          return (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all font-mono text-sm group ${
                isActive 
                  ? 'bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/20 shadow-[0_0_15px_rgba(212,175,55,0.05)]' 
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <item.icon className={`w-5 h-5 ${isActive ? 'text-[#D4AF37]' : 'text-gray-500 group-hover:text-white'}`} />
              <span className="tracking-wide">{item.label}</span>
              {isActive && (
                <div className="ml-auto w-1 h-1 rounded-full bg-[#D4AF37] shadow-[0_0_5px_#D4AF37]" />
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer / Version */}
      <div className="p-6 border-t border-[#333]">
        <div className="text-[10px] text-gray-700 font-mono text-center">
          IDEA REFINERY v2.0
          <br/>
          STRICTLY CONFIDENTIAL
        </div>
      </div>
    </div>
  );
}
