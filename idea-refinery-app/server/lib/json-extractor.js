/**
 * Robustly extract JSON from messy LLM output.
 * Server-side copy for use in AgentOrchestrator.
 *
 * Tries multiple strategies in order of reliability.
 *
 * @param {string} text - Raw LLM response text
 * @returns {{ success: boolean, data: Object|null, strategy?: string, error?: string, raw?: string }}
 */
export function extractJSON(text) {
  if (!text || typeof text !== 'string') {
    return { success: false, data: null, error: 'Empty or non-string input', raw: text };
  }

  const trimmed = text.trim();

  // Strategy 1: Direct parse (cleanest case)
  try {
    const parsed = JSON.parse(trimmed);
    if (typeof parsed === 'object' && parsed !== null) {
      return { success: true, data: parsed, strategy: 'direct' };
    }
  } catch {
    // Not valid JSON as-is, try next strategy
  }

  // Strategy 2: Extract from markdown code block (```json ... ```)
  const codeBlockMatch = trimmed.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (codeBlockMatch) {
    try {
      const parsed = JSON.parse(codeBlockMatch[1].trim());
      return { success: true, data: parsed, strategy: 'code_block' };
    } catch {
      // Code block content wasn't valid JSON, try next strategy
    }
  }

  // Strategy 3: Brace-counting extraction (find outermost {})
  const startIdx = trimmed.indexOf('{');
  if (startIdx !== -1) {
    let depth = 0;
    let endIdx = -1;
    let inString = false;
    let escape = false;

    for (let i = startIdx; i < trimmed.length; i++) {
      const char = trimmed[i];

      if (escape) { escape = false; continue; }
      if (char === '\\') { escape = true; continue; }
      if (char === '"' && !escape) { inString = !inString; continue; }
      if (inString) continue;

      if (char === '{') depth++;
      if (char === '}') {
        depth--;
        if (depth === 0) { endIdx = i; break; }
      }
    }

    if (endIdx !== -1) {
      const jsonStr = trimmed.substring(startIdx, endIdx + 1);
      try {
        const parsed = JSON.parse(jsonStr);
        return { success: true, data: parsed, strategy: 'brace_counting' };
      } catch {
        // Extracted substring wasn't valid JSON either
      }
    }
  }

  // All strategies failed
  return {
    success: false,
    data: null,
    error: 'Could not extract valid JSON from response',
    raw: trimmed.substring(0, 500) // First 500 chars for debugging
  };
}
