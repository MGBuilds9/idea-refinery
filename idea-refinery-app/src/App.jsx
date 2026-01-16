import React, { useState, useEffect, Suspense } from 'react';
import { Sparkles, Settings, Zap, History } from 'lucide-react';
import InputStage from './components/InputStage';
import QuestionsStage from './components/QuestionsStage';
import SettingsModal from './components/SettingsModal';
import HistoryModal from './components/HistoryModal';
import PinLockScreen from './components/PinLockScreen';

// Lazy load heavy stages
const BlueprintStage = React.lazy(() => import('./components/BlueprintStage'));
const MockupStage = React.lazy(() => import('./components/MockupStage'));
import { llm } from './lib/llm';
import { saveConversation, getRecentConversations, cleanupOldConversations, deleteConversation, getSetting } from './services/db';
import { SyncService } from './services/SyncService';
import { PROMPTS } from './lib/prompts';

function App() {
  const [stage, setStage] = useState('input');
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [settingsWarning, setSettingsWarning] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [historyItems, setHistoryItems] = useState([]);
  const [currentDbId, setCurrentDbId] = useState(null);
  
  // Security State
  const [isLocked, setIsLocked] = useState(true);
  const [checkingLock, setCheckingLock] = useState(true);
  // eslint-disable-next-line no-unused-vars
  const [activePin, setActivePin] = useState(null); // Used to decrypt keys in llm.js (Phase 1 final step)
  
  // Data State
  const [idea, setIdea] = useState('');
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [blueprint, setBlueprint] = useState('');
  const [masterPrompt, setMasterPrompt] = useState('');
  const [htmlMockup, setHtmlMockup] = useState('');
  
  // Interaction State
  const [conversation, setConversation] = useState([]);
  const [chatHistory, setChatHistory] = useState([]); // Full chat history for resumable convos
  const [refinementInput, setRefinementInput] = useState('');
  const [blueprintTab, setBlueprintTab] = useState('preview');

  // Currently selected provider
  const [provider, setProvider] = useState(llm.getDefaultProvider());

  // Listen for settings changes to update provider
  // Listen for settings changes to update provider
  const refreshProvider = () => {
    setProvider(llm.getDefaultProvider());
  };

  // DB Checks and PIN Lock
  useEffect(() => {
    const checkPinLock = async () => {
      try {
        const pinHash = await getSetting('pinHash');
        if (pinHash) {
          setIsLocked(true);
        } else {
          setIsLocked(false);
        }
      } catch (e) {
        console.error('Error checking PIN lock:', e);
        setIsLocked(false);
      } finally {
        setCheckingLock(false);
      }
    };
    checkPinLock();
    cleanupOldConversations().catch(console.error);
  }, []);

  const handleUnlock = async (pin) => {
    setActivePin(pin);
    // Load encrypted API keys and set active PIN on llm service
    await llm.loadEncryptedKeys(pin);
    llm.setActivePin(pin);
    setIsLocked(false);
  };

  const loadHistory = async () => {
    const items = await getRecentConversations();
    setHistoryItems(items);
  };

  const handleOpenHistory = () => {
    loadHistory();
    setShowHistory(true);
  };

  const handleLoadSession = (item, goToBlueprint = false) => {
    setIdea(item.idea);
    setQuestions(item.questions || []);
    setAnswers(item.answers || {});
    setBlueprint(item.blueprint || '');
    setMasterPrompt(item.masterPrompt || '');
    setHtmlMockup(item.htmlMockup || '');
    setChatHistory(item.chatHistory || []);
    setConversation(item.chatHistory || []);
    setCurrentDbId(item.id);
    
    // Set appropriate stage
    if (goToBlueprint && item.blueprint) {
      setStage('blueprint');
    } else if (item.htmlMockup) {
      setStage('mockup');
    } else if (item.blueprint) {
      setStage('blueprint');
    } else if (item.questions && item.questions.length > 0) {
      setStage('questions');
    } else {
      setStage('input');
    }
    
    setShowHistory(false);
  };

  const handleDeleteSession = async (id) => {
    await deleteConversation(id);
    loadHistory(); // Refresh list
  };

  // Save helper
  const saveProgress = async (updates) => {
    try {
        const fullData = {
            id: currentDbId,
            idea,
            questions,
            answers,
            blueprint,
            htmlMockup,
            masterPrompt,
            chatHistory,
            ...updates
        };
        const id = await saveConversation(fullData);
        setCurrentDbId(id);

        // Sync to server
        const serverUrl = localStorage.getItem('serverUrl');
        if (serverUrl) {
           // Fire and forget sync to not block UI
           SyncService.push(serverUrl, { ...fullData, id }).catch(console.error);
        }

    } catch (e) {
        console.error('Failed to auto-save:', e);
    }
  };

  // Initial Sync
  useEffect(() => {
    const syncFromServer = async () => {
      const serverUrl = localStorage.getItem('serverUrl');
      if (!serverUrl) return;

      try {
        const result = await SyncService.pull(serverUrl);
        if (result && result.data) {
           // Check if server data is newer? For now simple load if we are empty
           // Or just log it? 
           // Let's being conservative: Only load if we are at 'input' stage and idea is empty
           // Or maybe we should have a "Load from Server" button?
           // For now, let's just log. "Auto-load" can be dangerous without conflict resolution.
           console.log('Server has data:', result);
        }
      } catch (e) {
        console.error('Sync check failed:', e);
      }
    };
    syncFromServer();
  }, []);

  // Helper to ensure API key exists
  const checkApiKey = (p = provider) => {
    if (!llm.getApiKey(p)) {
      setShowSettings(true);
      setSettingsWarning(`Please enter your ${p} API key to continue.`);
      return false;
    }
    return true;
  };

  const handleGenerateQuestions = async () => {
    if (!checkApiKey()) return;
    setLoading(true);
    setLoadingMessage('Generating questions...');
    try {
      const { system, prompt } = PROMPTS.questions(idea);
      const model = llm.getModelForStage('questions');
      const responseText = await llm.generate(provider, {
        system,
        prompt,
        model
      });

      // Parse JSON from response
      const cleanText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const parsed = JSON.parse(cleanText);
      setQuestions(parsed);
      setAnswers(parsed.reduce((acc, _, i) => ({ ...acc, [i]: '' }), {}));
      
      // Save
      await saveProgress({ idea, questions: parsed });
      
      setStage('questions');
    } catch (e) {
      alert(`Error: ${e.message}`);
    } finally {
      setLoading(false);
      setLoadingMessage('');
    }
  };

  const handleGenerateBlueprint = async () => {
    if (!checkApiKey()) return;
    
    // Also check second pass provider if enabled
    const settings = llm.getSettings();
    if (settings.enableSecondPass && !llm.getApiKey(settings.secondPassProvider)) {
      setShowSettings(true);
      setSettingsWarning(`Second pass is enabled. Please enter your ${settings.secondPassProvider} API key.`);
      return;
    }
    
    setLoading(true);
    setStage('generating');
    
    try {
      // First pass
      setLoadingMessage('Generating blueprint...');
      const { system, prompt } = PROMPTS.blueprint(idea, questions, answers);
      const model = llm.getModelForStage('blueprint');
      let responseText = await llm.generate(provider, {
        system,
        prompt,
        model,
        maxTokens: 8000
      });

      // Second pass if enabled
      if (settings.enableSecondPass) {
        setLoadingMessage('Refining with second AI...');
        const { system: sp2System, prompt: sp2Prompt } = PROMPTS.secondPass(responseText);
        responseText = await llm.generate(settings.secondPassProvider, {
          system: sp2System,
          prompt: sp2Prompt,
          model: settings.secondPassModel,
          maxTokens: 8000
        });
      }

      const sections = responseText.split('## Master Takeoff Prompt');
      setBlueprint(responseText);
      setMasterPrompt(sections[1] ? sections[1].trim() : '');
      setConversation([{
        role: 'assistant', 
        content: responseText, 
        type: 'blueprint'
      }]);

      // Save
      await saveProgress({ 
         blueprint: responseText, 
         masterPrompt: sections[1] ? sections[1].trim() : '',
         answers // save answers too if not saved yet
      });

      setStage('blueprint');
    } catch (e) {
      alert(`Error: ${e.message}`);
      setStage('questions');
    } finally {
      setLoading(false);
      setLoadingMessage('');
    }
  };

  const handleRefineBlueprint = async () => {
    if (!refinementInput.trim()) return;
    if (!checkApiKey()) return;
    
    const userMsg = { role: 'user', content: refinementInput };
    setConversation(prev => [...prev, userMsg]);
    setRefinementInput('');
    setLoading(true);
    setLoadingMessage('Refining blueprint...');

    try {
      const { system } = PROMPTS.refine();
      const prompt = `CURRENT BLUEPRINT:\n${blueprint}\n\nUSER REQUEST: ${refinementInput}`;
      const model = llm.getModelForStage('refinement');

      const responseText = await llm.generate(provider, {
          system, 
          prompt,
          model,
          maxTokens: 8000
      });
      
      const sections = responseText.split('## Master Takeoff Prompt');
      setBlueprint(responseText);
      setMasterPrompt(sections[1] ? sections[1].trim() : '');
      
      const assistantMsg = {
        role: 'assistant',
        content: responseText,
        type: 'response',
        timestamp: Date.now()
      };
      
      setConversation(prev => [...prev, assistantMsg]);
      
      // Update chat history with both messages for resumable conversations
      const newChatHistory = [...chatHistory, { ...userMsg, timestamp: Date.now() - 1000 }, assistantMsg];
      setChatHistory(newChatHistory);

      // Save with updated chat history
      await saveProgress({ 
         blueprint: responseText, 
         masterPrompt: sections[1] ? sections[1].trim() : '',
         chatHistory: newChatHistory
      });

    } catch (e) {
      setConversation(prev => [...prev, { role: 'assistant', content: `Error: ${e.message}`, type: 'error' }]);
    } finally {
      setLoading(false);
      setLoadingMessage('');
    }
  };

  const handleGenerateMockup = async () => {
    if (!checkApiKey()) return;
    setLoading(true);
    setLoadingMessage('Generating mockup...');
    setStage('mockup');
    try {
      const { system, prompt } = PROMPTS.mockup(blueprint);
      const model = llm.getModelForStage('mockup');
      let html = await llm.generate(provider, { system, prompt, model, maxTokens: 8000 });
      
      // Clean up markdown fences
      html = html.replace(/```html\n?/g, '').replace(/```\n?/g, '').trim();
      
      // Inject copy script if missing
      if (!html.includes('id="markdown-content"')) {
         const insertPoint = html.lastIndexOf('</body>');
         if (insertPoint !== -1) {
            const extra = `
    <div style="display:none;"><pre id="markdown-content">${blueprint.replace(/</g, '&lt;')}</pre></div>
            `;
            html = html.slice(0, insertPoint) + extra + html.slice(insertPoint);
         }
      }

      setHtmlMockup(html);
      
      // Save
      await saveProgress({ htmlMockup: html });

    } catch (e) {
      alert(`Error: ${e.message}`);
      setStage('blueprint');
    } finally {
      setLoading(false);
      setLoadingMessage('');
    }
  };

  const downloadFile = (content, name, type) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Check if second pass is enabled for UI indicator
  const isSecondPassEnabled = llm.isSecondPassEnabled();

  return (
    <>
      {/* Loading state while checking PIN */}
      {checkingLock && (
        <div className="min-h-screen bg-[#1A1A1A] flex items-center justify-center">
          <Sparkles className="w-8 h-8 text-[#D4AF37] animate-pulse" />
        </div>
      )}

      {/* PIN Lock Screen */}
      {!checkingLock && isLocked && (
        <PinLockScreen onUnlock={handleUnlock} />
      )}

      {/* Main App */}
      {!checkingLock && !isLocked && (
    <div className="min-h-screen bg-[#1A1A1A] text-white">
      <div className="max-w-4xl mx-auto px-6 py-6 md:py-12">
        {/* Header */}
        <div className="mb-12 text-center relative">
          <button 
             onClick={() => setShowSettings(true)} 
             className="absolute top-0 right-0 p-2 text-gray-400 hover:text-[#D4AF37] transition-colors"
             title="Settings"
          >
             <Settings className="w-5 h-5" />
          </button>
          
          <button 
             onClick={handleOpenHistory} 
             className="absolute top-0 right-10 p-2 text-gray-400 hover:text-[#D4AF37] transition-colors"
             title="History"
          >
             <History className="w-5 h-5" />
          </button>

          <div className="flex flex-col items-center gap-6 mb-8">
            <img 
              src="/idea-refinery-logo.svg" 
              alt="Idea Refinery Logo" 
              className="w-24 h-24 object-contain drop-shadow-[0_0_15px_rgba(212,175,55,0.15)] animate-fade-in"
            />
          </div>
          
          {/* Second Pass Indicator */}
          {isSecondPassEnabled && (
            <div className="inline-flex items-center gap-1 mt-2 px-2 py-1 bg-purple-900/30 border border-purple-500/30 rounded-full">
              <Zap className="w-3 h-3 text-purple-400" />
              <span className="text-xs text-purple-300 font-mono">Second Pass Enabled</span>
            </div>
          )}
          
          {settingsWarning && (
            <p className="text-[#D4AF37] text-xs mt-2 font-mono animate-pulse">{settingsWarning}</p>
          )}
        </div>

        {stage === 'input' && (
          <InputStage 
            idea={idea} 
            setIdea={setIdea} 
            onNext={handleGenerateQuestions} 
            loading={loading}
            onOpenSettings={() => setShowSettings(true)}
          />
        )}

        {stage === 'questions' && (
          <QuestionsStage 
            questions={questions} 
            answers={answers} 
            setAnswers={setAnswers} 
            onNext={handleGenerateBlueprint}
            onBack={() => setStage('input')}
            loading={loading}
          />
        )}

        {stage === 'generating' && (
           <div className="flex flex-col items-center justify-center py-20 animate-pulse">
             <Sparkles className="w-12 h-12 text-[#D4AF37] mb-4" />
             <p className="text-gray-300 font-mono">{loadingMessage || 'Crafting your blueprint...'}</p>
             {isSecondPassEnabled && loadingMessage.includes('Refining') && (
               <div className="flex items-center gap-2 mt-3 text-purple-300">
                 <Zap className="w-4 h-4" />
                 <span className="text-xs font-mono">Second AI is reviewing...</span>
               </div>
             )}
           </div>
        )}

        {stage === 'blueprint' && (
          <Suspense fallback={
             <div className="flex flex-col items-center justify-center py-20">
               <Sparkles className="w-12 h-12 text-[#D4AF37] animate-pulse mb-4" />
               <p className="text-gray-300 font-mono">Loading blueprint engine...</p>
             </div>
          }>
            <BlueprintStage 
              blueprint={blueprint}
              conversation={conversation}
              onRefine={handleRefineBlueprint}
              onGenerateMockup={handleGenerateMockup}
              onStartOver={() => setStage('input')}
              loading={loading}
              refinementInput={refinementInput}
              setRefinementInput={setRefinementInput}
              currentTab={blueprintTab}
              setTab={setBlueprintTab}
            />
          </Suspense>
        )}

        {stage === 'mockup' && (
          <Suspense fallback={
             <div className="flex flex-col items-center justify-center py-20">
               <Sparkles className="w-12 h-12 text-[#D4AF37] animate-pulse mb-4" />
               <p className="text-gray-300 font-mono">Loading visualization engine...</p>
             </div>
          }>
            <MockupStage 
              masterPrompt={masterPrompt}
              htmlMockup={htmlMockup}
              loading={loading}
              onStartOver={() => setStage('input')}
              onDownloadMarkdown={() => downloadFile(blueprint, 'blueprint.md', 'text/markdown')}
              onDownloadHTML={() => downloadFile(htmlMockup, 'mockup.html', 'text/html')}
              onDownloadBoth={() => {
                downloadFile(blueprint, 'blueprint.md', 'text/markdown');
                setTimeout(() => downloadFile(htmlMockup, 'mockup.html', 'text/html'), 100);
              }}
            />
          </Suspense>
        )}
      </div>

      {showSettings && (
        <SettingsModal onClose={() => {
          setShowSettings(false);
          setSettingsWarning('');
          refreshProvider();
        }} />
      )}

      <HistoryModal 
        isOpen={showHistory}
        onClose={() => setShowHistory(false)}
        history={historyItems}
        onLoad={handleLoadSession}
        onDelete={handleDeleteSession}
      />
    </div>
      )}
    </>
  );
}

export default App;
