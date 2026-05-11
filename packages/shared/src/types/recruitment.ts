import type { SkillLevel } from './skill-level.js';
import type { SportSlug } from './sport.js';

export const RECRUITMENT_STATUSES = ['open', 'closed'] as const;
export type RecruitmentStatus = (typeof RECRUITMENT_STATUSES)[number];

export const JOIN_REQUEST_STATUSES = ['pending', 'accepted', 'rejected', 'cancelled'] as const;
export type JoinRequestStatus = (typeof JOIN_REQUEST_STATUSES)[number];

export const JOIN_REQUEST_STATUS_LABELS: Record<JoinRequestStatus, string> = {
  pending: 'Đang chờ',
  accepted: 'Đã chấp nhận',
  rejected: 'Đã từ chối',
  cancelled: 'Đã huỷ',
};

export interface RecruitmentTeamRef {
  id: string;
  name: string;
  sport: SportSlug;
  region: string | null;
  logoUrl: string | null;
  reputation: number;
}

export interface RecruitmentPostSummary {
  id: string;
  teamId: string;
  team: RecruitmentTeamRef;
  sport: SportSlug;
  region: string | null;
  positionNeeded: string | null;
  skillLevelMin: SkillLevel | null;
  description: string;
  status: RecruitmentStatus;
  expiresAt: string | null;
  requestCount: number;
  viewerRequestStatus: JoinRequestStatus | null;
  viewerIsTeamMember: boolean;
  createdAt: string;
}

export interface JoinRequestView {
  id: string;
  postId: string;
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  status: JoinRequestStatus;
  message: string | null;
  createdAt: string;
  decidedAt: string | null;
}

export interface RecruitmentPostDetail extends RecruitmentPostSummary {
  requests: JoinRequestView[];
}

export interface RecruitmentListResponse {
  items: RecruitmentPostSummary[];
  nextCursor: string | null;
}
