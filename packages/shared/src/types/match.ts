import type { SkillLevel } from './skill-level.js';
import type { SportSlug } from './sport.js';
import type { RecruitmentTeamRef } from './recruitment.js';

export const MATCH_REQUEST_STATUSES = ['open', 'matched', 'cancelled', 'expired'] as const;
export type MatchRequestStatus = (typeof MATCH_REQUEST_STATUSES)[number];

export const CHALLENGE_STATUSES = ['pending', 'accepted', 'rejected', 'withdrawn'] as const;
export type ChallengeStatus = (typeof CHALLENGE_STATUSES)[number];

export const MATCH_STATUSES = ['scheduled', 'completed', 'cancelled'] as const;
export type MatchStatus = (typeof MATCH_STATUSES)[number];

export const CHALLENGE_STATUS_LABELS: Record<ChallengeStatus, string> = {
  pending: 'Đang chờ',
  accepted: 'Đã chấp nhận',
  rejected: 'Đã từ chối',
  withdrawn: 'Đã rút',
};

export interface ChallengeView {
  id: string;
  matchRequestId: string;
  challengerTeam: RecruitmentTeamRef;
  message: string | null;
  status: ChallengeStatus;
  createdAt: string;
  decidedAt: string | null;
  isMine: boolean;
}

export interface MatchRequestSummary {
  id: string;
  teamId: string;
  team: RecruitmentTeamRef;
  sport: SportSlug;
  region: string | null;
  preferredTime: string | null;
  venueName: string | null;
  description: string;
  status: MatchRequestStatus;
  skillLevelMin: SkillLevel | null;
  expiresAt: string | null;
  challengeCount: number;
  viewerChallenge: { id: string; status: ChallengeStatus } | null;
  viewerOwns: boolean;
  createdAt: string;
}

export interface MatchRequestDetail extends MatchRequestSummary {
  challenges: ChallengeView[];
  match: MatchView | null;
}

export interface MatchView {
  id: string;
  matchRequestId: string | null;
  homeTeam: RecruitmentTeamRef;
  awayTeam: RecruitmentTeamRef;
  sport: SportSlug;
  scheduledAt: string | null;
  venueName: string | null;
  status: MatchStatus;
  homeScore: number | null;
  awayScore: number | null;
  createdAt: string;
}

export interface MatchRequestListResponse {
  items: MatchRequestSummary[];
  nextCursor: string | null;
}
