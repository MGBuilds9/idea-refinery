import { describe, it, expect } from 'vitest';
import { extractJSON } from '../lib/json-extractor';

describe('JSON Extraction', () => {
  it('should parse clean JSON directly', () => {
    const result = extractJSON('{"name": "test", "version": 1}');
    expect(result.success).toBe(true);
    expect(result.data.name).toBe('test');
    expect(result.strategy).toBe('direct');
  });

  it('should extract from markdown code block', () => {
    const input = 'Here is the spec:\n```json\n{"name": "test"}\n```\nDone!';
    const result = extractJSON(input);
    expect(result.success).toBe(true);
    expect(result.data.name).toBe('test');
    expect(result.strategy).toBe('code_block');
  });

  it('should extract from code block without json language tag', () => {
    const input = 'Result:\n```\n{"name": "test"}\n```';
    const result = extractJSON(input);
    expect(result.success).toBe(true);
    expect(result.data.name).toBe('test');
  });

  it('should extract JSON from surrounding text using brace counting', () => {
    const input = 'Sure! Here is your spec: {"name": "test", "nested": {"a": 1}} and thats all.';
    const result = extractJSON(input);
    expect(result.success).toBe(true);
    expect(result.data.name).toBe('test');
    expect(result.data.nested.a).toBe(1);
  });

  it('should handle nested braces correctly', () => {
    const input = '{"a": {"b": {"c": 1}}, "d": [1,2,3]}';
    const result = extractJSON(input);
    expect(result.success).toBe(true);
    expect(result.data.a.b.c).toBe(1);
  });

  it('should handle braces inside strings', () => {
    const input = '{"message": "use { and } carefully", "ok": true}';
    const result = extractJSON(input);
    expect(result.success).toBe(true);
    expect(result.data.ok).toBe(true);
  });

  it('should return error for empty input', () => {
    const result = extractJSON('');
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('should return error for null input', () => {
    const result = extractJSON(null);
    expect(result.success).toBe(false);
  });

  it('should return error for completely invalid text', () => {
    const result = extractJSON('This has no JSON at all, just regular text.');
    expect(result.success).toBe(false);
  });

  it('should handle truncated JSON gracefully', () => {
    const input = '{"name": "test", "features": [{"id": "1", "title": "incom';
    const result = extractJSON(input);
    expect(result.success).toBe(false);
  });

  it('should handle HTML response gracefully', () => {
    const input = '<html><body><h1>Error</h1></body></html>';
    const result = extractJSON(input);
    expect(result.success).toBe(false);
  });
});
