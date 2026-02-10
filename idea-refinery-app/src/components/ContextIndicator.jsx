import React, { memo } from 'react';
import { Zap, Minimize2, MessageSquare } from 'lucide-react';

/**
 * Context Optimization Indicator
 * Shows token savings and compression status when sliding window is active
 */

// Rough token estimation: ~4 chars per token average
const CHARS_PER_TOKEN = 4;
const AVG_MESSAGE_TOKENS = 150; // Rough average tokens per message

export function getContextStats(messages, windowSize = 8) {
  if (!messages || messages.length === 0) {
    return {
      totalMessages: 0,
      windowSize,
      isCompressed: false,
      messagesDropped: 0,
      estimatedTokensSaved: 0,
      currentTokensEstimate: 0
    };
  }

  const totalMessages = messages.length;
  const isCompressed = totalMessages > windowSize;
  const messagesDropped = isCompressed ? totalMessages - windowSize : 0;
  const estimatedTokensSaved = messagesDropped * AVG_MESSAGE_TOKENS;

  const currentTokensEstimate = messages.slice(-windowSize).reduce((acc, msg) => {
    return acc + Math.ceil((msg.content?.length || 0) / CHARS_PER_TOKEN);
  }, 0);

  return {
    totalMessages,
    windowSize,
    isCompressed,
    messagesDropped,
    estimatedTokensSaved,
    currentTokensEstimate
  };
}

const ContextIndicator = memo(function ContextIndicator({ messages, windowSize = 8 }) {
  const stats = getContextStats(messages, windowSize);

  // Don't show anything if no messages or very few
  if (stats.totalMessages < 2) return null;

  return (
    <div className={`
      inline-flex items-center gap-3 px-3 py-1.5 rounded-full text-xs font-mono
      transition-all duration-300
      ${stats.isCompressed
        ? 'bg-[#d4af37]/10 border border-[#d4af37]/20 text-[#d4af37]'
        : 'bg-white/5 border border-white/10 text-zinc-400'
      }
    `}>
      {/* Message count */}
      <div className="flex items-center gap-1.5">
        <MessageSquare size={12} />
        <span>{stats.totalMessages}/{stats.windowSize}</span>
      </div>

      {/* Compression status */}
      {stats.isCompressed && (
        <>
          <div className="w-px h-3 bg-[#d4af37]/30" />
          <div className="flex items-center gap-1.5" title={`${stats.messagesDropped} messages compressed`}>
            <Minimize2 size={12} className="text-[#d4af37]" />
            <span>-{stats.messagesDropped}</span>
          </div>

          <div className="w-px h-3 bg-[#d4af37]/30" />
          <div className="flex items-center gap-1.5" title={`Estimated ${stats.estimatedTokensSaved.toLocaleString()} tokens saved`}>
            <Zap size={12} className="text-[#d4af37]" />
            <span>~{(stats.estimatedTokensSaved / 1000).toFixed(1)}k saved</span>
          </div>
        </>
      )}
    </div>
  );
});

export default ContextIndicator;
