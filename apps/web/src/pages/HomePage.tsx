import { SPORT_THEMES, SPORTS, type SportSlug } from '@sfa/shared';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { KineticText } from '@/components/KineticText';
import { useAuthStore } from '@/stores/auth-store';
import { applySportTheme, useSportStore } from '@/stores/sport-store';

/* -------------------------------------------------------------------------- */
/* Hooks                                                                       */
/* -------------------------------------------------------------------------- */

function useTilt(strength = 6) {
  const [tilt, setTilt] = useState({ rx: 0, ry: 0 });
  const onMouseMove = (e: React.MouseEvent<HTMLElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    setTilt({ rx: (py - 0.5) * -strength, ry: (px - 0.5) * strength });
  };
  const onMouseLeave = () => setTilt({ rx: 0, ry: 0 });
  const style: React.CSSProperties = {
    transform: `perspective(1400px) rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg)`,
    transition: 'transform 0.18s ease-out',
  };
  return { onMouseMove, onMouseLeave, style };
}

function CountUp({ to, suffix }: { to: number; suffix?: string }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    const dur = 1400;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - t, 3);
      setN(Math.round(to * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [to]);
  return (
    <span className="tabular-nums">
      {n}
      {suffix ?? ''}
    </span>
  );
}

const ONBOARDING_TIPS = [
  {
    eyebrow: 'Gợi ý · bước tiếp theo',
    title: 'Tạo đội đầu tiên của bạn',
    body: 'Đội của bạn sẽ xuất hiện trong feed của những người chơi cùng môn, cùng khu vực.',
    cta: 'Bắt đầu',
  },
  {
    eyebrow: 'Hoàn thiện hồ sơ',
    title: 'Chọn trình độ cho mỗi môn',
    body: 'Cộng đồng sẽ ghép trận đấu phù hợp hơn khi biết bạn chơi ở mức nào.',
    cta: 'Cập nhật',
  },
  {
    eyebrow: 'Đăng tin đầu tiên',
    title: 'Tìm đồng đội cùng quận',
    body: 'Một bài đăng đơn giản — môn, thời gian, sân — và cộng đồng tìm bạn cho bạn.',
    cta: 'Đăng tin',
  },
] as const;

/* -------------------------------------------------------------------------- */
/* Page                                                                        */
/* -------------------------------------------------------------------------- */

export function HomePage() {
  const current = useSportStore((s) => s.current);
  const setCurrent = useSportStore((s) => s.setCurrent);
  const theme = SPORT_THEMES[current];
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const givenName = user?.displayName?.trim().split(/\s+/).pop() ?? 'bạn';
  const initial = (user?.displayName ?? '?').trim().charAt(0).toUpperCase();
  const today = new Date().toLocaleDateString('vi-VN', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
  });

  const [tipIdx, setTipIdx] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTipIdx((i) => (i + 1) % ONBOARDING_TIPS.length), 4500);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const r = document.documentElement;
      r.style.setProperty('--mx', `${e.clientX}px`);
      r.style.setProperty('--my', `${e.clientY}px`);
    };
    window.addEventListener('pointermove', onMove);
    return () => window.removeEventListener('pointermove', onMove);
  }, []);

  const previewSport = (slug: SportSlug) => applySportTheme(slug);
  const resetSport = () => applySportTheme(current);
  const selectSport = (slug: SportSlug) => {
    setCurrent(slug);
    applySportTheme(slug);
  };

  const todayTilt = useTilt(8);
  const feedTilt = useTilt(4);
  const profileTilt = useTilt(7);
  const tipTilt = useTilt(7);

  const tip = ONBOARDING_TIPS[tipIdx]!;

  return (
    <div className="relative min-h-screen overflow-hidden bg-night text-cream">
      <div className="mouse-spotlight pointer-events-none fixed inset-0 z-0" aria-hidden />
      <div className="grid-bg pointer-events-none fixed inset-0 z-0" aria-hidden />
      <div className="pointer-events-none fixed inset-0 z-0" aria-hidden>
        <div className="absolute -left-32 top-[18%] size-[28rem] animate-pulse-slow rounded-full bg-primary/15 blur-[120px]" />
        <div className="absolute -right-20 top-[55%] size-[22rem] animate-float rounded-full bg-ember/10 blur-[100px]" />
      </div>

      {/* Top nav */}
      <header className="relative z-10 border-b border-cream/10 bg-night/40 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4">
          <Link
            to="/dashboard"
            className="font-display text-2xl font-black uppercase leading-none tracking-tight text-cream md:text-3xl"
          >
            SportsForAll<span className="text-primary">.</span>
          </Link>

          <nav className="hidden items-center gap-7 font-mono text-[11px] uppercase tracking-[0.22em] text-cream/55 md:flex">
            <a href="#feed" className="transition hover:text-cream">
              Cơ hội
            </a>
            <a href="#actions" className="transition hover:text-cream">
              Hành động
            </a>
            <a href="#profile" className="transition hover:text-cream">
              Hồ sơ
            </a>
          </nav>

          <div className="flex items-center gap-3">
            {user && (
              <>
                <div
                  className="flex size-10 items-center justify-center rounded-full border border-cream/15 bg-cream/[0.04] font-display text-sm font-black uppercase text-primary backdrop-blur-md"
                  aria-hidden
                >
                  {initial}
                </div>
                <button
                  type="button"
                  onClick={() => void logout()}
                  className="rounded-full border border-cream/15 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.22em] text-cream/65 transition hover:border-ember/50 hover:text-ember"
                >
                  Thoát
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-7xl px-6 py-10 md:py-14">
        {/* Welcome strip */}
        <section className="mb-10 grid gap-6 md:mb-14 lg:grid-cols-12 lg:items-end lg:gap-10">
          <div className="lg:col-span-8">
            <div className="animate-fade-up stagger-1 mb-5 inline-flex items-center gap-3 rounded-full border border-cream/15 bg-cream/[0.04] px-4 py-1.5 backdrop-blur-md">
              <span className="relative inline-block size-2 rounded-full bg-primary">
                <span className="absolute inset-0 animate-ping rounded-full bg-primary opacity-70" />
              </span>
              <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-cream/80">
                Bảng điều khiển · {theme.nameVi}
              </span>
            </div>

            <h1 className="font-display font-black uppercase tracking-tight">
              <span className="block text-xl font-bold leading-tight tracking-[0.22em] text-cream/55 md:text-2xl">
                <KineticText text="Chào," baseDelay={80} />
              </span>
              <span
                className="mt-2 block font-sans text-[clamp(40px,6.5vw,76px)] font-black leading-[1] tracking-tight text-primary"
                style={{
                  letterSpacing: '-0.025em',
                  animation: 'glow-pulse 5s ease-in-out infinite',
                }}
              >
                <KineticText text={`${givenName}.`} baseDelay={240} />
              </span>
            </h1>

            <p className="animate-fade-up stagger-3 mt-4 max-w-xl text-sm leading-relaxed text-cream/65 md:text-base">
              Sẵn sàng cho trận tiếp theo? Chọn môn và bắt đầu khám phá cơ hội đang mở.
            </p>
          </div>

          {/* Today card with 3D tilt + count-up */}
          <aside className="animate-fade-up stagger-3 lg:col-span-4">
            <div
              {...todayTilt}
              className="rounded-2xl border border-cream/15 bg-gradient-to-br from-cream/[0.06] to-cream/[0.02] p-5 backdrop-blur-2xl"
            >
              <div className="flex items-baseline justify-between font-mono text-[10px] uppercase tracking-[0.25em] text-cream/55">
                <span>Hôm nay</span>
                <span className="text-cream/40">{today}</span>
              </div>
              <p className="mt-3 font-display text-3xl font-black uppercase leading-tight tracking-tight text-cream md:text-4xl">
                <span className="text-primary">
                  <CountUp to={3} />
                </span>{' '}
                cơ hội mới
              </p>
              <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.22em] text-cream/55">
                trong bán kính 5 km · {theme.nameVi}
              </p>
              <div className="mt-4 flex items-center gap-2 border-t border-cream/10 pt-4 font-mono text-[10px] uppercase tracking-[0.22em] text-cream/65">
                <span className="relative inline-block size-1.5 rounded-full bg-primary">
                  <span className="absolute inset-0 animate-ping rounded-full bg-primary opacity-70" />
                </span>
                Cập nhật trực tiếp
              </div>
            </div>
          </aside>
        </section>

        {/* Sport pills */}
        <section className="mb-12">
          <div className="mb-3 flex items-baseline justify-between">
            <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-cream/55">
              Môn đang xem
            </p>
            <span className="hidden font-mono text-[10px] uppercase tracking-[0.25em] text-cream/35 md:inline">
              Đổi để xem dữ liệu khác
            </span>
          </div>
          <div className="flex flex-wrap gap-2.5">
            {SPORTS.map((slug) => {
              const t = SPORT_THEMES[slug];
              const isActive = slug === current;
              return (
                <button
                  key={slug}
                  type="button"
                  onClick={() => selectSport(slug)}
                  onMouseEnter={() => previewSport(slug)}
                  onMouseLeave={resetSport}
                  onFocus={() => previewSport(slug)}
                  onBlur={resetSport}
                  className={`group relative inline-flex items-center gap-2.5 rounded-2xl border px-4 py-2.5 transition duration-300 hover:-translate-y-0.5 ${
                    isActive
                      ? 'border-transparent text-night'
                      : 'border-cream/15 bg-cream/[0.04] text-cream backdrop-blur-md hover:border-cream/40'
                  }`}
                  style={
                    isActive
                      ? {
                          background: t.primary,
                          boxShadow: `0 14px 30px -10px ${t.primary}, inset 0 1px 0 rgba(255,255,255,0.3)`,
                        }
                      : { boxShadow: '0 6px 16px -8px rgba(0,0,0,0.6)' }
                  }
                >
                  <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em]">
                    {t.nameVi}
                  </span>
                  {isActive && (
                    <span className="ml-0.5 inline-block size-1.5 animate-pulse rounded-full bg-night" />
                  )}
                </button>
              );
            })}
          </div>
        </section>

        {/* Bento main */}
        <div className="grid gap-6 lg:grid-cols-12">
          {/* Feed with 3D tilt */}
          <section id="feed" className="lg:col-span-8">
            <article
              {...feedTilt}
              className="relative overflow-hidden rounded-3xl border border-cream/15 bg-gradient-to-br from-cream/[0.06] to-cream/[0.02] p-6 backdrop-blur-2xl shadow-[0_30px_80px_-20px_rgba(0,0,0,0.7)] md:p-8"
            >
              <header className="mb-5 flex items-baseline justify-between border-b border-cream/10 pb-4">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-cream/55">
                    Cơ hội đang mở
                  </p>
                  <h2 className="mt-1 font-display text-2xl font-black uppercase tracking-tight text-cream md:text-3xl">
                    {theme.nameVi} · Hà Nội
                  </h2>
                </div>
                <span className="hidden rounded-full border border-cream/15 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.22em] text-cream/55 sm:inline">
                  <CountUp to={3} /> mới
                </span>
              </header>

              <div className="space-y-3">
                <FeedRow
                  tone="primary"
                  tag="Tuyển thành viên"
                  title="FC Đống Đa cần một trung vệ"
                  meta="Hạng B · Tối thứ 4 · Sân Bách Khoa"
                />
                <FeedRow
                  tone="ember"
                  tag="Thách đấu"
                  title="Hồ Tây Strikers tìm đối thủ"
                  meta="Rating 4.4 · Thứ 7 · 19:30"
                />
                <FeedRow
                  tone="cream"
                  tag="Sân trống"
                  title="Sân Cầu Giấy mở khung 18–22h"
                  meta="200K/giờ · Cần đội đặt tuần này"
                />
                <FeedRow
                  tone="primary"
                  tag="Tuyển thành viên"
                  title="Đội bóng Mỹ Đình cần tiền vệ"
                  meta="Hạng C · Sáng Chủ Nhật · Sân Olympia"
                />
              </div>

              <p className="mt-5 border-t border-cream/10 pt-4 text-center font-mono text-[10px] uppercase tracking-[0.25em] text-cream/40">
                Dữ liệu mẫu · feed thật khi tính năng đăng tin sẵn sàng
              </p>
            </article>
          </section>

          {/* Sidebar */}
          <aside id="profile" className="space-y-6 lg:col-span-4">
            {/* Profile card with 3D tilt */}
            <article
              {...profileTilt}
              className="relative overflow-hidden rounded-3xl border border-cream/15 bg-gradient-to-br from-cream/[0.06] to-cream/[0.02] p-6 backdrop-blur-2xl"
            >
              <div className="flex items-start gap-4">
                <div
                  className="flex size-14 shrink-0 items-center justify-center rounded-2xl border border-primary/40 bg-primary/15 font-display text-xl font-black uppercase text-primary"
                  style={{ boxShadow: '0 12px 28px -10px rgb(var(--color-primary))' }}
                  aria-hidden
                >
                  {initial}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-cream/55">
                    Hồ sơ
                  </p>
                  <p className="mt-1 truncate font-display text-2xl font-black uppercase leading-tight tracking-tight text-cream">
                    {user?.displayName ?? '—'}
                  </p>
                  <p className="mt-1 truncate font-mono text-[10px] tracking-[0.18em] text-cream/55">
                    {user?.email ?? ''}
                  </p>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3 border-t border-cream/10 pt-5">
                <MiniStat n="0" label="Trận" />
                <MiniStat n="—" label="Rating" />
                <MiniStat n="0" label="Đội" />
                <MiniStat n="0" label="Sân đặt" />
              </div>

              <Link
                to="/profile"
                className="group mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full border border-cream/20 bg-cream/[0.03] px-4 py-2.5 font-mono text-[11px] font-semibold uppercase tracking-[0.22em] text-cream transition hover:border-cream/55 hover:bg-cream/[0.08]"
              >
                Chỉnh sửa hồ sơ
                <span aria-hidden className="transition-transform group-hover:translate-x-1">
                  →
                </span>
              </Link>
            </article>

            {/* Tip card with conic ring + auto-cycling content + 3D tilt */}
            <article
              {...tipTilt}
              className="relative overflow-hidden rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/15 via-cream/[0.04] to-transparent p-6 shadow-[0_30px_80px_-20px_rgb(var(--color-primary)/0.35)]"
            >
              {/* rotating conic glow */}
              <span
                className="pointer-events-none absolute -inset-[3px] -z-10 animate-spin-medium rounded-3xl"
                style={{
                  background:
                    'conic-gradient(from 0deg, transparent 0%, rgb(var(--color-primary)) 22%, transparent 50%, rgb(var(--color-primary) / 0.6) 72%, transparent 100%)',
                  filter: 'blur(14px)',
                  opacity: 0.55,
                }}
                aria-hidden
              />

              <div key={tipIdx} className="animate-chip-in">
                <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary/85">
                  {tip.eyebrow}
                </p>
                <h3 className="mt-3 font-display text-2xl font-black uppercase leading-tight tracking-tight text-cream">
                  {tip.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-cream/70">{tip.body}</p>
                <button
                  type="button"
                  className="group mt-4 inline-flex items-center gap-2 font-mono text-[11px] font-semibold uppercase tracking-[0.22em] text-primary"
                >
                  {tip.cta}
                  <span aria-hidden className="inline-block animate-arrow-bob">
                    →
                  </span>
                </button>
              </div>

              {/* Tip dots indicator */}
              <div className="mt-5 flex gap-1.5 border-t border-cream/10 pt-4">
                {ONBOARDING_TIPS.map((_, i) => (
                  <span
                    key={i}
                    className={`h-1 rounded-full transition-all duration-500 ${
                      i === tipIdx ? 'w-8 bg-primary' : 'w-2 bg-cream/20'
                    }`}
                    aria-hidden
                  />
                ))}
              </div>
            </article>
          </aside>
        </div>

        {/* Quick actions */}
        <section id="actions" className="mt-12">
          <div className="mb-4 flex items-baseline justify-between">
            <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-cream/55">
              Lối tắt
            </p>
            <span className="hidden font-mono text-[10px] uppercase tracking-[0.25em] text-cream/35 md:inline">
              4 hành động chính
            </span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <ActionTile num="01" title="Tìm đồng đội" sub="Đăng tin tìm bạn" />
            <ActionTile num="02" title="Tìm đối thủ" sub="Gửi lời thách đấu" />
            <ActionTile num="03" title="Đặt sân" sub="Mở lịch sân trống" />
            <ActionTile num="04" title="Quản lý đội" sub="Thành viên & lịch sử" to="/teams" />
          </div>
        </section>
      </main>

      <footer className="relative z-10 border-t border-cream/10 bg-night">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-6 py-6 md:flex-row md:items-center md:justify-between">
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-cream/35">
            SportsForAll · 2026
          </p>
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-cream/35">
            Phiên: {user?.email}
          </p>
        </div>
      </footer>
    </div>
  );
}

function FeedRow({
  tone,
  tag,
  title,
  meta,
}: {
  tone: 'primary' | 'ember' | 'cream';
  tag: string;
  title: string;
  meta: string;
}) {
  const toneClass =
    tone === 'primary'
      ? 'border-primary/35 bg-primary/10 text-primary'
      : tone === 'ember'
        ? 'border-ember/35 bg-ember/10 text-ember'
        : 'border-cream/30 bg-cream/10 text-cream';

  return (
    <div className="group flex items-center justify-between gap-4 rounded-xl border border-cream/10 bg-cream/[0.03] p-4 transition hover:-translate-y-0.5 hover:border-cream/30 hover:bg-cream/[0.06]">
      <div className="min-w-0 flex-1">
        <span
          className={`inline-block rounded-full border px-2 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-[0.22em] ${toneClass}`}
        >
          {tag}
        </span>
        <p className="mt-2 font-display text-lg font-black uppercase leading-tight tracking-tight text-cream md:text-xl">
          {title}
        </p>
        <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-cream/55">
          {meta}
        </p>
      </div>
      <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-cream/40 transition group-hover:translate-x-1 group-hover:text-primary">
        →
      </span>
    </div>
  );
}

function MiniStat({ n, label }: { n: string; label: string }) {
  return (
    <div>
      <p className="font-display text-2xl font-black leading-none text-primary md:text-3xl">{n}</p>
      <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.22em] text-cream/55">{label}</p>
    </div>
  );
}

function ActionTile({
  num,
  title,
  sub,
  to,
}: {
  num: string;
  title: string;
  sub: string;
  to?: string;
}) {
  const inner = (
    <>
      <div className="flex items-baseline justify-between">
        <span className="font-display text-3xl font-black leading-none text-primary transition-transform group-hover:scale-110 group-hover:rotate-[-4deg] md:text-4xl">
          {num}
        </span>
        <span
          aria-hidden
          className="font-mono text-[11px] uppercase tracking-[0.22em] text-cream/40 transition group-hover:translate-x-1 group-hover:text-primary"
        >
          →
        </span>
      </div>
      <div>
        <h3 className="font-display text-base font-black uppercase leading-tight tracking-tight text-cream md:text-lg">
          {title}
        </h3>
        <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.22em] text-cream/55">
          {sub}
        </p>
      </div>
    </>
  );

  const cls =
    'group relative flex flex-col gap-3 overflow-hidden rounded-2xl border border-cream/12 bg-cream/[0.04] p-5 text-left backdrop-blur-md transition hover:-translate-y-1 hover:border-primary/40 hover:bg-cream/[0.07]';

  if (to) {
    return (
      <Link to={to} className={cls}>
        {inner}
      </Link>
    );
  }
  return (
    <button type="button" className={cls}>
      {inner}
    </button>
  );
}
