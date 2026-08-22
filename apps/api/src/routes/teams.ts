import {
  addMemberSchema,
  createTeamInviteSchema,
  createTeamSchema,
  updateMemberRoleSchema,
  updateTeamSchema,
  type TeamDetail,
  type TeamInviteView,
  type TeamMemberView,
  type TeamRole,
  type TeamSummary,
} from '@sfa/shared';
import type { Prisma, Team, TeamInvite, TeamMember, User } from '@prisma/client';
import { Router } from 'express';
import { prisma } from '../lib/db.js';
import { notify } from '../lib/notify.js';
import { requireAuth } from '../middleware/auth.js';
import { HttpError } from '../middleware/error.js';

export const teamsRouter = Router();

const USER_BRIEF = { id: true, displayName: true, avatarUrl: true } as const;

/**
 * Lời mời đang chờ đi kèm đội luôn: trang đội cần hiện chúng, và số bản ghi
 * chờ của một đội luôn nhỏ nên không đáng tách thành lượt gọi riêng.
 */
const TEAM_INCLUDE = {
  members: { include: { user: { select: USER_BRIEF } } },
  invites: {
    where: { status: 'pending' },
    include: { user: { select: USER_BRIEF } },
    orderBy: { createdAt: 'desc' },
  },
} satisfies Prisma.TeamInclude;

type TeamMemberWithUser = TeamMember & { user: Pick<User, 'id' | 'displayName' | 'avatarUrl'> };
type TeamWithMembers = Prisma.TeamGetPayload<{ include: typeof TEAM_INCLUDE }>;

function toInviteView(i: TeamInvite & { user: Pick<User, 'displayName' | 'avatarUrl'> }): TeamInviteView {
  return {
    id: i.id,
    userId: i.userId,
    displayName: i.user.displayName,
    avatarUrl: i.user.avatarUrl,
    status: i.status,
    message: i.message,
    createdAt: i.createdAt.toISOString(),
    decidedAt: i.decidedAt?.toISOString() ?? null,
  };
}

function toMemberView(m: TeamMemberWithUser): TeamMemberView {
  return {
    userId: m.user.id,
    displayName: m.user.displayName,
    avatarUrl: m.user.avatarUrl,
    role: m.role,
    joinedAt: m.joinedAt.toISOString(),
  };
}

function toSummary(
  team: Team & { members: Pick<TeamMember, 'userId' | 'role'>[] },
  viewerUserId: string,
): TeamSummary {
  const viewer = team.members.find((m) => m.userId === viewerUserId);
  return {
    id: team.id,
    name: team.name,
    sport: team.sport,
    region: team.region,
    skillLevel: team.skillLevel,
    logoUrl: team.logoUrl,
    description: team.description,
    reputation: team.reputation,
    memberCount: team.members.length,
    viewerRole: viewer?.role ?? null,
    createdAt: team.createdAt.toISOString(),
  };
}

function toDetail(team: TeamWithMembers, viewerUserId: string): TeamDetail {
  const viewerRole = team.members.find((m) => m.userId === viewerUserId)?.role;
  const canSeeInvites = viewerRole === 'captain' || viewerRole === 'co_captain';
  return {
    ...toSummary(team, viewerUserId),
    pendingInvites: canSeeInvites ? team.invites.map(toInviteView) : [],
    members: team.members
      .slice()
      .sort(
        (a, b) =>
          roleWeight(a.role) - roleWeight(b.role) || a.joinedAt.getTime() - b.joinedAt.getTime(),
      )
      .map(toMemberView),
  };
}

function roleWeight(role: TeamRole): number {
  if (role === 'captain') return 0;
  if (role === 'co_captain') return 1;
  return 2;
}

async function loadTeamOrFail(teamId: string): Promise<TeamWithMembers> {
  const team = await prisma.team.findUnique({ where: { id: teamId }, include: TEAM_INCLUDE });
  if (!team) throw new HttpError(404, 'Không tìm thấy đội', 'TEAM_NOT_FOUND');
  return team;
}

function requireRole(team: TeamWithMembers, userId: string, allowed: TeamRole[]): TeamRole {
  const member = team.members.find((m) => m.userId === userId);
  if (!member) throw new HttpError(403, 'Bạn không thuộc đội này', 'NOT_TEAM_MEMBER');
  if (!allowed.includes(member.role)) {
    throw new HttpError(403, 'Bạn không có quyền thao tác này', 'INSUFFICIENT_TEAM_ROLE');
  }
  return member.role;
}

teamsRouter.post('/', requireAuth, async (req, res, next) => {
  try {
    const input = createTeamSchema.parse(req.body);
    const userId = req.user!.sub;

    const created = await prisma.$transaction(async (tx) => {
      const team = await tx.team.create({
        data: {
          name: input.name,
          sport: input.sport,
          region: input.region ?? null,
          description: input.description ?? null,
          logoUrl: input.logoUrl ?? null,
          skillLevel: input.skillLevel ?? null,
        },
      });
      await tx.teamMember.create({
        data: { teamId: team.id, userId, role: 'captain' },
      });
      return tx.team.findUniqueOrThrow({ where: { id: team.id }, include: TEAM_INCLUDE });
    });

    res.status(201).json(toDetail(created, userId));
  } catch (err) {
    next(err);
  }
});

teamsRouter.get('/me', requireAuth, async (req, res, next) => {
  try {
    const userId = req.user!.sub;
    const memberships = await prisma.teamMember.findMany({
      where: { userId },
      orderBy: { joinedAt: 'desc' },
      include: {
        team: {
          include: {
            members: {
              include: { user: { select: { id: true, displayName: true, avatarUrl: true } } },
            },
          },
        },
      },
    });
    const summaries = memberships.map((m) => toSummary(m.team, userId));
    res.json({ teams: summaries });
  } catch (err) {
    next(err);
  }
});

teamsRouter.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const team = await loadTeamOrFail(String(req.params.id));
    res.json(toDetail(team, req.user!.sub));
  } catch (err) {
    next(err);
  }
});

teamsRouter.put('/:id', requireAuth, async (req, res, next) => {
  try {
    const input = updateTeamSchema.parse(req.body);
    const team = await loadTeamOrFail(String(req.params.id));
    requireRole(team, req.user!.sub, ['captain', 'co_captain']);

    await prisma.team.update({
      where: { id: team.id },
      data: {
        ...(input.name !== undefined && { name: input.name }),
        ...(input.region !== undefined && { region: input.region }),
        ...(input.description !== undefined && { description: input.description }),
        ...(input.logoUrl !== undefined && { logoUrl: input.logoUrl }),
        ...(input.skillLevel !== undefined && { skillLevel: input.skillLevel }),
      },
    });

    const refreshed = await loadTeamOrFail(team.id);
    res.json(toDetail(refreshed, req.user!.sub));
  } catch (err) {
    next(err);
  }
});

teamsRouter.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    const team = await loadTeamOrFail(String(req.params.id));
    requireRole(team, req.user!.sub, ['captain']);
    await prisma.team.delete({ where: { id: team.id } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

teamsRouter.post('/:id/members', requireAuth, async (req, res, next) => {
  try {
    const input = addMemberSchema.parse(req.body);
    const team = await loadTeamOrFail(String(req.params.id));
    requireRole(team, req.user!.sub, ['captain', 'co_captain']);

    if (input.role === 'captain') {
      throw new HttpError(
        400,
        'Không thể gán captain trực tiếp — dùng đổi vai trò',
        'CAPTAIN_NOT_ASSIGNABLE',
      );
    }

    const target = await prisma.user.findFirst({
      where: input.userId ? { id: input.userId } : { email: input.email!.toLowerCase() },
      select: { id: true },
    });
    if (!target) throw new HttpError(404, 'Không tìm thấy người dùng', 'USER_NOT_FOUND');

    if (team.members.some((m) => m.userId === target.id)) {
      throw new HttpError(409, 'Người dùng đã ở trong đội', 'ALREADY_MEMBER');
    }

    await prisma.teamMember.create({
      data: { teamId: team.id, userId: target.id, role: input.role },
    });

    const refreshed = await loadTeamOrFail(team.id);
    res.status(201).json(toDetail(refreshed, req.user!.sub));
  } catch (err) {
    next(err);
  }
});

teamsRouter.patch('/:id/members/:userId', requireAuth, async (req, res, next) => {
  try {
    const input = updateMemberRoleSchema.parse(req.body);
    const team = await loadTeamOrFail(String(req.params.id));
    const viewerId = req.user!.sub;
    requireRole(team, viewerId, ['captain']);

    const targetId = String(req.params.userId);
    const targetMember = team.members.find((m) => m.userId === targetId);
    if (!targetMember) throw new HttpError(404, 'Thành viên không tồn tại', 'MEMBER_NOT_FOUND');

    // Transfer captain — atomic: viewer captain → demote to co_captain, target → captain
    if (input.role === 'captain') {
      if (targetId === viewerId) {
        throw new HttpError(400, 'Bạn đã là captain', 'NO_OP');
      }
      await prisma.$transaction([
        prisma.teamMember.update({
          where: { teamId_userId: { teamId: team.id, userId: viewerId } },
          data: { role: 'co_captain' },
        }),
        prisma.teamMember.update({
          where: { teamId_userId: { teamId: team.id, userId: targetId } },
          data: { role: 'captain' },
        }),
      ]);
    } else {
      if (targetMember.role === 'captain') {
        throw new HttpError(400, 'Không thể tự hạ vai trò captain', 'CANNOT_DEMOTE_SELF');
      }
      await prisma.teamMember.update({
        where: { teamId_userId: { teamId: team.id, userId: targetId } },
        data: { role: input.role },
      });
    }

    const refreshed = await loadTeamOrFail(team.id);
    res.json(toDetail(refreshed, viewerId));
  } catch (err) {
    next(err);
  }
});

teamsRouter.delete('/:id/members/:userId', requireAuth, async (req, res, next) => {
  try {
    const team = await loadTeamOrFail(String(req.params.id));
    const viewerId = req.user!.sub;
    const targetId = String(req.params.userId);
    const viewer = team.members.find((m) => m.userId === viewerId);
    if (!viewer) throw new HttpError(403, 'Bạn không thuộc đội này', 'NOT_TEAM_MEMBER');

    const target = team.members.find((m) => m.userId === targetId);
    if (!target) throw new HttpError(404, 'Thành viên không tồn tại', 'MEMBER_NOT_FOUND');

    // Self-leave or captain/co_captain kick
    const isSelf = viewerId === targetId;
    const canManage = viewer.role === 'captain' || viewer.role === 'co_captain';
    if (!isSelf && !canManage) {
      throw new HttpError(403, 'Bạn không có quyền xoá thành viên khác', 'INSUFFICIENT_TEAM_ROLE');
    }
    if (target.role === 'captain') {
      throw new HttpError(
        400,
        'Captain phải chuyển quyền cho người khác trước khi rời',
        'CAPTAIN_MUST_TRANSFER',
      );
    }
    // co_captain can only be kicked by captain
    if (target.role === 'co_captain' && !isSelf && viewer.role !== 'captain') {
      throw new HttpError(403, 'Chỉ captain mới có thể xoá phó đội', 'INSUFFICIENT_TEAM_ROLE');
    }

    await prisma.teamMember.delete({
      where: { teamId_userId: { teamId: team.id, userId: targetId } },
    });

    if (isSelf) {
      res.status(204).send();
      return;
    }
    const refreshed = await loadTeamOrFail(team.id);
    res.json(toDetail(refreshed, viewerId));
  } catch (err) {
    next(err);
  }
});

/* -------------------------------------------------------------------------- */
/* Lời mời vào đội (FR-006.8) — chiều ngược lại của đơn xin gia nhập           */
/* -------------------------------------------------------------------------- */

/** Captain/phó của đội mời một người chơi. Người được mời phải tự đồng ý mới vào đội. */
teamsRouter.post('/:id/invites', requireAuth, async (req, res, next) => {
  try {
    const input = createTeamInviteSchema.parse(req.body);
    const team = await loadTeamOrFail(String(req.params.id));
    const viewerId = req.user!.sub;
    requireRole(team, viewerId, ['captain', 'co_captain']);

    if (team.members.some((m) => m.userId === input.userId)) {
      throw new HttpError(409, 'Người này đã ở trong đội', 'ALREADY_MEMBER');
    }
    const target = await prisma.user.findUnique({
      where: { id: input.userId },
      select: { id: true },
    });
    if (!target) throw new HttpError(404, 'Không tìm thấy người dùng', 'USER_NOT_FOUND');
    if (team.invites.some((i) => i.userId === target.id)) {
      throw new HttpError(409, 'Đã có lời mời đang chờ người này trả lời', 'ALREADY_INVITED');
    }

    // upsert chứ không create: `@@unique([teamId, userId])` giữ đúng một bản ghi
    // cho mỗi cặp, nên mời lại sau khi bị từ chối là làm mới chính bản ghi cũ.
    await prisma.teamInvite.upsert({
      where: { teamId_userId: { teamId: team.id, userId: target.id } },
      create: {
        teamId: team.id,
        userId: target.id,
        invitedById: viewerId,
        message: input.message ?? null,
      },
      update: {
        status: 'pending',
        invitedById: viewerId,
        message: input.message ?? null,
        decidedAt: null,
        createdAt: new Date(),
      },
    });

    await notify(prisma, {
      userIds: [target.id],
      type: 'team_invite_received',
      title: `${team.name} mời bạn gia nhập`,
      message: input.message ?? null,
      link: `/teams/${team.id}`,
    });

    const refreshed = await loadTeamOrFail(team.id);
    res.status(201).json(toDetail(refreshed, viewerId));
  } catch (err) {
    next(err);
  }
});

/** Lời mời kèm đội và danh sách quản lý — dùng chung cho cả ba thao tác bên dưới. */
async function loadInviteOrFail(inviteId: string) {
  const invite = await prisma.teamInvite.findUnique({
    where: { id: inviteId },
    include: { team: { include: { members: { select: { userId: true, role: true } } } } },
  });
  if (!invite) throw new HttpError(404, 'Không tìm thấy lời mời', 'INVITE_NOT_FOUND');
  if (invite.status !== 'pending') {
    throw new HttpError(400, 'Lời mời không còn ở trạng thái chờ', 'INVITE_NOT_PENDING');
  }
  return invite;
}

function managerIdsOf(members: Pick<TeamMember, 'userId' | 'role'>[]): string[] {
  return members.filter((m) => m.role !== 'member').map((m) => m.userId);
}

teamsRouter.post('/invites/:inviteId/accept', requireAuth, async (req, res, next) => {
  try {
    const invite = await loadInviteOrFail(String(req.params.inviteId));
    const viewerId = req.user!.sub;
    if (invite.userId !== viewerId) {
      throw new HttpError(403, 'Lời mời này không dành cho bạn', 'FORBIDDEN');
    }

    const me = await prisma.user.findUnique({
      where: { id: viewerId },
      select: { displayName: true },
    });

    await prisma.$transaction(async (tx) => {
      await tx.teamInvite.update({
        where: { id: invite.id },
        data: { status: 'accepted', decidedAt: new Date() },
      });
      // Có thể người này vừa được thêm thẳng bằng email trong lúc lời mời còn treo.
      const existing = await tx.teamMember.findUnique({
        where: { teamId_userId: { teamId: invite.teamId, userId: viewerId } },
      });
      if (!existing) {
        await tx.teamMember.create({
          data: { teamId: invite.teamId, userId: viewerId, role: 'member' },
        });
      }
      await notify(tx, {
        userIds: managerIdsOf(invite.team.members),
        type: 'team_invite_accepted',
        title: `${me?.displayName ?? 'Người chơi'} đã nhận lời mời vào ${invite.team.name}`,
        link: `/teams/${invite.teamId}`,
      });
    });

    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

teamsRouter.post('/invites/:inviteId/reject', requireAuth, async (req, res, next) => {
  try {
    const invite = await loadInviteOrFail(String(req.params.inviteId));
    const viewerId = req.user!.sub;
    if (invite.userId !== viewerId) {
      throw new HttpError(403, 'Lời mời này không dành cho bạn', 'FORBIDDEN');
    }

    const me = await prisma.user.findUnique({
      where: { id: viewerId },
      select: { displayName: true },
    });

    await prisma.teamInvite.update({
      where: { id: invite.id },
      data: { status: 'rejected', decidedAt: new Date() },
    });
    await notify(prisma, {
      userIds: managerIdsOf(invite.team.members),
      type: 'team_invite_rejected',
      title: `${me?.displayName ?? 'Người chơi'} đã từ chối lời mời vào ${invite.team.name}`,
      link: `/teams/${invite.teamId}`,
    });

    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

/** Đội rút lại lời mời gửi nhầm. Không báo cho người được mời — chưa có gì để báo. */
teamsRouter.post('/invites/:inviteId/cancel', requireAuth, async (req, res, next) => {
  try {
    const invite = await loadInviteOrFail(String(req.params.inviteId));
    const viewerId = req.user!.sub;
    if (!managerIdsOf(invite.team.members).includes(viewerId)) {
      throw new HttpError(403, 'Chỉ captain/phó đội mới rút được lời mời', 'INSUFFICIENT_TEAM_ROLE');
    }

    await prisma.teamInvite.update({
      where: { id: invite.id },
      data: { status: 'cancelled', decidedAt: new Date() },
    });

    const refreshed = await loadTeamOrFail(invite.teamId);
    res.json(toDetail(refreshed, viewerId));
  } catch (err) {
    next(err);
  }
});
