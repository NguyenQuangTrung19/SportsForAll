import type { AuthProviders } from '@sfa/shared';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

/** Cách đăng nhập nào server đang bật. Không đổi trong một phiên chạy nên cache vĩnh viễn. */
export function useAuthProviders() {
  return useQuery({
    queryKey: ['auth-providers'],
    queryFn: async () => (await api.get<AuthProviders>('/auth/providers')).data,
    staleTime: Infinity,
  });
}

/** Điều hướng cả trang (không phải XHR) — nhà cung cấp OAuth cần trình duyệt đi qua họ. */
export function oauthStartUrl(provider: 'google' | 'facebook'): string {
  return `${import.meta.env.VITE_API_URL ?? ''}/api/auth/oauth/${provider}/start`;
}
