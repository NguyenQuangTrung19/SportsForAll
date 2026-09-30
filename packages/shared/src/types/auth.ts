import type { UserRole } from './role.js';

export interface AuthUser {
  id: string;
  /** Null với tài khoản đăng ký bằng số điện thoại (FR-001.2). */
  email: string | null;
  displayName: string;
  avatarUrl: string | null;
  role: UserRole;
  emailVerified: boolean;
  onboardedAt: string | null;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse {
  user: AuthUser;
  tokens: AuthTokens;
}

/**
 * Cách đăng nhập nào đang bật trên server — giao diện ẩn nút của cách chưa cấu hình
 * thay vì để người dùng bấm vào rồi mới báo lỗi.
 */
export interface AuthProviders {
  google: boolean;
  facebook: boolean;
  /** Gửi được email (quên mật khẩu, xác thực email). */
  email: boolean;
  /** Gửi được OTP qua SMS. */
  sms: boolean;
}

export type OAuthProviderName = 'google' | 'facebook';
export const OAUTH_PROVIDER_LABELS: Record<OAuthProviderName, string> = {
  google: 'Google',
  facebook: 'Facebook',
};
