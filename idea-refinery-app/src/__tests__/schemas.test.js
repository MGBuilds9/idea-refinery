import { describe, it, expect } from 'vitest';
import { validateIdeaSpec } from '../lib/schemas';

describe('IdeaSpec Schema Validation', () => {
  it('should validate a complete valid IdeaSpec', () => {
    const validSpec = {
      meta: { name: 'Test App', tagline: 'A test application', id: '123', version: 1, target_audience: [] },
      features: [{ id: '1', title: 'Login', user_story: 'As a user I can login', acceptance_criteria: ['Has form'], complexity: 'low' }],
      tech_stack: { frontend: 'React', backend: 'Express', database: 'PostgreSQL', auth: 'JWT' },
      data_model: [],
      design: { theme_name: 'Dark', primary_color: '#d4af37', mood: 'Professional' }
    };
    const result = validateIdeaSpec(validSpec);
    expect(result.valid).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.data.meta.name).toBe('Test App');
  });

  it('should fill defaults for partial IdeaSpec', () => {
    const partial = { meta: { name: 'Minimal' } };
    const result = validateIdeaSpec(partial);
    expect(result.valid).toBe(true);
    expect(result.data.features).toEqual([]);
    // When parent object is omitted entirely, Zod v4 uses the default({}) directly
    // without running inner defaults. Inner defaults only apply when the parent
    // object is explicitly provided (e.g., tech_stack: {}).
    expect(result.data.tech_stack).toBeDefined();
    expect(result.data.design).toBeDefined();
  });

  it('should reject spec without meta.name', () => {
    const invalid = { meta: {} };
    const result = validateIdeaSpec(invalid);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0].path).toContain('meta');
  });

  it('should reject completely invalid input (string)', () => {
    const result = validateIdeaSpec('not an object');
    expect(result.valid).toBe(false);
  });

  it('should reject null input', () => {
    const result = validateIdeaSpec(null);
    expect(result.valid).toBe(false);
  });

  it('should reject invalid feature complexity enum', () => {
    const spec = {
      meta: { name: 'Test' },
      features: [{ id: '1', title: 'F1', complexity: 'extreme' }]
    };
    const result = validateIdeaSpec(spec);
    // 'extreme' is not in the enum ['low', 'medium', 'high'], so validation should fail
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('should handle extra fields gracefully', () => {
    const spec = { meta: { name: 'Test', extra_field: 'ignored' } };
    const result = validateIdeaSpec(spec);
    expect(result.valid).toBe(true);
  });

  it('should fill default complexity for features missing it', () => {
    const spec = {
      meta: { name: 'Test' },
      features: [{ id: '1', title: 'Feature One' }]
    };
    const result = validateIdeaSpec(spec);
    expect(result.valid).toBe(true);
    expect(result.data.features[0].complexity).toBe('medium');
  });

  it('should fill default tech_stack values', () => {
    const spec = { meta: { name: 'Test' }, tech_stack: {} };
    const result = validateIdeaSpec(spec);
    expect(result.valid).toBe(true);
    expect(result.data.tech_stack.frontend).toBe('React');
    expect(result.data.tech_stack.backend).toBe('Node.js/Express');
    expect(result.data.tech_stack.database).toBe('PostgreSQL');
    expect(result.data.tech_stack.auth).toBe('JWT');
  });

  it('should default version to 1', () => {
    const spec = { meta: { name: 'Test' } };
    const result = validateIdeaSpec(spec);
    expect(result.valid).toBe(true);
    expect(result.data.meta.version).toBe(1);
  });
});
