import {
  adminDisableUserSchema,
  adminLogListQuerySchema,
  adminPostListQuerySchema,
  adminReportListQuerySchema,
  adminResolveReportSchema,
  adminSuspendVenueSchema,
  adminUpdateUserSchema,
  adminUserListQuerySchema,
  adminVenueListQuerySchema,
  type AdminLogListResponse,
  type AdminPostItem,
  type AdminPostKind,
  type AdminPostListResponse,
  type AdminReportItem,
  type AdminReportListResponse,
  type AdminStats,
  type AdminUserItem,
  type AdminUserListResponse,
  type AdminVenueItem,
  type AdminVenueListResponse,
} from '@sfa/shared';
import type { Prisma } from '@prisma/client';
import { Router } from 'express';
import { prisma } from '../lib/db.js';
import { cursorArgs, paginate } from '../lib/paginate.js';
import { requireAuth } from '../middleware/auth.js';
import { HttpError } from '../middleware/error.js';
import { requireRole } from '../middleware/role.js';

export const adminRouter = Router();

/**
 * Mọi thứ dưới đây chỉ dành cho admin. `requireRole` đọc vai trò từ CSDL chứ
 * không tin vai trò nằm trong access token — người vừa bị hạ quyền không dùng
 * được token cũ để vào đây.
 */
adminRouter.use(requireAuth, requireRole('admin'));

/**
 * Ghi nhật ký một thao tác quản trị (FR-010.8).
 *
 * Chỉ gọi sau khi thao tác đã thành công: log một việc chưa xảy ra còn tệ hơn
 * là không log. Tên admin được chụp lại vào chính bản ghi chứ không phải khoá
 * ngoại — xoá tài khoản admin không được phép xoá mất dấu vết họ đã làm gì.
 */
async function logAdmin(
  admin: { id: string; displayName: string },
  action: string,
  targetType: string,
  targetId: string,
  detail?: string | null,
): Promise<void> {
  await prisma.adminAction.create({
    data: {
      adminId: admin.id,
      adminName: admin.displayName,
      action,
      targetType,
      targetId,
      detail: detail ?? null,
    },
  });
}

async function actor(userId: string): Promise<{ id: string; displayName: string }> {
  const me = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, displayName: true },
  });
  if (!me) throw new HttpError(401, 'Tài khoản không tồn tại', 'USER_NOT_FOUND');
  return me;
}

/* -------------------------------------------------------------------------- */
/* FR-010.1 — Thống kê tổng quan                                              */
/* -------------------------------------------------------------------------- */

adminRouter.get('/stats', async (_req, res, next) => {
  try {
    const weekAgo = new Date(Date.now() - 7 * 86_400_000);
    const [
      users,
      usersNewLast7Days,
      usersDisabled,
      teams,
      matchesScheduled,
      matchesCompleted,
      recruitmentPostsOpen,
      matchRequestsOpen,
      lookingForPostsOpen,
      reportsPending,
      sportsActive,
      venuesActive,
      venuesSuspended,
      bookingsPending,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { createdAt: { gte: weekAgo } } }),
      prisma.user.count({ where: { disabledAt: { not: null } } }),
      prisma.team.count(),
      prisma.match.count({ where: { status: 'scheduled' } }),
      prisma.match.count({ where: { status: 'completed' } }),
      prisma.recruitmentPost.count({ where: { status: 'open' } }),
      prisma.matchRequest.count({ where: { status: 'open' } }),
      prisma.lookingForTeamPost.count({ where: { status: 'open' } }),
      prisma.report.count({ where: { status: 'pending' } }),
      prisma.sport.count({ where: { active: true } }),
      prisma.venue.count({ where: { status: 'active' } }),
      prisma.venue.count({ where: { status: 'suspended' } }),
      prisma.booking.count({ where: { status: 'pending' } }),
    ]);

    const body: AdminStats = {
      users,
      usersNewLast7Days,
      usersDisabled,
      teams,
      matchesScheduled,
      matchesCompleted,
      recruitmentPostsOpen,
      matchRequestsOpen,
      lookingForPostsOpen,
      reportsPending,
      sportsActive,
      venuesActive,
      venuesSuspended,
      bookingsPending,
    };
    res.json(body);
  } catch (err) {
    next(err);
  }
});

/* -------------------------------------------------------------------------- */
/* FR-010.2 + FR-010.7 — Người dùng                                           */
/* -------------------------------------------------------------------------- */

const USER_LIST_INCLUDE = {
  teamMemberships: { select: { role: true, team: { select: { name: true } } } },
} satisfies Prisma.UserInclude;

type UserRow = Prisma.UserGetPayload<{ include: typeof USER_LIST_INCLUDE }>;

function toUserItem(u: UserRow): AdminUserItem {
  return {
    id: u.id,
    email: u.email,
    displayName: u.displayName,
    avatarUrl: u.avatarUrl,
    role: u.role,
    region: u.region,
    reputation: u.reputation,
    emailVerified: u.emailVerified,
    onboardedAt: u.onboardedAt?.toISOString() ?? null,
    disabledAt: u.disabledAt?.toISOString() ?? null,
    createdAt: u.createdAt.toISOString(),
    teamCount: u.teamMemberships.length,
    captainOf: u.teamMemberships.filter((m) => m.role === 'captain').map((m) => m.team.name),
  };
}

adminRouter.get('/users', async (req, res, next) => {
  try {
    const q = adminUserListQuerySchema.parse(req.query);
    const where: Prisma.UserWhereInput = {
      ...(q.role && { role: q.role }),
      ...(q.status === 'disabled' && { disabledAt: { not: null } }),
      ...(q.status === 'active' && { disabledAt: null }),
      ...(q.q && {
        OR: [
          { email: { contains: q.q, mode: 'insensitive' } },
          { displayName: { contains: q.q, mode: 'insensitive' } },
        ],
      }),
    };

    const rows = await prisma.user.findMany({
      where,
      include: USER_LIST_INCLUDE,
      // id chốt cuối để thứ tự luôn toàn phần — thiếu nó thì phân trang theo
      // cursor có thể bỏ sót bản ghi khi hai người đăng ký cùng một thời điểm.
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      ...cursorArgs(q.limit, q.cursor),
    });

    const { items, nextCursor } = paginate(rows, q.limit);
    const body: AdminUserListResponse = { items: items.map(toUserItem), nextCursor };
    res.json(body);
  } catch (err) {
    next(err);
  }
});

/**
 * Nạp người dùng đích và chặn admin thao tác lên chính mình — tự hạ quyền hoặc
 * tự khoá là cách nhanh nhất để hệ thống không còn admin nào vào được nữa.
 */
async function loadTargetUser(id: string, viewerId: string): Promise<UserRow> {
  const user = await prisma.user.findUnique({ where: { id }, include: USER_LIST_INCLUDE });
  if (!user) throw new HttpError(404, 'Không tìm thấy người dùng', 'USER_NOT_FOUND');
  if (user.id === viewerId) {
    throw new HttpError(400, 'Không thao tác được lên chính tài khoản của bạn', 'SELF_TARGET');
  }
  return user;
}

adminRouter.patch('/users/:id', async (req, res, next) => {
  try {
    const input = adminUpdateUserSchema.parse(req.body);
    const me = await actor(req.user!.sub);
    const target = await loadTargetUser(String(req.params.id), me.id);

    const updated = await prisma.user.update({
      where: { id: target.id },
      data: {
        ...(input.role !== undefined && { role: input.role }),
        ...(input.displayName !== undefined && { displayName: input.displayName }),
      },
      include: USER_LIST_INCLUDE,
    });

    if (input.role !== undefined && input.role !== target.role) {
      await logAdmin(me, 'user.role', 'user', target.id, `${target.role} → ${input.role}`);
    }
    if (input.displayName !== undefined && input.displayName !== target.displayName) {
      await logAdmin(
        me,
        'user.rename',
        'user',
        target.id,
        `${target.displayName} → ${input.displayName}`,
      );
    }

    res.json(toUserItem(updated));
  } catch (err) {
    next(err);
  }
});

/**
 * Khoá tài khoản (FR-010.7).
 *
 * Thu hồi toàn bộ refresh token ngay, nên phiên đang mở chết khi access token
 * hết hạn. ponytail: access token sống 15 phút và `requireAuth` không đọc CSDL,
 * nên người bị khoá còn dùng được tối đa 15 phút. Muốn cắt tức thì phải thêm một
 * lượt đọc CSDL vào `requireAuth` — đổi lấy một truy vấn cho mọi request.
 */
adminRouter.post('/users/:id/disable', async (req, res, next) => {
  try {
    const input = adminDisableUserSchema.parse(req.body);
    const me = await actor(req.user!.sub);
    const target = await loadTargetUser(String(req.params.id), me.id);
    if (target.disabledAt) {
      throw new HttpError(400, 'Tài khoản này đã bị khoá', 'ALREADY_DISABLED');
    }

    const [updated] = await prisma.$transaction([
      prisma.user.update({
        where: { id: target.id },
        data: { disabledAt: new Date() },
        include: USER_LIST_INCLUDE,
      }),
      prisma.refreshToken.updateMany({
        where: { userId: target.id, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);

    await logAdmin(
      me,
      'user.disable',
      'user',
      target.id,
      input.reason ?? target.email ?? target.phone ?? target.id,
    );
    res.json(toUserItem(updated));
  } catch (err) {
    next(err);
  }
});

adminRouter.post('/users/:id/enable', async (req, res, next) => {
  try {
    const me = await actor(req.user!.sub);
    const target = await loadTargetUser(String(req.params.id), me.id);
    if (!target.disabledAt) {
      throw new HttpError(400, 'Tài khoản này không bị khoá', 'NOT_DISABLED');
    }

    const updated = await prisma.user.update({
      where: { id: target.id },
      data: { disabledAt: null },
      include: USER_LIST_INCLUDE,
    });

    await logAdmin(me, 'user.enable', 'user', target.id, target.email ?? target.phone ?? target.id);
    res.json(toUserItem(updated));
  } catch (err) {
    next(err);
  }
});

/**
 * Xoá hẳn tài khoản. Từ chối nếu người này còn làm captain đội nào — đội mất
 * captain là đội không ai sửa được nữa, đúng ràng buộc đã có lúc captain tự rời
 * đội. Khoá tài khoản gần như luôn là lựa chọn đúng hơn xoá.
 */
adminRouter.delete('/users/:id', async (req, res, next) => {
  try {
    const me = await actor(req.user!.sub);
    const target = await loadTargetUser(String(req.params.id), me.id);

    const captainOf = target.teamMemberships.filter((m) => m.role === 'captain');
    if (captainOf.length > 0) {
      const names = captainOf.map((m) => m.team.name).join(', ');
      throw new HttpError(
        409,
        `Còn làm captain của ${names}. Chuyển quyền cho người khác trước khi xoá.`,
        'CAPTAIN_MUST_TRANSFER',
      );
    }

    await prisma.user.delete({ where: { id: target.id } });
    await logAdmin(me, 'user.delete', 'user', target.id, target.email ?? target.phone ?? target.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

/* -------------------------------------------------------------------------- */
/* FR-010.3 — Duyệt bài đăng                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Bài đăng lên thẳng, admin gỡ sau — không duyệt trước.
 *
 * Gỡ bài = đặt lại `status`, không thêm cột `hidden` và cũng không xoá: mọi danh
 * sách công khai đã lọc `status: 'open'` sẵn, nên bài biến mất ngay mà không
 * phải sửa một truy vấn nào, và gỡ nhầm thì khôi phục lại được.
 */
const POST_KINDS = {
  recruitment: { closed: 'closed', link: (id: string) => `/posts/${id}` },
  match: { closed: 'cancelled', link: (id: string) => `/match-requests/${id}` },
  'looking-for-team': { closed: 'closed', link: () => '/looking-for-team' },
} as const;

function kindOrFail(raw: string): AdminPostKind {
  if (raw in POST_KINDS) return raw as AdminPostKind;
  throw new HttpError(400, 'Loại bài đăng không hợp lệ', 'BAD_POST_KIND');
}

adminRouter.get('/posts', async (req, res, next) => {
  try {
    const q = adminPostListQuerySchema.parse(req.query);
    // 'closed' ở đây nghĩa là "không còn hiển thị", gom cả cancelled/matched/expired
    // của tin tìm đối — admin quan tâm bài còn hiện hay không, không quan tâm tên trạng thái.
    const where =
      q.status === 'all'
        ? {}
        : q.status === 'open'
          ? { status: 'open' as const }
          : { NOT: { status: 'open' as const } };
    const page = cursorArgs(q.limit, q.cursor);
    const orderBy = [{ createdAt: 'desc' as const }, { id: 'desc' as const }];

    let items: AdminPostItem[];
    let nextCursor: string | null;

    if (q.kind === 'recruitment') {
      const rows = await prisma.recruitmentPost.findMany({
        where,
        include: { team: { select: { name: true } } },
        orderBy,
        ...page,
      });
      const p = paginate(rows, q.limit);
      nextCursor = p.nextCursor;
      items = p.items.map((r) => ({
        kind: q.kind,
        id: r.id,
        authorName: r.team.name,
        sport: r.sport,
        region: r.region,
        description: r.description,
        open: r.status === 'open',
        status: r.status,
        link: POST_KINDS.recruitment.link(r.id),
        createdAt: r.createdAt.toISOString(),
      }));
    } else if (q.kind === 'match') {
      const rows = await prisma.matchRequest.findMany({
        where,
        include: { team: { select: { name: true } } },
        orderBy,
        ...page,
      });
      const p = paginate(rows, q.limit);
      nextCursor = p.nextCursor;
      items = p.items.map((r) => ({
        kind: q.kind,
        id: r.id,
        authorName: r.team.name,
        sport: r.sport,
        region: r.region,
        description: r.description,
        open: r.status === 'open',
        status: r.status,
        link: POST_KINDS.match.link(r.id),
        createdAt: r.createdAt.toISOString(),
      }));
    } else {
      const rows = await prisma.lookingForTeamPost.findMany({
        where,
        include: { user: { select: { displayName: true } } },
        orderBy,
        ...page,
      });
      const p = paginate(rows, q.limit);
      nextCursor = p.nextCursor;
      items = p.items.map((r) => ({
        kind: q.kind,
        id: r.id,
        authorName: r.user.displayName,
        sport: r.sport,
        region: r.region,
        description: r.description,
        open: r.status === 'open',
        status: r.status,
        link: POST_KINDS['looking-for-team'].link(),
        createdAt: r.createdAt.toISOString(),
      }));
    }

    const body: AdminPostListResponse = { items, nextCursor };
    res.json(body);
  } catch (err) {
    next(err);
  }
});

async function setPostStatus(kind: AdminPostKind, id: string, status: string): Promise<void> {
  const where = { id };
  try {
    if (kind === 'recruitment') {
      await prisma.recruitmentPost.update({ where, data: { status: status as 'open' | 'closed' } });
    } else if (kind === 'match') {
      await prisma.matchRequest.update({ where, data: { status: status as 'open' | 'cancelled' } });
    } else {
      await prisma.lookingForTeamPost.update({
        where,
        data: { status: status as 'open' | 'closed' },
      });
    }
  } catch {
    throw new HttpError(404, 'Không tìm thấy bài đăng', 'POST_NOT_FOUND');
  }
}

adminRouter.post('/posts/:kind/:id/close', async (req, res, next) => {
  try {
    const kind = kindOrFail(String(req.params.kind));
    const id = String(req.params.id);
    const me = await actor(req.user!.sub);

    await setPostStatus(kind, id, POST_KINDS[kind].closed);
    await logAdmin(me, 'post.close', kind, id, null);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

adminRouter.post('/posts/:kind/:id/reopen', async (req, res, next) => {
  try {
    const kind = kindOrFail(String(req.params.kind));
    const id = String(req.params.id);
    const me = await actor(req.user!.sub);

    await setPostStatus(kind, id, 'open');
    await logAdmin(me, 'post.reopen', kind, id, null);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

/* -------------------------------------------------------------------------- */
/* FR-010.6 — Xử lý báo cáo                                                   */
/* -------------------------------------------------------------------------- */

const REPORT_INCLUDE = {
  reporter: { select: { id: true, displayName: true } },
  reportedTeam: {
    select: { id: true, name: true, sport: true, region: true, logoUrl: true, reputation: true },
  },
} satisfies Prisma.ReportInclude;

function toReportItem(
  r: Prisma.ReportGetPayload<{ include: typeof REPORT_INCLUDE }>,
): AdminReportItem {
  return {
    id: r.id,
    reason: r.reason,
    detail: r.detail,
    status: r.status,
    createdAt: r.createdAt.toISOString(),
    resolvedAt: r.resolvedAt?.toISOString() ?? null,
    reporter: r.reporter,
    reportedTeam: r.reportedTeam,
    matchId: r.matchId,
  };
}

adminRouter.get('/reports', async (req, res, next) => {
  try {
    const q = adminReportListQuerySchema.parse(req.query);
    const rows = await prisma.report.findMany({
      where: q.status === 'all' ? {} : { status: q.status },
      include: REPORT_INCLUDE,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      ...cursorArgs(q.limit, q.cursor),
    });

    const { items, nextCursor } = paginate(rows, q.limit);
    const body: AdminReportListResponse = { items: items.map(toReportItem), nextCursor };
    res.json(body);
  } catch (err) {
    next(err);
  }
});

adminRouter.post('/reports/:id/resolve', async (req, res, next) => {
  try {
    const input = adminResolveReportSchema.parse(req.body);
    const id = String(req.params.id);
    const me = await actor(req.user!.sub);

    const report = await prisma.report.findUnique({ where: { id }, select: { status: true } });
    if (!report) throw new HttpError(404, 'Không tìm thấy báo cáo', 'REPORT_NOT_FOUND');
    if (report.status !== 'pending') {
      throw new HttpError(400, 'Báo cáo này đã được xử lý', 'REPORT_NOT_PENDING');
    }

    const updated = await prisma.report.update({
      where: { id },
      data: { status: input.status, resolvedAt: new Date() },
      include: REPORT_INCLUDE,
    });

    await logAdmin(me, `report.${input.status}`, 'report', id, input.note ?? null);
    res.json(toReportItem(updated));
  } catch (err) {
    next(err);
  }
});

/* -------------------------------------------------------------------------- */
/* FR-010.8 — Nhật ký hoạt động                                               */
/* -------------------------------------------------------------------------- */

adminRouter.get('/logs', async (req, res, next) => {
  try {
    const q = adminLogListQuerySchema.parse(req.query);
    const rows = await prisma.adminAction.findMany({
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      ...cursorArgs(q.limit, q.cursor),
    });

    const { items, nextCursor } = paginate(rows, q.limit);
    const body: AdminLogListResponse = {
      items: items.map((a) => ({
        id: a.id,
        adminId: a.adminId,
        adminName: a.adminName,
        action: a.action,
        targetType: a.targetType,
        targetId: a.targetId,
        detail: a.detail,
        createdAt: a.createdAt.toISOString(),
      })),
      nextCursor,
    };
    res.json(body);
  } catch (err) {
    next(err);
  }
});

/* -------------------------------------------------------------------------- */
/* FR-010.5 — Sân bãi đã đăng ký                                              */
/* -------------------------------------------------------------------------- */

const VENUE_ADMIN_INCLUDE = {
  owner: { select: { displayName: true, email: true } },
  _count: { select: { slots: true } },
} satisfies Prisma.VenueInclude;

adminRouter.get('/venues', async (req, res, next) => {
  try {
    const q = adminVenueListQuerySchema.parse(req.query);
    const rows = await prisma.venue.findMany({
      where: {
        ...(q.status !== 'all' && { status: q.status }),
        ...(q.q && {
          OR: [
            { name: { contains: q.q, mode: 'insensitive' } },
            { address: { contains: q.q, mode: 'insensitive' } },
          ],
        }),
      },
      include: VENUE_ADMIN_INCLUDE,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      ...cursorArgs(q.limit, q.cursor),
    });

    const { items, nextCursor } = paginate(rows, q.limit);
    const confirmed = await Promise.all(
      items.map((v) =>
        prisma.booking.count({ where: { status: 'confirmed', slot: { venueId: v.id } } }),
      ),
    );

    const body: AdminVenueListResponse = {
      items: items.map(
        (v, i): AdminVenueItem => ({
          id: v.id,
          name: v.name,
          sport: v.sport,
          address: v.address,
          region: v.region,
          pricePerHour: v.pricePerHour,
          rating: v.rating,
          status: v.status,
          ownerName: v.owner.displayName,
          ownerEmail: v.owner.email,
          slotCount: v._count.slots,
          bookingsConfirmed: confirmed[i] ?? 0,
          createdAt: v.createdAt.toISOString(),
        }),
      ),
      nextCursor,
    };
    res.json(body);
  } catch (err) {
    next(err);
  }
});

/**
 * Đình chỉ một sân: sân biến khỏi danh sách công khai và không nhận đơn mới,
 * nhưng đơn đã xác nhận vẫn còn nguyên — huỷ hộ người ta một buổi đá đã hẹn là
 * việc của chủ sân, không phải của admin.
 */
adminRouter.post('/venues/:id/suspend', async (req, res, next) => {
  try {
    const input = adminSuspendVenueSchema.parse(req.body);
    const me = await actor(req.user!.sub);
    const id = String(req.params.id);

    const venue = await prisma.venue.findUnique({
      where: { id },
      select: { status: true, name: true },
    });
    if (!venue) throw new HttpError(404, 'Không tìm thấy sân', 'VENUE_NOT_FOUND');
    if (venue.status === 'suspended') {
      throw new HttpError(400, 'Sân này đã bị đình chỉ', 'ALREADY_SUSPENDED');
    }

    await prisma.venue.update({ where: { id }, data: { status: 'suspended' } });
    await logAdmin(me, 'venue.suspend', 'venue', id, input.reason ?? venue.name);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

adminRouter.post('/venues/:id/activate', async (req, res, next) => {
  try {
    const me = await actor(req.user!.sub);
    const id = String(req.params.id);

    const venue = await prisma.venue.findUnique({
      where: { id },
      select: { status: true, name: true },
    });
    if (!venue) throw new HttpError(404, 'Không tìm thấy sân', 'VENUE_NOT_FOUND');
    if (venue.status === 'active') {
      throw new HttpError(400, 'Sân này đang hoạt động', 'ALREADY_ACTIVE');
    }

    await prisma.venue.update({ where: { id }, data: { status: 'active' } });
    await logAdmin(me, 'venue.activate', 'venue', id, venue.name);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});
