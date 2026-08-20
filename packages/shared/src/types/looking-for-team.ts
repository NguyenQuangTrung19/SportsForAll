import type { RecruitmentStatus } from './recruitment.js';
import type { SkillLevel } from './skill-level.js';
import type { SportSlug } from './sport.js';

export interface LookingForTeamAuthor {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  region: string | null;
  reputation: number;
}

export interface LookingForTeamPostSummary {
  id: string;
  sport: SportSlug;
  region: string | null;
  position: string | null;
  skillLevel: SkillLevel | null;
  description: string;
  status: RecruitmentStatus;
  expiresAt: string | null;
  author: LookingForTeamAuthor;
  viewerIsAuthor: boolean;
  createdAt: string;
}

export interface LookingForTeamListResponse {
  items: LookingForTeamPostSummary[];
  nextCursor: string | null;
}
