import React, { useState, useEffect } from 'react';
import { Save, RotateCcw, AlertTriangle, Loader2 } from 'lucide-react';

// Default prompt keys we support
const PROMPT_TYPES = [
  { id: 'questions', label: 'Clarifying Questions', desc: 'Generates initial questions for the user.' },
  { id: 'blueprint', label: 'Blueprint Generator', desc: 'Creates the core technical markdown plan.' },
  { id: 'refine', label: 'Refinement Agent', desc: 'Handles follow-up requests and edits.' },
  { id: 'mockup', label: 'Mockup / Visualizer', desc: 'Generates the HTML preview.' }
];

export default function PromptStudio() {
  const [activeType, setActiveType] = useState('questions');
  // const [prompts, setPrompts] = useState({}); // Unused, we use localEdits
  const [localEdits, setLocalEdits] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const token = localStorage.getItem('auth_token');
  const serverUrl = localStorage.getItem('server_url') || 'http://localhost:3001';

  // Fetch prompts on mount
  useEffect(() => {
    const fetchPrompts = async () => {
        try {
          setLoading(true);
          const res = await fetch(`${serverUrl}/api/prompts`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (res.ok) {
            const data = await res.json();
            const map = {};
            data.forEach(p => {
              try {
                 map[p.type] = p.content;
              } catch {
                 map[p.type] = p.content;
              }
            });
            // Initialize local edits with fetched data
            const splits = {};
            PROMPT_TYPES.forEach(t => {
               splits[t.id] = map[t.id] || ''; 
            });
            setLocalEdits(splits);
          }
        } catch (e) {
          console.error('Failed to load prompts', e);
        } finally {
          setLoading(false);
        }
      };
    
    fetchPrompts();
  }, [serverUrl, token]); // Added dependencies

  const handleSave = async () => {
    setSaving(true);
    setMessage('');
    try {
      const content = localEdits[activeType];
      try {
        JSON.parse(content);
      } catch {
        if (!window.confirm("Warning: This prompt doesn't look like valid JSON. The app expects { system: '...', prompt: '...' }. Save anyway?")) {
           setSaving(false);
           return;
        }
      }

      const res = await fetch(`${serverUrl}/api/prompts`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ type: activeType, content })
      });

      if (res.ok) {
        setMessage('Saved successfully');
        setTimeout(() => setMessage(''), 3000);
      } else {
        throw new Error('Save failed');
      }
    } catch {
      setMessage('Error saving prompt');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!window.confirm('Are you sure you want to reset this prompt to the system default?')) return;
    
    setSaving(true);
    try {
      const res = await fetch(`${serverUrl}/api/prompts/reset`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ type: activeType })
      });
      
      if (res.ok) {
        const data = await res.json();
        setLocalEdits(prev => ({ ...prev, [activeType]: data.content }));
        setMessage('Reset to default');
      }
    } catch (e) {
       console.error(e);
       setMessage('Reset failed');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (val) => {
    setLocalEdits(prev => ({ ...prev, [activeType]: val }));
  };

  return (
    <div className="h-full flex flex-col bg-[#09090b] text-white">
      {/* Header */}
      <div className="p-6 border-b border-[#333] flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Prompt Studio</h2>
          <p className="text-gray-400 text-sm">Fine-tune the intelligence of the Vault.</p>
        </div>
        <div className="flex items-center gap-3">
          {message && <span className="text-emerald-400 text-sm animate-pulse">{message}</span>}
          <button 
            onClick={handleReset}
            className="p-2 text-gray-400 hover:text-white hover:bg-[#222] rounded-md transition-colors"
            title="Reset to Default"
          >
            <RotateCcw className="w-5 h-5" />
          </button>
          <button 
            onClick={handleSave}
            disabled={saving}
            className="bg-[#d4af37] text-black px-4 py-2 rounded-md font-semibold hover:bg-[#b5952f] transition-colors flex items-center gap-2"
          >
            {saving ? <Loader2 className="animate-spin w-4 h-4"/> : <Save className="w-4 h-4" />}
            Save Changes
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <div className="w-64 border-r border-[#333] bg-[#111] overflow-y-auto">
          {PROMPT_TYPES.map(type => (
            <button
              key={type.id}
              onClick={() => setActiveType(type.id)}
              className={`w-full text-left p-4 border-b border-[#222] hover:bg-[#1a1a1a] transition-colors ${activeType === type.id ? 'bg-[#1a1a1a] border-l-4 border-l-[#d4af37]' : ''}`}
            >
              <div className="font-medium text-sm mb-1">{type.label}</div>
              <div className="text-xs text-gray-500">{type.desc}</div>
            </button>
          ))}
        </div>

        {/* Editor */}
        <div className="flex-1 p-6 overflow-hidden flex flex-col">
            <div className="bg-[#1a1a1a] border border-[#333] rounded-lg flex-1 flex flex-col overflow-hidden">
               <div className="bg-[#111] px-4 py-2 text-xs text-gray-500 border-b border-[#333] flex items-center gap-2">
                 <AlertTriangle className="w-3 h-3 text-yellow-500" />
                 <span>Editing RAW JSON configuration. Be careful with syntax. Valid keys: "system", "prompt".</span>
               </div>
               {loading ? (
                  <div className="flex-1 flex items-center justify-center">
                    <Loader2 className="w-8 h-8 text-[#d4af37] animate-spin" />
                  </div>
               ) : (
                 <textarea 
                    value={localEdits[activeType] || ''}
                    onChange={(e) => handleChange(e.target.value)}
                    className="flex-1 w-full bg-[#09090b] text-white p-4 font-mono text-sm leading-relaxed outline-none resize-none"
                    spellCheck="false"
                 />
               )}
            </div>
        </div>
      </div>
    </div>
  );
}
