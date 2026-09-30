import type { OAuthProviderName } from '@sfa/shared';
import { env } from '../config/env.js';

/**
 * Đăng nhập Google / Facebook (FR-001.1, 1.4, 1.5) theo luồng authorization code
 * chuẩn, gọi thẳng endpoint bằng `fetch` — không kéo passport vào cho hai nhà
 * cung cấp.
 */
export type { OAuthProviderName };

export interface OAuthProfile {
  providerUserId: string;
  email: string | null;
  /** Nhà cung cấp xác nhận email là của người này — điều kiện để gộp vào tài khoản cũ. */
  emailVerified: boolean;
  name: string | null;
}

// Facebook giữ mỗi phiên bản Graph API ít nhất 2 năm; hết hạn thì nâng số này.
const FB_GRAPH = 'https://graph.facebook.com/v23.0';

const CONFIG = {
  google: {
    clientId: env.GOOGLE_CLIENT_ID,
    clientSecret: env.GOOGLE_CLIENT_SECRET,
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    scope: 'openid email profile',
  },
  facebook: {
    clientId: env.FACEBOOK_APP_ID,
    clientSecret: env.FACEBOOK_APP_SECRET,
    authUrl: 'https://www.facebook.com/v23.0/dialog/oauth',
    scope: 'email,public_profile',
  },
} as const;

export function isOAuthProvider(v: string): v is OAuthProviderName {
  return v === 'google' || v === 'facebook';
}

export function oauthEnabled(p: OAuthProviderName): boolean {
  return Boolean(CONFIG[p].clientId && CONFIG[p].clientSecret);
}

/** Phải khớp từng ký tự với Redirect URI đã khai ở trang quản lý app của nhà cung cấp. */
export function redirectUri(p: OAuthProviderName): string {
  return `${env.apiUrl}/api/auth/oauth/${p}/callback`;
}

export function authorizeUrl(p: OAuthProviderName, state: string): string {
  const c = CONFIG[p];
  const q = new URLSearchParams({
    client_id: c.clientId!,
    redirect_uri: redirectUri(p),
    response_type: 'code',
    scope: c.scope,
    state,
  });
  if (p === 'google') q.set('prompt', 'select_account');
  return `${c.authUrl}?${q.toString()}`;
}

async function getJson<T>(res: Response, what: string): Promise<T> {
  if (!res.ok) throw new Error(`${what} ${res.status}: ${await res.text()}`);
  return (await res.json()) as T;
}

/** Đổi `code` lấy hồ sơ người dùng. Lỗi mạng / code sai đều ném — route lo báo cho người dùng. */
export async function fetchProfile(p: OAuthProviderName, code: string): Promise<OAuthProfile> {
  const c = CONFIG[p];
  if (p === 'google') {
    const token = await getJson<{ access_token: string }>(
      await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        body: new URLSearchParams({
          code,
          client_id: c.clientId!,
          client_secret: c.clientSecret!,
          redirect_uri: redirectUri(p),
          grant_type: 'authorization_code',
        }),
      }),
      'Google token',
    );
    const u = await getJson<{
      sub: string;
      email?: string;
      email_verified?: boolean;
      name?: string;
    }>(
      await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
        headers: { Authorization: `Bearer ${token.access_token}` },
      }),
      'Google userinfo',
    );
    return {
      providerUserId: u.sub,
      email: u.email?.toLowerCase() ?? null,
      emailVerified: u.email_verified === true,
      name: u.name ?? null,
    };
  }

  const tokenUrl = new URL(`${FB_GRAPH}/oauth/access_token`);
  tokenUrl.search = new URLSearchParams({
    client_id: c.clientId!,
    client_secret: c.clientSecret!,
    redirect_uri: redirectUri(p),
    code,
  }).toString();
  const token = await getJson<{ access_token: string }>(await fetch(tokenUrl), 'Facebook token');
  const meUrl = new URL(`${FB_GRAPH}/me`);
  meUrl.search = new URLSearchParams({
    fields: 'id,name,email',
    access_token: token.access_token,
  }).toString();
  const u = await getJson<{ id: string; name?: string; email?: string }>(
    await fetch(meUrl),
    'Facebook me',
  );
  // Graph API chỉ trả email đã được Facebook xác nhận; không có email là không trả trường này.
  return {
    providerUserId: u.id,
    email: u.email?.toLowerCase() ?? null,
    emailVerified: Boolean(u.email),
    name: u.name ?? null,
  };
}
