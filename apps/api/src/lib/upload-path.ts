import path from 'node:path';

/** Đường dẫn công khai của thư mục ảnh, dùng chung cho mọi loại tệp tải lên. */
export const UPLOAD_ROUTE = '/uploads';

/**
 * Tên tệp thật của một ảnh do ta lưu, hoặc `null` nếu URL không phải của ta.
 *
 * Tách khỏi `uploads.ts` vì file đó `mkdirSync` ngay lúc nạp — quy tắc đường dẫn
 * là thứ đáng kiểm thử nhất ở đây và không nên kéo theo tác dụng phụ lên đĩa.
 *
 * Ba lớp chặn, theo thứ tự:
 *  1. Không phân tích được thành URL → không phải của ta.
 *  2. Không nằm dưới `/uploads/` → không phải của ta.
 *  3. `basename` cắt sạch mọi `../` còn sót trong đường dẫn.
 */
export function uploadedFileName(fileUrl: string | null): string | null {
  if (!fileUrl) return null;

  let pathname: string;
  try {
    pathname = fileUrl.startsWith('/') ? fileUrl : new URL(fileUrl).pathname;
  } catch {
    return null;
  }
  if (!pathname.startsWith(`${UPLOAD_ROUTE}/`)) return null;

  let decoded: string;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    return null; // chuỗi %-encoding hỏng
  }

  // "/uploads/" trỏ tới thư mục chứ không phải tệp — basename của nó lại ra
  // "uploads", trông y như một tên tệp hợp lệ. Loại trước khi cắt.
  if (decoded.endsWith('/')) return null;

  const name = path.posix.basename(decoded);
  // basename của "/uploads/.." là ".." — không phải tên tệp hợp lệ.
  if (name === '' || name === '.' || name === '..') return null;

  // `path.posix.basename` chỉ cắt ở dấu `/`, nên "..\..\windows" đi lọt nguyên
  // vẹn — và trên Windows thì `path.join` lại coi `\` là dấu phân cách, tức là
  // thoát được ra ngoài UPLOAD_DIR. Chặn thẳng mọi tên còn dấu phân cách.
  if (name.includes('/') || name.includes('\\')) return null;
  return name;
}
