import React, { useState, useCallback, memo } from 'react';
import { History } from 'lucide-react';
import { toast } from 'sonner';
import HistoryItem from './HistoryItem';
import { getConversation } from '../services/db';

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

const HistoryView = ({ historyItems, onLoad, onDelete, onLoadMore, hasMore }) => {
  const [emailingId, setEmailingId] = useState(null);
  const [emailSuccess, setEmailSuccess] = useState(null);
  const [loadingMore, setLoadingMore] = useState(false);

  const handleLoadMoreClick = async () => {
    setLoadingMore(true);
    await onLoadMore();
    setLoadingMore(false);
  };

  const handleEmail = useCallback(async (e, item) => {
    e.stopPropagation();

    let fullItem = item;
    if (item.isSummary) {
        const loaded = await getConversation(item.id);
        if (loaded) fullItem = loaded;
    }

    const { type } = getArtifactContent(fullItem);

    if (!confirm(`Email this ${type.toLowerCase()} to yourself?`)) return;

    setEmailingId(item.id);
    setEmailSuccess(null);

    try {
      let fullItem = item;
      if (item.isSummary) {
          const loaded = await getConversation(item.id);
          if (loaded) fullItem = loaded;
      }
      const { content } = getArtifactContent(fullItem);

      const { llm } = await import('../lib/llm');
      const { SecureStorage } = await import('../services/secure_storage');

      const target = localStorage.getItem('target_email');

      let apiKey = null;
      if (llm.activePin) {
          apiKey = await SecureStorage.getItem('resend_api_key', llm.activePin);
      }

      if (!target || !apiKey) {
        toast.warning('Please set a Target Email and Resend API Key in Settings first (and ensure PIN is unlocked).');
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
      await EmailService.send(target, `${type}: ${item.idea || 'Untitled'}`, html, apiKey);
      setEmailSuccess(item.id);
      setTimeout(() => setEmailSuccess(null), 2000);
    } catch (err) {
      console.error(err);
      toast.error('Failed to send email. Check Settings.');
    } finally {
      setEmailingId(null);
    }
  }, []);

  return (
    <div className="max-w-5xl mx-auto animate-fade-in">
      <div className="mb-10">
        <h2 className="text-4xl font-sans font-bold text-gold-gradient mb-3">Project History</h2>
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
            <HistoryItem
              key={item.id}
              item={item}
              index={index}
              onLoad={onLoad}
              onDelete={onDelete}
              onEmail={handleEmail}
              isEmailing={emailingId === item.id}
              isEmailSuccess={emailSuccess === item.id}
            />
          ))
        )}
      </div>

      {hasMore && (
        <div className="mt-8 flex justify-center pb-8">
            <button
                onClick={handleLoadMoreClick}
                disabled={loadingMore}
                className="px-6 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-all font-mono text-sm border border-white/10 flex items-center gap-2"
            >
                {loadingMore ? 'Loading...' : 'Load More'}
            </button>
        </div>
      )}
    </div>
  );
};

export default memo(HistoryView);
