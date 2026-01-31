import React, { useState } from 'react';
import { Save, Eye, EyeOff, Zap, Bot, Settings2, Lock, Server, LogIn, LogOut, Download, Database, CloudOff, Palette } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { llm, AVAILABLE_MODELS } from '../lib/llm';
import { saveSetting, exportAllData } from '../services/db';
import { SecureStorage } from '../services/secure_storage';
import { AuthService } from '../services/AuthService';

// Get initial settings outside component to avoid recalculation
const getInitialSettings = () => {
  const settings = llm.getSettings();
  return {
    keys: {
      anthropic: llm.getApiKey('anthropic') || '',
      openai: llm.getApiKey('openai') || '',
      gemini: llm.getApiKey('gemini') || ''
    },
    provider: llm.getDefaultProvider(),
    enableSecondPass: settings.enableSecondPass,
    secondPassProvider: settings.secondPassProvider,
    secondPassModel: settings.secondPassModel,
    stageModels: settings.stageModels
  };
};

export default function SettingsView() {
  const [activeTab, setActiveTab] = useState('keys'); // keys, models, secondpass

  // Initialize all state from stored settings
  const initialSettings = getInitialSettings();

  // API Keys state
  const [keys, setKeys] = useState(initialSettings.keys);
  const [showKeys, setShowKeys] = useState({
    anthropic: false,
    openai: false,
    gemini: false
  });
  const [provider, setProvider] = useState(initialSettings.provider);

  // Second Pass state
  const [enableSecondPass, setEnableSecondPass] = useState(initialSettings.enableSecondPass);
  const [secondPassProvider, setSecondPassProvider] = useState(initialSettings.secondPassProvider);
  const [secondPassModel, setSecondPassModel] = useState(initialSettings.secondPassModel);

  // Stage models state
  const [stageModels, setStageModels] = useState(initialSettings.stageModels);

  // Security state
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [pinSuccess, setPinSuccess] = useState('');

  // Server Auth state
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');

  // Feedback state
  const [saveStatus, setSaveStatus] = useState('');

  // Server/Sync state
  const [serverUrl, setServerUrl] = useState(AuthService.getServerUrl());
  const [isAuthenticated, setIsAuthenticated] = useState(AuthService.isAuthenticated());
  const [username, setUsername] = useState(AuthService.getUsername() || '');
  const [serverUsername, setServerUsername] = useState('');
  const [serverPassword, setServerPassword] = useState('');
  const [serverError, setServerError] = useState('');
  const [serverSuccess, setServerSuccess] = useState('');

  const handleSave = async () => {
    setSaveStatus('Saving...');
    try {
      await llm.setApiKeys({
        anthropic: keys.anthropic,
        openai: keys.openai,
        gemini: keys.gemini
      });

      llm.setDefaultProvider(provider);

      llm.updateSettings({
        enableSecondPass,
        secondPassProvider,
        secondPassModel,
        stageModels
      });

      localStorage.setItem('server_url', serverUrl);

      setSaveStatus('Settings Saved!');
      setTimeout(() => setSaveStatus(''), 2000);
    } catch (e) {
      setSaveStatus('Error saving!');
      console.error(e);
    }
  };

  const toggleShow = (p) => {
    setShowKeys(prev => ({ ...prev, [p]: !prev[p] }));
  };

  const getModelsForProvider = (p) => {
    return AVAILABLE_MODELS[p] || [];
  };

  const { currentTheme, setTheme, themes } = useTheme();

  const tabs = [
    { id: 'keys', label: 'API Keys', icon: Settings2 },
    { id: 'aiconfig', label: 'AI Configuration', icon: Bot },
    { id: 'appearance', label: 'Appearance', icon: Palette },
    { id: 'syncdata', label: 'Sync & Data', icon: Database },
    { id: 'security', label: 'Security', icon: Lock }
  ];

  // Secure Resend Key Load
  const [resendKey, setResendKey] = useState('');
  
  // Load Resend key securely on mount (if PIN active)
  React.useEffect(() => {
    async function loadResendKey() {
      if (llm.activePin) {
        const key = await SecureStorage.getItem('resend_api_key', llm.activePin);
        if (key) setResendKey(key);
      }
    }
    loadResendKey();
  }, []);

  const handleSavePin = async () => {
    setPinError('');
    setPinSuccess('');

    if (newPin.length < 4) {
      setPinError('PIN must be at least 4 digits');
      return;
    }
    if (newPin !== confirmPin) {
      setPinError('PINs do not match');
      return;
    }

    try {
      const isConfigured = await SecureStorage.isPinSet();
      
      if (isConfigured) {
         // Change PIN Flow: Needs Old PIN (assumed activePin is valid since they are here)
         // But "activePin" might not be set if they just refreshed. 
         // Ideally we should ask for "Old PIN" input if one is set.
         // For simplicity, we'll assume they unlocked the app to get here, so `llm.activePin` is valid.
         
         if (!llm.activePin) {
             setPinError('Please unlock the app properly first.');
             return;
         }
         
         // 1. Decrypt everything with old PIN
         const oldApiKeys = await SecureStorage.getItem('api_keys', llm.activePin);
         const oldResendKey = await SecureStorage.getItem('resend_api_key', llm.activePin);
         
         // 2. Set new PIN
         await SecureStorage.setPin(newPin);
         
         // 3. Re-encrypt with new PIN
         if (oldApiKeys) await SecureStorage.setItem('api_keys', oldApiKeys, newPin);
         if (oldResendKey) await SecureStorage.setItem('resend_api_key', oldResendKey, newPin);
         
         // 4. Update session
         llm.setActivePin(newPin);
         setPinSuccess('PIN changed and data re-encrypted successfully!');
      } else {
          // Fresh Setup Flow
          await SecureStorage.setPin(newPin);
          
          // Re-encrypt keys with new PIN if they exist in memory
          llm.setActivePin(newPin);
          
          // If we have keys in memory, save them now
          if (keys.anthropic || keys.openai || keys.gemini) {
             await llm.saveEncryptedKeys(newPin);
          }
          
          setPinSuccess('PIN set successfully! API keys are now encrypted.');
      }

      setNewPin('');
      setConfirmPin('');
    } catch (e) {
      console.error(e);
      setPinError('Failed to save PIN');
    }
  };

  const handleRemovePin = async () => {
    if (!confirm('WARNING: Removing the PIN will DELETE your encrypted keys to prevent lockout. Are you sure?')) {
        return;
    }
    try {
      await SecureStorage.removePin();
      // We must clear secure storage because we can't decrypt it anymore without PIN
      SecureStorage.clearAll();
      llm.activePin = null;
      setPinSuccess('PIN removed. Secure vault cleared.');
    } catch (e) {
      console.error(e);
      setPinError('Failed to remove PIN');
    }
  };

  const handleChangePassword = async () => {
    setPasswordError('');
    setPasswordSuccess('');

    if (newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match');
      return;
    }

    try {
      await AuthService.changePassword(serverUrl, newPassword);
      setPasswordSuccess('Password changed successfully');
      setNewPassword('');
      setConfirmPassword('');
    } catch (e) {
      console.error(e);
      setPasswordError(e.message || 'Error changing password');
    }
  };

  const handleServerLogin = async () => {
    setServerError('');
    setServerSuccess('');

    if (!serverUrl) {
      setServerError('Please enter server URL');
      return;
    }
    if (!serverUsername || !serverPassword) {
      setServerError('Please enter username and password');
      return;
    }

    try {
      await AuthService.login(serverUrl, serverUsername, serverPassword);
      setIsAuthenticated(true);
      setUsername(serverUsername);
      setServerSuccess('Logged in successfully!');
      setServerPassword('');
    } catch (e) {
      console.error(e);
      setServerError(e.message || 'Login failed');
    }
  };

  const handleServerLogout = () => {
    AuthService.logout();
    setIsAuthenticated(false);
    setUsername('');
    setServerSuccess('Logged out successfully');
  };

  return (
    <div className="max-w-4xl mx-auto animate-fade-in">
      <div className="mb-4 md:mb-10">
        <h2 className="text-2xl md:text-4xl font-heading text-[var(--color-text)] mb-2 md:mb-3">Settings</h2>
        <p className="text-[var(--color-text-muted)] text-sm md:text-base">Manage API keys, AI configuration, and data sync.</p>
      </div>

      <div className="flex flex-col md:flex-row gap-6 md:gap-8 relative">
        {/* Sidebar Nav (Desktop) / Horizontal Tabs (Mobile) */}
        <div className="w-full md:w-56 flex md:flex-col overflow-x-auto pb-2 md:pb-0 gap-2 hide-scrollbar shrink-0 snap-x">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`snap-start whitespace-nowrap md:w-full flex items-center gap-2 md:gap-3 px-4 py-2 md:py-3 rounded-lg transition-all duration-200 text-sm md:text-left relative overflow-hidden shrink-0 border font-semibold cursor-pointer ${activeTab === tab.id
                ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)] shadow-md'
                : 'bg-white text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-gray-50 border-[var(--color-border)]'
                }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 bg-[var(--color-background)] rounded-xl p-4 pt-4 md:p-8 md:pt-6 min-h-[400px] md:min-h-[500px] relative transition-all duration-300">

          {/* API Keys Tab */}
          {activeTab === 'keys' && (
            <div className="space-y-6 animate-fade-in">
              <div>
                <label className="block text-sm font-semibold text-[var(--color-text)] mb-2">
                  Default Provider
                </label>
                <select
                  value={provider}
                  onChange={(e) => setProvider(e.target.value)}
                  className="input w-full"
                >
                  <option value="anthropic">Anthropic (Claude)</option>
                  <option value="openai">OpenAI (GPT-4o)</option>
                  <option value="gemini">Google Gemini</option>
                </select>
              </div>

              <div className="h-px bg-[var(--color-border)] my-8" />

              {['anthropic', 'openai', 'gemini'].map(p => (
                <div key={p}>
                  <label className="block text-sm font-semibold text-[var(--color-text)] mb-2 capitalize">
                    {p} API Key
                  </label>
                  <div className="relative group">
                    <input
                      type={showKeys[p] ? "text" : "password"}
                      value={keys[p]}
                      onChange={(e) => setKeys({ ...keys, [p]: e.target.value })}
                      placeholder={`sk-...`}
                      className="input w-full pr-12"
                    />
                    <button
                      onClick={() => toggleShow(p)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-colors rounded-full hover:bg-blue-50 cursor-pointer"
                    >
                      {showKeys[p] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Appearance Tab */}
          {activeTab === 'appearance' && (
            <div className="space-y-6 animate-fade-in">
              <div className="p-6 bg-white rounded-xl border border-[var(--color-border)] shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <Palette className="w-5 h-5 text-[var(--color-primary)]" />
                  <p className="text-[var(--color-text)] font-semibold font-heading">Choose Your Theme</p>
                </div>
                <p className="text-sm text-[var(--color-text-muted)] mb-6">
                  Select a color scheme that matches your style. Changes apply instantly.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.values(themes).map((theme) => (
                    <button
                      key={theme.id}
                      onClick={() => setTheme(theme.id)}
                      className={`p-4 rounded-xl border-2 transition-all duration-200 text-left ${currentTheme === theme.id
                          ? 'border-[var(--color-primary)] bg-blue-50 shadow-md'
                          : 'border-[var(--color-border)] hover:border-[var(--color-primary)]/50 hover:shadow-sm'
                        }`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="font-semibold text-[var(--color-text)] font-heading">{theme.name}</h3>
                          <p className="text-xs text-[var(--color-text-muted)] mt-1">{theme.description}</p>
                        </div>
                        {currentTheme === theme.id && (
                          <div className="w-5 h-5 rounded-full bg-[var(--color-primary)] flex items-center justify-center">
                            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2">
                        <div
                          className="w-8 h-8 rounded-lg border border-gray-200 shadow-sm"
                          style={{ backgroundColor: theme.colors.primary }}
                          title="Primary"
                        />
                        <div
                          className="w-8 h-8 rounded-lg border border-gray-200 shadow-sm"
                          style={{ backgroundColor: theme.colors.secondary }}
                          title="Secondary"
                        />
                        <div
                          className="w-8 h-8 rounded-lg border border-gray-200 shadow-sm"
                          style={{ backgroundColor: theme.colors.cta }}
                          title="CTA"
                        />
                        <div
                          className="w-8 h-8 rounded-lg border border-gray-200 shadow-sm"
                          style={{ backgroundColor: theme.colors.background }}
                          title="Background"
                        />
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-[var(--color-text-muted)] leading-relaxed">
                  💡 <strong>Tip:</strong> Your theme preference is saved automatically and will persist across sessions.
                </p>
              </div>
            </div>
          )}

          {/* AI Configuration Tab (Combined Models + Second Pass) */}
          {activeTab === 'aiconfig' && (
            <div className="space-y-6 animate-fade-in">
              {/* Stage Models Configuration */}
              <div className="bg-orange-50 border border-orange-200 p-4 rounded-xl">
                <p className="text-sm text-[var(--color-text)] leading-relaxed">
                  <strong>Advanced:</strong> Override default models for specific stages in the pipeline.
                </p>
              </div>

              {[
                { key: 'questions', label: 'Questions Generation' },
                { key: 'blueprint', label: 'Blueprint Generation' },
                { key: 'refinement', label: 'Blueprint Refinement' },
                { key: 'mockup', label: 'Mockup Generation' }
              ].map(stage => (
                <div key={stage.key}>
                  <label className="block text-sm font-semibold text-[var(--color-text)] mb-2">
                    {stage.label}
                  </label>
                  <select
                    value={stageModels[stage.key] || ''}
                    onChange={(e) => setStageModels({
                      ...stageModels,
                      [stage.key]: e.target.value || null
                    })}
                    className="input w-full"
                  >
                    <option value="">Default (use provider default)</option>
                    <optgroup label="Anthropic">
                      {AVAILABLE_MODELS.anthropic.map(m => (
                        <option key={m.id} value={m.id}>{m.name}</option>
                      ))}
                    </optgroup>
                    <optgroup label="OpenAI">
                      {AVAILABLE_MODELS.openai.map(m => (
                        <option key={m.id} value={m.id}>{m.name}</option>
                      ))}
                    </optgroup>
                    <optgroup label="Gemini">
                      {AVAILABLE_MODELS.gemini.map(m => (
                        <option key={m.id} value={m.id}>{m.name}</option>
                      ))}
                    </optgroup>
                  </select>
                </div>
              ))}

              <div className="h-px bg-[var(--color-border)] my-8" />

              {/* Second Pass Toggle */}
              <div className="flex items-center justify-between p-6 bg-white rounded-xl border border-[var(--color-border)] shadow-sm">
                <div className="flex-1 pr-4">
                  <p className="text-[var(--color-text)] font-semibold mb-1 font-heading">Enable Second Pass Refinement</p>
                  <p className="text-sm text-[var(--color-text-muted)]">
                    Use a second AI to critique and improve the blueprint automatically
                  </p>
                </div>
                <button
                  onClick={() => setEnableSecondPass(!enableSecondPass)}
                  className={`relative w-12 h-6 rounded-full transition-colors duration-300 focus:outline-none shrink-0 ${enableSecondPass ? 'bg-[var(--color-cta)]' : 'bg-gray-300'
                    }`}
                >
                  <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform duration-300 shadow-md ${enableSecondPass ? 'translate-x-7' : 'translate-x-1'
                    }`} />
                </button>
              </div>

              {enableSecondPass && (
                <div className="animate-fade-in space-y-6 p-6 bg-blue-50 rounded-xl border border-blue-200">
                  <div>
                    <label className="block text-sm font-semibold text-[var(--color-text)] mb-2">
                      Second Pass Provider
                    </label>
                    <select
                      value={secondPassProvider}
                      onChange={(e) => {
                        setSecondPassProvider(e.target.value);
                        const models = AVAILABLE_MODELS[e.target.value];
                        if (models && models.length > 0) {
                          setSecondPassModel(models[0].id);
                        }
                      }}
                      className="input w-full"
                    >
                      <option value="anthropic">Anthropic (Claude)</option>
                      <option value="openai">OpenAI</option>
                      <option value="gemini">Google Gemini</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-[var(--color-text)] mb-2">
                      Second Pass Model
                    </label>
                    <select
                      value={secondPassModel}
                      onChange={(e) => setSecondPassModel(e.target.value)}
                      className="input w-full"
                    >
                      {getModelsForProvider(secondPassProvider).map(m => (
                        <option key={m.id} value={m.id}>{m.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="p-4 bg-white rounded-lg border border-blue-200 flex gap-3">
                    <Zap className="w-5 h-5 text-[var(--color-cta)] shrink-0" />
                    <p className="text-sm text-[var(--color-text-muted)] leading-relaxed">
                      <strong>Tip:</strong> Using a different provider for the second pass often yields better results. For example, use Claude 3.5 Sonnet for the first pass and GPT-4o for the critique.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Sync & Data Tab (Combined Server + Data) */}
          {activeTab === 'syncdata' && (
            <div className="space-y-6 animate-fade-in">
              {/* Local-Only Mode Warning - Only show when NOT connected to server */}
              {!isAuthenticated && (
                <div className="p-6 rounded-xl border shadow-sm bg-amber-50 border-amber-200">
                  <div className="flex items-center gap-3 mb-3">
                    <CloudOff className="w-5 h-5 text-amber-600" />
                    <p className="text-[var(--color-text)] font-semibold font-heading">Local-Only Mode</p>
                  </div>
                  <p className="text-sm text-[var(--color-text-muted)] leading-relaxed">
                    Your data is only stored in this browser. Clearing your cache will permanently delete your data.
                  </p>
                </div>
              )}

              {/* Server Configuration */}
              <div className="p-6 bg-white rounded-xl border border-[var(--color-border)] shadow-sm">
                <div className="flex items-center gap-3 mb-3">
                  <Settings2 className="w-5 h-5 text-[var(--color-primary)]" />
                  <p className="text-[var(--color-text)] font-semibold font-heading">Self-Hosted Server</p>
                </div>
                <p className="text-sm text-[var(--color-text-muted)] leading-relaxed mb-4">
                  Connect to your self-hosted server (ideas.mkgbuilds.com) for syncing data across devices.
                </p>

                <div>
                  <label className="block text-sm font-semibold text-[var(--color-text)] mb-2">
                    Server URL
                  </label>
                  <input
                    type="text"
                    value={serverUrl}
                    onChange={(e) => setServerUrl(e.target.value)}
                    placeholder="https://ideas.mkgbuilds.com"
                    className="input w-full"
                  />
                </div>
              </div>

              {!isAuthenticated ? (
                <>
                  <div className="p-6 bg-white rounded-xl border border-[var(--color-border)] shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                      <LogIn className="w-5 h-5 text-[var(--color-primary)]" />
                      <p className="text-[var(--color-text)] font-semibold font-heading">Server Login</p>
                    </div>
                    <p className="text-sm text-[var(--color-text-muted)] mb-6">
                      Default credentials: username <code className="text-[var(--color-cta)] bg-orange-50 px-2 py-1 rounded">admin</code>, password <code className="text-[var(--color-cta)] bg-orange-50 px-2 py-1 rounded">admin123</code>
                    </p>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-semibold text-[var(--color-text)] mb-2">
                          Username
                        </label>
                        <input
                          type="text"
                          value={serverUsername}
                          onChange={(e) => setServerUsername(e.target.value)}
                          placeholder="admin"
                          className="input w-full"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-[var(--color-text)] mb-2">
                          Password
                        </label>
                        <input
                          type="password"
                          value={serverPassword}
                          onChange={(e) => setServerPassword(e.target.value)}
                          placeholder="••••••••"
                          className="input w-full"
                          onKeyPress={(e) => e.key === 'Enter' && handleServerLogin()}
                        />
                      </div>
                    </div>

                    {serverError && (
                      <p className="text-red-600 text-sm mt-4 bg-red-50 py-2 px-3 rounded border border-red-200">{serverError}</p>
                    )}
                    {serverSuccess && (
                      <p className="text-green-600 text-sm mt-4 bg-green-50 py-2 px-3 rounded border border-green-200">{serverSuccess}</p>
                    )}

                    <button
                      onClick={handleServerLogin}
                      className="btn-primary w-full mt-6"
                    >
                      <LogIn className="w-4 h-4" />
                      Login to Server
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="p-6 bg-green-50 rounded-xl border border-green-200 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <div className="w-2 h-2 rounded-full bg-green-500" />
                          <p className="text-[var(--color-text)] font-semibold font-heading">Connected to Server</p>
                        </div>
                        <p className="text-sm text-[var(--color-text-muted)]">
                          Logged in as <span className="text-[var(--color-cta)] font-semibold">{username}</span>
                        </p>
                      </div>
                      <button
                        onClick={handleServerLogout}
                        className="bg-red-50 hover:bg-red-100 text-red-600 px-4 py-2 rounded-lg text-sm border border-red-200 transition-colors flex items-center gap-2 font-semibold"
                      >
                        <LogOut className="w-4 h-4" />
                        Logout
                      </button>
                    </div>
                  </div>

                  {serverSuccess && (
                    <p className="text-green-600 text-sm bg-green-50 py-2 px-3 rounded border border-green-200">{serverSuccess}</p>
                  )}
                </>
              )}

              <div className="h-px bg-[var(--color-border)] my-8" />

              {/* Email Configuration */}
              <div className="p-6 bg-white rounded-xl border border-[var(--color-border)] shadow-sm">
                <div className="flex items-center gap-3 mb-3">
                  <Server className="w-5 h-5 text-[var(--color-primary)]" />
                  <p className="text-[var(--color-text)] font-semibold font-heading">Email Configuration (Resend)</p>
                </div>
                <p className="text-sm text-[var(--color-text-muted)] leading-relaxed mb-4">
                  Configure Resend to enable sending blueprints via email.
                </p>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-[var(--color-text)] mb-2">
                      Resend API Key
                    </label>
                    <input
                      type="password"
                      value={resendKey}
                      onChange={(e) => setResendKey(e.target.value)}
                      placeholder="re_..."
                      className="input w-full"
                    />
                    <p className="text-xs text-orange-600 mt-1">
                        Requires PIN to be set for encryption.
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-[var(--color-text)] mb-2">
                      Target Email (Recipient)
                    </label>
                    <input
                      type="email"
                      defaultValue={localStorage.getItem('target_email') || ''}
                      onChange={(e) => {
                        localStorage.setItem('target_email', e.target.value);
                      }}
                      placeholder="you@example.com"
                      className="input w-full"
                    />
                  </div>
                  <button
                    onClick={async () => {
                      try {
                        setSaveStatus('Sending...');
                        // Save the key first securely
                        if (!llm.activePin) throw new Error('PIN not active, cannot save securely.');
                        
                        await SecureStorage.setItem('resend_api_key', resendKey, llm.activePin);
                        const target = localStorage.getItem('target_email');

                        if (!resendKey) throw new Error('No API Key');
                        if (!target) throw new Error('No Target Email set');

                        await import('../services/email').then(m => m.EmailService.send(
                          target, // To
                          'Test Email from Idea Refinery',
                          '<h1>It works!</h1><p>Your email configuration is correct.</p>',
                          resendKey
                        ));
                        setSaveStatus('Email Sent!');
                        setTimeout(() => setSaveStatus(''), 2000);
                      } catch (e) {
                        alert(e.message);
                        setSaveStatus('Failed');
                      }
                    }}
                    className="btn-secondary text-sm"
                  >
                    Save & Send Test Email
                  </button>
                </div>
              </div>
              
              {/* ... Export Data section ... */}

              <div className="h-px bg-[var(--color-border)] my-8" />

              {/* Export Data */}
              <div className="p-6 bg-white rounded-xl border border-[var(--color-border)] shadow-sm">
                <div className="flex items-center gap-3 mb-3">
                  <Download className="w-5 h-5 text-[var(--color-primary)]" />
                  <p className="text-[var(--color-text)] font-semibold font-heading">Export Data</p>
                </div>
                <p className="text-sm text-[var(--color-text-muted)] leading-relaxed mb-4">
                  Download a JSON backup of all your generations, prompts, and settings.
                </p>

                <button
                  onClick={async () => {
                    try {
                      setSaveStatus('Exporting...');
                      const data = await exportAllData();
                      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `idea-refinery-backup-${new Date().toISOString().split('T')[0]}.json`;
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                      URL.revokeObjectURL(url);
                      setSaveStatus('Exported!');
                      setTimeout(() => setSaveStatus(''), 2000);
                    } catch (e) {
                      console.error(e);
                      setSaveStatus('Export failed');
                    }
                  }}
                  className="btn-primary"
                >
                  <Download className="w-4 h-4" />
                  Export All Data
                </button>
              </div>

              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-[var(--color-text-muted)] leading-relaxed">
                  💡 <strong>Tip:</strong> Export your data regularly if you're in local-only mode. You can also add more API keys in the API Keys tab to unlock models from other providers.
                </p>
              </div>
            </div>
          )}

          {/* Security Tab */}
          {activeTab === 'security' && (
            <div className="space-y-6 animate-fade-in">
              <div className="p-6 bg-white rounded-xl border border-[var(--color-border)] shadow-sm">
                <div className="flex items-center gap-3 mb-3">
                  <Lock className="w-5 h-5 text-[var(--color-primary)]" />
                  <p className="text-[var(--color-text)] font-semibold font-heading">Application Lock</p>
                </div>
                <p className="text-sm text-[var(--color-text-muted)] leading-relaxed">
                  Set a PIN to encrypt your API keys and lock the application on startup. This is recommended if you are on a shared device.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-[var(--color-text)] mb-2">
                    New PIN
                  </label>
                  <input
                    type="password"
                    value={newPin}
                    onChange={(e) => setNewPin(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                    placeholder="4-6 digits"
                    className="input w-full text-center"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[var(--color-text)] mb-2">
                    Confirm PIN
                  </label>
                  <input
                    type="password"
                    value={confirmPin}
                    onChange={(e) => setConfirmPin(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                    placeholder="Repeat PIN"
                    className="input w-full text-center"
                  />
                </div>
              </div>

              {pinError && (
                <p className="text-red-600 text-sm text-center bg-red-50 py-2 rounded border border-red-200">{pinError}</p>
              )}
              {pinSuccess && (
                <p className="text-green-600 text-sm text-center bg-green-50 py-2 rounded border border-green-200">{pinSuccess}</p>
              )}

              <div className="flex gap-4 pt-4">
                <button
                  onClick={handleSavePin}
                  className="btn-primary flex-1"
                >
                  Set PIN
                </button>
                <button
                  onClick={handleRemovePin}
                  className="flex-1 bg-red-50 hover:bg-red-100 text-red-600 py-3 rounded-lg font-semibold text-sm border border-red-200 transition-colors"
                >
                  Remove PIN
                </button>
              </div>

              <div className="h-px bg-[var(--color-border)] my-8" />

              <div className="p-6 bg-white rounded-xl border border-[var(--color-border)] shadow-sm">
                <div className="flex items-center gap-3 mb-3">
                  <Server className="w-5 h-5 text-[var(--color-primary)]" />
                  <p className="text-[var(--color-text)] font-semibold font-heading">Server Password</p>
                </div>
                <p className="text-sm text-[var(--color-text-muted)] leading-relaxed">
                  Change the password for the admin user on the self-hosted server.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-[var(--color-text)] mb-2">
                    New Password
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="New Password"
                    className="input w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[var(--color-text)] mb-2">
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm Password"
                    className="input w-full"
                  />
                </div>
              </div>

              {passwordError && (
                <p className="text-red-600 text-sm text-center bg-red-50 py-2 rounded border border-red-200">{passwordError}</p>
              )}
              {passwordSuccess && (
                <p className="text-green-600 text-sm text-center bg-green-50 py-2 rounded border border-green-200">{passwordSuccess}</p>
              )}

              <button
                onClick={handleChangePassword}
                className="btn-primary w-full"
              >
                Change Password
              </button>
            </div>
          )}



          {/* Save Button */}
          <div className="mt-8 mb-4 md:mt-8 md:mb-0 flex justify-end">
            <button
              onClick={handleSave}
              className="btn-primary w-full md:w-auto"
            >
              <Save className="w-4 h-4" />
              {saveStatus || 'Save Changes'}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
