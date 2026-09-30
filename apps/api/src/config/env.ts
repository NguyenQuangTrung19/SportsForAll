import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().url(),
  JWT_ACCESS_SECRET: z.string().min(16),
  JWT_REFRESH_SECRET: z.string().min(16),
  JWT_ACCESS_TTL: z.string().default('15m'),
  JWT_REFRESH_TTL: z.string().default('30d'),
  CORS_ORIGINS: z.string().default('http://localhost:5173'),
  // Số reverse proxy đứng trước API. Quyết định req.ip, tức key của rate limiter:
  // đặt sai thì hoặc mọi client dùng chung IP của proxy, hoặc kẻ tấn công giả được
  // X-Forwarded-For để vượt giới hạn. 0 = phơi trực tiếp, không tin header nào.
  TRUST_PROXY: z.coerce.number().int().min(0).default(0),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),

  // Địa chỉ công khai, dùng để dựng link trong email và redirect OAuth.
  WEB_URL: z.string().url().default('http://localhost:5173'),
  API_URL: z.string().url().default('http://localhost:4000'),

  // Tất cả phần dưới là tuỳ chọn. Thiếu thì: dev in email/OTP ra terminal, còn
  // production tắt chức năng đó và giao diện ẩn nút (GET /api/auth/providers).
  RESEND_API_KEY: z.string().optional(),
  MAIL_FROM: z.string().default('SportsForAll <onboarding@resend.dev>'),
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_FROM: z.string().optional(),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  FACEBOOK_APP_ID: z.string().optional(),
  FACEBOOK_APP_SECRET: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = {
  ...parsed.data,
  isDev: parsed.data.NODE_ENV === 'development',
  isProd: parsed.data.NODE_ENV === 'production',
  corsOrigins: parsed.data.CORS_ORIGINS.split(',').map((s) => s.trim()),
  webUrl: parsed.data.WEB_URL.replace(/\/$/, ''),
  apiUrl: parsed.data.API_URL.replace(/\/$/, ''),
};
