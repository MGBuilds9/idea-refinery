import React, { useState } from 'react';
import { Lock, AlertCircle, Server, UserPlus } from 'lucide-react';

export default function LoginScreen({ onLogin, onSwitchToRegister }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Get server URL from local storage or prompt
      // For now, assume relative path if served from same origin, or use configured env
      // But SyncService uses localStorage serverUrl. Let's assume we are hitting the same server we are hosted on
      // or using the configured one.
      // Ideally, the user hits the deployed app, so /api is relative.
      
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }

      // Set sync mode to server on successful login
      localStorage.setItem('sync_mode', 'server');
      onLogin(data.token);
    } catch (err) {
      console.error(err);
      // Fallback: If we are in dev mode and hitting a different port, maybe we need the full URL?
      // But typically setup is proxy.
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center p-4 overflow-hidden bg-black text-white">
      {/* Background Ambience matches PinLockScreen */}
      <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-5 pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-tr from-[#D4AF37]/5 to-transparent block" />

      <div className="relative z-10 flex flex-col items-center max-w-sm w-full px-6">
        
        {/* Logo */}
        <div className="relative mb-8 group">
          <div className="absolute -inset-8 bg-[#D4AF37] rounded-full blur-[60px] opacity-[0.05] group-hover:opacity-[0.1] transition-opacity duration-700" />
          <img 
            src="/idea-refinery-logo.svg" 
            alt="Idea Refinery" 
            className="w-24 h-24 object-contain drop-shadow-2xl relative z-10"
          />
        </div>

        <h2 className="text-[#D4AF37] font-mono text-xl tracking-[0.2em] mb-8 uppercase">Server Access</h2>

        <form onSubmit={handleLogin} className="w-full space-y-4">
          <div className="space-y-2">
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="USERNAME"
              aria-label="Username"
              className="w-full bg-[#1A1A1A]/80 border border-[#D4AF37]/20 rounded-lg py-3 px-4 text-[#D4AF37] placeholder-gray-700 focus:border-[#D4AF37]/60 focus:outline-none font-mono tracking-wider transition-all duration-300"
              autoFocus
            />
          </div>
          
          <div className="space-y-2">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="PASSWORD"
              aria-label="Password"
              className="w-full bg-[#1A1A1A]/80 border border-[#D4AF37]/20 rounded-lg py-3 px-4 text-[#D4AF37] placeholder-gray-700 focus:border-[#D4AF37]/60 focus:outline-none font-mono tracking-wider transition-all duration-300"
            />
          </div>

          {error && (
            <div role="alert" aria-live="polite" className="flex items-center justify-center gap-2 text-red-400/90 text-xs font-mono bg-red-900/10 py-2 rounded">
              <AlertCircle className="w-3 h-3" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !username || !password}
            className="w-full bg-[#D4AF37] hover:bg-[#E5C048] disabled:bg-[#252525] disabled:text-gray-600 disabled:border disabled:border-gray-800 text-[#0A0A0A] font-bold py-3 rounded-lg transition-all duration-300 flex items-center justify-center gap-2 font-mono tracking-wider mt-4"
          >
            {loading ? (
              <span className="animate-pulse">AUTHENTICATING...</span>
            ) : (
              <>
                 LOGIN
              </>
            )}
          </button>
        </form>

        {onSwitchToRegister && (
          <button
            onClick={onSwitchToRegister}
            className="mt-6 text-gray-500 hover:text-[#D4AF37] text-sm font-mono tracking-wider flex items-center gap-2 transition-colors"
          >
            <UserPlus className="w-3 h-3" />
            Create Account
          </button>
        )}
      </div>
      
      <div className="absolute bottom-8 text-[#D4AF37]/20 text-[10px] font-mono tracking-[0.2em] uppercase">
        Restricted System
      </div>
    </div>
  );
}

