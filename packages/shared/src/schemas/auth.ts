import { z } from 'zod';

/**
 * Loại tài khoản chọn lúc đăng ký (FR-008.1). Chỉ hai lựa chọn — `admin` không
 * bao giờ tự đăng ký được, phải do một admin khác nâng quyền.
 */
export const SIGNUP_ACCOUNT_TYPES = ['user', 'business'] as const;
export type SignupAccountType = (typeof SIGNUP_ACCOUNT_TYPES)[number];

export const SIGNUP_ACCOUNT_TYPE_LABELS: Record<SignupAccountType, string> = {
  user: 'Người chơi',
  business: 'Chủ sân',
};

export const registerSchema = z.object({
  email: z.string().email('Email không hợp lệ'),
  password: z.string().min(8, 'Mật khẩu tối thiểu 8 ký tự').max(72, 'Mật khẩu tối đa 72 ký tự'),
  displayName: z.string().min(2, 'Tên hiển thị tối thiểu 2 ký tự').max(50),
  accountType: z.enum(SIGNUP_ACCOUNT_TYPES).default('user'),
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.string().email('Email không hợp lệ'),
  password: z.string().min(1, 'Bắt buộc nhập mật khẩu'),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});
export type RefreshInput = z.infer<typeof refreshSchema>;

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Bắt buộc nhập mật khẩu hiện tại'),
    newPassword: z
      .string()
      .min(8, 'Mật khẩu mới tối thiểu 8 ký tự')
      .max(72, 'Mật khẩu tối đa 72 ký tự'),
  })
  .refine((v) => v.currentPassword !== v.newPassword, {
    message: 'Mật khẩu mới phải khác mật khẩu cũ',
    path: ['newPassword'],
  });
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
