import type { SkillLevel } from './skill-level.js';
import type { SportSlug } from './sport.js';
import type { RecruitmentTeamRef } from './recruitment.js';

export const MATCH_REQUEST_STATUSES = ['open', 'matched', 'cancelled', 'expired'] as const;
export type MatchRequestStatus = (typeof MATCH_REQUEST_STATUSES)[number];

export const CHALLENGE_STATUSES = ['pending', 'accepted', 'rejected', 'withdrawn'] as const;
export type ChallengeStatus = (typeof CHALLENGE_STATUSES)[number];

export const MATCH_STATUSES = ['scheduled', 'completed', 'cancelled'] as const;
export type MatchStatus = (typeof MATCH_STATUSES)[number];

/** Buổi trong ngày của lời mời tìm trận (FR-005.5), suy ra từ `preferredTime`. */
export const TIME_SLOTS = ['morning', 'afternoon', 'evening'] as const;
export type TimeSlot = (typeof TIME_SLOTS)[number];

export const TIME_SLOT_LABELS: Record<TimeSlot, string> = {
  morning: 'Sáng',
  afternoon: 'Chiều',
  evening: 'Tối',
};

/** Khung giờ theo giờ Việt Nam — hiển thị cho người dùng biết ranh giới. */
export const TIME_SLOT_HINTS: Record<TimeSlot, string> = {
  morning: '05:00 – 11:59',
  afternoon: '12:00 – 17:59',
  evening: '18:00 – 04:59',
};

/** Thang điểm đánh giá sau trận (FR-005.10). */
export const RATING_MIN = 1;
export const RATING_MAX = 5;

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
  timeSlot: TimeSlot | null;
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
  /** Đội của người xem trong trận này — null nếu người xem đứng ngoài. */
  viewerTeamId: string | null;
  /** Đã qua giờ đá, trận chưa huỷ, và người xem thuộc một trong hai đội. */
  canRate: boolean;
  /** Người xem là captain/phó của một đội, trận chưa chốt và đã tới giờ đá (FR-007.6). */
  canComplete: boolean;
  viewerRating: RatingView | null;
}

/** Lịch sử trận của một đội (FR-007.6) — trận đã đá, mới nhất trước. */
export interface TeamMatchListResponse {
  items: MatchView[];
  nextCursor: string | null;
}

export interface RatingView {
  score: number;
  comment: string | null;
  createdAt: string;
}

export interface RatingResult {
  rating: RatingView;
  ratedTeamId: string;
  /** Điểm uy tín của đội bị chấm sau khi tính lại — để giao diện khỏi tải lại đội. */
  ratedTeamReputation: number;
}

export interface MatchRequestListResponse {
  items: MatchRequestSummary[];
  nextCursor: string | null;
}
