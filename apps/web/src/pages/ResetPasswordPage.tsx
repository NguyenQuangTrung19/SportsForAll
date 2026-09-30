import { resetPasswordSchema } from '@sfa/shared';
import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AuthLayout, FormError } from '@/components/AuthLayout';
import { api, apiMessage } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';

/** FR-001.6 — bước 2: mở từ link trong email, đặt mật khẩu mới. */
export function ResetPasswordPage() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [invalid, setInvalid] = useState<string | null>(null);
  const reset = useMutation({
    mutationFn: (newPassword: string) => api.post('/auth/reset-password', { token, newPassword }),
    // Server đã thu hồi mọi phiên — phiên đang giữ ở máy này cũng chết, dọn luôn.
    onSuccess: () => useAuthStore.getState().clear(),
  });

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = resetPasswordSchema.safeParse({ token, newPassword: password });
    if (!parsed.success) {
      setInvalid(parsed.error.issues[0]?.message ?? 'Mật khẩu không hợp lệ');
      return;
    }
    if (password !== confirm) {
      setInvalid('Hai lần nhập không khớp');
      return;
    }
    setInvalid(null);
    reset.mutate(password);
  };

  if (!token) {
    return (
      <AuthLayout eyebrow="Đặt lại mật khẩu" title="Link không hợp lệ">
        <p className="text-sm">Link thiếu mã. Mở lại đúng link trong email, hoặc xin link mới.</p>
        <Link to="/forgot-password" className="btn-primary mt-5 w-full">
          Xin link mới
        </Link>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout eyebrow="Đặt lại mật khẩu" title="Mật khẩu mới">
      {reset.isSuccess ? (
        <div className="space-y-4 text-sm">
          <p>Đã đổi mật khẩu. Mọi thiết bị đang đăng nhập đã bị đăng xuất.</p>
          <Link to="/login" className="btn-primary w-full">
            Đăng nhập bằng mật khẩu mới
          </Link>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-5" noValidate>
          <label className="block">
            <span className="mb-2 block text-sm font-semibold">Mật khẩu mới</span>
            <input
              type="password"
              autoComplete="new-password"
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-semibold">Nhập lại</span>
            <input
              type="password"
              autoComplete="new-password"
              className="input"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
          </label>
          {invalid && <FormError>{invalid}</FormError>}
          {reset.isError && (
            <FormError>
              {apiMessage(reset.error, 'Không đặt lại được, thử lại sau')}{' '}
              <Link to="/forgot-password" className="underline">
                Xin link mới
              </Link>
            </FormError>
          )}
          <button type="submit" disabled={reset.isPending} className="btn-primary w-full">
            {reset.isPending ? 'Đang lưu...' : 'Đặt mật khẩu mới'}
          </button>
        </form>
      )}
    </AuthLayout>
  );
}
