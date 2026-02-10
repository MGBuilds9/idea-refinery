import React, { useState } from 'react';
import { Shield, Key, Server, Lock, ArrowRight, Check, Loader2, Sparkles } from 'lucide-react';
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from 'framer-motion';
// API Key format validation patterns
const API_KEY_PATTERNS = {
  openai: {
    regex: /^sk-(proj-)?[A-Za-z0-9_-]{32,}$/,
    hint: 'OpenAI keys start with "sk-" or "sk-proj-" (40+ characters)',
    example: 'sk-proj-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
  },
  anthropic: {
    regex: /^sk-ant-[A-Za-z0-9_-]{90,}$/,
    hint: 'Anthropic keys start with "sk-ant-" (100+ characters)',
    example: 'sk-ant-api03-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx...'
  },
  gemini: {
    regex: /^[A-Za-z0-9_-]{39}$/,
    hint: 'Gemini keys are 39 alphanumeric characters',
    example: 'AIzaSyxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
  }
};

export default function OnboardingView({ onComplete }) {
  const [step, setStep] = useState(1);
  const [apiKey, setApiKey] = useState('');
  const [provider, setProvider] = useState('openai');
  const [serverUrl, setServerUrl] = useState(
    window.location.hostname === 'localhost' ? 'http://localhost:3001' : window.location.origin
  );
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isKeyFormatValid = () => {
    if (!apiKey || apiKey.length < 10) return false;
    const pattern = API_KEY_PATTERNS[provider];
    return pattern ? pattern.regex.test(apiKey) : apiKey.length >= 10;
  };

  const validateApiKey = async () => {
    setLoading(true);
    setError('');

    const pattern = API_KEY_PATTERNS[provider];
    if (pattern && !pattern.regex.test(apiKey)) {
      setError(`Invalid ${provider} API key format. ${pattern.hint}`);
      setLoading(false);
      return;
    }

    if (apiKey.length < 10) {
      setError('API key is too short');
      setLoading(false);
      return;
    }

    localStorage.setItem('llm_provider', provider);
    localStorage.setItem('llm_api_key', apiKey);

    setTimeout(() => {
      setLoading(false);
      setStep(2);
    }, 800);
  };

  // Skip setup entirely - go straight to app
  const handleSkipSetup = () => {
    localStorage.setItem('onboarding_skipped', 'true');
    localStorage.setItem('onboarding_complete', 'true');
    localStorage.setItem('sync_mode', 'local');
    // Set a dummy auth token so the app doesn't force login
    if (!localStorage.getItem('auth_token')) {
      localStorage.setItem('auth_token', 'local_skip');
    }
    onComplete();
  };

  // Step 2: Combined server + PIN (optional)
  const handleFinishSetup = async () => {
    setLoading(true);
    setError('');

    try {
      // If server URL and password provided, try to connect
      if (password) {
        const healthReq = await fetch(`${serverUrl}/health`);
        if (!healthReq.ok) throw new Error('Cannot reach server');

        const loginReq = await fetch(`${serverUrl}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password })
        });

        const data = await loginReq.json();
        if (!loginReq.ok) throw new Error(data.error || 'Login failed');

        localStorage.setItem('auth_token', data.token);
        localStorage.setItem('server_url', serverUrl);
        localStorage.setItem('sync_mode', 'server');
      } else {
        // Local-only mode
        localStorage.setItem('sync_mode', 'local');
        if (!localStorage.getItem('auth_token')) {
          localStorage.setItem('auth_token', 'local_skip');
        }
      }

      // If PIN provided, set it
      if (pin && pin.length >= 4) {
        localStorage.setItem('app_pin', pin);
      }

      localStorage.setItem('onboarding_complete', 'true');
      setLoading(false);
      setStep(3); // Success screen
      setTimeout(onComplete, 1500);
    } catch (e) {
      setLoading(false);
      setError(e.message);
    }
  };

  const handleSkipStep2 = () => {
    localStorage.setItem('sync_mode', 'local');
    localStorage.setItem('onboarding_complete', 'true');
    if (!localStorage.getItem('auth_token')) {
      localStorage.setItem('auth_token', 'local_skip');
    }
    setStep(3);
    setTimeout(onComplete, 1500);
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-white flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-[50vh] bg-gradient-to-b from-[#d4af37]/5 to-transparent pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-10">
          <Shield className="w-12 h-12 text-[#d4af37] mx-auto mb-4" />
          <h1 className="text-3xl font-bold tracking-tight mb-2">Idea Refinery</h1>
          <p className="text-zinc-400">Secure Your Intellectual Property</p>
        </div>

        <div className="bg-[#131316] border border-white/10 rounded-2xl p-8 shadow-2xl backdrop-blur-sm">
          <AnimatePresence mode="wait">

            {/* Step 1: Connect Intelligence */}
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-8 h-8 rounded-full bg-[#d4af37]/20 flex items-center justify-center text-[#d4af37] font-bold">1</div>
                  <h2 className="text-xl font-semibold">Connect Intelligence</h2>
                </div>

                <form onSubmit={e => e.preventDefault()} className="space-y-4">
                  <div>
                    <label className="block text-sm text-zinc-400 mb-1">Provider</label>
                    <select
                      value={provider}
                      onChange={(e) => setProvider(e.target.value)}
                      className="w-full bg-[#09090b] border border-white/10 rounded-lg p-3 text-white focus:border-[#d4af37] outline-none"
                    >
                      <option value="openai">OpenAI</option>
                      <option value="anthropic">Anthropic</option>
                      <option value="gemini">Gemini</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-zinc-400 mb-1">API Key</label>
                    <div className="relative">
                      <Key className="absolute left-3 top-3.5 w-4 h-4 text-zinc-500" />
                      <input
                        type="password"
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        placeholder={API_KEY_PATTERNS[provider]?.example || 'sk-...'}
                        className={`w-full bg-[#09090b] border rounded-lg p-3 pl-10 pr-10 text-white focus:border-[#d4af37] outline-none ${
                          apiKey && (isKeyFormatValid() ? 'border-emerald-500/50' : 'border-white/10')
                        }`}
                      />
                      {apiKey && isKeyFormatValid() && (
                        <Check className="absolute right-3 top-3.5 w-4 h-4 text-emerald-400" />
                      )}
                    </div>
                    <p className="text-xs text-zinc-500 mt-1.5">
                      {API_KEY_PATTERNS[provider]?.hint || 'Enter your API key'}
                    </p>
                  </div>
                  {error && <p className="text-red-400 text-sm">{error}</p>}
                </form>

                <button
                  onClick={validateApiKey}
                  disabled={loading || !apiKey}
                  className="w-full bg-[#d4af37] hover:bg-[#c5a028] text-black font-semibold p-3 rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                >
                  {loading ? <Loader2 className="animate-spin w-4 h-4" /> : 'Validate & Continue'}
                  {!loading && <ArrowRight className="w-4 h-4" />}
                </button>

                <div className="border-t border-white/10 pt-4 mt-2">
                  <button
                    onClick={handleSkipSetup}
                    className="w-full bg-transparent border border-white/10 hover:border-[#d4af37]/50 text-zinc-400 hover:text-white font-medium p-3 rounded-lg flex items-center justify-center gap-2 transition-all"
                  >
                    <Sparkles className="w-4 h-4" />
                    Skip Setup -- Explore First
                  </button>
                  <p className="text-center text-xs text-zinc-500 mt-2">
                    You can set up your API key later in Settings.
                  </p>
                </div>
              </motion.div>
            )}

            {/* Step 2: Optional Server & Security */}
            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="flex items-center gap-3 mb-2">
                  <button
                    onClick={() => { setStep(1); setError(''); }}
                    className="p-1 -ml-2 mr-1 text-zinc-500 hover:text-white transition-colors"
                  >
                    <ArrowRight className="w-5 h-5 rotate-180" />
                  </button>
                  <div className="w-8 h-8 rounded-full bg-[#d4af37]/20 flex items-center justify-center text-[#d4af37] font-bold">2</div>
                  <h2 className="text-xl font-semibold">Server & Security</h2>
                </div>
                <p className="text-xs text-zinc-500 -mt-4 ml-[72px]">Optional -- configure later in Settings</p>

                <form onSubmit={e => e.preventDefault()} className="space-y-4">
                  {/* Server Connection */}
                  <div className="p-4 bg-white/5 rounded-lg border border-white/10">
                    <div className="flex items-center gap-2 mb-3">
                      <Server className="w-4 h-4 text-[#d4af37]" />
                      <span className="text-sm font-semibold text-white">Server Sync</span>
                      <span className="text-[10px] bg-zinc-800 text-zinc-500 px-2 py-0.5 rounded-full ml-auto">OPTIONAL</span>
                    </div>
                    <div>
                      <label className="block text-sm text-zinc-400 mb-1">Server URL</label>
                      <input
                        type="text"
                        value={serverUrl}
                        onChange={(e) => setServerUrl(e.target.value)}
                        className="w-full bg-[#09090b] border border-white/10 rounded-lg p-3 text-white focus:border-[#d4af37] outline-none text-sm"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3 mt-3">
                      <div>
                        <label className="block text-xs text-zinc-400 mb-1">Username</label>
                        <input
                          type="text"
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          className="w-full bg-[#09090b] border border-white/10 rounded-lg p-2.5 text-white focus:border-[#d4af37] outline-none text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-zinc-400 mb-1">Password</label>
                        <input
                          type="password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Default: admin123"
                          className="w-full bg-[#09090b] border border-white/10 rounded-lg p-2.5 text-white focus:border-[#d4af37] outline-none text-sm"
                        />
                      </div>
                    </div>
                  </div>

                  {/* PIN Setup */}
                  <div className="p-4 bg-white/5 rounded-lg border border-white/10">
                    <div className="flex items-center gap-2 mb-3">
                      <Lock className="w-4 h-4 text-[#d4af37]" />
                      <span className="text-sm font-semibold text-white">Device PIN</span>
                      <span className="text-[10px] bg-zinc-800 text-zinc-500 px-2 py-0.5 rounded-full ml-auto">OPTIONAL</span>
                    </div>
                    <p className="text-xs text-zinc-500 mb-2">Lock the app on startup to protect your API keys.</p>
                    <input
                      type="password"
                      value={pin}
                      onChange={(e) => setPin(e.target.value.replace(/\D/g,'').slice(0,6))}
                      placeholder="4-6 digits"
                      className="w-full bg-[#09090b] border border-white/10 rounded-lg p-3 text-white focus:border-[#d4af37] outline-none tracking-widest text-lg"
                    />
                  </div>

                  {error && <p className="text-red-400 text-sm">{error}</p>}
                </form>

                <button
                  onClick={handleFinishSetup}
                  disabled={loading}
                  className="w-full bg-[#d4af37] hover:bg-[#c5a028] text-black font-semibold p-3 rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                >
                  {loading ? <Loader2 className="animate-spin w-4 h-4" /> : 'Finish Setup'}
                  {!loading && <ArrowRight className="w-4 h-4" />}
                </button>

                <button
                  onClick={handleSkipStep2}
                  className="w-full text-sm text-zinc-500 hover:text-zinc-300 transition-colors py-2"
                >
                  Skip -- Use Local Only
                </button>
                <p className="text-center text-xs text-[#d4af37]/80 px-4 -mt-4">
                  Warning: Local-only data is lost if you clear your browser cache.
                </p>
              </motion.div>
            )}

            {/* Step 3: Success */}
            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-10"
              >
                <div className="w-20 h-20 bg-[#d4af37]/20 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Check className="w-10 h-10 text-[#d4af37]" />
                </div>
                <h2 className="text-2xl font-bold mb-2">Vault Unlocked</h2>
                <p className="text-zinc-400">Setup complete. Preparing your refinery...</p>
              </motion.div>
            )}

          </AnimatePresence>
        </div>

        <div className="text-center mt-6 text-xs text-zinc-600">
           Idea Refinery v1.2 -- Local-First Architecture
        </div>
      </div>
    </div>
  );
}
