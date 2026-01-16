import React from 'react';
import { Clock, Download, Trash2, X, ArrowRight } from 'lucide-react';

export default function HistoryModal({ 
  isOpen, 
  onClose, 
  history, 
  onLoad, 
  onDelete 
}) {
  if (!isOpen) return null;

  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="p-6 border-b border-slate-700 flex justify-between items-center">
          <div className="flex items-center gap-2 text-amber-400">
            <Clock className="w-5 h-5" />
            <h2 className="text-xl font-serif">History</h2>
          </div>
          <button 
            onClick={onClose}
            className="p-1 hover:bg-slate-700 rounded-full transition-colors text-slate-400 hover:text-white"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {history.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No saved history yet.</p>
              <p className="text-sm mt-2">Generations are saved automatically for 7 days.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {history.map((item) => (
                <div 
                  key={item.id}
                  className="bg-slate-900/50 border border-slate-700 rounded-xl p-4 hover:border-amber-500/50 transition-all group"
                >
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-white truncate pr-4">
                        {item.idea || 'Untitled Idea'}
                      </h3>
                      <div className="flex items-center gap-3 mt-1 text-xs text-slate-400 font-mono flex-wrap">
                        <span>{formatDate(item.lastUpdated)}</span>
                        {item.blueprint && (
                          <span className="px-1.5 py-0.5 bg-blue-500/10 text-blue-400 rounded">Blueprint</span>
                        )}
                        {item.htmlMockup && (
                          <span className="px-1.5 py-0.5 bg-emerald-500/10 text-emerald-400 rounded">Mockup</span>
                        )}
                        {item.chatHistory && item.chatHistory.length > 0 && (
                          <span className="px-1.5 py-0.5 bg-purple-500/10 text-purple-400 rounded">
                            {item.chatHistory.length} messages
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {item.blueprint && (
                        <button
                          onClick={() => onLoad(item, true)}
                          className="p-2 bg-purple-500/10 text-purple-400 rounded-lg hover:bg-purple-500/20 transition-colors flex items-center gap-2 text-sm font-medium"
                          title="Continue refining this blueprint"
                        >
                          Continue
                        </button>
                      )}
                       <button
                        onClick={() => onLoad(item)}
                        className="p-2 bg-amber-500/10 text-amber-400 rounded-lg hover:bg-amber-500/20 transition-colors flex items-center gap-2 text-sm font-medium"
                      >
                        Load <ArrowRight className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if(confirm('Are you sure you want to delete this item?')) {
                            onDelete(item.id);
                          }
                        }}
                        className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
