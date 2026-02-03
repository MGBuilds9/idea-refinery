import React, { useState, useEffect, Suspense, useCallback } from 'react';
import { Sparkles, Zap } from 'lucide-react';
import Sidebar from './components/Sidebar';
import BottomNav from './components/BottomNav';
import InputStage from './components/InputStage';
import QuestionsStage from './components/QuestionsStage';
import PinLockScreen from './components/PinLockScreen';
import LoginScreen from './components/LoginScreen';
import TokenUsage from './components/TokenUsage';
import { PROMPT_PERSONAS } from './components/PromptSelector';
import { ThemeProvider } from './contexts/ThemeContext';

// Lazy load heavy stages and views
const BlueprintStage = React.lazy(() => import('./components/BlueprintStage'));
const MockupStage = React.lazy(() => import('./components/MockupStage'));
const SettingsView = React.lazy(() => import('./components/SettingsView'));
const HistoryView = React.lazy(() => import('./components/HistoryView'));
const PromptStudio = React.lazy(() => import('./components/PromptStudio'));
const OnboardingView = React.lazy(() => import('./components/OnboardingView'));
const PublicBlueprintView = React.lazy(() => import('./components/PublicBlueprintView'));
import { llm } from './lib/llm';
import { cleanupOldConversations, pullItems } from './services/db';
import { PromptService } from './services/PromptService';
import { useProjectState } from './hooks/useProjectState';

function App() {
  // Feature flag or derived state
  const isSecondPassEnabled = false;

  const { state: projectState, actions: projectActions } = useProjectState();
  const {
    activeView, stage, setStage, loading, loadingMessage,
    historyItems, hasMoreHistory, idea, setIdea, questions, answers, setAnswers,
    blueprint, masterPrompt, htmlMockup, ideaSpec, conversation,
    chatHistory, blueprintTab, setBlueprintTab,
    selectedPersona, setSelectedPersona, publicBlueprintId, initializing
  } = projectState;

  const {
    loadHistory, handleLoadMore, handleLoadSession, handleDeleteSession, handleGenerateQuestions,
    handleGenerateBlueprint, handleRefineBlueprint, handleGenerateMockup, handleViewChange
  } = projectActions;

  // Security & Onboarding State
  const [isOnboarding, setIsOnboarding] = useState(!localStorage.getItem('onboarding_complete'));
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('auth_token'));
  const [isLocked, setIsLocked] = useState(true);
  const [checkingLock, setCheckingLock] = useState(true);
  const [forcingPinSetup, setForcingPinSetup] = useState(false);
  // Track if we just unlocked to prevent re-locking
  const [sessionUnlocked, setSessionUnlocked] = useState(false);
  // eslint-disable-next-line no-unused-vars
  const [activePin, setActivePin] = useState(null);

  // DB Checks and PIN Lock
  useEffect(() => {
    if (publicBlueprintId) return; // Skip if public blueprint is active

    const checkPinLock = async () => {
      try {
        // If session was already unlocked this session, don't re-lock
        if (sessionUnlocked) {
          setIsLocked(false);
          setCheckingLock(false);
          return;
        }

        // v1.2: Check local storage for PIN first
        const { SecureStorage } = await import('./services/secure_storage');
        const isPinSet = await SecureStorage.isPinSet();

        if (isPinSet) {
          setIsLocked(true);
        } else {
          // STRICT SECURITY: If no PIN is set, we MUST force setup.
          // Unless we are in onboarding (handled separately).
          console.warn('Security Alert: No PIN set. Forcing setup.');
          setForcingPinSetup(true);
          setIsLocked(true); // Technically locked until setup is done
        }
      } catch (e) {
        console.error('Error checking PIN lock:', e);
        // Fail secure
        setIsLocked(true);
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
  }, [isOnboarding, publicBlueprintId, sessionUnlocked, loadHistory]);

  const handleUnlock = async (pin) => {
    // Verify PIN against secure storage
    const { SecureStorage } = await import('./services/secure_storage');
    const isValid = await SecureStorage.verifyPin(pin);

    // Legacy fallback check (can be removed if we are sure everyone migrated, but safer to keep for a bit)
    // Actually SecureStorage.verifyPin handles the legacy hash check too.
    
    if (!isValid) {
      alert('Incorrect PIN');
      return;
    }

    setActivePin(pin);
    // Load encrypted API keys and set active PIN on llm service
    await llm.loadEncryptedKeys(pin);
    llm.setActivePin(pin);

    // Trigger Sync Pull
    const serverUrl = localStorage.getItem('server_url') || import.meta.env.VITE_API_URL ||
      (window.location.hostname === 'localhost' ? 'http://localhost:3001' : window.location.origin);
    pullItems(serverUrl).catch(console.error);

    // Initialize Prompt Service (load overrides)
    PromptService.init().catch(console.error);

    // Mark session as unlocked to prevent re-locking
    setSessionUnlocked(true);
    setIsLocked(false);

    loadHistory();
  };
  
  const handlePinSetupSuccess = async (newPin) => {
      // PinLockScreen already calls SecureStorage.setPin
      setForcingPinSetup(false);
      
      // Auto-unlock with the new PIN
      setActivePin(newPin);
      llm.setActivePin(newPin);
      
      // Attempt to migrate any lingering plaintext keys now that we have a PIN
      await llm.checkAndMigrateLegacyKeys(newPin);
      
      setSessionUnlocked(true);
      setIsLocked(false);
  };

  const handleOnboardingComplete = () => {
    setIsOnboarding(false);
    // Onboarding saves 'onboarding_complete', 'app_pin', and 'auth_token' to localStorage
    // Mark session as unlocked so useEffect won't re-lock
    setSessionUnlocked(true);
    setIsAuthenticated(true); // Onboarding already authenticated us
    setIsLocked(false);
    loadHistory();
  };

  const handleLogin = (token) => {
    localStorage.setItem('auth_token', token);
    setIsAuthenticated(true);
  };

  const handleStartOver = useCallback(() => setStage('input'), [setStage]);

  return (
    <ThemeProvider>
      <>
        {initializing && (
          <div className="min-h-screen bg-[var(--color-background)] flex items-center justify-center">
            <div className="text-center">
              <Sparkles className="w-12 h-12 text-[var(--color-primary)] mb-4 animate-pulse-slow mx-auto" />
              <p className="text-[var(--color-text-muted)] font-[var(--font-body)] text-sm">Refining Idea Space...</p>
            </div>
          </div>
        )}

        {!initializing && publicBlueprintId && (
          <Suspense fallback={<div className="min-h-screen bg-[var(--color-background)] flex items-center justify-center text-[var(--color-text-muted)]">Loading Blueprint...</div>}>
            <PublicBlueprintView blueprintId={publicBlueprintId} />
          </Suspense>
        )}

        {!initializing && !publicBlueprintId && checkingLock && (
          <div className="min-h-screen bg-[var(--color-background)] flex items-center justify-center">
            <div className="flex flex-col items-center">
              <Sparkles className="w-8 h-8 text-[var(--color-primary)] animate-pulse mb-4" />
              <p className="text-[var(--color-text-muted)] font-[var(--font-body)] text-xs">INITIALIZING REFINERY...</p>
            </div>
          </div>
        )}

        {!initializing && !publicBlueprintId && !checkingLock && isOnboarding && (
          <Suspense fallback={<div className="min-h-screen bg-[var(--color-background)] flex items-center justify-center text-[var(--color-text-muted)]">Loading Onboarding...</div>}>
            <OnboardingView onComplete={handleOnboardingComplete} />
          </Suspense>
        )}

        {/* Main App Flow (Only if not onboarding or public blueprint) */}
        {/* Auth priority: PIN first for returning users, login only if JWT missing/expired */}
        {!initializing && !publicBlueprintId && !checkingLock && !isOnboarding && (
          <>
            {/* Show Mandatory PIN Setup if needed */}
            {forcingPinSetup && (
                 <PinLockScreen isSetup={true} onSuccess={handlePinSetupSuccess} />
            )}
          
            {/* Show PIN lock first if user has a PIN set and not doing setup */}
            {!forcingPinSetup && isAuthenticated && isLocked && (
              <PinLockScreen onSuccess={handleUnlock} />
            )}

            {/* Only show login screen if no valid JWT (expired or logged out) */}
            {!isAuthenticated && !isLocked && (
              <LoginScreen onLogin={handleLogin} />
            )}

            {/* Edge case: no JWT but needs to set PIN first - redirect to login */}
            {!isAuthenticated && isLocked && (
              <LoginScreen onLogin={handleLogin} />
            )}

            {isAuthenticated && !isLocked && (
              <div className="flex min-h-screen bg-[var(--color-background)] text-[var(--color-text)] font-[var(--font-body)] selection:bg-[var(--color-primary)]/20 selection:text-[var(--color-text)]">


                {/* Sidebar */}

                <Sidebar activeView={activeView} onViewChange={handleViewChange} />
                <BottomNav activeView={activeView} onViewChange={handleViewChange} />

                {/* Main Content */}
                <main className="flex-1 md:ml-64 ml-0 p-4 pt-[max(1.5rem,env(safe-area-inset-top))] md:p-8 lg:p-12 overflow-y-auto relative pb-24 md:pb-12">

                  {/* Header (Context sensitive) - Hidden on mobile when not needed */}
                  <div className="mb-2 md:mb-12 flex justify-between items-center">
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
                    <Suspense fallback={<div className="text-center font-mono py-20 text-[var(--color-text-muted)]">Loading Settings...</div>}>
                      <SettingsView />
                    </Suspense>
                  )}

                  {activeView === 'prompts' && (
                    <Suspense fallback={<div className="text-center font-mono py-20 text-[var(--color-text-muted)]">Loading Studio...</div>}>
                      <PromptStudio />
                    </Suspense>
                  )}

                  {activeView === 'history' && (
                    <Suspense fallback={<div className="text-center font-mono py-20 text-[var(--color-text-muted)]">Loading History...</div>}>
                      <HistoryView
                        historyItems={historyItems}
                        hasMore={hasMoreHistory}
                        onLoad={handleLoadSession}
                        onDelete={handleDeleteSession}
                        onLoadMore={handleLoadMore}
                      />
                    </Suspense>
                  )}

                  {activeView === 'input' && (
                    <div className="max-w-4xl mx-auto">

                      {/* Logo on new project screen only */}


                      {stage === 'input' && (
                        <InputStage
                          idea={idea}
                          setIdea={setIdea}
                          onNext={handleGenerateQuestions}
                          selectedPersona={selectedPersona}
                          setSelectedPersona={setSelectedPersona}
                          loading={loading}
                        />
                      )}

                      {stage === 'questions' && (
                        <QuestionsStage
                          questions={questions}
                          answers={answers}
                          setAnswers={setAnswers}
                          onNext={handleGenerateBlueprint}
                          onBack={handleStartOver}
                          loading={loading}
                        />
                      )}

                      {stage === 'generating' && (
                        <div className="flex flex-col items-center justify-center py-20 animate-pulse">
                          <Sparkles className="w-16 h-16 text-[var(--color-primary)] mb-6" />
                          <p className="text-xl text-[var(--color-text)] font-[var(--font-body)]">{loadingMessage || 'Crafting your blueprint...'}</p>
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
                            onStartOver={handleStartOver}
                            loading={loading}
                            currentTab={blueprintTab}
                            setTab={setBlueprintTab}
                            chatHistory={chatHistory}
                            ideaSpec={ideaSpec}
                            proposedSpec={projectState.proposedSpec}
                            onAcceptRefinement={projectActions.handleAcceptRefinement}
                            onRejectRefinement={projectActions.handleRejectRefinement}
                            isExportModalOpen={projectState.isExportModalOpen}
                            setIsExportModalOpen={projectActions.setIsExportModalOpen}
                            onExportPackage={projectActions.handleExportPackage}
                            onSave={projectActions.saveProgress}
                          />
                        </Suspense>
                      )}

                      {stage === 'mockup' && (
                        <Suspense fallback={<div className="text-center font-mono py-20">Loading Visualization...</div>}>
                          <MockupStage
                            masterPrompt={masterPrompt}
                            htmlMockup={htmlMockup}
                            loading={loading}
                            onStartOver={handleStartOver}
                            ideaSpec={ideaSpec}
                            blueprint={blueprint}
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
    </ThemeProvider>
  );
}

export default App;
