import webpush from 'web-push';
import { env } from '../config/env.js';
import { prisma } from './db.js';
import { logger } from './logger.js';

/** Web Push (FR-009.6) chỉ bật khi đã cấu hình cặp khoá VAPID. */
export const pushPublicKey =
  env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY ? env.VAPID_PUBLIC_KEY : null;

if (pushPublicKey) {
  webpush.setVapidDetails(env.VAPID_SUBJECT ?? env.webUrl, pushPublicKey, env.VAPID_PRIVATE_KEY!);
}

export interface PushPayload {
  title: string;
  body: string | null;
  link: string | null;
}

/**
 * Đẩy tới mọi trình duyệt đã đăng ký của các người dùng này. Không bao giờ ném
 * lỗi: đẩy chỉ là kênh phụ, thông báo trong web đã lưu rồi.
 *
 * Trình duyệt trả 404/410 nghĩa là đăng ký đã chết (gỡ quyền, xoá dữ liệu) —
 * xoá dòng đó luôn để lần sau khỏi gửi vào hư không.
 */
export async function sendPush(userIds: string[], payload: PushPayload): Promise<void> {
  if (!pushPublicKey || userIds.length === 0) return;
  try {
    const subs = await prisma.pushSubscription.findMany({ where: { userId: { in: userIds } } });
    const body = JSON.stringify(payload);
    await Promise.all(
      subs.map((s) =>
        webpush
          .sendNotification(
            { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
            body,
            {
              TTL: 24 * 3600,
            },
          )
          .catch(async (err: { statusCode?: number }) => {
            if (err.statusCode === 404 || err.statusCode === 410) {
              await prisma.pushSubscription.deleteMany({ where: { id: s.id } });
            } else {
              logger.warn({ err, subId: s.id }, 'web push failed');
            }
          }),
      ),
    );
  } catch (err) {
    logger.error({ err }, 'web push fan-out failed');
  }
}
