import type { SkillLevel } from './skill-level.js';
import type { SportSlug } from './sport.js';

export const TEAM_ROLES = ['captain', 'co_captain', 'member'] as const;
export type TeamRole = (typeof TEAM_ROLES)[number];

export const TEAM_ROLE_LABELS: Record<TeamRole, string> = {
  captain: 'Đội trưởng',
  co_captain: 'Phó đội',
  member: 'Thành viên',
};

export interface TeamMemberView {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  role: TeamRole;
  joinedAt: string;
}

export interface TeamSummary {
  id: string;
  name: string;
  sport: SportSlug;
  region: string | null;
  skillLevel: SkillLevel | null;
  logoUrl: string | null;
  description: string | null;
  reputation: number;
  memberCount: number;
  viewerRole: TeamRole | null;
  createdAt: string;
}

export interface TeamDetail extends TeamSummary {
  members: TeamMemberView[];
}
