import {
  completeOnboardingSchema,
  updateProfileSchema,
  type ProfileResponse,
  type SportPreference as SharedSportPreference,
} from '@sfa/shared';
import { Prisma, type SportPreference, type User } from '@prisma/client';
import { Router } from 'express';
import { prisma } from '../lib/db.js';
import { UPLOAD_ROUTE, avatarUpload, removeUploadedFile } from '../lib/uploads.js';
import { requireAuth } from '../middleware/auth.js';
import { HttpError } from '../middleware/error.js';

export const profileRouter = Router();

type UserWithPreferences = User & { sportPreferences: SportPreference[] };

function toSportPreference(p: SportPreference): SharedSportPreference {
  return {
    sport: p.sport,
    skillLevel: p.skillLevel,
    position: p.position,
  };
}

function toProfileResponse(u: UserWithPreferences): ProfileResponse {
  return {
    id: u.id,
    email: u.email,
    displayName: u.displayName,
    avatarUrl: u.avatarUrl,
    bio: u.bio,
    birthYear: u.birthYear,
    region: u.region,
    phone: u.phone,
    reputation: u.reputation,
    emailVerified: u.emailVerified,
    onboardedAt: u.onboardedAt?.toISOString() ?? null,
    sportPreferences: u.sportPreferences.map(toSportPreference),
    createdAt: u.createdAt.toISOString(),
  };
}

async function loadProfile(userId: string): Promise<UserWithPreferences> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { sportPreferences: { orderBy: { createdAt: 'asc' } } },
  });
  if (!user) throw new HttpError(404, 'Không tìm thấy người dùng', 'USER_NOT_FOUND');
  return user;
}

profileRouter.get('/me', requireAuth, async (req, res, next) => {
  try {
    const user = await loadProfile(req.user!.sub);
    res.json(toProfileResponse(user));
  } catch (err) {
    next(err);
  }
});

profileRouter.put('/me', requireAuth, async (req, res, next) => {
  try {
    const input = updateProfileSchema.parse(req.body);
    const userId = req.user!.sub;

    const { sportPreferences, ...basic } = input;

    const updated = await prisma.$transaction(async (tx) => {
      if (Object.keys(basic).length > 0) {
        await tx.user.update({ where: { id: userId }, data: basic });
      }
      if (sportPreferences) {
        await tx.sportPreference.deleteMany({ where: { userId } });
        if (sportPreferences.length > 0) {
          await tx.sportPreference.createMany({
            data: sportPreferences.map((p) => ({
              userId,
              sport: p.sport,
              skillLevel: p.skillLevel,
              position: p.position ?? null,
            })),
          });
        }
      }
      return tx.user.findUniqueOrThrow({
        where: { id: userId },
        include: { sportPreferences: { orderBy: { createdAt: 'asc' } } },
      });
    });

    res.json(toProfileResponse(updated));
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      next(new HttpError(409, 'Số điện thoại đã được dùng', 'PHONE_TAKEN'));
      return;
    }
    next(err);
  }
});

profileRouter.post('/me/onboarding', requireAuth, async (req, res, next) => {
  try {
    const input = completeOnboardingSchema.parse(req.body);
    const userId = req.user!.sub;

    const existing = await prisma.user.findUnique({
      where: { id: userId },
      select: { onboardedAt: true },
    });
    if (!existing) throw new HttpError(404, 'Không tìm thấy người dùng', 'USER_NOT_FOUND');
    if (existing.onboardedAt) {
      throw new HttpError(409, 'Bạn đã hoàn tất onboarding', 'ALREADY_ONBOARDED');
    }

    const updated = await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: {
          birthYear: input.birthYear,
          region: input.region,
          bio: input.bio ?? null,
          onboardedAt: new Date(),
        },
      });
      await tx.sportPreference.deleteMany({ where: { userId } });
      await tx.sportPreference.createMany({
        data: input.sportPreferences.map((p) => ({
          userId,
          sport: p.sport,
          skillLevel: p.skillLevel,
          position: p.position ?? null,
        })),
      });
      return tx.user.findUniqueOrThrow({
        where: { id: userId },
        include: { sportPreferences: { orderBy: { createdAt: 'asc' } } },
      });
    });

    res.json(toProfileResponse(updated));
  } catch (err) {
    next(err);
  }
});

/**
 * Upload anh dai dien (FR-002.3). Nhan multipart, luu ra dia, tra ve profile moi.
 * Anh cu bi xoa de khong tich rac qua nhieu lan doi anh.
 */
profileRouter.post(
  '/me/avatar',
  requireAuth,
  avatarUpload.single('avatar'),
  async (req, res, next) => {
    try {
      if (!req.file) throw new HttpError(400, 'Chưa chọn ảnh', 'NO_FILE');
      const userId = req.user!.sub;

      const current = await prisma.user.findUnique({
        where: { id: userId },
        select: { avatarUrl: true },
      });

      const avatarUrl = `${req.protocol}://${req.get('host')}${UPLOAD_ROUTE}/${req.file.filename}`;
      await prisma.user.update({ where: { id: userId }, data: { avatarUrl } });
      removeUploadedFile(current?.avatarUrl ?? null);

      res.json(toProfileResponse(await loadProfile(userId)));
    } catch (err) {
      next(err);
    }
  },
);

/** Go anh dai dien, quay ve chu cai dau. */
profileRouter.delete('/me/avatar', requireAuth, async (req, res, next) => {
  try {
    const userId = req.user!.sub;
    const current = await prisma.user.findUnique({
      where: { id: userId },
      select: { avatarUrl: true },
    });
    await prisma.user.update({ where: { id: userId }, data: { avatarUrl: null } });
    removeUploadedFile(current?.avatarUrl ?? null);
    res.json(toProfileResponse(await loadProfile(userId)));
  } catch (err) {
    next(err);
  }
});
