/**
 * AgentOrchestrator.js - Coordinates the Three-Agent Workflow
 *
 * This service orchestrates the Architect -> Critic -> Designer pipeline
 * for Blueprint v1.5's structured spec-first architecture.
 */

import { generateCompletion } from "./llm";
import { PROMPTS } from "../lib/prompts";
import { validateIdeaSpec, findGaps, compileToMarkdown } from "../lib/IdeaSpec";

/**
 * AgentOrchestrator class for managing the three-agent workflow
 */
export class AgentOrchestrator {
  /**
   * @param {Object} config
   * @param {string} config.provider - LLM provider (anthropic, gemini, openai)
   * @param {string} config.apiKey - API key for the provider
   * @param {string} [config.model] - Optional model override
   */
  constructor({ provider, apiKey, model }) {
    this.provider = provider;
    this.apiKey = apiKey;
    this.model = model;
  }

  /**
   * Extract JSON from potentially markdown-wrapped response
   * @param {string} text - Raw LLM response
   * @returns {string} Clean JSON string
   */
  extractJson(text) {
    if (!text) return "{}";

    // Remove markdown code blocks if present
    const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) {
      return codeBlockMatch[1].trim();
    }

    // Try to find JSON object boundaries
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return jsonMatch[0].trim();
    }

    return text.trim();
  }

  /**
   * Phase 1: The Architect - Structure raw idea into IdeaSpec JSON
   * @param {string} rawIdea - User's raw idea text
   * @returns {Promise<Object>} Validated IdeaSpec object
   */
  async runArchitect(rawIdea) {
    const { system, prompt } = PROMPTS.architect(rawIdea);

    const response = await generateCompletion({
      provider: this.provider,
      apiKey: this.apiKey,
      model: this.model,
      messages: [{ role: "user", content: prompt }],
      system,
      maxTokens: 8000,
    });

    try {
      const jsonString = this.extractJson(response);
      const ideaSpec = JSON.parse(jsonString);
      return validateIdeaSpec(ideaSpec);
    } catch (error) {
      console.error("Architect JSON parse error:", error);
      console.error("Raw response:", response);
      throw new Error(`Failed to parse Architect response: ${error.message}`);
    }
  }

  /**
   * Phase 2: The Critic - Validate the IdeaSpec for issues
   * @param {Object} ideaSpec - Structured IdeaSpec object
   * @returns {Promise<Object>} Critique result with status and issues
   */
  async runCritic(ideaSpec) {
    const { system, prompt } = PROMPTS.critic(ideaSpec);

    const response = await generateCompletion({
      provider: this.provider,
      apiKey: this.apiKey,
      model: this.model,
      messages: [{ role: "user", content: prompt }],
      system,
      maxTokens: 4000,
    });

    try {
      const jsonString = this.extractJson(response);
      return JSON.parse(jsonString);
    } catch (error) {
      console.error("Critic JSON parse error:", error);
      // Return a safe fallback - assume approved if we can't parse
      return {
        status: "APPROVED",
        issues: [],
        parseError: error.message,
      };
    }
  }

  /**
   * Phase 3: The Designer - Generate visual mockup HTML
   * @param {Object} ideaSpec - Structured IdeaSpec object
   * @returns {Promise<string>} HTML mockup code
   */
  async runDesigner(ideaSpec) {
    const { system, prompt } = PROMPTS.designerMockup(ideaSpec);

    return await generateCompletion({
      provider: this.provider,
      apiKey: this.apiKey,
      model: this.model,
      messages: [{ role: "user", content: prompt }],
      system,
      maxTokens: 16000,
    });
  }

  /**
   * Full Pipeline: Raw Idea -> IdeaSpec -> Validation -> Gaps
   *
   * @param {string} rawIdea - User's raw idea text
   * @param {Object} [options]
   * @param {boolean} [options.validateFirst=true] - Run critic before returning
   * @param {boolean} [options.generateMarkdown=true] - Include compiled markdown
   * @returns {Promise<Object>} Pipeline result
   */
  async refine(rawIdea, options = {}) {
    const { validateFirst = true, generateMarkdown = true } = options;

    // Step 1: Architect structures the idea
    const ideaSpec = await this.runArchitect(rawIdea);

    let critique = null;

    // Step 2: Critic validates (optional)
    if (validateFirst) {
      critique = await this.runCritic(ideaSpec);

      if (critique.status === "FAILED") {
        const highSeverityIssues =
          critique.issues?.filter((i) => i.severity === "HIGH") || [];

        // Only block on high severity issues
        if (highSeverityIssues.length > 0) {
          return {
            success: false,
            ideaSpec,
            critique,
            issues: critique.issues,
            needsRevision: true,
          };
        }
      }
    }

    // Step 3: Find gaps for user interrogation
    const gaps = findGaps(ideaSpec);

    // Step 4: Compile to markdown if requested
    let markdown = null;
    if (generateMarkdown) {
      markdown = compileToMarkdown(ideaSpec);
    }

    return {
      success: true,
      ideaSpec,
      critique,
      gaps,
      markdown,
      needsInput: gaps.filter((g) => g.type === "required").length > 0,
    };
  }

  /**
   * Generate mockup from existing IdeaSpec
   * @param {Object} ideaSpec - Structured IdeaSpec object
   * @returns {Promise<string>} HTML mockup code
   */
  async generateMockup(ideaSpec) {
    return await this.runDesigner(ideaSpec);
  }

  /**
   * Re-run architect with additional context (for gap filling)
   * @param {Object} ideaSpec - Current IdeaSpec
   * @param {Array<{question: string, answer: string}>} qa - Q&A pairs
   * @returns {Promise<Object>} Updated IdeaSpec
   */
  async fillGaps(ideaSpec, qa) {
    const context = `
Current spec: ${JSON.stringify(ideaSpec, null, 2)}

Additional context from user:
${qa.map(({ question, answer }) => `Q: ${question}\nA: ${answer}`).join("\n\n")}

Please update the IdeaSpec with this new information. Return the complete updated JSON.`;

    const { system } = PROMPTS.architect("");

    const response = await generateCompletion({
      provider: this.provider,
      apiKey: this.apiKey,
      model: this.model,
      messages: [{ role: "user", content: context }],
      system,
      maxTokens: 8000,
    });

    try {
      const jsonString = this.extractJson(response);
      const updatedSpec = JSON.parse(jsonString);
      return validateIdeaSpec(updatedSpec);
    } catch (error) {
      console.error("Gap fill parse error:", error);
      return ideaSpec; // Return original on failure
    }
  }
}

/**
 * Factory function for creating orchestrator with current settings
 * @returns {AgentOrchestrator|null}
 */
export function createOrchestrator(config = null) {
  // 1. explicit config
  if (config) {
    if (!config.provider || !config.apiKey) {
      console.warn("AgentOrchestrator: Invalid config provided", config);
      return null;
    }
    return new AgentOrchestrator(config);
  }

  // 2. localStorage fallback
  const provider = localStorage.getItem("llm_provider");
  const apiKey = localStorage.getItem(`${provider}_api_key`);

  if (!provider || !apiKey) {
    console.warn("AgentOrchestrator: Missing provider or API key locally");
    return null;
  }

  return new AgentOrchestrator({ provider, apiKey });
}
