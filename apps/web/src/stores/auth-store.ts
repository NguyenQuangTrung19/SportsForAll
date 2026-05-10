import type { AuthResponse, AuthUser, LoginInput, RegisterInput } from '@sfa/shared';
import axios from 'axios';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const baseURL = import.meta.env.VITE_API_URL ?? '';

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  hydrated: boolean;
  setSession: (data: AuthResponse) => void;
  clear: () => void;
  login: (input: LoginInput) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      hydrated: false,
      setSession: (data) =>
        set({
          user: data.user,
          accessToken: data.tokens.accessToken,
          refreshToken: data.tokens.refreshToken,
        }),
      clear: () => set({ user: null, accessToken: null, refreshToken: null }),
      login: async (input) => {
        const { data } = await axios.post<AuthResponse>(`${baseURL}/api/auth/login`, input, {
          withCredentials: true,
        });
        get().setSession(data);
      },
      register: async (input) => {
        const { data } = await axios.post<AuthResponse>(
          `${baseURL}/api/auth/register`,
          input,
          { withCredentials: true },
        );
        get().setSession(data);
      },
      logout: async () => {
        const refreshToken = get().refreshToken;
        try {
          if (refreshToken) {
            await axios.post(
              `${baseURL}/api/auth/logout`,
              { refreshToken },
              { withCredentials: true },
            );
          }
        } finally {
          get().clear();
        }
      },
    }),
    {
      name: 'sfa.auth',
      partialize: (s) => ({ user: s.user, refreshToken: s.refreshToken }),
      onRehydrateStorage: () => (state) => {
        if (state) state.hydrated = true;
      },
    },
  ),
);
