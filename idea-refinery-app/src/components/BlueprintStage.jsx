import React, { useState, useRef, useEffect, memo } from 'react';
import { Reorder } from 'framer-motion';
import { FileText, MessageSquare, Check, Send, Sparkles, Globe, Copy, X, Layers } from 'lucide-react';
import { toast } from 'sonner';
import ContextIndicator from './ContextIndicator';
import FeatureCard from './FeatureCard';
import ChatMessage from './ChatMessage';
import DiffViewer from './DiffViewer';
import ExportModal from './ExportModal';

const BlueprintStage = memo(function BlueprintStage({
  blueprint,
  conversation,
  onRefine,
  onGenerateMockup,
  onStartOver,
  loading,
  currentTab = 'preview',
  setTab,
  chatHistory = [],
  ideaSpec,
  proposedSpec,
  onAcceptRefinement,
  onRejectRefinement,
  isExportModalOpen,
  setIsExportModalOpen,
  onExportPackage,
  onSave
}) {
  const chatEndRef = useRef(null);
  const [input, setInput] = useState('');

  const [localFeatures, setLocalFeatures] = useState([]);
  const saveTimeoutRef = useRef(null);
  const pendingSaveDataRef = useRef(null);

  const latestIdeaSpecRef = useRef(ideaSpec);
  const latestOnSaveRef = useRef(onSave);

  useEffect(() => {
    latestIdeaSpecRef.current = ideaSpec;
    latestOnSaveRef.current = onSave;
  }, [ideaSpec, onSave]);

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        if (pendingSaveDataRef.current && latestOnSaveRef.current && latestIdeaSpecRef.current) {
          latestOnSaveRef.current({
            ideaSpec: {
                ...latestIdeaSpecRef.current,
                features: pendingSaveDataRef.current
            }
          });
        }
      }
    };
  }, []);

  useEffect(() => {
    if (ideaSpec?.features) {
       setLocalFeatures(ideaSpec.features);
    }
  }, [ideaSpec]);

  const handleReorder = (newOrder) => {
    setLocalFeatures(newOrder);
    pendingSaveDataRef.current = newOrder;

    if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
        const currentSpec = latestIdeaSpecRef.current;
        const currentOnSave = latestOnSaveRef.current;

        if (currentOnSave && currentSpec) {
            currentOnSave({
                ideaSpec: {
                    ...currentSpec,
                    features: newOrder
                }
            });
            pendingSaveDataRef.current = null;
        }
    }, 1000);
  };

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
        toast.error('You must be logged in to publish.');
        return;
      }

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
        const fullUrl = `${window.location.protocol}//${window.location.host}${data.url}`;
        setPublicUrl(fullUrl);
        setShowPublishModal(true);
      } else {
        throw new Error(data.error || 'Failed to publish');
      }
    } catch (e) {
      console.error(e);
      toast.error(`Publishing failed: ${e.message}`);
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
      <div className="bg-white/5 backdrop-blur border border-white/10 rounded-lg overflow-hidden flex flex-col h-[600px]">
        {/* Tab Header */}
        <div className="flex border-b border-white/10">
          <button
            onClick={() => setTab('features')}
            className={`flex-1 p-4 text-sm font-mono flex items-center justify-center gap-2 transition-colors ${currentTab === 'features' ? 'bg-white/5 text-[#d4af37]' : 'text-zinc-400 hover:text-zinc-200'}`}
          >
            <Layers className="w-4 h-4" />
            FEATURES
          </button>
          <button
            onClick={() => setTab('preview')}
            className={`flex-1 p-4 text-sm font-mono flex items-center justify-center gap-2 transition-colors ${currentTab === 'preview' ? 'bg-white/5 text-[#d4af37]' : 'text-zinc-400 hover:text-zinc-200'}`}
          >
            <FileText className="w-4 h-4" />
            BLUEPRINT PREVIEW
          </button>
          <button
            onClick={() => setTab('chat')}
            className={`flex-1 p-4 text-sm font-mono flex items-center justify-center gap-2 transition-colors ${currentTab === 'chat' ? 'bg-white/5 text-[#d4af37]' : 'text-zinc-400 hover:text-zinc-200'}`}
          >
            <MessageSquare className="w-4 h-4" />
            REFINE / CHAT
            {chatHistory.length > 4 && currentTab !== 'chat' && (
              <span className="text-xs text-[#d4af37]/60">({chatHistory.length})</span>
            )}
          </button>
        </div>

        {/* Context Optimization Bar */}
        {currentTab === 'chat' && chatHistory.length > 0 && (
          <div className="px-4 py-2 border-b border-white/5 bg-[#09090b]/50">
            <ContextIndicator messages={chatHistory} windowSize={8} />
          </div>
        )}
        <div className="flex-1 overflow-hidden relative">
          {currentTab === 'features' && (
            <div className="h-full overflow-y-auto p-6 bg-[#09090b]/30">
               {!localFeatures || localFeatures.length === 0 ? (
                 <div className="text-center py-12 text-zinc-500 font-mono">
                    No structured features found. Try generating a new blueprint.
                 </div>
               ) : (
                 <div className="max-w-3xl mx-auto space-y-4">
                    <p className="text-xs text-zinc-400 font-mono mb-4 text-center">
                        DRAG CARDS TO REPRIORITIZE FEATURES
                    </p>
                    <Reorder.Group axis="y" values={localFeatures} onReorder={handleReorder} className="space-y-3">
                        {localFeatures.map((feature, idx) => (
                            <Reorder.Item key={feature.id || idx} value={feature}>
                                <FeatureCard feature={feature} />
                            </Reorder.Item>
                        ))}
                    </Reorder.Group>
                 </div>
               )}
            </div>
          )}

          {currentTab === 'preview' && (
            <div className="h-full overflow-y-auto p-6 bg-[#09090b]/30">
              <pre className="whitespace-pre-wrap text-xs text-zinc-300 font-mono">
                {blueprint}
              </pre>
            </div>
          )}

          {currentTab === 'chat' && (
            <div className="h-full flex flex-col">
              <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-[#09090b]/30">
                {conversation.length === 0 && (
                  <div className="text-center py-8 text-zinc-500">
                    <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No refinements yet. Ask to modify your blueprint below.</p>
                  </div>
                )}
                {conversation.map((msg, idx) => (
                  <ChatMessage key={idx} msg={msg} />
                ))}
                {loading && (
                   <div className="text-left">
                     <div className="inline-block bg-white/5 border border-white/10 rounded-lg px-4 py-3">
                       <div className="flex items-center gap-1.5">
                         <span className="w-2 h-2 bg-[#d4af37] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                         <span className="w-2 h-2 bg-[#d4af37] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                         <span className="w-2 h-2 bg-[#d4af37] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                       </div>
                     </div>
                   </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Suggestion Chips */}
              <div className="px-4 pt-3 pb-1 border-t border-white/5 bg-[#09090b]/50 flex flex-wrap gap-2">
                {[
                  'Add authentication',
                  'Simplify tech stack',
                  'Add more features',
                  'Focus on MVP',
                  'Add database schema',
                  'Improve security',
                ].map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => setInput(suggestion)}
                    disabled={loading}
                    className="px-3 py-1.5 text-xs font-mono bg-white/5 border border-white/10 rounded-full text-zinc-400 hover:text-[#d4af37] hover:border-[#d4af37]/30 hover:bg-[#d4af37]/5 transition-all disabled:opacity-50"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>

              {/* Input */}
              <div className="p-4 border-t border-white/10 bg-[#09090b]/50">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && !loading && input.trim()) {
                        onRefine(input);
                        setInput('');
                      }
                    }}
                    placeholder="Request changes, additions, or clarifications..."
                    className="flex-1 bg-white/5 border border-white/10 rounded px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-[#d4af37]/50 transition-colors text-sm font-sans"
                    disabled={loading}
                  />
                  <button
                    onClick={() => {
                       onRefine(input);
                       setInput('');
                    }}
                    disabled={!input.trim() || loading}
                    className="bg-[#d4af37] hover:bg-[#c5a028] disabled:bg-zinc-800 disabled:text-zinc-500 text-black px-6 py-3 rounded transition-all flex items-center gap-2"
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
          className="bg-zinc-800 hover:bg-zinc-700 text-white px-6 py-4 rounded-lg transition-all font-mono"
        >
          START OVER
        </button>

        <button
          onClick={() => setIsExportModalOpen(true)}
          disabled={loading || !ideaSpec}
          className="bg-[#d4af37]/20 hover:bg-[#d4af37]/30 disabled:bg-zinc-800 disabled:text-zinc-500 text-[#d4af37] font-medium px-6 py-4 rounded-lg transition-all flex items-center justify-center gap-2 group font-mono border border-[#d4af37]/30"
        >
          <Sparkles className="w-4 h-4" />
          EXPORT
        </button>

        {/* Publish Button */}
        <button
          onClick={handlePublish}
          disabled={publishing || loading}
          className="bg-sky-600/20 hover:bg-sky-600/30 disabled:bg-zinc-800 disabled:text-zinc-500 text-sky-400 font-medium px-6 py-4 rounded-lg transition-all flex items-center justify-center gap-2 group font-mono border border-sky-500/30"
          title="Publish to public URL"
        >
          {publishing ? <Sparkles className="w-4 h-4 animate-spin" /> : <Globe className="w-4 h-4" />}
          PUBLISH
        </button>

        <button
          onClick={onGenerateMockup}
          disabled={loading}
          className="flex-1 bg-[#d4af37] hover:bg-[#c5a028] disabled:bg-zinc-800 disabled:text-zinc-500 text-black font-medium py-4 rounded-lg transition-all flex items-center justify-center gap-2 group font-mono"
        >
          <Check className="w-4 h-4" />
          APPROVE & MOCKUP
        </button>
      </div>

      {/* Overlays & Modals */}
      {proposedSpec && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl shadow-2xl">
            <DiffViewer
              oldSpec={ideaSpec}
              newSpec={proposedSpec}
              onAccept={onAcceptRefinement}
              onReject={onRejectRefinement}
            />
          </div>
        </div>
      )}

      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        onExport={onExportPackage}
      />

      {/* Publish Success Modal */}
      {showPublishModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#131316] border border-white/10 rounded-xl p-6 w-full max-w-lg shadow-2xl relative">
             <button
               onClick={() => setShowPublishModal(false)}
               className="absolute top-4 right-4 text-zinc-500 hover:text-white"
             >
               <X className="w-5 h-5" />
             </button>

             <div className="text-center mb-6">
               <div className="w-16 h-16 bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                 <Globe className="w-8 h-8 text-emerald-400" />
               </div>
               <h3 className="text-xl font-sans font-semibold text-white mb-2">Blueprint Published!</h3>
               <p className="text-zinc-400 text-sm">Your blueprint is now publicly accessible via the link below.</p>
             </div>

             <div className="bg-black/50 border border-white/10 rounded-lg p-3 flex items-center gap-3 mb-6">
                <input
                  type="text"
                  readOnly
                  value={publicUrl}
                  className="bg-transparent border-none text-zinc-300 text-sm font-mono flex-1 focus:ring-0"
                />
                <button
                  onClick={copyToClipboard}
                  className={`p-2 rounded hover:bg-white/10 transition-colors ${copiedUrl ? 'text-emerald-400' : 'text-zinc-400'}`}
                  title="Copy Link"
                >
                  {copiedUrl ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </button>
             </div>

             <div className="flex justify-center">
               <button
                  onClick={() => window.open(publicUrl, '_blank')}
                  className="px-6 py-2 bg-[#d4af37] hover:bg-[#c5a028] text-black rounded-lg font-medium transition-colors text-sm"
               >
                 Open Link
               </button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
});

export default BlueprintStage;
