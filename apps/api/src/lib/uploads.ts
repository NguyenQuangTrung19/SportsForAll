import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import multer from 'multer';
import { HttpError } from '../middleware/error.js';

/** Ảnh lưu trên đĩa cạnh API. Đủ cho quy mô đồ án; lên production nên đổi sang object storage. */
export const UPLOAD_DIR = path.resolve(process.cwd(), 'uploads');
export const UPLOAD_ROUTE = '/uploads';

const MAX_BYTES = 2 * 1024 * 1024;
const ALLOWED = new Map([
  ['image/jpeg', '.jpg'],
  ['image/png', '.png'],
  ['image/webp', '.webp'],
]);

fs.mkdirSync(UPLOAD_DIR, { recursive: true });

export const avatarUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
    filename: (_req, file, cb) => {
      const ext = ALLOWED.get(file.mimetype) ?? '.bin';
      cb(null, `${crypto.randomBytes(16).toString('hex')}${ext}`);
    },
  }),
  limits: { fileSize: MAX_BYTES, files: 1 },
  // Chỉ tin mimetype để chặn sớm; tên file do server sinh nên không có đường đi
  // cho path traversal, và ảnh được phục vụ tĩnh chứ không thực thi.
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED.has(file.mimetype)) {
      cb(new HttpError(400, 'Chỉ nhận ảnh JPG, PNG hoặc WebP', 'UNSUPPORTED_MEDIA'));
      return;
    }
    cb(null, true);
  },
});

/**
 * Xoá ảnh cũ khi người dùng thay ảnh mới, tránh rác tồn đọng.
 * avatarUrl được lưu dạng tuyệt đối (http://host/uploads/x.png) nên phải tách
 * pathname ra trước khi so — so thẳng cả chuỗi sẽ không bao giờ khớp.
 */
export function removeUploadedFile(fileUrl: string | null): void {
  if (!fileUrl) return;

  let pathname: string;
  try {
    pathname = fileUrl.startsWith('/') ? fileUrl : new URL(fileUrl).pathname;
  } catch {
    return; // không phải URL hợp lệ — chắc chắn không phải ảnh do ta lưu
  }
  if (!pathname.startsWith(`${UPLOAD_ROUTE}/`)) return;

  // basename chặn mọi mưu đồ ../ trong đường dẫn.
  const name = path.basename(pathname);
  fs.rm(path.join(UPLOAD_DIR, name), { force: true }, () => {
    // Xoá được hay không cũng không nên làm hỏng request đang chạy.
  });
}
