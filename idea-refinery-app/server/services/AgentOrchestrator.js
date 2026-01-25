import { DEFAULT_PROMPTS } from '../default_prompts.js';

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
        model: this.model || 'claude-3-5-sonnet-20240620',
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
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${this.apiKey}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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
   * Run the full pipeline
   * @param {string} rawIdea 
   * @returns {Object} { spec, design, audit }
   */
  async refineIdea(rawIdea) {
    // 1. Architect: Structure the idea
    const architectPrompt = JSON.parse(DEFAULT_PROMPTS.architect);
    const architectResponse = await this.callLLM(
      architectPrompt.system,
      architectPrompt.prompt.replace('${idea}', rawIdea)
    );
    
    // Parse the JSON spec
    let ideaSpec;
    try {
      const jsonMatch = architectResponse.match(/\{[\s\S]*\}/);
      ideaSpec = JSON.parse(jsonMatch ? jsonMatch[0] : architectResponse);
    } catch (e) {
      console.error('Failed to parse Architect response:', architectResponse);
      throw new Error('Architect failed to output valid JSON');
    }

    // 2. Designer: Create design tokens and structures
    const designerPrompt = JSON.parse(DEFAULT_PROMPTS.designer);
    const designerResponse = await this.callLLM(
      designerPrompt.system,
      designerPrompt.prompt.replace('${spec}', JSON.stringify(ideaSpec, null, 2))
    );

    // 3. Critic: Audit the proposal
    const criticPrompt = JSON.parse(DEFAULT_PROMPTS.critic);
    const auditorInput = `IDEA SPEC:\n${JSON.stringify(ideaSpec, null, 2)}\n\nDESIGN PROPOSAL:\n${designerResponse}`;
    const auditResponse = await this.callLLM(
      criticPrompt.system,
      criticPrompt.prompt.replace('${proposal}', auditorInput)
    );

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
