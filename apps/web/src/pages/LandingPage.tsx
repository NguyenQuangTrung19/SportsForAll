import { SPORT_THEMES, SPORTS, type SportSlug } from '@sfa/shared';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

export function LandingPage() {
  return (
    <div className="min-h-screen bg-paper text-ink">
      <header className="border-b border-ink/10">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
          <span className="font-display text-2xl font-black uppercase leading-none tracking-tight">
            SportsForAll<span className="text-primary">.</span>
          </span>
          <div className="flex items-center gap-3">
            <Link to="/login" className="text-sm font-semibold text-ink-soft hover:text-ink">
              Đăng nhập
            </Link>
            <Link to="/register" className="btn-primary">
              Tham gia
            </Link>
          </div>
        </div>
      </header>

      {/* Live ticker strip */}
      <div className="border-b border-ink/10 bg-paper-2/40">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-ink-soft">
          <span className="flex items-center gap-2">
            <span className="relative inline-flex size-2">
              <span className="absolute inset-0 animate-ping rounded-full bg-primary opacity-70" />
              <span className="relative inline-block size-2 rounded-full bg-primary" />
            </span>
            <span className="text-ink">Live</span>
            <span className="hidden sm:inline">· Cộng đồng thể thao Việt Nam</span>
          </span>
          <span className="hidden md:inline">
            Một tài khoản · năm môn · ba vai trò
          </span>
        </div>
      </div>

      {/* Hero — split: headline (L) + sport rotator (R) */}
      <section className="border-b border-ink/10">
        <div className="mx-auto max-w-6xl px-6 py-10 md:py-14">
          <div className="grid items-center gap-10 lg:grid-cols-12 lg:gap-14">
            <div className="lg:col-span-7">
              <p className="fade-up text-xs font-bold uppercase tracking-wide text-ink-soft">
                Bản tin 2026
              </p>
              <h1 className="mt-3 font-display text-[clamp(48px,9vw,120px)] leading-[1] tracking-tight">
                <span className="fade-up stagger-1 block">Tìm trận.</span>
                <span className="fade-up stagger-2 block text-primary transition-colors duration-700">
                  Tìm bạn.
                </span>
                <span className="fade-up stagger-3 block">Ra sân.</span>
              </h1>
              <div
                className="mt-6 h-1 w-32 origin-left bg-ink animate-draw-line stagger-4"
                aria-hidden
              />
              <p className="fade-up stagger-4 mt-4 max-w-md text-base leading-relaxed text-ink-soft md:text-lg">
                Đăng tin tuyển thành viên, gửi lời thách đấu, đặt sân — tất cả ở một nơi.
              </p>
              <div className="fade-up stagger-5 mt-6 flex flex-wrap items-center gap-3">
                <Link to="/register" className="btn-primary">
                  Tham gia miễn phí <span aria-hidden>→</span>
                </Link>
                <Link to="/login" className="btn-ghost">
                  Đã có tài khoản
                </Link>
              </div>

              <dl className="fade-up stagger-5 mt-8 grid grid-cols-4 gap-4 border-t border-ink/15 pt-5 md:max-w-md">
                <Stat n="05" label="Môn" />
                <Stat n="03" label="Vai trò" />
                <Stat n="0₫" label="Phí player" />
                <Stat n="∞" label="Trận đấu" />
              </dl>
            </div>

            <div className="lg:col-span-5">
              <SportRotator />
            </div>
          </div>
        </div>
      </section>

      {/* Sport grid */}
      <section className="border-b border-ink/10">
        <div className="mx-auto max-w-6xl px-6 py-16 md:py-20">
          <div className="mb-8 flex items-baseline justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-ink-soft">
                Năm môn — một cộng đồng
              </p>
              <h2 className="mt-2 font-display text-5xl leading-[1] tracking-tight md:text-6xl">
                Chọn môn của bạn.
              </h2>
            </div>
            <span className="poster-num hidden text-5xl text-primary md:inline">05</span>
          </div>

          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {SPORTS.map((slug, idx) => {
              const t = SPORT_THEMES[slug];
              return (
                <li key={slug}>
                  <article className="group h-full overflow-hidden border border-ink/12 bg-white transition hover:border-ink hover:shadow-[6px_6px_0_rgba(15,17,21,0.08)]">
                    <div
                      className="flex aspect-square items-center justify-center text-6xl"
                      style={{ backgroundColor: t.primary, color: '#fff' }}
                      aria-hidden
                    >
                      <span style={{ filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.3))' }}>
                        {t.emoji}
                      </span>
                    </div>
                    <div className="p-4">
                      <p className="text-[11px] font-bold uppercase tracking-wide text-ink-soft">
                        {String(idx + 1).padStart(2, '0')}
                      </p>
                      <p className="mt-1 font-display text-lg font-black uppercase leading-tight tracking-tight">
                        {t.nameVi}
                      </p>
                    </div>
                  </article>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      {/* How it works */}
      <section className="border-b border-ink/10 bg-paper-2/40">
        <div className="mx-auto max-w-6xl px-6 py-16 md:py-20">
          <p className="text-xs font-bold uppercase tracking-wide text-ink-soft">
            Cách hoạt động
          </p>
          <h2 className="mt-2 font-display text-5xl leading-[1] tracking-tight md:text-6xl">
            Bốn bước,
            <br />
            ra sân.
          </h2>

          <ol className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <Step n="01" title="Đăng ký" body="Email, mật khẩu, một phút — và bạn vào được cộng đồng." />
            <Step n="02" title="Chọn môn" body="Một hay nhiều môn cũng được. Mỗi môn có theme riêng." />
            <Step n="03" title="Tạo đội hoặc gia nhập" body="Là captain hay member, bạn đều có chỗ trên feed." />
            <Step n="04" title="Tuyển / Thách đấu" body="Đăng bài. Cộng đồng phản hồi. Trận đấu được lên lịch." />
          </ol>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-ink text-paper">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-8 px-6 py-16 md:flex-row md:items-end md:py-20">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-paper/60">
              Sẵn sàng?
            </p>
            <h2 className="mt-3 font-display text-[clamp(40px,7vw,80px)] leading-[1] tracking-tight">
              Một trận đấu
              <br />
              <span className="text-primary">đang chờ bạn.</span>
            </h2>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              to="/register"
              className="bg-primary px-7 py-3.5 font-display text-sm font-bold uppercase tracking-wide text-ink transition hover:-translate-y-0.5"
            >
              Tham gia ngay <span aria-hidden>→</span>
            </Link>
            <Link
              to="/login"
              className="border border-paper/30 px-7 py-3.5 text-sm font-semibold text-paper transition hover:border-paper hover:bg-paper/5"
            >
              Đăng nhập
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-ink/10">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-6 py-6 md:flex-row md:items-center md:justify-between">
          <p className="text-xs font-semibold text-ink-soft">SportsForAll · 2026</p>
          <p className="text-xs text-ink-soft">
            Xây dựng từ Idea.md — open source, người chơi không trả phí
          </p>
        </div>
      </footer>
    </div>
  );
}

function Stat({ n, label }: { n: string; label: string }) {
  return (
    <div>
      <p className="poster-num text-4xl text-primary transition-colors duration-700">{n}</p>
      <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-wide text-ink-soft">
        {label}
      </p>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* SportRotator — animated poster that cycles through 5 sports                */
/* -------------------------------------------------------------------------- */

function hexToRgbTriplet(hex: string): string {
  const trimmed = hex.replace('#', '');
  const r = parseInt(trimmed.slice(0, 2), 16);
  const g = parseInt(trimmed.slice(2, 4), 16);
  const b = parseInt(trimmed.slice(4, 6), 16);
  return `${r} ${g} ${b}`;
}

function SportRotator() {
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const sport: SportSlug = SPORTS[idx]!;
  const theme = SPORT_THEMES[sport];

  // Auto-cycle every 3.5s; pause on hover so user can read
  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => {
      setIdx((i) => (i + 1) % SPORTS.length);
    }, 3500);
    return () => clearInterval(id);
  }, [paused]);

  // Sync global --color-primary so the "Tìm bạn." headline + Stat numbers
  // share the current sport color in real time
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--color-primary', hexToRgbTriplet(theme.primary));
    root.style.setProperty('--color-primary-dark', hexToRgbTriplet(theme.primaryDark));
  }, [theme.primary, theme.primaryDark]);

  return (
    <article
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      className="relative aspect-[4/5] overflow-hidden border-2 border-ink shadow-[8px_8px_0_rgba(15,17,21,0.12)] transition-colors duration-700"
      style={{ backgroundColor: theme.primary }}
      aria-label={`Cộng đồng môn ${theme.nameVi}`}
    >
      {/* Decorative ring grid */}
      <div
        className="pointer-events-none absolute inset-0 opacity-20"
        style={{
          backgroundImage:
            'repeating-linear-gradient(0deg, rgba(255,255,255,0.35) 0 1px, transparent 1px 56px), repeating-linear-gradient(90deg, rgba(255,255,255,0.35) 0 1px, transparent 1px 56px)',
        }}
        aria-hidden
      />

      {/* Index counter */}
      <div className="absolute left-5 top-5 text-white">
        <p className="poster-num text-3xl leading-none">{String(idx + 1).padStart(2, '0')}</p>
        <p className="mt-1 text-[10px] font-bold uppercase tracking-wide opacity-80">
          / 05 môn
        </p>
      </div>

      {/* Pip indicator */}
      <div className="absolute right-5 top-5 flex gap-1.5">
        {SPORTS.map((s, i) => (
          <button
            key={s}
            type="button"
            onClick={() => setIdx(i)}
            aria-label={`Xem ${SPORT_THEMES[s].nameVi}`}
            className={`block h-1.5 transition-all duration-500 ${
              i === idx ? 'w-7 bg-white' : 'w-2 bg-white/40 hover:bg-white/70'
            }`}
          />
        ))}
      </div>

      {/* Giant emoji centerpiece — fades and gently floats on swap */}
      <div className="absolute inset-0 flex items-center justify-center">
        <span
          key={sport}
          className="block fade-up text-[clamp(120px,18vw,200px)] leading-none"
          style={{
            filter: 'drop-shadow(0 12px 32px rgba(0,0,0,0.4))',
          }}
          aria-hidden
        >
          {theme.emoji}
        </span>
      </div>

      {/* Bottom plate — vintage pennant footer */}
      <div className="absolute inset-x-0 bottom-0 border-t-2 border-white/30 bg-ink/20 px-5 py-4 text-white backdrop-blur-[2px]">
        <p className="text-[10px] font-bold uppercase tracking-wide opacity-80">
          Đang xem
        </p>
        <p
          key={`name-${sport}`}
          className="fade-up mt-1 font-display text-3xl leading-none tracking-tight"
        >
          {theme.nameVi}
        </p>
      </div>

      {/* Progress bar — fills in 3.5s, resets on each sport */}
      <div
        key={`bar-${idx}-${paused}`}
        className="absolute inset-x-0 top-0 h-0.5 origin-left bg-white/70"
        style={{
          animation: paused ? 'none' : 'draw-line 3500ms linear',
        }}
        aria-hidden
      />
    </article>
  );
}

function Step({ n, title, body }: { n: string; title: string; body: string }) {
  return (
    <li className="border border-ink/12 bg-white p-6 transition hover:border-ink">
      <p className="poster-num text-5xl text-primary">{n}</p>
      <p className="mt-3 font-display text-xl font-black uppercase leading-tight tracking-tight">
        {title}
      </p>
      <p className="mt-2 text-sm leading-relaxed text-ink-soft">{body}</p>
    </li>
  );
}
