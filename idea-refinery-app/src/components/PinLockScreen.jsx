import React, { useState, useEffect } from 'react';
import { Lock, Unlock, AlertCircle } from 'lucide-react';
import { hashPin } from '../services/crypto';
import { getSetting } from '../services/db';

export default function PinLockScreen({ onUnlock }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleUnlock = async () => {
    if (pin.length < 4) return;
    setLoading(true);
    setError('');

    try {
      const storedHash = await getSetting('pinHash');
      const inputHash = await hashPin(pin);

      if (storedHash === inputHash) {
        onUnlock(pin);
      } else {
        setError('Incorrect PIN');
        setPin('');
      }
    } catch (e) {
      console.error(e);
      setError('Error verifying PIN');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleUnlock();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center p-4 overflow-hidden bg-gradient-to-b from-[#1A1A1A] via-[#111] to-black text-white">
      {/* Background Ambience */}
      <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-5 pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-tr from-[#D4AF37]/5 to-transparent block" />

      <div className="relative z-10 flex flex-col items-center max-w-sm w-full px-6">
        
        {/* Logo Section with Glow */}
        <div className="relative mb-12 group">
          <div className="absolute -inset-8 bg-[#D4AF37] rounded-full blur-[60px] opacity-[0.08] group-hover:opacity-[0.15] transition-opacity duration-700 animate-pulse" />
          <img 
            src="/idea-refinery-logo.svg" 
            alt="Idea Refinery" 
            className="w-32 h-32 md:w-36 md:h-36 object-contain drop-shadow-2xl relative z-10 animate-fade-in"
          />
        </div>

        <p className="text-gray-400 text-xs mb-8 font-mono tracking-[0.2em] uppercase opacity-60">
          Enter Security Protocol
        </p>

        {/* Input Section */}
        <div className="w-full space-y-6">
          <div className="relative group">
            <input
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
              onKeyPress={handleKeyPress}
              placeholder="PIN"
              className="w-full bg-[#1A1A1A]/80 border border-[#D4AF37]/20 rounded-xl py-5 text-center text-3xl tracking-[1em] text-[#D4AF37] placeholder-gray-800 focus:border-[#D4AF37]/60 focus:outline-none font-mono transition-all duration-300 input-glow shadow-inner"
              autoFocus
            />
          </div>
          
          {error && (
            <div className="flex items-center justify-center gap-2 text-red-400/90 text-xs font-mono animate-bounce bg-red-900/10 py-2 rounded">
              <AlertCircle className="w-3 h-3" />
              <span>{error}</span>
            </div>
          )}

          <button
            onClick={handleUnlock}
            disabled={pin.length < 4 || loading}
            className="w-full bg-[#D4AF37] hover:bg-[#E5C048] disabled:bg-[#252525] disabled:text-gray-600 disabled:border disabled:border-gray-800 text-[#0A0A0A] font-bold py-4 rounded-xl transition-all duration-300 flex items-center justify-center gap-2 font-mono tracking-wider translate-y-0 hover:-translate-y-1 active:translate-y-0 shadow-[0_5px_15px_-5px_rgba(212,175,55,0.3)]"
          >
            {loading ? (
              <span className="animate-pulse">VERIFYING...</span>
            ) : (
              <>
                <Unlock className="w-4 h-4" /> UNLOCK VAULT
              </>
            )}
          </button>
        </div>
      </div>
      
      {/* Footer */}
      <div className="absolute bottom-8 text-[#D4AF37]/20 text-[10px] font-mono tracking-[0.2em] uppercase">
        Built by MKG Builds
      </div>
    </div>
  );
}
