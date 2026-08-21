import {
  createMatchRequestSchema,
  matchRequestListQuerySchema,
  sendChallengeSchema,
  setAttendanceSchema,
  submitRatingSchema,
  updateMatchRequestSchema,
  type ChallengeView,
  type MatchRequestDetail,
  type MatchRequestListResponse,
  type MatchRequestSummary,
  type MatchView,
  type RatingResult,
  type RecruitmentTeamRef,
  type TimeSlot,
} from '@sfa/shared';
import type {
  Challenge,
  Match,
  MatchRequest,
  Prisma,
  Rating,
  Team,
  TeamMember,
} from '@prisma/client';
import { Router } from 'express';
import { prisma } from '../lib/db.js';
import { hasBeenPlayed } from '../lib/match-rules.js';
import { notify } from '../lib/notify.js';
import { requireAuth } from '../middleware/auth.js';
import { HttpError } from '../middleware/error.js';
import { summarizeAttendance } from './dashboard.js';

export const matchesRouter = Router();

type TeamWithMembers = Team & { members: Pick<TeamMember, 'userId' | 'role'>[] };

type ChallengeWithTeam = Challenge & {
  challengerTeam: TeamWithMembers;
};

type MatchWithContext = Match & {
  homeTeam: TeamWithMembers;
  awayTeam: TeamWithMembers;
  ratings: Pick<Rating, 'raterId' | 'score' | 'comment' | 'createdAt'>[];
};

type MatchRequestWithRelations = MatchRequest & {
  team: TeamWithMembers;
  challenges: ChallengeWithTeam[];
  match: MatchWithContext | null;
};

const MATCH_INCLUDE = {
  homeTeam: { include: { members: { select: { userId: true, role: true } } } },
  awayTeam: { include: { members: { select: { userId: true, role: true } } } },
  ratings: { select: { raterId: true, score: true, comment: true, createdAt: true } },
} satisfies Prisma.MatchInclude;

/**
 * Buổi trong ngày theo giờ Việt Nam (FR-005.5). `preferredTime` lưu theo UTC nên
 * phải cộng bù trước khi cắt khung; Prisma không lọc được theo giờ-trong-ngày
 * nên kết quả được lưu thành cột để bộ lọc dùng chỉ mục thay vì quét bảng.
 */
const VN_OFFSET_HOURS = 7;

function timeSlotOf(at: Date | null): TimeSlot | null {
  if (!at) return null;
  const hour = new Date(at.getTime() + VN_OFFSET_HOURS * 3_600_000).getUTCHours();
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 18) return 'afternoon';
  return 'evening';
}

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

function toMatchView(m: MatchWithContext, viewerId: string): MatchView {
  // Người xem về lý thuyết có thể ở cả hai đội; coi như thuộc đội nhà để không
  // rơi vào trạng thái chấm chính mình.
  const viewerTeamId = m.homeTeam.members.some((x) => x.userId === viewerId)
    ? m.homeTeamId
    : m.awayTeam.members.some((x) => x.userId === viewerId)
      ? m.awayTeamId
      : null;
  const mine = m.ratings.find((r) => r.raterId === viewerId);
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
    viewerTeamId,
    canRate: viewerTeamId !== null && hasBeenPlayed(m),
    viewerRating: mine
      ? { score: mine.score, comment: mine.comment, createdAt: mine.createdAt.toISOString() }
      : null,
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
    timeSlot: req.timeSlot,
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
    : req.challenges.filter((c) => c.challengerTeam.members.some((m) => m.userId === viewerId));
  return {
    ...toSummary(req, viewerId),
    challenges: visible
      .slice()
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .map((c) => toChallengeView(c, viewerId)),
    match: req.match ? toMatchView(req.match, viewerId) : null,
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
  match: { include: MATCH_INCLUDE },
} satisfies Prisma.MatchRequestInclude;

async function loadRequest(id: string): Promise<MatchRequestWithRelations> {
  const r = await prisma.matchRequest.findUnique({
    where: { id },
    include: REQUEST_INCLUDE,
  });
  if (!r) throw new HttpError(404, 'Không tìm thấy lời mời', 'REQUEST_NOT_FOUND');
  return r;
}

function ensureTeamManager(team: TeamWithMembers, userId: string): void {
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

    const preferredTime = input.preferredTime ? new Date(input.preferredTime) : null;
    const created = await prisma.matchRequest.create({
      data: {
        teamId: team.id,
        sport: team.sport,
        region: input.region ?? team.region,
        preferredTime,
        timeSlot: timeSlotOf(preferredTime),
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
      ...(q.reputationMin !== undefined && { team: { reputation: { gte: q.reputationMin } } }),
      ...(q.venue && { venueName: { contains: q.venue, mode: 'insensitive' } }),
      ...(q.timeSlot && { timeSlot: q.timeSlot }),
      ...(q.status ? { status: q.status } : { status: 'open' }),
      ...(q.teamId && { teamId: q.teamId }),
    };

    const orderBy: Prisma.MatchRequestOrderByWithRelationInput[] =
      q.sort === 'reputation'
        ? [{ team: { reputation: 'desc' } }, { createdAt: 'desc' }, { id: 'desc' }]
        : [{ createdAt: 'desc' }, { id: 'desc' }];

    const items = await prisma.matchRequest.findMany({
      where,
      include: REQUEST_INCLUDE,
      orderBy,
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
        // Buổi luôn suy ra từ giờ hẹn, nên đổi giờ là phải cập nhật kèm.
        ...(input.preferredTime !== undefined && {
          preferredTime: input.preferredTime ? new Date(input.preferredTime) : null,
          timeSlot: timeSlotOf(input.preferredTime ? new Date(input.preferredTime) : null),
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
      where: {
        matchRequestId_challengerTeamId: { matchRequestId: r.id, challengerTeamId: challenger.id },
      },
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
      include: MATCH_INCLUDE,
      orderBy: [{ scheduledAt: 'asc' }, { createdAt: 'desc' }],
    });
    res.json({ matches: matches.map((m) => toMatchView(m, userId)) });
  } catch (err) {
    next(err);
  }
});

/**
 * Báo có mặt cho một trận đã chốt lịch.
 *
 * Một dòng cho mỗi lần trả lời, đổi ý thì ghi đè — không lưu "chưa trả lời"
 * thành dòng riêng, vì sĩ số đội thay đổi được còn dòng đã ghi thì không.
 */
matchesRouter.post('/:id/attendance', requireAuth, async (req, res, next) => {
  try {
    const { status } = setAttendanceSchema.parse(req.body);
    const userId = req.user!.sub;
    const matchId = String(req.params.id);

    const match = await prisma.match.findUnique({
      where: { id: matchId },
      include: {
        homeTeam: { include: { members: { select: { userId: true } } } },
        awayTeam: { include: { members: { select: { userId: true } } } },
        attendances: { select: { userId: true, status: true } },
      },
    });
    if (!match) throw new HttpError(404, 'Không tìm thấy trận', 'MATCH_NOT_FOUND');
    if (match.status !== 'scheduled') {
      throw new HttpError(400, 'Trận đã kết thúc hoặc bị huỷ', 'MATCH_NOT_SCHEDULED');
    }

    const iAmHome = match.homeTeam.members.some((m) => m.userId === userId);
    const iAmAway = match.awayTeam.members.some((m) => m.userId === userId);
    if (!iAmHome && !iAmAway) {
      throw new HttpError(403, 'Chỉ thành viên hai đội mới được báo có mặt', 'NOT_TEAM_MEMBER');
    }

    await prisma.matchAttendance.upsert({
      where: { matchId_userId: { matchId, userId } },
      create: { matchId, userId, status },
      update: { status },
    });

    const myTeam = iAmHome ? match.homeTeam : match.awayTeam;
    // Dòng vừa ghi chưa có trong `match.attendances` (đọc trước khi ghi) nên
    // ghép tay vào thay vì đọc lại cả trận.
    const rows = [...match.attendances.filter((a) => a.userId !== userId), { userId, status }];
    res.json(
      summarizeAttendance(
        rows,
        myTeam.members.map((m) => m.userId),
        userId,
      ),
    );
  } catch (err) {
    next(err);
  }
});

/**
 * Chấm uy tín đối thủ sau trận (FR-005.10).
 *
 * Một phiếu cho mỗi người trên mỗi trận, đổi ý thì ghi đè — vì thế điểm đội là
 * trung bình các phiếu, không phải tổng, và không ai bơm điểm được bằng cách
 * gửi nhiều lần. Điểm trung bình ghi thẳng vào `Team.reputation` để danh sách
 * lọc/sắp xếp theo uy tín (FR-005.2, FR-004.7) không phải tính lại mỗi lần đọc.
 */
matchesRouter.post('/:id/rating', requireAuth, async (req, res, next) => {
  try {
    const { score, comment } = submitRatingSchema.parse(req.body);
    const userId = req.user!.sub;
    const matchId = String(req.params.id);

    const match = await prisma.match.findUnique({
      where: { id: matchId },
      include: MATCH_INCLUDE,
    });
    if (!match) throw new HttpError(404, 'Không tìm thấy trận', 'MATCH_NOT_FOUND');

    const inHome = match.homeTeam.members.some((m) => m.userId === userId);
    const inAway = match.awayTeam.members.some((m) => m.userId === userId);
    if (!inHome && !inAway) {
      throw new HttpError(403, 'Chỉ thành viên hai đội mới được đánh giá', 'NOT_TEAM_MEMBER');
    }
    if (match.status === 'cancelled') {
      throw new HttpError(400, 'Trận đã huỷ', 'MATCH_CANCELLED');
    }
    if (!hasBeenPlayed(match)) {
      throw new HttpError(400, 'Chỉ đánh giá được sau khi trận diễn ra', 'MATCH_NOT_PLAYED');
    }

    const myTeam = inHome ? match.homeTeam : match.awayTeam;
    const ratedTeam = inHome ? match.awayTeam : match.homeTeam;
    const isFirstTime = !match.ratings.some((r) => r.raterId === userId);

    const { rating, reputation } = await prisma.$transaction(async (tx) => {
      const saved = await tx.rating.upsert({
        where: { matchId_raterId: { matchId, raterId: userId } },
        create: {
          matchId,
          raterId: userId,
          ratedTeamId: ratedTeam.id,
          score,
          comment: comment ?? null,
        },
        update: { score, comment: comment ?? null },
      });
      const agg = await tx.rating.aggregate({
        where: { ratedTeamId: ratedTeam.id },
        _avg: { score: true },
      });
      const avg = agg._avg.score ?? 0;
      await tx.team.update({ where: { id: ratedTeam.id }, data: { reputation: avg } });

      // Chỉ báo lần chấm đầu — sửa điểm không đáng làm phiền đối thủ thêm lần nữa.
      if (isFirstTime) {
        await notify(tx, {
          userIds: ratedTeam.members
            .filter((m) => m.role === 'captain' || m.role === 'co_captain')
            .map((m) => m.userId),
          type: 'rating_received',
          title: `${myTeam.name} đã đánh giá đội bạn`,
          message: comment ?? `${score}/5 sao`,
          link: match.matchRequestId
            ? `/match-requests/${match.matchRequestId}`
            : `/teams/${ratedTeam.id}`,
        });
      }
      return { rating: saved, reputation: avg };
    });

    const body: RatingResult = {
      rating: {
        score: rating.score,
        comment: rating.comment,
        createdAt: rating.createdAt.toISOString(),
      },
      ratedTeamId: ratedTeam.id,
      ratedTeamReputation: reputation,
    };
    res.status(isFirstTime ? 201 : 200).json(body);
  } catch (err) {
    next(err);
  }
});
