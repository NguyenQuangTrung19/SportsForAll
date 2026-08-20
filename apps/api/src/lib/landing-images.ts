import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import multer from 'multer';
import sharp, { type Sharp } from 'sharp';
import { HttpError } from '../middleware/error.js';
import { UPLOAD_DIR, UPLOAD_ROUTE, removeUploadedFile } from './uploads.js';

/** Ảnh hero là ảnh lớn, nới hạn hơn ảnh đại diện nhiều. */
const MAX_BYTES = 12 * 1024 * 1024;
const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp']);

/**
 * Giữ ảnh trong RAM thay vì ghi thẳng ra đĩa: sharp đọc buffer rồi mới ghi ba
 * biến thể. Ghi ra đĩa trước sẽ để lại một file gốc thừa phải dọn.
 */
export const landingUpload = multer({
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

export interface LandingVariants {
  largeUrl: string;
  smallUrl: string;
  tileUrl: string;
}

/**
 * Sinh ba biến thể từ một ảnh tải lên:
 *  - large / small: ảnh ngang cho hero, hai cỡ để trình duyệt tự chọn qua srcset
 *  - tile: cắt dọc 4:5 cho thẻ môn, neo về phía phải vì vận động viên
 *    thường nằm lệch phải trong ảnh thể thao
 */
export async function buildLandingVariants(
  buffer: Buffer,
  origin: string,
): Promise<LandingVariants> {
  const meta = await sharp(buffer).metadata();
  if (!meta.width || !meta.height) {
    throw new HttpError(400, 'Không đọc được kích thước ảnh', 'BAD_IMAGE');
  }
  if (meta.width < 1200) {
    throw new HttpError(400, 'Ảnh cần rộng tối thiểu 1200px', 'IMAGE_TOO_SMALL');
  }

  const stem = crypto.randomBytes(12).toString('hex');
  await fs.mkdir(UPLOAD_DIR, { recursive: true });

  const write = async (name: string, pipeline: Sharp) => {
    await pipeline.webp({ quality: 72, effort: 5 }).toFile(path.join(UPLOAD_DIR, name));
    return `${origin}${UPLOAD_ROUTE}/${name}`;
  };

  const largeUrl = await write(
    `${stem}-lg.webp`,
    sharp(buffer).resize({ width: Math.min(meta.width, 1600), withoutEnlargement: true }),
  );
  const smallUrl = await write(
    `${stem}-sm.webp`,
    sharp(buffer).resize({ width: 960, withoutEnlargement: true }),
  );

  const tileHeight = meta.height;
  const tileWidth = Math.min(meta.width, Math.round(tileHeight * 0.8));
  // sharp.extract chỉ nhận số nguyên — tileWidth lẻ sẽ cho ra .5 nếu không làm tròn.
  const left = Math.round(
    Math.max(0, Math.min(meta.width - tileWidth, meta.width * 0.68 - tileWidth / 2)),
  );
  const tileUrl = await write(
    `${stem}-tile.webp`,
    sharp(buffer)
      .extract({ left, top: 0, width: tileWidth, height: tileHeight })
      .resize(640, 800, { fit: 'cover' }),
  );

  return { largeUrl, smallUrl, tileUrl };
}

/** Dọn ba file của bản cũ khi admin thay ảnh mới hoặc gỡ ảnh. */
export function removeLandingVariants(v: Partial<LandingVariants> | null): void {
  if (!v) return;
  removeUploadedFile(v.largeUrl ?? null);
  removeUploadedFile(v.smallUrl ?? null);
  removeUploadedFile(v.tileUrl ?? null);
}
