import { z } from 'zod';

/**
 * Slug môn. Không dùng z.enum được nữa vì danh mục do admin quản lý lúc chạy —
 * chỉ kiểm được dạng chuỗi ở đây, còn tồn tại hay không thì khoá ngoại trong
 * CSDL chặn (route bắt lỗi P2003 và trả 400).
 */
export const sportSlugSchema = z
  .string()
  .trim()
  .min(2, 'Slug quá ngắn')
  .max(40, 'Slug quá dài')
  .regex(/^[a-z0-9-]+$/, 'Slug chỉ gồm chữ thường, số và dấu gạch ngang');

export const createSportSchema = z.object({
  slug: sportSlugSchema,
  nameVi: z.string().trim().min(2, 'Tên tối thiểu 2 ký tự').max(50),
  primary: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Màu phải dạng #RRGGBB'),
  primaryDark: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Màu phải dạng #RRGGBB'),
  positions: z.array(z.string().trim().min(1).max(40)).max(12).default([]),
  sortOrder: z.number().int().min(0).max(999).optional(),
});
export type CreateSportInput = z.infer<typeof createSportSchema>;

export const updateSportSchema = z.object({
  nameVi: z.string().trim().min(2).max(50).optional(),
  primary: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional(),
  primaryDark: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional(),
  positions: z.array(z.string().trim().min(1).max(40)).max(12).optional(),
  sortOrder: z.number().int().min(0).max(999).optional(),
  active: z.boolean().optional(),
});
export type UpdateSportInput = z.infer<typeof updateSportSchema>;
