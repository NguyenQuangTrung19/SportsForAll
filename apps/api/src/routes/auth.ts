import {
  loginSchema,
  refreshSchema,
  registerSchema,
  type AuthResponse,
  type AuthUser,
} from '@sfa/shared';
import { Prisma, type User } from '@prisma/client';
import { Router } from 'express';
import { prisma } from '../lib/db.js';
import {
  hashRefreshToken,
  issueRefreshToken,
  signAccessToken,
} from '../lib/jwt.js';
import { hashPassword, verifyPassword } from '../lib/password.js';
import { requireAuth } from '../middleware/auth.js';
import { HttpError } from '../middleware/error.js';

export const authRouter = Router();

function toAuthUser(u: User): AuthUser {
  return {
    id: u.id,
    email: u.email,
    displayName: u.displayName,
    avatarUrl: u.avatarUrl,
    role: u.role,
    emailVerified: u.emailVerified,
  };
}

async function issueSession(userId: string, role: string): Promise<{
  accessToken: string;
  refreshToken: string;
}> {
  const accessToken = signAccessToken({ sub: userId, role });
  const refresh = issueRefreshToken();
  await prisma.refreshToken.create({
    data: {
      userId,
      tokenHash: refresh.tokenHash,
      expiresAt: refresh.expiresAt,
    },
  });
  return { accessToken, refreshToken: refresh.token };
}

authRouter.post('/register', async (req, res, next) => {
  try {
    const input = registerSchema.parse(req.body);
    const passwordHash = await hashPassword(input.password);
    let user: User;
    try {
      user = await prisma.user.create({
        data: {
          email: input.email.toLowerCase(),
          passwordHash,
          displayName: input.displayName,
        },
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new HttpError(409, 'Email đã được sử dụng', 'EMAIL_TAKEN');
      }
      throw err;
    }
    const tokens = await issueSession(user.id, user.role);
    const body: AuthResponse = { user: toAuthUser(user), tokens };
    res.status(201).json(body);
  } catch (err) {
    next(err);
  }
});

authRouter.post('/login', async (req, res, next) => {
  try {
    const input = loginSchema.parse(req.body);
    const user = await prisma.user.findUnique({
      where: { email: input.email.toLowerCase() },
    });
    if (!user?.passwordHash || !(await verifyPassword(user.passwordHash, input.password))) {
      throw new HttpError(401, 'Email hoặc mật khẩu không đúng', 'INVALID_CREDENTIALS');
    }
    const tokens = await issueSession(user.id, user.role);
    const body: AuthResponse = { user: toAuthUser(user), tokens };
    res.json(body);
  } catch (err) {
    next(err);
  }
});

authRouter.post('/refresh', async (req, res, next) => {
  try {
    const input = refreshSchema.parse(req.body);
    const tokenHash = hashRefreshToken(input.refreshToken);
    const stored = await prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });
    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      throw new HttpError(401, 'Refresh token không hợp lệ', 'INVALID_REFRESH');
    }
    // Rotate: revoke old, issue new
    await prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });
    const tokens = await issueSession(stored.userId, stored.user.role);
    const body: AuthResponse = { user: toAuthUser(stored.user), tokens };
    res.json(body);
  } catch (err) {
    next(err);
  }
});

authRouter.post('/logout', async (req, res, next) => {
  try {
    const parsed = refreshSchema.safeParse(req.body);
    if (parsed.success) {
      const tokenHash = hashRefreshToken(parsed.data.refreshToken);
      await prisma.refreshToken.updateMany({
        where: { tokenHash, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

authRouter.get('/me', requireAuth, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user!.sub } });
    if (!user) throw new HttpError(404, 'Không tìm thấy người dùng', 'USER_NOT_FOUND');
    res.json({ user: toAuthUser(user) });
  } catch (err) {
    next(err);
  }
});
