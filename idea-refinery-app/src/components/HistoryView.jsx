import React from 'react';
import { History, Trash2, ArrowRight, Calendar, Mail } from 'lucide-react';

export default function HistoryView({ historyItems, onLoad, onDelete }) {
  
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

  return (
    <div className="max-w-5xl mx-auto animate-fade-in p-6">
      <div className="mb-8">
        <h2 className="text-3xl font-serif text-[#D4AF37] mb-2">Project History</h2>
        <p className="text-gray-400 font-mono text-sm">Resume previous sessions or manage your archives.</p>
      </div>

      <div className="space-y-4">
        {historyItems.length === 0 ? (
          <div className="text-center py-20 bg-[#1A1A1A] border border-[#333] rounded-xl border-dashed">
            <History className="w-12 h-12 text-[#333] mx-auto mb-4" />
            <p className="text-gray-500 font-mono">No history found.</p>
          </div>
        ) : (
          historyItems.map((item) => (
            <div 
              key={item.id}
              className="group relative bg-[#1A1A1A] border border-[#333] hover:border-[#D4AF37]/50 rounded-xl p-6 transition-all hover:shadow-[0_0_20px_rgba(212,175,55,0.05)] flex items-start justify-between gap-6"
            >
              <div className="flex-1 cursor-pointer" onClick={() => onLoad(item)}>
                <div className="flex items-center gap-3 mb-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#333] text-gray-400 uppercase tracking-wide">
                        {item.blueprint ? 'Blueprint' : item.questions ? 'Questions' : 'Draft'}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-gray-500 font-mono">
                        <Calendar className="w-3 h-3" />
                        {formatDate(item.updatedAt || item.timestamp)}
                    </span>
                </div>
                
                <h3 className="text-lg text-white font-medium mb-1 group-hover:text-[#D4AF37] transition-colors line-clamp-1">
                  {item.idea || 'Untitled Project'}
                </h3>
                <p className="text-gray-500 text-sm line-clamp-2 pr-12">
                  {item.blueprint ? item.blueprint.substring(0, 150) + '...' : 'No blueprint generated yet.'}
                </p>
              </div>

              <div className="flex items-center gap-2 self-center opacity-0 group-hover:opacity-100 transition-opacity">
                {item.blueprint && (
                   <button
                        onClick={async (e) => {
                            e.stopPropagation();
                            if (!confirm('Email this blueprint to yourself?')) return;
                            try {
                                const { EmailService } = await import('../services/email');
                                const html = `
                                    <h1>Project: ${item.idea}</h1>
                                    <p>Date: ${new Date().toLocaleString()}</p>
                                    <hr/>
                                    <pre style="white-space: pre-wrap;">${item.blueprint}</pre>
                                `;
                                await EmailService.send('test@example.com', `Blueprint: ${item.idea}`, html);
                                alert('Email Sent!');
                            } catch (err) {
                                console.error(err);
                                alert('Failed to send email. Check Settings.');
                            }
                        }}
                        className="p-3 text-gray-500 hover:text-[#D4AF37] hover:bg-[#D4AF37]/10 rounded-lg transition-colors"
                        title="Email Blueprint"
                    >
                        <Mail className="w-5 h-5" />
                    </button>
                )}

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (window.confirm('Are you sure you want to delete this session?')) {
                      onDelete(item.id);
                    }
                  }}
                  className="p-3 text-gray-500 hover:text-red-400 hover:bg-red-900/10 rounded-lg transition-colors"
                  title="Delete"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
                
                <button
                  onClick={() => onLoad(item)}
                  className="p-3 bg-[#D4AF37] hover:bg-[#C5A028] text-[#1A1A1A] rounded-lg transition-colors shadow-[0_0_10px_rgba(212,175,55,0.2)]"
                  title="Open Project"
                >
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
