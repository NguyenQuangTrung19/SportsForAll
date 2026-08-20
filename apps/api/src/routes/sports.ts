import {
  createSportSchema,
  updateSportSchema,
  type SportCatalogItem,
  type SportListResponse,
} from '@sfa/shared';
import { Prisma, type Sport } from '@prisma/client';
import { Router } from 'express';
import { prisma } from '../lib/db.js';
import { buildSportIcon, sportIconUpload } from '../lib/sport-icons.js';
import { optionalAuth, requireAuth } from '../middleware/auth.js';
import { HttpError } from '../middleware/error.js';
import { requireRole } from '../middleware/role.js';
import { removeUploadedFile } from '../lib/uploads.js';

export const sportsRouter = Router();

function toItem(s: Sport, inUse?: boolean): SportCatalogItem {
  return {
    slug: s.slug,
    nameVi: s.nameVi,
    primary: s.primary,
    primaryDark: s.primaryDark,
    iconUrl: s.iconUrl,
    positions: s.positions,
    sortOrder: s.sortOrder,
    active: s.active,
    ...(inUse === undefined ? {} : { inUse }),
  };
}

/** Đếm mọi thứ đang trỏ tới một môn — quyết định có xoá được hay không. */
async function countReferences(slug: string): Promise<number> {
  const [prefs, teams, posts, requests, matches, seeking] = await Promise.all([
    prisma.sportPreference.count({ where: { sport: slug } }),
    prisma.team.count({ where: { sport: slug } }),
    prisma.recruitmentPost.count({ where: { sport: slug } }),
    prisma.matchRequest.count({ where: { sport: slug } }),
    prisma.match.count({ where: { sport: slug } }),
    prisma.lookingForTeamPost.count({ where: { sport: slug } }),
  ]);
  return prefs + teams + posts + requests + matches + seeking;
}

/**
 * Công khai. Người thường chỉ thấy môn đang bật; admin thấy cả môn đã tắt kèm
 * cờ `inUse` để biết môn nào còn dữ liệu, tức không xoá được.
 */
sportsRouter.get('/', optionalAuth, async (req, res, next) => {
  try {
    let isAdmin = false;
    const userId = req.user?.sub;
    if (userId) {
      const me = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
      isAdmin = me?.role === 'admin';
    }

    const rows = await prisma.sport.findMany({
      where: isAdmin ? {} : { active: true },
      orderBy: [{ sortOrder: 'asc' }, { slug: 'asc' }],
    });

    let body: SportListResponse;
    if (isAdmin) {
      const counts = await Promise.all(rows.map((r) => countReferences(r.slug)));
      body = { items: rows.map((r, i) => toItem(r, (counts[i] ?? 0) > 0)) };
    } else {
      body = { items: rows.map((r) => toItem(r)) };
    }
    res.json(body);
  } catch (err) {
    next(err);
  }
});

sportsRouter.post('/', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const input = createSportSchema.parse(req.body);
    const last = await prisma.sport.findFirst({ orderBy: { sortOrder: 'desc' } });
    const created = await prisma.sport.create({
      data: {
        slug: input.slug,
        nameVi: input.nameVi,
        primary: input.primary,
        primaryDark: input.primaryDark,
        positions: input.positions,
        sortOrder: input.sortOrder ?? (last ? last.sortOrder + 1 : 1),
      },
    });
    res.status(201).json(toItem(created, false));
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      next(new HttpError(409, 'Slug này đã tồn tại', 'SLUG_TAKEN'));
      return;
    }
    next(err);
  }
});

sportsRouter.patch('/:slug', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const input = updateSportSchema.parse(req.body);
    const slug = String(req.params.slug);

    const existing = await prisma.sport.findUnique({ where: { slug } });
    if (!existing) throw new HttpError(404, 'Không tìm thấy môn', 'SPORT_NOT_FOUND');

    const updated = await prisma.sport.update({ where: { slug }, data: input });
    res.json(toItem(updated, (await countReferences(slug)) > 0));
  } catch (err) {
    next(err);
  }
});

/**
 * Xoá môn. Chỉ cho xoá khi không còn gì tham chiếu — khoá ngoại là Restrict nên
 * CSDL cũng chặn, nhưng kiểm trước để trả lỗi có nghĩa thay vì lỗi ràng buộc thô.
 */
sportsRouter.delete('/:slug', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const slug = String(req.params.slug);
    const existing = await prisma.sport.findUnique({ where: { slug } });
    if (!existing) throw new HttpError(404, 'Không tìm thấy môn', 'SPORT_NOT_FOUND');

    const refs = await countReferences(slug);
    if (refs > 0) {
      throw new HttpError(
        409,
        `Còn ${refs} mục đang dùng môn này. Hãy tắt môn thay vì xoá.`,
        'SPORT_IN_USE',
      );
    }

    const landing = await prisma.landingImage.findUnique({ where: { sport: slug } });
    if (landing) await prisma.landingImage.delete({ where: { sport: slug } });

    await prisma.sport.delete({ where: { slug } });
    removeUploadedFile(existing.iconUrl);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

/** Icon riêng cho môn mới — 5 môn gốc có sẵn icon SVG dựng trong mã nguồn. */
sportsRouter.post(
  '/:slug/icon',
  requireAuth,
  requireRole('admin'),
  sportIconUpload.single('icon'),
  async (req, res, next) => {
    try {
      const slug = String(req.params.slug);
      if (!req.file) throw new HttpError(400, 'Chưa chọn ảnh', 'NO_FILE');

      const existing = await prisma.sport.findUnique({ where: { slug } });
      if (!existing) throw new HttpError(404, 'Không tìm thấy môn', 'SPORT_NOT_FOUND');

      const origin = `${req.protocol}://${req.get('host')}`;
      const iconUrl = await buildSportIcon(req.file.buffer, origin);
      const updated = await prisma.sport.update({ where: { slug }, data: { iconUrl } });
      removeUploadedFile(existing.iconUrl);

      res.json(toItem(updated));
    } catch (err) {
      next(err);
    }
  },
);
