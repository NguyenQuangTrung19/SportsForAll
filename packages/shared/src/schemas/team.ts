import { z } from 'zod';
import { SKILL_LEVELS } from '../types/skill-level.js';
import { SPORTS } from '../types/sport.js';
import { TEAM_ROLES } from '../types/team.js';

export const createTeamSchema = z.object({
  name: z.string().trim().min(2, 'Tên đội tối thiểu 2 ký tự').max(60),
  sport: z.enum(SPORTS),
  region: z.string().trim().max(100).optional(),
  description: z.string().trim().max(500).optional(),
  logoUrl: z.string().url().optional(),
  skillLevel: z.enum(SKILL_LEVELS).optional(),
});
export type CreateTeamInput = z.infer<typeof createTeamSchema>;

export const updateTeamSchema = z.object({
  name: z.string().trim().min(2).max(60).optional(),
  region: z.string().trim().max(100).nullish(),
  description: z.string().trim().max(500).nullish(),
  logoUrl: z.string().url().nullish(),
  skillLevel: z.enum(SKILL_LEVELS).nullish(),
});
export type UpdateTeamInput = z.infer<typeof updateTeamSchema>;

export const addMemberSchema = z.object({
  email: z.string().email().optional(),
  userId: z.string().cuid().optional(),
  role: z.enum(TEAM_ROLES).default('member'),
}).refine((v) => v.email || v.userId, {
  message: 'Cần email hoặc userId',
  path: ['email'],
});
export type AddMemberInput = z.infer<typeof addMemberSchema>;

export const updateMemberRoleSchema = z.object({
  role: z.enum(TEAM_ROLES),
});
export type UpdateMemberRoleInput = z.infer<typeof updateMemberRoleSchema>;
