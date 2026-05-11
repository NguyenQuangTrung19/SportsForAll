import { z } from 'zod';
import { SKILL_LEVELS } from '../types/skill-level.js';
import { SPORTS } from '../types/sport.js';

export const createMatchRequestSchema = z.object({
  teamId: z.string().cuid(),
  region: z.string().trim().max(100).optional(),
  preferredTime: z.string().datetime({ offset: true }).optional(),
  venueName: z.string().trim().max(120).optional(),
  description: z.string().trim().min(5, 'Mô tả tối thiểu 5 ký tự').max(1000),
  skillLevelMin: z.enum(SKILL_LEVELS).optional(),
  expiresAt: z.string().datetime({ offset: true }).optional(),
});
export type CreateMatchRequestInput = z.infer<typeof createMatchRequestSchema>;

export const updateMatchRequestSchema = z.object({
  region: z.string().trim().max(100).nullish(),
  preferredTime: z.string().datetime({ offset: true }).nullish(),
  venueName: z.string().trim().max(120).nullish(),
  description: z.string().trim().min(5).max(1000).optional(),
  skillLevelMin: z.enum(SKILL_LEVELS).nullish(),
  status: z.enum(['open', 'cancelled']).optional(),
  expiresAt: z.string().datetime({ offset: true }).nullish(),
});
export type UpdateMatchRequestInput = z.infer<typeof updateMatchRequestSchema>;

export const matchRequestListQuerySchema = z.object({
  sport: z.enum(SPORTS).optional(),
  region: z.string().trim().max(100).optional(),
  skillLevelMin: z.enum(SKILL_LEVELS).optional(),
  status: z.enum(['open', 'matched', 'cancelled', 'expired']).optional(),
  teamId: z.string().cuid().optional(),
  cursor: z.string().cuid().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
export type MatchRequestListQuery = z.infer<typeof matchRequestListQuerySchema>;

export const sendChallengeSchema = z.object({
  challengerTeamId: z.string().cuid(),
  message: z.string().trim().max(500).optional(),
});
export type SendChallengeInput = z.infer<typeof sendChallengeSchema>;
