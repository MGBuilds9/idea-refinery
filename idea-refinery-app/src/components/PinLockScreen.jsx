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
      // Simulate verification delay
      setTimeout(async () => {
        if (isSetup) {
          // New Setup Flow: Set PIN in SecureStorage
          try {
            const { SecureStorage } = await import('../services/secure_storage');
            await SecureStorage.setPin(pin);
            onSuccess(pin); // Pass pin back for key re-encryption if needed
          } catch (e) {
            console.error(e);
            setError(true);
            setPin('');
          }
        } else {
          // Verification Flow
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
            setError(true); // Fail secure
            setPin('');
          }
        }
      }, 300);
    }
  }, [pin, isSetup, onSuccess]);

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-blue-50 via-white to-orange-50 flex flex-col items-center justify-center z-50 animate-fade-in">
      <div className="mb-8 flex flex-col items-center">
        <div className={`p-6 rounded-2xl border-2 transition-all duration-300 ${error ? 'border-red-400 bg-red-50 text-red-500' : 'border-[var(--color-primary)] bg-blue-50 text-[var(--color-primary)]'} shadow-lg`}>
          {pin.length === PIN_LENGTH ? <Unlock size={40} className="animate-pulse" /> : <Lock size={40} />}
        </div>
        <h2 className="mt-6 text-2xl font-[var(--font-heading)] font-bold tracking-wide text-[var(--color-text)]">
          {error ? 'Incorrect PIN' : (isSetup ? 'Set Your PIN' : 'Enter PIN')}
        </h2>
        <p className="mt-2 text-sm text-[var(--color-text-muted)] font-[var(--font-body)]">
          {error ? 'Please try again' : (isSetup ? 'Create a 4-digit PIN to secure your vault' : 'Unlock to access your vault')}
        </p>
      </div>

      <div className="flex gap-3 mb-12">
        {Array.from({ length: PIN_LENGTH }).map((_, i) => (
          <div
            key={i}
            className={`w-4 h-4 rounded-full transition-all duration-300 ${i < pin.length
                ? 'bg-[var(--color-primary)] shadow-[0_0_12px_rgba(59,130,246,0.5)] scale-110'
                : 'bg-gray-200 border-2 border-gray-300'
              }`}
          />
        ))}
      </div>

      <div className="grid grid-cols-3 gap-4 w-80">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
          <button
            key={num}
            onClick={() => handlePress(num)}
            className="w-20 h-20 rounded-2xl border-2 border-[var(--color-border)] bg-white text-2xl font-[var(--font-heading)] font-bold text-[var(--color-text)] hover:bg-blue-50 hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition-all active:scale-95 shadow-sm hover:shadow-md flex items-center justify-center"
          >
            {num}
          </button>
        ))}
        <div className="col-start-2">
          <button
            onClick={() => handlePress(0)}
            className="w-20 h-20 rounded-2xl border-2 border-[var(--color-border)] bg-white text-2xl font-[var(--font-heading)] font-bold text-[var(--color-text)] hover:bg-blue-50 hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition-all active:scale-95 shadow-sm hover:shadow-md flex items-center justify-center"
          >
            0
          </button>
        </div>
        <div className="col-start-3">
          <button
            onClick={handleDelete}
            className="w-20 h-20 rounded-2xl border-2 border-transparent bg-gray-100 text-[var(--color-text-muted)] hover:bg-red-50 hover:text-red-500 transition-all active:scale-95 flex items-center justify-center"
          >
            <Delete size={28} />
          </button>
        </div>
      </div>

      <p className="mt-12 text-xs text-[var(--color-text-muted)] font-[var(--font-body)]">
        IDEA REFINERY • Premium Edition
      </p>
    </div>
  );
}
