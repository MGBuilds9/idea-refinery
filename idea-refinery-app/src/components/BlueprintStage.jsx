import React, { useRef, useEffect } from 'react';
import { FileText, MessageSquare, Check, Send, Sparkles } from 'lucide-react';
import ContextIndicator from './ContextIndicator';

export default function BlueprintStage({ 
  blueprint, 
  conversation, 
  onRefine, 
  onGenerateMockup, 
  onStartOver, 
  loading,
  refinementInput,
  setRefinementInput,
  currentTab = 'preview', // 'preview' or 'chat'
  setTab,
  chatHistory = [] // For context optimization display
}) {
  const chatEndRef = useRef(null);

  useEffect(() => {
    if (currentTab === 'chat') {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [conversation, currentTab]);

  // Publishing State
  const [publishing, setPublishing] = useState(false);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [publicUrl, setPublicUrl] = useState('');
  const [copiedUrl, setCopiedUrl] = useState(false);

  const handlePublish = async () => {
    if (!confirm('Publish this blueprint to a public URL? Anyone with the link can view it.')) return;
    
    setPublishing(true);
    try {
      const serverUrl = localStorage.getItem('server_url') || 
        (window.location.hostname === 'localhost' ? 'http://localhost:3001' : window.location.origin);
      const token = localStorage.getItem('auth_token');
      
      if (!token) {
        alert('You must be logged in to publish.');
        return;
      }

      // Extract title from blueprint or use first line
      const titleMatch = blueprint.match(/^# (.*)/m);
      const title = titleMatch ? titleMatch[1] : 'Untitled Project';

      const res = await fetch(`${serverUrl}/api/public/publish`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title,
          content: blueprint,
          expiresInDays: 30
        })
      });

      const data = await res.json();
      if (data.success) {
        // Construct full URL
        const fullUrl = `${window.location.protocol}//${window.location.host}${data.url}`;
        setPublicUrl(fullUrl);
        setShowPublishModal(true);
      } else {
        throw new Error(data.error || 'Failed to publish');
      }
    } catch (e) {
      console.error(e);
      alert(`Publishing failed: ${e.message}`);
    } finally {
      setPublishing(false);
    }
  };

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(publicUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  return (
    <div className="space-y-6 animate-fade-in relative">
      <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-lg overflow-hidden flex flex-col h-[600px]">
        {/* Tab Header */}
        <div className="flex border-b border-slate-700">
          <button
            onClick={() => setTab('preview')}
            className={`flex-1 p-4 text-sm font-mono flex items-center justify-center gap-2 transition-colors ${currentTab === 'preview' ? 'bg-slate-700/50 text-amber-400' : 'text-slate-400 hover:text-slate-200'}`}
          >
            <FileText className="w-4 h-4" />
            BLUEPRINT PREVIEW
          </button>
          <button
            onClick={() => setTab('chat')}
            className={`flex-1 p-4 text-sm font-mono flex items-center justify-center gap-2 transition-colors ${currentTab === 'chat' ? 'bg-slate-700/50 text-amber-400' : 'text-slate-400 hover:text-slate-200'}`}
          >
            <MessageSquare className="w-4 h-4" />
            REFINE / CHAT
            {/* Context indicator in tab when compressed */}
            {chatHistory.length > 4 && currentTab !== 'chat' && (
              <span className="text-xs text-amber-400/60">({chatHistory.length})</span>
            )}
          </button>
        </div>

        {/* Context Optimization Bar - shows when in chat mode with history */}
        {currentTab === 'chat' && chatHistory.length > 0 && (
          <div className="px-4 py-2 border-b border-slate-700/50 bg-slate-900/30">
            <ContextIndicator messages={chatHistory} windowSize={8} />
          </div>
        )}
        <div className="flex-1 overflow-hidden relative">
          {currentTab === 'preview' && (
            <div className="h-full overflow-y-auto p-6 bg-slate-900/30">
              <pre className="whitespace-pre-wrap text-xs text-slate-300 font-mono">
                {blueprint}
              </pre>
            </div>
          )}

          {currentTab === 'chat' && (
            <div className="h-full flex flex-col">
              <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-900/30">
                {conversation.length === 0 && (
                  <div className="text-center py-8 text-slate-500">
                    <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No refinements yet. Ask to modify your blueprint below.</p>
                  </div>
                )}
                {conversation.map((msg, idx) => (
                  <div key={idx} className={`${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
                    {msg.role === 'user' ? (
                      <div className="inline-block bg-amber-500/20 border border-amber-500/30 rounded-lg px-4 py-2 max-w-[80%]">
                        <p className="text-sm text-amber-100 font-sans">
                          {msg.content}
                        </p>
                        {msg.timestamp && (
                          <p className="text-xs text-amber-400/50 mt-1 font-mono">
                            {new Date(msg.timestamp).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="bg-slate-800/50 border border-slate-600 rounded-lg p-4 max-w-full">
                        {msg.type === 'error' ? (
                           <p className="text-red-400 text-sm font-mono">{msg.content}</p>
                        ) : (
                          <>
                            <div className="flex items-center gap-2 text-slate-400 text-xs font-mono mb-2">
                               <Sparkles className="w-3 h-3" /> Blueprint Updated
                               {msg.timestamp && (
                                 <span className="text-slate-500">
                                   • {new Date(msg.timestamp).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                 </span>
                               )}
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                ))}
                {loading && (
                   <div className="text-left">
                     <div className="inline-block bg-slate-800/50 border border-slate-600 rounded-lg px-4 py-3">
                       <p className="text-sm text-slate-400 animate-pulse font-mono">
                         Refining blueprint...
                       </p>
                     </div>
                   </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Input */}
              <div className="p-4 border-t border-slate-700 bg-slate-900/50">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={refinementInput}
                    onChange={(e) => setRefinementInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && !loading && onRefine()}
                    placeholder="Request changes, additions, or clarifications..."
                    className="flex-1 bg-slate-800 border border-slate-600 rounded px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors text-sm font-sans"
                    disabled={loading}
                  />
                  <button
                    onClick={onRefine}
                    disabled={!refinementInput.trim() || loading}
                    className="bg-amber-500 hover:bg-amber-600 disabled:bg-slate-700 disabled:text-slate-500 text-slate-900 px-6 py-3 rounded transition-all flex items-center gap-2"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={onStartOver}
          className="bg-slate-700 hover:bg-slate-600 text-white px-6 py-4 rounded-lg transition-all font-mono"
        >
          START OVER
        </button>

        {/* Publish Button */}
        <button
          onClick={handlePublish}
          disabled={publishing || loading}
          className="bg-sky-600 hover:bg-sky-700 disabled:bg-slate-700 disabled:text-slate-500 text-white font-medium px-6 py-4 rounded-lg transition-all flex items-center justify-center gap-2 group font-mono"
          title="Publish to public URL"
        >
          {publishing ? <Sparkles className="w-4 h-4 animate-spin" /> : <Globe className="w-4 h-4" />}
          PUBLISH
        </button>

        <button
          onClick={onGenerateMockup}
          disabled={loading}
          className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-slate-700 disabled:text-slate-500 text-white font-medium py-4 rounded-lg transition-all flex items-center justify-center gap-2 group font-mono"
        >
          <Check className="w-4 h-4" />
          APPROVE & GENERATE MOCKUP
        </button>
      </div>

      {/* Publish Success Modal */}
      {showPublishModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#1A1A1A] border border-[#333] rounded-xl p-6 w-full max-w-lg shadow-2xl relative">
             <button 
               onClick={() => setShowPublishModal(false)}
               className="absolute top-4 right-4 text-gray-500 hover:text-white"
             >
               <X className="w-5 h-5" />
             </button>

             <div className="text-center mb-6">
               <div className="w-16 h-16 bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                 <Globe className="w-8 h-8 text-green-400" />
               </div>
               <h3 className="text-xl font-serif text-white mb-2">Blueprint Published!</h3>
               <p className="text-gray-400 text-sm">Your blueprint is now publicly accessible via the link below.</p>
             </div>

             <div className="bg-black/50 border border-white/10 rounded-lg p-3 flex items-center gap-3 mb-6">
                <input 
                  type="text" 
                  readOnly 
                  value={publicUrl}
                  className="bg-transparent border-none text-gray-300 text-sm font-mono flex-1 focus:ring-0"
                />
                <button
                  onClick={copyToClipboard}
                  className={`p-2 rounded hover:bg-white/10 transition-colors ${copiedUrl ? 'text-green-400' : 'text-gray-400'}`}
                  title="Copy Link"
                >
                  {copiedUrl ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </button>
             </div>

             <div className="flex justify-center">
               <button
                  onClick={() => window.open(publicUrl, '_blank')}
                  className="px-6 py-2 bg-[#D4AF37] hover:bg-[#C5A028] text-black rounded-lg font-medium transition-colors text-sm"
               >
                 Open Link
               </button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
}
