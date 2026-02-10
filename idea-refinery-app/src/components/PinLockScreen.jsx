import React, { useState, useEffect } from 'react';
import { Lock, Unlock, Delete } from 'lucide-react';

const PIN_LENGTH = 4;

export default function PinLockScreen({ onSuccess, isSetup = false }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);

  const handlePress = (num) => {
    if (pin.length < PIN_LENGTH) {
      setPin(prev => prev + num);
      setError(false);
    }
  };

  const handleDelete = () => {
    setPin(prev => prev.slice(0, -1));
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (pin.length < PIN_LENGTH && /^\d$/.test(e.key)) {
        setPin(prev => prev + e.key);
        setError(false);
      } else if (e.key === 'Backspace') {
        setPin(prev => prev.slice(0, -1));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pin]);

  useEffect(() => {
    if (pin.length === PIN_LENGTH) {
      setTimeout(async () => {
        if (isSetup) {
          try {
            const { SecureStorage } = await import('../services/secure_storage');
            await SecureStorage.setPin(pin);
            onSuccess(pin);
          } catch (e) {
            console.error(e);
            setError(true);
            setPin('');
          }
        } else {
          try {
            const { SecureStorage } = await import('../services/secure_storage');
            const isValid = await SecureStorage.verifyPin(pin);

            if (isValid) {
              onSuccess(pin);
            } else {
              setError(true);
              setPin('');
            }
          } catch (e) {
            console.error('PIN Check Error:', e);
            setError(true);
            setPin('');
          }
        }
      }, 300);
    }
  }, [pin, isSetup, onSuccess]);

  return (
    <div className="fixed inset-0 bg-[#09090b] flex flex-col items-center justify-center z-50 animate-fade-in">
      {/* Background Ambience */}
      <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-5 pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-tr from-[#d4af37]/5 to-transparent block" />

      <div className="relative z-10 mb-8 flex flex-col items-center">
        <div className={`p-6 rounded-2xl border-2 transition-all duration-300 ${error ? 'border-red-500/50 bg-red-900/10 text-red-400' : 'border-[#d4af37]/30 bg-[#d4af37]/5 text-[#d4af37]'} shadow-lg`}>
          {pin.length === PIN_LENGTH ? <Unlock size={40} className="animate-pulse" /> : <Lock size={40} />}
        </div>
        <h2 className="mt-6 text-2xl font-sans font-bold tracking-wide text-white">
          {error ? 'Incorrect PIN' : (isSetup ? 'Set Your PIN' : 'Enter PIN')}
        </h2>
        <p className="mt-2 text-sm text-zinc-500 font-sans">
          {error ? 'Please try again' : (isSetup ? 'Create a 4-digit PIN to secure your vault' : 'Unlock to access your vault')}
        </p>
      </div>

      <div className="relative z-10 flex gap-3 mb-12">
        {Array.from({ length: PIN_LENGTH }).map((_, i) => (
          <div
            key={i}
            className={`w-4 h-4 rounded-full transition-all duration-300 ${i < pin.length
                ? 'bg-[#d4af37] shadow-[0_0_12px_rgba(212,175,55,0.5)] scale-110'
                : 'bg-zinc-800 border-2 border-zinc-700'
              }`}
          />
        ))}
      </div>

      <div className="relative z-10 grid grid-cols-3 gap-4 w-80">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
          <button
            key={num}
            onClick={() => handlePress(num)}
            className="w-20 h-20 rounded-2xl border-2 border-white/10 bg-white/5 text-2xl font-sans font-bold text-white hover:bg-[#d4af37]/10 hover:border-[#d4af37]/30 hover:text-[#d4af37] transition-all active:scale-95 shadow-sm hover:shadow-md flex items-center justify-center"
          >
            {num}
          </button>
        ))}
        <div className="col-start-2">
          <button
            onClick={() => handlePress(0)}
            className="w-20 h-20 rounded-2xl border-2 border-white/10 bg-white/5 text-2xl font-sans font-bold text-white hover:bg-[#d4af37]/10 hover:border-[#d4af37]/30 hover:text-[#d4af37] transition-all active:scale-95 shadow-sm hover:shadow-md flex items-center justify-center"
          >
            0
          </button>
        </div>
        <div className="col-start-3">
          <button
            onClick={handleDelete}
            className="w-20 h-20 rounded-2xl border-2 border-transparent bg-white/5 text-zinc-500 hover:bg-red-900/10 hover:text-red-400 transition-all active:scale-95 flex items-center justify-center"
          >
            <Delete size={28} />
          </button>
        </div>
      </div>

      <p className="relative z-10 mt-12 text-xs text-zinc-600 font-sans">
        IDEA REFINERY -- Premium Edition
      </p>
    </div>
  );
}
