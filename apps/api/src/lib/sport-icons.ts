import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import multer from 'multer';
import sharp from 'sharp';
import { HttpError } from '../middleware/error.js';
import { UPLOAD_DIR, UPLOAD_ROUTE } from './uploads.js';

const MAX_BYTES = 2 * 1024 * 1024;

/**
 * Nhận cả SVG. An toàn vì sharp rasterise ngay khi nhận: file SVG gốc không bao
 * giờ được lưu hay phục vụ, chỉ bản WebP đi ra — nên script nhúng trong SVG
 * không có đường nào chạy được.
 * Đây là điểm quan trọng: hầu hết bộ icon miễn phí đều phát hành dạng SVG.
 */
const ALLOWED = new Set(['image/png', 'image/webp', 'image/jpeg', 'image/svg+xml']);

export const sportIconUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_BYTES, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED.has(file.mimetype)) {
      cb(new HttpError(400, 'Icon chỉ nhận SVG, PNG, WebP hoặc JPG', 'UNSUPPORTED_MEDIA'));
      return;
    }
    cb(null, true);
  },
});

/** Chuẩn hoá về ô vuông 128px, nền trong suốt giữ nguyên. */
export async function buildSportIcon(buffer: Buffer, origin: string): Promise<string> {
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
  const name = `icon-${crypto.randomBytes(12).toString('hex')}.webp`;
  // density cao để SVG nét ở 128px; ảnh raster bỏ qua tham số này.
  await sharp(buffer, { density: 384 })
    .resize(128, 128, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .webp({ quality: 88, effort: 5 })
    .toFile(path.join(UPLOAD_DIR, name));
  return `${origin}${UPLOAD_ROUTE}/${name}`;
}
