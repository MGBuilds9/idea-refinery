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
    if (pin.length === PIN_LENGTH) {
      // Simulate verification delay
      setTimeout(() => {
        if (isSetup) {
          localStorage.setItem('local_pin', pin);
          onSuccess();
        } else {
          const stored = localStorage.getItem('local_pin');
          if (stored === pin) {
             onSuccess(pin);
          } else {
            setError(true);
            setPin('');
          }
        }
      }, 300);
    }
  }, [pin, isSetup, onSuccess]);

  return (
    <div className="fixed inset-0 bg-zinc-950 flex flex-col items-center justify-center z-50 animate-fade-in text-gold">
      <div className="mb-8 flex flex-col items-center">
        <div className={`p-4 rounded-full border-2 ${error ? 'border-red-500 text-red-500' : 'border-gold text-gold'} transition-all duration-300`}>
           {pin.length === PIN_LENGTH ? <Unlock size={32} /> : <Lock size={32} />}
        </div>
        <h2 className="mt-4 text-xl font-serif tracking-widest uppercase text-gold/80">
          {error ? 'Access Denied' : (isSetup ? 'Set Vault PIN' : 'Enter Vault PIN')}
        </h2>
      </div>

      <div className="flex gap-4 mb-12">
        {Array.from({ length: PIN_LENGTH }).map((_, i) => (
          <div 
            key={i} 
            className={`w-4 h-4 rounded-full border border-gold/50 transition-all duration-300 ${i < pin.length ? 'bg-gold shadow-[0_0_10px_rgba(212,175,55,0.5)]' : 'bg-transparent'}`}
          />
        ))}
      </div>

      <div className="grid grid-cols-3 gap-6 w-72">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
          <button
            key={num}
            onClick={() => handlePress(num)}
            className="w-16 h-16 rounded-full border border-zinc-800 bg-zinc-900/50 text-2xl font-mono text-gold hover:bg-gold/10 hover:border-gold/50 transition-all active:scale-95 flex items-center justify-center"
          >
            {num}
          </button>
        ))}
        <div className="col-start-2">
           <button
            onClick={() => handlePress(0)}
            className="w-16 h-16 rounded-full border border-zinc-800 bg-zinc-900/50 text-2xl font-mono text-gold hover:bg-gold/10 hover:border-gold/50 transition-all active:scale-95 flex items-center justify-center"
          >
            0
          </button>
        </div>
         <div className="col-start-3">
           <button
            onClick={handleDelete}
            className="w-16 h-16 rounded-full border border-transparent text-gold/50 hover:text-red-400 transition-all active:scale-95 flex items-center justify-center"
          >
            <Delete size={24} />
          </button>
        </div>
      </div>
    </div>
  );
}
