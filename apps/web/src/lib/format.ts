const VND = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
  maximumFractionDigits: 0,
});

/** Giá tiền VND. Intl lo dấu phân cách và ký hiệu ₫ — không tự nối chuỗi. */
export function formatVnd(amount: number): string {
  return VND.format(amount);
}

const SLOT_DAY = new Intl.DateTimeFormat('vi-VN', {
  weekday: 'short',
  day: '2-digit',
  month: '2-digit',
});
const SLOT_TIME = new Intl.DateTimeFormat('vi-VN', { hour: '2-digit', minute: '2-digit' });

/** "T5 21/08 · 18:00–20:00" — ngày một lần, giờ hai đầu. */
export function formatSlotRange(startsAt: string, endsAt: string): string {
  const start = new Date(startsAt);
  const end = new Date(endsAt);
  return `${SLOT_DAY.format(start)} · ${SLOT_TIME.format(start)}–${SLOT_TIME.format(end)}`;
}

/** Số giờ của một khung, làm tròn 1 chữ số — dùng để hiện đơn giá theo giờ. */
export function slotHours(startsAt: string, endsAt: string): number {
  const ms = new Date(endsAt).getTime() - new Date(startsAt).getTime();
  return Math.round((ms / 3_600_000) * 10) / 10;
}

/** Điểm sao dạng "4.5" hoặc "chưa có" khi chưa ai chấm. */
export function formatRating(rating: number, reviewCount: number): string {
  return reviewCount === 0 ? 'Chưa có đánh giá' : `${rating.toFixed(1)}/5 · ${reviewCount} lượt`;
}
