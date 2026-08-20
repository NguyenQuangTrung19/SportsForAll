import type { RequestHandler } from 'express';
import { verifyAccessToken } from '../lib/jwt.js';
import { HttpError } from './error.js';

export const requireAuth: RequestHandler = (req, _res, next) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return next(new HttpError(401, 'Thiếu access token', 'UNAUTHENTICATED'));
  }
  try {
    req.user = verifyAccessToken(header.slice(7));
    next();
  } catch {
    next(new HttpError(401, 'Access token không hợp lệ hoặc đã hết hạn', 'INVALID_TOKEN'));
  }
};

/**
 * Giải mã token nếu có, nhưng không chặn khi thiếu. Dùng cho endpoint công khai
 * mà vẫn muốn trả thêm dữ liệu cho người đã đăng nhập.
 */
export const optionalAuth: RequestHandler = (req, _res, next) => {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) {
    try {
      req.user = verifyAccessToken(header.slice(7));
    } catch {
      // Token hỏng thì coi như khách, không phải lỗi.
    }
  }
  next();
};
