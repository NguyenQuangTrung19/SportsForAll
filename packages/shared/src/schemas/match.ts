import { z } from 'zod';
import { sportSlugSchema } from './sport.js';
import { LIST_SORTS } from './sort.js';
import { SKILL_LEVELS } from '../types/skill-level.js';
import { RATING_MAX, RATING_MIN, TIME_SLOTS } from '../types/match.js';

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
  sport: sportSlugSchema.optional(),
  region: z.string().trim().max(100).optional(),
  skillLevelMin: z.enum(SKILL_LEVELS).optional(),
  /** FR-005.2 — chỉ lấy đội có uy tín từ mức này trở lên. */
  reputationMin: z.coerce.number().min(0).max(RATING_MAX).optional(),
  /** FR-005.4 — khớp một phần tên sân, không phân biệt hoa thường. */
  venue: z.string().trim().min(1).max(120).optional(),
  /** FR-005.5 — buổi trong ngày, suy ra từ `preferredTime` lúc lưu. */
  timeSlot: z.enum(TIME_SLOTS).optional(),
  status: z.enum(['open', 'matched', 'cancelled', 'expired']).optional(),
  teamId: z.string().cuid().optional(),
  sort: z.enum(LIST_SORTS).default('newest'),
  cursor: z.string().cuid().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
export type MatchRequestListQuery = z.infer<typeof matchRequestListQuerySchema>;

export const sendChallengeSchema = z.object({
  challengerTeamId: z.string().cuid(),
  message: z.string().trim().max(500).optional(),
});
export type SendChallengeInput = z.infer<typeof sendChallengeSchema>;

export const submitRatingSchema = z.object({
  score: z.coerce.number().int().min(RATING_MIN).max(RATING_MAX),
  comment: z.string().trim().max(500).optional(),
});
export type SubmitRatingInput = z.infer<typeof submitRatingSchema>;

/** Kết thúc trận (FR-007.6): captain/phó của một trong hai đội chốt tỉ số. */
export const completeMatchSchema = z.object({
  homeScore: z.coerce.number().int().min(0).max(999),
  awayScore: z.coerce.number().int().min(0).max(999),
});
export type CompleteMatchInput = z.infer<typeof completeMatchSchema>;

export const teamMatchListQuerySchema = z.object({
  cursor: z.string().cuid().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});
export type TeamMatchListQuery = z.infer<typeof teamMatchListQuerySchema>;
