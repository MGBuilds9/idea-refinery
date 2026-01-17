/**
 * IdeaSpec.js - The core data structure for Blueprint v1.5
 * 
 * This module defines the JSON schema for structured idea specifications
 * and provides validation/utility helpers for working with the spec.
 */

/**
 * Default IdeaSpec template with all fields initialized
 */
export const IdeaSpecSchema = {
  meta: {
    id: null,
    version: 1,
    name: '',
    tagline: '',
    target_audience: []
  },
  features: [],
  tech_stack: {
    frontend: 'React + Vite',
    backend: 'Node.js',
    database: 'PostgreSQL',
    auth: 'Supabase Auth'
  },
  data_model: [],
  design: {
    theme_name: 'Premium Dark',
    primary_color: '#d4af37',
    mood: 'Professional, Modern'
  }
};

/**
 * Template for a feature block
 */
export const FeatureBlockSchema = {
  id: '',
  title: '',
  user_story: '',
  acceptance_criteria: [],
  complexity: 'medium'
};

/**
 * Template for a data model entity
 */
export const SchemaEntityTemplate = {
  entity: '',
  fields: []
};

/**
 * Deep merge utility for objects
 * @param {Object} target - Base object
 * @param {Object} source - Object to merge in
 * @returns {Object} Merged object
 */
function mergeDeep(target, source) {
  const output = { ...target };
  
  if (isObject(target) && isObject(source)) {
    Object.keys(source).forEach(key => {
      if (isObject(source[key])) {
        if (!(key in target)) {
          output[key] = source[key];
        } else {
          output[key] = mergeDeep(target[key], source[key]);
        }
      } else if (source[key] !== null && source[key] !== undefined) {
        output[key] = source[key];
      }
    });
  }
  
  return output;
}

function isObject(item) {
  return item && typeof item === 'object' && !Array.isArray(item);
}

/**
 * Validate and fill defaults for an IdeaSpec
 * @param {Object} spec - Partial IdeaSpec object
 * @returns {Object} Complete IdeaSpec with defaults applied
 */
export function validateIdeaSpec(spec) {
  if (!spec || typeof spec !== 'object') {
    return { ...IdeaSpecSchema };
  }
  
  const merged = mergeDeep(IdeaSpecSchema, spec);
  
  // Generate ID if missing
  if (!merged.meta.id) {
    merged.meta.id = `idea_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  // Ensure features have IDs
  merged.features = (merged.features || []).map((f, idx) => ({
    ...FeatureBlockSchema,
    ...f,
    id: f.id || `feature_${idx + 1}`
  }));
  
  // Ensure data_model entities have structure
  merged.data_model = (merged.data_model || []).map(entity => ({
    ...SchemaEntityTemplate,
    ...entity,
    fields: entity.fields || []
  }));
  
  return merged;
}

/**
 * Find null/empty fields that need user input (gaps)
 * @param {Object} spec - IdeaSpec to analyze
 * @returns {Array<{path: string, type: string, message: string}>} Array of gaps
 */
export function findGaps(spec) {
  const gaps = [];
  
  // Check meta fields
  if (!spec.meta?.name) {
    gaps.push({ 
      path: 'meta.name', 
      type: 'required', 
      message: 'Project name is required' 
    });
  }
  if (!spec.meta?.tagline) {
    gaps.push({ 
      path: 'meta.tagline', 
      type: 'recommended', 
      message: 'A tagline helps define the project vision' 
    });
  }
  if (!spec.meta?.target_audience?.length) {
    gaps.push({ 
      path: 'meta.target_audience', 
      type: 'recommended', 
      message: 'Defining target audience improves feature decisions' 
    });
  }
  
  // Check features
  if (!spec.features?.length) {
    gaps.push({ 
      path: 'features', 
      type: 'required', 
      message: 'At least one feature is required' 
    });
  } else {
    spec.features.forEach((f, idx) => {
      if (!f.user_story) {
        gaps.push({ 
          path: `features[${idx}].user_story`, 
          type: 'recommended', 
          message: `Feature "${f.title || idx + 1}" needs a user story` 
        });
      }
      if (!f.acceptance_criteria?.length) {
        gaps.push({ 
          path: `features[${idx}].acceptance_criteria`, 
          type: 'recommended', 
          message: `Feature "${f.title || idx + 1}" needs acceptance criteria` 
        });
      }
    });
  }
  
  // Check data model
  if (!spec.data_model?.length) {
    gaps.push({ 
      path: 'data_model', 
      type: 'recommended', 
      message: 'Data model helps with database design' 
    });
  }
  
  return gaps;
}

/**
 * Get required gaps only (for blocking progression)
 * @param {Object} spec - IdeaSpec to analyze
 * @returns {Array} Array of required gaps
 */
export function getRequiredGaps(spec) {
  return findGaps(spec).filter(g => g.type === 'required');
}

/**
 * Generate questions to fill gaps
 * @param {Array} gaps - Gap array from findGaps
 * @returns {Array<string>} Questions to ask the user
 */
export function generateGapQuestions(gaps) {
  const questionMap = {
    'meta.name': 'What would you like to name this project?',
    'meta.tagline': 'In one sentence, what does this project do?',
    'meta.target_audience': 'Who is the primary user of this application?',
    'features': 'What are the core features this application needs?',
    'data_model': 'What are the main data entities (e.g., Users, Products, Orders)?'
  };
  
  return gaps.map(gap => {
    // Check for direct match first
    if (questionMap[gap.path]) {
      return questionMap[gap.path];
    }
    // Generic fallback
    return gap.message;
  });
}

/**
 * Compile IdeaSpec to markdown blueprint
 * @param {Object} spec - Complete IdeaSpec
 * @returns {string} Markdown blueprint
 */
export function compileToMarkdown(spec) {
  const lines = [];
  
  lines.push(`# Project Blueprint: ${spec.meta.name}`);
  lines.push('');
  lines.push(`> ${spec.meta.tagline}`);
  lines.push('');
  
  // Overview
  lines.push('## Overview');
  lines.push('');
  lines.push(`**Target Audience:** ${spec.meta.target_audience?.join(', ') || 'General users'}`);
  lines.push('');
  
  // Core Features
  lines.push('## Core Features');
  lines.push('');
  spec.features?.forEach(f => {
    const complexityIcon = { low: '🟢', medium: '🟡', high: '🔴' }[f.complexity] || '⚪';
    lines.push(`### ${complexityIcon} ${f.title}`);
    if (f.user_story) {
      lines.push(`*${f.user_story}*`);
    }
    lines.push('');
    if (f.acceptance_criteria?.length) {
      lines.push('**Acceptance Criteria:**');
      f.acceptance_criteria.forEach(ac => {
        lines.push(`- [ ] ${ac}`);
      });
      lines.push('');
    }
  });
  
  // Tech Stack
  lines.push('## Recommended Tech Stack');
  lines.push('');
  lines.push(`| Layer | Technology |`);
  lines.push(`|-------|------------|`);
  lines.push(`| Frontend | ${spec.tech_stack.frontend} |`);
  lines.push(`| Backend | ${spec.tech_stack.backend} |`);
  lines.push(`| Database | ${spec.tech_stack.database} |`);
  lines.push(`| Auth | ${spec.tech_stack.auth} |`);
  lines.push('');
  
  // Data Model
  if (spec.data_model?.length) {
    lines.push('## Data Models');
    lines.push('');
    spec.data_model.forEach(entity => {
      lines.push(`### ${entity.entity}`);
      lines.push('');
      if (entity.fields?.length) {
        lines.push('| Field | Type |');
        lines.push('|-------|------|');
        entity.fields.forEach(f => {
          lines.push(`| ${f.name} | ${f.type} |`);
        });
        lines.push('');
      }
    });
  }
  
  // Design
  lines.push('## Design Principles');
  lines.push('');
  lines.push(`- **Theme:** ${spec.design.theme_name}`);
  lines.push(`- **Primary Color:** ${spec.design.primary_color}`);
  lines.push(`- **Mood:** ${spec.design.mood}`);
  lines.push('');
  
  return lines.join('\n');
}
