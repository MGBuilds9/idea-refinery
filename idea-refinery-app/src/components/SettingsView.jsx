import React, { useState } from 'react';
import { Save, Eye, EyeOff, Zap, Bot, Settings2, Lock, Server, LogIn, LogOut, Download, Database, CloudOff } from 'lucide-react';
import { toast } from 'sonner';
import { useTheme } from '../contexts/ThemeContext';
import { llm, AVAILABLE_MODELS } from '../lib/llm';
import { exportAllData } from '../services/db';
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
  const [activeTab, setActiveTab] = useState('keys');

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
  const [currentPassword, setCurrentPassword] = useState('');
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
      // Check if any API keys are being saved
      const hasKeys = keys.anthropic || keys.openai || keys.gemini;

      if (hasKeys) {
        // Enforce PIN encryption for API key storage
        const pinSet = await SecureStorage.isSecureStorageAvailable();
        if (!pinSet) {
          setSaveStatus('PIN required for API keys');
          toast.warning('Set a PIN in Settings > Security to encrypt your API keys. API keys cannot be saved without encryption.');
          return;
        }
        if (!llm.activePin) {
          setSaveStatus('PIN not unlocked');
          toast.warning('Please unlock the app with your PIN first. API keys require encryption.');
          return;
        }
      }

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

  // Removed appearance tab - single theme only
  const tabs = [
    { id: 'keys', label: 'API Keys', icon: Settings2 },
    { id: 'aiconfig', label: 'AI Configuration', icon: Bot },
    { id: 'syncdata', label: 'Sync & Data', icon: Database },
    { id: 'security', label: 'Security', icon: Lock }
  ];

  // Secure Resend Key Load
  const [resendKey, setResendKey] = useState('');

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
         if (!llm.activePin) {
             setPinError('Please unlock the app properly first.');
             return;
         }

         const oldApiKeys = await SecureStorage.getItem('api_keys', llm.activePin);
         const oldResendKey = await SecureStorage.getItem('resend_api_key', llm.activePin);

         await SecureStorage.setPin(newPin);

         if (oldApiKeys) await SecureStorage.setItem('api_keys', oldApiKeys, newPin);
         if (oldResendKey) await SecureStorage.setItem('resend_api_key', oldResendKey, newPin);

         llm.setActivePin(newPin);
         setPinSuccess('PIN changed and data re-encrypted successfully!');
      } else {
          await SecureStorage.setPin(newPin);

          llm.setActivePin(newPin);

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

    if (!currentPassword) {
      setPasswordError('Current password is required');
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match');
      return;
    }

    try {
      await AuthService.changePassword(serverUrl, newPassword, currentPassword);
      setPasswordSuccess('Password changed successfully');
      setCurrentPassword('');
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
        <h2 className="text-2xl md:text-4xl font-sans font-bold text-white mb-2 md:mb-3">Settings</h2>
        <p className="text-zinc-400 text-sm md:text-base">Manage API keys, AI configuration, and data sync.</p>
      </div>

      <div className="flex flex-col md:flex-row gap-6 md:gap-8 relative">
        {/* Sidebar Nav (Desktop) / Horizontal Tabs (Mobile) */}
        <div className="w-full md:w-56 flex md:flex-col overflow-x-auto pb-2 md:pb-0 gap-2 hide-scrollbar shrink-0 snap-x">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`snap-start whitespace-nowrap md:w-full flex items-center gap-2 md:gap-3 px-4 py-2 md:py-3 rounded-lg transition-all duration-200 text-sm md:text-left relative overflow-hidden shrink-0 border font-semibold cursor-pointer ${activeTab === tab.id
                ? 'bg-[#d4af37] text-black border-[#d4af37] shadow-md'
                : 'bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10 border-white/10'
                }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 bg-[#131316] rounded-xl p-4 pt-4 md:p-8 md:pt-6 min-h-[400px] md:min-h-[500px] relative transition-all duration-300 border border-white/10">

          {/* API Keys Tab */}
          {activeTab === 'keys' && (
            <form onSubmit={e => e.preventDefault()} className="space-y-6 animate-fade-in">
              <div>
                <label className="block text-sm font-semibold text-white mb-2">
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

              <div className="h-px bg-white/10 my-8" />

              {['anthropic', 'openai', 'gemini'].map(p => (
                <div key={p}>
                  <label className="block text-sm font-semibold text-white mb-2 capitalize">
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
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-zinc-500 hover:text-[#d4af37] transition-colors rounded-full hover:bg-[#d4af37]/10 cursor-pointer"
                    >
                      {showKeys[p] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              ))}
            </form>
          )}

          {/* AI Configuration Tab */}
          {activeTab === 'aiconfig' && (
            <div className="space-y-6 animate-fade-in">
              {/* Stage Models Configuration */}
              <div className="bg-[#d4af37]/10 border border-[#d4af37]/20 p-4 rounded-xl">
                <p className="text-sm text-zinc-300 leading-relaxed">
                  <strong className="text-[#d4af37]">Advanced:</strong> Override default models for specific stages in the pipeline.
                </p>
              </div>

              {[
                { key: 'questions', label: 'Questions Generation' },
                { key: 'blueprint', label: 'Blueprint Generation' },
                { key: 'refinement', label: 'Blueprint Refinement' },
                { key: 'mockup', label: 'Mockup Generation' }
              ].map(stage => (
                <div key={stage.key}>
                  <label className="block text-sm font-semibold text-white mb-2">
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

              <div className="h-px bg-white/10 my-8" />

              {/* Second Pass Toggle */}
              <div className="flex items-center justify-between p-6 bg-white/5 rounded-xl border border-white/10">
                <div className="flex-1 pr-4">
                  <p className="text-white font-semibold mb-1 font-sans">Enable Second Pass Refinement</p>
                  <p className="text-sm text-zinc-400">
                    Use a second AI to critique and improve the blueprint automatically
                  </p>
                </div>
                <button
                  onClick={() => setEnableSecondPass(!enableSecondPass)}
                  className={`relative w-12 h-6 rounded-full transition-colors duration-300 focus:outline-none shrink-0 ${enableSecondPass ? 'bg-[#d4af37]' : 'bg-zinc-700'
                    }`}
                >
                  <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform duration-300 shadow-md ${enableSecondPass ? 'translate-x-7' : 'translate-x-1'
                    }`} />
                </button>
              </div>

              {enableSecondPass && (
                <div className="animate-fade-in space-y-6 p-6 bg-[#d4af37]/5 rounded-xl border border-[#d4af37]/20">
                  <div>
                    <label className="block text-sm font-semibold text-white mb-2">
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
                    <label className="block text-sm font-semibold text-white mb-2">
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

                  <div className="p-4 bg-white/5 rounded-lg border border-white/10 flex gap-3">
                    <Zap className="w-5 h-5 text-[#d4af37] shrink-0" />
                    <p className="text-sm text-zinc-400 leading-relaxed">
                      <strong className="text-white">Tip:</strong> Using a different provider for the second pass often yields better results. For example, use Claude 3.5 Sonnet for the first pass and GPT-4o for the critique.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Sync & Data Tab */}
          {activeTab === 'syncdata' && (
            <div className="space-y-6 animate-fade-in">
              {/* Local-Only Mode Warning */}
              {!isAuthenticated && (
                <div className="p-6 rounded-xl border shadow-sm bg-[#d4af37]/5 border-[#d4af37]/20">
                  <div className="flex items-center gap-3 mb-3">
                    <CloudOff className="w-5 h-5 text-[#d4af37]" />
                    <p className="text-white font-semibold font-sans">Local-Only Mode</p>
                  </div>
                  <p className="text-sm text-zinc-400 leading-relaxed">
                    Your data is only stored in this browser. Clearing your cache will permanently delete your data.
                  </p>
                </div>
              )}

              {/* Server Configuration */}
              <div className="p-6 bg-white/5 rounded-xl border border-white/10">
                <div className="flex items-center gap-3 mb-3">
                  <Settings2 className="w-5 h-5 text-[#d4af37]" />
                  <p className="text-white font-semibold font-sans">Self-Hosted Server</p>
                </div>
                <p className="text-sm text-zinc-400 leading-relaxed mb-4">
                  Connect to your self-hosted server (ideas.mkgbuilds.com) for syncing data across devices.
                </p>

                <div>
                  <label className="block text-sm font-semibold text-white mb-2">
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
                  <form onSubmit={e => e.preventDefault()} className="p-6 bg-white/5 rounded-xl border border-white/10">
                    <div className="flex items-center gap-3 mb-4">
                      <LogIn className="w-5 h-5 text-[#d4af37]" />
                      <p className="text-white font-semibold font-sans">Server Login</p>
                    </div>
                    <p className="text-sm text-zinc-400 mb-6">
                      Log in with your server account or register a new one.
                    </p>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-semibold text-white mb-2">
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
                        <label className="block text-sm font-semibold text-white mb-2">
                          Password
                        </label>
                        <input
                          type="password"
                          value={serverPassword}
                          onChange={(e) => setServerPassword(e.target.value)}
                          placeholder="********"
                          className="input w-full"
                          onKeyPress={(e) => e.key === 'Enter' && handleServerLogin()}
                        />
                      </div>
                    </div>

                    {serverError && (
                      <p className="text-red-400 text-sm mt-4 bg-red-900/20 py-2 px-3 rounded border border-red-500/20">{serverError}</p>
                    )}
                    {serverSuccess && (
                      <p className="text-emerald-400 text-sm mt-4 bg-emerald-900/20 py-2 px-3 rounded border border-emerald-500/20">{serverSuccess}</p>
                    )}

                    <button
                      onClick={handleServerLogin}
                      className="btn-primary w-full mt-6"
                    >
                      <LogIn className="w-4 h-4" />
                      Login to Server
                    </button>
                  </form>
                </>
              ) : (
                <>
                  <div className="p-6 bg-emerald-900/10 rounded-xl border border-emerald-500/20">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <div className="w-2 h-2 rounded-full bg-emerald-500" />
                          <p className="text-white font-semibold font-sans">Connected to Server</p>
                        </div>
                        <p className="text-sm text-zinc-400">
                          Logged in as <span className="text-[#d4af37] font-semibold">{username}</span>
                        </p>
                      </div>
                      <button
                        onClick={handleServerLogout}
                        className="bg-red-900/20 hover:bg-red-900/30 text-red-400 px-4 py-2 rounded-lg text-sm border border-red-500/20 transition-colors flex items-center gap-2 font-semibold"
                      >
                        <LogOut className="w-4 h-4" />
                        Logout
                      </button>
                    </div>
                  </div>

                  {serverSuccess && (
                    <p className="text-emerald-400 text-sm bg-emerald-900/20 py-2 px-3 rounded border border-emerald-500/20">{serverSuccess}</p>
                  )}
                </>
              )}

              <div className="h-px bg-white/10 my-8" />

              {/* Email Configuration */}
              <form onSubmit={e => e.preventDefault()} className="p-6 bg-white/5 rounded-xl border border-white/10">
                <div className="flex items-center gap-3 mb-3">
                  <Server className="w-5 h-5 text-[#d4af37]" />
                  <p className="text-white font-semibold font-sans">Email Configuration (Resend)</p>
                </div>
                <p className="text-sm text-zinc-400 leading-relaxed mb-4">
                  Configure Resend to enable sending blueprints via email.
                </p>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-white mb-2">
                      Resend API Key
                    </label>
                    <input
                      type="password"
                      value={resendKey}
                      onChange={(e) => setResendKey(e.target.value)}
                      placeholder="re_..."
                      className="input w-full"
                    />
                    <p className="text-xs text-[#d4af37]/70 mt-1">
                        Requires PIN to be set for encryption.
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-white mb-2">
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
                        if (!llm.activePin) throw new Error('PIN not active, cannot save securely.');

                        await SecureStorage.setItem('resend_api_key', resendKey, llm.activePin);
                        const target = localStorage.getItem('target_email');

                        if (!resendKey) throw new Error('No API Key');
                        if (!target) throw new Error('No Target Email set');

                        await import('../services/email').then(m => m.EmailService.send(
                          target,
                          'Test Email from Idea Refinery',
                          '<h1>It works!</h1><p>Your email configuration is correct.</p>',
                          resendKey
                        ));
                        setSaveStatus('Email Sent!');
                        setTimeout(() => setSaveStatus(''), 2000);
                      } catch (e) {
                        toast.error(e.message);
                        setSaveStatus('Failed');
                      }
                    }}
                    className="btn-secondary text-sm"
                  >
                    Save & Send Test Email
                  </button>
                </div>
              </form>

              <div className="h-px bg-white/10 my-8" />

              {/* Export Data */}
              <div className="p-6 bg-white/5 rounded-xl border border-white/10">
                <div className="flex items-center gap-3 mb-3">
                  <Download className="w-5 h-5 text-[#d4af37]" />
                  <p className="text-white font-semibold font-sans">Export Data</p>
                </div>
                <p className="text-sm text-zinc-400 leading-relaxed mb-4">
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

              <div className="p-4 bg-white/5 border border-white/10 rounded-lg">
                <p className="text-sm text-zinc-400 leading-relaxed">
                  <strong className="text-[#d4af37]">Tip:</strong> Export your data regularly if you're in local-only mode. You can also add more API keys in the API Keys tab to unlock models from other providers.
                </p>
              </div>
            </div>
          )}

          {/* Security Tab */}
          {activeTab === 'security' && (
            <form onSubmit={e => e.preventDefault()} className="space-y-6 animate-fade-in">
              <div className="p-6 bg-white/5 rounded-xl border border-white/10">
                <div className="flex items-center gap-3 mb-3">
                  <Lock className="w-5 h-5 text-[#d4af37]" />
                  <p className="text-white font-semibold font-sans">Application Lock</p>
                </div>
                <p className="text-sm text-zinc-400 leading-relaxed">
                  Set a PIN to encrypt your API keys and lock the application on startup. This is recommended if you are on a shared device.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-white mb-2">
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
                  <label className="block text-sm font-semibold text-white mb-2">
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
                <p className="text-red-400 text-sm text-center bg-red-900/20 py-2 rounded border border-red-500/20">{pinError}</p>
              )}
              {pinSuccess && (
                <p className="text-emerald-400 text-sm text-center bg-emerald-900/20 py-2 rounded border border-emerald-500/20">{pinSuccess}</p>
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
                  className="flex-1 bg-red-900/20 hover:bg-red-900/30 text-red-400 py-3 rounded-lg font-semibold text-sm border border-red-500/20 transition-colors"
                >
                  Remove PIN
                </button>
              </div>

              <div className="h-px bg-white/10 my-8" />

              <div className="p-6 bg-white/5 rounded-xl border border-white/10">
                <div className="flex items-center gap-3 mb-3">
                  <Server className="w-5 h-5 text-[#d4af37]" />
                  <p className="text-white font-semibold font-sans">Server Password</p>
                </div>
                <p className="text-sm text-zinc-400 leading-relaxed">
                  Change the password for the admin user on the self-hosted server.
                </p>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-white mb-2">
                    Current Password
                  </label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Current Password"
                    className="input w-full"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-white mb-2">
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
                    <label className="block text-sm font-semibold text-white mb-2">
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
              </div>

              {passwordError && (
                <p className="text-red-400 text-sm text-center bg-red-900/20 py-2 rounded border border-red-500/20">{passwordError}</p>
              )}
              {passwordSuccess && (
                <p className="text-emerald-400 text-sm text-center bg-emerald-900/20 py-2 rounded border border-emerald-500/20">{passwordSuccess}</p>
              )}

              <button
                onClick={handleChangePassword}
                className="btn-primary w-full"
              >
                Change Password
              </button>
            </form>
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
