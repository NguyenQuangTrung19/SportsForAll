import type { JoinRequestStatus } from './recruitment.js';
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

/**
 * Lời mời đội gửi cho một người chơi (FR-006.8), nhìn từ phía đội.
 * Dùng lại `JoinRequestStatus` — vòng đời hai chiều giống hệt nhau.
 */
export interface TeamInviteView {
  id: string;
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  status: JoinRequestStatus;
  message: string | null;
  createdAt: string;
  decidedAt: string | null;
}

export interface TeamDetail extends TeamSummary {
  members: TeamMemberView[];
  /**
   * Lời mời còn đang chờ trả lời. Chỉ captain/phó thấy — người ngoài nhận mảng
   * rỗng, vì đây là việc nội bộ của đội.
   */
  pendingInvites: TeamInviteView[];
}
