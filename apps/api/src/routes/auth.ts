import {
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  phoneStartSchema,
  phoneVerifySchema,
  refreshSchema,
  registerSchema,
  PHONE_RE,
  normalizePhone,
  resetPasswordSchema,
  setPasswordSchema,
  tokenSchema,
  type AuthProviders,
  type AuthResponse,
  type AuthUser,
} from '@sfa/shared';
import { Prisma, type User } from '@prisma/client';
import crypto from 'node:crypto';
import express, { Router, type Request, type RequestHandler } from 'express';
import { env } from '../config/env.js';
import { checkOtp, consumeOtp, consumeToken, issueOtp, issueToken } from '../lib/auth-tokens.js';
import { prisma } from '../lib/db.js';
import { logger } from '../lib/logger.js';
import {
  authorizeUrl,
  fetchProfile,
  isOAuthProvider,
  oauthEnabled,
  type OAuthProfile,
  type OAuthProviderName,
} from '../lib/oauth.js';
import { emailEnabled, sendEmail, sendSms, smsEnabled } from '../lib/outbox.js';
import { hashRefreshToken, issueRefreshToken, signAccessToken } from '../lib/jwt.js';
import { hashPassword, verifyPassword } from '../lib/password.js';
import { requireAuth } from '../middleware/auth.js';
import { HttpError } from '../middleware/error.js';
import {
  emailLimiter,
  loginLimiter,
  otpLimiter,
  otpVerifyLimiter,
  refreshLimiter,
  registerLimiter,
} from '../middleware/rate-limit.js';

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
    // Gửi hỏng không được làm hỏng đăng ký — người dùng bấm "gửi lại" ở banner được.
    if (emailEnabled) {
      await sendVerificationEmail(user).catch((err: unknown) =>
        logger.error({ err, userId: user.id }, 'send verification email failed'),
      );
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
    const byPhone = PHONE_RE.test(input.identifier);
    const found = await prisma.user.findUnique({
      where: byPhone
        ? { phone: normalizePhone(input.identifier) }
        : { email: input.identifier.toLowerCase() },
    });
    // Số tự gõ vào hồ sơ (chưa OTP) không phải định danh đăng nhập — cùng lý do với
    // luồng OTP: ai cũng gõ được số của người khác vào hồ sơ mình.
    const user = byPhone && !found?.phoneVerified ? null : found;
    if (!user?.passwordHash || !(await verifyPassword(user.passwordHash, input.password))) {
      throw new HttpError(
        401,
        'Email / số điện thoại hoặc mật khẩu không đúng',
        'INVALID_CREDENTIALS',
      );
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

/**
 * Đặt mật khẩu lần đầu cho tài khoản tạo bằng Google/Facebook/OTP. Không đòi mật
 * khẩu cũ (không có), và chỉ khi tài khoản có định danh để gõ vào ô đăng nhập —
 * mật khẩu mà không có email hay số đã xác thực đi kèm thì không dùng vào đâu được.
 */
authRouter.post('/set-password', requireAuth, async (req, res, next) => {
  try {
    const { newPassword } = setPasswordSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { id: req.user!.sub } });
    if (!user) throw new HttpError(404, 'Không tìm thấy người dùng', 'USER_NOT_FOUND');
    if (user.passwordHash) {
      throw new HttpError(400, 'Tài khoản đã có mật khẩu — dùng "Đổi mật khẩu"', 'HAS_PASSWORD');
    }
    if (!user.email && !user.phoneVerified) {
      throw new HttpError(
        400,
        'Tài khoản chưa có email hay số điện thoại đã xác thực để đăng nhập bằng mật khẩu',
        'NO_IDENTIFIER',
      );
    }
    // Điều kiện `passwordHash: null` ngay trong câu update: hai request đặt cùng lúc
    // thì cái sau không ghi đè cái trước.
    const { count } = await prisma.user.updateMany({
      where: { id: user.id, passwordHash: null },
      data: { passwordHash: await hashPassword(newPassword) },
    });
    if (count === 0) {
      throw new HttpError(400, 'Tài khoản đã có mật khẩu — dùng "Đổi mật khẩu"', 'HAS_PASSWORD');
    }
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

/* -------------------------------------------------------------------------- */
/* FR-001.6, 1.7 — email                                                       */
/* -------------------------------------------------------------------------- */

function serviceOff(what: string): HttpError {
  return new HttpError(503, `Máy chủ chưa bật ${what}`, 'SERVICE_DISABLED');
}

async function sendVerificationEmail(user: Pick<User, 'id' | 'email' | 'displayName'>) {
  if (!user.email) return;
  const token = await issueToken('email_verify', user.email, user.id);
  await sendEmail(
    user.email,
    'Xác thực email SportsForAll',
    `Chào ${user.displayName},\n\n` +
      `Bấm link sau để xác thực email của bạn (hạn 24 giờ):\n` +
      `${env.webUrl}/verify-email?token=${token}\n\n` +
      `Nếu bạn không đăng ký SportsForAll, cứ bỏ qua email này.`,
  );
}

/** Giao diện hỏi trước để ẩn nút của cách đăng nhập chưa cấu hình. */
authRouter.get('/providers', (_req, res) => {
  const body: AuthProviders = {
    google: oauthEnabled('google'),
    facebook: oauthEnabled('facebook'),
    email: emailEnabled,
    sms: smsEnabled,
  };
  res.json(body);
});

authRouter.post('/verify-email', async (req, res, next) => {
  try {
    const { token } = tokenSchema.parse(req.body);
    const { userId, target } = await consumeToken('email_verify', token);
    // So cả email: link cấp cho địa chỉ cũ không được xác thực địa chỉ mới.
    await prisma.user.updateMany({
      where: { id: userId ?? '', email: target },
      data: { emailVerified: true },
    });
    res.json({ userId, emailVerified: true });
  } catch (err) {
    next(err);
  }
});

authRouter.post('/resend-verification', requireAuth, emailLimiter, async (req, res, next) => {
  try {
    if (!emailEnabled) throw serviceOff('gửi email');
    const user = await prisma.user.findUnique({ where: { id: req.user!.sub } });
    if (!user?.email) throw new HttpError(400, 'Tài khoản chưa có email', 'NO_EMAIL');
    if (user.emailVerified) {
      throw new HttpError(400, 'Email đã được xác thực rồi', 'ALREADY_VERIFIED');
    }
    await sendVerificationEmail(user);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

/**
 * Luôn trả 204, có tài khoản hay không — trả lời khác nhau là biến form này thành
 * công cụ dò email nào đã đăng ký. Gửi mail không `await` cũng vì thế: chờ gửi
 * thì thời gian phản hồi tự khai có tài khoản.
 */
authRouter.post('/forgot-password', emailLimiter, async (req, res, next) => {
  try {
    if (!emailEnabled) throw serviceOff('gửi email');
    const { email } = forgotPasswordSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (user?.email && !user.disabledAt) {
      const to = user.email;
      void issueToken('password_reset', to, user.id)
        .then((token) =>
          sendEmail(
            to,
            'Đặt lại mật khẩu SportsForAll',
            `Chào ${user.displayName},\n\n` +
              `Có người (hy vọng là bạn) vừa yêu cầu đặt lại mật khẩu.\n` +
              `Bấm link sau để đặt mật khẩu mới (hạn 30 phút, dùng một lần):\n` +
              `${env.webUrl}/reset-password?token=${token}\n\n` +
              `Không phải bạn? Cứ bỏ qua email này, mật khẩu cũ vẫn giữ nguyên.`,
          ),
        )
        .catch((err: unknown) => logger.error({ err, userId: user.id }, 'send reset email failed'));
    }
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

/**
 * Đặt lại xong thì thu hồi mọi phiên đang mở — lý do phổ biến nhất để đặt lại
 * mật khẩu là nghi bị lộ. Bấm được link trong hộp thư cũng là bằng chứng sở hữu
 * email, nên xác thực email luôn.
 */
authRouter.post('/reset-password', async (req, res, next) => {
  try {
    const input = resetPasswordSchema.parse(req.body);
    const { userId } = await consumeToken('password_reset', input.token);
    if (!userId) throw new HttpError(400, 'Link không hợp lệ', 'INVALID_TOKEN');
    const passwordHash = await hashPassword(input.newPassword);
    await prisma.$transaction([
      prisma.user.update({ where: { id: userId }, data: { passwordHash, emailVerified: true } }),
      prisma.refreshToken.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

/* -------------------------------------------------------------------------- */
/* FR-001.2 — số điện thoại + OTP                                              */
/* -------------------------------------------------------------------------- */

authRouter.post('/phone/start', otpLimiter, async (req, res, next) => {
  try {
    if (!smsEnabled) throw serviceOff('gửi SMS');
    const { phone } = phoneStartSchema.parse(req.body);
    const code = await issueOtp(phone);
    // Không dấu: SMS có dấu tính theo UCS-2, một tin chỉ còn 70 ký tự và đắt gấp đôi.
    await sendSms(
      phone,
      `Ma SportsForAll cua ban: ${code}. Het han sau 5 phut. Khong chia se ma nay.`,
    );
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

/**
 * Đăng nhập nếu số đã có tài khoản **đã xác thực**, không thì tạo tài khoản mới.
 *
 * Số chỉ nằm trong hồ sơ (tự gõ, chưa OTP) thì KHÔNG đăng nhập vào tài khoản đó:
 * ai cũng gõ được số của người khác vào hồ sơ mình, nên đăng nhập vào đấy là trao
 * tài khoản của người gõ cho người cầm SIM. Người cầm SIM được tài khoản mới, số
 * bị gỡ khỏi hồ sơ kia.
 */
authRouter.post('/phone/verify', otpVerifyLimiter, async (req, res, next) => {
  try {
    const input = phoneVerifySchema.parse(req.body);
    const otpId = await checkOtp(input.phone, input.code);

    const existing = await prisma.user.findUnique({ where: { phone: input.phone } });
    let user: User;
    let created = false;
    if (existing?.phoneVerified) {
      assertNotDisabled(existing);
      await consumeOtp(otpId);
      user = existing;
    } else {
      if (!input.displayName) {
        throw new HttpError(
          400,
          'Số này chưa có tài khoản — nhập tên để tạo tài khoản mới',
          'DISPLAY_NAME_REQUIRED',
        );
      }
      await consumeOtp(otpId);
      const { phone, displayName, accountType } = input;
      user = await prisma.$transaction(async (tx) => {
        await tx.user.updateMany({
          where: { phone, phoneVerified: false },
          data: { phone: null },
        });
        return tx.user.create({
          data: { phone, phoneVerified: true, displayName, role: accountType },
        });
      });
      created = true;
    }

    const tokens = await issueSession(user.id, user.role);
    const body: AuthResponse = { user: toAuthUser(user), tokens };
    res.status(created ? 201 : 200).json(body);
  } catch (err) {
    next(err);
  }
});

/* -------------------------------------------------------------------------- */
/* FR-001.1, 1.4, 1.5 — Google / Facebook                                      */
/* -------------------------------------------------------------------------- */

const STATE_COOKIE = 'sfa_oauth_state';
const STATE_COOKIE_PATH = '/api/auth/oauth';

function readCookie(req: Request, name: string): string | undefined {
  return req.headers.cookie
    ?.split(';')
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${name}=`))
    ?.slice(name.length + 1);
}

/**
 * Tìm hoặc tạo người dùng cho một hồ sơ OAuth.
 *
 * Gộp vào tài khoản cũ cùng email chỉ khi nhà cung cấp xác nhận email đó. Nếu tài
 * khoản cũ chưa từng xác thực email thì xoá mật khẩu và thu hồi phiên: rất có thể
 * người khác đã đăng ký trước bằng email của chủ thật, và chủ thật vừa chứng minh
 * quyền sở hữu qua Google/Facebook.
 */
async function findOrCreateOAuthUser(
  provider: OAuthProviderName,
  profile: OAuthProfile,
): Promise<User> {
  const link = { provider, providerUserId: profile.providerUserId };
  const linked = await prisma.oAuthAccount.findUnique({
    where: { provider_providerUserId: link },
    include: { user: true },
  });
  if (linked) return linked.user;

  const existing = profile.email
    ? await prisma.user.findUnique({ where: { email: profile.email } })
    : null;
  if (existing) {
    if (!profile.emailVerified) {
      throw new HttpError(
        409,
        'Email này đã có tài khoản. Đăng nhập bằng mật khẩu trước.',
        'EMAIL_TAKEN',
      );
    }
    return prisma.$transaction(async (tx) => {
      if (!existing.emailVerified) {
        await tx.refreshToken.updateMany({
          where: { userId: existing.id, revokedAt: null },
          data: { revokedAt: new Date() },
        });
      }
      return tx.user.update({
        where: { id: existing.id },
        data: {
          emailVerified: true,
          ...(!existing.emailVerified && { passwordHash: null }),
          oauthAccounts: { create: link },
        },
      });
    });
  }

  const name = profile.name?.trim().slice(0, 50) ?? '';
  return prisma.user.create({
    data: {
      email: profile.email,
      emailVerified: profile.email !== null && profile.emailVerified,
      displayName: name.length >= 2 ? name : 'Người chơi mới',
      oauthAccounts: { create: link },
    },
  });
}

/**
 * GET = đăng nhập. POST = liên kết vào tài khoản đang đăng nhập, kèm `link` là mã
 * từ POST /oauth/:provider/link. Mã đi trong body form chứ không trên URL: URL
 * nằm trong log, và ai cầm mã đó là gắn được Google **của họ** vào tài khoản này.
 */
const oauthStart: RequestHandler = (req, res, next) => {
  const provider = String(req.params.provider);
  if (!isOAuthProvider(provider) || !oauthEnabled(provider)) {
    next(new HttpError(404, 'Cách đăng nhập này chưa được bật', 'OAUTH_DISABLED'));
    return;
  }
  const body = req.body as { link?: unknown } | undefined;
  const link = req.method === 'POST' && typeof body?.link === 'string' ? body.link : '';
  // `state` nằm trong cookie của chính trình duyệt này: callback không mang đúng
  // cookie là bị từ chối, nên không ai ép được người khác đăng nhập vào tài khoản mình.
  // base64url không có dấu `.`, nên dùng `.` ngăn ba phần được.
  const state = crypto.randomBytes(24).toString('base64url');
  res.cookie(STATE_COOKIE, [provider, state, link].filter(Boolean).join('.'), {
    httpOnly: true,
    sameSite: 'lax',
    secure: env.isProd,
    maxAge: 10 * 60_000,
    path: STATE_COOKIE_PATH,
  });
  // 303: trình duyệt đổi POST thành GET khi đi tiếp sang nhà cung cấp.
  res.redirect(303, authorizeUrl(provider, state));
};
authRouter.get('/oauth/:provider/start', oauthStart);
authRouter.post('/oauth/:provider/start', express.urlencoded({ extended: false }), oauthStart);

/** Bước 1 của liên kết: lấy mã (cần đăng nhập) để trang web POST sang /start. */
authRouter.post('/oauth/:provider/link', requireAuth, async (req, res, next) => {
  try {
    const provider = String(req.params.provider);
    if (!isOAuthProvider(provider) || !oauthEnabled(provider)) {
      throw new HttpError(404, 'Cách đăng nhập này chưa được bật', 'OAUTH_DISABLED');
    }
    const userId = req.user!.sub;
    const already = await prisma.oAuthAccount.findFirst({ where: { userId, provider } });
    if (already) throw new HttpError(409, 'Đã liên kết rồi', 'ALREADY_LINKED');
    const token = await issueToken('oauth_link', `${userId}:${provider}`, userId);
    res.json({ token, startUrl: `${env.apiUrl}/api/auth/oauth/${provider}/start` });
  } catch (err) {
    next(err);
  }
});

/**
 * Gắn tài khoản Google/Facebook vào người dùng đã đăng nhập. Tài khoản chưa có email
 * (tạo bằng OTP) thì nhận luôn email đã được nhà cung cấp xác nhận — nhờ đó dùng được
 * "Quên mật khẩu". Email trùng với tài khoản khác thì bỏ qua, không gộp.
 */
async function linkOAuthAccount(
  userId: string,
  provider: OAuthProviderName,
  profile: OAuthProfile,
): Promise<void> {
  const taken = await prisma.oAuthAccount.findUnique({
    where: { provider_providerUserId: { provider, providerUserId: profile.providerUserId } },
  });
  if (taken?.userId === userId) return;
  const label = provider === 'google' ? 'Google' : 'Facebook';
  if (taken) {
    throw new HttpError(
      409,
      `Tài khoản ${label} này đã gắn với một tài khoản SportsForAll khác`,
      'OAUTH_TAKEN',
    );
  }
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  const mine = await prisma.oAuthAccount.findFirst({ where: { userId, provider } });
  if (mine)
    throw new HttpError(409, `Bạn đã liên kết một tài khoản ${label} khác`, 'ALREADY_LINKED');

  const verified = profile.emailVerified ? profile.email : null;
  const emailFree = verified
    ? !(await prisma.user.findFirst({ where: { email: verified, id: { not: userId } } }))
    : false;
  await prisma.user.update({
    where: { id: userId },
    data: {
      oauthAccounts: { create: { provider, providerUserId: profile.providerUserId } },
      ...(!user.email && verified && emailFree && { email: verified, emailVerified: true }),
      ...(user.email !== null && user.email === verified && { emailVerified: true }),
    },
  });
}

/**
 * Gỡ liên kết. Chặn nếu đó là đường vào cuối cùng: gỡ xong mà không còn mật khẩu
 * (kèm email/số để gõ), số đã xác thực để nhận OTP, hay nhà cung cấp nào khác thì
 * tài khoản bị khoá ngoài vĩnh viễn.
 */
authRouter.delete('/oauth/:provider', requireAuth, async (req, res, next) => {
  try {
    const provider = String(req.params.provider);
    if (!isOAuthProvider(provider)) throw new HttpError(404, 'Không có', 'NOT_FOUND');
    const user = await prisma.user.findUnique({
      where: { id: req.user!.sub },
      include: { oauthAccounts: { select: { provider: true } } },
    });
    if (!user) throw new HttpError(404, 'Không tìm thấy người dùng', 'USER_NOT_FOUND');
    if (!user.oauthAccounts.some((a) => a.provider === provider)) {
      throw new HttpError(404, 'Chưa liên kết', 'NOT_LINKED');
    }
    const otherWays =
      (user.passwordHash !== null && (user.email !== null || user.phoneVerified)) ||
      user.phoneVerified ||
      user.oauthAccounts.some((a) => a.provider !== provider);
    if (!otherWays) {
      throw new HttpError(
        400,
        'Đây là cách đăng nhập duy nhất của bạn — đặt mật khẩu trước rồi mới gỡ',
        'LAST_LOGIN_METHOD',
      );
    }
    await prisma.oAuthAccount.deleteMany({ where: { userId: user.id, provider } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

/**
 * Nhà cung cấp chuyển về đây. Không trả token trên URL — đổi thành một mã dùng
 * một lần sống 60 giây, đặt sau dấu `#` (không bao giờ gửi lên server hay lọt
 * vào log / Referer), để trang web đổi lấy phiên qua POST /oauth/exchange.
 */
authRouter.get('/oauth/:provider/callback', async (req, res) => {
  const provider = String(req.params.provider);
  const [cookieProvider, cookieState, link] = (readCookie(req, STATE_COOKIE) ?? '').split('.');
  res.clearCookie(STATE_COOKIE, { path: STATE_COOKIE_PATH });
  // Liên kết thì quay về hồ sơ, đăng nhập thì quay về trang đăng nhập.
  const fail = (message: string) =>
    res.redirect(
      link
        ? `${env.webUrl}/profile?linkError=${encodeURIComponent(message)}`
        : `${env.webUrl}/login?error=${encodeURIComponent(message)}`,
    );

  if (!isOAuthProvider(provider) || !oauthEnabled(provider)) {
    fail('Cách đăng nhập này chưa được bật');
    return;
  }
  if (req.query.error) {
    fail(link ? 'Bạn đã huỷ liên kết' : 'Bạn đã huỷ đăng nhập');
    return;
  }
  const code = typeof req.query.code === 'string' ? req.query.code : '';
  const state = typeof req.query.state === 'string' ? req.query.state : '';
  if (!code || !state || cookieProvider !== provider || cookieState !== state) {
    fail('Phiên đăng nhập hết hạn, thử lại');
    return;
  }

  try {
    const profile = await fetchProfile(provider, code);
    if (link) {
      const expired = 'Phiên liên kết hết hạn, thử lại';
      const { userId, target } = await consumeToken('oauth_link', link, expired);
      // Mã cấp cho Google không dùng để liên kết Facebook.
      if (!userId || target !== `${userId}:${provider}`) {
        throw new HttpError(400, expired, 'INVALID_TOKEN');
      }
      await linkOAuthAccount(userId, provider, profile);
      res.redirect(`${env.webUrl}/profile?linked=${provider}`);
      return;
    }
    const user = await findOrCreateOAuthUser(provider, profile);
    assertNotDisabled(user);
    const handoff = await issueToken('oauth_login', user.id, user.id);
    res.redirect(`${env.webUrl}/oauth/callback#code=${handoff}`);
  } catch (err) {
    if (err instanceof HttpError) {
      fail(err.message);
      return;
    }
    logger.error({ err, provider }, 'oauth callback failed');
    fail('Không đăng nhập được, thử lại sau');
  }
});

// Không rate limit: mã 256 bit sống 60 giây, đoán mò là vô nghĩa.
authRouter.post('/oauth/exchange', async (req, res, next) => {
  try {
    const { token } = tokenSchema.parse(req.body);
    const expired = 'Phiên đăng nhập hết hạn, thử lại';
    const { userId } = await consumeToken('oauth_login', token, expired);
    const user = await prisma.user.findUnique({ where: { id: userId ?? '' } });
    if (!user) throw new HttpError(400, expired, 'INVALID_TOKEN');
    assertNotDisabled(user);
    const tokens = await issueSession(user.id, user.role);
    const body: AuthResponse = { user: toAuthUser(user), tokens };
    res.json(body);
  } catch (err) {
    next(err);
  }
});
