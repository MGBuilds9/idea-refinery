import { useState, useEffect, useCallback, useRef } from 'react';
import { llm } from '../lib/llm';
import { saveConversation, getRecentConversations, deleteConversation } from '../services/db';
import { SyncService } from '../services/SyncService';
import { PromptService } from '../services/PromptService';
import { createOrchestrator } from '../services/AgentOrchestrator';
import { ExportService } from '../services/ExportService';
import { compileToMarkdown, generateGapQuestions } from '../lib/IdeaSpec';

export function useProjectState() {
  // Navigation State
  const [activeView, setActiveView] = useState('input'); // 'input', 'history', 'settings', 'prompts'
  const [stage, setStage] = useState('input'); // Sub-stage for the 'input/project' flow

  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  
  // History State
  const HISTORY_BATCH_SIZE = 20;
  const [historyItems, setHistoryItems] = useState([]);
  const [hasMoreHistory, setHasMoreHistory] = useState(true);
  const [currentDbId, setCurrentDbId] = useState(null);
  
  // Data State
  const [idea, setIdea] = useState('');
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [blueprint, setBlueprint] = useState('');
  const [masterPrompt, setMasterPrompt] = useState('');
  const [htmlMockup, setHtmlMockup] = useState('');
  const [ideaSpec, setIdeaSpec] = useState(null);
  const [proposedSpec, setProposedSpec] = useState(null);
  
  // Interaction State
  const [conversation, setConversation] = useState([]);
  const [chatHistory, setChatHistory] = useState([]); 
  const [blueprintTab, setBlueprintTab] = useState('preview');
  const [selectedPersona, setSelectedPersona] = useState('balanced');
  const [publicBlueprintId, setPublicBlueprintId] = useState(null);
  const [initializing, setInitializing] = useState(true);
  const [, setIsExportModalOpen] = useState(false);

  // ⚡ Bolt Optimization: Refs to hold latest state for stable callbacks
  const activeViewRef = useRef(activeView);
  const stateRef = useRef({
    idea, questions, answers, blueprint, htmlMockup, masterPrompt, ideaSpec, chatHistory
  });

  useEffect(() => {
    activeViewRef.current = activeView;
    stateRef.current = {
      idea, questions, answers, blueprint, htmlMockup, masterPrompt, ideaSpec, chatHistory
    };
  }, [activeView, idea, questions, answers, blueprint, htmlMockup, masterPrompt, ideaSpec, chatHistory]);

  // Check for public share URL on mount
  useEffect(() => {
    const path = window.location.pathname;
    // Format: /public/:id
    if (path.startsWith('/public/')) {
        const id = path.split('/public/')[1];
        if (id) {
            setPublicBlueprintId(id);
            setInitializing(false); // If public blueprint, no need for other checks
            return;
        }
    }
    setInitializing(false); // If not public blueprint, proceed with normal initialization
  }, []);

  const loadHistory = useCallback(async () => {
    const items = await getRecentConversations(HISTORY_BATCH_SIZE, 0);
    setHistoryItems(items);
    setHasMoreHistory(items.length >= HISTORY_BATCH_SIZE);
  }, []);

  const handleLoadMore = useCallback(async () => {
    const currentCount = historyItems.length;
    const items = await getRecentConversations(HISTORY_BATCH_SIZE, currentCount);
    if (items.length > 0) {
        setHistoryItems(prev => [...prev, ...items]);
    }
    setHasMoreHistory(items.length >= HISTORY_BATCH_SIZE);
  }, [historyItems.length]);

  const handleLoadSession = useCallback((item, goToBlueprint = false) => {
    setIdea(item.idea);
    setQuestions(item.questions || []);
    setAnswers(item.answers || {});
    setBlueprint(item.blueprint || '');
    setMasterPrompt(item.masterPrompt || '');
    setHtmlMockup(item.htmlMockup || '');
    setIdeaSpec(item.ideaSpec || null);
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
  }, []);

  const handleDeleteSession = useCallback(async (id) => {
    // ⚡ Bolt Optimization: Optimistic update to avoid O(N) DB re-fetch
    setHistoryItems(prev => prev.filter(item => item.id !== id));
    await deleteConversation(id);
  }, []);

  // Save helper
  const saveProgress = useCallback(async (updates) => {
    try {
        const currentState = stateRef.current;

        // ⚡ Bolt Optimization: Use partial updates for DB when ID exists
        // This avoids re-serializing and re-writing heavy unchanged fields (like mockups/blueprints) to IndexedDB.
        let id;
        if (currentDbId) {
            id = await saveConversation({ id: currentDbId, ...updates });
        } else {
            const initialData = { ...currentState, ...updates };
            id = await saveConversation(initialData);
            setCurrentDbId(id);
        }

        // Construct full data for Sync and Optimistic UI updates
        const fullData = {
            id,
            ...currentState,
            ...updates
        };

        // Auto-sync to server if in server mode
        const syncMode = localStorage.getItem('sync_mode');
        const serverUrl = localStorage.getItem('server_url');
        if (syncMode === 'server' && serverUrl) {
           SyncService.push(serverUrl, fullData).catch(console.error);
        }
        
        // ⚡ Bolt Optimization: Manually update history state instead of re-fetching all items from DB.
        // This avoids O(N) DB read and heavy React reconciliation on every save.
        setHistoryItems(prev => {
            const now = Date.now();
            // Use existing timestamp if present (maintain creation time), but update lastUpdated
            const newItem = {
                ...fullData,
                lastUpdated: now,
                timestamp: fullData.timestamp || now
            };

            // Remove existing item with same id (if any)
            const others = prev.filter(item => item.id !== id);

            // Add new item to top (since we sort by lastUpdated desc)
            return [newItem, ...others];
        });

    } catch (e) {
        console.error('Failed to auto-save:', e);
    }
  }, [currentDbId]);

  // Helper to ensure API key exists
  const checkApiKey = useCallback((p) => {
    const provider = p || llm.getDefaultProvider();
    if (!llm.getApiKey(provider)) {
      setActiveView('settings');
      alert(`Please enter your ${provider} API key in Settings to continue.`);
      return false;
    }
    return true;
  }, []);

  const handleGenerateQuestions = useCallback(async (ideaOverride) => {
    if (!checkApiKey()) return;
    setLoading(true);
    setLoadingMessage('Architect Agent: Structuring your idea...');
    
    // Use override if provided (e.g. from InputStage local state), otherwise use state
    const currentIdea = typeof ideaOverride === 'string' ? ideaOverride : stateRef.current.idea;

    try {
      const provider = llm.getDefaultProvider();
      const apiKey = llm.getApiKey(provider);
      
      const orchestrator = createOrchestrator({ provider, apiKey });
      if (!orchestrator) throw new Error('Failed to initialize AI agent (Missing credentials)');

      // Run Architect + Critic + Gap Analysis
      const result = await orchestrator.refine(currentIdea);
      
      setIdeaSpec(result.ideaSpec);
      
      if (result.needsInput) {
        // We have gaps, ask questions
        const generatedQuestions = generateGapQuestions(result.gaps);
        setQuestions(generatedQuestions);
        setAnswers(generatedQuestions.reduce((acc, _, i) => ({ ...acc, [i]: '' }), {}));
        
        await saveProgress({ 
          idea: currentIdea,
          questions: generatedQuestions,
          ideaSpec: result.ideaSpec 
        });
        
        setStage('questions');
      } else {
        // No gaps, go straight to blueprint
        const markdown = compileToMarkdown(result.ideaSpec);
        setBlueprint(markdown);
        setMasterPrompt(''); // v1.5 prompt is generated on export, not here
        
        await saveProgress({ 
          idea: currentIdea,
          questions: [],
          ideaSpec: result.ideaSpec,
          blueprint: markdown
        });
        
        setStage('blueprint');
      }

    } catch (e) {
      console.error(e);
      alert(`Error: ${e.message}`);
    } finally {
      setLoading(false);
      setLoadingMessage('');
    }
  }, [checkApiKey, saveProgress]);

  const handleGenerateBlueprint = useCallback(async (answersOverride) => {
    if (!checkApiKey()) return;
    setLoading(true);
    setLoadingMessage('Architect Agent: Updating spec with your answers...');
    setStage('generating');
    
    try {
      const provider = llm.getDefaultProvider();
      const apiKey = llm.getApiKey(provider);
      const orchestrator = createOrchestrator({ provider, apiKey });
      
      const { questions: currQuestions, answers: stashedAnswers, ideaSpec: currIdeaSpec } = stateRef.current;
      // ⚡ Bolt Optimization: Use override if provided (e.g. from QuestionsStage local state) to ensure latest data
      const currAnswers = answersOverride || stashedAnswers;

      // Convert answers array to QA pairs
      const qaPairs = currQuestions.map((q, i) => ({
        question: q,
        answer: currAnswers[i]
      }));

      // Fill gaps in the spec
      const updatedSpec = await orchestrator.fillGaps(currIdeaSpec, qaPairs);
      setIdeaSpec(updatedSpec);

      // Compile to Markdown
      const markdown = compileToMarkdown(updatedSpec);
      setBlueprint(markdown);
      
      // v1.5: We don't generate the "Master Prompt" string here anymore (for display/edit only).
      const promptPreview = ExportService.toPromptMd(updatedSpec, markdown);
      setMasterPrompt(promptPreview);

      setConversation([{
        role: 'assistant', 
        content: markdown, 
        type: 'blueprint'
      }]);

      await saveProgress({ 
         ideaSpec: updatedSpec,
         blueprint: markdown, 
         masterPrompt: promptPreview,
         answers: currAnswers
      });

      setStage('blueprint');
    } catch (e) {
      alert(`Error: ${e.message}`);
      setStage('questions');
    } finally {
      setLoading(false);
      setLoadingMessage('');
    }
  }, [checkApiKey, saveProgress]);

  const handleRefineBlueprint = useCallback(async (inputContent) => {
    if (!inputContent?.trim()) return;
    if (!checkApiKey()) return;
    
    const userMsg = { role: 'user', content: inputContent };
    setConversation(prev => [...prev, userMsg]);
    setLoading(true);
    setLoadingMessage('Refining blueprint...');

    try {
      const { ideaSpec: currIdeaSpec, blueprint: currBlueprint, chatHistory: currChatHistory } = stateRef.current;

      // If we have an IdeaSpec, use the Relational Refinement (v1.5)
      if (currIdeaSpec) {
        const serverUrl = localStorage.getItem('server_url') || 
          (window.location.hostname === 'localhost' ? 'http://localhost:3001' : window.location.origin);
        
        const res = await fetch(`${serverUrl}/api/refine`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
          },
          body: JSON.stringify({
            idea: `CURRENT SPEC: ${JSON.stringify(currIdeaSpec)}\n\nUSER REQUEST: ${inputContent}`,
            provider: llm.getDefaultProvider(),
            apiKey: llm.getApiKey(llm.getDefaultProvider()),
            model: llm.getModelForStage('refinement')
          })
        });

        const data = await res.json();
        if (data.error) throw new Error(data.error);

        // Show the diff
        setProposedSpec(data.spec);
        
        const assistantMsg = {
          role: 'assistant',
          content: 'I have proposed some refinements based on your request. Please review the diff.',
          type: 'proposal',
          timestamp: Date.now()
        };
        setConversation(prev => [...prev, assistantMsg]);
      } else {
        // Legacy refinement
        const { system } = PromptService.get('refine', { refinementInput: inputContent });
        const prompt = `CURRENT BLUEPRINT:\n${currBlueprint}\n\nUSER REQUEST: ${inputContent}`;
        const model = llm.getModelForStage('refinement');

        const currentProvider = llm.getDefaultProvider();
        const responseText = await llm.generate(currentProvider, {
            system, 
            prompt,
            model,
            maxTokens: 8000,
            history: currChatHistory
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
        const newChatHistory = [...currChatHistory, { ...userMsg, timestamp: Date.now() - 1000 }, assistantMsg];
        setChatHistory(newChatHistory);

        await saveProgress({ 
           blueprint: responseText, 
           masterPrompt: sections[1] ? sections[1].trim() : '',
           chatHistory: newChatHistory
        });
      }

    } catch (e) {
      setConversation(prev => [...prev, { role: 'assistant', content: `Error: ${e.message}`, type: 'error' }]);
    } finally {
      setLoading(false);
      setLoadingMessage('');
    }
  }, [checkApiKey, saveProgress]);

  const handleAcceptRefinement = useCallback(async () => {
    if (!proposedSpec) return;
    const newMarkdown = compileToMarkdown(proposedSpec);
    setIdeaSpec(proposedSpec);
    setBlueprint(newMarkdown);
    setProposedSpec(null);
    await saveProgress({ ideaSpec: proposedSpec, blueprint: newMarkdown });
  }, [proposedSpec, saveProgress]);

  const handleRejectRefinement = useCallback(() => {
    setProposedSpec(null);
  }, []);

  const handleExportPackage = useCallback(async (options) => {
    if (!ideaSpec) return;
    
    // v1.5: Always download as a single ZIP package based on selected options
    ExportService.downloadZip(ideaSpec, blueprint, htmlMockup, options);
  }, [ideaSpec, blueprint, htmlMockup]);

  const handleGenerateMockup = useCallback(async () => {
    if (!checkApiKey()) return;
    setLoading(true);
    setLoadingMessage('Designer Agent: Creating high-fidelity mockup...');
    setStage('mockup');
    try {
      const provider = llm.getDefaultProvider();
      const apiKey = llm.getApiKey(provider);
      const orchestrator = createOrchestrator({ provider, apiKey });
      
      let html = '';
      const { ideaSpec: currIdeaSpec, blueprint: currBlueprint } = stateRef.current;
      
      if (currIdeaSpec) {
        html = await orchestrator.generateMockup(currIdeaSpec);
      } else {
        const { system, prompt } = PromptService.get('mockup', { blueprint: currBlueprint });
        const currentProvider = llm.getDefaultProvider();
        const model = llm.getModelForStage('mockup');
        html = await llm.generate(currentProvider, { system, prompt, model, maxTokens: 8000 });
      }
      
      html = html.replace(/```html\n?/g, '').replace(/```\n?/g, '').trim();
      
      if (!html.includes('id="markdown-content"')) {
         const insertPoint = html.lastIndexOf('</body>');
         if (insertPoint !== -1) {
            const extra = `
     <div style="display:none;"><pre id="markdown-content">${currBlueprint.replace(/</g, '&lt;')}</pre></div>
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
  }, [checkApiKey, saveProgress]);

  const handleViewChange = useCallback((view) => {
      const currentActiveView = activeViewRef.current;

      if (view === 'input' && currentActiveView !== 'input') {
          // Switching back to project view, keep state
      } else if (view === 'input' && currentActiveView === 'input') {
          if (confirm('Start a new project? Unsaved progress will be lost if not autosaved.')) {
            setIdea('');
            setQuestions([]);
            setAnswers({});
            setBlueprint('');
            setHtmlMockup('');
            setIdeaSpec(null);
            setCurrentDbId(null);
            setStage('input');
            // setRefinementInput(''); // Removed
          } else {
              return; // Cancel switch
          }
      }
      
      if (view === 'history') {
          loadHistory();
      }

      setActiveView(view);
  }, [loadHistory]);

  return {
    state: {
      activeView, setActiveView,
      stage, setStage,
      loading, setLoading,
      loadingMessage, setLoadingMessage,
      historyItems, setHistoryItems,
      hasMoreHistory,
      currentDbId, setCurrentDbId,
      idea, setIdea,
      questions, setQuestions,
      answers, setAnswers,
      blueprint, setBlueprint,
      masterPrompt, setMasterPrompt,
      htmlMockup, setHtmlMockup,
      ideaSpec, setIdeaSpec,
      conversation, setConversation,
      chatHistory, setChatHistory,
      blueprintTab, setBlueprintTab,
      selectedPersona, setSelectedPersona,
      publicBlueprintId, setPublicBlueprintId,
      initializing, setInitializing
    },
    actions: {
      loadHistory,
      handleLoadMore,
      handleLoadSession,
      handleDeleteSession,
      saveProgress,
      handleGenerateQuestions,
      handleGenerateBlueprint,
      handleRefineBlueprint,
      handleAcceptRefinement,
      handleRejectRefinement,
      setProposedSpec,
      setIsExportModalOpen,
      handleExportPackage,
      handleGenerateMockup,
      handleViewChange
    }
  };
}
