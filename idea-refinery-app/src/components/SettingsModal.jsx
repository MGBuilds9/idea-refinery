import React, { useState } from 'react';
import { X, Save, Eye, EyeOff, Zap, Bot, Settings2, Lock } from 'lucide-react';
import { llm, AVAILABLE_MODELS } from '../lib/llm';
import { saveSetting } from '../services/db';
import { hashPin } from '../services/crypto';

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

export default function SettingsModal({ onClose }) {
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

  // Server/Sync state
  const [serverUrl, setServerUrl] = useState(localStorage.getItem('serverUrl') || '');

  const handleSave = async () => {
    // Save API keys utilizing the new bulk method to prevent race conditions
    console.log('SettingsModal saving keys:', { 
      anthropic: keys.anthropic ? '***' : 'empty', 
      openai: keys.openai ? '***' : 'empty', 
      gemini: keys.gemini ? '***' : 'empty' 
    });
    
    await llm.setApiKeys({
      anthropic: keys.anthropic,
      openai: keys.openai,
      gemini: keys.gemini
    });

    llm.setDefaultProvider(provider);
    
    // Save settings
    llm.updateSettings({
      enableSecondPass,
      secondPassProvider,
      secondPassModel,
      stageModels
    });

    // Save Server URL
    localStorage.setItem('serverUrl', serverUrl);
    
    onClose();
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

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#1A1A1A] border border-[#D4AF37]/30 rounded-lg w-full max-w-lg shadow-2xl animate-fade-in m-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[#D4AF37]/20">
          <h2 className="text-xl font-serif text-[#D4AF37]">Settings</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[#D4AF37]/20">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-mono transition-colors ${
                activeTab === tab.id 
                  ? 'text-[#D4AF37] border-b-2 border-[#D4AF37] bg-[#D4AF37]/10' 
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="p-6 max-h-[60vh] overflow-y-auto">
          {/* API Keys Tab */}
          {activeTab === 'keys' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs uppercase text-[#D4AF37] mb-1 font-mono opacity-80">
                  Default Provider
                </label>
                <select 
                  value={provider}
                  onChange={(e) => setProvider(e.target.value)}
                  className="w-full bg-[#252525] border border-gray-700 rounded px-3 py-2 text-white focus:border-[#D4AF37] focus:outline-none font-mono text-sm"
                >
                  <option value="anthropic">Anthropic (Claude)</option>
                  <option value="openai">OpenAI (GPT-4o)</option>
                  <option value="gemini">Google Gemini</option>
                </select>
              </div>

              {['anthropic', 'openai', 'gemini'].map(p => (
                <div key={p}>
                  <label className="block text-xs uppercase text-[#D4AF37] mb-1 font-mono opacity-80">
                    {p} API Key
                  </label>
                  <div className="relative">
                    <input
                      type={showKeys[p] ? "text" : "password"}
                      value={keys[p]}
                      onChange={(e) => setKeys({ ...keys, [p]: e.target.value })}
                      placeholder={`sk-...`}
                      className="w-full bg-[#252525] border border-gray-700 rounded px-3 py-2 pr-10 text-white focus:border-[#D4AF37] focus:outline-none font-mono text-sm"
                    />
                    <button
                      onClick={() => toggleShow(p)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
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
            <div className="space-y-4">
              <p className="text-xs text-gray-400 font-mono mb-4">
                Override the default model for specific stages. Leave empty to use the default for your provider.
              </p>
              
              {[
                { key: 'questions', label: 'Questions Generation' },
                { key: 'blueprint', label: 'Blueprint Generation' },
                { key: 'refinement', label: 'Blueprint Refinement' },
                { key: 'mockup', label: 'Mockup Generation' }
              ].map(stage => (
                <div key={stage.key}>
                  <label className="block text-xs uppercase text-[#D4AF37] mb-1 font-mono opacity-80">
                    {stage.label}
                  </label>
                  <select
                    value={stageModels[stage.key] || ''}
                    onChange={(e) => setStageModels({ 
                      ...stageModels, 
                      [stage.key]: e.target.value || null 
                    })}
                    className="w-full bg-[#252525] border border-gray-700 rounded px-3 py-2 text-white focus:border-[#D4AF37] focus:outline-none font-mono text-sm"
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
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-[#252525] rounded-lg border border-gray-700">
                <div>
                  <p className="text-white font-medium">Enable Second Pass Refinement</p>
                  <p className="text-xs text-gray-400 font-mono mt-1">
                    Use a second AI to critique and improve the blueprint
                  </p>
                </div>
                <button
                  onClick={() => setEnableSecondPass(!enableSecondPass)}
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    enableSecondPass ? 'bg-[#D4AF37]' : 'bg-gray-600'
                  }`}
                >
                  <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                    enableSecondPass ? 'translate-x-7' : 'translate-x-1'
                  }`} />
                </button>
              </div>

              {enableSecondPass && (
                <>
                  <div>
                    <label className="block text-xs uppercase text-[#D4AF37] mb-1 font-mono opacity-80">
                      Second Pass Provider
                    </label>
                    <select
                      value={secondPassProvider}
                      onChange={(e) => {
                        setSecondPassProvider(e.target.value);
                        // Reset model to first of new provider
                        const models = AVAILABLE_MODELS[e.target.value];
                        if (models && models.length > 0) {
                          setSecondPassModel(models[0].id);
                        }
                      }}
                      className="w-full bg-[#252525] border border-gray-700 rounded px-3 py-2 text-white focus:border-[#D4AF37] focus:outline-none font-mono text-sm"
                    >
                      <option value="anthropic">Anthropic (Claude)</option>
                      <option value="openai">OpenAI</option>
                      <option value="gemini">Google Gemini</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs uppercase text-[#D4AF37] mb-1 font-mono opacity-80">
                      Second Pass Model
                    </label>
                    <select
                      value={secondPassModel}
                      onChange={(e) => setSecondPassModel(e.target.value)}
                      className="w-full bg-[#252525] border border-gray-700 rounded px-3 py-2 text-white focus:border-[#D4AF37] focus:outline-none font-mono text-sm"
                    >
                      {getModelsForProvider(secondPassProvider).map(m => (
                        <option key={m.id} value={m.id}>{m.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="p-3 bg-purple-900/20 border border-purple-500/30 rounded-lg">
                    <p className="text-xs text-purple-300 font-mono">
                      💡 Tip: Using a different provider for the second pass can give you diverse perspectives. Try GPT-4o for broad analysis or Claude for detailed technical review.
                    </p>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Server Tab */}
          {activeTab === 'server' && (
            <div className="space-y-4">
              <div className="p-4 bg-[#252525] rounded-lg border border-gray-700">
                <div className="flex items-center gap-2 mb-2">
                  <Settings2 className="w-4 h-4 text-[#D4AF37]" />
                  <p className="text-white font-medium">Self-Hosted Server</p>
                </div>
                <p className="text-xs text-gray-400 font-mono">
                  Connect to your Proxmox homelab or other self-hosted server for syncing.
                </p>
              </div>

              <div>
                <label className="block text-xs uppercase text-[#D4AF37] mb-1 font-mono opacity-80">
                  Server URL
                </label>
                <input
                  type="text"
                  value={serverUrl}
                  onChange={(e) => setServerUrl(e.target.value)}
                  placeholder="http://192.168.1.50:3001"
                  className="w-full bg-[#252525] border border-gray-700 rounded px-3 py-2 text-white focus:border-[#D4AF37] focus:outline-none font-mono text-sm"
                />
              </div>
            </div>
          )}

          {/* Security Tab */}
          {activeTab === 'security' && (
            <div className="space-y-4">
              <div className="p-4 bg-[#252525] rounded-lg border border-gray-700">
                <div className="flex items-center gap-2 mb-2">
                  <Lock className="w-4 h-4 text-[#D4AF37]" />
                  <p className="text-white font-medium">App Lock PIN</p>
                </div>
                <p className="text-xs text-gray-400 font-mono">
                  Set a PIN to lock your app on startup. This protects your API keys and ideas.
                </p>
              </div>

              <div>
                <label className="block text-xs uppercase text-[#D4AF37] mb-1 font-mono opacity-80">
                  New PIN (4-6 digits)
                </label>
                <input
                  type="password"
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                  placeholder="••••"
                  className="w-full bg-[#252525] border border-gray-700 rounded px-3 py-2 text-white focus:border-[#D4AF37] focus:outline-none font-mono text-sm tracking-widest"
                />
              </div>

              <div>
                <label className="block text-xs uppercase text-[#D4AF37] mb-1 font-mono opacity-80">
                  Confirm PIN
                </label>
                <input
                  type="password"
                  value={confirmPin}
                  onChange={(e) => setConfirmPin(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                  placeholder="••••"
                  className="w-full bg-[#252525] border border-gray-700 rounded px-3 py-2 text-white focus:border-[#D4AF37] focus:outline-none font-mono text-sm tracking-widest"
                />
              </div>

              {pinError && (
                <p className="text-red-400 text-sm font-mono">{pinError}</p>
              )}
              {pinSuccess && (
                <p className="text-emerald-400 text-sm font-mono">{pinSuccess}</p>
              )}

              <div className="flex gap-2">
                <button
                  onClick={handleSavePin}
                  className="flex-1 bg-[#D4AF37] hover:bg-[#C5A028] text-[#1A1A1A] py-2 rounded font-medium font-mono text-sm"
                >
                  Set PIN
                </button>
                <button
                  onClick={handleRemovePin}
                  className="flex-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 py-2 rounded font-medium font-mono text-sm border border-red-500/30"
                >
                  Remove PIN
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t border-[#D4AF37]/20">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-400 hover:text-white font-mono text-sm"
          >
            CANCEL
          </button>
          <button
            onClick={handleSave}
            className="bg-[#D4AF37] hover:bg-[#C5A028] text-[#1A1A1A] px-4 py-2 rounded font-medium flex items-center gap-2 font-mono text-sm"
          >
            <Save className="w-4 h-4" />
            SAVE SETTINGS
          </button>
        </div>
      </div>
    </div>
  );
}
