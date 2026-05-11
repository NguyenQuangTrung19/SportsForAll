import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, type LoginInput } from '@sfa/shared';
import { AxiosError } from 'axios';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth-store';

export function LoginPage() {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const [serverError, setServerError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (values: LoginInput) => {
    setServerError(null);
    try {
      await login(values);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      const message =
        err instanceof AxiosError
          ? (err.response?.data as { error?: { message?: string } })?.error?.message
          : null;
      setServerError(message ?? 'Đăng nhập thất bại, thử lại sau');
    }
  };

  return (
    <div className="min-h-screen bg-paper text-ink">
      <header className="border-b border-ink/10">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
          <Link
            to="/"
            className="font-display text-2xl font-black uppercase leading-none tracking-tight"
          >
            SportsForAll<span className="text-primary">.</span>
          </Link>
          <Link to="/" className="text-sm font-semibold text-ink-soft hover:text-ink">
            ← Trang chủ
          </Link>
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl gap-12 px-6 py-12 lg:grid-cols-12 lg:gap-16 lg:py-20">
        {/* Left: poster */}
        <section className="lg:col-span-7">
          <p className="text-xs font-bold uppercase tracking-wide text-ink-soft">
            Đăng nhập
          </p>
          <h1 className="mt-3 font-display text-[clamp(56px,9vw,112px)] font-black uppercase leading-[0.88] tracking-tight">
            Chào
            <br />
            <span className="text-primary">trở lại.</span>
          </h1>
          <div
            className="mt-6 h-[3px] origin-left bg-ink animate-draw-line"
            aria-hidden
          />
          <p className="mt-6 max-w-md text-base leading-relaxed text-ink-soft md:text-lg">
            Tìm trận, tìm bạn, ra sân. Một tài khoản — năm môn thể thao — ba vai trò.
          </p>

          <dl className="mt-10 grid max-w-md grid-cols-3 gap-6">
            <Stat n="05" label="Môn thể thao" />
            <Stat n="03" label="Vai trò" />
            <Stat n="0₫" label="Phí" />
          </dl>
        </section>

        {/* Right: form */}
        <section className="lg:col-span-5">
          <article className="border border-ink/15 bg-white p-8 shadow-[6px_6px_0_rgba(15,17,21,0.08)] md:p-10">
            <header className="flex items-baseline justify-between border-b border-ink/10 pb-4">
              <h2 className="font-display text-2xl font-black uppercase tracking-tight">
                Đăng nhập
              </h2>
              <span className="text-xs font-bold uppercase tracking-wide text-ink-soft">
                01 · Xác thực
              </span>
            </header>

            <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-5" noValidate>
              <Field label="Email" error={errors.email?.message}>
                <input
                  type="email"
                  autoComplete="username"
                  placeholder="ban@example.com"
                  className="input"
                  {...register('email')}
                />
              </Field>
              <Field label="Mật khẩu" error={errors.password?.message}>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="••••••••"
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

              <button
                type="submit"
                disabled={isSubmitting}
                className="btn-primary w-full"
              >
                {isSubmitting ? 'Đang đăng nhập...' : 'Đăng nhập'}
                {!isSubmitting && (
                  <span aria-hidden className="animate-arrow-bob">
                    →
                  </span>
                )}
              </button>
            </form>

            <div className="my-7 flex items-center gap-4 text-ink-soft/40">
              <span className="h-px flex-1 bg-ink/10" />
              <span className="text-xs font-semibold uppercase">hoặc</span>
              <span className="h-px flex-1 bg-ink/10" />
            </div>

            <Link to="/register" className="btn-ghost w-full">
              Tạo tài khoản mới <span aria-hidden>→</span>
            </Link>

            <p className="mt-7 border-t border-ink/10 pt-5 text-center text-xs text-ink-soft">
              Bảo mật bằng argon2 · không lưu mật khẩu thô
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
      {error && (
        <span className="mt-1.5 block text-sm font-medium text-rust">{error}</span>
      )}
    </label>
  );
}

function Stat({ n, label }: { n: string; label: string }) {
  return (
    <div>
      <p className="poster-num text-5xl text-primary">{n}</p>
      <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-ink-soft">
        {label}
      </p>
    </div>
  );
}

function EyeIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49" />
      <path d="M14.084 14.158a3 3 0 0 1-4.242-4.242" />
      <path d="M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143" />
      <path d="m2 2 20 20" />
    </svg>
  );
}
