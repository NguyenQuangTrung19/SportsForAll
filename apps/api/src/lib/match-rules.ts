import type { Match } from '@prisma/client';

/**
 * Trận đã đá xong chưa — mốc để mở phần đánh giá (FR-005.10).
 *
 * Trận đã chốt tỉ số (`completed`, FR-007.6) thì chắc chắn rồi; chưa chốt thì
 * lấy mốc giờ đá đã trôi qua, để captain quên bấm "kết thúc" không khoá mất phần
 * chấm điểm. Trận không hẹn giờ chỉ tính khi đã chốt. Dùng chung cho cả route
 * trận lẫn dashboard để hai nơi không trả lời khác nhau về cùng một trận.
 */
export function hasBeenPlayed(m: Pick<Match, 'status' | 'scheduledAt'>): boolean {
  if (m.status === 'cancelled') return false;
  if (m.status === 'completed') return true;
  return m.scheduledAt !== null && m.scheduledAt <= new Date();
}

/**
 * Còn chốt tỉ số được không (FR-007.6): chỉ trận đang `scheduled`, và không
 * trước giờ đá — chốt kết quả cho trận chưa diễn ra là mở cửa chấm điểm sớm.
 * Trận không hẹn giờ thì chốt lúc nào cũng được, vì không có mốc nào để chờ.
 */
export function canEndMatch(m: Pick<Match, 'status' | 'scheduledAt'>): boolean {
  if (m.status !== 'scheduled') return false;
  return m.scheduledAt === null || m.scheduledAt <= new Date();
}
