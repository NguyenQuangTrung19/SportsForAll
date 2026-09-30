import type { NotificationType, Prisma, PrismaClient } from '@prisma/client';
import { sendPush } from './push.js';

interface NotifyInput {
  userIds: string[];
  type: NotificationType;
  title: string;
  message?: string | null;
  link?: string | null;
}

type Client = PrismaClient | Prisma.TransactionClient;

export async function notify(client: Client, input: NotifyInput): Promise<void> {
  const unique = Array.from(new Set(input.userIds));
  if (unique.length === 0) return;
  await client.notification.createMany({
    data: unique.map((userId) => ({
      userId,
      type: input.type,
      title: input.title,
      message: input.message ?? null,
      link: input.link ?? null,
    })),
  });
  // ponytail: đẩy ngay khi ghi, chưa chờ giao dịch commit — giao dịch rollback
  // thì máy vẫn rung cho một thông báo không tồn tại. Hiếm (chỉ khi lỗi) và vô
  // hại; cần chặt thì trả hàm gửi về cho người gọi chạy sau `$transaction`.
  void sendPush(unique, {
    title: input.title,
    body: input.message ?? null,
    link: input.link ?? null,
  });
}
