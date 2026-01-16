export const PROMPTS = {
  questions: (idea) => ({
    system: "You are an expert product manager and technical architect.",
    prompt: `I have a project idea: "${idea}"

Generate 3-5 thoughtful, specific questions that would help refine this idea and uncover important requirements, technical considerations, and feature needs. 

Return ONLY a JSON array of strings (the questions), nothing else. Format: ["question 1", "question 2", ...]`
  }),

  blueprint: (idea, questions, answers) => {
    const qaPairs = questions.map((q, i) => `Q: ${q}\nA: ${answers[i]}`).join('\n\n');
    return {
      system: "You are an expert software architect and product strategist.",
      prompt: `Based on this project idea and answers, create a comprehensive technical blueprint in markdown format.

PROJECT IDEA: "${idea}"

CLARIFYING Q&A:
${qaPairs}

CRITICAL TECH STACK GUIDELINES:
- Recommend MODERN, SIMPLE solutions that get users up and running quickly
- Prefer: Next.js, Vite + React, Supabase, Resend, n8n, Tailwind CSS, shadcn/ui
- Avoid over-engineering - choose the simplest viable approach
- Focus on aesthetic, eye-catching design with minimal complexity
- This is for "vibe-coders" and non-traditional developers

Generate a complete markdown blueprint with these sections:
# Project Blueprint: [Project Name]

## Overview
Brief description and purpose

## Core Features
Comprehensive list of all necessary features

## Recommended Tech Stack
Modern, simple technologies optimized for rapid development

## Architecture
High-level system architecture (keep simple)

## Data Models
Key entities and relationships

## User Flow
Primary user journeys

## Implementation Phases
Suggested development phases

## Design Principles
Aesthetic and UX considerations

## Considerations
Technical constraints, security, performance, scalability

---

## Master Takeoff Prompt

[Generate a comprehensive, ready-to-use prompt that can be pasted directly into Cursor, Lovable, Bolt, Replit, or similar AI coding tools. This should include:
- Complete project context
- Tech stack specifications
- Core features to implement
- Design requirements
- File structure suggestions
- Any specific implementation details
Make it detailed enough that an AI agent can start building immediately.]

Be specific, thorough, and technical. This should serve as a complete development blueprint.`
    };
  },

  refine: () => {
    return {
      system: `You are helping refine a project blueprint for "vibe-coders" and non-traditional developers. The user may ask for changes, additions, clarifications, or complete rewrites. 

ALWAYS respond with the updated COMPLETE blueprint in markdown format, incorporating their feedback.

CRITICAL TECH STACK PRINCIPLES:
- Recommend MODERN, SIMPLE solutions (Next.js, Vite + React, Supabase, Resend, n8n, Tailwind, shadcn/ui)
- Avoid over-engineering - simplest viable approach wins
- Focus on aesthetic, eye-catching design
- Optimize for rapid development and deployment

The blueprint must end with a "## Master Takeoff Prompt" section that's ready to paste into Cursor, Lovable, Bolt, or Replit. Be thorough and technical.`
    };
  },

  // Second pass prompt - used to refine the output of the first AI
  secondPass: (originalBlueprint) => ({
    system: `You are a senior technical architect and product strategist reviewing a project blueprint.

Your task is to CRITIQUE and IMPROVE the blueprint, making it:
- More actionable and specific
- Better organized and clearer
- More technically sound
- More aligned with modern best practices

Maintain the same overall structure but enhance every section. Fix any issues, fill gaps, and add practical details.`,
    prompt: `Please review and improve the following project blueprint. Keep all sections but enhance the content:

${originalBlueprint}

Return the COMPLETE improved blueprint in the same markdown format. The blueprint must include all original sections, ending with "## Master Takeoff Prompt".`
  }),

  mockup: (blueprint) => ({
    system: "You are an expert UI/UX designer and frontend developer specializing in data visualization and app showcases.",
    prompt: `Based on this project blueprint, create a complete, standalone HTML file that VISUALIZES the concept.

BLUEPRINT:
${blueprint}

Analyze the blueprint to determine if this is primarily a "User Interface (App/Website)" or a "Process/Workflow".

IF IT IS AN APP OR WEBSITE:
- Create a visual mockup of the interface displayed with a "Perspective Design" style.
- Frame the main interface in a stylized window or device container that has a subtle 3D tilt/perspective effect (using CSS transform: perspective/rotate3d) to make it look like a high-end showcase.
- The design should look like it's "floating" in 3D space.
- Ensure the UI itself is within this transformed container.
- It should look "premium" and modern, verifying the "vibe" of the idea.

IF IT IS A WORKFLOW, SYSTEM, OR AUTOMATION:
- Create a "Line Tree Diagram" or flowchart visualization.
- Use SVGs or CSS to draw nodes and connecting lines representing the steps/logic of the workflow.
- Make it interactive (hover effects on nodes).
- It should clearly visualize the logic flow, branching, and outputs.

GENERAL REQUIREMENTS:
- Single HTML file with embedded CSS and JavaScript.
- Beautiful, MODERN, eye-catching design.
- Showcase 3-5 signature features.
- Include the project goal/mission.
- Focus on SIMPLICITY and AESTHETICS.
- Use Google Fonts.
- Dark mode preference unless otherwise specified.
- Clean, minimal code.

IMPORTANT: At the bottom of the HTML, include a hidden section with the full markdown blueprint embedded in a <pre> tag with id="markdown-content". Add a "Copy Blueprint" button that copies this markdown to clipboard. Style it minimally.

Return ONLY the complete HTML code, nothing else.`
  })
};
