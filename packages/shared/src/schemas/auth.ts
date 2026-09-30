import { z } from 'zod';
import { PHONE_RE, phoneSchema } from './profile.js';

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

/**
 * Đăng nhập bằng email **hoặc** số điện thoại + mật khẩu. Số điện thoại cần cho tài
 * khoản đăng ký bằng OTP rồi mới đặt mật khẩu — tài khoản đó không có email.
 */
export const loginSchema = z.object({
  identifier: z
    .string()
    .trim()
    .min(1, 'Nhập email hoặc số điện thoại')
    .refine(
      (v) => PHONE_RE.test(v) || z.string().email().safeParse(v).success,
      'Email hoặc số điện thoại không hợp lệ',
    ),
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

const newPasswordSchema = z
  .string()
  .min(8, 'Mật khẩu tối thiểu 8 ký tự')
  .max(72, 'Mật khẩu tối đa 72 ký tự');

/** FR-001.6 — bước 1: xin link đặt lại mật khẩu. */
export const forgotPasswordSchema = z.object({
  email: z.string().email('Email không hợp lệ'),
});
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

/** FR-001.6 — bước 2: đặt mật khẩu mới bằng mã trong link. */
export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Thiếu mã đặt lại'),
  newPassword: newPasswordSchema,
});
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

/** FR-001.7 — mã trong link xác thực email; cũng là hình dạng của mã đổi phiên OAuth. */
export const tokenSchema = z.object({
  token: z.string().min(1),
});
export type TokenInput = z.infer<typeof tokenSchema>;

/** FR-001.2 — bước 1: gửi OTP tới số điện thoại. */
export const phoneStartSchema = z.object({
  phone: phoneSchema,
});
export type PhoneStartInput = z.input<typeof phoneStartSchema>;

export const OTP_LENGTH = 6;

/**
 * FR-001.2 — bước 2: nhập OTP. Số chưa có tài khoản thì cần thêm tên hiển thị;
 * API trả `DISPLAY_NAME_REQUIRED` (không tiêu mã) để giao diện hỏi tên rồi gửi lại.
 */
export const phoneVerifySchema = z.object({
  phone: phoneSchema,
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, `Mã gồm ${OTP_LENGTH} chữ số`),
  displayName: z.string().trim().min(2, 'Tên hiển thị tối thiểu 2 ký tự').max(50).optional(),
  accountType: z.enum(SIGNUP_ACCOUNT_TYPES).default('user'),
});
export type PhoneVerifyInput = z.input<typeof phoneVerifySchema>;

/** Đặt mật khẩu lần đầu cho tài khoản tạo bằng Google/Facebook/OTP — không có mật khẩu cũ để hỏi. */
export const setPasswordSchema = z.object({
  newPassword: newPasswordSchema,
});
export type SetPasswordInput = z.infer<typeof setPasswordSchema>;
