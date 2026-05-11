import { z } from 'zod';
import { SKILL_LEVELS } from '../types/skill-level.js';
import { SPORTS } from '../types/sport.js';

const currentYear = new Date().getFullYear();

export const sportPreferenceSchema = z.object({
  sport: z.enum(SPORTS),
  skillLevel: z.enum(SKILL_LEVELS),
  position: z.string().trim().max(50).nullish(),
});
export type SportPreferenceInput = z.infer<typeof sportPreferenceSchema>;

export const updateProfileSchema = z.object({
  displayName: z.string().trim().min(2).max(50).optional(),
  bio: z.string().trim().max(500).nullish(),
  birthYear: z.number().int().min(1920).max(currentYear).nullish(),
  region: z.string().trim().max(100).nullish(),
  avatarUrl: z.string().url().nullish(),
  sportPreferences: z.array(sportPreferenceSchema).max(SPORTS.length).optional(),
});
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

export const completeOnboardingSchema = z.object({
  birthYear: z.number().int().min(1920).max(currentYear),
  region: z.string().trim().min(2).max(100),
  bio: z.string().trim().max(500).optional(),
  sportPreferences: z
    .array(sportPreferenceSchema)
    .min(1, 'Chọn ít nhất một môn thể thao')
    .max(SPORTS.length),
});
export type CompleteOnboardingInput = z.infer<typeof completeOnboardingSchema>;
