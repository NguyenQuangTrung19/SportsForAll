import { SPORT_THEMES, SPORTS, type SportSlug } from '@sfa/shared';
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { KineticText } from '@/components/KineticText';
import { useAuthStore } from '@/stores/auth-store';
import { applySportTheme, useSportStore } from '@/stores/sport-store';

/* -------------------------------------------------------------------------- */
/* Sport icons (line-art SVG, stroke = currentColor)                          */
/* -------------------------------------------------------------------------- */

function SportIcon({
  slug,
  className,
  style,
  strokeWidth = 1.6,
}: {
  slug: SportSlug;
  className?: string;
  style?: CSSProperties;
  strokeWidth?: number;
}) {
  const common = {
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    className,
    style,
    'aria-hidden': true,
  };

  switch (slug) {
    case 'football':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <polygon points="12,7.4 16.1,10.3 14.55,15.1 9.45,15.1 7.9,10.3" />
          <line x1="12" y1="7.4" x2="12" y2="3" />
          <line x1="16.1" y1="10.3" x2="20.6" y2="9.1" />
          <line x1="14.55" y1="15.1" x2="17.2" y2="19.5" />
          <line x1="9.45" y1="15.1" x2="6.8" y2="19.5" />
          <line x1="7.9" y1="10.3" x2="3.4" y2="9.1" />
        </svg>
      );
    case 'basketball':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <line x1="12" y1="3" x2="12" y2="21" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <path d="M5.6 5.6 Q12 12 5.6 18.4" />
          <path d="M18.4 5.6 Q12 12 18.4 18.4" />
        </svg>
      );
    case 'badminton':
      return (
        <svg {...common}>
          {/* cork base */}
          <ellipse cx="12" cy="18.2" rx="3.2" ry="1.6" />
          {/* feather skirt */}
          <line x1="9" y1="17.6" x2="5.4" y2="3.6" />
          <line x1="15" y1="17.6" x2="18.6" y2="3.6" />
          <line x1="10.6" y1="18.2" x2="9.2" y2="3.2" />
          <line x1="13.4" y1="18.2" x2="14.8" y2="3.2" />
          <line x1="12" y1="18.2" x2="12" y2="3" />
          {/* feather cap */}
          <path d="M5.4 3.6 Q12 1.4 18.6 3.6" strokeDasharray="1.5 2" opacity="0.7" />
        </svg>
      );
    case 'volleyball':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <path d="M4 8.5 Q12 11 12 21" />
          <path d="M20 8.5 Q12 11 12 21" />
          <path d="M3.6 14.5 Q12 11 20.4 14.5" />
        </svg>
      );
    case 'tennis':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <path d="M3.4 14.6 Q9 4.5 14.8 3.6" />
          <path d="M20.6 9.4 Q15 19.5 9.2 20.4" />
        </svg>
      );
  }
}

/* -------------------------------------------------------------------------- */
/* Kinetic text — per-letter animated reveal                                   */
/* -------------------------------------------------------------------------- */


/* -------------------------------------------------------------------------- */
/* Hooks                                                                       */
/* -------------------------------------------------------------------------- */

function useGlobalMouse() {
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const r = document.documentElement;
      r.style.setProperty('--mx', `${e.clientX}px`);
      r.style.setProperty('--my', `${e.clientY}px`);
    };
    window.addEventListener('pointermove', onMove);
    return () => window.removeEventListener('pointermove', onMove);
  }, []);
}

function useReveal<T extends HTMLElement>(threshold = 0.18) {
  const ref = useRef<T>(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setShown(true);
          obs.disconnect();
        }
      },
      { threshold },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return [ref, shown] as const;
}

/* -------------------------------------------------------------------------- */
/* Page                                                                        */
/* -------------------------------------------------------------------------- */

export function LandingPage() {
  const user = useAuthStore((s) => s.user);
  const sport = useSportStore((s) => s.current);
  const setSport = useSportStore((s) => s.setCurrent);
  useGlobalMouse();

  const previewSport = (slug: SportSlug) => applySportTheme(slug);
  const resetSport = () => applySportTheme(sport);
  const selectSport = (slug: SportSlug) => {
    setSport(slug);
    applySportTheme(slug);
  };

  return (
    <div className="relative min-h-screen overflow-x-clip bg-night text-cream">
      <BackgroundLayers />
      <Nav user={user} />
      <Hero
        sport={sport}
        onPreview={previewSport}
        onReset={resetSport}
        onSelect={selectSport}
      />
      <SportTicker />
      <PersonaSection />
      <StatStrip />
      <CtaBanner />
      <FooterBar />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Background                                                                  */
/* -------------------------------------------------------------------------- */

function BackgroundLayers() {
  return (
    <>
      <div className="mouse-spotlight pointer-events-none fixed inset-0 z-0" aria-hidden />
      <div className="grid-bg pointer-events-none fixed inset-0 z-0" aria-hidden />
      <div className="pointer-events-none fixed inset-0 z-0" aria-hidden>
        <div className="absolute -left-32 top-[20%] size-[28rem] animate-pulse-slow rounded-full bg-primary/20 blur-[120px]" />
        <div className="absolute -right-20 top-[60%] size-[22rem] animate-float rounded-full bg-ember/15 blur-[100px]" />
        <div className="absolute left-1/3 top-0 size-[18rem] animate-float-rev rounded-full bg-primary/10 blur-[120px]" />
      </div>
      <Particles />
    </>
  );
}

function Particles() {
  const dots = Array.from({ length: 22 }, (_, i) => ({
    left: `${(i * 13.7) % 100}%`,
    top: `${(i * 21.3) % 100}%`,
    size: 1 + (i % 3) * 0.5,
    duration: 10 + (i % 5) * 2.5,
    delay: (i % 8) * 0.6,
    primary: i % 4 === 0,
  }));
  return (
    <div className="pointer-events-none fixed inset-0 z-0" aria-hidden>
      {dots.map((d, i) => (
        <span
          key={i}
          className={`absolute rounded-full ${d.primary ? 'bg-primary' : 'bg-cream'}`}
          style={{
            left: d.left,
            top: d.top,
            width: `${d.size}px`,
            height: `${d.size}px`,
            opacity: 0.3,
            animation: `drift ${d.duration}s ease-in-out infinite`,
            animationDelay: `${d.delay}s`,
            boxShadow: d.primary
              ? '0 0 8px rgb(var(--color-primary))'
              : '0 0 6px rgba(244,239,227,0.6)',
          }}
        />
      ))}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Nav                                                                         */
/* -------------------------------------------------------------------------- */

function Nav({ user }: { user: { displayName: string } | null }) {
  return (
    <header className="sticky top-0 z-30 border-b border-cream/10 bg-night/60 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4">
        <Link
          to="/"
          className="font-display text-2xl font-black uppercase leading-none tracking-tight text-cream md:text-3xl"
        >
          SportsForAll<span className="text-primary">.</span>
        </Link>
        <nav className="hidden items-center gap-8 font-mono text-[11px] uppercase tracking-[0.22em] text-cream/55 md:flex">
          <a href="#feed" className="transition hover:text-cream">
            Sản phẩm
          </a>
          <a href="#personas" className="transition hover:text-cream">
            Vai trò
          </a>
          <a href="#sports" className="transition hover:text-cream">
            Môn thể thao
          </a>
        </nav>
        <div className="flex items-center gap-2 md:gap-3">
          {user ? (
            <Link
              to="/dashboard"
              className="rounded-full bg-primary px-4 py-2 font-mono text-[11px] font-semibold uppercase tracking-[0.22em] text-night shadow-[0_8px_24px_-8px_rgb(var(--color-primary))] transition hover:scale-[1.04]"
            >
              Vào ứng dụng →
            </Link>
          ) : (
            <>
              <Link
                to="/login"
                className="hidden font-mono text-[11px] uppercase tracking-[0.22em] text-cream/65 transition hover:text-cream md:inline"
              >
                Đăng nhập
              </Link>
              <Link
                to="/register"
                className="rounded-full bg-cream px-4 py-2 font-mono text-[11px] font-semibold uppercase tracking-[0.22em] text-night transition hover:bg-primary"
              >
                Tạo tài khoản
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

/* -------------------------------------------------------------------------- */
/* Hero                                                                        */
/* -------------------------------------------------------------------------- */

function Hero({
  sport,
  onPreview,
  onReset,
  onSelect,
}: {
  sport: SportSlug;
  onPreview: (s: SportSlug) => void;
  onReset: () => void;
  onSelect: (s: SportSlug) => void;
}) {
  const [parallax, setParallax] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const x = (e.clientX / window.innerWidth - 0.5) * 24;
      const y = (e.clientY / window.innerHeight - 0.5) * 24;
      setParallax({ x, y });
    };
    window.addEventListener('pointermove', onMove);
    return () => window.removeEventListener('pointermove', onMove);
  }, []);

  return (
    <section className="relative">
      {/* Giant watermark sport icon — reactive to current sport */}
      <div
        className="pointer-events-none absolute -right-32 top-2 -z-10 hidden size-[34rem] animate-float-rev text-primary opacity-[0.07] lg:block xl:-right-20"
        style={{ filter: 'drop-shadow(0 0 80px rgb(var(--color-primary) / 0.45))' }}
        aria-hidden
      >
        <SportIcon
          slug={sport}
          strokeWidth={0.9}
          className="size-full animate-spin-slow"
        />
      </div>

      <div className="mx-auto grid max-w-7xl items-center gap-14 px-6 pb-20 pt-12 md:pt-20 lg:grid-cols-12 lg:gap-10">
        {/* LEFT */}
        <div className="lg:col-span-7">
          <div className="animate-fade-up stagger-1 mb-6 inline-flex items-center gap-3 rounded-full border border-cream/15 bg-cream/[0.04] px-4 py-1.5 backdrop-blur-md">
            <span className="relative inline-block size-2 rounded-full bg-primary">
              <span className="absolute inset-0 animate-ping rounded-full bg-primary opacity-70" />
            </span>
            <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-cream/80">
              Cộng đồng thể thao Việt Nam · ra mắt 2026
            </span>
          </div>

          <h1 className="font-display font-black uppercase leading-[0.92] tracking-tight">
            <span className="block text-2xl font-bold tracking-[0.22em] text-cream/55 md:text-3xl">
              <KineticText text="Tìm" baseDelay={50} />
            </span>
            <span className="mt-2 block text-[clamp(40px,7.4vw,104px)]">
              <span
                className="text-primary"
                style={{
                  filter: 'drop-shadow(0 0 60px rgb(var(--color-primary) / 0.45))',
                }}
              >
                <KineticText text="đồng đội," baseDelay={200} />
              </span>{' '}
              <span className="text-cream">
                <KineticText text="đối thủ," baseDelay={420} />
              </span>{' '}
              <span className="text-cream">
                <KineticText text="sân bãi." baseDelay={620} />
              </span>
            </span>
          </h1>

          <p className="animate-fade-up stagger-4 mt-10 max-w-xl text-base leading-relaxed text-cream/70 md:text-lg">
            Một nơi để người chơi, đội nhóm và chủ sân tìm thấy nhau. Đăng tin tìm đối, ứng tuyển
            vào đội, mở khung sân trống — tất cả trong một tài khoản, năm môn thể thao, ba vai trò.
          </p>

          <div className="animate-fade-up stagger-5 mt-10 flex flex-wrap items-center gap-x-12 gap-y-6">
            <MagneticLink to="/register" variant="primary">
              Tham gia miễn phí
              <span aria-hidden className="inline-block animate-arrow-bob">→</span>
            </MagneticLink>

            <div className="hidden h-10 w-px bg-cream/15 md:block" aria-hidden />

            <div className="flex flex-col items-start gap-1.5">
              <span className="font-mono text-[10px] uppercase tracking-[0.32em] text-cream/45">
                Đã có tài khoản?
              </span>
              <Link
                to="/login"
                className="group inline-flex items-center gap-2 font-mono text-[12px] font-semibold uppercase tracking-[0.22em] text-cream transition hover:text-primary"
              >
                <span className="underline decoration-2 underline-offset-[6px] decoration-cream/30 group-hover:decoration-primary">
                  Đăng nhập
                </span>
                <span aria-hidden className="transition-transform group-hover:translate-x-1">
                  →
                </span>
              </Link>
            </div>
          </div>

          <div className="animate-fade-up stagger-5 mt-14" id="sports">
            <p className="mb-4 font-mono text-[10px] uppercase tracking-[0.3em] text-cream/55">
              Mỗi môn một sắc thái — chạm để xem
            </p>
            <SportPills
              sport={sport}
              onPreview={onPreview}
              onReset={onReset}
              onSelect={onSelect}
            />
          </div>
        </div>

        {/* RIGHT */}
        <div className="relative lg:col-span-5" id="feed">
          <div
            className="relative perspective-1500"
            style={{
              transform: `translate3d(${parallax.x * -0.3}px, ${parallax.y * -0.3}px, 0)`,
              transition: 'transform 0.2s ease-out',
            }}
          >
            <OpportunityFeed parallax={parallax} />
            <CapabilitiesMini />
          </div>
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* Magnetic CTA                                                                */
/* -------------------------------------------------------------------------- */

function MagneticLink({
  to,
  children,
  variant,
}: {
  to: string;
  children: React.ReactNode;
  variant: 'primary' | 'ghost';
}) {
  const [pos, setPos] = useState({ x: 0, y: 0 });
  return (
    <Link
      to={to}
      onMouseMove={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = (e.clientX - rect.left - rect.width / 2) * 0.28;
        const y = (e.clientY - rect.top - rect.height / 2) * 0.28;
        setPos({ x, y });
      }}
      onMouseLeave={() => setPos({ x: 0, y: 0 })}
      style={{
        transform: `translate(${pos.x}px, ${pos.y}px)`,
        transition: 'transform 0.18s cubic-bezier(0.2, 0.8, 0.2, 1)',
      }}
      className={
        variant === 'primary'
          ? 'group relative inline-flex items-center gap-3 overflow-hidden rounded-full bg-primary px-7 py-4 font-mono text-[12px] font-semibold uppercase tracking-[0.22em] text-night shadow-[0_18px_50px_-12px_rgb(var(--color-primary))] transition'
          : 'group inline-flex items-center gap-3 rounded-full border-2 border-cream/30 bg-cream/[0.04] px-7 py-4 font-mono text-[12px] font-semibold uppercase tracking-[0.22em] text-cream backdrop-blur-md transition hover:border-cream'
      }
    >
      {variant === 'primary' && (
        <span
          className="pointer-events-none absolute inset-0 -z-0 bg-gradient-to-r from-transparent via-cream/30 to-transparent"
          style={{ animation: 'shine 2.4s ease-in-out infinite' }}
          aria-hidden
        />
      )}
      <span className="relative z-10 inline-flex items-center gap-3">{children}</span>
    </Link>
  );
}

/* -------------------------------------------------------------------------- */
/* Opportunity Feed — mock product preview                                     */
/* -------------------------------------------------------------------------- */

function OpportunityFeed({ parallax }: { parallax: { x: number; y: number } }) {
  const [tilt, setTilt] = useState({ rx: 0, ry: 0 });
  const cyclingFilters = ['Bóng đá', 'Bóng rổ', 'Cầu lông', 'Bóng chuyền', 'Tennis'];
  const [filterIdx, setFilterIdx] = useState(0);

  useEffect(() => {
    const id = setInterval(
      () => setFilterIdx((i) => (i + 1) % cyclingFilters.length),
      2200,
    );
    return () => clearInterval(id);
  }, [cyclingFilters.length]);

  return (
    <article
      onMouseMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width;
        const py = (e.clientY - r.top) / r.height;
        setTilt({ rx: (py - 0.5) * -8, ry: (px - 0.5) * 8 });
      }}
      onMouseLeave={() => setTilt({ rx: 0, ry: 0 })}
      className="animate-fade-up stagger-3 preserve-3d relative overflow-hidden rounded-3xl border border-cream/15 bg-gradient-to-br from-cream/[0.06] to-cream/[0.02] p-6 backdrop-blur-2xl shadow-[0_30px_80px_-20px_rgba(0,0,0,0.8),inset_0_1px_0_rgba(255,255,255,0.08)]"
      style={{
        transform: `perspective(1500px) rotateX(${tilt.rx + parallax.y * -0.05}deg) rotateY(${tilt.ry + parallax.x * 0.05}deg)`,
        transition: 'transform 0.18s ease-out',
      }}
    >
      {/* highlight overlay */}
      <span
        className="pointer-events-none absolute inset-0 bg-gradient-to-br from-cream/[0.08] via-transparent to-transparent"
        aria-hidden
      />

      {/* App-like header bar */}
      <header className="relative flex items-center justify-between border-b border-cream/10 pb-4">
        <span className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.25em] text-cream/70">
          <span className="relative inline-block size-2 rounded-full bg-primary">
            <span className="absolute inset-0 animate-ping rounded-full bg-primary opacity-70" />
          </span>
          Cơ hội đang mở · cập nhật trực tiếp
        </span>
        <span className="hidden font-mono text-[10px] uppercase tracking-[0.25em] text-cream/45 sm:inline">
          Hà Nội · 5 km
        </span>
      </header>

      {/* Filter chips — active chip cycles automatically */}
      <div
        className="relative mt-4 flex flex-wrap gap-2"
        style={{ transform: 'translateZ(20px)' }}
      >
        <Chip variant="active">
          <span key={filterIdx} className="inline-block animate-chip-in">
            {cyclingFilters[filterIdx]}
          </span>
        </Chip>
        <Chip>Trình độ trung bình</Chip>
        <Chip>Tối thứ 7</Chip>
        <Chip variant="dashed">+ thêm bộ lọc</Chip>
      </div>

      {/* Three stacked rows — one per persona */}
      <div
        className="relative mt-5 space-y-3"
        style={{ transform: 'translateZ(30px)' }}
      >
        <FeedRow
          tone="primary"
          tag="Tuyển thành viên"
          title="FC Đống Đa cần một trung vệ"
          meta="Hạng B · Tối thứ 4 · Sân Bách Khoa"
          persona="Cho người chơi"
        />
        <FeedRow
          tone="ember"
          tag="Thách đấu"
          title="Hồ Tây Strikers tìm đối thủ"
          meta="Rating 4.4 · Thứ 7 · 19:30"
          persona="Cho đội nhóm"
        />
        <FeedRow
          tone="cream"
          tag="Sân trống"
          title="Sân Cầu Giấy mở khung 18–22h"
          meta="200K/giờ · Cần đội đặt tuần này"
          persona="Cho chủ sân"
        />
      </div>

      <p className="relative mt-5 border-t border-cream/10 pt-4 font-mono text-[10px] uppercase tracking-[0.25em] text-cream/50">
        Lọc theo môn, khu vực, trình độ — cập nhật liên tục từ cộng đồng.
      </p>
    </article>
  );
}

function Chip({
  children,
  variant,
}: {
  children: ReactNode;
  variant?: 'active' | 'dashed';
}) {
  if (variant === 'active') {
    return (
      <span
        className="inline-flex items-center rounded-full border border-primary bg-primary/15 px-3 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-primary"
        style={{ boxShadow: '0 0 18px -6px rgb(var(--color-primary))' }}
      >
        {children}
      </span>
    );
  }
  if (variant === 'dashed') {
    return (
      <span className="inline-flex items-center rounded-full border border-dashed border-cream/20 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-cream/45">
        {children}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full border border-cream/20 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-cream/70">
      {children}
    </span>
  );
}

function FeedRow({
  tone,
  tag,
  title,
  meta,
  persona,
}: {
  tone: 'primary' | 'ember' | 'cream';
  tag: string;
  title: string;
  meta: string;
  persona: string;
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
        <div className="flex items-center gap-2">
          <span
            className={`inline-block rounded-full border px-2 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-[0.22em] ${toneClass}`}
          >
            {tag}
          </span>
          <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-cream/40">
            {persona}
          </span>
        </div>
        <p className="mt-2 font-display text-xl font-black uppercase leading-tight tracking-tight text-cream">
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

/* -------------------------------------------------------------------------- */
/* Capabilities mini — what you actually do in the app                        */
/* -------------------------------------------------------------------------- */

function CapabilitiesMini() {
  return (
    <div className="animate-fade-up stagger-4 mt-6 rounded-2xl border border-cream/15 bg-cream/[0.04] p-6 backdrop-blur-md">
      <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-cream/55">
        Bạn có thể làm gì
      </p>
      <ul className="mt-4 grid gap-3 text-sm md:grid-cols-2">
        <Capability n="01" text="Đăng tin tìm đồng đội cùng trình độ" />
        <Capability n="02" text="Gửi và nhận lời thách đấu giữa các đội" />
        <Capability n="03" text="Đặt sân, mở lịch và nhận đặt online" />
        <Capability n="04" text="Đánh giá uy tín hai chiều sau mỗi trận" />
      </ul>
    </div>
  );
}

function Capability({ n, text }: { n: string; text: string }) {
  return (
    <li className="flex gap-3">
      <span className="font-display text-xl font-black leading-none text-primary">{n}</span>
      <span className="pt-0.5 text-cream/80">{text}</span>
    </li>
  );
}

/* -------------------------------------------------------------------------- */
/* Sport pills                                                                 */
/* -------------------------------------------------------------------------- */

function SportPills({
  sport,
  onPreview,
  onReset,
  onSelect,
}: {
  sport: SportSlug;
  onPreview: (s: SportSlug) => void;
  onReset: () => void;
  onSelect: (s: SportSlug) => void;
}) {
  return (
    <div className="flex flex-wrap gap-3">
      {SPORTS.map((slug) => {
        const t = SPORT_THEMES[slug];
        const isActive = slug === sport;
        return (
          <button
            key={slug}
            type="button"
            onClick={() => onSelect(slug)}
            onMouseEnter={() => onPreview(slug)}
            onMouseLeave={onReset}
            onFocus={() => onPreview(slug)}
            onBlur={onReset}
            className={`group relative inline-flex items-center gap-2.5 rounded-2xl border px-5 py-3 transition duration-300 hover:-translate-y-1 ${
              isActive
                ? 'border-transparent text-night'
                : 'border-cream/15 bg-cream/[0.04] text-cream backdrop-blur-md hover:border-cream/40'
            }`}
            style={
              isActive
                ? {
                    background: t.primary,
                    boxShadow: `0 18px 40px -10px ${t.primary}, inset 0 1px 0 rgba(255,255,255,0.3)`,
                  }
                : { boxShadow: '0 6px 18px -8px rgba(0,0,0,0.6)' }
            }
          >
            <SportIcon
              slug={slug}
              className="size-[18px] transition-transform group-hover:rotate-12"
              style={!isActive ? { color: t.primary } : undefined}
            />
            <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em]">
              {t.nameVi}
            </span>
            {isActive && (
              <span className="ml-1 inline-block size-1.5 animate-pulse rounded-full bg-night" />
            )}
          </button>
        );
      })}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Sport ticker                                                                */
/* -------------------------------------------------------------------------- */

function SportTicker() {
  const items = SPORTS.map((slug) => SPORT_THEMES[slug]);
  return (
    <section
      className="relative overflow-hidden border-y border-cream/10 bg-night/60 py-5 backdrop-blur-md"
      aria-hidden
    >
      <div className="marquee-track flex">
        {[0, 1].map((copy) => (
          <div
            key={copy}
            className="flex shrink-0 items-center gap-10 pr-10 font-display text-4xl font-black uppercase tracking-tight text-cream md:gap-14 md:pr-14 md:text-6xl"
          >
            {items.map((t) => (
              <span key={`${copy}-${t.slug}`} className="flex items-center gap-10 md:gap-14">
                <span className="flex items-center gap-4 md:gap-6">
                  <SportIcon
                    slug={t.slug}
                    strokeWidth={1.4}
                    className="size-9 shrink-0 md:size-14"
                    style={{
                      color: t.primary,
                      filter: `drop-shadow(0 0 14px ${t.primary})`,
                    }}
                  />
                  <span>{t.nameVi}</span>
                </span>
                <span
                  className="text-primary"
                  style={{ filter: 'drop-shadow(0 0 12px rgb(var(--color-primary)))' }}
                >
                  /
                </span>
              </span>
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* Personas                                                                    */
/* -------------------------------------------------------------------------- */

function PersonaSection() {
  const [ref, shown] = useReveal<HTMLDivElement>();
  return (
    <section id="personas" ref={ref} className="relative">
      <div className="mx-auto max-w-7xl px-6 py-24 md:py-32">
        <div
          className={`mb-16 grid gap-6 transition-all duration-700 ${
            shown ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'
          } lg:grid-cols-12`}
        >
          <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-cream/55 lg:col-span-3">
            §02 · Ba vai trò
          </p>
          <h2 className="font-display text-5xl font-black uppercase leading-[0.92] tracking-tight md:text-7xl lg:col-span-9">
            Một sản phẩm,
            <br />
            <span className="text-primary drop-shadow-[0_0_40px_rgb(var(--color-primary)/0.4)]">
              ba mặt trận.
            </span>
          </h2>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <PersonaCard
            num="01"
            tag="Người chơi"
            headline="Mỗi cuối tuần một trận đấu."
            body="Tìm đồng đội cùng môn, cùng trình độ, cùng quận. Đánh giá uy tín sau mỗi trận để cộng đồng tự lọc người tử tế."
            points={['Lọc theo trình độ & khu vực', 'Đánh giá uy tín hai chiều', 'Lưu lịch sử trận đấu']}
            delay={0}
          />
          <PersonaCard
            num="02"
            tag="Đội nhóm"
            headline="Đội mạnh không thiếu trận."
            body="Đăng tin tuyển thành viên hoặc tìm đối thủ. Hệ thống thách đấu tự bắt cặp theo khu vực và rating của đội."
            points={['Tuyển thành viên', 'Tìm đối thủ cùng tầm', 'Thành tích & lịch sử đội']}
            delay={120}
            featured
          />
          <PersonaCard
            num="03"
            tag="Chủ sân"
            headline="Lấp đầy giờ trống."
            body="Đăng sân, mở lịch, nhận đặt từ cộng đồng. Chủ động tìm đội cho khung giờ thiếu khách."
            points={['Quản lý lịch sân', 'Nhận đặt online', 'Đăng tin tìm đội']}
            delay={240}
          />
        </div>
      </div>
    </section>
  );
}

function PersonaCard({
  num,
  tag,
  headline,
  body,
  points,
  delay,
  featured = false,
}: {
  num: string;
  tag: string;
  headline: string;
  body: string;
  points: string[];
  delay: number;
  featured?: boolean;
}) {
  const [ref, shown] = useReveal<HTMLElement>(0.2);
  const [tilt, setTilt] = useState({ rx: 0, ry: 0 });

  return (
    <article
      ref={ref}
      onMouseMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width;
        const py = (e.clientY - r.top) / r.height;
        setTilt({ rx: (py - 0.5) * -6, ry: (px - 0.5) * 6 });
      }}
      onMouseLeave={() => setTilt({ rx: 0, ry: 0 })}
      style={{
        transform: shown
          ? `perspective(1400px) rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg) translateY(0)`
          : 'translateY(40px)',
        opacity: shown ? 1 : 0,
        transition: 'transform 0.5s cubic-bezier(0.2, 0.8, 0.2, 1), opacity 0.6s ease',
        transitionDelay: `${delay}ms`,
      }}
      className={`group preserve-3d relative flex flex-col gap-5 rounded-3xl border p-8 backdrop-blur-md md:p-10 ${
        featured
          ? 'border-primary/30 bg-gradient-to-br from-primary/10 via-cream/[0.04] to-transparent shadow-[0_30px_80px_-20px_rgb(var(--color-primary)/0.4)]'
          : 'border-cream/12 bg-cream/[0.04]'
      }`}
    >
      {featured && (
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
      )}
      <span
        className="pointer-events-none absolute -inset-px rounded-3xl opacity-0 transition group-hover:opacity-100"
        style={{
          background:
            'radial-gradient(400px circle at var(--mx) var(--my), rgb(var(--color-primary) / 0.15), transparent 60%)',
        }}
        aria-hidden
      />

      <header
        className="relative flex items-baseline justify-between"
        style={{ transform: 'translateZ(40px)' }}
      >
        <span className="font-display text-7xl font-black leading-none text-primary drop-shadow-[0_0_20px_rgb(var(--color-primary)/0.4)] md:text-8xl">
          {num}
        </span>
        <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-cream/55">
          {tag}
        </span>
      </header>

      <h3
        className="relative font-display text-3xl font-black uppercase leading-[0.95] tracking-tight text-cream md:text-4xl"
        style={{ transform: 'translateZ(30px)' }}
      >
        {headline}
      </h3>

      <p className="relative text-sm leading-relaxed text-cream/70 md:text-[15px]">{body}</p>

      <ul className="relative mt-2 space-y-2 border-t border-cream/10 pt-4 font-mono text-[11px] uppercase tracking-wider text-cream/65">
        {points.map((p) => (
          <li key={p} className="flex gap-3">
            <span className="text-primary">+</span>
            <span>{p}</span>
          </li>
        ))}
      </ul>
    </article>
  );
}

/* -------------------------------------------------------------------------- */
/* Stat strip                                                                  */
/* -------------------------------------------------------------------------- */

function StatStrip() {
  const [ref, shown] = useReveal<HTMLDivElement>(0.4);
  const items: Array<{ to: number; suffix?: string; prefix?: string; label: string }> = [
    { to: 5, label: 'Môn thể thao' },
    { to: 3, label: 'Vai trò người dùng' },
    { to: 24, suffix: '/7', label: 'Hoạt động' },
    { to: 0, suffix: '₫', label: 'Phí cho người chơi' },
  ];

  return (
    <section
      ref={ref}
      className="relative border-y border-cream/10 bg-gradient-to-b from-night to-midnight"
    >
      <div className="dot-noise pointer-events-none absolute inset-0 opacity-50" aria-hidden />
      <div className="relative mx-auto grid max-w-7xl grid-cols-2 gap-px bg-cream/10 md:grid-cols-4">
        {items.map((it, i) => (
          <div
            key={it.label}
            className="bg-night/95 p-8 transition md:p-10"
            style={{
              transitionDelay: `${i * 100}ms`,
              opacity: shown ? 1 : 0,
              transform: shown ? 'translateY(0)' : 'translateY(20px)',
              transitionProperty: 'opacity, transform',
              transitionDuration: '600ms',
            }}
          >
            <p
              className={`font-display text-7xl font-black leading-none text-primary drop-shadow-[0_0_30px_rgb(var(--color-primary)/0.4)] md:text-8xl ${
                shown ? 'animate-breathe' : ''
              }`}
              style={{ animationDelay: `${1500 + i * 200}ms` }}
            >
              {it.prefix}
              <CountUp to={it.to} run={shown} />
              {it.suffix}
            </p>
            <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.3em] text-cream/55 md:text-[11px]">
              {it.label}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

function CountUp({ to, run }: { to: number; run: boolean }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!run) return;
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
  }, [to, run]);
  return <span className="tabular-nums">{n}</span>;
}

/* -------------------------------------------------------------------------- */
/* CTA Banner                                                                  */
/* -------------------------------------------------------------------------- */

function CtaBanner() {
  const [ref, shown] = useReveal<HTMLDivElement>(0.2);
  return (
    <section ref={ref} className="relative">
      <div className="mx-auto max-w-7xl px-6 py-24 text-center md:py-32">
        <div
          className={`transition-all duration-700 ${
            shown ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'
          }`}
        >
          <p className="mb-4 font-mono text-[10px] uppercase tracking-[0.35em] text-cream/55 md:text-[11px]">
            Giờ là lúc rồi
          </p>
          <h2 className="mx-auto max-w-4xl font-display text-5xl font-black uppercase leading-[0.9] tracking-tight md:text-8xl">
            Đừng ngồi nhà nữa.
            <br />
            <span className="text-primary drop-shadow-[0_0_60px_rgb(var(--color-primary)/0.5)]">
              Ra sân đi.
            </span>
          </h2>
          <div className="mt-12 flex flex-wrap items-center justify-center gap-4">
            <MagneticLink to="/register" variant="primary">
              Tạo tài khoản miễn phí
              <span aria-hidden className="inline-block animate-arrow-bob">→</span>
            </MagneticLink>
            <MagneticLink to="/login" variant="ghost">
              Đăng nhập
            </MagneticLink>
          </div>
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* Footer                                                                      */
/* -------------------------------------------------------------------------- */

function FooterBar() {
  return (
    <footer className="relative border-t border-cream/10 bg-night">
      <div className="mx-auto flex max-w-7xl flex-col gap-8 px-6 py-12 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="font-display text-4xl font-black uppercase leading-none tracking-tight text-cream md:text-5xl">
            SportsForAll<span className="text-primary">.</span>
          </p>
          <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.3em] text-cream/55 md:text-[11px]">
            Cộng đồng thể thao Việt Nam · 2026
          </p>
        </div>
        <p className="max-w-md text-sm leading-relaxed text-cream/65">
          Một sản phẩm dành cho những người tin rằng thể thao tốt hơn khi có cộng đồng. Bóng đá
          không vui khi đá một mình.
        </p>
      </div>
    </footer>
  );
}
