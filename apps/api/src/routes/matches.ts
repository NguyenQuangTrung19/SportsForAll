import {
  createMatchRequestSchema,
  matchRequestListQuerySchema,
  sendChallengeSchema,
  updateMatchRequestSchema,
  type ChallengeView,
  type MatchRequestDetail,
  type MatchRequestListResponse,
  type MatchRequestSummary,
  type MatchView,
  type RecruitmentTeamRef,
} from '@sfa/shared';
import type { Challenge, Match, MatchRequest, Prisma, Team, TeamMember } from '@prisma/client';
import { Router } from 'express';
import { prisma } from '../lib/db.js';
import { notify } from '../lib/notify.js';
import { requireAuth } from '../middleware/auth.js';
import { HttpError } from '../middleware/error.js';

export const matchesRouter = Router();

type TeamWithMembers = Team & { members: Pick<TeamMember, 'userId' | 'role'>[] };

type ChallengeWithTeam = Challenge & {
  challengerTeam: TeamWithMembers;
};

type MatchRequestWithRelations = MatchRequest & {
  team: TeamWithMembers;
  challenges: ChallengeWithTeam[];
  match:
    | (Match & {
        homeTeam: Team;
        awayTeam: Team;
      })
    | null;
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

function toChallengeView(c: ChallengeWithTeam, viewerId: string): ChallengeView {
  return {
    id: c.id,
    matchRequestId: c.matchRequestId,
    challengerTeam: teamRef(c.challengerTeam),
    message: c.message,
    status: c.status,
    createdAt: c.createdAt.toISOString(),
    decidedAt: c.decidedAt?.toISOString() ?? null,
    isMine: c.challengerTeam.members.some((m) => m.userId === viewerId),
  };
}

function toMatchView(m: Match & { homeTeam: Team; awayTeam: Team }): MatchView {
  return {
    id: m.id,
    matchRequestId: m.matchRequestId,
    homeTeam: teamRef(m.homeTeam),
    awayTeam: teamRef(m.awayTeam),
    sport: m.sport,
    scheduledAt: m.scheduledAt?.toISOString() ?? null,
    venueName: m.venueName,
    status: m.status,
    homeScore: m.homeScore,
    awayScore: m.awayScore,
    createdAt: m.createdAt.toISOString(),
  };
}

function toSummary(req: MatchRequestWithRelations, viewerId: string): MatchRequestSummary {
  const viewerOwns = req.team.members.some((m) => m.userId === viewerId);
  const viewerChallenge = req.challenges.find((c) =>
    c.challengerTeam.members.some((m) => m.userId === viewerId),
  );
  return {
    id: req.id,
    teamId: req.teamId,
    team: teamRef(req.team),
    sport: req.sport,
    region: req.region,
    preferredTime: req.preferredTime?.toISOString() ?? null,
    venueName: req.venueName,
    description: req.description,
    status: req.status,
    skillLevelMin: req.skillLevelMin,
    expiresAt: req.expiresAt?.toISOString() ?? null,
    challengeCount: req.challenges.length,
    viewerChallenge: viewerChallenge
      ? { id: viewerChallenge.id, status: viewerChallenge.status }
      : null,
    viewerOwns,
    createdAt: req.createdAt.toISOString(),
  };
}

function toDetail(req: MatchRequestWithRelations, viewerId: string): MatchRequestDetail {
  const viewerOwns = req.team.members.some((m) => m.userId === viewerId);
  // Owner sees all challenges; non-owner sees only their own team's challenges
  const visible = viewerOwns
    ? req.challenges
    : req.challenges.filter((c) =>
        c.challengerTeam.members.some((m) => m.userId === viewerId),
      );
  return {
    ...toSummary(req, viewerId),
    challenges: visible
      .slice()
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .map((c) => toChallengeView(c, viewerId)),
    match: req.match ? toMatchView(req.match) : null,
  };
}

const REQUEST_INCLUDE = {
  team: {
    include: { members: { select: { userId: true, role: true } } },
  },
  challenges: {
    include: {
      challengerTeam: {
        include: { members: { select: { userId: true, role: true } } },
      },
    },
  },
  match: {
    include: { homeTeam: true, awayTeam: true },
  },
} satisfies Prisma.MatchRequestInclude;

async function loadRequest(id: string): Promise<MatchRequestWithRelations> {
  const r = await prisma.matchRequest.findUnique({
    where: { id },
    include: REQUEST_INCLUDE,
  });
  if (!r) throw new HttpError(404, 'Không tìm thấy lời mời', 'REQUEST_NOT_FOUND');
  return r;
}

function ensureTeamManager(
  team: TeamWithMembers,
  userId: string,
): void {
  const m = team.members.find((x) => x.userId === userId);
  if (!m || (m.role !== 'captain' && m.role !== 'co_captain')) {
    throw new HttpError(403, 'Chỉ captain/phó đội mới có quyền', 'INSUFFICIENT_TEAM_ROLE');
  }
}

matchesRouter.post('/requests', requireAuth, async (req, res, next) => {
  try {
    const input = createMatchRequestSchema.parse(req.body);
    const userId = req.user!.sub;
    const team = await prisma.team.findUnique({
      where: { id: input.teamId },
      include: { members: { select: { userId: true, role: true } } },
    });
    if (!team) throw new HttpError(404, 'Không tìm thấy đội', 'TEAM_NOT_FOUND');
    ensureTeamManager(team, userId);

    const created = await prisma.matchRequest.create({
      data: {
        teamId: team.id,
        sport: team.sport,
        region: input.region ?? team.region,
        preferredTime: input.preferredTime ? new Date(input.preferredTime) : null,
        venueName: input.venueName ?? null,
        description: input.description,
        skillLevelMin: input.skillLevelMin ?? null,
        expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
      },
      include: REQUEST_INCLUDE,
    });
    res.status(201).json(toDetail(created, userId));
  } catch (err) {
    next(err);
  }
});

matchesRouter.get('/requests', requireAuth, async (req, res, next) => {
  try {
    const q = matchRequestListQuerySchema.parse(req.query);
    const userId = req.user!.sub;

    const where: Prisma.MatchRequestWhereInput = {
      ...(q.sport && { sport: q.sport }),
      ...(q.region && { region: { equals: q.region, mode: 'insensitive' } }),
      ...(q.skillLevelMin && { skillLevelMin: q.skillLevelMin }),
      ...(q.status ? { status: q.status } : { status: 'open' }),
      ...(q.teamId && { teamId: q.teamId }),
    };

    const items = await prisma.matchRequest.findMany({
      where,
      include: REQUEST_INCLUDE,
      orderBy: { createdAt: 'desc' },
      take: q.limit + 1,
      ...(q.cursor && { cursor: { id: q.cursor }, skip: 1 }),
    });

    const hasMore = items.length > q.limit;
    const sliced = hasMore ? items.slice(0, q.limit) : items;
    const last = sliced[sliced.length - 1];
    const body: MatchRequestListResponse = {
      items: sliced.map((r) => toSummary(r, userId)),
      nextCursor: hasMore && last ? last.id : null,
    };
    res.json(body);
  } catch (err) {
    next(err);
  }
});

matchesRouter.get('/requests/:id', requireAuth, async (req, res, next) => {
  try {
    const r = await loadRequest(String(req.params.id));
    res.json(toDetail(r, req.user!.sub));
  } catch (err) {
    next(err);
  }
});

matchesRouter.patch('/requests/:id', requireAuth, async (req, res, next) => {
  try {
    const input = updateMatchRequestSchema.parse(req.body);
    const r = await loadRequest(String(req.params.id));
    ensureTeamManager(r.team, req.user!.sub);
    if (r.status === 'matched') {
      throw new HttpError(400, 'Lời mời đã được ghép trận', 'ALREADY_MATCHED');
    }
    await prisma.matchRequest.update({
      where: { id: r.id },
      data: {
        ...(input.region !== undefined && { region: input.region }),
        ...(input.preferredTime !== undefined && {
          preferredTime: input.preferredTime ? new Date(input.preferredTime) : null,
        }),
        ...(input.venueName !== undefined && { venueName: input.venueName }),
        ...(input.description !== undefined && { description: input.description }),
        ...(input.skillLevelMin !== undefined && { skillLevelMin: input.skillLevelMin }),
        ...(input.status !== undefined && { status: input.status }),
        ...(input.expiresAt !== undefined && {
          expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
        }),
      },
    });
    const refreshed = await loadRequest(r.id);
    res.json(toDetail(refreshed, req.user!.sub));
  } catch (err) {
    next(err);
  }
});

matchesRouter.delete('/requests/:id', requireAuth, async (req, res, next) => {
  try {
    const r = await loadRequest(String(req.params.id));
    ensureTeamManager(r.team, req.user!.sub);
    if (r.status === 'matched') {
      throw new HttpError(400, 'Đã ghép trận — không thể xoá', 'ALREADY_MATCHED');
    }
    await prisma.matchRequest.delete({ where: { id: r.id } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

matchesRouter.post('/requests/:id/challenges', requireAuth, async (req, res, next) => {
  try {
    const input = sendChallengeSchema.parse(req.body);
    const userId = req.user!.sub;
    const r = await loadRequest(String(req.params.id));

    if (r.status !== 'open') {
      throw new HttpError(400, 'Lời mời không còn mở', 'REQUEST_NOT_OPEN');
    }
    if (r.expiresAt && r.expiresAt < new Date()) {
      throw new HttpError(400, 'Lời mời đã hết hạn', 'REQUEST_EXPIRED');
    }
    if (input.challengerTeamId === r.teamId) {
      throw new HttpError(400, 'Không thể tự thách đấu', 'SELF_CHALLENGE');
    }

    const challenger = await prisma.team.findUnique({
      where: { id: input.challengerTeamId },
      include: { members: { select: { userId: true, role: true } } },
    });
    if (!challenger) throw new HttpError(404, 'Không tìm thấy đội của bạn', 'TEAM_NOT_FOUND');
    ensureTeamManager(challenger, userId);
    if (challenger.sport !== r.sport) {
      throw new HttpError(400, 'Đội phải cùng môn', 'SPORT_MISMATCH');
    }

    const existing = await prisma.challenge.findUnique({
      where: { matchRequestId_challengerTeamId: { matchRequestId: r.id, challengerTeamId: challenger.id } },
    });
    if (existing && existing.status === 'pending') {
      throw new HttpError(409, 'Đã gửi thách đấu rồi', 'ALREADY_CHALLENGED');
    }

    if (existing) {
      await prisma.challenge.update({
        where: { id: existing.id },
        data: {
          status: 'pending',
          message: input.message ?? null,
          decidedAt: null,
          createdAt: new Date(),
        },
      });
    } else {
      await prisma.challenge.create({
        data: {
          matchRequestId: r.id,
          challengerTeamId: challenger.id,
          message: input.message ?? null,
        },
      });
    }

    const ownerManagers = r.team.members
      .filter((m) => m.role === 'captain' || m.role === 'co_captain')
      .map((m) => m.userId);
    await notify(prisma, {
      userIds: ownerManagers,
      type: 'challenge_received',
      title: `${challenger.name} muốn thách đấu`,
      message: input.message ?? null,
      link: `/match-requests/${r.id}`,
    });

    const refreshed = await loadRequest(r.id);
    res.status(201).json(toDetail(refreshed, userId));
  } catch (err) {
    next(err);
  }
});

matchesRouter.post('/challenges/:id/accept', requireAuth, async (req, res, next) => {
  try {
    const challenge = await prisma.challenge.findUnique({
      where: { id: String(req.params.id) },
      include: { matchRequest: { include: REQUEST_INCLUDE } },
    });
    if (!challenge) throw new HttpError(404, 'Không tìm thấy thách đấu', 'CHALLENGE_NOT_FOUND');
    ensureTeamManager(challenge.matchRequest.team, req.user!.sub);
    if (challenge.status !== 'pending') {
      throw new HttpError(400, 'Thách đấu không còn ở trạng thái chờ', 'CHALLENGE_NOT_PENDING');
    }

    const matchReq = challenge.matchRequest;
    const now = new Date();

    // Snapshot of participants for notifications
    const acceptedChallenger = matchReq.challenges.find((c) => c.id === challenge.id);
    const acceptedTeamManagers = (acceptedChallenger?.challengerTeam.members ?? [])
      .filter((m) => m.role === 'captain' || m.role === 'co_captain')
      .map((m) => m.userId);
    const rejectedChallengeTeamManagers = matchReq.challenges
      .filter((c) => c.id !== challenge.id && c.status === 'pending')
      .flatMap((c) =>
        c.challengerTeam.members
          .filter((m) => m.role === 'captain' || m.role === 'co_captain')
          .map((m) => m.userId),
      );
    const homeManagers = matchReq.team.members
      .filter((m) => m.role === 'captain' || m.role === 'co_captain')
      .map((m) => m.userId);

    await prisma.$transaction(async (tx) => {
      await tx.challenge.update({
        where: { id: challenge.id },
        data: { status: 'accepted', decidedAt: now },
      });
      await tx.challenge.updateMany({
        where: {
          matchRequestId: matchReq.id,
          id: { not: challenge.id },
          status: 'pending',
        },
        data: { status: 'rejected', decidedAt: now },
      });
      await tx.matchRequest.update({
        where: { id: matchReq.id },
        data: { status: 'matched' },
      });
      await tx.match.create({
        data: {
          matchRequestId: matchReq.id,
          homeTeamId: matchReq.teamId,
          awayTeamId: challenge.challengerTeamId,
          sport: matchReq.sport,
          scheduledAt: matchReq.preferredTime,
          venueName: matchReq.venueName,
          status: 'scheduled',
        },
      });
      await notify(tx, {
        userIds: acceptedTeamManagers,
        type: 'challenge_accepted',
        title: `Thách đấu của bạn được chấp nhận`,
        message: `${matchReq.team.name} đã đồng ý giao hữu.`,
        link: `/match-requests/${matchReq.id}`,
      });
      if (rejectedChallengeTeamManagers.length > 0) {
        await notify(tx, {
          userIds: rejectedChallengeTeamManagers,
          type: 'challenge_rejected',
          title: `${matchReq.team.name} đã chọn đối thủ khác`,
          link: `/match-requests/${matchReq.id}`,
        });
      }
      await notify(tx, {
        userIds: homeManagers,
        type: 'match_scheduled',
        title: `Trận đấu mới đã được lên lịch`,
        message: matchReq.preferredTime
          ? new Date(matchReq.preferredTime).toLocaleString('vi-VN')
          : null,
        link: `/match-requests/${matchReq.id}`,
      });
    });

    const refreshed = await loadRequest(matchReq.id);
    res.json(toDetail(refreshed, req.user!.sub));
  } catch (err) {
    next(err);
  }
});

matchesRouter.post('/challenges/:id/reject', requireAuth, async (req, res, next) => {
  try {
    const challenge = await prisma.challenge.findUnique({
      where: { id: String(req.params.id) },
      include: { matchRequest: { include: REQUEST_INCLUDE } },
    });
    if (!challenge) throw new HttpError(404, 'Không tìm thấy thách đấu', 'CHALLENGE_NOT_FOUND');
    ensureTeamManager(challenge.matchRequest.team, req.user!.sub);
    if (challenge.status !== 'pending') {
      throw new HttpError(400, 'Thách đấu không còn ở trạng thái chờ', 'CHALLENGE_NOT_PENDING');
    }
    const challengerTeam = await prisma.team.findUnique({
      where: { id: challenge.challengerTeamId },
      include: { members: { select: { userId: true, role: true } } },
    });
    await prisma.challenge.update({
      where: { id: challenge.id },
      data: { status: 'rejected', decidedAt: new Date() },
    });
    if (challengerTeam) {
      const challengerManagers = challengerTeam.members
        .filter((m) => m.role === 'captain' || m.role === 'co_captain')
        .map((m) => m.userId);
      await notify(prisma, {
        userIds: challengerManagers,
        type: 'challenge_rejected',
        title: `${challenge.matchRequest.team.name} đã từ chối thách đấu`,
        link: `/match-requests/${challenge.matchRequestId}`,
      });
    }
    const refreshed = await loadRequest(challenge.matchRequestId);
    res.json(toDetail(refreshed, req.user!.sub));
  } catch (err) {
    next(err);
  }
});

matchesRouter.post('/challenges/:id/withdraw', requireAuth, async (req, res, next) => {
  try {
    const challenge = await prisma.challenge.findUnique({
      where: { id: String(req.params.id) },
      include: {
        challengerTeam: { include: { members: { select: { userId: true, role: true } } } },
      },
    });
    if (!challenge) throw new HttpError(404, 'Không tìm thấy thách đấu', 'CHALLENGE_NOT_FOUND');
    ensureTeamManager(challenge.challengerTeam, req.user!.sub);
    if (challenge.status !== 'pending') {
      throw new HttpError(400, 'Thách đấu không còn ở trạng thái chờ', 'CHALLENGE_NOT_PENDING');
    }
    await prisma.challenge.update({
      where: { id: challenge.id },
      data: { status: 'withdrawn', decidedAt: new Date() },
    });
    const refreshed = await loadRequest(challenge.matchRequestId);
    res.json(toDetail(refreshed, req.user!.sub));
  } catch (err) {
    next(err);
  }
});

matchesRouter.get('/my', requireAuth, async (req, res, next) => {
  try {
    const userId = req.user!.sub;
    const memberships = await prisma.teamMember.findMany({
      where: { userId },
      select: { teamId: true },
    });
    const teamIds = memberships.map((m) => m.teamId);
    const matches = await prisma.match.findMany({
      where: {
        OR: [{ homeTeamId: { in: teamIds } }, { awayTeamId: { in: teamIds } }],
      },
      include: { homeTeam: true, awayTeam: true },
      orderBy: [{ scheduledAt: 'asc' }, { createdAt: 'desc' }],
    });
    res.json({ matches: matches.map(toMatchView) });
  } catch (err) {
    next(err);
  }
});
