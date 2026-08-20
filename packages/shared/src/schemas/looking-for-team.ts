import { z } from 'zod';
import { sportSlugSchema } from './sport.js';
import { SKILL_LEVELS } from '../types/skill-level.js';
import { LIST_SORTS } from './sort.js';

export const createLookingForTeamSchema = z.object({
  sport: sportSlugSchema,
  region: z.string().trim().max(100).optional(),
  position: z.string().trim().max(50).optional(),
  skillLevel: z.enum(SKILL_LEVELS).optional(),
  description: z.string().trim().min(10, 'Mô tả tối thiểu 10 ký tự').max(1000),
  expiresAt: z.string().datetime({ offset: true }).optional(),
});
export type CreateLookingForTeamInput = z.infer<typeof createLookingForTeamSchema>;

export const updateLookingForTeamSchema = z.object({
  region: z.string().trim().max(100).nullish(),
  position: z.string().trim().max(50).nullish(),
  skillLevel: z.enum(SKILL_LEVELS).nullish(),
  description: z.string().trim().min(10).max(1000).optional(),
  status: z.enum(['open', 'closed']).optional(),
  expiresAt: z.string().datetime({ offset: true }).nullish(),
});
export type UpdateLookingForTeamInput = z.infer<typeof updateLookingForTeamSchema>;

export const lookingForTeamListQuerySchema = z.object({
  sport: sportSlugSchema.optional(),
  region: z.string().trim().max(100).optional(),
  position: z.string().trim().max(50).optional(),
  skillLevel: z.enum(SKILL_LEVELS).optional(),
  status: z.enum(['open', 'closed']).optional(),
  userId: z.string().cuid().optional(),
  sort: z.enum(LIST_SORTS).default('newest'),
  cursor: z.string().cuid().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
export type LookingForTeamListQuery = z.infer<typeof lookingForTeamListQuerySchema>;
