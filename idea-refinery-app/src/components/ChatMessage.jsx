import React, { memo } from 'react';
import { Sparkles } from 'lucide-react';

const ChatMessage = memo(function ChatMessage({ msg }) {
  return (
    <div className={`${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
      {msg.role === 'user' ? (
        <div className="inline-block bg-[#d4af37]/10 border border-[#d4af37]/20 rounded-lg px-4 py-2 max-w-[80%]">
          <p className="text-sm text-[#d4af37]/90 font-sans">
            {msg.content}
          </p>
          {msg.timestamp && (
            <p className="text-xs text-[#d4af37]/40 mt-1 font-mono">
              {new Date(msg.timestamp).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </p>
          )}
        </div>
      ) : (
        <div className="bg-white/5 border border-white/10 rounded-lg p-4 max-w-full">
          {msg.type === 'error' ? (
             <p className="text-red-400 text-sm font-mono">{msg.content}</p>
          ) : (
            <>
              <div className="flex items-center gap-2 text-zinc-400 text-xs font-mono mb-2">
                 <Sparkles className="w-3 h-3" /> Blueprint Updated
                 {msg.timestamp && (
                   <span className="text-zinc-600">
                     -- {new Date(msg.timestamp).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                   </span>
                 )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
});

export default ChatMessage;
