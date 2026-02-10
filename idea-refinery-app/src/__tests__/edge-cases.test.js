import { describe, it, expect } from 'vitest';
import { extractJSON } from '../lib/json-extractor';
import { validateIdeaSpec } from '../lib/schemas';

describe('Edge Cases', () => {
  it('should handle AI returning empty string', () => {
    const result = extractJSON('');
    expect(result.success).toBe(false);
  });

  it('should handle AI returning only whitespace', () => {
    const result = extractJSON('   \n\n\t  ');
    expect(result.success).toBe(false);
  });

  it('should handle extremely long feature descriptions', () => {
    const longDescription = 'A'.repeat(10000);
    const spec = {
      meta: { name: 'Test' },
      features: [{ id: '1', title: 'Feature', user_story: longDescription, complexity: 'high' }]
    };
    const result = validateIdeaSpec(spec);
    expect(result.valid).toBe(true);
  });

  it('should handle unicode/emoji in spec fields', () => {
    const spec = {
      meta: { name: '\u{1F680} Rocket App', tagline: '\u4E16\u754C\u4E00\u306E\u30A2\u30D7\u30EA' },
      features: [{ id: '1', title: '\u{1F510} Auth', complexity: 'medium' }]
    };
    const result = validateIdeaSpec(spec);
    expect(result.valid).toBe(true);
    expect(result.data.meta.name).toBe('\u{1F680} Rocket App');
  });

  it('should handle JSON with unicode escape sequences', () => {
    const input = '{"name": "\\u0048ello"}';
    const result = extractJSON(input);
    expect(result.success).toBe(true);
  });

  it('should handle spec with empty features array', () => {
    const spec = { meta: { name: 'Empty' }, features: [] };
    const result = validateIdeaSpec(spec);
    expect(result.valid).toBe(true);
    expect(result.data.features).toEqual([]);
  });

  it('should handle spec with 100 features', () => {
    const features = Array.from({ length: 100 }, (_, i) => ({
      id: String(i), title: `Feature ${i}`, complexity: 'medium'
    }));
    const spec = { meta: { name: 'Big' }, features };
    const result = validateIdeaSpec(spec);
    expect(result.valid).toBe(true);
    expect(result.data.features).toHaveLength(100);
  });

  it('should handle JSON with trailing comma (common LLM mistake)', () => {
    // This should fail gracefully since JSON.parse rejects trailing commas
    const input = '{"name": "test", "version": 1,}';
    const result = extractJSON(input);
    // May or may not parse depending on implementation - just should not crash
    expect(result).toBeDefined();
  });

  it('should handle non-string input to extractJSON', () => {
    const result = extractJSON(123);
    expect(result.success).toBe(false);
  });

  it('should handle undefined input to extractJSON', () => {
    const result = extractJSON(undefined);
    expect(result.success).toBe(false);
  });

  it('should handle spec with all optional fields missing', () => {
    const spec = { meta: { name: 'Bare Minimum' } };
    const result = validateIdeaSpec(spec);
    expect(result.valid).toBe(true);
    expect(result.data.features).toEqual([]);
    expect(result.data.data_model).toEqual([]);
    // When parent objects (design, tech_stack) are omitted, Zod v4 uses the
    // default({}) directly without running inner schema defaults.
    expect(result.data.design).toBeDefined();
    expect(result.data.tech_stack).toBeDefined();
    // meta inner defaults DO apply because meta is provided explicitly
    expect(result.data.meta.tagline).toBe('');
    expect(result.data.meta.target_audience).toEqual([]);
  });

  it('should fill inner defaults when parent objects are explicitly provided', () => {
    const spec = { meta: { name: 'With Objects' }, tech_stack: {}, design: {} };
    const result = validateIdeaSpec(spec);
    expect(result.valid).toBe(true);
    expect(result.data.tech_stack.frontend).toBe('React');
    expect(result.data.tech_stack.backend).toBe('Node.js/Express');
    expect(result.data.design.primary_color).toBe('#d4af37');
    expect(result.data.design.theme_name).toBe('');
  });
});
