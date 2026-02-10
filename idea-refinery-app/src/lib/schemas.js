import { z } from 'zod';

/**
 * Zod schema for FeatureBlock
 * Lenient: most fields optional with sensible defaults
 */
export const FeatureBlockSchema = z.object({
  id: z.string(),
  title: z.string(),
  user_story: z.string().optional().default(''),
  acceptance_criteria: z.array(z.string()).optional().default([]),
  complexity: z.enum(['low', 'medium', 'high']).optional().default('medium'),
});

/**
 * Zod schema for a complete IdeaSpec
 * Lenient: catches truly broken specs, fills defaults for incomplete ones
 */
export const IdeaSpecSchema = z.object({
  meta: z.object({
    id: z.string().optional(),
    version: z.number().optional().default(1),
    name: z.string(),
    tagline: z.string().optional().default(''),
    target_audience: z.array(z.any()).optional().default([]),
  }),
  features: z.array(FeatureBlockSchema).optional().default([]),
  tech_stack: z.object({
    frontend: z.string().optional().default('React'),
    backend: z.string().optional().default('Node.js/Express'),
    database: z.string().optional().default('PostgreSQL'),
    auth: z.string().optional().default('JWT'),
  }).optional().default({}),
  data_model: z.array(z.any()).optional().default([]),
  design: z.object({
    theme_name: z.string().optional().default(''),
    primary_color: z.string().optional().default('#d4af37'),
    mood: z.string().optional().default(''),
  }).optional().default({}),
});

/**
 * Validate and return clean IdeaSpec with defaults filled in.
 * Returns { valid, errors, data } - lenient so partial AI output
 * still passes with defaults applied.
 *
 * @param {Object} data - Raw object to validate
 * @returns {{ valid: boolean, errors: Array, data: Object|null }}
 */
export function validateIdeaSpec(data) {
  const result = IdeaSpecSchema.safeParse(data);
  if (!result.success) {
    const fieldErrors = result.error.issues.map(i => ({
      path: i.path.join('.'),
      message: i.message,
      code: i.code,
    }));
    return { valid: false, errors: fieldErrors, data: null };
  }
  return { valid: true, errors: [], data: result.data };
}
