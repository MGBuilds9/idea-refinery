import React, { useState } from 'react';
import { UserPlus, AlertCircle, ArrowLeft, Server, Loader2 } from 'lucide-react';

export default function RegisterScreen({ onRegister, onSwitchToLogin, serverUrl: initialServerUrl }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [serverUrl, setServerUrl] = useState(
    initialServerUrl || (window.location.hostname === 'localhost' ? 'http://localhost:3001' : window.location.origin)
  );
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (username.length < 3) {
      setError('Username must be at least 3 characters');
      return;
    }

    setLoading(true);

    try {
      const baseUrl = serverUrl.replace(/\/$/, '');
      const response = await fetch(`${baseUrl}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Registration failed');
      }

      // Store auth info
      localStorage.setItem('auth_token', data.token);
      localStorage.setItem('username', username);
      localStorage.setItem('server_url', serverUrl);
      localStorage.setItem('sync_mode', 'server');

      onRegister(data.token);
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center p-4 overflow-hidden bg-black text-white">
      {/* Background Ambience */}
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

        <h2 className="text-[#D4AF37] font-mono text-xl tracking-[0.2em] mb-8 uppercase">Create Account</h2>

        <form onSubmit={handleRegister} className="w-full space-y-4">
          <div>
            <div className="relative">
              <Server className="absolute left-3 top-3.5 w-4 h-4 text-gray-500" />
              <input
                type="text"
                value={serverUrl}
                onChange={(e) => setServerUrl(e.target.value)}
                placeholder="SERVER URL"
                className="w-full bg-[#1A1A1A]/80 border border-[#D4AF37]/20 rounded-lg py-3 px-4 pl-10 text-[#D4AF37] placeholder-gray-700 focus:border-[#D4AF37]/60 focus:outline-none font-mono tracking-wider transition-all duration-300 text-sm"
              />
            </div>
          </div>

          <div>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="USERNAME"
              className="w-full bg-[#1A1A1A]/80 border border-[#D4AF37]/20 rounded-lg py-3 px-4 text-[#D4AF37] placeholder-gray-700 focus:border-[#D4AF37]/60 focus:outline-none font-mono tracking-wider transition-all duration-300"
              autoFocus
            />
          </div>
          
          <div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="PASSWORD"
              className="w-full bg-[#1A1A1A]/80 border border-[#D4AF37]/20 rounded-lg py-3 px-4 text-[#D4AF37] placeholder-gray-700 focus:border-[#D4AF37]/60 focus:outline-none font-mono tracking-wider transition-all duration-300"
            />
          </div>

          <div>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="CONFIRM PASSWORD"
              className="w-full bg-[#1A1A1A]/80 border border-[#D4AF37]/20 rounded-lg py-3 px-4 text-[#D4AF37] placeholder-gray-700 focus:border-[#D4AF37]/60 focus:outline-none font-mono tracking-wider transition-all duration-300"
            />
          </div>

          {error && (
            <div className="flex items-center justify-center gap-2 text-red-400/90 text-xs font-mono bg-red-900/10 py-2 rounded">
              <AlertCircle className="w-3 h-3" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !username || !password || !confirmPassword}
            className="w-full bg-[#D4AF37] hover:bg-[#E5C048] disabled:bg-[#252525] disabled:text-gray-600 disabled:border disabled:border-gray-800 text-[#0A0A0A] font-bold py-3 rounded-lg transition-all duration-300 flex items-center justify-center gap-2 font-mono tracking-wider mt-4"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <UserPlus className="w-4 h-4" />
                CREATE ACCOUNT
              </>
            )}
          </button>
        </form>

        <button
          onClick={onSwitchToLogin}
          className="mt-6 text-gray-500 hover:text-[#D4AF37] text-sm font-mono tracking-wider flex items-center gap-2 transition-colors"
        >
          <ArrowLeft className="w-3 h-3" />
          Already have an account? Login
        </button>
      </div>
      
      <div className="absolute bottom-8 text-[#D4AF37]/20 text-[10px] font-mono tracking-[0.2em] uppercase">
        Secure Registration
      </div>
    </div>
  );
}
