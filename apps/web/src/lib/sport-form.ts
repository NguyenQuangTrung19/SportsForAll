export interface SportFieldValues {
  nameVi: string;
  primary: string;
  primaryDark: string;
  /** Nhập dạng chuỗi phân cách bằng dấu phẩy, tách khi gửi đi. */
  positions: string;
}

export function parsePositions(raw: string): string[] {
  return raw
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);
}
