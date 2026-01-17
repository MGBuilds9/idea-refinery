import React, { useState } from 'react';
import { History, Trash2, ArrowRight, Calendar, Mail, Loader2, Check } from 'lucide-react';

export default function HistoryView({ historyItems, onLoad, onDelete }) {
  const [emailingId, setEmailingId] = useState(null);
  const [emailSuccess, setEmailSuccess] = useState(null);
  
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

  // Get artifact type and content for email
  const getArtifactContent = (item) => {
    if (item.blueprint) {
      return { type: 'Blueprint', content: item.blueprint };
    } else if (item.questions) {
      const questionsText = Array.isArray(item.questions) 
        ? item.questions.map((q, i) => `${i + 1}. ${q}`).join('\n')
        : item.questions;
      return { type: 'Questions', content: questionsText };
    } else {
      return { type: 'Draft', content: item.idea };
    }
  };

  const handleEmail = async (e, item) => {
    e.stopPropagation();
    const { type, content } = getArtifactContent(item);
    
    if (!confirm(`Email this ${type.toLowerCase()} to yourself?`)) return;
    
    setEmailingId(item.id);
    setEmailSuccess(null);
    
    try {
      const target = localStorage.getItem('target_email');
      if (!target) {
        alert('Please set a Target Email in Settings first.');
        setEmailingId(null);
        return;
      }

      const { EmailService } = await import('../services/email');
      const html = `
        <h1>Project: ${item.idea || 'Untitled'}</h1>
        <p><strong>Type:</strong> ${type}</p>
        <p><strong>Date:</strong> ${new Date().toLocaleString()}</p>
        <hr/>
        <pre style="white-space: pre-wrap; font-family: monospace;">${content}</pre>
      `;
      await EmailService.send(target, `${type}: ${item.idea || 'Untitled'}`, html);
      setEmailSuccess(item.id);
      setTimeout(() => setEmailSuccess(null), 2000);
    } catch (err) {
      console.error(err);
      alert('Failed to send email. Check Settings.');
    } finally {
      setEmailingId(null);
    }
  };

  return (
    <div className="max-w-5xl mx-auto animate-fade-in">
      <div className="mb-10">
        <h2 className="text-4xl font-serif text-gold-gradient mb-3">Project History</h2>
        <p className="text-zinc-500 font-mono text-sm tracking-wide">Resume previous sessions or manage your archives.</p>
      </div>

      <div className="space-y-4">
        {historyItems.length === 0 ? (
          <div className="text-center py-24 glass-panel rounded-2xl border-dashed border-zinc-700">
            <History className="w-14 h-14 text-zinc-700 mx-auto mb-5" />
            <p className="text-zinc-500 font-mono text-sm">Your vault is empty.</p>
            <p className="text-zinc-600 font-mono text-xs mt-1">Start a new project to begin.</p>
          </div>
        ) : (
          historyItems.map((item, index) => (
            <div 
              key={item.id}
              style={{ animationDelay: `${index * 50}ms` }}
              className="group relative glass-panel rounded-xl p-6 transition-all duration-300 hover:border-[var(--color-gold-subtle)] hover:shadow-[0_0_30px_rgba(212,175,55,0.05)] flex items-start justify-between gap-6 animate-fade-in"
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
                
                <h3 className="text-lg text-white font-medium mb-2 group-hover:text-[var(--color-gold-primary)] transition-colors line-clamp-1">
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
                  onClick={(e) => handleEmail(e, item)}
                  disabled={emailingId === item.id}
                  className={`p-3 rounded-lg transition-all ${
                    emailSuccess === item.id 
                      ? 'text-emerald-400 bg-emerald-900/20' 
                      : 'text-zinc-500 hover:text-[var(--color-gold-primary)] hover:bg-[var(--color-gold-subtle)]'
                  } ${emailingId === item.id ? 'opacity-50 cursor-wait' : ''}`}
                  title="Email to Me"
                >
                  {emailingId === item.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : emailSuccess === item.id ? (
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
                  className="p-3 bg-[var(--color-gold-primary)] hover:bg-[#C5A028] text-black rounded-lg transition-all shadow-[0_0_10px_var(--color-gold-subtle)] hover:shadow-[0_0_20px_var(--color-gold-glow)]"
                  title="Open Project"
                >
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
