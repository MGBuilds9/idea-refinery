import React, { useMemo, memo } from 'react';
import { Database } from 'lucide-react';

const TokenUsage = memo(function TokenUsage({ contextItems = [] }) {
  // Rough estimation: 1 word ~= 1.3 tokens. 4 chars ~= 1 token.
  // ⚡ Bolt Optimization: Sum lengths directly to avoid expensive O(N) string concatenation and allocation.
  // We treat JSON.stringify only for objects to maintain estimation accuracy without the memory overhead.
  const totalTokens = useMemo(() => {
    return Math.ceil(contextItems.reduce((acc, item) => {
      const content = item.content || item;
      // If string, use length directly (saving memory). If object, stringify to get size.
      const len = typeof content === 'string' ? content.length : JSON.stringify(content).length;
      return acc + len;
    }, 0) / 4);
  }, [contextItems]);

  const isCompressed = useMemo(() => {
    return contextItems.some(i => i.role === 'system_note');
  }, [contextItems]);

  return (
    <div className="flex items-center gap-4 text-xs font-mono text-gray-500 bg-[#0A0A0A] border border-[#333] px-3 py-1.5 rounded-full shadow-inner">
      <div className="flex items-center gap-1.5" title="Estimated Context Size">
        <Database className={`w-3 h-3 ${isCompressed ? 'text-emerald-400' : 'text-gray-400'}`} />
        <span className={isCompressed ? 'text-emerald-400' : ''}>
           {totalTokens.toLocaleString()} tokens
           {isCompressed && ' (Optimized)'}
        </span>
      </div>
    </div>
  );
});

export default TokenUsage;
