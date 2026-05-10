import { zodResolver } from '@hookform/resolvers/zod';
import { registerSchema, type RegisterInput } from '@sfa/shared';
import { AxiosError } from 'axios';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { KineticText } from '@/components/KineticText';
import { useAuthStore } from '@/stores/auth-store';

export function RegisterPage() {
  const navigate = useNavigate();
  const registerUser = useAuthStore((s) => s.register);
  const [serverError, setServerError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const r = document.documentElement;
      r.style.setProperty('--mx', `${e.clientX}px`);
      r.style.setProperty('--my', `${e.clientY}px`);
    };
    window.addEventListener('pointermove', onMove);
    return () => window.removeEventListener('pointermove', onMove);
  }, []);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({ resolver: zodResolver(registerSchema) });

  const onSubmit = async (values: RegisterInput) => {
    setServerError(null);
    try {
      await registerUser(values);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      const message =
        err instanceof AxiosError
          ? (err.response?.data as { error?: { message?: string } })?.error?.message
          : null;
      setServerError(message ?? 'Đăng ký thất bại, thử lại sau');
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-night text-cream">
      {/* Background atmosphere */}
      <div className="mouse-spotlight pointer-events-none fixed inset-0 z-0" aria-hidden />
      <div className="grid-bg pointer-events-none fixed inset-0 z-0" aria-hidden />
      <div className="pointer-events-none fixed inset-0 z-0" aria-hidden>
        <div className="absolute -left-32 top-[18%] size-[28rem] animate-pulse-slow rounded-full bg-primary/20 blur-[120px]" />
        <div className="absolute -right-20 top-[55%] size-[22rem] animate-float rounded-full bg-ember/12 blur-[100px]" />
      </div>

      {/* Top nav */}
      <header className="relative z-10 border-b border-cream/10 bg-night/40 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4">
          <Link
            to="/"
            className="font-display text-2xl font-black uppercase leading-none tracking-tight text-cream md:text-3xl"
          >
            SportsForAll<span className="text-primary">.</span>
          </Link>
          <Link
            to="/"
            className="group inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.22em] text-cream/55 transition hover:text-cream"
          >
            <span aria-hidden className="transition-transform group-hover:-translate-x-1">
              ←
            </span>
            Quay lại trang chủ
          </Link>
        </div>
      </header>

      {/* Split */}
      <main className="relative z-10 mx-auto grid max-w-7xl gap-12 px-6 py-12 md:py-20 lg:grid-cols-12 lg:gap-16">
        {/* LEFT: branding */}
        <section className="lg:col-span-6 lg:pt-6">
          <div className="animate-fade-up stagger-1 mb-6 inline-flex items-center gap-3 rounded-full border border-cream/15 bg-cream/[0.04] px-4 py-1.5 backdrop-blur-md">
            <span className="relative inline-block size-2 rounded-full bg-primary">
              <span className="absolute inset-0 animate-ping rounded-full bg-primary opacity-70" />
            </span>
            <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-cream/80">
              Tạo tài khoản · Cộng đồng
            </span>
          </div>

          <h1>
            <span className="block font-display text-2xl font-bold uppercase leading-tight tracking-[0.22em] text-cream/55 md:text-3xl">
              <KineticText text="Gia nhập" baseDelay={80} />
            </span>
            <span
              className="mt-4 block font-sans text-[clamp(52px,9vw,104px)] font-black leading-[1.05] text-primary"
              style={{
                letterSpacing: '-0.025em',
                animation: 'glow-pulse 4.5s ease-in-out infinite',
              }}
            >
              <KineticText text="cộng đồng." baseDelay={260} />
            </span>
          </h1>

          <p className="animate-fade-up stagger-3 mt-8 max-w-md text-base leading-relaxed text-cream/70 md:text-lg">
            Một tài khoản — năm môn thể thao, ba vai trò. Đăng ký miễn phí, ra sân ngay tuần này.
          </p>

          {/* Mini stat strip */}
          <div className="animate-fade-up stagger-4 mt-12 hidden gap-10 md:flex">
            <Stat n="2'" label="Thời gian đăng ký" />
            <Stat n="0₫" label="Phí cho người chơi" />
            <Stat n="05" label="Môn thể thao" />
          </div>
        </section>

        {/* RIGHT: form card */}
        <section className="lg:col-span-6">
          <article className="animate-fade-up stagger-3 relative overflow-hidden rounded-3xl border border-cream/15 bg-gradient-to-br from-cream/[0.06] to-cream/[0.02] p-8 backdrop-blur-2xl shadow-[0_30px_80px_-20px_rgba(0,0,0,0.8),inset_0_1px_0_rgba(255,255,255,0.08)] md:p-10">
            <span
              className="pointer-events-none absolute inset-0 bg-gradient-to-br from-cream/[0.06] via-transparent to-transparent"
              aria-hidden
            />

            {/* Header */}
            <header className="relative flex items-baseline justify-between border-b border-cream/10 pb-5">
              <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-cream/70">
                Tài khoản mới
              </p>
              <span className="hidden font-mono text-[10px] uppercase tracking-[0.25em] text-cream/35 sm:inline">
                01 · Đăng ký
              </span>
            </header>

            <form
              onSubmit={handleSubmit(onSubmit)}
              className="relative mt-7 space-y-5"
              noValidate
            >
              <Field label="Tên hiển thị" error={errors.displayName?.message}>
                <input
                  type="text"
                  autoComplete="name"
                  placeholder="Nguyễn Văn A"
                  className="dark-input"
                  {...register('displayName')}
                />
              </Field>

              <Field label="Email" error={errors.email?.message}>
                <input
                  type="email"
                  autoComplete="email"
                  placeholder="ban@example.com"
                  className="dark-input"
                  {...register('email')}
                />
              </Field>

              <Field
                label="Mật khẩu"
                error={errors.password?.message}
                hint="Tối thiểu 8 ký tự"
              >
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    placeholder={showPassword ? 'matkhaucuaban' : '••••••••'}
                    className="dark-input"
                    style={{ paddingRight: '3rem' }}
                    {...register('password')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                    aria-pressed={showPassword}
                    className="absolute right-2 top-1/2 inline-flex size-9 -translate-y-1/2 items-center justify-center rounded-lg text-cream/45 transition hover:bg-cream/[0.06] hover:text-cream focus:outline-none focus:ring-2 focus:ring-primary/40"
                  >
                    {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                  </button>
                </div>
              </Field>

              {serverError && (
                <p className="rounded-xl border border-ember/35 bg-ember/10 p-3 font-mono text-[11px] uppercase tracking-wider text-ember">
                  {serverError}
                </p>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="group relative mt-2 flex w-full items-center justify-center gap-3 overflow-hidden rounded-full bg-primary px-7 py-4 font-mono text-[12px] font-semibold uppercase tracking-[0.22em] text-night shadow-[0_18px_50px_-12px_rgb(var(--color-primary))] transition hover:scale-[1.01] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <span
                  className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-cream/30 to-transparent"
                  style={{ animation: 'shine 2.4s ease-in-out infinite' }}
                  aria-hidden
                />
                <span className="relative">
                  {isSubmitting ? 'Đang tạo tài khoản...' : 'Tạo tài khoản'}
                </span>
                {!isSubmitting && (
                  <span aria-hidden className="relative inline-block animate-arrow-bob">
                    →
                  </span>
                )}
              </button>
            </form>

            {/* Divider */}
            <div className="relative my-7 flex items-center gap-4 text-cream/35">
              <span className="h-px flex-1 bg-cream/10" />
              <span className="font-mono text-[10px] uppercase tracking-[0.3em]">hoặc</span>
              <span className="h-px flex-1 bg-cream/10" />
            </div>

            {/* Secondary CTA */}
            <Link
              to="/login"
              className="group relative flex w-full items-center justify-center gap-3 rounded-full border-2 border-cream/20 bg-cream/[0.03] px-7 py-4 font-mono text-[12px] font-semibold uppercase tracking-[0.22em] text-cream backdrop-blur-md transition hover:border-cream/55 hover:bg-cream/[0.08]"
            >
              <span>Đã có tài khoản · Đăng nhập</span>
              <span aria-hidden className="transition-transform group-hover:translate-x-1">
                →
              </span>
            </Link>

            {/* Trust note */}
            <p className="relative mt-7 border-t border-cream/10 pt-5 text-center font-mono text-[10px] uppercase tracking-[0.3em] text-cream/40">
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
  hint,
  children,
}: {
  label: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block font-mono text-[10px] font-semibold uppercase tracking-[0.3em] text-cream/55">
        {label}
      </span>
      {children}
      {error ? (
        <span className="mt-2 block font-mono text-[11px] uppercase tracking-wider text-ember">
          {error}
        </span>
      ) : hint ? (
        <span className="mt-2 block font-mono text-[10px] uppercase tracking-[0.22em] text-cream/35">
          {hint}
        </span>
      ) : null}
    </label>
  );
}

function Stat({ n, label }: { n: string; label: string }) {
  return (
    <div>
      <p className="font-display text-3xl font-black leading-none text-primary drop-shadow-[0_0_20px_rgb(var(--color-primary)/0.4)] md:text-4xl">
        {n}
      </p>
      <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.3em] text-cream/55">
        {label}
      </p>
    </div>
  );
}

// Eye icons from Lucide (lucide.dev) — ISC licensed
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
