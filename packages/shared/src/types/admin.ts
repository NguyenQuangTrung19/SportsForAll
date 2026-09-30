import type { RecruitmentTeamRef } from './recruitment.js';
import type { ReportReason, ReportStatus } from './report.js';
import type { UserRole } from './role.js';
import type { SportSlug } from './sport.js';
import type { VenueStatus } from './venue.js';

/** Số liệu tổng quan của trang quản trị (FR-010.1). */
export interface AdminStats {
  users: number;
  usersNewLast7Days: number;
  usersDisabled: number;
  teams: number;
  matchesScheduled: number;
  matchesCompleted: number;
  recruitmentPostsOpen: number;
  matchRequestsOpen: number;
  lookingForPostsOpen: number;
  reportsPending: number;
  sportsActive: number;
  venuesActive: number;
  venuesSuspended: number;
  bookingsPending: number;
}

/** Một dòng trong danh sách người dùng của admin (FR-010.2). */
export interface AdminUserItem {
  id: string;
  email: string | null;
  displayName: string;
  avatarUrl: string | null;
  role: UserRole;
  region: string | null;
  reputation: number;
  emailVerified: boolean;
  onboardedAt: string | null;
  /** Khác null = đang bị khoá (FR-010.7). */
  disabledAt: string | null;
  createdAt: string;
  teamCount: number;
  /** Tên các đội người này làm captain — xoá tài khoản phải chuyển quyền trước. */
  captainOf: string[];
}

export interface AdminUserListResponse {
  items: AdminUserItem[];
  nextCursor: string | null;
}

/** Ba loại bài đăng admin duyệt được (FR-010.3). */
export const ADMIN_POST_KINDS = ['recruitment', 'match', 'looking-for-team'] as const;
export type AdminPostKind = (typeof ADMIN_POST_KINDS)[number];

export const ADMIN_POST_KIND_LABELS: Record<AdminPostKind, string> = {
  recruitment: 'Tuyển thành viên',
  match: 'Tìm đối thủ',
  'looking-for-team': 'Tìm đội',
};

export interface AdminPostItem {
  kind: AdminPostKind;
  id: string;
  /** Tên đội hoặc tên người đăng — ai chịu trách nhiệm cho bài này. */
  authorName: string;
  sport: SportSlug;
  region: string | null;
  description: string;
  /** `open` là đang hiển thị công khai; mọi giá trị khác coi như đã gỡ. */
  open: boolean;
  status: string;
  /** Đường dẫn tới bài trên web, để admin mở xem đúng thứ người dùng thấy. */
  link: string;
  createdAt: string;
}

export interface AdminPostListResponse {
  items: AdminPostItem[];
  nextCursor: string | null;
}

/** Báo cáo vi phạm chờ admin xử lý (FR-010.6). */
export interface AdminReportItem {
  id: string;
  reason: ReportReason;
  detail: string | null;
  status: ReportStatus;
  createdAt: string;
  resolvedAt: string | null;
  reporter: { id: string; displayName: string };
  reportedTeam: RecruitmentTeamRef;
  matchId: string | null;
}

export interface AdminReportListResponse {
  items: AdminReportItem[];
  nextCursor: string | null;
}

/** Một sân trong danh sách quản trị (FR-010.5). */
export interface AdminVenueItem {
  id: string;
  name: string;
  sport: SportSlug;
  address: string;
  region: string | null;
  pricePerHour: number;
  rating: number;
  status: VenueStatus;
  ownerName: string;
  ownerEmail: string | null;
  slotCount: number;
  bookingsConfirmed: number;
  createdAt: string;
}

export interface AdminVenueListResponse {
  items: AdminVenueItem[];
  nextCursor: string | null;
}

/** Một dòng nhật ký thao tác quản trị (FR-010.8). */
export interface AdminLogItem {
  id: string;
  adminId: string;
  adminName: string;
  action: string;
  targetType: string;
  targetId: string;
  detail: string | null;
  createdAt: string;
}

export interface AdminLogListResponse {
  items: AdminLogItem[];
  nextCursor: string | null;
}

export const ADMIN_ACTION_LABELS: Record<string, string> = {
  'user.role': 'Đổi vai trò',
  'user.rename': 'Đổi tên hiển thị',
  'user.disable': 'Khoá tài khoản',
  'user.enable': 'Mở khoá tài khoản',
  'user.delete': 'Xoá tài khoản',
  'post.close': 'Gỡ bài đăng',
  'post.reopen': 'Khôi phục bài đăng',
  'report.reviewed': 'Kết luận báo cáo',
  'report.dismissed': 'Bỏ qua báo cáo',
  'venue.suspend': 'Đình chỉ sân',
  'venue.activate': 'Mở lại sân',
};
