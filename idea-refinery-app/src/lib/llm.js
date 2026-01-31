import { GoogleGenerativeAI } from "@google/generative-ai";
import { SecureStorage } from '../services/secure_storage';

/**
 * @typedef {'anthropic' | 'openai' | 'gemini'} Provider
 */

// Proxy server URL - runs locally to bypass CORS
const PROXY_URL = 'http://localhost:3001/api';

// Available models per provider
export const AVAILABLE_MODELS = {
  anthropic: [
    { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet' },
    { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku' },
    { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus' }
  ],
  openai: [
    { id: 'gpt-4o', name: 'GPT-4o' },
    { id: 'gpt-4o-mini', name: 'GPT-4o Mini' },
    { id: 'gpt-4-turbo', name: 'GPT-4 Turbo' }
  ],
  gemini: [
    { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro' },
    { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash' },
    { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash' }
  ]
};

// Default settings structure
const DEFAULT_SETTINGS = {
  enableSecondPass: false,
  secondPassProvider: 'openai',
  secondPassModel: 'gpt-4o',
  stageModels: {
    questions: null,  // null = use default for provider
    blueprint: null,
    refinement: null,
    mockup: null
  }
};

class LLMService {
  constructor() {
    // In-memory keys for the session (loaded only after unlock)
    this.apiKeys = {
      anthropic: '',
      openai: '',
      gemini: ''
    };
    this.defaultProvider = localStorage.getItem('llm_provider') || 'openai';
    this.activePin = null; // Set after unlock for encrypted operations
    
    // Load settings
    const savedSettings = localStorage.getItem('llm_settings');
    this.settings = savedSettings ? JSON.parse(savedSettings) : { ...DEFAULT_SETTINGS };
  }

  // Set active PIN for encrypted operations (called after unlock)
  setActivePin(pin) {
    this.activePin = pin;
  }

  // Check for legacy plaintext keys and migrate them if PIN is provided
  async checkAndMigrateLegacyKeys(pin) {
    let migratedCount = 0;
    try {
        const legacyKeys = {
            anthropic: localStorage.getItem('anthropic_key'),
            openai: localStorage.getItem('openai_key'),
            gemini: localStorage.getItem('gemini_key')
        };
        
        // Filter out null/empty
        const keysToMigrate = Object.entries(legacyKeys).reduce((acc, [k, v]) => {
            if (v && v.length > 5) acc[k] = v;
            return acc;
        }, {});

        if (Object.keys(keysToMigrate).length === 0) return 0;

        console.log('Migrating legacy keys:', Object.keys(keysToMigrate));
        
        // 1. Load existing encrypted keys (to merge, not overwrite)
        const currentEncrypted = await SecureStorage.getItem('api_keys', pin) || {};
        
        // 2. Merge legacy into encrypted
        const mergedKeys = { ...currentEncrypted, ...keysToMigrate };
        
        // 3. Save encrypted
        await SecureStorage.setItem('api_keys', mergedKeys, pin);
        
        // 4. Update memory state
        this.apiKeys = { ...this.apiKeys, ...mergedKeys };
        this.activePin = pin;
        
        // 5. Wipe legacy plaintext
        Object.keys(keysToMigrate).forEach(provider => {
            localStorage.removeItem(`${provider}_key`);
        });
        
        migratedCount = Object.keys(keysToMigrate).length;
        console.log(`Successfully migrated ${migratedCount} legacy keys.`);
    } catch (e) {
        console.error('Migration failed:', e);
    }
    return migratedCount;
  }

  // Load encrypted API keys from SecureStorage (called after unlock)
  async loadEncryptedKeys(pin) {
    try {
      // First check for migration need
      await this.checkAndMigrateLegacyKeys(pin);
        
      const decryptedKeys = await SecureStorage.getItem('api_keys', pin);
      if (decryptedKeys) {
        console.log('Decrypted keys loaded:', Object.keys(decryptedKeys));
        this.apiKeys = { ...this.apiKeys, ...decryptedKeys };
        this.activePin = pin;
        return true;
      }
      return false; 
    } catch (e) {
      console.error('Failed to load encrypted keys:', e);
      return false;
    }
  }

  // Save all API keys encrypted to SecureStorage
  async saveEncryptedKeys(pin) {
    try {
      console.log('Saving encrypted keys for:', Object.keys(this.apiKeys));
      await SecureStorage.setItem('api_keys', this.apiKeys, pin);
      return true;
    } catch (e) {
      console.error('Failed to save encrypted keys:', e);
      return false;
    }
  }

  getSettings() {
    return this.settings;
  }

  updateSettings(newSettings) {
    this.settings = { ...this.settings, ...newSettings };
    localStorage.setItem('llm_settings', JSON.stringify(this.settings));
  }

  isSecondPassEnabled() {
    return this.settings.enableSecondPass;
  }

  getSecondPassConfig() {
    return {
      provider: this.settings.secondPassProvider,
      model: this.settings.secondPassModel
    };
  }

  getModelForStage(stage) {
    return this.settings.stageModels[stage] || null;
  }

  // New method for bulk updates to prevent DB write race conditions
  async setApiKeys(keys) {
    console.log('Setting API keys:', Object.keys(keys));
    // Update internal state
    this.apiKeys = { ...this.apiKeys, ...keys };
    
    // Legacy localStorage writes REMOVED for security
    // Object.entries(keys).forEach(([provider, key]) => {
    //   localStorage.setItem(`${provider}_key`, key);
    // });

    // Enforce encrypted save
    if (this.activePin) {
      console.log('PIN active, saving encrypted...');
      await this.saveEncryptedKeys(this.activePin);
    } else {
        throw new Error('No PIN active. Cannot save keys securely.');
    }
  }

  getDefaultProvider() {
    return this.defaultProvider;
  }

  setDefaultProvider(provider) {
    this.defaultProvider = provider;
    localStorage.setItem('llm_provider', provider);
  }

  getApiKey(provider) {
    return this.apiKeys[provider];
  }

  // Context Optimization: Sliding Window + Summary
  // Keeps system prompt, recent N messages, and summarizes older ones (mock summary for now)
  optimizeContext(messages, maxCount = 8) {
     if (!messages || messages.length <= maxCount) return messages;
     
     // Always keep system prompt if present (usually passed separately, but if in array...)
     // Our usage passes system prompt separately, so 'messages' here are user/assistant turns.
     
     const optimized = [];
     
     // 1. Keep the first user message (Context/Idea)
     if (messages.length > 0) optimized.push(messages[0]);
     
     // 2. Insert a "summary" placeholder for skipped messages
     // In a real implementation, we would call a cheap model to summarize messages[1] to messages[length-N]
     const skippedCount = messages.length - maxCount;
     if (skippedCount > 0) {
         optimized.push({
             role: 'system_note', // Internal marker, handled by provider adapters
             content: `[Context Summary: ${skippedCount} previous messages compressed]`
         });
     }
     
     // 3. Keep last N-1 messages
     const tail = messages.slice(- (maxCount - 1));
     tail.forEach(m => optimized.push(m));
     
     return optimized;
  }

  async generate(provider, { system, prompt, maxTokens = 4000, model, history = [] }) {
    if (!this.apiKeys[provider]) {
      throw new Error(`Please provide an API key for ${provider}`);
    }
    
    // Optimize history if provided
    const optimizedHistory = this.optimizeContext(history);

    switch (provider) {
      case 'anthropic':
        return this.callAnthropic({ system, prompt, maxTokens, model, history: optimizedHistory });
      case 'openai':
        return this.callOpenAI({ system, prompt, maxTokens, model, history: optimizedHistory });
      case 'gemini':
        return this.callGemini({ system, prompt, maxTokens, model, history: optimizedHistory });
      default:
        throw new Error(`Unknown provider: ${provider}`);
    }
  }

  // Second pass refinement helper
  async generateWithSecondPass(provider, options, secondPassPromptFn) {
    // First pass
    const firstResult = await this.generate(provider, options);
    
    if (!this.settings.enableSecondPass) {
      return firstResult;
    }

    // Check if we have API key for second pass provider
    const { provider: sp, model: sm } = this.getSecondPassConfig();
    if (!this.apiKeys[sp]) {
      console.warn(`Second pass skipped: No API key for ${sp}`);
      return firstResult;
    }

    // Second pass
    const secondPassOptions = secondPassPromptFn(firstResult);
    const refinedResult = await this.generate(sp, {
      ...secondPassOptions,
      model: sm
    });

    return refinedResult;
  }

  // Build message array helper
  buildMessages(history, prompt) {
      const messages = [];
      
      // Add history
      if (history && history.length > 0) {
          history.forEach(msg => {
              // Handle our internal compression marker
              if (msg.role === 'system_note') {
                  // In OpenAI/Anthropic, we can squish this into a user or system message
                  messages.push({ role: 'system', content: msg.content }); 
              } else {
                  messages.push(msg);
              }
          });
      }
      
      // Add current prompt
      if (prompt) {
          messages.push({ role: 'user', content: prompt });
      }
      
      return messages;
  }

  // Anthropic Implementation - via proxy to avoid CORS
  async callAnthropic({ system, prompt, maxTokens, model, history }) {
     // Prepare messages
    const messages = this.buildMessages(history, prompt);

    const response = await fetch(`${PROXY_URL}/anthropic`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": this.apiKeys.anthropic
      },
      body: JSON.stringify({
        model: model || "claude-3-5-sonnet-20241022",
        max_tokens: maxTokens,
        system: system,
        messages: messages
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || `Anthropic API Error: ${response.status}`);
    }

    const data = await response.json();
    return data.content[0].text;
  }

  // OpenAI Implementation - via proxy to avoid CORS
  async callOpenAI({ system, prompt, maxTokens, model, history }) {
    const messages = this.buildMessages(history, prompt);
    
    // Add system prompt to start
    if (system) {
        messages.unshift({ role: "system", content: system || "You are a helpful assistant." });
    }

    const response = await fetch(`${PROXY_URL}/openai`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${this.apiKeys.openai}`
      },
      body: JSON.stringify({
        model: model || "gpt-4o",
        max_tokens: maxTokens,
        messages: messages
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || `OpenAI API Error: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  }

  // Gemini Implementation - via proxy to avoid CORS
  async callGemini({ system, prompt, maxTokens, model, history }) {
    const msgs = this.buildMessages(history, prompt);
    
    // Convert to Gemini format
    const contents = msgs.map(m => {
        let role = 'user';
        if (m.role === 'assistant') role = 'model';
        if (m.role === 'system') return null; // System handled separately
        return { role, parts: [{ text: m.content }] };
    }).filter(Boolean);

    const body = {
      model: model || "gemini-1.5-pro",
      apiKey: this.apiKeys.gemini,
      contents: contents,
      generationConfig: {
        maxOutputTokens: maxTokens
      }
    };

    if (system) {
      body.systemInstruction = {
        parts: [{ text: system }]
      };
    }

    const response = await fetch(`${PROXY_URL}/gemini`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || `Gemini API Error: ${response.status}`);
    }

    const data = await response.json();
    if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
      throw new Error('Invalid Gemini response');
    }
    
    return data.candidates[0].content.parts[0].text;
  }
}

export const llm = new LLMService();
