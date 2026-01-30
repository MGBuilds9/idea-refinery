import React, { useState, useEffect } from 'react';
import { Save, RotateCcw, Loader2 } from 'lucide-react';

import { DEFAULT_PROMPT_TEMPLATES } from '../lib/prompt_templates.js';

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
  const [localEdits, setLocalEdits] = useState(() => {
    // Initial state from defaults
    const defaults = {};
    PROMPT_TYPES.forEach(t => {
      try {
        const parsed = JSON.parse(DEFAULT_PROMPT_TEMPLATES[t.id] || '{}');
        defaults[t.id] = {
          system: parsed.system || '',
          prompt: parsed.prompt || ''
        };
      } catch {
        defaults[t.id] = { system: '', prompt: '' };
      }
    });
    return defaults;
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const token = localStorage.getItem('auth_token');
  const serverUrl = localStorage.getItem('server_url') ||
    (window.location.hostname === 'localhost' ? 'http://localhost:3001' : window.location.origin);

  // Fetch prompts on mount
  // Fetch prompts on mount
  useEffect(() => {
    const fetchPrompts = async () => {
      try {
        setLoading(true);

        const fetchOptions = {
          headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        };

        const res = await fetch(`${serverUrl}/api/prompts`, fetchOptions);

        if (res.ok) {
          const data = await res.json();
          console.log('Fetched prompts:', data); // Debug log

          const map = {};
          data.forEach(p => {
            try {
              // The content from the server is already a JSON string
              let parsed;

              if (typeof p.content === 'string') {
                parsed = JSON.parse(p.content);
              } else {
                // If it's already an object, use it directly
                parsed = p.content;
              }

              // Ensure we have expected keys
              if (typeof parsed === 'object' && parsed !== null) {
                map[p.type] = {
                  system: parsed.system || '',
                  prompt: parsed.prompt || ''
                };
                console.log(`Loaded ${p.type}:`, map[p.type]); // Debug log
              } else {
                console.warn(`Invalid format for ${p.type}:`, parsed);
                map[p.type] = { system: '', prompt: String(p.content) };
              }
            } catch (err) {
              console.error(`Failed to parse ${p.type}:`, err, p.content);
              // If parsing fails, try to use as plain text
              map[p.type] = { system: '', prompt: String(p.content) };
            }
          });

          // Initialize local edits with fetched data or defaults
          const splits = {};
          PROMPT_TYPES.forEach(t => {
            let defaultVal = { system: '', prompt: '' };
            try {
                 const parsed = JSON.parse(DEFAULT_PROMPT_TEMPLATES[t.id] || '{}');
                 defaultVal = { system: parsed.system || '', prompt: parsed.prompt || '' };
            } catch {}

            splits[t.id] = map[t.id] || defaultVal;
          });

          console.log('Final local edits:', splits); // Debug log
          setLocalEdits(splits);
        } else {
          console.error('Failed to fetch prompts:', res.status, res.statusText);
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
          // If content is returned, use it
          if (data.content) {
             const parsed = JSON.parse(data.content);
             parsedDefault = {
               system: parsed.system || '',
               prompt: parsed.prompt || ''
             };
          } else {
             // Fallback to local default if server just said OK but no content
             const parsed = JSON.parse(DEFAULT_PROMPT_TEMPLATES[activeType] || '{}');
             parsedDefault = {
                system: parsed.system || '',
                prompt: parsed.prompt || ''
             };
          }
        } catch (e) {
          console.error("Failed to parse default prompt", e);
          // Ultimate fallback
          try {
             const parsed = JSON.parse(DEFAULT_PROMPT_TEMPLATES[activeType] || '{}');
             parsedDefault = { system: parsed.system || '', prompt: parsed.prompt || '' };
          } catch {}
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
    <div className="h-full flex flex-col bg-[var(--color-background)] text-[var(--color-text)]">
      {/* Header */}
      <div className="p-4 md:p-6 border-b border-[var(--color-border)] flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-[var(--font-heading)] font-bold text-[var(--color-text)]">Prompt Studio</h2>
          <p className="text-[var(--color-text-muted)] text-xs md:text-sm font-[var(--font-body)]">Fine-tune the intelligence of the Vault.</p>
        </div>
        <div className="flex items-center gap-2 md:gap-3 w-full md:w-auto justify-end">
          {message && <span className="text-green-600 text-xs md:text-sm animate-pulse mr-auto md:mr-0 font-semibold">{message}</span>}
          <button
            onClick={handleReset}
            className="p-2 text-[var(--color-text-muted)] hover:text-[var(--color-primary)] hover:bg-blue-50 rounded-lg transition-colors"
            title="Reset to Default"
          >
            <RotateCcw className="w-5 h-5" />
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn-primary text-sm md:text-base whitespace-nowrap"
          >
            {saving ? <Loader2 className="animate-spin w-4 h-4" /> : <Save className="w-4 h-4" />}
            Save Changes
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Sidebar */}
        <div className="w-full md:w-64 border-b md:border-b-0 md:border-r border-[var(--color-border)] bg-white overflow-x-auto md:overflow-y-auto flex md:block shrink-0">
          {PROMPT_TYPES.map(type => (
            <button
              key={type.id}
              onClick={() => setActiveType(type.id)}
              className={`min-w-[160px] md:w-full text-left p-3 md:p-4 border-r md:border-r-0 md:border-b border-[var(--color-border)] hover:bg-gray-50 transition-colors font-[var(--font-body)] ${activeType === type.id ? 'bg-blue-50 border-b-2 md:border-b border-[var(--color-primary)] md:border-l-4 md:border-l-[var(--color-primary)]' : ''}`}
            >
              <div className={`font-semibold text-sm mb-1 whitespace-nowrap md:whitespace-normal ${activeType === type.id ? 'text-[var(--color-primary)]' : 'text-[var(--color-text)]'}`}>{type.label}</div>
              <div className="text-xs text-[var(--color-text-muted)] hidden md:block">{type.desc}</div>
            </button>
          ))}
        </div>

        {/* Editor */}
        <div className="flex-1 p-4 md:p-6 overflow-y-auto flex flex-col gap-4 md:gap-6 bg-gray-50">
          {loading ? (
            <div className="flex-1 flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-[var(--color-primary)] animate-spin" />
            </div>
          ) : (
            <>
              {/* System Context Section */}
              <div className="flex-none md:flex-[2] flex flex-col min-h-[200px] md:min-h-0 bg-white border border-[var(--color-border)] rounded-xl overflow-hidden shrink-0 shadow-sm">
                <div className="bg-gray-50 px-4 py-3 text-xs font-bold text-[var(--color-text-muted)] border-b border-[var(--color-border)] flex items-center justify-between font-[var(--font-body)] uppercase tracking-wide">
                  <span>System Context</span>
                  <span className="text-[var(--color-primary)] opacity-70 normal-case">Global</span>
                </div>
                <textarea
                  value={currentData.system}
                  onChange={(e) => handleChange('system', e.target.value)}
                  placeholder="You are an expert..."
                  className="flex-1 w-full bg-white text-[var(--color-text)] p-4 font-mono text-sm leading-relaxed outline-none resize-none focus:bg-blue-50/30 transition-colors font-[var(--font-body)]"
                  spellCheck="false"
                />
              </div>

              {/* Prompt Template Section */}
              <div className="flex-none md:flex-[3] flex flex-col min-h-[300px] md:min-h-0 bg-white border border-[var(--color-border)] rounded-xl overflow-hidden shrink-0 shadow-sm">
                <div className="bg-gray-50 px-4 py-3 text-xs font-bold text-[var(--color-text-muted)] border-b border-[var(--color-border)] flex items-center justify-between font-[var(--font-body)] uppercase tracking-wide">
                  <span>Prompt Template</span>
                  <span className="text-[var(--color-primary)] opacity-70 normal-case">Variable injection</span>
                </div>
                <textarea
                  value={currentData.prompt}
                  onChange={(e) => handleChange('prompt', e.target.value)}
                  placeholder='I have a project idea: "${idea}"...'
                  className="flex-1 w-full bg-white text-[var(--color-text)] p-4 font-mono text-sm leading-relaxed outline-none resize-none focus:bg-blue-50/30 transition-colors font-[var(--font-body)]"
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
