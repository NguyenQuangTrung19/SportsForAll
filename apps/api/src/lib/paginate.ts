/**
 * Đuôi phân trang theo cursor, dùng chung cho mọi danh sách.
 *
 * Cách làm: lấy dư đúng một bản ghi so với `limit`. Có bản ghi dư nghĩa là còn
 * trang sau — không phải chạy thêm một truy vấn `count` chỉ để biết điều đó.
 */
export function cursorArgs(limit: number, cursor?: string) {
  return { take: limit + 1, ...(cursor && { cursor: { id: cursor }, skip: 1 }) };
}

export function paginate<T extends { id: string }>(
  rows: T[],
  limit: number,
): { items: T[]; nextCursor: string | null } {
  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;
  return { items, nextCursor: hasMore ? (items[items.length - 1]?.id ?? null) : null };
}
