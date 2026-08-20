import type { SportCatalogItem, SportSlug } from '@sfa/shared';
import { useEffect, useState, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { useSports } from '@/lib/use-sports';
import { SportIcon } from '@/components/SportIcon';
import { useLandingImages } from '@/lib/use-landing-images';
import { usePointerParallax } from '@/lib/use-pointer-parallax';

/**
 * Trang giới thiệu — bảng màu "Vôi & Cỏ".
 * Icon môn là SVG nét, đồng đều giữa các hệ điều hành và không bị cảm giác clipart.
 * Màu khoanh trong .landing (index.css) nên các trang trong app không đổi.
 */
export function LandingPage() {
  return (
    <div className="landing min-h-screen">
      <Header />
      <Hero />
      <Marquee />
      <SportGrid />
      <HowItWorks />
      <FinalCta />
      <Footer />
    </div>
  );
}

/* -------------------------------------------------------------------------- */

function Header() {
  return (
    <header className="sticky top-0 z-30 border-b border-pine/12 bg-chalk/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
        <span className="l-poster text-xl">
          SportsForAll<span className="text-clay">.</span>
        </span>
        <div className="flex items-center gap-5">
          <Link
            to="/login"
            className="text-sm font-semibold text-graphite-soft transition hover:text-pine"
          >
            Đăng nhập
          </Link>
          <Link to="/register" className="l-btn-outline !px-5 !py-2.5 !text-xs">
            Tham gia
          </Link>
        </div>
      </div>
    </header>
  );
}

/* -------------------------------------------------------------------------- */

/* -------------------------------------------------------------------------- */
/* Hero — sân khấu bốn lớp, mỗi lớp trôi một tốc độ để ra chiều sâu            */
/* -------------------------------------------------------------------------- */

const ROTATE_MS = 5200;

function Hero() {
  const { sports, sportOf } = useSports();
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const stageRef = usePointerParallax<HTMLElement>();
  const imageOf = useLandingImages();
  const sport: SportSlug = sports[idx]?.slug ?? '';
  const theme = sportOf(sport);

  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => setIdx((i) => (i + 1) % sports.length), ROTATE_MS);
    return () => clearInterval(id);
  }, [paused, sports.length]);

  return (
    <section
      ref={stageRef}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      className="l-stage relative isolate flex min-h-[min(88vh,900px)] items-center overflow-hidden bg-pine text-chalk"
    >
      {/* Lớp 1 — ảnh nền. Xa nhất nên dịch ít nhất, cộng thêm Ken Burns tự trôi. */}
      <div
        className="l-layer absolute inset-0 -z-30"
        style={{ ['--shift-x']: '-26px', ['--shift-y']: '-16px' } as CSSProperties}
      >
        {sports.map(({ slug }, i) => (
          <img
            key={slug}
            src={imageOf(slug).src}
            srcSet={imageOf(slug).srcSet}
            sizes="100vw"
            alt=""
            aria-hidden
            loading={i === 0 ? 'eager' : 'lazy'}
            decoding="async"
            style={{ objectPosition: '66% center' }}
            className={`absolute inset-0 size-full scale-[1.08] object-cover transition-opacity duration-1000 ${
              i === idx ? `opacity-100 ${paused ? '' : 'l-kenburns'}` : 'opacity-0'
            }`}
          />
        ))}
      </div>

      {/* Lớp 2 — phủ màu. Vế trái gần đặc vì có ảnh kín người từ trái sang phải. */}
      <div
        className="absolute inset-0 -z-20"
        style={{
          background:
            'linear-gradient(100deg, rgb(var(--l-pine)) 0%, rgb(var(--l-pine) / 0.94) 24%, rgb(var(--l-pine) / 0.58) 54%, rgb(var(--l-pine) / 0.12) 100%)',
        }}
        aria-hidden
      />
      <div
        className="absolute inset-0 -z-20 bg-gradient-to-t from-pine via-pine/5 to-pine/40"
        aria-hidden
      />

      {/* Lớp 3 — tên môn khổng lồ dạng viền rỗng, trôi nhanh hơn ảnh nên nổi lên trước nó. */}
      <div
        className="l-layer pointer-events-none absolute inset-x-0 bottom-0 -z-10 hidden justify-end overflow-hidden lg:flex"
        style={
          {
            ['--shift-x']: '48px',
            ['--shift-y']: '26px',
            ['--depth']: '40px',
          } as CSSProperties
        }
        aria-hidden
      >
        <span
          key={sport}
          className="l-poster fade-up block translate-x-[8%] translate-y-[26%] whitespace-nowrap text-[11vw] leading-none text-transparent opacity-[0.16]"
          style={{ WebkitTextStroke: `2px ${theme.primary}` }}
        >
          {theme.nameVi}
        </span>
      </div>

      <div className="l-grain pointer-events-none absolute inset-0 -z-10" aria-hidden />

      {/* Lớp 4 — chữ. Gần nhất nên dịch nhiều nhất và có nghiêng nhẹ. */}
      <div
        className="l-layer relative mx-auto w-full max-w-6xl px-6 py-16 md:py-20"
        style={
          {
            ['--shift-x']: '16px',
            ['--shift-y']: '10px',
            ['--tilt']: '1.6deg',
            ['--depth']: '80px',
          } as CSSProperties
        }
      >
        <div className="grid items-end gap-12 lg:grid-cols-12">
          <div className="lg:col-span-8">
            <p className="fade-up l-eyebrow flex items-center gap-2.5 text-lime">
              <span className="relative flex size-1.5">
                <span className="absolute inset-0 animate-ping rounded-full bg-lime" />
                <span className="relative size-1.5 rounded-full bg-lime" />
              </span>
              Cộng đồng thể thao Việt Nam
            </p>

            <h1 className="l-poster mt-5 text-[clamp(50px,8.4vw,116px)] [text-shadow:0_4px_60px_rgb(11_46_34_/_0.75)]">
              <span className="fade-up stagger-1 block">Tìm trận.</span>
              <span className="fade-up stagger-2 block text-lime">Tìm bạn.</span>
              <span className="fade-up stagger-3 block">Ra sân.</span>
            </h1>

            <p className="fade-up stagger-4 mt-7 max-w-md text-base leading-relaxed text-chalk/80">
              Đăng tin tuyển thành viên, gửi lời thách đấu, tìm sân — tất cả trong một tài khoản.
            </p>

            <div className="fade-up stagger-5 mt-8 flex flex-wrap items-center gap-5">
              <Link to="/register" className="l-btn-lime">
                Tham gia miễn phí
                <span className="animate-arrow-bob" aria-hidden>
                  →
                </span>
              </Link>
              <Link
                to="/login"
                className="text-sm font-semibold text-chalk/80 underline decoration-lime decoration-2 underline-offset-8 transition hover:text-chalk"
              >
                Đã có tài khoản
              </Link>
            </div>

            <dl className="fade-up stagger-5 mt-11 flex flex-wrap gap-x-11 gap-y-5 border-t border-lime/25 pt-6">
              <Stat n="05" label="Môn thể thao" />
              <Stat n="03" label="Vai trò" />
              <Stat n="0₫" label="Phí người chơi" />
              <Stat n="∞" label="Trận đấu" />
            </dl>
          </div>

          {/* Chỉ mục môn: vừa cho biết đang xem ảnh nào, vừa cho bấm chuyển thẳng tới môn khác */}
          <nav
            className="border border-chalk/10 bg-pine/35 p-3 backdrop-blur-[3px] lg:col-span-4"
            aria-label="Chọn môn xem trước"
          >
            <ul className="fade-up stagger-4 space-y-1">
              {sports.map(({ slug }, i) => {
                const t = sportOf(slug);
                const active = i === idx;
                return (
                  <li key={slug}>
                    <button
                      type="button"
                      onClick={() => setIdx(i)}
                      aria-current={active ? 'true' : undefined}
                      className={`group flex w-full items-center gap-4 border-l-2 py-2.5 pl-4 text-left transition-all duration-500 ${
                        active
                          ? 'border-lime bg-chalk/5 pl-6'
                          : 'border-chalk/15 hover:border-chalk/50 hover:pl-5'
                      }`}
                    >
                      <span
                        className={`poster-num text-lg transition-colors duration-300 ${
                          active ? 'text-lime' : 'text-chalk/40'
                        }`}
                      >
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      <SportIcon
                        sport={slug}
                        className={`size-5 shrink-0 transition-colors duration-300 ${
                          active ? 'text-lime' : 'text-chalk/45 group-hover:text-chalk/80'
                        }`}
                      />
                      <span
                        className={`l-poster transition-all duration-500 ${
                          active ? 'text-xl text-chalk' : 'text-base text-chalk/60'
                        }`}
                      >
                        {t.nameVi}
                      </span>

                      {/* Vạch chạy hết ROTATE_MS rồi sang môn kế — cho thấy nhịp tự chuyển */}
                      {active && (
                        <span
                          key={`${idx}-${String(paused)}`}
                          className="ml-auto mr-2 h-px flex-1 origin-left bg-lime/70"
                          style={{ animation: paused ? 'none' : `draw-line ${ROTATE_MS}ms linear` }}
                          aria-hidden
                        />
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>
      </div>
    </section>
  );
}

function Stat({ n, label }: { n: string; label: string }) {
  return (
    <div>
      <dt className="sr-only">{label}</dt>
      <dd className="poster-num text-[2.6rem] leading-none text-lime">{n}</dd>
      <p className="mt-1.5 text-[11px] font-semibold text-chalk/55">{label}</p>
    </div>
  );
}

function Marquee() {
  const { sports, sportOf } = useSports();
  const strip = [...sports, ...sports, ...sports];
  return (
    <div className="overflow-hidden border-y border-pine/12 bg-pine py-4">
      <div className="flex w-max animate-marquee items-center gap-8" aria-hidden>
        {strip.map(({ slug }, i) => (
          <span key={`${slug}-${i}`} className="flex items-center gap-8">
            <span className="l-poster text-2xl text-chalk/85">{sportOf(slug).nameVi}</span>
            <span className="size-1.5 shrink-0 rotate-45 bg-lime" />
          </span>
        ))}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */

/** Quá số này thì lưới bắt đầu xuống dòng lởm chởm — chuyển sang băng trượt. */
const GRID_MAX = 6;

function SportGrid() {
  const { sports } = useSports();
  const scrolling = sports.length > GRID_MAX;

  return (
    <section className="border-b border-pine/12">
      <div className="mx-auto max-w-6xl px-6 pb-8 pt-20 md:pt-24">
        <div className="mb-10 flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="l-eyebrow text-clay">{sports.length} môn — một cộng đồng</p>
            <h2 className="l-poster mt-3 text-[clamp(34px,5vw,60px)]">Chọn môn của bạn.</h2>
          </div>
          <p className="max-w-xs text-sm leading-relaxed text-graphite-soft">
            Mỗi môn có màu riêng, feed riêng, cộng đồng riêng. Đổi môn bất cứ lúc nào.
          </p>
        </div>
      </div>

      {scrolling ? <SportRail sports={sports} /> : <SportGridStatic sports={sports} />}

      <div className="h-20 md:h-24" aria-hidden />
    </section>
  );
}

/** Ít môn: lưới tĩnh, auto-fit nên tự chia lại cột. */
function SportGridStatic({ sports }: { sports: SportCatalogItem[] }) {
  return (
    <div className="mx-auto max-w-6xl px-6">
      <ul className="grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-3">
        {sports.map((sport, idx) => (
          <li key={sport.slug}>
            <SportTile sport={sport} idx={idx} />
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Nhiều môn: băng trượt ngang liên tục, tràn ra hai mép để thấy rõ là còn nữa.
 * Danh sách được nhân đôi và chạy hết đúng 50% chiều rộng nên vòng lặp liền mạch.
 * Bản sao mang aria-hidden để trình đọc màn hình không đọc hai lần.
 */
function SportRail({ sports }: { sports: SportCatalogItem[] }) {
  // Mỗi môn khoảng 5 giây, để thêm môn thì trượt lâu hơn chứ không nhanh hơn.
  const speed = `${sports.length * 5}s`;

  return (
    <div className="l-rail relative">
      <ul className="l-track flex w-max gap-3" style={{ ['--rail-speed']: speed } as CSSProperties}>
        {sports.map((sport, idx) => (
          <li key={sport.slug} className="w-[190px] shrink-0">
            <SportTile sport={sport} idx={idx} />
          </li>
        ))}
        {sports.map((sport, idx) => (
          <li key={`dup-${sport.slug}`} className="w-[190px] shrink-0" aria-hidden>
            <SportTile sport={sport} idx={idx} />
          </li>
        ))}
      </ul>

      {/* Mờ dần hai mép để băng trượt trông như chạy ra ngoài khung */}
      <div
        className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-chalk to-transparent"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-chalk to-transparent"
        aria-hidden
      />
    </div>
  );
}

function SportTile({ sport, idx }: { sport: SportCatalogItem; idx: number }) {
  const imageOf = useLandingImages();

  return (
    <article
      className="group relative flex aspect-[4/5] flex-col justify-between overflow-hidden p-5 text-white transition-transform duration-300 hover:-translate-y-1.5"
      style={{ backgroundColor: sport.primary }}
    >
      <img
        src={imageOf(sport.slug).tile}
        alt=""
        aria-hidden
        loading="lazy"
        decoding="async"
        className="absolute inset-0 size-full object-cover transition-transform duration-500 group-hover:scale-[1.07]"
      />
      {/* Nhuộm màu môn nhưng vẫn để ảnh lộ — dịu đi khi rê chuột */}
      <div
        className="absolute inset-0 opacity-55 mix-blend-multiply transition-opacity duration-500 group-hover:opacity-35"
        style={{ backgroundColor: sport.primary }}
        aria-hidden
      />
      <div
        className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-black/25"
        aria-hidden
      />

      <div className="relative flex items-start justify-between">
        <SportIcon sport={sport.slug} className="size-9" />
        <span className="poster-num text-2xl opacity-50">{String(idx + 1).padStart(2, '0')}</span>
      </div>

      <div className="relative">
        <p className="l-poster text-xl leading-none">{sport.nameVi}</p>
        <span className="mt-3 block h-0.5 w-8 origin-left bg-white/70 transition-transform duration-500 group-hover:scale-x-[2.5]" />
      </div>
    </article>
  );
}

function HowItWorks() {
  const steps = [
    { n: '01', title: 'Đăng ký', body: 'Email, mật khẩu, một phút — và bạn vào được cộng đồng.' },
    { n: '02', title: 'Chọn môn', body: 'Một hay nhiều môn cũng được. Mỗi môn có theme riêng.' },
    {
      n: '03',
      title: 'Tạo đội hoặc gia nhập',
      body: 'Là đội trưởng hay thành viên, bạn đều có chỗ trên feed.',
    },
    {
      n: '04',
      title: 'Tuyển / Thách đấu',
      body: 'Đăng bài. Cộng đồng phản hồi. Trận đấu được lên lịch.',
    },
  ];

  return (
    <section className="border-b border-pine/12 bg-sand">
      <div className="mx-auto max-w-6xl px-6 py-20 md:py-24">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="l-eyebrow text-clay">Cách hoạt động</p>
            <h2 className="l-poster mt-3 text-[clamp(34px,5vw,60px)]">Bốn bước, ra sân.</h2>
          </div>
        </div>

        <ol className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {steps.map((s, i) => (
            <li key={s.n} className="group relative">
              {/* Đường nối giữa các bước */}
              {i < steps.length - 1 && (
                <span
                  className="absolute left-14 right-0 top-6 hidden h-px bg-pine/20 lg:block"
                  aria-hidden
                />
              )}
              <span className="l-poster relative flex size-12 items-center justify-center bg-pine text-lg text-lime transition-colors duration-300 group-hover:bg-clay group-hover:text-white">
                {s.n}
              </span>
              <p className="l-poster mt-5 text-lg text-pine">{s.title}</p>
              <p className="mt-2 text-sm leading-relaxed text-graphite-soft">{s.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */

function FinalCta() {
  return (
    <section className="relative overflow-hidden bg-pine text-chalk">
      <div className="l-pitchgrid pointer-events-none absolute inset-0" aria-hidden />
      <div className="l-grain pointer-events-none absolute inset-0" aria-hidden />
      <div
        className="pointer-events-none absolute -bottom-52 left-1/3 size-[520px] rounded-full opacity-20 blur-3xl"
        style={{ background: 'radial-gradient(circle, rgba(198,242,78,0.6) 0%, transparent 70%)' }}
        aria-hidden
      />

      <div className="relative mx-auto flex max-w-6xl flex-col items-start justify-between gap-10 px-6 py-20 md:flex-row md:items-end md:py-24">
        <div>
          <p className="l-eyebrow text-lime">Sẵn sàng?</p>
          <h2 className="l-poster mt-3 text-[clamp(38px,6.5vw,80px)]">
            Một trận đấu
            <br />
            <span className="text-lime">đang chờ bạn.</span>
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <Link to="/register" className="l-btn-lime">
            Tham gia ngay
            <span className="animate-arrow-bob" aria-hidden>
              →
            </span>
          </Link>
          <Link
            to="/login"
            className="border border-chalk/25 px-7 py-3.5 text-sm font-semibold transition hover:border-chalk hover:bg-chalk/5"
          >
            Đăng nhập
          </Link>
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */

function Footer() {
  return (
    <footer>
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-6 py-8 md:flex-row md:items-center md:justify-between">
        <p className="l-poster text-base text-pine">
          SportsForAll<span className="text-clay">.</span>
        </p>
        <p className="text-xs text-graphite-soft">
          2026 · Người chơi không trả phí · Xây dựng từ Idea.md
        </p>
      </div>
    </footer>
  );
}
