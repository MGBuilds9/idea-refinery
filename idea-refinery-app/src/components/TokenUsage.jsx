import React from 'react';
import { Database } from 'lucide-react';

export default function TokenUsage({ contextItems = [] }) {
  // Rough estimation: 1 word ~= 1.3 tokens. 4 chars ~= 1 token.
  const calculateTokens = (items) => {
    let text = '';
    items.forEach(item => {
      text += JSON.stringify(item.content || item);
    });
    return Math.ceil(text.length / 4);
  };

  const totalTokens = calculateTokens(contextItems);
  const isCompressed = contextItems.some(i => i.role === 'system_note');

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
}
