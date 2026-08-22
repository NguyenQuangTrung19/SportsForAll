export const NOTIFICATION_TYPES = [
  'join_request_received',
  'join_request_accepted',
  'join_request_rejected',
  'challenge_received',
  'challenge_accepted',
  'challenge_rejected',
  'match_scheduled',
  'rating_received',
  'team_invite_received',
  'team_invite_accepted',
  'team_invite_rejected',
  'booking_requested',
  'booking_confirmed',
  'booking_rejected',
  'booking_cancelled',
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export interface NotificationView {
  id: string;
  type: NotificationType;
  title: string;
  message: string | null;
  link: string | null;
  readAt: string | null;
  createdAt: string;
}

export interface NotificationListResponse {
  items: NotificationView[];
  unreadCount: number;
  nextCursor: string | null;
}
