import type { Match } from '@prisma/client';

/**
 * Trận đã đá xong chưa — mốc để mở phần đánh giá (FR-005.10).
 *
 * Chưa có luồng "kết thúc trận" nên mốc là giờ đá đã trôi qua; trận không hẹn
 * giờ thì chỉ tính khi ai đó đánh dấu `completed`. Dùng chung cho cả route trận
 * lẫn dashboard để hai nơi không trả lời khác nhau về cùng một trận.
 */
export function hasBeenPlayed(m: Pick<Match, 'status' | 'scheduledAt'>): boolean {
  if (m.status === 'cancelled') return false;
  if (m.status === 'completed') return true;
  return m.scheduledAt !== null && m.scheduledAt <= new Date();
}
