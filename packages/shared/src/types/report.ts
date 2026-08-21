/** Báo cáo đội vi phạm (FR-005.11). Admin xử lý ở FR-010.6. */
export const REPORT_REASONS = [
  'no_show',
  'violence',
  'abusive_language',
  'cheating',
  'other',
] as const;

export type ReportReason = (typeof REPORT_REASONS)[number];

export const REPORT_REASON_LABELS: Record<ReportReason, string> = {
  no_show: 'Bỏ trận / không đến',
  violence: 'Bạo lực, ẩu đả',
  abusive_language: 'Lời lẽ xúc phạm',
  cheating: 'Gian lận đội hình',
  other: 'Lý do khác',
};

export const REPORT_STATUSES = ['pending', 'reviewed', 'dismissed'] as const;
export type ReportStatus = (typeof REPORT_STATUSES)[number];

export const REPORT_STATUS_LABELS: Record<ReportStatus, string> = {
  pending: 'Chờ xử lý',
  reviewed: 'Đã xử lý',
  dismissed: 'Đã bỏ qua',
};

export interface ReportView {
  id: string;
  reportedTeamId: string;
  matchId: string | null;
  reason: ReportReason;
  detail: string | null;
  status: ReportStatus;
  createdAt: string;
}
