import { env } from '../config/env.js';
import { logger } from './logger.js';

/**
 * Gửi email / SMS ra ngoài (FR-001.2, 1.6, 1.7). Gọi thẳng HTTP API của nhà cung
 * cấp bằng `fetch` — không thêm SDK cho hai lời gọi POST.
 *
 * Chưa cấu hình nhà cung cấp: dev in nội dung ra terminal để bấm link / đọc mã;
 * production coi như tắt (xem `emailEnabled` / `smsEnabled`) để không nuốt lặng lẽ.
 */
export const emailEnabled = Boolean(env.RESEND_API_KEY) || !env.isProd;
export const smsEnabled =
  Boolean(env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN && env.TWILIO_FROM) || !env.isProd;

export async function sendEmail(to: string, subject: string, text: string): Promise<void> {
  if (!env.RESEND_API_KEY) {
    logger.info({ to, subject }, `\n📧 EMAIL (dev — chưa cấu hình RESEND_API_KEY)\n${text}\n`);
    return;
  }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from: env.MAIL_FROM, to, subject, text }),
  });
  if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text()}`);
}

export async function sendSms(phone: string, text: string): Promise<void> {
  if (!env.TWILIO_ACCOUNT_SID || !env.TWILIO_AUTH_TOKEN || !env.TWILIO_FROM) {
    logger.info({ phone }, `\n📱 SMS (dev — chưa cấu hình Twilio)\n${text}\n`);
    return;
  }
  // Số lưu dạng 0xxxxxxxxx; nhà mạng quốc tế cần +84xxxxxxxxx.
  const to = `+84${phone.slice(1)}`;
  const auth = Buffer.from(`${env.TWILIO_ACCOUNT_SID}:${env.TWILIO_AUTH_TOKEN}`).toString('base64');
  const res = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${env.TWILIO_ACCOUNT_SID}/Messages.json`,
    {
      method: 'POST',
      headers: { Authorization: `Basic ${auth}` },
      body: new URLSearchParams({ To: to, From: env.TWILIO_FROM, Body: text }),
    },
  );
  if (!res.ok) throw new Error(`Twilio ${res.status}: ${await res.text()}`);
}
