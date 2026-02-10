/**
 * LLMService - Client-side AI provider abstraction
 *
 * PRIMARY PATH: When authenticated, AI calls go through /api/refine (or /api/refine/stream)
 * via the server's AgentOrchestrator. This file handles direct provider calls
 * as a FALLBACK for local-only mode (no server connection).
 */
import { GoogleGenerativeAI } from "@google/generative-ai";
import { SecureStorage } from '../services/secure_storage';

/**
 * Classify AI/LLM errors into user-friendly categories with suggestions.
 * @param {Error|string} error - The error object or message
 * @param {number} [statusCode] - HTTP status code if available
 * @returns {{ type: string, message: string, suggestion: string }}
 */
export function classifyAIError(error, statusCode) {
  if (!error) return { type: 'unknown', message: 'An unknown error occurred', suggestion: 'Please try again.' };

  const message = error.message || error.toString();

  // Auth errors
  if (statusCode === 401 || statusCode === 403 || /invalid.*key|unauthorized|authentication/i.test(message)) {
    return { type: 'auth_error', message: 'Invalid API key', suggestion: 'Check your API key in Settings > API Keys.' };
  }

  // Rate limiting
  if (statusCode === 429 || /rate.?limit|too many requests/i.test(message)) {
    return { type: 'rate_limit', message: 'Rate limit exceeded', suggestion: 'Wait a moment and try again, or switch to a different provider.' };
  }

  // Quota/billing
  if (/quota|billing|insufficient.*funds|exceeded/i.test(message)) {
    return { type: 'quota_exceeded', message: 'API quota exceeded', suggestion: 'Check your billing at the provider\'s dashboard.' };
  }

  // Network
  if (/network|fetch|ECONNREFUSED|timeout|ENOTFOUND/i.test(message)) {
    return { type: 'network_error', message: 'Network connection failed', suggestion: 'Check your internet connection and try again.' };
  }

  // Model errors
  if (/model.*not.*found|invalid.*model/i.test(message)) {
    return { type: 'model_error', message: 'Model not available', suggestion: 'Try a different model in Settings > AI Configuration.' };
  }

  // Parse errors
  if (/json|parse|unexpected token/i.test(message)) {
    return { type: 'parse_error', message: 'Failed to parse AI response', suggestion: 'The AI returned invalid data. Try rephrasing or using a different model.' };
  }

  return { type: 'unknown', message: message.substring(0, 200), suggestion: 'Please try again. If this persists, try a different provider.' };
}

/**
 * @typedef {'anthropic' | 'openai' | 'gemini'} Provider
 */

// Proxy server URL - runs locally to bypass CORS
const PROXY_URL = 'http://localhost:3001/api';

// Available models per provider
export const AVAILABLE_MODELS = {
  anthropic: [
    { id: 'claude-sonnet-4-5-20250929', name: 'Claude Sonnet 4.5' },
    { id: 'claude-haiku-4-5-20251001', name: 'Claude Haiku 4.5' },
    { id: 'claude-opus-4-6', name: 'Claude Opus 4.6' }
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
  // Keeps system messages, compresses old messages into a summary, keeps recent window
  optimizeContext(messages, maxCount = 8) {
    if (!messages || messages.length <= maxCount) return messages;

    // Always keep the system message(s) if present
    const systemMessages = messages.filter(m => m.role === 'system');
    const nonSystemMessages = messages.filter(m => m.role !== 'system');

    if (nonSystemMessages.length <= maxCount) return messages;

    // Keep the most recent messages (sliding window)
    const recentMessages = nonSystemMessages.slice(-maxCount);

    // Create a brief summary of skipped messages
    const skippedCount = nonSystemMessages.length - maxCount;
    const skippedMessages = nonSystemMessages.slice(0, skippedCount);

    // Build a concise summary from skipped content
    const summaryPoints = skippedMessages
      .filter(m => m.role === 'user' || m.role === 'assistant')
      .map(m => {
        const content = typeof m.content === 'string' ? m.content : JSON.stringify(m.content);
        // Take first 100 chars of each message
        return `[${m.role}]: ${content.substring(0, 100)}${content.length > 100 ? '...' : ''}`;
      })
      .slice(0, 5); // Max 5 summary points

    const contextNote = {
      role: 'system',
      content: `[Context Summary - ${skippedCount} earlier messages compressed]\n${summaryPoints.join('\n')}\n[End of summary - recent conversation follows]`
    };

    return [...systemMessages, contextNote, ...recentMessages];
  }

  // Approximate token count (4 chars ~ 1 token)
  estimateTokens(text) {
    if (!text) return 0;
    const str = typeof text === 'string' ? text : JSON.stringify(text);
    return Math.ceil(str.length / 4);
  }

  async generate(provider, { system, prompt, maxTokens = 4000, model, history = [] }) {
    if (!this.apiKeys[provider]) {
      const classified = {
        type: 'auth_error',
        message: `No API key configured for ${provider}`,
        suggestion: `Add your ${provider} API key in Settings > API Keys.`
      };
      const err = new Error(classified.message);
      err.classified = classified;
      throw err;
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
      default: {
        const classified = {
          type: 'unknown',
          message: `Unknown provider: ${provider}`,
          suggestion: 'Select a supported provider (Anthropic, OpenAI, or Gemini).'
        };
        const err = new Error(classified.message);
        err.classified = classified;
        throw err;
      }
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

    let response;
    try {
      response = await fetch(`${PROXY_URL}/anthropic`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": this.apiKeys.anthropic
        },
        body: JSON.stringify({
          model: model || "claude-sonnet-4-5-20250929",
          max_tokens: maxTokens,
          system: system,
          messages: messages
        })
      });
    } catch (fetchError) {
      const classified = classifyAIError(fetchError);
      const err = new Error(classified.message);
      err.classified = classified;
      throw err;
    }

    if (!response.ok) {
      let errorBody;
      try { errorBody = await response.json(); } catch { errorBody = {}; }
      const rawMessage = errorBody.error?.message || `Anthropic API Error: ${response.status}`;
      const classified = classifyAIError({ message: rawMessage }, response.status);
      const err = new Error(classified.message);
      err.classified = classified;
      throw err;
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

    let response;
    try {
      response = await fetch(`${PROXY_URL}/openai`, {
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
    } catch (fetchError) {
      const classified = classifyAIError(fetchError);
      const err = new Error(classified.message);
      err.classified = classified;
      throw err;
    }

    if (!response.ok) {
      let errorBody;
      try { errorBody = await response.json(); } catch { errorBody = {}; }
      const rawMessage = errorBody.error?.message || `OpenAI API Error: ${response.status}`;
      const classified = classifyAIError({ message: rawMessage }, response.status);
      const err = new Error(classified.message);
      err.classified = classified;
      throw err;
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

    let response;
    try {
      response = await fetch(`${PROXY_URL}/gemini`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
      });
    } catch (fetchError) {
      const classified = classifyAIError(fetchError);
      const err = new Error(classified.message);
      err.classified = classified;
      throw err;
    }

    if (!response.ok) {
      let errorBody;
      try { errorBody = await response.json(); } catch { errorBody = {}; }
      const rawMessage = errorBody.error?.message || `Gemini API Error: ${response.status}`;
      const classified = classifyAIError({ message: rawMessage }, response.status);
      const err = new Error(classified.message);
      err.classified = classified;
      throw err;
    }

    const data = await response.json();
    if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
      const classified = classifyAIError({ message: 'Invalid Gemini response - no candidates returned' });
      const err = new Error(classified.message);
      err.classified = classified;
      throw err;
    }

    return data.candidates[0].content.parts[0].text;
  }
}

export const llm = new LLMService();
