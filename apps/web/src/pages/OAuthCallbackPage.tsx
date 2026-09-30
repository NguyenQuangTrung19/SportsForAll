import type { AuthResponse } from '@sfa/shared';
import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, apiMessage } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';

/**
 * API chuyển về đây sau khi Google/Facebook xác nhận, kèm mã dùng một lần sau `#`.
 * Đổi mã lấy phiên rồi đi tiếp; lỗi thì về trang đăng nhập kèm lời nhắn.
 */
export function OAuthCallbackPage() {
  const navigate = useNavigate();
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const code = new URLSearchParams(window.location.hash.slice(1)).get('code');
    // Xoá mã khỏi thanh địa chỉ để không nằm lại trong lịch sử trình duyệt.
    window.history.replaceState(null, '', window.location.pathname);
    if (!code) {
      navigate('/login?error=' + encodeURIComponent('Thiếu mã đăng nhập, thử lại'), {
        replace: true,
      });
      return;
    }
    api
      .post<AuthResponse>('/auth/oauth/exchange', { token: code })
      .then(({ data }) => {
        useAuthStore.getState().setSession(data);
        navigate('/dashboard', { replace: true });
      })
      .catch((err: unknown) => {
        const message = apiMessage(err, 'Không đăng nhập được, thử lại sau');
        navigate('/login?error=' + encodeURIComponent(message), { replace: true });
      });
  }, [navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-paper">
      <p className="text-sm text-ink-soft">Đang đăng nhập...</p>
    </div>
  );
}
