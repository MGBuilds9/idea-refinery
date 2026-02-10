/**
 * AgentOrchestrator - Server-side AI orchestration (CANONICAL PATH)
 *
 * Handles the three-agent pipeline: Architect -> Critic -> Designer
 * This is the primary AI execution path when the user is authenticated.
 */
import { DEFAULT_PROMPT_TEMPLATES as DEFAULT_PROMPTS } from '../../src/lib/prompt_templates.js';
import { extractJSON } from '../lib/json-extractor.js';

export class AgentOrchestrator {
  constructor(config) {
    this.provider = config.provider; // 'anthropic', 'openai', 'gemini'
    this.apiKey = config.apiKey;
    this.model = config.model;
  }

  async callLLM(system, user) {
    switch (this.provider) {
      case 'anthropic':
        return this.callAnthropic(system, user);
      case 'openai':
        return this.callOpenAI(system, user);
      case 'gemini':
        return this.callGemini(system, user);
      default:
        throw new Error(`Unsupported provider: ${this.provider}`);
    }
  }

  async callAnthropic(system, user) {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: this.model || 'claude-sonnet-4-5-20250929',
        system,
        messages: [{ role: 'user', content: user }],
        max_tokens: 4096
      })
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message || 'Anthropic API error');
    return data.content[0].text;
  }

  async callOpenAI(system, user) {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        model: this.model || 'gpt-4o',
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user }
        ]
      })
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message || 'OpenAI API error');
    return data.choices[0].message.content;
  }

  async callGemini(system, user) {
    const modelName = this.model || 'gemini-1.5-pro';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': this.apiKey
      },
      body: JSON.stringify({
        contents: [
          { role: 'user', parts: [{ text: `SYSTEM: ${system}\n\nUSER: ${user}` }] }
        ]
      })
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message || 'Gemini API error');
    return data.candidates[0].content.parts[0].text;
  }

  /**
   * Phase 1: The Architect - Structure raw idea into IdeaSpec JSON
   * @param {string} rawIdea - User's raw idea text
   * @returns {Promise<Object>} Parsed IdeaSpec object
   */
  async runArchitect(rawIdea) {
    const architectPrompt = JSON.parse(DEFAULT_PROMPTS.architect);
    const architectResponse = await this.callLLM(
      architectPrompt.system,
      architectPrompt.prompt.replace('${idea}', rawIdea)
    );

    const extraction = extractJSON(architectResponse);
    if (!extraction.success) {
      console.error('Failed to extract JSON from Architect response:', {
        error: extraction.error,
        raw: extraction.raw,
        fullResponse: architectResponse.substring(0, 1000)
      });
      const err = new Error(`Architect failed to output valid JSON: ${extraction.error}`);
      err.phase = 'architect';
      throw err;
    }
    console.log(`Architect JSON extracted via strategy: ${extraction.strategy}`);
    return extraction.data;
  }

  /**
   * Phase 2: The Critic - Audit the spec and design for issues
   * @param {Object} ideaSpec - Structured IdeaSpec object
   * @param {string} [designResponse] - Optional design proposal to include in audit
   * @returns {Promise<Object|string>} Audit result (parsed JSON if possible, raw string otherwise)
   */
  async runCritic(ideaSpec, designResponse) {
    const criticPrompt = JSON.parse(DEFAULT_PROMPTS.critic);
    let auditorInput = `IDEA SPEC:\n${JSON.stringify(ideaSpec, null, 2)}`;
    if (designResponse) {
      auditorInput += `\n\nDESIGN PROPOSAL:\n${designResponse}`;
    }
    const auditResponse = await this.callLLM(
      criticPrompt.system,
      criticPrompt.prompt.replace('${proposal}', auditorInput)
    );

    // Try to parse as JSON; fall back to raw string
    const extraction = extractJSON(auditResponse);
    if (extraction.success) {
      return extraction.data;
    }
    return auditResponse;
  }

  /**
   * Phase 3: The Designer - Generate design tokens and structures
   * @param {Object} ideaSpec - Structured IdeaSpec object
   * @returns {Promise<string>} Design proposal text
   */
  async runDesigner(ideaSpec) {
    const designerPrompt = JSON.parse(DEFAULT_PROMPTS.designer);
    const designerResponse = await this.callLLM(
      designerPrompt.system,
      designerPrompt.prompt.replace('${spec}', JSON.stringify(ideaSpec, null, 2))
    );
    return designerResponse;
  }

  /**
   * Run the full pipeline (blocking, non-streaming)
   * @param {string} rawIdea
   * @returns {Object} { spec, design, audit }
   */
  async refineIdea(rawIdea) {
    // 1. Architect: Structure the idea
    const ideaSpec = await this.runArchitect(rawIdea);

    // 2. Designer: Create design tokens and structures
    const designerResponse = await this.runDesigner(ideaSpec);

    // 3. Critic: Audit the proposal (includes design for context)
    const auditResponse = await this.runCritic(ideaSpec, designerResponse);

    return {
      spec: ideaSpec,
      design: designerResponse,
      audit: auditResponse
    };
  }

  /**
   * Generate export artifacts
   * @param {Object} spec - IdeaSpec
   * @param {string} design - Design proposal
   * @returns {Object} { cursorRules, implementationPlan }
   */
  async generateArtifacts(spec, design) {
    const tech = spec.tech_stack || {};

    // 1. .cursorrules Template
    const cursorRules = `# Cursor Rules for ${spec.meta?.name || 'New Project'}
- Stack: ${tech.frontend}, ${tech.backend}, ${tech.database}
- UI Style: Premium, Dark Mode, Minimalist (Zinc 950, Gold #d4af37)
- Rules:
  - Use Functional Components with Hooks.
  - Icons: Lucide React.
  - State Management: React Context / Hooks.
  - Validation: Zod (if applicable).
  - Styling: Tailwind CSS.
  - No 'any' types.
- Context:
  - Mood: ${spec.design?.mood || 'Professional'}
  - Audience: ${spec.meta?.target_audience?.join(', ') || 'General'}`;

    // 2. implementation_plan.md Template
    const implementationPlan = `# Implementation Plan: ${spec.meta?.name || 'Project'}

## Proposed Features
${(spec.features || []).map(f => `### ${f.title}\n- **User Story:** ${f.user_story}\n- **Complexity:** ${f.complexity}`).join('\n\n')}

## Technical Approach
- Frontend: ${tech.frontend}
- Backend: ${tech.backend}
- Database: ${tech.database}

## Design Specs
- Theme: ${spec.design?.theme_name}
- Color: ${spec.design?.primary_color}

## Verification Plan
1. [ ] Manual test of core features.
2. [ ] Verify responsive design.
3. [ ] Check API endpoint responsiveness.`;

    return {
      cursorRules,
      implementationPlan
    };
  }
}
