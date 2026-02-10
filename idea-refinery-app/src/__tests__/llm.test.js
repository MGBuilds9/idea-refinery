import { describe, it, expect } from 'vitest';
import { classifyAIError } from '../lib/llm';

describe('AI Error Classification', () => {
  it('should classify 401 as auth error', () => {
    const result = classifyAIError(new Error('Unauthorized'), 401);
    expect(result.type).toBe('auth_error');
    expect(result.suggestion).toContain('API key');
  });

  it('should classify 403 as auth error', () => {
    const result = classifyAIError(new Error('Forbidden'), 403);
    expect(result.type).toBe('auth_error');
  });

  it('should classify 429 as rate limit', () => {
    const result = classifyAIError(new Error('Too many requests'), 429);
    expect(result.type).toBe('rate_limit');
  });

  it('should classify quota errors', () => {
    const result = classifyAIError(new Error('You have exceeded your quota'));
    expect(result.type).toBe('quota_exceeded');
  });

  it('should classify network errors', () => {
    const result = classifyAIError(new Error('ECONNREFUSED'));
    expect(result.type).toBe('network_error');
  });

  it('should classify timeout errors as network', () => {
    const result = classifyAIError(new Error('Request timeout'));
    expect(result.type).toBe('network_error');
  });

  it('should classify JSON parse errors', () => {
    const result = classifyAIError(new Error('Unexpected token'));
    expect(result.type).toBe('parse_error');
  });

  it('should classify model not found errors', () => {
    const result = classifyAIError(new Error('model not found'));
    expect(result.type).toBe('model_error');
  });

  it('should return unknown for generic errors', () => {
    const result = classifyAIError(new Error('Something weird happened'));
    expect(result.type).toBe('unknown');
    expect(result.message).toBeDefined();
  });

  it('should handle null error', () => {
    const result = classifyAIError(null);
    expect(result.type).toBe('unknown');
  });

  it('should handle undefined error', () => {
    const result = classifyAIError(undefined);
    expect(result.type).toBe('unknown');
  });

  it('should always include a suggestion', () => {
    const errors = [
      classifyAIError(new Error('Unauthorized'), 401),
      classifyAIError(new Error('Too many requests'), 429),
      classifyAIError(new Error('quota exceeded')),
      classifyAIError(new Error('ECONNREFUSED')),
      classifyAIError(new Error('Unexpected token')),
      classifyAIError(new Error('Something random')),
      classifyAIError(null),
    ];
    errors.forEach(result => {
      expect(result.suggestion).toBeDefined();
      expect(result.suggestion.length).toBeGreaterThan(0);
    });
  });
});
