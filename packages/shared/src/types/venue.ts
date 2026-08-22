import type { SportSlug } from './sport.js';

export const VENUE_STATUSES = ['active', 'suspended'] as const;
export type VenueStatus = (typeof VENUE_STATUSES)[number];

export const VENUE_STATUS_LABELS: Record<VenueStatus, string> = {
  active: 'Đang hoạt động',
  suspended: 'Tạm đình chỉ',
};

export const SLOT_STATUSES = ['open', 'booked', 'blocked'] as const;
export type SlotStatus = (typeof SLOT_STATUSES)[number];

export const SLOT_STATUS_LABELS: Record<SlotStatus, string> = {
  open: 'Còn trống',
  booked: 'Đã có người đặt',
  blocked: 'Chủ sân đóng',
};

export const BOOKING_STATUSES = ['pending', 'confirmed', 'rejected', 'cancelled'] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

export const BOOKING_STATUS_LABELS: Record<BookingStatus, string> = {
  pending: 'Chờ chủ sân duyệt',
  confirmed: 'Đã xác nhận',
  rejected: 'Bị từ chối',
  cancelled: 'Đã huỷ',
};

/** Chủ sân, rút gọn — chỉ những gì người thuê cần thấy. */
export interface VenueOwnerRef {
  id: string;
  displayName: string;
  avatarUrl: string | null;
}

export interface VenueSummary {
  id: string;
  name: string;
  sport: SportSlug;
  address: string;
  region: string | null;
  description: string | null;
  photoUrl: string | null;
  pricePerHour: number;
  /** Trung bình các phiếu đánh giá, 0 khi chưa ai chấm. */
  rating: number;
  reviewCount: number;
  status: VenueStatus;
  /** Số khung còn trống từ bây giờ trở đi — con số quyết định người ta có bấm vào hay không. */
  openSlotCount: number;
  owner: VenueOwnerRef;
  viewerIsOwner: boolean;
  createdAt: string;
}

export interface VenueSlotView {
  id: string;
  venueId: string;
  startsAt: string;
  endsAt: string;
  price: number;
  status: SlotStatus;
  openForTeams: boolean;
  note: string | null;
  /** Trạng thái đơn của chính người xem cho khung này — null là chưa đặt bao giờ. */
  viewerBookingStatus: BookingStatus | null;
  viewerBookingId: string | null;
  /** Chỉ chủ sân thấy: số đơn đang chờ duyệt cho khung này. */
  pendingCount: number;
}

export interface VenueReviewView {
  id: string;
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  score: number;
  comment: string | null;
  createdAt: string;
}

export interface VenueDetail extends VenueSummary {
  /** Khung giờ từ bây giờ trở đi, sắp theo thời gian tăng dần. */
  slots: VenueSlotView[];
  reviews: VenueReviewView[];
  /** Người xem đã chấm sân này chưa — dùng để hiện form sửa thay vì form mới. */
  viewerReview: { score: number; comment: string | null } | null;
  /**
   * Người xem có quyền đánh giá không: phải từng có một đơn đặt được xác nhận
   * và khung giờ đó đã trôi qua.
   */
  viewerCanReview: boolean;
}

export interface VenueListResponse {
  items: VenueSummary[];
  nextCursor: string | null;
}

/** Một đơn đặt sân, nhìn từ phía chủ sân hoặc từ phía người đặt. */
export interface BookingView {
  id: string;
  status: BookingStatus;
  note: string | null;
  createdAt: string;
  decidedAt: string | null;
  slot: {
    id: string;
    startsAt: string;
    endsAt: string;
    price: number;
  };
  venue: { id: string; name: string; sport: SportSlug; address: string };
  /** Người đặt. Chủ sân cần biết ai; người đặt nhìn thấy chính mình. */
  user: VenueOwnerRef;
  teamName: string | null;
}

export interface BookingListResponse {
  items: BookingView[];
  nextCursor: string | null;
}

/**
 * Khung trống chủ sân mở cho đội lẻ vào ghép (FR-008.7) — cũng chính là dữ liệu
 * cho mục "Sân đang cần tìm đội" trên Trang chủ (FR-004.4).
 */
export interface OpenSlotItem {
  slotId: string;
  venueId: string;
  venueName: string;
  sport: SportSlug;
  address: string;
  region: string | null;
  startsAt: string;
  endsAt: string;
  price: number;
  note: string | null;
  rating: number;
}

export interface OpenSlotListResponse {
  items: OpenSlotItem[];
}

/** FR-008.9 — thống kê đặt sân của một sân. */
export interface VenueStats {
  slotsTotal: number;
  slotsOpen: number;
  slotsBooked: number;
  bookingsPending: number;
  bookingsConfirmed: number;
  bookingsRejected: number;
  /** Tổng giá các khung đã xác nhận — doanh thu dự kiến, không phải tiền đã thu. */
  revenueConfirmed: number;
  rating: number;
  reviewCount: number;
}
