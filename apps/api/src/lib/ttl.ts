/** Đơn vị TTL nhận được: giây, phút, giờ, ngày. */
const UNIT_MS: Record<string, number> = {
  s: 1000,
  m: 60_000,
  h: 3_600_000,
  d: 86_400_000,
};

/**
 * Đọc chuỗi TTL kiểu `"30d"` / `"15m"` thành số mili giây.
 *
 * Tách khỏi `jwt.ts` để kiểm thử được: `jwt.ts` nạp `config/env.ts`, mà file đó
 * `process.exit(1)` khi thiếu biến môi trường — một hàm phân tích chuỗi thuần
 * không nên đòi cả file `.env` mới chạy được.
 *
 * Ném lỗi thay vì lặng lẽ lùi về một giá trị mặc định: TTL sai cú pháp trong
 * cấu hình mà vẫn khởi động được là phiên đăng nhập dài sai âm thầm.
 */
export function ttlToMs(ttl: string): number {
  const match = /^(\d+)([smhd])$/.exec(ttl);
  const unit = match ? UNIT_MS[match[2]!] : undefined;
  if (!match || unit === undefined) throw new Error(`Invalid TTL: ${ttl}`);
  return Number(match[1]) * unit;
}

export function ttlToDate(ttl: string, from: Date = new Date()): Date {
  return new Date(from.getTime() + ttlToMs(ttl));
}
