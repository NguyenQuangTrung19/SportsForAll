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
