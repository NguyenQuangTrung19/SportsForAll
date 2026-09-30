import type {
  DashboardResponse,
  IncomingChallengeItem,
  MatchAttendanceSummary,
  NextMatchView,
  PendingJoinRequestItem,
  PendingTeamInviteItem,
  RecruitmentTeamRef,
} from '@sfa/shared';
import type { Team } from '@prisma/client';
import { Router } from 'express';
import { prisma } from '../lib/db.js';
import { canEndMatch, hasBeenPlayed } from '../lib/match-rules.js';
import { requireAuth } from '../middleware/auth.js';

export const dashboardRouter = Router();

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

/**
 * Lời mời vào đội của người xem. Truy vấn này nằm ngoài nhánh "chưa có đội nào"
 * bên dưới: người được mời thường chính là người chưa thuộc đội nào cả.
 */
async function loadTeamInvites(userId: string): Promise<PendingTeamInviteItem[]> {
  const rows = await prisma.teamInvite.findMany({
    where: { status: 'pending', userId },
    // Không cắt trang: mỗi đội chỉ giữ được một lời mời đang chờ cho một người,
    // nên đây là hộp thư cá nhân vài dòng chứ không phải feed.
    orderBy: { createdAt: 'desc' },
    include: { team: true, invitedBy: { select: { displayName: true } } },
  });
  return rows.map((i) => ({
    id: i.id,
    team: teamRef(i.team),
    invitedByName: i.invitedBy.displayName,
    message: i.message,
    createdAt: i.createdAt.toISOString(),
  }));
}

/**
 * Mọi thứ Trang chủ cần mà các endpoint theo tài nguyên chưa trả lời được:
 * trận đã chốt lịch gần nhất, đơn xin vào đội đang chờ, lời thách đấu đang chờ.
 *
 * Gộp một endpoint vì cả ba đều xuất phát từ cùng một danh sách đội của người
 * dùng — tách ra thì cùng một truy vấn membership chạy ba lần.
 */
dashboardRouter.get('/', requireAuth, async (req, res, next) => {
  try {
    const userId = req.user!.sub;

    const [memberships, pendingTeamInvites] = await Promise.all([
      prisma.teamMember.findMany({ where: { userId }, select: { teamId: true, role: true } }),
      loadTeamInvites(userId),
    ]);
    if (memberships.length === 0) {
      res.json({
        nextMatch: null,
        pendingJoinRequests: [],
        incomingChallenges: [],
        pendingTeamInvites,
        actionCount: pendingTeamInvites.length,
      } satisfies DashboardResponse);
      return;
    }

    const teamIds = memberships.map((m) => m.teamId);
    // Chỉ captain/phó mới nhìn thấy đơn và lời thách đấu — trùng với ràng buộc
    // quyền ở chỗ duyệt, nên dashboard không bày ra việc bấm vào sẽ bị 403.
    const managedTeamIds = memberships
      .filter((m) => m.role === 'captain' || m.role === 'co_captain')
      .map((m) => m.teamId);

    // Trận đá trong hôm nay vẫn còn đáng hiện, nên mốc là đầu ngày chứ không phải bây giờ.
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const teamWithMembers = {
      include: { members: { select: { userId: true } } },
    } as const;

    const [matchRow, joinRequests, joinRequestCount, challenges, challengeCount] =
      await Promise.all([
        prisma.match.findFirst({
          where: {
            status: 'scheduled',
            scheduledAt: { gte: startOfToday },
            OR: [{ homeTeamId: { in: teamIds } }, { awayTeamId: { in: teamIds } }],
          },
          orderBy: [{ scheduledAt: 'asc' }],
          include: {
            homeTeam: teamWithMembers,
            awayTeam: teamWithMembers,
            attendances: { select: { userId: true, status: true } },
            ratings: { select: { raterId: true, score: true, comment: true, createdAt: true } },
          },
        }),
        managedTeamIds.length === 0
          ? []
          : prisma.joinRequest.findMany({
              where: { status: 'pending', post: { teamId: { in: managedTeamIds } } },
              orderBy: { createdAt: 'desc' },
              take: 5,
              include: {
                user: {
                  select: {
                    id: true,
                    displayName: true,
                    avatarUrl: true,
                    sportPreferences: { select: { sport: true, skillLevel: true } },
                  },
                },
                post: { include: { team: true } },
              },
            }),
        managedTeamIds.length === 0
          ? 0
          : prisma.joinRequest.count({
              where: { status: 'pending', post: { teamId: { in: managedTeamIds } } },
            }),
        managedTeamIds.length === 0
          ? []
          : prisma.challenge.findMany({
              where: {
                status: 'pending',
                matchRequest: { teamId: { in: managedTeamIds }, status: 'open' },
              },
              orderBy: { createdAt: 'desc' },
              take: 5,
              include: { challengerTeam: true, matchRequest: { include: { team: true } } },
            }),
        managedTeamIds.length === 0
          ? 0
          : prisma.challenge.count({
              where: {
                status: 'pending',
                matchRequest: { teamId: { in: managedTeamIds }, status: 'open' },
              },
            }),
      ]);

    let nextMatch: NextMatchView | null = null;
    if (matchRow) {
      const iAmHome = matchRow.homeTeam.members.some((m) => m.userId === userId);
      const myTeam = iAmHome ? matchRow.homeTeam : matchRow.awayTeam;
      const opponent = iAmHome ? matchRow.awayTeam : matchRow.homeTeam;
      const myRating = matchRow.ratings.find((r) => r.raterId === userId);
      nextMatch = {
        id: matchRow.id,
        matchRequestId: matchRow.matchRequestId,
        homeTeam: teamRef(matchRow.homeTeam),
        awayTeam: teamRef(matchRow.awayTeam),
        sport: matchRow.sport,
        scheduledAt: matchRow.scheduledAt?.toISOString() ?? null,
        venueName: matchRow.venueName,
        status: matchRow.status,
        homeScore: matchRow.homeScore,
        awayScore: matchRow.awayScore,
        createdAt: matchRow.createdAt.toISOString(),
        viewerTeamId: myTeam.id,
        canRate: hasBeenPlayed(matchRow),
        canComplete: managedTeamIds.includes(myTeam.id) && canEndMatch(matchRow),
        viewerRating: myRating
          ? {
              score: myRating.score,
              comment: myRating.comment,
              createdAt: myRating.createdAt.toISOString(),
            }
          : null,
        myTeam: teamRef(myTeam),
        opponent: teamRef(opponent),
        attendance: summarizeAttendance(
          matchRow.attendances,
          myTeam.members.map((m) => m.userId),
          userId,
        ),
      };
    }

    const payload: DashboardResponse = {
      nextMatch,
      pendingJoinRequests: joinRequests.map(
        (r): PendingJoinRequestItem => ({
          id: r.id,
          postId: r.postId,
          applicant: {
            id: r.user.id,
            displayName: r.user.displayName,
            avatarUrl: r.user.avatarUrl,
          },
          team: teamRef(r.post.team),
          positionNeeded: r.post.positionNeeded,
          skillLevel:
            r.user.sportPreferences.find((p) => p.sport === r.post.sport)?.skillLevel ?? null,
          message: r.message,
          createdAt: r.createdAt.toISOString(),
        }),
      ),
      incomingChallenges: challenges.map(
        (c): IncomingChallengeItem => ({
          id: c.id,
          matchRequestId: c.matchRequestId,
          challengerTeam: teamRef(c.challengerTeam),
          myTeam: teamRef(c.matchRequest.team),
          preferredTime: c.matchRequest.preferredTime?.toISOString() ?? null,
          venueName: c.matchRequest.venueName,
          region: c.matchRequest.region,
          message: c.message,
          createdAt: c.createdAt.toISOString(),
        }),
      ),
      pendingTeamInvites,
      actionCount: joinRequestCount + challengeCount + pendingTeamInvites.length,
    };

    res.json(payload);
  } catch (err) {
    next(err);
  }
});

/**
 * "Chưa trả lời" = sĩ số đội trừ số người đã trả lời, nên thêm/bớt thành viên là
 * con số tự đúng. Chỉ đếm câu trả lời của thành viên đội mình — đội đối diện
 * cũng điểm danh trên chính trận này.
 */
export function summarizeAttendance(
  rows: { userId: string; status: 'going' | 'not_going' }[],
  myTeamMemberIds: string[],
  viewerId: string,
): MatchAttendanceSummary {
  const mine = new Set(myTeamMemberIds);
  const ours = rows.filter((r) => mine.has(r.userId));
  const going = ours.filter((r) => r.status === 'going').length;
  const notGoing = ours.length - going;
  return {
    going,
    notGoing,
    pending: Math.max(0, myTeamMemberIds.length - ours.length),
    mine: rows.find((r) => r.userId === viewerId)?.status ?? null,
  };
}
