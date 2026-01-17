import React, { useState, useEffect } from 'react';
import { Save, RotateCcw, Loader2 } from 'lucide-react';

// Default prompt keys we support
const PROMPT_TYPES = [
  { id: 'questions', label: 'Clarifying Questions', desc: 'Generates initial questions for the user.' },
  { id: 'blueprint', label: 'Blueprint Generator', desc: 'Creates the core technical markdown plan.' },
  { id: 'refine', label: 'Refinement Agent', desc: 'Handles follow-up requests and edits.' },
  { id: 'mockup', label: 'Mockup / Visualizer', desc: 'Generates the HTML preview.' }
];

export default function PromptStudio() {
  const [activeType, setActiveType] = useState('questions');
  // Store structured edits: { system: string, prompt: string }
  const [localEdits, setLocalEdits] = useState({}); 
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const token = localStorage.getItem('auth_token');
  const serverUrl = localStorage.getItem('server_url') || 
    (window.location.hostname === 'localhost' ? 'http://localhost:3001' : window.location.origin);

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
                 // Try to parse the content as JSON
                 const parsed = JSON.parse(p.content);
                 // Ensure we have expected keys, otherwise fallback
                 if (typeof parsed === 'object' && parsed !== null) {
                    map[p.type] = { 
                        system: parsed.system || '', 
                        prompt: parsed.prompt || '' 
                    };
                 } else {
                    // Fallback for non-object content (shouldn't happen with strict schema but safe to handle)
                    map[p.type] = { system: '', prompt: String(p.content) };
                 }
              } catch {
                 // If it's not JSON, treat it as just the prompt part or handle gracefully
                 map[p.type] = { system: '', prompt: p.content };
              }
            });
            
            // Initialize local edits with fetched data
            const splits = {};
            PROMPT_TYPES.forEach(t => {
               splits[t.id] = map[t.id] || { system: '', prompt: '' }; 
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
  }, [serverUrl, token]);

  const handleSave = async () => {
    setSaving(true);
    setMessage('');
    try {
      const currentEdit = localEdits[activeType] || { system: '', prompt: '' };
      
      // Reconstruct the JSON structure
      const contentPayload = JSON.stringify({
          system: currentEdit.system,
          prompt: currentEdit.prompt
      });

      const res = await fetch(`${serverUrl}/api/prompts`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ type: activeType, content: contentPayload })
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
        // Parse the default content response
        let parsedDefault = { system: '', prompt: '' };
        try {
            const parsed = JSON.parse(data.content);
            parsedDefault = { 
                system: parsed.system || '', 
                prompt: parsed.prompt || '' 
            };
        } catch (e) {
            console.error("Failed to parse default prompt", e);
        }

        setLocalEdits(prev => ({ ...prev, [activeType]: parsedDefault }));
        setMessage('Reset to default');
      }
    } catch (e) {
       console.error(e);
       setMessage('Reset failed');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field, val) => {
    setLocalEdits(prev => ({
        ...prev,
        [activeType]: {
            ...prev[activeType],
            [field]: val
        }
    }));
  };

  const currentData = localEdits[activeType] || { system: '', prompt: '' };

  return (
    <div className="h-full flex flex-col bg-[#09090b] text-white">
      {/* Header */}
      <div className="p-4 md:p-6 border-b border-[#333] flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-bold">Prompt Studio</h2>
          <p className="text-gray-400 text-xs md:text-sm">Fine-tune the intelligence of the Vault.</p>
        </div>
        <div className="flex items-center gap-2 md:gap-3 w-full md:w-auto justify-end">
          {message && <span className="text-emerald-400 text-xs md:text-sm animate-pulse mr-auto md:mr-0">{message}</span>}
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
            className="bg-[#d4af37] text-black px-4 py-2 rounded-md font-semibold hover:bg-[#b5952f] transition-colors flex items-center gap-2 text-sm md:text-base whitespace-nowrap"
          >
            {saving ? <Loader2 className="animate-spin w-4 h-4"/> : <Save className="w-4 h-4" />}
            Save Changes
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Sidebar */}
        <div className="w-full md:w-64 border-b md:border-b-0 md:border-r border-[#333] bg-[#111] overflow-x-auto md:overflow-y-auto flex md:block shrink-0">
          {PROMPT_TYPES.map(type => (
            <button
              key={type.id}
              onClick={() => setActiveType(type.id)}
              className={`min-w-[160px] md:w-full text-left p-3 md:p-4 border-r md:border-r-0 md:border-b border-[#222] hover:bg-[#1a1a1a] transition-colors ${activeType === type.id ? 'bg-[#1a1a1a] border-b-2 md:border-b border-[#d4af37] md:border-l-4 md:border-l-[#d4af37]' : ''}`}
            >
              <div className="font-medium text-sm mb-1 whitespace-nowrap md:whitespace-normal">{type.label}</div>
              <div className="text-xs text-gray-500 hidden md:block">{type.desc}</div>
            </button>
          ))}
        </div>

        {/* Editor */}
        <div className="flex-1 p-4 md:p-6 overflow-y-auto flex flex-col gap-4 md:gap-6">
           {loading ? (
              <div className="flex-1 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-[#d4af37] animate-spin" />
              </div>
           ) : (
             <>
                {/* System Context Section */}
                <div className="flex-none md:flex-[2] flex flex-col min-h-[200px] md:min-h-0 bg-[#1a1a1a] border border-[#333] rounded-lg overflow-hidden shrink-0">
                   <div className="bg-[#111] px-4 py-2 text-xs font-semibold text-gray-400 border-b border-[#333] flex items-center justify-between">
                     <span>SYSTEM CONTEXT</span>
                     <span className="text-[#d4af37] opacity-60">Global</span>
                   </div>
                   <textarea 
                      value={currentData.system}
                      onChange={(e) => handleChange('system', e.target.value)}
                      placeholder="You are an expert..."
                      className="flex-1 w-full bg-[#09090b] text-white p-4 font-mono text-sm leading-relaxed outline-none resize-none focus:bg-[#000000]"
                      spellCheck="false"
                   />
                </div>

                {/* Prompt Template Section */}
                <div className="flex-none md:flex-[3] flex flex-col min-h-[300px] md:min-h-0 bg-[#1a1a1a] border border-[#333] rounded-lg overflow-hidden shrink-0">
                   <div className="bg-[#111] px-4 py-2 text-xs font-semibold text-gray-400 border-b border-[#333] flex items-center justify-between">
                     <span>PROMPT TEMPLATE</span>
                     <span className="text-[#d4af37] opacity-60">Variable injection</span>
                   </div>
                   <textarea 
                      value={currentData.prompt}
                      onChange={(e) => handleChange('prompt', e.target.value)}
                      placeholder='I have a project idea: "${idea}"...'
                      className="flex-1 w-full bg-[#09090b] text-white p-4 font-mono text-sm leading-relaxed outline-none resize-none focus:bg-[#000000]"
                      spellCheck="false"
                   />
                </div>
             </>
           )}
        </div>
      </div>
    </div>
  );
}
