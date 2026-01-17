import { PROMPTS as DEFAULT_PROMPTS } from '../lib/prompts';

let promptOverrides = {};

const interpolate = (str, params) => {
    if (!str) return '';
    let result = str;
    Object.entries(params).forEach(([key, val]) => {
        // Simple string replacement for ${key}
        // Use a function to handle special characters in replacement if necessary, 
        // but typically just replacing the token is enough for prompts.
        result = result.replace(new RegExp(`\\$\\{${key}\\}`, 'g'), val || '');
    });
    return result;
};

export const PromptService = {
  /**
   * Load overrides from the server
   */
  init: async () => {
    try {
        const token = localStorage.getItem('auth_token');
        const serverUrl = localStorage.getItem('server_url');
        if (!serverUrl || !token) return;

        const res = await fetch(`${serverUrl}/api/prompts`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        
        if (res.ok) {
            const data = await res.json();
            data.forEach(p => {
                promptOverrides[p.type] = p.content;
            });
            console.log('Prompt overrides loaded:', Object.keys(promptOverrides));
        }
    } catch(e) {
        console.warn('Failed to load prompt overrides', e);
    }
  },

  /**
   * Get a prompt by type, applying overrides if present
   */
  get: (type, params = {}) => {
    // PRE-PROCESSING: Derive common variables needed for templates
    // This allows overrides to use standardized variable names like ${qaPairs}
    const derivedParams = { ...params };
    
    if (type === 'blueprint' && params.questions && params.answers) {
        const qaPairs = params.questions.map((q, i) => `Q: ${q}\nA: ${params.answers[i] || ''}`).join('\n\n');
        derivedParams.qaPairs = qaPairs;
    }

    // 1. Check Override
    if (promptOverrides[type]) {
       try {
           let content = promptOverrides[type];
           // Parse if string
           const parsed = typeof content === 'string' ? JSON.parse(content) : content;
           
           return {
               system: interpolate(parsed.system, derivedParams),
               prompt: interpolate(parsed.prompt, derivedParams)
           };
       } catch (e) {
           console.error(`Error parsing override for ${type}`, e);
           // Fall through to default
       }
    }

    // 2. Fallback to Default Function
    if (DEFAULT_PROMPTS[type]) {
        switch(type) {
            // V1.5 Three-Agent System
            case 'architect':
                return DEFAULT_PROMPTS.architect(params.rawIdea || params.idea);
            case 'critic':
                return DEFAULT_PROMPTS.critic(params.ideaSpec);
            case 'designerMockup':
                return DEFAULT_PROMPTS.designerMockup(params.ideaSpec);
            // Legacy V1.2 prompts
            case 'questions': 
                return DEFAULT_PROMPTS.questions(params.idea);
            case 'blueprint': 
                return DEFAULT_PROMPTS.blueprint(params.idea, params.questions, params.answers);
            case 'refine': 
                return DEFAULT_PROMPTS.refine();
            case 'secondPass': 
                return DEFAULT_PROMPTS.secondPass(params.originalBlueprint);
            case 'mockup': 
                return DEFAULT_PROMPTS.mockup(params.blueprint);
            default:
                // Try to guess?
                return DEFAULT_PROMPTS[type](params);
        }
    }
    
    throw new Error(`Unknown prompt type: ${type}`);
  }
};
