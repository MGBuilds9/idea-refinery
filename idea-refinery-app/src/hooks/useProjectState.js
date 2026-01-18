import { useState, useEffect } from 'react';
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
  const [historyItems, setHistoryItems] = useState([]);
  const [currentDbId, setCurrentDbId] = useState(null);
  
  // Data State
  const [idea, setIdea] = useState('');
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [blueprint, setBlueprint] = useState('');
  const [masterPrompt, setMasterPrompt] = useState('');
  const [htmlMockup, setHtmlMockup] = useState('');
  const [ideaSpec, setIdeaSpec] = useState(null);
  
  // Interaction State
  const [conversation, setConversation] = useState([]);
  const [chatHistory, setChatHistory] = useState([]); 
  const [refinementInput, setRefinementInput] = useState('');
  const [blueprintTab, setBlueprintTab] = useState('preview');
  const [selectedPersona, setSelectedPersona] = useState('balanced');
  const [publicBlueprintId, setPublicBlueprintId] = useState(null);
  const [initializing, setInitializing] = useState(true);

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
            ideaSpec,
            chatHistory,
            ...updates
        };
        const id = await saveConversation(fullData);
        setCurrentDbId(id);

        // Auto-sync to server if in server mode
        const syncMode = localStorage.getItem('sync_mode');
        const serverUrl = localStorage.getItem('server_url');
        if (syncMode === 'server' && serverUrl) {
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
    setLoadingMessage('Architect Agent: Structuring your idea...');
    
    try {
      const orchestrator = createOrchestrator();
      if (!orchestrator) throw new Error('Failed to initialize AI agent');

      // Run Architect + Critic + Gap Analysis
      const result = await orchestrator.refine(idea);
      
      setIdeaSpec(result.ideaSpec);
      
      if (result.needsInput) {
        // We have gaps, ask questions
        const generatedQuestions = generateGapQuestions(result.gaps);
        setQuestions(generatedQuestions);
        setAnswers(generatedQuestions.reduce((acc, _, i) => ({ ...acc, [i]: '' }), {}));
        
        await saveProgress({ 
          idea, 
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
          idea, 
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
  };

  const handleGenerateBlueprint = async () => {
    if (!checkApiKey()) return;
    setLoading(true);
    setLoadingMessage('Architect Agent: Updating spec with your answers...');
    setStage('generating');
    
    try {
      const orchestrator = createOrchestrator();
      
      // Convert answers array to QA pairs
      const qaPairs = questions.map((q, i) => ({
        question: q,
        answer: answers[i]
      }));

      // Fill gaps in the spec
      const updatedSpec = await orchestrator.fillGaps(ideaSpec, qaPairs);
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
    setLoadingMessage('Designer Agent: Creating high-fidelity mockup...');
    setStage('mockup');
    try {
      const orchestrator = createOrchestrator();
      
      let html = '';
      
      if (ideaSpec) {
        html = await orchestrator.generateMockup(ideaSpec);
      } else {
        const { system, prompt } = PromptService.get('mockup', { blueprint });
        const currentProvider = llm.getDefaultProvider();
        const model = llm.getModelForStage('mockup');
        html = await llm.generate(currentProvider, { system, prompt, model, maxTokens: 8000 });
      }
      
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

  const handleViewChange = (view) => {
      if (view === 'input' && activeView !== 'input') {
          // Switching back to project view, keep state
      } else if (view === 'input' && activeView === 'input') {
          if (confirm('Start a new project? Unsaved progress will be lost if not autosaved.')) {
            setIdea('');
            setQuestions([]);
            setAnswers({});
            setBlueprint('');
            setHtmlMockup('');
            setIdeaSpec(null);
            setCurrentDbId(null);
            setStage('input');
          } else {
              return; // Cancel switch
          }
      }
      
      if (view === 'history') {
          loadHistory();
      }

      setActiveView(view);
  };

  return {
    state: {
      activeView, setActiveView,
      stage, setStage,
      loading, setLoading,
      loadingMessage, setLoadingMessage,
      historyItems, setHistoryItems,
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
      refinementInput, setRefinementInput,
      blueprintTab, setBlueprintTab,
      selectedPersona, setSelectedPersona,
      publicBlueprintId, setPublicBlueprintId,
      initializing, setInitializing
    },
    actions: {
      loadHistory,
      handleLoadSession,
      handleDeleteSession,
      saveProgress,
      handleGenerateQuestions,
      handleGenerateBlueprint,
      handleRefineBlueprint,
      handleGenerateMockup,
      handleViewChange
    }
  };
}
