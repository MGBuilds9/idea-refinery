
export const LLM_PROVIDERS = {
  ANTHROPIC: 'anthropic',
  GEMINI: 'gemini',
  OPENAI: 'openai'
};

export const DEFAULT_MODELS = {
  [LLM_PROVIDERS.ANTHROPIC]: 'claude-3-5-sonnet-20241022',
  [LLM_PROVIDERS.GEMINI]: 'gemini-1.5-pro',
  [LLM_PROVIDERS.OPENAI]: 'gpt-4o'
};

/**
 * Generate completion from selected LLM provider
 * @param {Object} params
 * @param {string} params.provider
 * @param {string} params.apiKey
 * @param {string} [params.model]
 * @param {Array} params.messages - [{role: 'user'|'assistant'|'system', content: string}]
 * @param {number} [params.maxTokens]
 * @returns {Promise<string>}
 */
export async function generateCompletion({ provider, apiKey, model, messages, maxTokens = 4000, system }) {
  if (!apiKey) {
    throw new Error(`API Key required for ${provider}`);
  }

  switch (provider) {
    case LLM_PROVIDERS.ANTHROPIC:
      return callAnthropic({ apiKey, model, messages, maxTokens, system });
    case LLM_PROVIDERS.GEMINI:
      return callGemini({ apiKey, model, messages, maxTokens, system });
    case LLM_PROVIDERS.OPENAI:
      return callOpenAI({ apiKey, model, messages, maxTokens, system });
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}

async function callAnthropic({ apiKey, model, messages, maxTokens, system }) {
  // Anthropic expects system prompt as a top-level parameter, not in messages
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerously-allow-browser": "true" // Needed for client-side usage
    },
    body: JSON.stringify({
      model: model || DEFAULT_MODELS[LLM_PROVIDERS.ANTHROPIC],
      max_tokens: maxTokens,
      system: system,
      messages: messages.filter(m => m.role !== 'system')
    })
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error?.message || `Anthropic API Error: ${response.statusText}`);
  }

  const data = await response.json();
  return data.content[0].text;
}

async function callGemini({ apiKey, model, messages, maxTokens, system }) {
  // Map messages to Gemini format (user -> user, assistant -> model)
  // System instructions are passed separately in newer API versions or as first part
  
  const contents = messages
    .filter(m => m.role !== 'system')
    .map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    }));

  const modelName = model || DEFAULT_MODELS[LLM_PROVIDERS.GEMINI];
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

  const body = {
    contents,
    generationConfig: {
      maxOutputTokens: maxTokens
    }
  };

  if (system) {
    body.systemInstruction = {
      parts: [{ text: system }]
    };
  }

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error?.message || `Gemini API Error: ${response.statusText}`);
  }

  const data = await response.json();
  if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
    throw new Error('Invalid Gemini response');
  }
  
  return data.candidates[0].content.parts[0].text;
}

async function callOpenAI({ apiKey, model, messages, maxTokens, system }) {
  const msgs = [...messages];
  if (system) {
    msgs.unshift({ role: 'system', content: system });
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: model || DEFAULT_MODELS[LLM_PROVIDERS.OPENAI],
      messages: msgs,
      max_tokens: maxTokens
    })
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error?.message || `OpenAI API Error: ${response.statusText}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}
