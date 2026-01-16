import React, { useState, useEffect, Suspense } from 'react';
import { Sparkles, Zap } from 'lucide-react';
import Sidebar from './components/Sidebar';
import InputStage from './components/InputStage';
import QuestionsStage from './components/QuestionsStage';
import SettingsView from './components/SettingsView';
import HistoryView from './components/HistoryView';
import PinLockScreen from './components/PinLockScreen';
import LoginScreen from './components/LoginScreen';
import OnboardingView from './components/OnboardingView';
import PromptStudio from './components/PromptStudio';
import TokenUsage from './components/TokenUsage';

// Lazy load heavy stages
const BlueprintStage = React.lazy(() => import('./components/BlueprintStage'));
const MockupStage = React.lazy(() => import('./components/MockupStage'));
import { llm } from './lib/llm';
import { saveConversation, getRecentConversations, cleanupOldConversations, deleteConversation, getSetting, pullItems } from './services/db';
import { SyncService } from './services/SyncService';
import { PromptService } from './services/PromptService';

function App() {
  // Navigation State
  const [activeView, setActiveView] = useState('input'); // 'input', 'history', 'settings', 'prompts'
  const [stage, setStage] = useState('input'); // Sub-stage for the 'input/project' flow

  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  
  // History State
  const [historyItems, setHistoryItems] = useState([]);
  const [currentDbId, setCurrentDbId] = useState(null);
  
  // Security & Onboarding State
  const [isOnboarding, setIsOnboarding] = useState(!localStorage.getItem('onboarding_complete'));
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('auth_token'));
  const [isLocked, setIsLocked] = useState(true);
  const [checkingLock, setCheckingLock] = useState(true);
  // eslint-disable-next-line no-unused-vars
  const [activePin, setActivePin] = useState(null); 
  
  // Data State
  const [idea, setIdea] = useState('');
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [blueprint, setBlueprint] = useState('');
  const [masterPrompt, setMasterPrompt] = useState('');
  const [htmlMockup, setHtmlMockup] = useState('');
  
  // Interaction State
  const [conversation, setConversation] = useState([]);
  const [chatHistory, setChatHistory] = useState([]); 
  const [refinementInput, setRefinementInput] = useState('');
  const [blueprintTab, setBlueprintTab] = useState('preview');

  // Currently selected provider
  // const [provider, setProvider] = useState(llm.getDefaultProvider()); // Unused state, fetching dynamically


  // DB Checks and PIN Lock
  useEffect(() => {
    const checkPinLock = async () => {
      try {
        // v1.2: Check local storage for PIN first
        const localPin = localStorage.getItem('app_pin');
        if (localPin) {
           setIsLocked(true);
        } else {
           // Fallback to legacy DB check
           const pinHash = await getSetting('pinHash');
           if (pinHash) {
             setIsLocked(true);
           } else {
             // If no PIN at all, and not onboarding, we might be in an inconsistent state or dev mode
             setIsLocked(false);
           }
        }
      } catch (e) {
        console.error('Error checking PIN lock:', e);
        setIsLocked(false);
      } finally {
        setCheckingLock(false);
      }
    };
    
    if (!isOnboarding) {
        checkPinLock();
        cleanupOldConversations().catch(console.error);
        loadHistory(); 
    } else {
        setCheckingLock(false);
    }
  }, [isOnboarding]);

  const handleUnlock = async (pin) => {
    // Verify PIN against localStorage
    const storedPin = localStorage.getItem('app_pin');
    
    if (storedPin && pin !== storedPin) {
        alert('Incorrect PIN');
        return;
    }
    
    setActivePin(pin);
    // Load encrypted API keys and set active PIN on llm service
    // For v1.2, we might be storing keys in localStorage plain text (transition period)
    // But let's try to load properly if they exist.
    await llm.loadEncryptedKeys(pin);
    llm.setActivePin(pin);
    
    // Trigger Sync Pull
    const serverUrl = localStorage.getItem('server_url') || import.meta.env.VITE_API_URL || 
       (window.location.hostname === 'localhost' ? 'http://localhost:3001' : window.location.origin);
    pullItems(serverUrl).catch(console.error);

    // Initialize Prompt Service (load overrides)
    PromptService.init().catch(console.error);

    setIsLocked(false);
  };
  
  const handleOnboardingComplete = () => {
      setIsOnboarding(false);
      // Onboarding saves 'onboarding_complete' and 'app_pin' to localStorage
      // We should now be "authenticated" partially, or at least setup.
      // Reload or just set state?
      // Setting state triggers useEffect -> checkPinLock -> locks screen?
      // We probably want to go straight to input, but "forcing" a login/unlock to verify PIN is good security.
      // But for better UX, let's just unlock immediately.
      setIsLocked(false);
      loadHistory();
  };

  const handleLogin = (token) => {
    localStorage.setItem('auth_token', token);
    setIsAuthenticated(true);
  };

  const loadHistory = async () => {
    const items = await getRecentConversations();
    setHistoryItems(items);
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
    
    // Switch to input/project view
    setActiveView('input');
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
           SyncService.push(serverUrl, { ...fullData, id }).catch(console.error);
        }
        
        loadHistory(); // Refresh history list after save

    } catch (e) {
        console.error('Failed to auto-save:', e);
    }
  };

  // Helper to ensure API key exists
  const checkApiKey = (p) => {
    const provider = p || llm.getDefaultProvider();
    if (!llm.getApiKey(provider)) {
      setActiveView('settings');
      alert(`Please enter your ${provider} API key in Settings to continue.`);
      return false;
    }
    return true;
  };

  const handleGenerateQuestions = async () => {
    if (!checkApiKey()) return;
    setLoading(true);
    setLoadingMessage('Generating questions...');
    setLoadingMessage('Generating questions...');
    try {
      const { system, prompt } = PromptService.get('questions', { idea });
      const currentProvider = llm.getDefaultProvider();
      const model = llm.getModelForStage('questions');
      const responseText = await llm.generate(currentProvider, {
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
      console.error(e);
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
      setActiveView('settings');
      alert(`Second pass is enabled. Please enter your ${settings.secondPassProvider} API key in Settings.`);
      return;
    }
    
    setLoading(true);
    setStage('generating');
    
    try {
      // First pass
      setLoadingMessage('Generating blueprint...');
      const { system, prompt } = PromptService.get('blueprint', { idea, questions, answers });
      const currentProvider = llm.getDefaultProvider();
      const model = llm.getModelForStage('blueprint');
      let responseText = await llm.generate(currentProvider, {
        system,
        prompt,
        model,
        maxTokens: 8000
      });

      // Second pass if enabled
      if (settings.enableSecondPass) {
        setLoadingMessage('Refining with second AI...');
        const { system: sp2System, prompt: sp2Prompt } = PromptService.get('secondPass', { originalBlueprint: responseText });
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
         answers 
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
      const { system } = PromptService.get('refine', { refinementInput });
      const prompt = `CURRENT BLUEPRINT:\n${blueprint}\n\nUSER REQUEST: ${refinementInput}`;
      const model = llm.getModelForStage('refinement');

      const currentProvider = llm.getDefaultProvider();
      const responseText = await llm.generate(currentProvider, {
          system, 
          prompt,
          model,
          maxTokens: 8000,
          history: chatHistory // Pass history for optimization
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
      
      const newChatHistory = [...chatHistory, { ...userMsg, timestamp: Date.now() - 1000 }, assistantMsg];
      setChatHistory(newChatHistory);

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
    setStage('mockup');
    try {
      const { system, prompt } = PromptService.get('mockup', { blueprint });
      const currentProvider = llm.getDefaultProvider();
      const model = llm.getModelForStage('mockup');
      let html = await llm.generate(currentProvider, { system, prompt, model, maxTokens: 8000 });
      
      html = html.replace(/```html\n?/g, '').replace(/```\n?/g, '').trim();
      
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

  const isSecondPassEnabled = llm.isSecondPassEnabled();

  // Handle new project creation from Sidebar
  const handleViewChange = (view) => {
      // If we are already on input and click input again, maybe reset?
      if (view === 'input' && activeView !== 'input') {
          // Switching back to project view, keep state
      } else if (view === 'input' && activeView === 'input') {
          // If already on input, asking to start new
          if (confirm('Start a new project? Unsaved progress will be lost if not autosaved.')) {
            setIdea('');
            setQuestions([]);
            setAnswers({});
            setBlueprint('');
            setHtmlMockup('');
            setCurrentDbId(null);
            setStage('input');
          } else {
              return; // Cancel switch
          }
      }
      
      // Always refresh history when entering history view
      if (view === 'history') {
          loadHistory();
      }

      setActiveView(view);
  };

  return (
    <>
      {checkingLock && (
        <div className="min-h-screen bg-[#1A1A1A] flex items-center justify-center">
          <div className="flex flex-col items-center">
             <Sparkles className="w-8 h-8 text-[#D4AF37] animate-pulse mb-4" />
             <p className="text-[#D4AF37] font-mono text-xs">INITIALIZING REFINERY...</p>
          </div>
        </div>
      )}

      {!checkingLock && isOnboarding && (
        <OnboardingView onComplete={handleOnboardingComplete} />
      )}

      {/* Main App Flow (Only if not onboarding) */}
      {!checkingLock && !isOnboarding && (
       <>
         {!isAuthenticated && (
           <LoginScreen onLogin={handleLogin} />
         )}

         {isAuthenticated && isLocked && (
           <PinLockScreen onSuccess={handleUnlock} />
         )}

         {isAuthenticated && !isLocked && (
           <div className="flex min-h-screen bg-[#1A1A1A] text-white font-sans selection:bg-[#D4AF37] selection:text-black">
               
               {/* Sidebar */}
               <Sidebar activeView={activeView} onViewChange={handleViewChange} />

               {/* Main Content */}
               <main className="flex-1 ml-64 p-8 overflow-y-auto">
                   
                   {/* Header (Context sensitive) */}
                   <div className="mb-12 flex justify-between items-center">
                     <div className="flex-1"></div> {/* Spacer */}
                     <div className="flex items-center gap-4">
                        {/* Token Usage Indicator */}
                        {(activeView === 'input' || activeView === 'prompts') && (
                           <TokenUsage contextItems={conversation} />
                        )}

                        {activeView === 'input' && isSecondPassEnabled && (
                           <div className="inline-flex items-center gap-1 px-3 py-1 bg-purple-900/30 border border-purple-500/30 rounded-full animate-fade-in">
                           <Zap className="w-3 h-3 text-purple-400" />
                           <span className="text-xs text-purple-300 font-mono">Second Pass Enabled</span>
                           </div>
                       )}
                     </div>
                   </div>

                   {/* Views */}
                   {activeView === 'settings' && (
                       <SettingsView />
                   )}
                   
                   {activeView === 'prompts' && (
                       <PromptStudio />
                   )}

                   {activeView === 'history' && (
                       <HistoryView 
                           historyItems={historyItems}
                           onLoad={handleLoadSession}
                           onDelete={handleDeleteSession}
                       />
                   )}

      {activeView === 'input' && (
                    <div className="max-w-4xl mx-auto">
                        
                        {/* Logo on new project screen only */}
                        {stage === 'input' && (
                            <div className="flex flex-col items-center gap-6 mb-12 animate-fade-in">
                                <img 
                                src="/idea-refinery-logo.svg" 
                                alt="Idea Refinery Logo" 
                                className="w-64 h-64 object-contain drop-shadow-[0_0_35px_rgba(212,175,55,0.3)]"
                                />
                            </div>
                        )}

                        {stage === 'input' && (
                            <InputStage 
                                idea={idea} 
                                setIdea={setIdea} 
                                onNext={handleGenerateQuestions}
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
                                <Sparkles className="w-16 h-16 text-[#D4AF37] mb-6" />
                                <p className="text-xl text-gray-300 font-mono">{loadingMessage || 'Crafting your blueprint...'}</p>
                                {isSecondPassEnabled && loadingMessage.includes('Refining') && (
                                <div className="flex items-center gap-2 mt-4 text-purple-300">
                                    <Zap className="w-5 h-5" />
                                    <span className="text-sm font-mono">Second AI is reviewing...</span>
                                </div>
                                )}
                            </div>
                        )}

                        {stage === 'blueprint' && (
                            <Suspense fallback={<div className="text-center font-mono py-20">Loading Blueprint...</div>}>
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
                             <Suspense fallback={<div className="text-center font-mono py-20">Loading Visualization...</div>}>
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
                )}
            </main>
        </div>
      )}
      </>
    )}
    </>
  );
}

export default App;
