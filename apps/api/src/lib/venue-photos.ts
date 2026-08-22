import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import multer from 'multer';
import sharp from 'sharp';
import { HttpError } from '../middleware/error.js';
import { UPLOAD_DIR, UPLOAD_ROUTE } from './uploads.js';

const MAX_BYTES = 8 * 1024 * 1024;
const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp']);

/**
 * Giữ ảnh trong RAM rồi mới ghi bản đã nén — ghi thẳng ra đĩa sẽ để lại một file
 * gốc thừa phải dọn. Cùng cách làm với ảnh nền trang giới thiệu.
 */
export const venuePhotoUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_BYTES, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED.has(file.mimetype)) {
      cb(new HttpError(400, 'Chỉ nhận ảnh JPG, PNG hoặc WebP', 'UNSUPPORTED_MEDIA'));
      return;
    }
    cb(null, true);
  },
});

/**
 * Một ảnh bìa cho sân, rộng tối đa 1600px.
 *
 * Chỉ một bản, không phải ba như ảnh nền trang giới thiệu: ảnh sân chỉ xuất hiện
 * ở hai chỗ cùng tỉ lệ ngang, nên bản cắt dọc sẽ không ai dùng tới.
 */
export async function buildVenuePhoto(buffer: Buffer, origin: string): Promise<string> {
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
  const name = `venue-${crypto.randomBytes(12).toString('hex')}.webp`;
  await sharp(buffer)
    .resize({ width: 1600, withoutEnlargement: true })
    .webp({ quality: 74, effort: 5 })
    .toFile(path.join(UPLOAD_DIR, name));
  return `${origin}${UPLOAD_ROUTE}/${name}`;
}
