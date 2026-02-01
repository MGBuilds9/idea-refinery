import React, { memo } from 'react';
import { PlusCircle, History, Settings, Terminal } from 'lucide-react';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

// ⚡ Bolt Optimization: Define menu items outside to avoid reallocation on every render
const MENU_ITEMS = [
  { id: 'input', label: 'New', icon: PlusCircle },
  { id: 'history', label: 'History', icon: History },
  { id: 'prompts', label: 'Prompts', icon: Terminal },
  { id: 'settings', label: 'Settings', icon: Settings },
];

// ⚡ Bolt Optimization: Extract item component to prevent unnecessary re-renders of inactive items
const BottomNavItem = memo(({ item, isActive, onViewChange }) => {
  return (
    <button
      onClick={async () => {
        await Haptics.impact({ style: ImpactStyle.Light });
        onViewChange(item.id);
      }}
      className="flex flex-col items-center justify-center gap-1 relative group cursor-pointer transition-colors duration-200"
      style={{ minHeight: '64px', minWidth: '64px' }}
    >
      {/* Active Indicator Line */}
      {isActive && (
        <div className="absolute top-0 left-2 right-2 h-1 bg-[var(--color-primary)] rounded-b" />
      )}

      {/* Icon */}
      <item.icon
        className={`w-6 h-6 transition-all duration-200 ${
          isActive
            ? 'text-[var(--color-primary)]'
            : 'text-[var(--color-text-muted)] group-hover:text-[var(--color-text)]'
        }`}
      />

      {/* Label */}
      <span className={`text-[10px] font-[var(--font-body)] font-medium transition-colors duration-200 ${
        isActive
          ? 'text-[var(--color-primary)]'
          : 'text-[var(--color-text-muted)] group-hover:text-[var(--color-text)]'
      }`}>
        {item.label}
      </span>
    </button>
  );
});

BottomNavItem.displayName = 'BottomNavItem';

const BottomNav = memo(({ activeView, onViewChange }) => {
  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-[var(--color-surface)] border-t border-[var(--color-border)] shadow-[var(--shadow-lg)] z-50 pb-safe">
      <div className="grid grid-cols-4 h-full">
        {MENU_ITEMS.map((item) => {
          const isActive = activeView === item.id || (item.id === 'input' && (activeView === 'questions' || activeView === 'blueprint' || activeView === 'mockup'));
          
          return (
             <BottomNavItem
               key={item.id}
               item={item}
               isActive={isActive}
               onViewChange={onViewChange}
             />
          );
        })}
      </div>
    </div>
  );
});

BottomNav.displayName = 'BottomNav';

export default BottomNav;
