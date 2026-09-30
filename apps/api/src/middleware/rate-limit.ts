import { rateLimit } from 'express-rate-limit';
import { logger } from '../lib/logger.js';

interface LimiterOptions {
  windowMs: number;
  limit: number;
  skipSuccessfulRequests?: boolean;
}

// MemoryStore: đếm theo từng tiến trình. Chạy nhiều instance thì mỗi instance có
// bộ đếm riêng, giới hạn thực tế nhân lên theo số instance — lúc đó cần store dùng chung.
function createLimiter(opts: LimiterOptions) {
  return rateLimit({
    ...opts,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler: (req, res) => {
      logger.warn({ ip: req.ip, path: req.path }, 'rate limit exceeded');
      res.status(429).json({
        error: {
          code: 'RATE_LIMITED',
          message: 'Bạn đã thử quá nhiều lần, vui lòng đợi ít phút rồi thử lại',
        },
      });
    },
  });
}

// Chỉ đếm lần đăng nhập hỏng, nên người dùng gõ đúng mật khẩu không bao giờ chạm trần.
export const loginLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  skipSuccessfulRequests: true,
});

export const registerLimiter = createLimiter({
  windowMs: 60 * 60 * 1000,
  limit: 5,
});

// Refresh là request hợp lệ và lặp lại đều (mỗi 15 phút một phiên), thêm nữa nhiều
// người có thể chung một IP qua NAT — nên ngưỡng phải rộng, chỉ chặn dò token.
export const refreshLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 60,
  skipSuccessfulRequests: true,
});

// Mỗi lần gọi là một email thật gửi đi — chặn dùng form "quên mật khẩu" để spam
// hộp thư người khác. Đếm cả lần thành công.
export const emailLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 5,
});

// SMS tốn tiền thật. Cộng với khoảng chờ 60 giây mỗi số (lib/auth-tokens.ts).
export const otpLimiter = createLimiter({
  windowMs: 60 * 60 * 1000,
  limit: 5,
});

// Nhập OTP. Tách khỏi loginLimiter: bước "số mới, cần nhập tên" trả 400 và bị đếm
// là thất bại — dùng chung bộ đếm thì vài lần nhập sai OTP khoá luôn đăng nhập
// bằng mật khẩu. Đoán mò đã bị chặn chính ở mỗi mã (5 lần, lib/auth-tokens.ts).
export const otpVerifyLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
});
