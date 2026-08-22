import {
  changePasswordSchema,
  loginSchema,
  refreshSchema,
  registerSchema,
  type AuthResponse,
  type AuthUser,
} from '@sfa/shared';
import { Prisma, type User } from '@prisma/client';
import { Router } from 'express';
import { prisma } from '../lib/db.js';
import { hashRefreshToken, issueRefreshToken, signAccessToken } from '../lib/jwt.js';
import { hashPassword, verifyPassword } from '../lib/password.js';
import { requireAuth } from '../middleware/auth.js';
import { HttpError } from '../middleware/error.js';
import { loginLimiter, refreshLimiter, registerLimiter } from '../middleware/rate-limit.js';

export const authRouter = Router();

/**
 * Chan tai khoan bi khoa (FR-010.7) o hai cua duy nhat cap token moi: dang nhap
 * va refresh. Khoa xong con thu hoi refresh token, nen phien dang mo chet khi
 * access token het han.
 */
function assertNotDisabled(user: User): void {
  if (user.disabledAt) {
    throw new HttpError(
      403,
      'Tài khoản đã bị khoá. Liên hệ quản trị viên nếu bạn cho rằng đây là nhầm lẫn.',
      'ACCOUNT_DISABLED',
    );
  }
}

function toAuthUser(u: User): AuthUser {
  return {
    id: u.id,
    email: u.email,
    displayName: u.displayName,
    avatarUrl: u.avatarUrl,
    role: u.role,
    emailVerified: u.emailVerified,
    onboardedAt: u.onboardedAt?.toISOString() ?? null,
  };
}

async function issueSession(
  userId: string,
  role: string,
): Promise<{
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

authRouter.post('/register', registerLimiter, async (req, res, next) => {
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
          // Chỉ 'user' hoặc 'business' — schema không cho phép 'admin', nên không
          // có đường nào tự đăng ký thành quản trị viên (FR-008.1).
          role: input.accountType,
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

authRouter.post('/login', loginLimiter, async (req, res, next) => {
  try {
    const input = loginSchema.parse(req.body);
    const user = await prisma.user.findUnique({
      where: { email: input.email.toLowerCase() },
    });
    if (!user?.passwordHash || !(await verifyPassword(user.passwordHash, input.password))) {
      throw new HttpError(401, 'Email hoặc mật khẩu không đúng', 'INVALID_CREDENTIALS');
    }
    // Kiểm sau khi đã xác thực mật khẩu: báo "tài khoản bị khoá" cho người gõ sai
    // mật khẩu là tự khai người này có tồn tại trong hệ thống.
    assertNotDisabled(user);
    const tokens = await issueSession(user.id, user.role);
    const body: AuthResponse = { user: toAuthUser(user), tokens };
    res.json(body);
  } catch (err) {
    next(err);
  }
});

authRouter.post('/refresh', refreshLimiter, async (req, res, next) => {
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
    assertNotDisabled(stored.user);
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

/**
 * Doi mat khau. Thu hoi toan bo refresh token dang song: neu mat khau bi lo,
 * doi mat khau phai da nguoi kia ra khoi moi thiet bi.
 */
authRouter.post('/change-password', requireAuth, async (req, res, next) => {
  try {
    const input = changePasswordSchema.parse(req.body);
    const userId = req.user!.sub;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user?.passwordHash) {
      throw new HttpError(400, 'Tài khoản này không dùng mật khẩu', 'NO_PASSWORD');
    }
    if (!(await verifyPassword(user.passwordHash, input.currentPassword))) {
      throw new HttpError(400, 'Mật khẩu hiện tại không đúng', 'WRONG_PASSWORD');
    }

    const passwordHash = await hashPassword(input.newPassword);
    await prisma.$transaction([
      prisma.user.update({ where: { id: userId }, data: { passwordHash } }),
      prisma.refreshToken.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);

    const tokens = await issueSession(userId, user.role);
    const body: AuthResponse = { user: toAuthUser(user), tokens };
    res.json(body);
  } catch (err) {
    next(err);
  }
});
