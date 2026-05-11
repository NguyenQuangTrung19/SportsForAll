import type { NotificationType, Prisma, PrismaClient } from '@prisma/client';

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
}
