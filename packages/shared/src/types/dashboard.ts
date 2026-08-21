import type { SkillLevel } from './skill-level.js';
import type { MatchView } from './match.js';
import type { RecruitmentTeamRef } from './recruitment.js';

export const ATTENDANCE_STATUSES = ['going', 'not_going'] as const;
export type AttendanceStatus = (typeof ATTENDANCE_STATUSES)[number];

export const ATTENDANCE_STATUS_LABELS: Record<AttendanceStatus, string> = {
  going: 'Có mặt',
  not_going: 'Vắng',
};

/**
 * Điểm danh của một trận.
 *
 * `pending` không lưu trong DB mà suy ra từ sĩ số đội của người xem trừ đi số
 * người đã trả lời — thêm/bớt thành viên là con số tự đúng, không phải backfill.
 */
export interface MatchAttendanceSummary {
  going: number;
  notGoing: number;
  pending: number;
  mine: AttendanceStatus | null;
}

/** Trận đã chốt lịch gần nhất của người xem, kèm phía đối diện đã tách sẵn. */
export interface NextMatchView extends MatchView {
  myTeam: RecruitmentTeamRef;
  opponent: RecruitmentTeamRef;
  attendance: MatchAttendanceSummary;
}

/** Đơn xin vào đội đang chờ, gom từ mọi đội người xem làm captain/phó. */
export interface PendingJoinRequestItem {
  id: string;
  postId: string;
  applicant: {
    id: string;
    displayName: string;
    avatarUrl: string | null;
  };
  team: RecruitmentTeamRef;
  positionNeeded: string | null;
  skillLevel: SkillLevel | null;
  message: string | null;
  createdAt: string;
}

/** Lời thách đấu người khác gửi tới tin tìm đối của đội mình, đang chờ trả lời. */
export interface IncomingChallengeItem {
  id: string;
  matchRequestId: string;
  challengerTeam: RecruitmentTeamRef;
  myTeam: RecruitmentTeamRef;
  preferredTime: string | null;
  venueName: string | null;
  region: string | null;
  message: string | null;
  createdAt: string;
}

/**
 * Tất cả những gì khối "Cần bạn xử lý" và "Trận kế tiếp" trên Trang chủ cần.
 *
 * Gom vào một endpoint thay vì bốn: cả bốn phần đều bắt đầu bằng cùng một truy
 * vấn danh sách đội của người dùng, tách ra là lặp lại bốn lần.
 */
export interface DashboardResponse {
  nextMatch: NextMatchView | null;
  pendingJoinRequests: PendingJoinRequestItem[];
  incomingChallenges: IncomingChallengeItem[];
  /** Tổng số việc cần xử lý — dùng cho con số trên tiêu đề khối. */
  actionCount: number;
}
