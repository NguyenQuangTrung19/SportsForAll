import type { NotificationListResponse, NotificationView } from '@sfa/shared';
import type { Notification } from '@prisma/client';
import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/db.js';
import { requireAuth } from '../middleware/auth.js';

export const notificationsRouter = Router();

function toView(n: Notification): NotificationView {
  return {
    id: n.id,
    type: n.type,
    title: n.title,
    message: n.message,
    link: n.link,
    readAt: n.readAt?.toISOString() ?? null,
    createdAt: n.createdAt.toISOString(),
  };
}

const listQuery = z.object({
  cursor: z.string().cuid().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  filter: z.enum(['all', 'unread']).default('all'),
});

notificationsRouter.get('/', requireAuth, async (req, res, next) => {
  try {
    const q = listQuery.parse(req.query);
    const userId = req.user!.sub;
    const where = {
      userId,
      ...(q.filter === 'unread' && { readAt: null }),
    };
    const [items, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: q.limit + 1,
        ...(q.cursor && { cursor: { id: q.cursor }, skip: 1 }),
      }),
      prisma.notification.count({ where: { userId, readAt: null } }),
    ]);
    const hasMore = items.length > q.limit;
    const sliced = hasMore ? items.slice(0, q.limit) : items;
    const last = sliced[sliced.length - 1];
    const body: NotificationListResponse = {
      items: sliced.map(toView),
      unreadCount,
      nextCursor: hasMore && last ? last.id : null,
    };
    res.json(body);
  } catch (err) {
    next(err);
  }
});

const markReadSchema = z.union([
  z.object({ ids: z.array(z.string().cuid()).min(1).max(100) }),
  z.object({ all: z.literal(true) }),
]);

notificationsRouter.post('/mark-read', requireAuth, async (req, res, next) => {
  try {
    const input = markReadSchema.parse(req.body);
    const userId = req.user!.sub;
    const where =
      'all' in input
        ? { userId, readAt: null }
        : { userId, id: { in: input.ids }, readAt: null };
    const result = await prisma.notification.updateMany({
      where,
      data: { readAt: new Date() },
    });
    res.json({ updated: result.count });
  } catch (err) {
    next(err);
  }
});
