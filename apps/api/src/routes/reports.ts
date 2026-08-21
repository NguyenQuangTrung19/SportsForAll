import { createReportSchema, type ReportView } from '@sfa/shared';
import { Router } from 'express';
import { prisma } from '../lib/db.js';
import { requireAuth } from '../middleware/auth.js';
import { HttpError } from '../middleware/error.js';

export const reportsRouter = Router();

/**
 * Báo cáo một đội vi phạm (FR-005.11).
 *
 * Chỉ ghi nhận — việc xử lý thuộc về admin (FR-010.6). Mỗi người chỉ giữ được
 * một báo cáo đang chờ cho mỗi đội: không chặn thì một người bấm mười lần là
 * hàng đợi của admin ngập một mình họ.
 */
reportsRouter.post('/', requireAuth, async (req, res, next) => {
  try {
    const input = createReportSchema.parse(req.body);
    const reporterId = req.user!.sub;

    const team = await prisma.team.findUnique({
      where: { id: input.reportedTeamId },
      select: { id: true, members: { select: { userId: true } } },
    });
    if (!team) throw new HttpError(404, 'Không tìm thấy đội', 'TEAM_NOT_FOUND');
    if (team.members.some((m) => m.userId === reporterId)) {
      throw new HttpError(400, 'Không thể báo cáo đội của chính bạn', 'SELF_REPORT');
    }

    // Gắn trận thì phải là trận có thật của hai đội, nếu không báo cáo mất căn cứ.
    if (input.matchId) {
      const match = await prisma.match.findUnique({
        where: { id: input.matchId },
        include: {
          homeTeam: { select: { id: true, members: { select: { userId: true } } } },
          awayTeam: { select: { id: true, members: { select: { userId: true } } } },
        },
      });
      if (!match) throw new HttpError(404, 'Không tìm thấy trận', 'MATCH_NOT_FOUND');

      const sides = [match.homeTeam, match.awayTeam];
      if (!sides.some((t) => t.id === team.id)) {
        throw new HttpError(400, 'Đội bị báo cáo không thi đấu trận này', 'TEAM_NOT_IN_MATCH');
      }
      if (!sides.some((t) => t.members.some((m) => m.userId === reporterId))) {
        throw new HttpError(403, 'Bạn không thi đấu trận này', 'NOT_TEAM_MEMBER');
      }
    }

    const pending = await prisma.report.findFirst({
      where: { reporterId, reportedTeamId: team.id, status: 'pending' },
      select: { id: true },
    });
    if (pending) {
      throw new HttpError(409, 'Bạn đã gửi báo cáo đội này và đang chờ xử lý', 'REPORT_PENDING');
    }

    const created = await prisma.report.create({
      data: {
        reporterId,
        reportedTeamId: team.id,
        matchId: input.matchId ?? null,
        reason: input.reason,
        detail: input.detail ?? null,
      },
    });

    const body: ReportView = {
      id: created.id,
      reportedTeamId: created.reportedTeamId,
      matchId: created.matchId,
      reason: created.reason,
      detail: created.detail,
      status: created.status,
      createdAt: created.createdAt.toISOString(),
    };
    res.status(201).json(body);
  } catch (err) {
    next(err);
  }
});
