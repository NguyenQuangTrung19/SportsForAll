import crypto from 'node:crypto';
import type { AuthTokenPurpose } from '@prisma/client';
import { HttpError } from '../middleware/error.js';
import { prisma } from './db.js';

/**
 * Mã dùng một lần (bảng `AuthToken`): link trong email, OTP, mã đổi phiên OAuth.
 * Chỉ lưu SHA-256 — lộ CSDL cũng không dùng lại được link nào đang sống.
 */
export const TOKEN_TTL_MS: Record<AuthTokenPurpose, number> = {
  email_verify: 24 * 3_600_000,
  password_reset: 30 * 60_000,
  phone_otp: 5 * 60_000,
  // Chỉ sống đủ cho trình duyệt đi từ redirect của API sang trang web.
  oauth_login: 60_000,
  // Từ lúc bấm "Liên kết" tới lúc Google/Facebook chuyển về — gồm cả thời gian chọn tài khoản.
  oauth_link: 10 * 60_000,
};
export const OTP_MAX_ATTEMPTS = 5;
export const OTP_RESEND_COOLDOWN_MS = 60_000;

const sha256 = (v: string) => crypto.createHash('sha256').update(v).digest('hex');

const INVALID_LINK = 'Link đã hết hạn hoặc đã được dùng. Hãy yêu cầu link mới.';

/**
 * Phát mã mới và vô hiệu mọi mã cùng mục đích còn sống cho cùng `target` — bấm
 * "gửi lại" nhiều lần thì chỉ link mới nhất dùng được.
 */
export async function issueToken(
  purpose: AuthTokenPurpose,
  target: string,
  userId: string | null,
  raw = crypto.randomBytes(32).toString('base64url'),
): Promise<string> {
  await prisma.$transaction([
    prisma.authToken.updateMany({
      where: { purpose, target, usedAt: null },
      data: { usedAt: new Date() },
    }),
    prisma.authToken.create({
      data: {
        purpose,
        target,
        userId,
        tokenHash: sha256(raw),
        expiresAt: new Date(Date.now() + TOKEN_TTL_MS[purpose]),
      },
    }),
  ]);
  return raw;
}

/** Đánh dấu đã dùng. Điều kiện `usedAt: null` để hai request cùng lúc chỉ một cái thắng. */
async function markUsed(id: string, message: string, code: string): Promise<void> {
  const { count } = await prisma.authToken.updateMany({
    where: { id, usedAt: null },
    data: { usedAt: new Date() },
  });
  if (count === 0) throw new HttpError(400, message, code);
}

/** Tiêu mã dạng link: đúng mục đích, chưa dùng, chưa hết hạn. */
export async function consumeToken(
  purpose: AuthTokenPurpose,
  raw: string,
  message = INVALID_LINK,
): Promise<{ userId: string | null; target: string }> {
  const row = await prisma.authToken.findFirst({
    where: { purpose, tokenHash: sha256(raw), usedAt: null, expiresAt: { gt: new Date() } },
  });
  if (!row) throw new HttpError(400, message, 'INVALID_TOKEN');
  await markUsed(row.id, message, 'INVALID_TOKEN');
  return row;
}

/** Phát OTP 6 số. Chặn gửi dồn: mỗi số một mã mỗi 60 giây. */
export async function issueOtp(phone: string): Promise<string> {
  const last = await prisma.authToken.findFirst({
    where: { purpose: 'phone_otp', target: phone },
    orderBy: { createdAt: 'desc' },
    select: { createdAt: true },
  });
  const waitMs = last ? OTP_RESEND_COOLDOWN_MS - (Date.now() - last.createdAt.getTime()) : 0;
  if (waitMs > 0) {
    throw new HttpError(
      429,
      `Vừa gửi mã rồi, đợi ${Math.ceil(waitMs / 1000)} giây nữa để gửi lại`,
      'OTP_COOLDOWN',
    );
  }
  const code = crypto.randomInt(0, 1_000_000).toString().padStart(6, '0');
  return issueToken('phone_otp', phone, null, code);
}

/**
 * Kiểm OTP nhưng **không** tiêu mã — trả về id để người gọi tiêu khi xong việc.
 * Lý do: số chưa có tài khoản thì lượt đầu chỉ để hỏi tên, không được tốn mã.
 * Sai thì cộng một lượt; đủ `OTP_MAX_ATTEMPTS` là mã chết, phải xin mã mới.
 *
 * ponytail: đếm lượt sai đọc-rồi-ghi, hai lượt đoán song song có thể cùng lọt
 * trước khi bị đếm. Trần thực tế là vài lượt thừa mỗi mã, đã có rate limit theo IP.
 */
export async function checkOtp(phone: string, code: string): Promise<string> {
  const row = await prisma.authToken.findFirst({
    where: { purpose: 'phone_otp', target: phone, usedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: 'desc' },
  });
  if (!row) throw new HttpError(400, 'Mã đã hết hạn, bấm "Gửi lại mã"', 'OTP_EXPIRED');
  if (row.attempts >= OTP_MAX_ATTEMPTS) {
    throw new HttpError(400, 'Nhập sai quá nhiều lần, bấm "Gửi lại mã"', 'OTP_LOCKED');
  }
  const ok = crypto.timingSafeEqual(Buffer.from(row.tokenHash), Buffer.from(sha256(code)));
  if (!ok) {
    await prisma.authToken.update({ where: { id: row.id }, data: { attempts: { increment: 1 } } });
    const left = OTP_MAX_ATTEMPTS - row.attempts - 1;
    throw new HttpError(
      400,
      left > 0 ? `Mã không đúng, còn ${left} lần thử` : 'Nhập sai quá nhiều lần, bấm "Gửi lại mã"',
      'OTP_INVALID',
    );
  }
  return row.id;
}

export function consumeOtp(id: string): Promise<void> {
  return markUsed(id, 'Mã đã được dùng, bấm "Gửi lại mã"', 'OTP_EXPIRED');
}
