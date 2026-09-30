import { zodResolver } from '@hookform/resolvers/zod';
import {
  SIGNUP_ACCOUNT_TYPES,
  SIGNUP_ACCOUNT_TYPE_LABELS,
  registerSchema,
  type RegisterInput,
} from '@sfa/shared';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { AltSignIn } from '@/components/AuthLayout';
import { useAuthStore } from '@/stores/auth-store';
import { apiMessage } from '@/lib/api';

export function RegisterPage() {
  const navigate = useNavigate();
  const registerUser = useAuthStore((s) => s.register);
  const [serverError, setServerError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: { accountType: 'user' },
  });

  const accountType = watch('accountType');

  const onSubmit = async (values: RegisterInput) => {
    setServerError(null);
    try {
      await registerUser(values);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setServerError(apiMessage(err, 'Đăng ký thất bại, thử lại sau'));
    }
  };

  return (
    <div className="min-h-screen bg-paper text-ink">
      <header className="border-b border-ink/10">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
          <Link to="/" className="font-display text-2xl font-black leading-none tracking-tight">
            SportsForAll<span className="text-primary-dark">.</span>
          </Link>
          <Link to="/login" className="text-sm font-semibold text-ink-soft hover:text-ink">
            Đã có tài khoản? Đăng nhập →
          </Link>
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl gap-12 px-6 py-12 lg:grid-cols-12 lg:gap-16 lg:py-20">
        <section className="lg:col-span-7">
          <p className="text-xs font-bold tracking-wide text-ink-soft">Tạo tài khoản</p>
          <h1 className="mt-3 font-display text-[clamp(56px,9vw,112px)] leading-[1] tracking-tight">
            Bắt đầu
            <br />
            <span className="text-primary-dark">ngay hôm nay.</span>
          </h1>
          <div className="mt-6 h-[3px] origin-left bg-ink animate-draw-line" aria-hidden />
          <p className="mt-6 max-w-md text-base leading-relaxed text-ink-soft md:text-lg">
            Sau khi đăng ký, bạn sẽ chọn môn thể thao và điền vài thông tin để cộng đồng dễ tìm thấy
            bạn.
          </p>

          <ol className="mt-10 max-w-md space-y-3">
            <PosterStep n="01" title="Tạo tài khoản" desc="Email + mật khẩu — 30 giây" />
            <PosterStep n="02" title="Chọn môn" desc="Một hoặc nhiều môn ưa thích" />
            <PosterStep n="03" title="Hoàn thiện hồ sơ" desc="Trình độ, vị trí, khu vực" />
          </ol>
        </section>

        <section className="lg:col-span-5">
          <article className="border border-ink/15 bg-white p-8 shadow-[6px_6px_0_rgba(15,17,21,0.08)] md:p-10">
            <header className="flex items-baseline justify-between border-b border-ink/10 pb-4">
              <h2 className="font-display text-2xl font-black tracking-tight">Đăng ký</h2>
              <span className="text-xs font-bold tracking-wide text-ink-soft">01 · Tài khoản</span>
            </header>

            <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-5" noValidate>
              {/* FR-008.1 — chủ sân đăng ký ngay từ đây, không cần admin nâng quyền hộ. */}
              <fieldset>
                <legend className="mb-2 text-xs font-semibold tracking-wide text-ink-soft">
                  Bạn là
                </legend>
                <div className="flex flex-wrap gap-2">
                  {SIGNUP_ACCOUNT_TYPES.map((t) => (
                    <label
                      key={t}
                      className={`inline-flex cursor-pointer items-center border px-4 py-2 text-sm font-semibold transition ${
                        accountType === t
                          ? 'border-ink bg-ink text-paper'
                          : 'border-ink/15 bg-white text-ink hover:border-ink'
                      }`}
                    >
                      <input
                        type="radio"
                        value={t}
                        className="sr-only"
                        {...register('accountType')}
                      />
                      {SIGNUP_ACCOUNT_TYPE_LABELS[t]}
                    </label>
                  ))}
                </div>
                <p className="mt-2 text-xs text-ink-soft">
                  {accountType === 'business'
                    ? 'Tài khoản chủ sân đăng được sân bãi và nhận đơn đặt sân.'
                    : 'Tài khoản người chơi: lập đội, tìm đối, thuê sân.'}
                </p>
              </fieldset>

              <Field label="Tên hiển thị" error={errors.displayName?.message}>
                <input
                  type="text"
                  autoComplete="name"
                  placeholder="VD: Nguyễn Trọng"
                  className="input"
                  {...register('displayName')}
                />
              </Field>

              <Field label="Email" error={errors.email?.message}>
                <input
                  type="email"
                  autoComplete="email"
                  placeholder="ban@example.com"
                  className="input"
                  {...register('email')}
                />
              </Field>

              <Field label="Mật khẩu" error={errors.password?.message}>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    placeholder="Tối thiểu 8 ký tự"
                    className="input pr-12"
                    {...register('password')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                    className="absolute right-2 top-1/2 inline-flex size-9 -translate-y-1/2 items-center justify-center text-ink-soft transition hover:text-ink"
                  >
                    {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                  </button>
                </div>
              </Field>

              {serverError && (
                <p className="border border-rust bg-rust/5 px-3 py-2 text-sm font-medium text-rust">
                  {serverError}
                </p>
              )}

              <button type="submit" disabled={isSubmitting} className="btn-primary w-full">
                {isSubmitting ? 'Đang tạo...' : 'Tạo tài khoản'}
                {!isSubmitting && (
                  <span aria-hidden className="animate-arrow-bob">
                    →
                  </span>
                )}
              </button>
            </form>

            <div className="my-7 flex items-center gap-4 text-ink-soft/40">
              <span className="h-px flex-1 bg-ink/10" />
              <span className="text-xs font-semibold">hoặc</span>
              <span className="h-px flex-1 bg-ink/10" />
            </div>

            <AltSignIn />

            <p className="mt-6 text-center text-xs text-ink-soft">
              Đăng ký đồng nghĩa bạn đồng ý với điều khoản & quyền riêng tư.
            </p>
          </article>
        </section>
      </main>
    </div>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-ink">{label}</span>
      {children}
      {error && <span className="mt-1.5 block text-sm font-medium text-rust">{error}</span>}
    </label>
  );
}

function PosterStep({ n, title, desc }: { n: string; title: string; desc: string }) {
  return (
    <li className="flex items-start gap-4 border-b border-ink/10 pb-3 last:border-b-0 last:pb-0">
      <span className="poster-num w-12 shrink-0 text-4xl text-primary-dark">{n}</span>
      <div>
        <p className="font-display text-lg font-black leading-tight tracking-tight">{title}</p>
        <p className="mt-0.5 text-sm text-ink-soft">{desc}</p>
      </div>
    </li>
  );
}

function EyeIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49" />
      <path d="M14.084 14.158a3 3 0 0 1-4.242-4.242" />
      <path d="M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143" />
      <path d="m2 2 20 20" />
    </svg>
  );
}
