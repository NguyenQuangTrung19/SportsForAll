import type { SkillLevel } from './skill-level.js';
import type { SportSlug } from './sport.js';

export interface SportPreference {
  sport: SportSlug;
  skillLevel: SkillLevel;
  position: string | null;
}

export interface ProfileResponse {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  bio: string | null;
  birthYear: number | null;
  region: string | null;
  reputation: number;
  emailVerified: boolean;
  onboardedAt: string | null;
  sportPreferences: SportPreference[];
  createdAt: string;
}
