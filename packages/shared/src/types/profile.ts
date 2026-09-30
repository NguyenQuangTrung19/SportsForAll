import type { OAuthProviderName } from './auth.js';
import type { SkillLevel } from './skill-level.js';
import type { SportSlug } from './sport.js';

export interface SportPreference {
  sport: SportSlug;
  skillLevel: SkillLevel;
  position: string | null;
}

export interface ProfileResponse {
  id: string;
  email: string | null;
  displayName: string;
  avatarUrl: string | null;
  bio: string | null;
  birthYear: number | null;
  region: string | null;
  phone: string | null;
  /** Đã xác thực bằng OTP — dùng để đăng nhập, khoá không cho sửa ở form hồ sơ. */
  phoneVerified: boolean;
  reputation: number;
  /** Có mật khẩu chưa — chưa có thì thẻ Mật khẩu ở hồ sơ là "Đặt mật khẩu". */
  hasPassword: boolean;
  /** Google/Facebook đã liên kết với tài khoản này. */
  linkedProviders: OAuthProviderName[];
  /** Số trận đã được chấm tính vào `reputation` (FR-002.12). */
  ratedMatches: number;
  emailVerified: boolean;
  onboardedAt: string | null;
  sportPreferences: SportPreference[];
  createdAt: string;
}
