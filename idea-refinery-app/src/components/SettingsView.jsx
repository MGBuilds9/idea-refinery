import React, { useState } from 'react';
import { Save, Eye, EyeOff, Zap, Bot, Settings2, Lock, Server, LogIn, LogOut, Download, Database, CloudOff } from 'lucide-react';
import { llm, AVAILABLE_MODELS } from '../lib/llm';
import { saveSetting, exportAllData } from '../services/db';
import { hashPin } from '../services/crypto';
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

  const tabs = [
    { id: 'keys', label: 'API Keys', icon: Settings2 },
    { id: 'models', label: 'Models', icon: Bot },
    { id: 'secondpass', label: 'Second Pass', icon: Zap },
    { id: 'server', label: 'Server', icon: Settings2 },
    { id: 'data', label: 'Data', icon: Database },
    { id: 'security', label: 'Security', icon: Lock }
  ];

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
      const hash = await hashPin(newPin);
      await saveSetting('pinHash', hash);
      setPinSuccess('PIN saved successfully! Restart app to enable.');
      setNewPin('');
      setConfirmPin('');
    } catch (e) {
      console.error(e);
      setPinError('Failed to save PIN');
    }
  };

  const handleRemovePin = async () => {
    try {
      await saveSetting('pinHash', null);
      setPinSuccess('PIN removed. App will no longer be locked.');
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
      <div className="mb-10">
        <h2 className="text-4xl font-serif text-gold-gradient mb-3">System Configuration</h2>
        <p className="text-zinc-500 font-mono text-sm tracking-wide">Manage API keys, models, and security protocols.</p>
      </div>

      <div className="flex flex-col md:flex-row gap-6 md:gap-8 relative">
        {/* Sidebar Nav (Desktop) / Horizontal Tabs (Mobile) */}
        <div className="w-full md:w-56 flex md:flex-col overflow-x-auto pb-2 md:pb-0 gap-2 hide-scrollbar shrink-0 snap-x">
            {tabs.map(tab => (
                <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`snap-start whitespace-nowrap md:w-full flex items-center gap-2 md:gap-3 px-4 py-2 md:py-3 rounded-full md:rounded-lg transition-all duration-300 font-mono text-sm md:text-left relative overflow-hidden shrink-0 border ${
                    activeTab === tab.id 
                    ? 'bg-[var(--color-gold-subtle)] text-[var(--color-gold-primary)] border-[var(--color-gold-primary)] md:border-[var(--color-gold-subtle)]' 
                    : 'bg-white/5 md:bg-transparent text-zinc-500 hover:text-zinc-300 hover:bg-white/10 border-transparent'
                }`}
                >
                <div className={`hidden md:block absolute left-0 top-0 bottom-0 w-0.5 transition-colors ${activeTab === tab.id ? 'bg-[var(--color-gold-primary)]' : 'bg-transparent'}`} />
                <tab.icon className="w-4 h-4" />
                {tab.label}
                </button>
            ))}
        </div>

        {/* Content */}
        <div className="flex-1 glass-panel rounded-xl p-4 pt-6 md:p-8 min-h-[500px] relative transition-all duration-300 pb-24 md:pb-8">
            
            {/* API Keys Tab */}
            {activeTab === 'keys' && (
                <div className="space-y-6 animate-fade-in">
                <div>
                    <label className="block text-xs uppercase text-[#D4AF37] mb-2 font-mono opacity-80">
                    Default Provider
                    </label>
                    <div className="relative group">
                        <select 
                        value={provider}
                        onChange={(e) => setProvider(e.target.value)}
                        className="w-full bg-[#0A0A0A]/60 border border-[#D4AF37]/20 rounded-lg px-4 py-4 text-white focus:border-[#D4AF37]/60 focus:outline-none font-mono text-sm transition-all duration-300 input-glow appearance-none"
                        >
                        <option value="anthropic">Anthropic (Claude)</option>
                        <option value="openai">OpenAI (GPT-4o)</option>
                        <option value="gemini">Google Gemini</option>
                        </select>
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-[#D4AF37]/50">
                            ▼
                        </div>
                    </div>
                </div>

                <div className="h-px bg-gradient-to-r from-transparent via-[#D4AF37]/20 to-transparent my-8" />

                {['anthropic', 'openai', 'gemini'].map(p => (
                    <div key={p}>
                    <label className="block text-xs uppercase text-[#D4AF37] mb-2 font-mono opacity-80">
                        {p} API Key
                    </label>
                    <div className="relative group">
                        <input
                        type={showKeys[p] ? "text" : "password"}
                        value={keys[p]}
                        onChange={(e) => setKeys({ ...keys, [p]: e.target.value })}
                        placeholder={`sk-...`}
                        className="w-full bg-[#0A0A0A]/60 border border-[#D4AF37]/20 rounded-lg px-4 py-4 pr-12 text-white focus:border-[#D4AF37]/60 focus:outline-none font-mono text-sm transition-all duration-300 input-glow"
                        />
                        <button
                        onClick={() => toggleShow(p)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-gray-500 hover:text-[#D4AF37] transition-colors rounded-full hover:bg-[#D4AF37]/10"
                        >
                        {showKeys[p] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                    </div>
                    </div>
                ))}
                </div>
            )}

            {/* Models Tab */}
            {activeTab === 'models' && (
                <div className="space-y-6 animate-fade-in">
                <div className="bg-[#D4AF37]/5 border border-[#D4AF37]/20 p-4 rounded-xl mb-6">
                    <p className="text-xs text-[#D4AF37] font-mono leading-relaxed">
                    💎 Advanced: Override default models for specific stages in the pipeline.
                    </p>
                </div>
                
                {[
                    { key: 'questions', label: 'Questions Generation' },
                    { key: 'blueprint', label: 'Blueprint Generation' },
                    { key: 'refinement', label: 'Blueprint Refinement' },
                    { key: 'mockup', label: 'Mockup Generation' }
                ].map(stage => (
                    <div key={stage.key}>
                    <label className="block text-xs uppercase text-[#D4AF37] mb-2 font-mono opacity-80">
                        {stage.label}
                    </label>
                    <select
                        value={stageModels[stage.key] || ''}
                        onChange={(e) => setStageModels({ 
                        ...stageModels, 
                        [stage.key]: e.target.value || null 
                        })}
                        className="w-full bg-[#0A0A0A]/60 border border-[#D4AF37]/20 rounded-lg px-4 py-4 text-white focus:border-[#D4AF37]/60 focus:outline-none font-mono text-sm transition-all duration-300 input-glow"
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
                </div>
            )}

          {/* Second Pass Tab */}
          {activeTab === 'secondpass' && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex items-center justify-between p-6 bg-[#0A0A0A]/60 rounded-xl border border-[#D4AF37]/20">
                <div>
                  <p className="text-white font-medium mb-1">Enable Second Pass Refinement</p>
                  <p className="text-xs text-gray-500 font-mono">
                    Use a second AI to critique and improve the blueprint automatically
                  </p>
                </div>
                <button
                  onClick={() => setEnableSecondPass(!enableSecondPass)}
                  className={`relative w-14 h-7 rounded-full transition-colors ${
                    enableSecondPass ? 'bg-[#D4AF37]' : 'bg-[#333]'
                  }`}
                >
                  <span className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-transform ${
                    enableSecondPass ? 'translate-x-8' : 'translate-x-1'
                  }`} />
                </button>
              </div>

              {enableSecondPass && (
                <div className="animate-fade-in space-y-6 border-t border-[#333] pt-6">
                  <div>
                    <label className="block text-xs uppercase text-[#D4AF37] mb-2 font-mono opacity-80">
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
                      className="w-full bg-[#0A0A0A]/60 border border-[#D4AF37]/20 rounded-lg px-4 py-4 text-white focus:border-[#D4AF37]/60 focus:outline-none font-mono text-sm transition-all duration-300 input-glow"
                    >
                      <option value="anthropic">Anthropic (Claude)</option>
                      <option value="openai">OpenAI</option>
                      <option value="gemini">Google Gemini</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs uppercase text-[#D4AF37] mb-2 font-mono opacity-80">
                      Second Pass Model
                    </label>
                    <select
                      value={secondPassModel}
                      onChange={(e) => setSecondPassModel(e.target.value)}
                      className="w-full bg-[#0A0A0A]/60 border border-[#D4AF37]/20 rounded-lg px-4 py-4 text-white focus:border-[#D4AF37]/60 focus:outline-none font-mono text-sm transition-all duration-300 input-glow"
                    >
                      {getModelsForProvider(secondPassProvider).map(m => (
                        <option key={m.id} value={m.id}>{m.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="p-4 bg-purple-900/10 border border-purple-500/20 rounded-lg flex gap-3">
                    <Zap className="w-5 h-5 text-purple-400 shrink-0" />
                    <p className="text-xs text-purple-300 font-mono leading-relaxed">
                      Tip: Using a different provider for the second pass often yields better results. For example, use Claude 3.5 Sonnet for the first pass and GPT-4o for the critique.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Server Tab */}
          {activeTab === 'server' && (
            <div className="space-y-6 animate-fade-in">
              <div className="p-6 bg-[#0A0A0A]/60 rounded-xl border border-[#D4AF37]/20">
                <div className="flex items-center gap-3 mb-3">
                  <Settings2 className="w-5 h-5 text-[#D4AF37]" />
                  <p className="text-white font-medium">Self-Hosted Server</p>
                </div>
                <p className="text-sm text-gray-500 font-mono leading-relaxed">
                  Connect to your self-hosted server (ideas.mkgbuilds.com) for syncing data across devices.
                </p>
              </div>

              <div>
                <label className="block text-xs uppercase text-[#D4AF37] mb-2 font-mono opacity-80">
                  Server URL
                </label>
                <input
                  type="text"
                  value={serverUrl}
                  onChange={(e) => setServerUrl(e.target.value)}
                  placeholder="https://ideas.mkgbuilds.com"
                  className="w-full bg-[#0A0A0A]/60 border border-[#D4AF37]/20 rounded-lg px-4 py-4 text-white focus:border-[#D4AF37]/60 focus:outline-none font-mono text-sm transition-all duration-300 input-glow"
                />
              </div>

              {!isAuthenticated ? (
                <>
                  <div className="h-px bg-[#333] my-6" />
                  
                  <div className="p-6 bg-[#0A0A0A]/60 rounded-xl border border-[#D4AF37]/20">
                    <div className="flex items-center gap-3 mb-4">
                      <LogIn className="w-5 h-5 text-[#D4AF37]" />
                      <p className="text-white font-medium">Server Login</p>
                    </div>
                    <p className="text-sm text-gray-500 font-mono mb-6">
                      Default credentials: username <code className="text-[#D4AF37]">admin</code>, password <code className="text-[#D4AF37]">admin123</code>
                    </p>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs uppercase text-[#D4AF37] mb-2 font-mono opacity-80">
                          Username
                        </label>
                        <input
                          type="text"
                          value={serverUsername}
                          onChange={(e) => setServerUsername(e.target.value)}
                          placeholder="admin"
                          className="w-full bg-[#0A0A0A]/60 border border-[#D4AF37]/20 rounded-lg px-4 py-3 text-white focus:border-[#D4AF37]/60 focus:outline-none font-mono text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs uppercase text-[#D4AF37] mb-2 font-mono opacity-80">
                          Password
                        </label>
                        <input
                          type="password"
                          value={serverPassword}
                          onChange={(e) => setServerPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full bg-[#0A0A0A]/60 border border-[#D4AF37]/20 rounded-lg px-4 py-3 text-white focus:border-[#D4AF37]/60 focus:outline-none font-mono text-sm"
                          onKeyPress={(e) => e.key === 'Enter' && handleServerLogin()}
                        />
                      </div>
                    </div>

                    {serverError && (
                      <p className="text-red-400 text-sm font-mono mt-4 bg-red-900/10 py-2 px-3 rounded border border-red-900/30">{serverError}</p>
                    )}
                    {serverSuccess && (
                      <p className="text-emerald-400 text-sm font-mono mt-4 bg-emerald-900/10 py-2 px-3 rounded border border-emerald-900/30">{serverSuccess}</p>
                    )}

                    <button
                      onClick={handleServerLogin}
                      className="w-full mt-6 bg-[#D4AF37] hover:bg-[#C5A028] text-[#1A1A1A] py-3 rounded-lg font-bold font-mono text-sm transition-colors flex items-center justify-center gap-2"
                    >
                      <LogIn className="w-4 h-4" />
                      LOGIN TO SERVER
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="h-px bg-[#333] my-6" />
                  
                  <div className="p-6 bg-emerald-900/10 rounded-xl border border-emerald-500/20">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <div className="w-2 h-2 rounded-full bg-emerald-400" />
                          <p className="text-white font-medium">Connected to Server</p>
                        </div>
                        <p className="text-sm text-gray-400 font-mono">
                          Logged in as <span className="text-[#D4AF37]">{username}</span>
                        </p>
                      </div>
                      <button
                        onClick={handleServerLogout}
                        className="bg-red-500/10 hover:bg-red-500/20 text-red-400 px-4 py-2 rounded font-mono text-sm border border-red-500/20 transition-colors flex items-center gap-2"
                      >
                        <LogOut className="w-4 h-4" />
                        LOGOUT
                      </button>
                    </div>
                  </div>

                  {serverSuccess && (
                    <p className="text-emerald-400 text-sm font-mono bg-emerald-900/10 py-2 px-3 rounded border border-emerald-900/30">{serverSuccess}</p>
                  )}
                </>
              )}

              <div className="h-px bg-[#333] my-8" />
              
              <div className="p-6 bg-[#0A0A0A] rounded-lg border border-[#333]">
                <div className="flex items-center gap-3 mb-3">
                  <Server className="w-5 h-5 text-[#D4AF37]" />
                  <p className="text-white font-medium">Email Configuration (Resend)</p>
                </div>
                <p className="text-sm text-gray-500 font-mono leading-relaxed mb-4">
                  Configure Resend to enable sending blueprints via email.
                </p>
                
                <div className="space-y-4">
                     <div>
                        <label className="block text-xs uppercase text-[#D4AF37] mb-2 font-mono opacity-80">
                        Resend API Key
                        </label>
                        <input
                        type="password"
                        defaultValue={localStorage.getItem('resend_api_key') || ''}
                        onChange={(e) => {
                            localStorage.setItem('resend_api_key', e.target.value);
                        }}
                        placeholder="re_..."
                        className="w-full bg-[#0A0A0A]/60 border border-[#D4AF37]/20 rounded-lg px-4 py-4 text-white focus:border-[#D4AF37]/60 focus:outline-none font-mono text-sm tracking-widest transition-all duration-300 input-glow"
                        />
                     </div>

                     <div>
                        <label className="block text-xs uppercase text-[#D4AF37] mb-2 font-mono opacity-80">
                        Target Email (Recipient)
                        </label>
                        <input
                        type="email"
                        defaultValue={localStorage.getItem('target_email') || ''}
                        onChange={(e) => {
                            localStorage.setItem('target_email', e.target.value);
                        }}
                        placeholder="you@example.com"
                        className="w-full bg-[#0A0A0A]/60 border border-[#D4AF37]/20 rounded-lg px-4 py-4 text-white focus:border-[#D4AF37]/60 focus:outline-none font-mono text-sm transition-all duration-300 input-glow"
                        />
                     </div>
                     <button
                        onClick={async () => {
                             try {
                                 setSaveStatus('Sending...');
                                 const key = localStorage.getItem('resend_api_key');
                                 const target = localStorage.getItem('target_email');
                                 
                                 if (!key) throw new Error('No API Key');
                                 if (!target) throw new Error('No Target Email set');
                                 
                                 await import('../services/email').then(m => m.EmailService.send(
                                     target, // To
                                     'Test Email from Idea Refinery',
                                     '<h1>It works!</h1><p>Your email configuration is correct.</p>',
                                     key
                                 ));
                                 setSaveStatus('Email Sent!');
                                 setTimeout(() => setSaveStatus(''), 2000);
                             } catch(e) {
                                 alert(e.message);
                                 setSaveStatus('Failed');
                             }
                        }}
                        className="text-xs bg-[#333] hover:bg-[#444] text-white px-3 py-2 rounded transition-colors"
                     >
                        Send Test Email
                     </button>
                </div>
              </div>
            </div>
          )}

          {/* Data Tab */}
          {activeTab === 'data' && (
            <div className="space-y-6 animate-fade-in">
              {/* Sync Mode Status */}
              <div className={`p-6 rounded-xl border ${
                localStorage.getItem('sync_mode') === 'server' 
                  ? 'bg-emerald-900/10 border-emerald-500/20'
                  : 'bg-amber-900/10 border-amber-500/20'
              }`}>
                <div className="flex items-center gap-3 mb-3">
                  {localStorage.getItem('sync_mode') === 'server' ? (
                    <>
                      <Server className="w-5 h-5 text-emerald-400" />
                      <p className="text-white font-medium">Server Sync Enabled</p>
                    </>
                  ) : (
                    <>
                      <CloudOff className="w-5 h-5 text-amber-400" />
                      <p className="text-white font-medium">Local-Only Mode</p>
                    </>
                  )}
                </div>
                <p className="text-sm text-gray-400 font-mono leading-relaxed">
                  {localStorage.getItem('sync_mode') === 'server' 
                    ? 'Your data is automatically synced to the server after each generation.'
                    : 'Your data is only stored in this browser. Clearing your cache will permanently delete your data.'
                  }
                </p>
                
                {localStorage.getItem('sync_mode') !== 'server' && (
                  <button
                    onClick={() => setActiveTab('server')}
                    className="mt-4 bg-[#D4AF37] hover:bg-[#C5A028] text-[#1A1A1A] px-4 py-2 rounded font-mono text-sm transition-colors flex items-center gap-2"
                  >
                    <Server className="w-4 h-4" />
                    Connect to Server
                  </button>
                )}
              </div>

              <div className="h-px bg-[#333] my-6" />

              {/* Export Data */}
              <div className="p-6 bg-[#0A0A0A]/60 rounded-xl border border-[#D4AF37]/20">
                <div className="flex items-center gap-3 mb-3">
                  <Download className="w-5 h-5 text-[#D4AF37]" />
                  <p className="text-white font-medium">Export Data</p>
                </div>
                <p className="text-sm text-gray-500 font-mono leading-relaxed mb-4">
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
                  className="bg-[#D4AF37] hover:bg-[#C5A028] text-[#1A1A1A] px-6 py-3 rounded-lg font-bold font-mono text-sm transition-colors flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  EXPORT ALL DATA
                </button>
              </div>

              <div className="p-4 bg-[#111] border border-[#333] rounded-lg">
                <p className="text-xs text-gray-500 font-mono leading-relaxed">
                  💡 Tip: Export your data regularly if you're in local-only mode. You can also add more API keys in the API Keys tab to unlock models from other providers.
                </p>
              </div>
            </div>
          )}

          {/* Security Tab */}
          {activeTab === 'security' && (
            <div className="space-y-6 animate-fade-in">
              <div className="p-6 bg-[#0A0A0A]/60 rounded-xl border border-[#D4AF37]/20">
                <div className="flex items-center gap-3 mb-3">
                  <Lock className="w-5 h-5 text-[#D4AF37]" />
                  <p className="text-white font-medium">Application Lock</p>
                </div>
                <p className="text-sm text-gray-500 font-mono leading-relaxed">
                  Set a PIN to encrypt your API keys and lock the application on startup. This is recommended if you are on a shared device.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                    <label className="block text-xs uppercase text-[#D4AF37] mb-2 font-mono opacity-80">
                    New PIN
                    </label>
                    <input
                    type="password"
                    value={newPin}
                    onChange={(e) => setNewPin(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                    placeholder="4-6 digits"
                    className="w-full bg-[#0A0A0A]/60 border border-[#D4AF37]/20 rounded-lg px-4 py-4 text-white focus:border-[#D4AF37]/60 focus:outline-none font-mono text-sm tracking-widest text-center transition-all duration-300 input-glow"
                    />
                </div>
                <div>
                    <label className="block text-xs uppercase text-[#D4AF37] mb-2 font-mono opacity-80">
                    Confirm PIN
                    </label>
                    <input
                    type="password"
                    value={confirmPin}
                    onChange={(e) => setConfirmPin(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                    placeholder="Repeat PIN"
                    className="w-full bg-[#0A0A0A]/60 border border-[#D4AF37]/20 rounded-lg px-4 py-4 text-white focus:border-[#D4AF37]/60 focus:outline-none font-mono text-sm tracking-widest text-center transition-all duration-300 input-glow"
                    />
                </div>
              </div>

              {pinError && (
                <p className="text-red-400 text-sm font-mono text-center bg-red-900/10 py-2 rounded border border-red-900/30">{pinError}</p>
              )}
              {pinSuccess && (
                <p className="text-emerald-400 text-sm font-mono text-center bg-emerald-900/10 py-2 rounded border border-emerald-900/30">{pinSuccess}</p>
              )}

              <div className="flex gap-4 pt-4">
                <button
                  onClick={handleSavePin}
                  className="flex-1 bg-[#D4AF37] hover:bg-[#C5A028] text-[#1A1A1A] py-3 rounded font-bold font-mono text-sm transition-colors"
                >
                  SET PIN
                </button>
                <button
                  onClick={handleRemovePin}
                  className="flex-1 bg-red-500/10 hover:bg-red-500/20 text-red-500 py-3 rounded font-medium font-mono text-sm border border-red-500/20 transition-colors"
                >
                  REMOVE PIN
                </button>
              </div>
              
              <div className="h-px bg-[#333] my-8" />
              
              <div className="p-6 bg-[#0A0A0A] rounded-lg border border-[#333]">
                <div className="flex items-center gap-3 mb-3">
                  <Server className="w-5 h-5 text-[#D4AF37]" />
                  <p className="text-white font-medium">Server Password</p>
                </div>
                <p className="text-sm text-gray-500 font-mono leading-relaxed">
                  Change the password for the admin user on the self-hosted server.
                </p>
              </div>

               <div className="grid grid-cols-2 gap-6">
                <div>
                    <label className="block text-xs uppercase text-[#D4AF37] mb-2 font-mono opacity-80">
                    New Password
                    </label>
                    <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="New Password"
                    className="w-full bg-[#0A0A0A]/60 border border-[#D4AF37]/20 rounded-lg px-4 py-4 text-white focus:border-[#D4AF37]/60 focus:outline-none font-mono text-sm tracking-widest text-center transition-all duration-300 input-glow"
                    />
                </div>
                <div>
                    <label className="block text-xs uppercase text-[#D4AF37] mb-2 font-mono opacity-80">
                    Confirm Password
                    </label>
                    <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm Password"
                    className="w-full bg-[#0A0A0A]/60 border border-[#D4AF37]/20 rounded-lg px-4 py-4 text-white focus:border-[#D4AF37]/60 focus:outline-none font-mono text-sm tracking-widest text-center transition-all duration-300 input-glow"
                    />
                </div>
              </div>

              {passwordError && (
                <p className="text-red-400 text-sm font-mono text-center bg-red-900/10 py-2 rounded border border-red-900/30">{passwordError}</p>
              )}
              {passwordSuccess && (
                <p className="text-emerald-400 text-sm font-mono text-center bg-emerald-900/10 py-2 rounded border border-emerald-900/30">{passwordSuccess}</p>
              )}

              <button
                  onClick={handleChangePassword}
                  className="w-full bg-[#D4AF37] hover:bg-[#C5A028] text-[#1A1A1A] py-3 rounded font-bold font-mono text-sm transition-colors"
                >
                  CHANGE PASSWORD
              </button>
            </div>
          )}



            {/* Save Button (Floating on Mobile / Top Right on Desktop) */}
            <div className="fixed bottom-20 left-4 right-4 md:absolute md:top-8 md:right-8 md:bottom-auto md:left-auto md:w-auto z-40 md:z-auto">
                <button
                    onClick={handleSave}
                    className="w-full md:w-auto justify-center bg-[#D4AF37] hover:bg-[#E5C048] text-[#0A0A0A] px-8 py-3 rounded-xl font-bold flex items-center gap-2 font-mono text-sm shadow-[0_4px_20px_rgba(212,175,55,0.4)] hover:shadow-[0_4px_30px_rgba(212,175,55,0.6)] transition-all transform hover:-translate-y-1 active:translate-y-0 active:scale-95"
                >
                    <Save className="w-4 h-4" />
                    {saveStatus || 'SAVE CHANGES'}
                </button>
            </div>

        </div>
      </div>
    </div>
  );
}
