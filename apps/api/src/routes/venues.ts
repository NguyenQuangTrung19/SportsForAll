import {
  bookingListQuerySchema,
  createBookingSchema,
  createSlotSchema,
  createVenueReviewSchema,
  createVenueSchema,
  openSlotQuerySchema,
  updateSlotSchema,
  updateVenueSchema,
  venueListQuerySchema,
  type BookingListResponse,
  type BookingView,
  type OpenSlotListResponse,
  type VenueDetail,
  type VenueListResponse,
  type VenueSlotView,
  type VenueStats,
  type VenueSummary,
} from '@sfa/shared';
import type { Prisma } from '@prisma/client';
import { Router } from 'express';
import { prisma } from '../lib/db.js';
import { notify } from '../lib/notify.js';
import { cursorArgs, paginate } from '../lib/paginate.js';
import { removeUploadedFile } from '../lib/uploads.js';
import { buildVenuePhoto, venuePhotoUpload } from '../lib/venue-photos.js';
import { requireAuth } from '../middleware/auth.js';
import { HttpError } from '../middleware/error.js';
import { requireRole } from '../middleware/role.js';

export const venuesRouter = Router();

const OWNER_SELECT = { id: true, displayName: true, avatarUrl: true } as const;

const VENUE_INCLUDE = {
  owner: { select: OWNER_SELECT },
  _count: { select: { reviews: true } },
} satisfies Prisma.VenueInclude;

type VenueRow = Prisma.VenueGetPayload<{ include: typeof VENUE_INCLUDE }>;

/**
 * Trang chi tiết chỉ hiện khung giờ từ bây giờ trở đi — lịch của tuần trước
 * không giúp ai đặt sân, và giữ số dòng ở mức người ta lướt hết được.
 */
const SLOT_PAGE = 60;

function toSummary(v: VenueRow, openSlotCount: number, viewerId: string): VenueSummary {
  return {
    id: v.id,
    name: v.name,
    sport: v.sport,
    address: v.address,
    region: v.region,
    description: v.description,
    photoUrl: v.photoUrl,
    pricePerHour: v.pricePerHour,
    rating: v.rating,
    reviewCount: v._count.reviews,
    status: v.status,
    openSlotCount,
    owner: v.owner,
    viewerIsOwner: v.ownerId === viewerId,
    createdAt: v.createdAt.toISOString(),
  };
}

type SlotRow = Prisma.VenueSlotGetPayload<{
  include: { bookings: { select: { id: true; userId: true; status: true } } };
}>;

function toSlotView(s: SlotRow, viewerId: string): VenueSlotView {
  const mine = s.bookings.find((b) => b.userId === viewerId);
  return {
    id: s.id,
    venueId: s.venueId,
    startsAt: s.startsAt.toISOString(),
    endsAt: s.endsAt.toISOString(),
    price: s.price,
    status: s.status,
    openForTeams: s.openForTeams,
    note: s.note,
    viewerBookingStatus: mine?.status ?? null,
    viewerBookingId: mine?.id ?? null,
    pendingCount: s.bookings.filter((b) => b.status === 'pending').length,
  };
}

async function loadVenueOrFail(id: string): Promise<VenueRow> {
  const venue = await prisma.venue.findUnique({ where: { id }, include: VENUE_INCLUDE });
  if (!venue) throw new HttpError(404, 'Không tìm thấy sân', 'VENUE_NOT_FOUND');
  return venue;
}

function ensureOwner(venue: { ownerId: string }, userId: string): void {
  if (venue.ownerId !== userId) {
    throw new HttpError(403, 'Bạn không phải chủ sân này', 'NOT_VENUE_OWNER');
  }
}

/** Đếm khung còn trống từ bây giờ — con số quyết định người ta có bấm vào sân hay không. */
function openSlotWhere(venueId?: string): Prisma.VenueSlotWhereInput {
  return {
    ...(venueId && { venueId }),
    status: 'open',
    startsAt: { gte: new Date() },
  };
}

/* -------------------------------------------------------------------------- */
/* Khung trống cần tìm đội (FR-008.7 + FR-004.4)                              */
/* -------------------------------------------------------------------------- */

venuesRouter.get('/slots/open', requireAuth, async (req, res, next) => {
  try {
    const q = openSlotQuerySchema.parse(req.query);
    const rows = await prisma.venueSlot.findMany({
      where: {
        ...openSlotWhere(),
        openForTeams: true,
        venue: {
          status: 'active',
          ...(q.sport && { sport: q.sport }),
          ...(q.region && { region: { equals: q.region, mode: 'insensitive' } }),
        },
      },
      include: { venue: true },
      orderBy: { startsAt: 'asc' },
      take: q.limit,
    });

    const body: OpenSlotListResponse = {
      items: rows.map((s) => ({
        slotId: s.id,
        venueId: s.venueId,
        venueName: s.venue.name,
        sport: s.venue.sport,
        address: s.venue.address,
        region: s.venue.region,
        startsAt: s.startsAt.toISOString(),
        endsAt: s.endsAt.toISOString(),
        price: s.price,
        note: s.note,
        rating: s.venue.rating,
      })),
    };
    res.json(body);
  } catch (err) {
    next(err);
  }
});

/* -------------------------------------------------------------------------- */
/* Đơn đặt sân (FR-008.5, FR-008.6)                                           */
/* -------------------------------------------------------------------------- */

const BOOKING_INCLUDE = {
  user: { select: OWNER_SELECT },
  team: { select: { name: true } },
  slot: { include: { venue: true } },
} satisfies Prisma.BookingInclude;

type BookingRow = Prisma.BookingGetPayload<{ include: typeof BOOKING_INCLUDE }>;

function toBookingView(b: BookingRow): BookingView {
  return {
    id: b.id,
    status: b.status,
    note: b.note,
    createdAt: b.createdAt.toISOString(),
    decidedAt: b.decidedAt?.toISOString() ?? null,
    slot: {
      id: b.slot.id,
      startsAt: b.slot.startsAt.toISOString(),
      endsAt: b.slot.endsAt.toISOString(),
      price: b.slot.price,
    },
    venue: {
      id: b.slot.venue.id,
      name: b.slot.venue.name,
      sport: b.slot.venue.sport,
      address: b.slot.venue.address,
    },
    user: b.user,
    teamName: b.team?.name ?? null,
  };
}

async function loadBookingOrFail(id: string): Promise<BookingRow> {
  const booking = await prisma.booking.findUnique({ where: { id }, include: BOOKING_INCLUDE });
  if (!booking) throw new HttpError(404, 'Không tìm thấy đơn đặt sân', 'BOOKING_NOT_FOUND');
  return booking;
}

function slotLabel(startsAt: Date, venueName: string): string {
  const when = startsAt.toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
  return `${venueName} · ${when}`;
}

/** Đơn của chính mình, dùng cho trang "Sân tôi đã đặt". */
venuesRouter.get('/bookings/me', requireAuth, async (req, res, next) => {
  try {
    const q = bookingListQuerySchema.parse(req.query);
    const rows = await prisma.booking.findMany({
      where: { userId: req.user!.sub, ...(q.status !== 'all' && { status: q.status }) },
      include: BOOKING_INCLUDE,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      ...cursorArgs(q.limit, q.cursor),
    });
    const { items, nextCursor } = paginate(rows, q.limit);
    const body: BookingListResponse = { items: items.map(toBookingView), nextCursor };
    res.json(body);
  } catch (err) {
    next(err);
  }
});

/**
 * Xác nhận một đơn (FR-008.6).
 *
 * Chốt một đơn là tự động từ chối những đơn còn lại của cùng khung và khoá khung
 * lại — giống hệt cách nhận một lời thách đấu đóng luôn các lời còn lại. Không
 * làm thế thì chủ sân bấm xác nhận hai lần là bán một khung cho hai người.
 */
venuesRouter.post('/bookings/:id/confirm', requireAuth, async (req, res, next) => {
  try {
    const booking = await loadBookingOrFail(String(req.params.id));
    ensureOwner(booking.slot.venue, req.user!.sub);
    if (booking.status !== 'pending') {
      throw new HttpError(400, 'Đơn không còn ở trạng thái chờ', 'BOOKING_NOT_PENDING');
    }
    if (booking.slot.status !== 'open') {
      throw new HttpError(400, 'Khung giờ này đã được chốt cho người khác', 'SLOT_NOT_OPEN');
    }

    const now = new Date();
    await prisma.$transaction(async (tx) => {
      // Giữ khung bằng điều kiện `status: 'open'` ngay trong câu UPDATE: hai lần
      // xác nhận chạy song song (hai tab, bấm đúp) thì Postgres khoá dòng, chỉ một
      // bên thấy khung còn `open`. Kiểm tra ở trên chỉ để báo lỗi sớm, không đủ.
      const { count: slotClaimed } = await tx.venueSlot.updateMany({
        where: { id: booking.slotId, status: 'open' },
        data: { status: 'booked' },
      });
      const { count: bookingClaimed } = await tx.booking.updateMany({
        where: { id: booking.id, status: 'pending' },
        data: { status: 'confirmed', decidedAt: now },
      });
      if (slotClaimed === 0 || bookingClaimed === 0) {
        throw new HttpError(409, 'Khung giờ này vừa được chốt cho người khác', 'SLOT_NOT_OPEN');
      }

      const losers = await tx.booking.findMany({
        where: { slotId: booking.slotId, status: 'pending' },
        select: { userId: true },
      });
      await tx.booking.updateMany({
        where: { slotId: booking.slotId, status: 'pending' },
        data: { status: 'rejected', decidedAt: now },
      });

      const label = slotLabel(booking.slot.startsAt, booking.slot.venue.name);
      await notify(tx, {
        userIds: [booking.userId],
        type: 'booking_confirmed',
        title: `Đơn đặt sân đã được xác nhận: ${label}`,
        link: `/venues/${booking.slot.venueId}`,
      });
      if (losers.length > 0) {
        await notify(tx, {
          userIds: losers.map((l) => l.userId),
          type: 'booking_rejected',
          title: `Khung giờ ${label} đã có người khác đặt trước`,
          link: `/venues/${booking.slot.venueId}`,
        });
      }
    });

    res.json(toBookingView(await loadBookingOrFail(booking.id)));
  } catch (err) {
    next(err);
  }
});

venuesRouter.post('/bookings/:id/reject', requireAuth, async (req, res, next) => {
  try {
    const booking = await loadBookingOrFail(String(req.params.id));
    ensureOwner(booking.slot.venue, req.user!.sub);
    if (booking.status !== 'pending') {
      throw new HttpError(400, 'Đơn không còn ở trạng thái chờ', 'BOOKING_NOT_PENDING');
    }

    await prisma.booking.update({
      where: { id: booking.id },
      data: { status: 'rejected', decidedAt: new Date() },
    });
    await notify(prisma, {
      userIds: [booking.userId],
      type: 'booking_rejected',
      title: `Đơn đặt sân bị từ chối: ${slotLabel(booking.slot.startsAt, booking.slot.venue.name)}`,
      link: `/venues/${booking.slot.venueId}`,
    });

    res.json(toBookingView(await loadBookingOrFail(booking.id)));
  } catch (err) {
    next(err);
  }
});

/**
 * Người đặt tự huỷ. Huỷ một đơn đã xác nhận thì phải mở khung ra lại, nếu không
 * khung đó kẹt ở `booked` vĩnh viễn và không ai đặt được nữa.
 */
venuesRouter.post('/bookings/:id/cancel', requireAuth, async (req, res, next) => {
  try {
    const booking = await loadBookingOrFail(String(req.params.id));
    const userId = req.user!.sub;
    if (booking.userId !== userId) {
      throw new HttpError(403, 'Bạn chỉ huỷ được đơn của mình', 'FORBIDDEN');
    }
    if (booking.status !== 'pending' && booking.status !== 'confirmed') {
      throw new HttpError(400, 'Đơn này không huỷ được nữa', 'BOOKING_NOT_CANCELLABLE');
    }
    if (booking.slot.startsAt < new Date()) {
      throw new HttpError(400, 'Khung giờ đã bắt đầu, không huỷ được', 'SLOT_ALREADY_STARTED');
    }

    const wasConfirmed = booking.status === 'confirmed';
    await prisma.$transaction(async (tx) => {
      await tx.booking.update({
        where: { id: booking.id },
        data: { status: 'cancelled', decidedAt: new Date() },
      });
      if (wasConfirmed) {
        await tx.venueSlot.update({ where: { id: booking.slotId }, data: { status: 'open' } });
        await notify(tx, {
          userIds: [booking.slot.venue.ownerId],
          type: 'booking_cancelled',
          title: `${booking.user.displayName} đã huỷ đơn đặt ${slotLabel(booking.slot.startsAt, booking.slot.venue.name)}`,
          link: `/venues/${booking.slot.venueId}/manage`,
        });
      }
    });

    res.json(toBookingView(await loadBookingOrFail(booking.id)));
  } catch (err) {
    next(err);
  }
});

/** Gửi yêu cầu đặt một khung (FR-008.5). */
venuesRouter.post('/slots/:slotId/bookings', requireAuth, async (req, res, next) => {
  try {
    const input = createBookingSchema.parse(req.body);
    const userId = req.user!.sub;
    const slot = await prisma.venueSlot.findUnique({
      where: { id: String(req.params.slotId) },
      include: { venue: true },
    });
    if (!slot) throw new HttpError(404, 'Không tìm thấy khung giờ', 'SLOT_NOT_FOUND');
    if (slot.venue.status !== 'active') {
      throw new HttpError(400, 'Sân này đang tạm ngừng nhận đặt', 'VENUE_SUSPENDED');
    }
    if (slot.venue.ownerId === userId) {
      throw new HttpError(400, 'Không đặt sân của chính bạn', 'SELF_BOOKING');
    }
    if (slot.status !== 'open') {
      throw new HttpError(400, 'Khung giờ này không còn trống', 'SLOT_NOT_OPEN');
    }
    if (slot.startsAt < new Date()) {
      throw new HttpError(400, 'Khung giờ đã trôi qua', 'SLOT_IN_PAST');
    }

    // Đặt nhân danh đội thì phải thật sự thuộc đội đó — nếu không ai cũng gắn tên
    // đội người khác vào đơn của mình.
    if (input.teamId) {
      const membership = await prisma.teamMember.findUnique({
        where: { teamId_userId: { teamId: input.teamId, userId } },
        select: { id: true },
      });
      if (!membership) throw new HttpError(403, 'Bạn không thuộc đội này', 'NOT_TEAM_MEMBER');
    }

    const existing = await prisma.booking.findUnique({
      where: { slotId_userId: { slotId: slot.id, userId } },
      select: { status: true },
    });
    if (existing && (existing.status === 'pending' || existing.status === 'confirmed')) {
      throw new HttpError(409, 'Bạn đã gửi đơn cho khung giờ này', 'ALREADY_BOOKED');
    }

    // upsert vì `@@unique([slotId, userId])`: xin lại sau khi bị từ chối là làm
    // mới chính bản ghi cũ chứ không tạo dòng thứ hai.
    const booking = await prisma.booking.upsert({
      where: { slotId_userId: { slotId: slot.id, userId } },
      create: {
        slotId: slot.id,
        userId,
        teamId: input.teamId ?? null,
        note: input.note ?? null,
      },
      update: {
        status: 'pending',
        teamId: input.teamId ?? null,
        note: input.note ?? null,
        decidedAt: null,
        createdAt: new Date(),
      },
    });

    const me = await prisma.user.findUnique({
      where: { id: userId },
      select: { displayName: true },
    });
    await notify(prisma, {
      userIds: [slot.venue.ownerId],
      type: 'booking_requested',
      title: `${me?.displayName ?? 'Một người dùng'} xin đặt ${slotLabel(slot.startsAt, slot.venue.name)}`,
      message: input.note ?? null,
      link: `/venues/${slot.venueId}/manage`,
    });

    res.status(201).json(toBookingView(await loadBookingOrFail(booking.id)));
  } catch (err) {
    next(err);
  }
});

/* -------------------------------------------------------------------------- */
/* Khung giờ (FR-008.3, FR-008.4, FR-008.7)                                   */
/* -------------------------------------------------------------------------- */

venuesRouter.patch('/slots/:slotId', requireAuth, async (req, res, next) => {
  try {
    const input = updateSlotSchema.parse(req.body);
    const slot = await prisma.venueSlot.findUnique({
      where: { id: String(req.params.slotId) },
      include: { venue: true, bookings: { select: { id: true, userId: true, status: true } } },
    });
    if (!slot) throw new HttpError(404, 'Không tìm thấy khung giờ', 'SLOT_NOT_FOUND');
    ensureOwner(slot.venue, req.user!.sub);
    if (slot.status === 'booked' && input.status !== undefined) {
      throw new HttpError(
        400,
        'Khung đã có người đặt — người đặt phải huỷ trước khi bạn đóng khung',
        'SLOT_BOOKED',
      );
    }

    const updated = await prisma.venueSlot.update({
      where: { id: slot.id },
      data: {
        ...(input.price !== undefined && { price: input.price }),
        ...(input.openForTeams !== undefined && { openForTeams: input.openForTeams }),
        ...(input.note !== undefined && { note: input.note }),
        ...(input.status !== undefined && { status: input.status }),
      },
      include: { bookings: { select: { id: true, userId: true, status: true } } },
    });
    res.json(toSlotView(updated, req.user!.sub));
  } catch (err) {
    next(err);
  }
});

venuesRouter.delete('/slots/:slotId', requireAuth, async (req, res, next) => {
  try {
    const slot = await prisma.venueSlot.findUnique({
      where: { id: String(req.params.slotId) },
      include: { venue: true },
    });
    if (!slot) throw new HttpError(404, 'Không tìm thấy khung giờ', 'SLOT_NOT_FOUND');
    ensureOwner(slot.venue, req.user!.sub);
    if (slot.status === 'booked') {
      throw new HttpError(400, 'Khung đã có người đặt, không xoá được', 'SLOT_BOOKED');
    }

    await prisma.venueSlot.delete({ where: { id: slot.id } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

/* -------------------------------------------------------------------------- */
/* Sân (FR-008.2, FR-008.4)                                                   */
/* -------------------------------------------------------------------------- */

/** Sân của chính mình, kể cả sân đang bị đình chỉ — chủ sân phải thấy để còn xử lý. */
venuesRouter.get('/me', requireAuth, async (req, res, next) => {
  try {
    const userId = req.user!.sub;
    const rows = await prisma.venue.findMany({
      where: { ownerId: userId },
      include: VENUE_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
    const counts = await Promise.all(
      rows.map((v) => prisma.venueSlot.count({ where: openSlotWhere(v.id) })),
    );
    res.json({ venues: rows.map((v, i) => toSummary(v, counts[i] ?? 0, userId)) });
  } catch (err) {
    next(err);
  }
});

venuesRouter.get('/', requireAuth, async (req, res, next) => {
  try {
    const q = venueListQuerySchema.parse(req.query);
    const viewerId = req.user!.sub;
    const where: Prisma.VenueWhereInput = {
      status: 'active',
      ...(q.sport && { sport: q.sport }),
      ...(q.region && { region: { equals: q.region, mode: 'insensitive' } }),
      ...(q.priceMax !== undefined && { pricePerHour: { lte: q.priceMax } }),
      ...(q.q && {
        OR: [
          { name: { contains: q.q, mode: 'insensitive' } },
          { address: { contains: q.q, mode: 'insensitive' } },
        ],
      }),
    };

    // id chốt cuối để thứ tự luôn toàn phần — thiếu nó thì cursor có thể bỏ sót sân.
    const orderBy: Prisma.VenueOrderByWithRelationInput[] =
      q.sort === 'price'
        ? [{ pricePerHour: 'asc' }, { id: 'desc' }]
        : q.sort === 'newest'
          ? [{ createdAt: 'desc' }, { id: 'desc' }]
          : [{ rating: 'desc' }, { createdAt: 'desc' }, { id: 'desc' }];

    const rows = await prisma.venue.findMany({
      where,
      include: VENUE_INCLUDE,
      orderBy,
      ...cursorArgs(q.limit, q.cursor),
    });
    const { items, nextCursor } = paginate(rows, q.limit);
    const counts = await Promise.all(
      items.map((v) => prisma.venueSlot.count({ where: openSlotWhere(v.id) })),
    );

    const body: VenueListResponse = {
      items: items.map((v, i) => toSummary(v, counts[i] ?? 0, viewerId)),
      nextCursor,
    };
    res.json(body);
  } catch (err) {
    next(err);
  }
});

/** Đăng sân mới. Chỉ tài khoản doanh nghiệp — đó là điểm khác biệt của vai trò này. */
venuesRouter.post('/', requireAuth, requireRole('business', 'admin'), async (req, res, next) => {
  try {
    const input = createVenueSchema.parse(req.body);
    const userId = req.user!.sub;
    const created = await prisma.venue.create({
      data: {
        ownerId: userId,
        name: input.name,
        sport: input.sport,
        address: input.address,
        region: input.region ?? null,
        description: input.description ?? null,
        pricePerHour: input.pricePerHour,
      },
      include: VENUE_INCLUDE,
    });
    res.status(201).json(toSummary(created, 0, userId));
  } catch (err) {
    next(err);
  }
});

venuesRouter.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const viewerId = req.user!.sub;
    const venue = await loadVenueOrFail(String(req.params.id));
    const now = new Date();

    const [slots, reviews, openSlotCount, playedBooking] = await Promise.all([
      prisma.venueSlot.findMany({
        where: { venueId: venue.id, startsAt: { gte: now } },
        include: { bookings: { select: { id: true, userId: true, status: true } } },
        orderBy: { startsAt: 'asc' },
        take: SLOT_PAGE,
      }),
      prisma.venueReview.findMany({
        where: { venueId: venue.id },
        include: { user: { select: OWNER_SELECT } },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
      prisma.venueSlot.count({ where: openSlotWhere(venue.id) }),
      // Chỉ người từng thuê thật và đã qua giờ đá mới đánh giá được — cùng nguyên
      // tắc với chấm uy tín đội: có mặt rồi mới có quyền nói.
      prisma.booking.findFirst({
        where: {
          userId: viewerId,
          status: 'confirmed',
          slot: { venueId: venue.id, endsAt: { lt: now } },
        },
        select: { id: true },
      }),
    ]);

    const viewerReview = reviews.find((r) => r.userId === viewerId);
    const body: VenueDetail = {
      ...toSummary(venue, openSlotCount, viewerId),
      slots: slots.map((s) => toSlotView(s, viewerId)),
      reviews: reviews.map((r) => ({
        id: r.id,
        userId: r.userId,
        displayName: r.user.displayName,
        avatarUrl: r.user.avatarUrl,
        score: r.score,
        comment: r.comment,
        createdAt: r.createdAt.toISOString(),
      })),
      viewerReview: viewerReview
        ? { score: viewerReview.score, comment: viewerReview.comment }
        : null,
      viewerCanReview: Boolean(playedBooking),
    };
    res.json(body);
  } catch (err) {
    next(err);
  }
});

venuesRouter.patch('/:id', requireAuth, async (req, res, next) => {
  try {
    const input = updateVenueSchema.parse(req.body);
    const venue = await loadVenueOrFail(String(req.params.id));
    ensureOwner(venue, req.user!.sub);

    // Giá niêm yết đổi không kéo theo giá các khung đã tạo: khung đã đăng là một
    // lời chào giá, sửa ngược lại sau lưng người đang xem là chuyện khác hẳn.
    const updated = await prisma.venue.update({
      where: { id: venue.id },
      data: {
        ...(input.name !== undefined && { name: input.name }),
        ...(input.address !== undefined && { address: input.address }),
        ...(input.region !== undefined && { region: input.region }),
        ...(input.description !== undefined && { description: input.description }),
        ...(input.pricePerHour !== undefined && { pricePerHour: input.pricePerHour }),
      },
      include: VENUE_INCLUDE,
    });
    const openSlotCount = await prisma.venueSlot.count({ where: openSlotWhere(venue.id) });
    res.json(toSummary(updated, openSlotCount, req.user!.sub));
  } catch (err) {
    next(err);
  }
});

venuesRouter.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    const venue = await loadVenueOrFail(String(req.params.id));
    ensureOwner(venue, req.user!.sub);

    const upcoming = await prisma.booking.count({
      where: { status: 'confirmed', slot: { venueId: venue.id, startsAt: { gte: new Date() } } },
    });
    if (upcoming > 0) {
      throw new HttpError(
        409,
        `Còn ${upcoming} đơn đã xác nhận chưa tới ngày. Huỷ hoặc chờ xong rồi mới xoá được sân.`,
        'VENUE_HAS_BOOKINGS',
      );
    }

    await prisma.venue.delete({ where: { id: venue.id } });
    removeUploadedFile(venue.photoUrl);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

venuesRouter.post(
  '/:id/photo',
  requireAuth,
  venuePhotoUpload.single('photo'),
  async (req, res, next) => {
    try {
      const venue = await loadVenueOrFail(String(req.params.id));
      ensureOwner(venue, req.user!.sub);
      if (!req.file) throw new HttpError(400, 'Chưa chọn ảnh', 'NO_FILE');

      const origin = `${req.protocol}://${req.get('host')}`;
      const photoUrl = await buildVenuePhoto(req.file.buffer, origin);
      const updated = await prisma.venue.update({
        where: { id: venue.id },
        data: { photoUrl },
        include: VENUE_INCLUDE,
      });
      removeUploadedFile(venue.photoUrl);

      const openSlotCount = await prisma.venueSlot.count({ where: openSlotWhere(venue.id) });
      res.json(toSummary(updated, openSlotCount, req.user!.sub));
    } catch (err) {
      next(err);
    }
  },
);

/** Mở một khung giờ cho thuê (FR-008.3). */
venuesRouter.post('/:id/slots', requireAuth, async (req, res, next) => {
  try {
    const input = createSlotSchema.parse(req.body);
    const venue = await loadVenueOrFail(String(req.params.id));
    ensureOwner(venue, req.user!.sub);

    const startsAt = new Date(input.startsAt);
    const endsAt = new Date(input.endsAt);
    if (startsAt < new Date()) {
      throw new HttpError(400, 'Không mở khung giờ trong quá khứ', 'SLOT_IN_PAST');
    }

    // Chồng lấn là bán một mặt sân cho hai người cùng lúc — chặn ngay ở đây,
    // vì CSDL không có ràng buộc nào diễn tả được "hai khoảng thời gian giao nhau".
    const clash = await prisma.venueSlot.findFirst({
      where: {
        venueId: venue.id,
        startsAt: { lt: endsAt },
        endsAt: { gt: startsAt },
      },
      select: { id: true },
    });
    if (clash) {
      throw new HttpError(409, 'Khung giờ này chồng lấn một khung đã có', 'SLOT_OVERLAP');
    }

    const created = await prisma.venueSlot.create({
      data: {
        venueId: venue.id,
        startsAt,
        endsAt,
        price: input.price ?? venue.pricePerHour,
        openForTeams: input.openForTeams,
        note: input.note ?? null,
      },
      include: { bookings: { select: { id: true, userId: true, status: true } } },
    });
    res.status(201).json(toSlotView(created, req.user!.sub));
  } catch (err) {
    next(err);
  }
});

/** Hộp thư đơn đặt của một sân (FR-008.5) — chỉ chủ sân xem được. */
venuesRouter.get('/:id/bookings', requireAuth, async (req, res, next) => {
  try {
    const q = bookingListQuerySchema.parse(req.query);
    const venue = await loadVenueOrFail(String(req.params.id));
    ensureOwner(venue, req.user!.sub);

    const rows = await prisma.booking.findMany({
      where: { slot: { venueId: venue.id }, ...(q.status !== 'all' && { status: q.status }) },
      include: BOOKING_INCLUDE,
      // Đơn chờ lên trước: đó là thứ chủ sân mở trang này để xử lý.
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }, { id: 'desc' }],
      ...cursorArgs(q.limit, q.cursor),
    });
    const { items, nextCursor } = paginate(rows, q.limit);
    const body: BookingListResponse = { items: items.map(toBookingView), nextCursor };
    res.json(body);
  } catch (err) {
    next(err);
  }
});

/** FR-008.9 — thống kê đặt sân. */
venuesRouter.get('/:id/stats', requireAuth, async (req, res, next) => {
  try {
    const venue = await loadVenueOrFail(String(req.params.id));
    ensureOwner(venue, req.user!.sub);

    const [slotsTotal, slotsOpen, slotsBooked, pending, confirmed, rejected, revenue, reviewCount] =
      await Promise.all([
        prisma.venueSlot.count({ where: { venueId: venue.id } }),
        prisma.venueSlot.count({ where: openSlotWhere(venue.id) }),
        prisma.venueSlot.count({ where: { venueId: venue.id, status: 'booked' } }),
        prisma.booking.count({ where: { slot: { venueId: venue.id }, status: 'pending' } }),
        prisma.booking.count({ where: { slot: { venueId: venue.id }, status: 'confirmed' } }),
        prisma.booking.count({ where: { slot: { venueId: venue.id }, status: 'rejected' } }),
        prisma.venueSlot.aggregate({
          where: { venueId: venue.id, bookings: { some: { status: 'confirmed' } } },
          _sum: { price: true },
        }),
        prisma.venueReview.count({ where: { venueId: venue.id } }),
      ]);

    const body: VenueStats = {
      slotsTotal,
      slotsOpen,
      slotsBooked,
      bookingsPending: pending,
      bookingsConfirmed: confirmed,
      bookingsRejected: rejected,
      revenueConfirmed: revenue._sum.price ?? 0,
      rating: venue.rating,
      reviewCount,
    };
    res.json(body);
  } catch (err) {
    next(err);
  }
});

/**
 * Đánh giá sân (FR-008.8).
 *
 * Một phiếu mỗi người mỗi sân, sửa được — nên điểm sân là trung bình các phiếu
 * chứ không phải tổng, và không ai bơm điểm bằng cách gửi nhiều lần. Trung bình
 * ghi thẳng vào `Venue.rating` để danh sách sắp xếp theo điểm khỏi tính lại.
 */
venuesRouter.post('/:id/reviews', requireAuth, async (req, res, next) => {
  try {
    const input = createVenueReviewSchema.parse(req.body);
    const userId = req.user!.sub;
    const venue = await loadVenueOrFail(String(req.params.id));
    if (venue.ownerId === userId) {
      throw new HttpError(400, 'Không tự đánh giá sân của mình', 'SELF_REVIEW');
    }

    const played = await prisma.booking.findFirst({
      where: {
        userId,
        status: 'confirmed',
        slot: { venueId: venue.id, endsAt: { lt: new Date() } },
      },
      select: { id: true },
    });
    if (!played) {
      throw new HttpError(
        403,
        'Chỉ đánh giá được sau khi bạn thật sự thuê và đã qua giờ đá',
        'NO_COMPLETED_BOOKING',
      );
    }

    const rating = await prisma.$transaction(async (tx) => {
      await tx.venueReview.upsert({
        where: { venueId_userId: { venueId: venue.id, userId } },
        create: { venueId: venue.id, userId, score: input.score, comment: input.comment ?? null },
        update: { score: input.score, comment: input.comment ?? null },
      });
      const agg = await tx.venueReview.aggregate({
        where: { venueId: venue.id },
        _avg: { score: true },
      });
      const avg = agg._avg.score ?? 0;
      await tx.venue.update({ where: { id: venue.id }, data: { rating: avg } });
      return avg;
    });

    res.status(201).json({ venueId: venue.id, rating });
  } catch (err) {
    next(err);
  }
});
