import React, { useMemo, memo } from 'react';
import { Database } from 'lucide-react';

const TokenUsage = memo(function TokenUsage({ contextItems = [] }) {
  const totalTokens = useMemo(() => {
    return Math.ceil(contextItems.reduce((acc, item) => {
      const content = item.content || item;
      const len = typeof content === 'string' ? content.length : JSON.stringify(content).length;
      return acc + len;
    }, 0) / 4);
  }, [contextItems]);

  const isCompressed = useMemo(() => {
    return contextItems.some(i => i.role === 'system_note');
  }, [contextItems]);

  return (
    <div className="flex items-center gap-4 text-xs font-mono text-zinc-500 bg-[#09090b] border border-white/10 px-3 py-1.5 rounded-full shadow-inner">
      <div className="flex items-center gap-1.5" title="Estimated Context Size">
        <Database className={`w-3 h-3 ${isCompressed ? 'text-emerald-400' : 'text-zinc-500'}`} />
        <span className={isCompressed ? 'text-emerald-400' : ''}>
           {totalTokens.toLocaleString()} tokens
           {isCompressed && ' (Optimized)'}
        </span>
      </div>
    </div>
  );
});

export default TokenUsage;
