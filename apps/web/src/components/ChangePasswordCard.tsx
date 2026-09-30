import { changePasswordSchema, setPasswordSchema, type AuthResponse } from '@sfa/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { useState } from 'react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';

/**
 * Đổi mật khẩu (FR-002.10). Server thu hồi mọi phiên cũ và cấp phiên mới.
 *
 * Tài khoản tạo bằng Google/Facebook/OTP chưa có mật khẩu (`hasPassword = false`):
 * thẻ thành "Đặt mật khẩu", không hỏi mật khẩu hiện tại.
 */
export function ChangePasswordCard({ hasPassword }: { hasPassword: boolean }) {
  const setSession = useAuthStore((s) => s.setSession);
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const reset = () => {
    setCurrent('');
    setNext('');
    setConfirm('');
    setError(null);
  };

  const mutation = useMutation({
    mutationFn: async () => {
      if (!hasPassword) {
        await api.post('/auth/set-password', { newPassword: next });
        return null;
      }
      const { data } = await api.post<AuthResponse>('/auth/change-password', {
        currentPassword: current,
        newPassword: next,
      });
      return data;
    },
    onSuccess: (data) => {
      if (data)
        setSession(data); // phiên cũ đã bị thu hồi, phải thay token ngay
      else void queryClient.invalidateQueries({ queryKey: ['profile', 'me'] });
      reset();
      setOpen(false);
      setDone(true);
    },
    onError: (err: unknown) => {
      setError(
        err instanceof AxiosError
          ? ((err.response?.data as { error?: { message?: string } })?.error?.message ??
              'Không đổi được mật khẩu')
          : 'Không đổi được mật khẩu',
      );
    },
  });

  const submit = () => {
    setError(null);
    if (next !== confirm) {
      setError('Hai ô mật khẩu mới không khớp');
      return;
    }
    const parsed = hasPassword
      ? changePasswordSchema.safeParse({ currentPassword: current, newPassword: next })
      : setPasswordSchema.safeParse({ newPassword: next });
    if (!parsed.success) {
      const first = Object.values(parsed.error.flatten().fieldErrors)[0]?.[0];
      setError(first ?? 'Dữ liệu không hợp lệ');
      return;
    }
    mutation.mutate();
  };

  return (
    <section className="mt-6 border border-ink/12 bg-white p-6 md:p-8">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-black tracking-tight">Mật khẩu</h2>
          <p className="mt-1 text-sm text-ink-soft">
            {hasPassword
              ? 'Đổi mật khẩu sẽ đăng xuất toàn bộ thiết bị khác.'
              : 'Tài khoản đang đăng nhập bằng Google, Facebook hoặc mã SMS. Đặt thêm mật khẩu để đăng nhập bằng email / số điện thoại.'}
          </p>
        </div>
        {!open && (
          <button
            type="button"
            onClick={() => {
              setOpen(true);
              setDone(false);
            }}
            className="btn-ghost"
          >
            {hasPassword ? 'Đổi mật khẩu' : 'Đặt mật khẩu'}
          </button>
        )}
      </div>

      {done && !open && (
        <p className="mt-4 border border-ink/15 bg-paper-2 px-3 py-2 text-sm font-medium text-ink">
          Đã lưu mật khẩu.
        </p>
      )}

      {open && (
        <div className="mt-6 space-y-4 border-t border-ink/10 pt-6">
          {hasPassword && (
            <Field label="Mật khẩu hiện tại" value={current} onChange={setCurrent} autoFocus />
          )}
          <Field label="Mật khẩu mới" value={next} onChange={setNext} autoFocus={!hasPassword} />
          <Field label="Nhập lại mật khẩu mới" value={confirm} onChange={setConfirm} />

          {error && (
            <p className="border border-rust bg-rust/5 px-3 py-2 text-sm font-medium text-rust">
              {error}
            </p>
          )}

          <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                reset();
              }}
              disabled={mutation.isPending}
              className="text-sm font-semibold text-ink-soft transition hover:text-ink disabled:opacity-50"
            >
              Huỷ
            </button>
            <button
              type="button"
              onClick={submit}
              disabled={mutation.isPending}
              className="btn-primary"
            >
              {mutation.isPending ? 'Đang lưu...' : 'Lưu mật khẩu'}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

function Field({
  label,
  value,
  onChange,
  autoFocus,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  autoFocus?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-xs font-bold tracking-wide text-ink-soft">{label}</span>
      <input
        type="password"
        autoComplete={label === 'Mật khẩu hiện tại' ? 'current-password' : 'new-password'}
        autoFocus={autoFocus}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="input mt-1.5"
      />
    </label>
  );
}
