import {
  createLookingForTeamSchema,
  lookingForTeamListQuerySchema,
  updateLookingForTeamSchema,
  type LookingForTeamListResponse,
  type LookingForTeamPostSummary,
} from '@sfa/shared';
import { type Prisma, type LookingForTeamPost, type User } from '@prisma/client';
import { Router } from 'express';
import { prisma } from '../lib/db.js';
import { requireAuth } from '../middleware/auth.js';
import { HttpError } from '../middleware/error.js';

export const lookingForTeamRouter = Router();

const AUTHOR_SELECT = {
  id: true,
  displayName: true,
  avatarUrl: true,
  region: true,
  reputation: true,
} as const;

type PostWithAuthor = LookingForTeamPost & {
  user: Pick<User, 'id' | 'displayName' | 'avatarUrl' | 'region' | 'reputation'>;
};

function toSummary(p: PostWithAuthor, viewerId: string): LookingForTeamPostSummary {
  return {
    id: p.id,
    sport: p.sport,
    region: p.region,
    position: p.position,
    skillLevel: p.skillLevel,
    description: p.description,
    status: p.status,
    expiresAt: p.expiresAt?.toISOString() ?? null,
    author: {
      id: p.user.id,
      displayName: p.user.displayName,
      avatarUrl: p.user.avatarUrl,
      region: p.user.region,
      reputation: p.user.reputation,
    },
    viewerIsAuthor: p.userId === viewerId,
    createdAt: p.createdAt.toISOString(),
  };
}

async function loadOrFail(id: string): Promise<PostWithAuthor> {
  const post = await prisma.lookingForTeamPost.findUnique({
    where: { id },
    include: { user: { select: AUTHOR_SELECT } },
  });
  if (!post) throw new HttpError(404, 'Không tìm thấy bài đăng', 'POST_NOT_FOUND');
  return post;
}

function ensureAuthor(post: PostWithAuthor, viewerId: string): void {
  if (post.userId !== viewerId) {
    throw new HttpError(403, 'Bạn chỉ sửa được bài của mình', 'FORBIDDEN');
  }
}

lookingForTeamRouter.get('/', requireAuth, async (req, res, next) => {
  try {
    const q = lookingForTeamListQuerySchema.parse(req.query);
    const viewerId = req.user!.sub;

    const where: Prisma.LookingForTeamPostWhereInput = {
      ...(q.sport && { sport: q.sport }),
      ...(q.region && { region: { equals: q.region, mode: 'insensitive' } }),
      ...(q.position && { position: { contains: q.position, mode: 'insensitive' } }),
      ...(q.skillLevel && { skillLevel: q.skillLevel }),
      ...(q.userId && { userId: q.userId }),
      ...(q.status ? { status: q.status } : { status: 'open' }),
    };

    // id là khoá phụ cuối cùng để thứ tự luôn toàn phần — thiếu nó thì phân trang
    // theo cursor có thể bỏ sót hoặc lặp bản ghi khi các giá trị sắp xếp trùng nhau.
    const orderBy: Prisma.LookingForTeamPostOrderByWithRelationInput[] =
      q.sort === 'reputation'
        ? [{ user: { reputation: 'desc' } }, { createdAt: 'desc' }, { id: 'desc' }]
        : [{ createdAt: 'desc' }, { id: 'desc' }];

    const items = await prisma.lookingForTeamPost.findMany({
      where,
      include: { user: { select: AUTHOR_SELECT } },
      orderBy,
      take: q.limit + 1,
      ...(q.cursor && { cursor: { id: q.cursor }, skip: 1 }),
    });

    const hasMore = items.length > q.limit;
    const sliced = hasMore ? items.slice(0, q.limit) : items;
    const last = sliced[sliced.length - 1];
    const body: LookingForTeamListResponse = {
      items: sliced.map((p) => toSummary(p, viewerId)),
      nextCursor: hasMore && last ? last.id : null,
    };
    res.json(body);
  } catch (err) {
    next(err);
  }
});

lookingForTeamRouter.post('/', requireAuth, async (req, res, next) => {
  try {
    const input = createLookingForTeamSchema.parse(req.body);
    const userId = req.user!.sub;

    // Mỗi môn chỉ một bài đang mở, tránh một người phủ kín danh sách.
    const existing = await prisma.lookingForTeamPost.findFirst({
      where: { userId, sport: input.sport, status: 'open' },
      select: { id: true },
    });
    if (existing) {
      throw new HttpError(
        409,
        'Bạn đã có một bài tìm đội đang mở cho môn này',
        'DUPLICATE_OPEN_POST',
      );
    }

    const created = await prisma.lookingForTeamPost.create({
      data: {
        userId,
        sport: input.sport,
        region: input.region ?? null,
        position: input.position ?? null,
        skillLevel: input.skillLevel ?? null,
        description: input.description,
        expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
      },
      include: { user: { select: AUTHOR_SELECT } },
    });

    res.status(201).json(toSummary(created, userId));
  } catch (err) {
    next(err);
  }
});

lookingForTeamRouter.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const post = await loadOrFail(String(req.params.id));
    res.json(toSummary(post, req.user!.sub));
  } catch (err) {
    next(err);
  }
});

lookingForTeamRouter.patch('/:id', requireAuth, async (req, res, next) => {
  try {
    const input = updateLookingForTeamSchema.parse(req.body);
    const post = await loadOrFail(String(req.params.id));
    ensureAuthor(post, req.user!.sub);

    const updated = await prisma.lookingForTeamPost.update({
      where: { id: post.id },
      data: {
        ...(input.region !== undefined && { region: input.region }),
        ...(input.position !== undefined && { position: input.position }),
        ...(input.skillLevel !== undefined && { skillLevel: input.skillLevel }),
        ...(input.description !== undefined && { description: input.description }),
        ...(input.status !== undefined && { status: input.status }),
        ...(input.expiresAt !== undefined && {
          expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
        }),
      },
      include: { user: { select: AUTHOR_SELECT } },
    });

    res.json(toSummary(updated, req.user!.sub));
  } catch (err) {
    next(err);
  }
});

lookingForTeamRouter.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    const post = await loadOrFail(String(req.params.id));
    ensureAuthor(post, req.user!.sub);
    await prisma.lookingForTeamPost.delete({ where: { id: post.id } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});
