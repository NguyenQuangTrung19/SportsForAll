import { forgotPasswordSchema } from '@sfa/shared';
import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AuthLayout, FormError } from '@/components/AuthLayout';
import { api, apiMessage } from '@/lib/api';

/** FR-001.6 — bước 1: xin link đặt lại mật khẩu. */
export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [invalid, setInvalid] = useState<string | null>(null);
  const send = useMutation({
    mutationFn: (value: string) => api.post('/auth/forgot-password', { email: value }),
  });

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = forgotPasswordSchema.safeParse({ email: email.trim() });
    if (!parsed.success) {
      setInvalid(parsed.error.issues[0]?.message ?? 'Email không hợp lệ');
      return;
    }
    setInvalid(null);
    send.mutate(parsed.data.email);
  };

  return (
    <AuthLayout eyebrow="Quên mật khẩu" title="Lấy lại quyền vào">
      {send.isSuccess ? (
        <div className="space-y-4 text-sm leading-relaxed">
          <p>
            Nếu <strong>{email.trim()}</strong> có tài khoản, link đặt lại mật khẩu đã được gửi tới
            hộp thư đó. Link dùng được trong <strong>30 phút</strong>.
          </p>
          <p className="text-ink-soft">Không thấy thư? Kiểm tra cả mục Spam / Quảng cáo.</p>
          <Link to="/login" className="btn-ghost w-full">
            Quay lại đăng nhập
          </Link>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-5" noValidate>
          <p className="text-sm text-ink-soft">
            Nhập email đã đăng ký, chúng tôi gửi link để đặt mật khẩu mới.
          </p>
          <label className="block">
            <span className="mb-2 block text-sm font-semibold">Email</span>
            <input
              type="email"
              autoComplete="email"
              placeholder="ban@example.com"
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            {invalid && (
              <span className="mt-1.5 block text-sm font-medium text-rust">{invalid}</span>
            )}
          </label>
          {send.isError && (
            <FormError>{apiMessage(send.error, 'Không gửi được, thử lại sau')}</FormError>
          )}
          <button type="submit" disabled={send.isPending} className="btn-primary w-full">
            {send.isPending ? 'Đang gửi...' : 'Gửi link đặt lại'}
          </button>
        </form>
      )}
    </AuthLayout>
  );
}
