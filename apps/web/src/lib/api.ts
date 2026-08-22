import type { AuthResponse } from '@sfa/shared';
import axios, { AxiosError, type AxiosRequestConfig } from 'axios';
import { useAuthStore } from '@/stores/auth-store';

/**
 * Lấy câu lỗi API đã viết sẵn bằng tiếng Việt, lùi về `fallback` khi lỗi không
 * đến từ server (mất mạng, huỷ request). Mọi endpoint đều trả cùng một hình
 * dạng `{ error: { code, message } }` — xem `middleware/error.ts` phía API.
 */
export function apiMessage(err: unknown, fallback: string): string {
  if (err instanceof AxiosError) {
    const message = (err.response?.data as { error?: { message?: string } })?.error?.message;
    if (message) return message;
  }
  return fallback;
}

const baseURL = import.meta.env.VITE_API_URL ?? '';

export const api = axios.create({
  baseURL: `${baseURL}/api`,
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const accessToken = useAuthStore.getState().accessToken;
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

let refreshing: Promise<string | null> | null = null;

async function refreshSession(): Promise<string | null> {
  const { refreshToken, setSession, clear } = useAuthStore.getState();
  if (!refreshToken) {
    clear();
    return null;
  }
  try {
    const { data } = await axios.post<AuthResponse>(
      `${baseURL}/api/auth/refresh`,
      { refreshToken },
      { withCredentials: true },
    );
    setSession(data);
    return data.tokens.accessToken;
  } catch {
    clear();
    return null;
  }
}

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as (AxiosRequestConfig & { _retry?: boolean }) | undefined;
    const status = error.response?.status;
    if (status !== 401 || !original || original._retry) {
      return Promise.reject(error);
    }
    if (original.url?.includes('/auth/refresh') || original.url?.includes('/auth/login')) {
      return Promise.reject(error);
    }
    original._retry = true;
    refreshing ??= refreshSession().finally(() => {
      refreshing = null;
    });
    const newAccess = await refreshing;
    if (!newAccess) return Promise.reject(error);
    original.headers = { ...original.headers, Authorization: `Bearer ${newAccess}` };
    return api.request(original);
  },
);
