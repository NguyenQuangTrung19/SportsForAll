import {
  applyJoinSchema,
  createRecruitmentPostSchema,
  recruitmentListQuerySchema,
  updateRecruitmentPostSchema,
  type JoinRequestView,
  type RecruitmentListResponse,
  type RecruitmentPostDetail,
  type RecruitmentPostSummary,
  type RecruitmentTeamRef,
} from '@sfa/shared';
import type { JoinRequest, Prisma, RecruitmentPost, Team, TeamMember, User } from '@prisma/client';
import { Router } from 'express';
import { prisma } from '../lib/db.js';
import { notify } from '../lib/notify.js';
import { requireAuth } from '../middleware/auth.js';
import { HttpError } from '../middleware/error.js';

export const recruitmentRouter = Router();

type PostWithRelations = RecruitmentPost & {
  team: Team & { members: Pick<TeamMember, 'userId' | 'role'>[] };
  requests: (JoinRequest & {
    user: Pick<User, 'id' | 'displayName' | 'avatarUrl'>;
  })[];
  _count?: { requests: number };
};

function teamRef(team: Team): RecruitmentTeamRef {
  return {
    id: team.id,
    name: team.name,
    sport: team.sport,
    region: team.region,
    logoUrl: team.logoUrl,
    reputation: team.reputation,
  };
}

function toJoinRequestView(
  r: JoinRequest & { user: Pick<User, 'id' | 'displayName' | 'avatarUrl'> },
): JoinRequestView {
  return {
    id: r.id,
    postId: r.postId,
    userId: r.userId,
    displayName: r.user.displayName,
    avatarUrl: r.user.avatarUrl,
    status: r.status,
    message: r.message,
    createdAt: r.createdAt.toISOString(),
    decidedAt: r.decidedAt?.toISOString() ?? null,
  };
}

function toSummary(post: PostWithRelations, viewerId: string): RecruitmentPostSummary {
  const viewerRequest = post.requests.find((r) => r.userId === viewerId);
  const viewerIsTeamMember = post.team.members.some((m) => m.userId === viewerId);
  return {
    id: post.id,
    teamId: post.teamId,
    team: teamRef(post.team),
    sport: post.sport,
    region: post.region,
    positionNeeded: post.positionNeeded,
    skillLevelMin: post.skillLevelMin,
    description: post.description,
    status: post.status,
    expiresAt: post.expiresAt?.toISOString() ?? null,
    requestCount: post._count?.requests ?? post.requests.length,
    viewerRequestStatus: viewerRequest?.status ?? null,
    viewerIsTeamMember,
    createdAt: post.createdAt.toISOString(),
  };
}

function toDetail(post: PostWithRelations, viewerId: string): RecruitmentPostDetail {
  const viewerIsTeamMember = post.team.members.some((m) => m.userId === viewerId);
  // Only show full requests list if viewer is a team member (captain/co_captain typically)
  const visibleRequests = viewerIsTeamMember
    ? post.requests
    : post.requests.filter((r) => r.userId === viewerId);
  return {
    ...toSummary(post, viewerId),
    requests: visibleRequests
      .slice()
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .map(toJoinRequestView),
  };
}

const POST_INCLUDE = {
  team: {
    include: { members: { select: { userId: true, role: true } } },
  },
  requests: {
    include: {
      user: { select: { id: true, displayName: true, avatarUrl: true } },
    },
  },
} satisfies Prisma.RecruitmentPostInclude;

async function loadPostOrFail(postId: string): Promise<PostWithRelations> {
  const post = await prisma.recruitmentPost.findUnique({
    where: { id: postId },
    include: POST_INCLUDE,
  });
  if (!post) throw new HttpError(404, 'Không tìm thấy bài đăng', 'POST_NOT_FOUND');
  return post;
}

function ensureTeamManagerRole(post: PostWithRelations, viewerId: string): void {
  const member = post.team.members.find((m) => m.userId === viewerId);
  if (!member || (member.role !== 'captain' && member.role !== 'co_captain')) {
    throw new HttpError(403, 'Chỉ captain/phó đội của đội mới có quyền', 'INSUFFICIENT_TEAM_ROLE');
  }
}

recruitmentRouter.post('/posts', requireAuth, async (req, res, next) => {
  try {
    const input = createRecruitmentPostSchema.parse(req.body);
    const userId = req.user!.sub;

    const team = await prisma.team.findUnique({
      where: { id: input.teamId },
      include: { members: { where: { userId } } },
    });
    if (!team) throw new HttpError(404, 'Không tìm thấy đội', 'TEAM_NOT_FOUND');
    const membership = team.members[0];
    if (!membership || (membership.role !== 'captain' && membership.role !== 'co_captain')) {
      throw new HttpError(403, 'Chỉ captain/phó đội mới đăng được bài tuyển', 'INSUFFICIENT_TEAM_ROLE');
    }

    const post = await prisma.recruitmentPost.create({
      data: {
        teamId: team.id,
        sport: team.sport,
        region: input.region ?? team.region,
        positionNeeded: input.positionNeeded ?? null,
        skillLevelMin: input.skillLevelMin ?? null,
        description: input.description,
        expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
      },
      include: POST_INCLUDE,
    });

    res.status(201).json(toDetail(post, userId));
  } catch (err) {
    next(err);
  }
});

recruitmentRouter.get('/posts', requireAuth, async (req, res, next) => {
  try {
    const q = recruitmentListQuerySchema.parse(req.query);
    const userId = req.user!.sub;

    const where: Prisma.RecruitmentPostWhereInput = {
      ...(q.sport && { sport: q.sport }),
      ...(q.region && { region: { equals: q.region, mode: 'insensitive' } }),
      ...(q.positionNeeded && {
        positionNeeded: { contains: q.positionNeeded, mode: 'insensitive' },
      }),
      ...(q.skillLevelMin && { skillLevelMin: q.skillLevelMin }),
      ...(q.status ? { status: q.status } : { status: 'open' }),
      ...(q.teamId && { teamId: q.teamId }),
    };

    const items = await prisma.recruitmentPost.findMany({
      where,
      include: POST_INCLUDE,
      orderBy: { createdAt: 'desc' },
      take: q.limit + 1,
      ...(q.cursor && { cursor: { id: q.cursor }, skip: 1 }),
    });

    const hasMore = items.length > q.limit;
    const sliced = hasMore ? items.slice(0, q.limit) : items;
    const last = sliced[sliced.length - 1];
    const body: RecruitmentListResponse = {
      items: sliced.map((p) => toSummary(p, userId)),
      nextCursor: hasMore && last ? last.id : null,
    };
    res.json(body);
  } catch (err) {
    next(err);
  }
});

recruitmentRouter.get('/posts/:id', requireAuth, async (req, res, next) => {
  try {
    const post = await loadPostOrFail(String(req.params.id));
    res.json(toDetail(post, req.user!.sub));
  } catch (err) {
    next(err);
  }
});

recruitmentRouter.patch('/posts/:id', requireAuth, async (req, res, next) => {
  try {
    const input = updateRecruitmentPostSchema.parse(req.body);
    const post = await loadPostOrFail(String(req.params.id));
    ensureTeamManagerRole(post, req.user!.sub);

    await prisma.recruitmentPost.update({
      where: { id: post.id },
      data: {
        ...(input.positionNeeded !== undefined && { positionNeeded: input.positionNeeded }),
        ...(input.skillLevelMin !== undefined && { skillLevelMin: input.skillLevelMin }),
        ...(input.region !== undefined && { region: input.region }),
        ...(input.description !== undefined && { description: input.description }),
        ...(input.status !== undefined && { status: input.status }),
        ...(input.expiresAt !== undefined && {
          expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
        }),
      },
    });

    const refreshed = await loadPostOrFail(post.id);
    res.json(toDetail(refreshed, req.user!.sub));
  } catch (err) {
    next(err);
  }
});

recruitmentRouter.delete('/posts/:id', requireAuth, async (req, res, next) => {
  try {
    const post = await loadPostOrFail(String(req.params.id));
    ensureTeamManagerRole(post, req.user!.sub);
    await prisma.recruitmentPost.delete({ where: { id: post.id } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

recruitmentRouter.post('/posts/:id/requests', requireAuth, async (req, res, next) => {
  try {
    const input = applyJoinSchema.parse(req.body);
    const post = await loadPostOrFail(String(req.params.id));
    const userId = req.user!.sub;

    if (post.status !== 'open') {
      throw new HttpError(400, 'Bài đăng đã đóng', 'POST_CLOSED');
    }
    if (post.expiresAt && post.expiresAt < new Date()) {
      throw new HttpError(400, 'Bài đăng đã hết hạn', 'POST_EXPIRED');
    }
    if (post.team.members.some((m) => m.userId === userId)) {
      throw new HttpError(409, 'Bạn đã ở trong đội này', 'ALREADY_MEMBER');
    }
    const existing = post.requests.find((r) => r.userId === userId);
    if (existing && existing.status === 'pending') {
      throw new HttpError(409, 'Bạn đã gửi đơn cho bài này', 'ALREADY_APPLIED');
    }

    const applicant = await prisma.user.findUnique({
      where: { id: userId },
      select: { displayName: true },
    });

    if (existing) {
      await prisma.joinRequest.update({
        where: { id: existing.id },
        data: {
          status: 'pending',
          message: input.message ?? null,
          decidedAt: null,
          createdAt: new Date(),
        },
      });
    } else {
      await prisma.joinRequest.create({
        data: { postId: post.id, userId, message: input.message ?? null },
      });
    }

    const managers = post.team.members
      .filter((m) => m.role === 'captain' || m.role === 'co_captain')
      .map((m) => m.userId);
    await notify(prisma, {
      userIds: managers,
      type: 'join_request_received',
      title: `${applicant?.displayName ?? 'Một người chơi'} muốn vào ${post.team.name}`,
      message: input.message ?? null,
      link: `/posts/${post.id}`,
    });

    const refreshed = await loadPostOrFail(post.id);
    res.status(201).json(toDetail(refreshed, userId));
  } catch (err) {
    next(err);
  }
});

recruitmentRouter.post('/requests/:requestId/accept', requireAuth, async (req, res, next) => {
  try {
    const request = await prisma.joinRequest.findUnique({
      where: { id: String(req.params.requestId) },
      include: { post: { include: POST_INCLUDE } },
    });
    if (!request) throw new HttpError(404, 'Không tìm thấy đơn', 'REQUEST_NOT_FOUND');
    ensureTeamManagerRole(request.post, req.user!.sub);
    if (request.status !== 'pending') {
      throw new HttpError(400, 'Đơn không còn ở trạng thái chờ', 'REQUEST_NOT_PENDING');
    }

    await prisma.$transaction(async (tx) => {
      await tx.joinRequest.update({
        where: { id: request.id },
        data: { status: 'accepted', decidedAt: new Date() },
      });
      const existing = await tx.teamMember.findUnique({
        where: { teamId_userId: { teamId: request.post.teamId, userId: request.userId } },
      });
      if (!existing) {
        await tx.teamMember.create({
          data: { teamId: request.post.teamId, userId: request.userId, role: 'member' },
        });
      }
      await notify(tx, {
        userIds: [request.userId],
        type: 'join_request_accepted',
        title: `Bạn đã được nhận vào ${request.post.team.name}`,
        link: `/teams/${request.post.teamId}`,
      });
    });

    const refreshed = await loadPostOrFail(request.postId);
    res.json(toDetail(refreshed, req.user!.sub));
  } catch (err) {
    next(err);
  }
});

recruitmentRouter.post('/requests/:requestId/reject', requireAuth, async (req, res, next) => {
  try {
    const request = await prisma.joinRequest.findUnique({
      where: { id: String(req.params.requestId) },
      include: { post: { include: POST_INCLUDE } },
    });
    if (!request) throw new HttpError(404, 'Không tìm thấy đơn', 'REQUEST_NOT_FOUND');
    ensureTeamManagerRole(request.post, req.user!.sub);
    if (request.status !== 'pending') {
      throw new HttpError(400, 'Đơn không còn ở trạng thái chờ', 'REQUEST_NOT_PENDING');
    }

    await prisma.joinRequest.update({
      where: { id: request.id },
      data: { status: 'rejected', decidedAt: new Date() },
    });
    await notify(prisma, {
      userIds: [request.userId],
      type: 'join_request_rejected',
      title: `Đơn xin gia nhập ${request.post.team.name} đã bị từ chối`,
      link: `/posts/${request.postId}`,
    });

    const refreshed = await loadPostOrFail(request.postId);
    res.json(toDetail(refreshed, req.user!.sub));
  } catch (err) {
    next(err);
  }
});

recruitmentRouter.post('/requests/:requestId/cancel', requireAuth, async (req, res, next) => {
  try {
    const request = await prisma.joinRequest.findUnique({
      where: { id: String(req.params.requestId) },
    });
    if (!request) throw new HttpError(404, 'Không tìm thấy đơn', 'REQUEST_NOT_FOUND');
    if (request.userId !== req.user!.sub) {
      throw new HttpError(403, 'Bạn chỉ có thể huỷ đơn của mình', 'FORBIDDEN');
    }
    if (request.status !== 'pending') {
      throw new HttpError(400, 'Đơn không còn ở trạng thái chờ', 'REQUEST_NOT_PENDING');
    }
    await prisma.joinRequest.update({
      where: { id: request.id },
      data: { status: 'cancelled', decidedAt: new Date() },
    });

    const refreshed = await loadPostOrFail(request.postId);
    res.json(toDetail(refreshed, req.user!.sub));
  } catch (err) {
    next(err);
  }
});
