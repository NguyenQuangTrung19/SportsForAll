import type { LandingImagesResponse, SportSlug } from '@sfa/shared';
import { Router } from 'express';
import { prisma } from '../lib/db.js';
import {
  buildLandingVariants,
  landingUpload,
  removeLandingVariants,
} from '../lib/landing-images.js';
import { requireAuth } from '../middleware/auth.js';
import { HttpError } from '../middleware/error.js';
import { requireRole } from '../middleware/role.js';

export const landingRouter = Router();

/**
 * Kiểm môn theo bảng Sport, không theo hằng số SPORTS.
 *
 * SPORTS giờ chỉ là danh sách dự phòng năm môn ban đầu ở phía web; dùng nó để
 * kiểm sẽ từ chối mọi môn admin tự thêm.
 */
async function parseSport(raw: unknown): Promise<SportSlug> {
  const value = String(raw);
  const exists = await prisma.sport.findUnique({ where: { slug: value }, select: { slug: true } });
  if (!exists) {
    throw new HttpError(400, 'Môn thể thao không tồn tại', 'BAD_SPORT');
  }
  return exists.slug;
}

/**
 * Công khai — trang giới thiệu gọi khi tải. Chỉ trả những môn admin đã thay ảnh;
 * môn nào không có ở đây thì web tự dùng ảnh mặc định đóng kèm trong bundle.
 */
landingRouter.get('/images', async (_req, res, next) => {
  try {
    const rows = await prisma.landingImage.findMany({
      orderBy: { sport: 'asc' },
      include: { updatedBy: { select: { displayName: true } } },
    });
    const body: LandingImagesResponse = {
      items: rows.map((r) => ({
        sport: r.sport,
        largeUrl: r.largeUrl,
        smallUrl: r.smallUrl,
        tileUrl: r.tileUrl,
        updatedAt: r.updatedAt.toISOString(),
        updatedByName: r.updatedBy?.displayName ?? null,
      })),
    };
    res.json(body);
  } catch (err) {
    next(err);
  }
});

/** Admin thay ảnh cho một môn. */
landingRouter.put(
  '/images/:sport',
  requireAuth,
  requireRole('admin'),
  landingUpload.single('image'),
  async (req, res, next) => {
    try {
      const sport = await parseSport(req.params.sport);
      if (!req.file) throw new HttpError(400, 'Chưa chọn ảnh', 'NO_FILE');

      const origin = `${req.protocol}://${req.get('host')}`;
      const variants = await buildLandingVariants(req.file.buffer, origin);

      const previous = await prisma.landingImage.findUnique({ where: { sport } });
      const saved = await prisma.landingImage.upsert({
        where: { sport },
        update: { ...variants, updatedById: req.user!.sub },
        create: { sport, ...variants, updatedById: req.user!.sub },
        include: { updatedBy: { select: { displayName: true } } },
      });
      // Chỉ xoá file cũ sau khi ghi CSDL thành công, tránh mất ảnh nếu ghi hỏng.
      removeLandingVariants(previous);

      res.json({
        sport: saved.sport,
        largeUrl: saved.largeUrl,
        smallUrl: saved.smallUrl,
        tileUrl: saved.tileUrl,
        updatedAt: saved.updatedAt.toISOString(),
        updatedByName: saved.updatedBy?.displayName ?? null,
      });
    } catch (err) {
      next(err);
    }
  },
);

/** Admin gỡ ảnh tuỳ chỉnh, trang giới thiệu quay về ảnh mặc định. */
landingRouter.delete(
  '/images/:sport',
  requireAuth,
  requireRole('admin'),
  async (req, res, next) => {
    try {
      const sport = await parseSport(req.params.sport);
      const existing = await prisma.landingImage.findUnique({ where: { sport } });
      if (!existing) throw new HttpError(404, 'Môn này đang dùng ảnh mặc định', 'NOT_FOUND');

      await prisma.landingImage.delete({ where: { sport } });
      removeLandingVariants(existing);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },
);
