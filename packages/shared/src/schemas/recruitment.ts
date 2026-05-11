import { z } from 'zod';
import { SKILL_LEVELS } from '../types/skill-level.js';
import { SPORTS } from '../types/sport.js';

export const createRecruitmentPostSchema = z.object({
  teamId: z.string().cuid(),
  positionNeeded: z.string().trim().max(50).optional(),
  skillLevelMin: z.enum(SKILL_LEVELS).optional(),
  region: z.string().trim().max(100).optional(),
  description: z.string().trim().min(10, 'Mô tả tối thiểu 10 ký tự').max(1000),
  expiresAt: z.string().datetime({ offset: true }).optional(),
});
export type CreateRecruitmentPostInput = z.infer<typeof createRecruitmentPostSchema>;

export const updateRecruitmentPostSchema = z.object({
  positionNeeded: z.string().trim().max(50).nullish(),
  skillLevelMin: z.enum(SKILL_LEVELS).nullish(),
  region: z.string().trim().max(100).nullish(),
  description: z.string().trim().min(10).max(1000).optional(),
  status: z.enum(['open', 'closed']).optional(),
  expiresAt: z.string().datetime({ offset: true }).nullish(),
});
export type UpdateRecruitmentPostInput = z.infer<typeof updateRecruitmentPostSchema>;

export const recruitmentListQuerySchema = z.object({
  sport: z.enum(SPORTS).optional(),
  region: z.string().trim().max(100).optional(),
  positionNeeded: z.string().trim().max(50).optional(),
  skillLevelMin: z.enum(SKILL_LEVELS).optional(),
  status: z.enum(['open', 'closed']).optional(),
  teamId: z.string().cuid().optional(),
  cursor: z.string().cuid().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
export type RecruitmentListQuery = z.infer<typeof recruitmentListQuerySchema>;

export const applyJoinSchema = z.object({
  message: z.string().trim().max(500).optional(),
});
export type ApplyJoinInput = z.infer<typeof applyJoinSchema>;
