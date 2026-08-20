import type { RequestHandler } from 'express';
import { prisma } from '../lib/db.js';
import { HttpError } from './error.js';

/**
 * Chặn theo vai trò. Đọc vai trò từ CSDL chứ không tin vai trò nằm trong token:
 * access token sống 15 phút, nên một người vừa bị hạ quyền vẫn còn token cũ
 * hợp lệ trong ngần ấy thời gian. Với thao tác quản trị thì không chấp nhận được.
 */
export function requireRole(...allowed: string[]): RequestHandler {
  return (req, _res, next) => {
    const userId = req.user?.sub;
    if (!userId) {
      next(new HttpError(401, 'Thiếu access token', 'UNAUTHENTICATED'));
      return;
    }
    prisma.user
      .findUnique({ where: { id: userId }, select: { role: true } })
      .then((user) => {
        if (!user) {
          next(new HttpError(401, 'Tài khoản không tồn tại', 'USER_NOT_FOUND'));
          return;
        }
        if (!allowed.includes(user.role)) {
          next(new HttpError(403, 'Bạn không có quyền thực hiện thao tác này', 'FORBIDDEN'));
          return;
        }
        next();
      })
      .catch(next);
  };
}
