import React, { useState, useCallback, memo } from 'react';
import { History } from 'lucide-react';
import HistoryItem from './HistoryItem';

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

const HistoryView = ({ historyItems, onLoad, onDelete }) => {
  const [emailingId, setEmailingId] = useState(null);
  const [emailSuccess, setEmailSuccess] = useState(null);

  const handleEmail = useCallback(async (e, item) => {
    e.stopPropagation();
    const { type, content } = getArtifactContent(item);
    
    if (!confirm(`Email this ${type.toLowerCase()} to yourself?`)) return;
    
    setEmailingId(item.id);
    setEmailSuccess(null);
    
    try {
      const target = localStorage.getItem('target_email');
      const apiKey = localStorage.getItem('resend_api_key');

      if (!target || !apiKey) {
        alert('Please set a Target Email and Resend API Key in Settings first.');
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
      alert('Failed to send email. Check Settings.');
    } finally {
      setEmailingId(null);
    }
  }, []);

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
    </div>
  );
};

export default memo(HistoryView);
