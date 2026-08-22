import { z } from 'zod';
import { ADMIN_POST_KINDS } from '../types/admin.js';
import { REPORT_STATUSES } from '../types/report.js';
import { USER_ROLES } from '../types/role.js';

/** Đuôi phân trang theo cursor dùng chung cho mọi danh sách quản trị. */
const cursorPage = {
  cursor: z.string().cuid().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
};

export const adminUserListQuerySchema = z.object({
  ...cursorPage,
  /** Khớp email hoặc tên hiển thị, không phân biệt hoa thường. */
  q: z.string().trim().max(100).optional(),
  role: z.enum(USER_ROLES).optional(),
  status: z.enum(['all', 'active', 'disabled']).default('all'),
});
export type AdminUserListQuery = z.infer<typeof adminUserListQuerySchema>;

export const adminUpdateUserSchema = z
  .object({
    role: z.enum(USER_ROLES).optional(),
    displayName: z.string().trim().min(2).max(60).optional(),
  })
  .refine((v) => v.role !== undefined || v.displayName !== undefined, {
    message: 'Không có gì để đổi',
  });
export type AdminUpdateUserInput = z.infer<typeof adminUpdateUserSchema>;

export const adminDisableUserSchema = z.object({
  reason: z.string().trim().max(500).optional(),
});
export type AdminDisableUserInput = z.infer<typeof adminDisableUserSchema>;

export const adminPostListQuerySchema = z.object({
  ...cursorPage,
  kind: z.enum(ADMIN_POST_KINDS).default('recruitment'),
  status: z.enum(['all', 'open', 'closed']).default('open'),
});
export type AdminPostListQuery = z.infer<typeof adminPostListQuerySchema>;

export const adminReportListQuerySchema = z.object({
  ...cursorPage,
  status: z.enum(['all', ...REPORT_STATUSES]).default('pending'),
});
export type AdminReportListQuery = z.infer<typeof adminReportListQuerySchema>;

/** Kết luận một báo cáo: đã xử lý hoặc bỏ qua. `pending` không phải kết luận. */
export const adminResolveReportSchema = z.object({
  status: z.enum(['reviewed', 'dismissed']),
  note: z.string().trim().max(500).optional(),
});
export type AdminResolveReportInput = z.infer<typeof adminResolveReportSchema>;

export const adminVenueListQuerySchema = z.object({
  ...cursorPage,
  q: z.string().trim().max(100).optional(),
  status: z.enum(['all', 'active', 'suspended']).default('all'),
});
export type AdminVenueListQuery = z.infer<typeof adminVenueListQuerySchema>;

export const adminSuspendVenueSchema = z.object({
  reason: z.string().trim().max(500).optional(),
});
export type AdminSuspendVenueInput = z.infer<typeof adminSuspendVenueSchema>;

export const adminLogListQuerySchema = z.object(cursorPage);
export type AdminLogListQuery = z.infer<typeof adminLogListQuerySchema>;
