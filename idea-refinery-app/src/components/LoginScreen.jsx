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
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }

      localStorage.setItem('sync_mode', 'server');
      onLogin(data.token);
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center p-4 overflow-hidden bg-[#09090b] text-white">
      {/* Background Ambience */}
      <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-5 pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-tr from-[#d4af37]/5 to-transparent block" />

      <div className="relative z-10 flex flex-col items-center max-w-sm w-full px-6">

        {/* Logo */}
        <div className="relative mb-8 group">
          <div className="absolute -inset-8 bg-[#d4af37] rounded-full blur-[60px] opacity-[0.05] group-hover:opacity-[0.1] transition-opacity duration-700" />
          <img
            src="/idea-refinery-logo.svg"
            alt="Idea Refinery"
            className="w-24 h-24 object-contain drop-shadow-2xl relative z-10"
          />
        </div>

        <h2 className="text-[#d4af37] font-mono text-xl tracking-[0.2em] mb-8 uppercase">Server Access</h2>

        <form onSubmit={handleLogin} className="w-full space-y-4">
          <div className="space-y-2">
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="USERNAME"
              aria-label="Username"
              className="w-full bg-white/5 border border-[#d4af37]/20 rounded-lg py-3 px-4 text-[#d4af37] placeholder-zinc-700 focus:border-[#d4af37]/60 focus:outline-none font-mono tracking-wider transition-all duration-300"
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
              className="w-full bg-white/5 border border-[#d4af37]/20 rounded-lg py-3 px-4 text-[#d4af37] placeholder-zinc-700 focus:border-[#d4af37]/60 focus:outline-none font-mono tracking-wider transition-all duration-300"
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
            className="w-full bg-[#d4af37] hover:bg-[#c5a028] disabled:bg-zinc-900 disabled:text-zinc-600 disabled:border disabled:border-zinc-800 text-black font-bold py-3 rounded-lg transition-all duration-300 flex items-center justify-center gap-2 font-mono tracking-wider mt-4"
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
            className="mt-6 text-zinc-500 hover:text-[#d4af37] text-sm font-mono tracking-wider flex items-center gap-2 transition-colors"
          >
            <UserPlus className="w-3 h-3" />
            Create Account
          </button>
        )}
      </div>

      <div className="absolute bottom-8 text-[#d4af37]/20 text-[10px] font-mono tracking-[0.2em] uppercase">
        Restricted System
      </div>
    </div>
  );
}
