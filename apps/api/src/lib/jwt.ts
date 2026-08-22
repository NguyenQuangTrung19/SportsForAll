import crypto from 'node:crypto';
import jwt, { type SignOptions } from 'jsonwebtoken';
import { env } from '../config/env.js';
import { ttlToDate } from './ttl.js';

export interface AccessPayload {
  sub: string;
  role: string;
}

export function signAccessToken(payload: AccessPayload): string {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_TTL as SignOptions['expiresIn'],
  });
}

export function verifyAccessToken(token: string): AccessPayload {
  return jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessPayload;
}

export interface RefreshTokenIssued {
  token: string;
  tokenHash: string;
  expiresAt: Date;
}

export function issueRefreshToken(): RefreshTokenIssued {
  const token = crypto.randomBytes(48).toString('base64url');
  const tokenHash = hashRefreshToken(token);
  const expiresAt = ttlToDate(env.JWT_REFRESH_TTL);
  return { token, tokenHash, expiresAt };
}

export function hashRefreshToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}
