import { useMutation } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AuthLayout, FormError } from '@/components/AuthLayout';
import { api, apiMessage } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';

/** FR-001.7 — mở từ link trong email. Tự gửi mã ngay khi vào trang. */
export function VerifyEmailPage() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const user = useAuthStore((s) => s.user);
  const verify = useMutation({
    mutationFn: async () =>
      (await api.post<{ userId: string | null }>('/auth/verify-email', { token })).data,
    onSuccess: (data) => {
      const { user: current, updateUser } = useAuthStore.getState();
      if (current && current.id === data.userId) updateUser({ emailVerified: true });
    },
  });

  // Mã dùng một lần: StrictMode chạy effect hai lần ở dev, lần thứ hai sẽ báo
  // "link đã dùng" dù lần đầu thành công.
  const sent = useRef(false);
  useEffect(() => {
    if (!token || sent.current) return;
    sent.current = true;
    verify.mutate();
  }, [token, verify]);

  const next = user ? '/dashboard' : '/login';
  return (
    <AuthLayout eyebrow="Xác thực email" title="Xác nhận địa chỉ">
      {!token && <FormError>Link thiếu mã. Mở lại đúng link trong email.</FormError>}
      {verify.isPending && <p className="text-sm text-ink-soft">Đang xác thực...</p>}
      {verify.isSuccess && (
        <div className="space-y-4 text-sm">
          <p>Email đã được xác thực. Cảm ơn bạn!</p>
          <Link to={next} className="btn-primary w-full">
            {user ? 'Vào trang chủ' : 'Đăng nhập'}
          </Link>
        </div>
      )}
      {verify.isError && (
        <div className="space-y-4">
          <FormError>{apiMessage(verify.error, 'Không xác thực được, thử lại sau')}</FormError>
          <p className="text-sm text-ink-soft">
            Đăng nhập rồi bấm “Gửi lại link” ở trang chủ để nhận link mới.
          </p>
          <Link to={next} className="btn-ghost w-full">
            {user ? 'Vào trang chủ' : 'Đăng nhập'}
          </Link>
        </div>
      )}
    </AuthLayout>
  );
}
