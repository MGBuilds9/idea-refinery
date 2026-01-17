import React, { useState } from 'react';
import { Shield, Key, Server, Lock, ArrowRight, Check, Loader2 } from 'lucide-react';
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
  const [newPassword, setNewPassword] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [skippedApiKey, setSkippedApiKey] = useState(false);

  // Check if API key format is valid for current provider
  const isKeyFormatValid = () => {
    if (!apiKey || apiKey.length < 10) return false;
    const pattern = API_KEY_PATTERNS[provider];
    return pattern ? pattern.regex.test(apiKey) : apiKey.length >= 10;
  };

  // Step 1: API Key Validation
  const validateApiKey = async () => {
    setLoading(true);
    setError('');
    
    // Provider-specific format validation
    const pattern = API_KEY_PATTERNS[provider];
    if (pattern && !pattern.regex.test(apiKey)) {
      setError(`Invalid ${provider} API key format. ${pattern.hint}`);
      setLoading(false);
      return;
    }
    
    // Fallback: basic length check
    if (apiKey.length < 10) {
      setError('API key is too short');
      setLoading(false);
      return;
    }
    
    // Store in localStorage (eventually synced)
    localStorage.setItem('llm_provider', provider);
    localStorage.setItem('llm_api_key', apiKey); // Allow user to manage this secure storage later
    
    // Simulate check
    setTimeout(() => {
      setLoading(false);
      setStep(2);
    }, 800);
  };

  // Step 2: Server Connection
  const connectServer = async () => {
    setLoading(true);
    setError('');
    
    try {
      // First, try health check
      const healthReq = await fetch(`${serverUrl}/health`);
      if (!healthReq.ok) throw new Error('Cannot reach server');

      // Try login
      const loginReq = await fetch(`${serverUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await loginReq.json();
      
      if (!loginReq.ok) {
        throw new Error(data.error || 'Login failed');
      }

      // Store Auth Token
      localStorage.setItem('auth_token', data.token);
      localStorage.setItem('server_url', serverUrl);
      
      setLoading(false);
      setStep(3);
    } catch (e) {
      setLoading(false);
      setError(e.message);
    }
  };

  // Step 3: Security (Change PW + Set PIN)
  const setupSecurity = async () => {
    setLoading(true);
    setError('');

    if (pin.length < 4) {
      setError('PIN must be at least 4 digits');
      setLoading(false);
      return;
    }

    if (newPassword && newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      setLoading(false);
      return;
    }

    try {
      const token = localStorage.getItem('auth_token');
      
      // If user provided a new password, change it
      if (newPassword) {
        const pwReq = await fetch(`${serverUrl}/api/auth/change-password`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ newPassword })
        });
        
        if (!pwReq.ok) throw new Error('Failed to update password');
      }

      // Save PIN locally
      localStorage.setItem('app_pin', pin);
      localStorage.setItem('onboarding_complete', 'true');

      setLoading(false);
      // Finish
      setStep(4);
      setTimeout(onComplete, 1500); 
    } catch (e) {
      setLoading(false);
      setError(e.message);
    }
  };

  const handleSkipToLogin = () => {
    setSkippedApiKey(true);
    setStep(2);
    setError('');
  };

  const handleBackToExplanations = () => {
    setStep(1);
    setSkippedApiKey(false);
    setError('');
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-white flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-[50vh] bg-gradient-to-b from-[#d4af37]/5 to-transparent pointer-events-none" />
      
      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-10">
          <Shield className="w-12 h-12 text-[#d4af37] mx-auto mb-4" />
          <h1 className="text-3xl font-bold tracking-tight mb-2">Idea Refinery</h1>
          <p className="text-gray-400">Secure Your Intellectual Property</p>
        </div>

        <div className="bg-[#111] border border-[#333] rounded-2xl p-8 shadow-2xl backdrop-blur-sm">
          <AnimatePresence mode="wait">
            
            {/* Step 1: Intelligence */}
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

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Provider</label>
                    <select 
                      value={provider}
                      onChange={(e) => setProvider(e.target.value)}
                      className="w-full bg-[#09090b] border border-[#333] rounded-lg p-3 text-white focus:border-[#d4af37] outline-none"
                    >
                      <option value="openai">OpenAI</option>
                      <option value="anthropic">Anthropic</option>
                      <option value="gemini">Gemini</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">API Key</label>
                    <div className="relative">
                      <Key className="absolute left-3 top-3.5 w-4 h-4 text-gray-500" />
                      <input 
                        type="password"
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        placeholder={API_KEY_PATTERNS[provider]?.example || 'sk-...'}
                        className={`w-full bg-[#09090b] border rounded-lg p-3 pl-10 pr-10 text-white focus:border-[#d4af37] outline-none ${
                          apiKey && (isKeyFormatValid() ? 'border-emerald-500/50' : 'border-[#333]')
                        }`}
                      />
                      {apiKey && isKeyFormatValid() && (
                        <Check className="absolute right-3 top-3.5 w-4 h-4 text-emerald-400" />
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-1.5">
                      {API_KEY_PATTERNS[provider]?.hint || 'Enter your API key'}
                    </p>
                  </div>
                  {error && <p className="text-red-400 text-sm">{error}</p>}
                </div>

                <button 
                  onClick={validateApiKey}
                  disabled={loading || !apiKey}
                  className="w-full bg-[#d4af37] hover:bg-[#b5952f] text-black font-semibold p-3 rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                >
                  {loading ? <Loader2 className="animate-spin w-4 h-4" /> : 'Validate & Continue'}
                  {!loading && <ArrowRight className="w-4 h-4" />}
                </button>

                {/* Option for existing users */}
                <div className="mt-4 text-center">
                    <button 
                        onClick={handleSkipToLogin}
                        className="text-sm text-[#d4af37] hover:underline hover:text-[#b5952f] transition-colors"
                    >
                        Already have an account? Login to Server
                    </button>
                </div>
              </motion.div>
            )}

            {/* Step 2: Server Sync */}
            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="flex items-center gap-3 mb-6">
                  {skippedApiKey && (
                      <button 
                        onClick={handleBackToExplanations}
                        className="p-1 -ml-2 mr-1 text-gray-500 hover:text-white transition-colors"
                      >
                          <ArrowRight className="w-5 h-5 rotate-180" />
                      </button>
                  )}
                  <div className="w-8 h-8 rounded-full bg-[#d4af37]/20 flex items-center justify-center text-[#d4af37] font-bold">2</div>
                  <h2 className="text-xl font-semibold">Server Link</h2>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Server URL</label>
                    <div className="relative">
                      <Server className="absolute left-3 top-3.5 w-4 h-4 text-gray-500" />
                      <input 
                        type="text"
                        value={serverUrl}
                        onChange={(e) => setServerUrl(e.target.value)}
                        className="w-full bg-[#09090b] border border-[#333] rounded-lg p-3 pl-10 text-white focus:border-[#d4af37] outline-none"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Username</label>
                      <input 
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="w-full bg-[#09090b] border border-[#333] rounded-lg p-3 text-white focus:border-[#d4af37] outline-none"
                      />
                    </div>
                    <div>
                       <label className="block text-sm text-gray-400 mb-1">Password</label>
                      <input 
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Default: admin123"
                        className="w-full bg-[#09090b] border border-[#333] rounded-lg p-3 text-white focus:border-[#d4af37] outline-none"
                      />
                    </div>
                  </div>
                  {error && <p className="text-red-400 text-sm">{error}</p>}
                </div>

                <button 
                  onClick={connectServer}
                  disabled={loading}
                  className="w-full bg-[#d4af37] hover:bg-[#b5952f] text-black font-semibold p-3 rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                >
                  {loading ? <Loader2 className="animate-spin w-4 h-4" /> : 'Connect Server'}
                  {!loading && <ArrowRight className="w-4 h-4" />}
                </button>

                {/* Local Only Option - Only show if they didn't skip the API key part */}
                {!skippedApiKey && (
                    <div className="border-t border-[#333] pt-4 mt-2">
                    <button 
                        onClick={() => {
                        // Set local mode
                        localStorage.setItem('sync_mode', 'local');
                        setStep(3);
                        }}
                        className="w-full bg-transparent border border-[#444] hover:border-[#d4af37]/50 text-gray-400 hover:text-white font-medium p-3 rounded-lg flex items-center justify-center gap-2 transition-all"
                    >
                        Skip — Use Local Only
                    </button>
                    <p className="text-center text-xs text-amber-500/80 mt-3 px-4">
                        ⚠️ Your generations and API keys will only exist in this browser. Clearing your cache will <strong>permanently delete</strong> your data.
                    </p>
                    </div>
                )}
              </motion.div>
            )}

            {/* Step 3: Secure & Lock */}
            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-8 h-8 rounded-full bg-[#d4af37]/20 flex items-center justify-center text-[#d4af37] font-bold">3</div>
                  <h2 className="text-xl font-semibold">Secure Vault</h2>
                </div>

                <div className="p-3 bg-red-900/20 border border-red-900/50 rounded-lg text-sm text-red-200">
                  Highly recommended: Change the default admin password now.
                </div>

                <div className="space-y-4">
                   <div>
                    <label className="block text-sm text-gray-400 mb-1">New Admin Password (Optional)</label>
                    <input 
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Leave blank to keep current"
                      className="w-full bg-[#09090b] border border-[#333] rounded-lg p-3 text-white focus:border-[#d4af37] outline-none"
                    />
                  </div>

                  <div className="border-t border-[#333] pt-4 mt-2">
                     <label className="block text-sm text-[#d4af37] font-semibold mb-1">Set Device PIN Code</label>
                     <p className="text-xs text-gray-500 mb-2">This is used for daily quick-access to this device.</p>
                     <div className="relative">
                      <Lock className="absolute left-3 top-3.5 w-4 h-4 text-gray-500" />
                      <input 
                        type="password"
                        value={pin}
                        onChange={(e) => setPin(e.target.value.replace(/\D/g,'').slice(0,6))}
                        placeholder="4-6 digits"
                        className="w-full bg-[#09090b] border border-[#333] rounded-lg p-3 pl-10 text-white focus:border-[#d4af37] outline-none tracking-widest text-lg"
                      />
                    </div>
                  </div>
                  {error && <p className="text-red-400 text-sm">{error}</p>}
                </div>

                <button 
                  onClick={setupSecurity}
                  disabled={loading || pin.length < 4}
                  className="w-full bg-[#d4af37] hover:bg-[#b5952f] text-black font-semibold p-3 rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                >
                  {loading ? <Loader2 className="animate-spin w-4 h-4" /> : 'Seal & Unlock'}
                  {!loading && <ArrowRight className="w-4 h-4" />}
                </button>
              </motion.div>
            )}

            {/* Step 4: Success */}
             {step === 4 && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-10"
              >
                <div className="w-20 h-20 bg-[#d4af37]/20 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Check className="w-10 h-10 text-[#d4af37]" />
                </div>
                <h2 className="text-2xl font-bold mb-2">Vault Unlocked</h2>
                <p className="text-gray-400">Setup complete. Preparing your refinery...</p>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
        
        <div className="text-center mt-6 text-xs text-gray-600">
           Idea Refinery v1.2 • Local-First Architecture
        </div>
      </div>
    </div>
  );
}
