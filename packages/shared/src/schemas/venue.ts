import { z } from 'zod';
import { sportSlugSchema } from './sport.js';
import { BOOKING_STATUSES, SLOT_STATUSES } from '../types/venue.js';

/** Giá tiền VND: số nguyên, không âm, chặn trên để một cú gõ nhầm không thành 9 chữ số. */
const priceSchema = z.coerce.number().int().min(0).max(50_000_000);

export const createVenueSchema = z.object({
  name: z.string().trim().min(2, 'Tên sân tối thiểu 2 ký tự').max(80),
  sport: sportSlugSchema,
  address: z.string().trim().min(5, 'Địa chỉ tối thiểu 5 ký tự').max(200),
  region: z.string().trim().max(100).optional(),
  description: z.string().trim().max(1000).optional(),
  pricePerHour: priceSchema,
});
export type CreateVenueInput = z.infer<typeof createVenueSchema>;

export const updateVenueSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  address: z.string().trim().min(5).max(200).optional(),
  region: z.string().trim().max(100).nullish(),
  description: z.string().trim().max(1000).nullish(),
  pricePerHour: priceSchema.optional(),
});
export type UpdateVenueInput = z.infer<typeof updateVenueSchema>;

export const venueListQuerySchema = z.object({
  cursor: z.string().cuid().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  sport: sportSlugSchema.optional(),
  region: z.string().trim().max(100).optional(),
  /** Khớp một phần tên sân hoặc địa chỉ. */
  q: z.string().trim().max(100).optional(),
  priceMax: priceSchema.optional(),
  sort: z.enum(['newest', 'rating', 'price']).default('rating'),
});
export type VenueListQuery = z.infer<typeof venueListQuerySchema>;

/**
 * Một khung giờ. Giờ kết thúc phải sau giờ bắt đầu — nếu không thì mọi phép tính
 * thời lượng và mọi lần kiểm chồng lấn phía sau đều sai theo.
 */
export const createSlotSchema = z
  .object({
    startsAt: z.string().datetime({ offset: true }),
    endsAt: z.string().datetime({ offset: true }),
    /** Bỏ trống thì lấy giá niêm yết của sân. */
    price: priceSchema.optional(),
    openForTeams: z.boolean().default(false),
    note: z.string().trim().max(300).optional(),
  })
  .refine((v) => new Date(v.endsAt) > new Date(v.startsAt), {
    message: 'Giờ kết thúc phải sau giờ bắt đầu',
    path: ['endsAt'],
  });
export type CreateSlotInput = z.infer<typeof createSlotSchema>;

export const updateSlotSchema = z.object({
  price: priceSchema.optional(),
  openForTeams: z.boolean().optional(),
  note: z.string().trim().max(300).nullish(),
  /** Chỉ đổi được giữa `open` và `blocked`; `booked` do luồng duyệt đơn đặt lấy. */
  status: z.enum(['open', 'blocked']).optional(),
});
export type UpdateSlotInput = z.infer<typeof updateSlotSchema>;

export const createBookingSchema = z.object({
  teamId: z.string().cuid().optional(),
  note: z.string().trim().max(500).optional(),
});
export type CreateBookingInput = z.infer<typeof createBookingSchema>;

export const bookingListQuerySchema = z.object({
  cursor: z.string().cuid().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  status: z.enum(['all', ...BOOKING_STATUSES]).default('all'),
});
export type BookingListQuery = z.infer<typeof bookingListQuerySchema>;

export const slotListQuerySchema = z.object({
  status: z.enum(['all', ...SLOT_STATUSES]).default('all'),
});
export type SlotListQuery = z.infer<typeof slotListQuerySchema>;

export const createVenueReviewSchema = z.object({
  score: z.coerce.number().int().min(1, 'Tối thiểu 1 sao').max(5, 'Tối đa 5 sao'),
  comment: z.string().trim().max(1000).optional(),
});
export type CreateVenueReviewInput = z.infer<typeof createVenueReviewSchema>;

export const openSlotQuerySchema = z.object({
  sport: sportSlugSchema.optional(),
  region: z.string().trim().max(100).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
export type OpenSlotQuery = z.infer<typeof openSlotQuerySchema>;
