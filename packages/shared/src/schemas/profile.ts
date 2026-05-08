import { z } from 'zod';
import { SKILL_LEVELS } from '../types/skill-level.js';
import { SPORTS } from '../types/sport.js';

export const sportPreferenceSchema = z.object({
  sport: z.enum(SPORTS),
  skillLevel: z.enum(SKILL_LEVELS),
  position: z.string().max(50).optional(),
});
export type SportPreferenceInput = z.infer<typeof sportPreferenceSchema>;

export const updateProfileSchema = z.object({
  displayName: z.string().min(2).max(50).optional(),
  bio: z.string().max(500).optional(),
  birthYear: z.number().int().min(1920).max(new Date().getFullYear()).optional(),
  region: z.string().max(100).optional(),
  avatarUrl: z.string().url().optional(),
  sportPreferences: z.array(sportPreferenceSchema).optional(),
});
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
