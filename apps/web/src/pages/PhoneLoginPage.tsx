import {
  OTP_LENGTH,
  SIGNUP_ACCOUNT_TYPES,
  SIGNUP_ACCOUNT_TYPE_LABELS,
  phoneStartSchema,
  type AuthResponse,
  type SignupAccountType,
} from '@sfa/shared';
import { useMutation } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthLayout, FormError } from '@/components/AuthLayout';
import { api, apiMessage } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';

const RESEND_SECONDS = 60;

function errorCode(err: unknown): string | undefined {
  return err instanceof AxiosError
    ? (err.response?.data as { error?: { code?: string } })?.error?.code
    : undefined;
}

/**
 * FR-001.2 — đăng ký / đăng nhập bằng số điện thoại. Một luồng cho cả hai: số đã
 * có tài khoản thì vào luôn, chưa có thì API trả `DISPLAY_NAME_REQUIRED` và trang
 * hỏi thêm tên rồi gửi lại cùng mã.
 */
export function PhoneLoginPage() {
  const navigate = useNavigate();
  const [phone, setPhone] = useState('');
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [needName, setNeedName] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [accountType, setAccountType] = useState<SignupAccountType>('user');
  const [invalid, setInvalid] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const start = useMutation({
    mutationFn: (value: string) => api.post('/auth/phone/start', { phone: value }),
    onSuccess: (_res, value) => {
      setSentTo(value);
      setCode('');
      setCooldown(RESEND_SECONDS);
    },
  });

  const verify = useMutation({
    mutationFn: async () =>
      (
        await api.post<AuthResponse>('/auth/phone/verify', {
          phone: sentTo,
          code: code.trim(),
          ...(needName && { displayName: displayName.trim(), accountType }),
        })
      ).data,
    onSuccess: (data) => {
      useAuthStore.getState().setSession(data);
      navigate('/dashboard', { replace: true });
    },
    onError: (err) => {
      if (errorCode(err) === 'DISPLAY_NAME_REQUIRED') setNeedName(true);
    },
  });

  const sendCode = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = phoneStartSchema.safeParse({ phone });
    if (!parsed.success) {
      setInvalid(parsed.error.issues[0]?.message ?? 'Số điện thoại không hợp lệ');
      return;
    }
    setInvalid(null);
    start.mutate(parsed.data.phone);
  };

  const submitCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!new RegExp(`^\\d{${OTP_LENGTH}}$`).test(code.trim())) {
      setInvalid(`Mã gồm ${OTP_LENGTH} chữ số`);
      return;
    }
    if (needName && displayName.trim().length < 2) {
      setInvalid('Tên hiển thị tối thiểu 2 ký tự');
      return;
    }
    setInvalid(null);
    verify.mutate();
  };

  // Lỗi "cần tên" là một bước của luồng, không phải lỗi — không hiện khung đỏ.
  const verifyError =
    verify.isError && errorCode(verify.error) !== 'DISPLAY_NAME_REQUIRED'
      ? apiMessage(verify.error, 'Không xác thực được, thử lại sau')
      : null;

  if (!sentTo) {
    return (
      <AuthLayout eyebrow="Số điện thoại" title="Nhận mã qua SMS">
        <form onSubmit={sendCode} className="space-y-5" noValidate>
          <p className="text-sm text-ink-soft">
            Chưa có tài khoản thì tạo mới, có rồi thì đăng nhập — cùng một bước.
          </p>
          <label className="block">
            <span className="mb-2 block text-sm font-semibold">Số điện thoại</span>
            <input
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="0912345678"
              maxLength={12}
              className="input"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </label>
          {invalid && <FormError>{invalid}</FormError>}
          {start.isError && (
            <FormError>{apiMessage(start.error, 'Không gửi được mã, thử lại sau')}</FormError>
          )}
          <button type="submit" disabled={start.isPending} className="btn-primary w-full">
            {start.isPending ? 'Đang gửi...' : 'Gửi mã'}
          </button>
          <Link to="/login" className="btn-ghost w-full">
            Dùng email thay thế
          </Link>
        </form>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout eyebrow="Số điện thoại" title={needName ? 'Tạo tài khoản' : 'Nhập mã'}>
      <form onSubmit={submitCode} className="space-y-5" noValidate>
        <p className="text-sm text-ink-soft">
          Mã {OTP_LENGTH} số đã gửi tới <strong className="text-ink">{sentTo}</strong>, hết hạn sau
          5 phút.{' '}
          <button
            type="button"
            className="font-semibold underline"
            onClick={() => {
              setSentTo(null);
              setNeedName(false);
              start.reset();
              verify.reset();
            }}
          >
            Đổi số
          </button>
        </p>
        <label className="block">
          <span className="mb-2 block text-sm font-semibold">Mã xác thực</span>
          <input
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={OTP_LENGTH}
            className="input tracking-[0.4em]"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
          />
        </label>

        {needName && (
          <>
            <p className="border-l-2 border-ink pl-3 text-sm">
              Số này chưa có tài khoản. Nhập tên để tạo tài khoản mới.
            </p>
            <label className="block">
              <span className="mb-2 block text-sm font-semibold">Tên hiển thị</span>
              <input
                className="input"
                maxLength={50}
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />
            </label>
            <fieldset>
              <legend className="mb-2 text-sm font-semibold">Loại tài khoản</legend>
              <div className="grid grid-cols-2 gap-3">
                {SIGNUP_ACCOUNT_TYPES.map((t) => (
                  <label
                    key={t}
                    className={`cursor-pointer border px-3 py-2 text-center text-sm font-semibold ${
                      accountType === t ? 'border-ink bg-ink text-paper' : 'border-ink/15'
                    }`}
                  >
                    <input
                      type="radio"
                      name="accountType"
                      className="sr-only"
                      checked={accountType === t}
                      onChange={() => setAccountType(t)}
                    />
                    {SIGNUP_ACCOUNT_TYPE_LABELS[t]}
                  </label>
                ))}
              </div>
            </fieldset>
          </>
        )}

        {invalid && <FormError>{invalid}</FormError>}
        {verifyError && <FormError>{verifyError}</FormError>}
        {start.isError && (
          <FormError>{apiMessage(start.error, 'Không gửi lại được mã, thử lại sau')}</FormError>
        )}

        <button type="submit" disabled={verify.isPending} className="btn-primary w-full">
          {verify.isPending ? 'Đang kiểm tra...' : needName ? 'Tạo tài khoản' : 'Xác nhận'}
        </button>
        <button
          type="button"
          disabled={cooldown > 0 || start.isPending}
          onClick={() => start.mutate(sentTo)}
          className="btn-ghost w-full"
        >
          {cooldown > 0 ? `Gửi lại mã sau ${cooldown}s` : 'Gửi lại mã'}
        </button>
      </form>
    </AuthLayout>
  );
}
