import React, { memo } from 'react';
import { Trash2, ArrowRight, Calendar, Mail, Loader2, Check } from 'lucide-react';

// Format timestamp
const formatDate = (ts) => {
  if (!ts) return 'Unknown Date';
  return new Date(ts).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const HistoryItem = memo(function HistoryItem({
  item,
  index,
  onLoad,
  onDelete,
  onEmail,
  isEmailing,
  isEmailSuccess
}) {
  return (
    <div
      style={{ animationDelay: `${index * 50}ms` }}
      className="group relative glass-panel rounded-xl p-6 transition-all duration-300 hover:border-[#d4af37]/30 hover:shadow-[0_0_30px_rgba(212,175,55,0.05)] flex items-start justify-between gap-6 animate-fade-in"
    >
      <div className="flex-1 cursor-pointer" onClick={() => onLoad(item)}>
        <div className="flex items-center gap-3 mb-3">
            <span className="px-2.5 py-1 rounded-full text-[10px] font-mono bg-zinc-900 text-zinc-400 uppercase tracking-wider border border-zinc-800">
                {item.blueprint ? 'Blueprint' : item.questions ? 'Questions' : 'Draft'}
            </span>
            <span className="flex items-center gap-1.5 text-xs text-zinc-600 font-mono">
                <Calendar className="w-3 h-3" />
                {formatDate(item.updatedAt || item.timestamp)}
            </span>
        </div>

        <h3 className="text-lg text-white font-medium mb-2 group-hover:text-[#d4af37] transition-colors line-clamp-1">
          {item.idea || 'Untitled Project'}
        </h3>
        <p className="text-zinc-500 text-sm line-clamp-2 pr-12 leading-relaxed">
          {item.blueprint ? item.blueprint.substring(0, 150) + '...' : 'No blueprint generated yet.'}
        </p>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-2 self-center opacity-60 group-hover:opacity-100 transition-opacity">
        {/* Email button */}
        <button
          onClick={(e) => onEmail(e, item)}
          disabled={isEmailing}
          className={`p-3 rounded-lg transition-all ${
            isEmailSuccess
              ? 'text-emerald-400 bg-emerald-900/20'
              : 'text-zinc-500 hover:text-[#d4af37] hover:bg-[#d4af37]/10'
          } ${isEmailing ? 'opacity-50 cursor-wait' : ''}`}
          title="Email to Me"
        >
          {isEmailing ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : isEmailSuccess ? (
            <Check className="w-4 h-4" />
          ) : (
            <Mail className="w-4 h-4" />
          )}
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation();
            if (window.confirm('Are you sure you want to delete this session?')) {
              onDelete(item.id);
            }
          }}
          className="p-3 text-zinc-500 hover:text-red-400 hover:bg-red-900/10 rounded-lg transition-colors"
          title="Delete"
        >
          <Trash2 className="w-4 h-4" />
        </button>

        <button
          onClick={() => onLoad(item)}
          className="p-3 bg-[#d4af37] hover:bg-[#c5a028] text-black rounded-lg transition-all shadow-[0_0_10px_rgba(212,175,55,0.1)] hover:shadow-[0_0_20px_rgba(212,175,55,0.2)]"
          title="Open Project"
        >
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
});

export default HistoryItem;
