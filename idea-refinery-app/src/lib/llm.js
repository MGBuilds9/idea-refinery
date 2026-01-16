import { GoogleGenerativeAI } from "@google/generative-ai";
import { getSetting, saveSetting } from '../services/db';
import { encryptData, decryptData } from '../services/crypto';

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
    // In-memory keys for the session (loaded from localStorage fallback or decrypted from Dexie)
    this.apiKeys = {
      anthropic: localStorage.getItem('anthropic_key') || '',
      openai: localStorage.getItem('openai_key') || '',
      gemini: localStorage.getItem('gemini_key') || ''
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

  // Load encrypted API keys from Dexie (called after unlock)
  async loadEncryptedKeys(pin) {
    try {
      const encryptedKeys = await getSetting('encryptedApiKeys');
      if (encryptedKeys) {
        const decrypted = await decryptData(encryptedKeys, pin);
        console.log('Decrypted keys loaded:', Object.keys(decrypted));
        this.apiKeys = { ...this.apiKeys, ...decrypted };
        this.activePin = pin;
        return true;
      }
      return false; // No encrypted keys found, use localStorage fallback
    } catch (e) {
      console.error('Failed to load encrypted keys:', e);
      return false;
    }
  }

  // Save all API keys encrypted to Dexie
  async saveEncryptedKeys(pin) {
    try {
      console.log('Saving encrypted keys for:', Object.keys(this.apiKeys));
      const encrypted = await encryptData(this.apiKeys, pin);
      await saveSetting('encryptedApiKeys', encrypted);
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
    
    // Update localStorage
    Object.entries(keys).forEach(([provider, key]) => {
      localStorage.setItem(`${provider}_key`, key);
    });

    // Single encrypted save if PIN is active
    if (this.activePin) {
      console.log('PIN active, saving encrypted...');
      await this.saveEncryptedKeys(this.activePin);
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

  async generate(provider, { system, prompt, maxTokens = 4000, model }) {
    if (!this.apiKeys[provider]) {
      throw new Error(`Please provide an API key for ${provider}`);
    }

    switch (provider) {
      case 'anthropic':
        return this.callAnthropic({ system, prompt, maxTokens, model });
      case 'openai':
        return this.callOpenAI({ system, prompt, maxTokens, model });
      case 'gemini':
        return this.callGemini({ system, prompt, maxTokens, model });
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

  // Anthropic Implementation - via proxy to avoid CORS
  async callAnthropic({ system, prompt, maxTokens, model }) {
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
        messages: [{ role: "user", content: prompt }]
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
  async callOpenAI({ system, prompt, maxTokens, model }) {
    const response = await fetch(`${PROXY_URL}/openai`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${this.apiKeys.openai}`
      },
      body: JSON.stringify({
        model: model || "gpt-4o",
        max_tokens: maxTokens,
        messages: [
          { role: "system", content: system || "You are a helpful assistant." },
          { role: "user", content: prompt }
        ]
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
  async callGemini({ system, prompt, maxTokens, model }) {
    const body = {
      model: model || "gemini-1.5-pro",
      apiKey: this.apiKeys.gemini,
      contents: [
        { role: "user", parts: [{ text: prompt }] }
      ],
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
