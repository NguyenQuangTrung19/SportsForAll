export const NOTIFICATION_TYPES = [
  'join_request_received',
  'join_request_accepted',
  'join_request_rejected',
  'challenge_received',
  'challenge_accepted',
  'challenge_rejected',
  'match_scheduled',
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
