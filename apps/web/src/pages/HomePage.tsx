import {
  SKILL_LEVEL_LABELS,
  SPORT_THEMES,
  SPORTS,
  type MatchRequestListResponse,
  type MatchRequestSummary,
  type RecruitmentListResponse,
  type RecruitmentPostSummary,
  type SportSlug,
  type TeamSummary,
} from '@sfa/shared';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { NotificationBell } from '@/components/NotificationBell';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { applySportTheme, useSportStore } from '@/stores/sport-store';

export function HomePage() {
  const current = useSportStore((s) => s.current);
  const setCurrent = useSportStore((s) => s.setCurrent);
  const theme = SPORT_THEMES[current];
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const givenName = user?.displayName?.trim().split(/\s+/).pop() ?? 'bạn';
  const initial = (user?.displayName ?? '?').trim().charAt(0).toUpperCase();
  const todayLabel = new Date().toLocaleDateString('vi-VN', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  const postsQuery = useQuery({
    queryKey: ['recruitment', 'home', current],
    queryFn: async () => {
      const { data } = await api.get<RecruitmentListResponse>(
        `/recruitment/posts?sport=${current}&limit=4`,
      );
      return data.items;
    },
  });

  const matchRequestsQuery = useQuery({
    queryKey: ['matches', 'home', current],
    queryFn: async () => {
      const { data } = await api.get<MatchRequestListResponse>(
        `/matches/requests?sport=${current}&limit=4`,
      );
      return data.items;
    },
  });

  const teamsQuery = useQuery({
    queryKey: ['teams', 'me'],
    queryFn: async () => {
      const { data } = await api.get<{ teams: TeamSummary[] }>('/teams/me');
      return data.teams;
    },
  });

  const myMatchesQuery = useQuery({
    queryKey: ['matches', 'my'],
    queryFn: async () => {
      const { data } = await api.get<{ matches: { id: string }[] }>('/matches/my');
      return data.matches;
    },
  });

  const feed = useMemo(() => {
    const posts = (postsQuery.data ?? []).map((p) => ({
      kind: 'post' as const,
      id: p.id,
      createdAt: p.createdAt,
      data: p,
    }));
    const reqs = (matchRequestsQuery.data ?? []).map((r) => ({
      kind: 'match' as const,
      id: r.id,
      createdAt: r.createdAt,
      data: r,
    }));
    return [...posts, ...reqs]
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
      .slice(0, 6);
  }, [postsQuery.data, matchRequestsQuery.data]);

  const opportunityCount =
    (postsQuery.data?.length ?? 0) + (matchRequestsQuery.data?.length ?? 0);
  const teamsCount = teamsQuery.data?.length ?? 0;
  const matchesCount = myMatchesQuery.data?.length ?? 0;

  const selectSport = (slug: SportSlug) => {
    setCurrent(slug);
    applySportTheme(slug);
  };

  useEffect(() => {
    document.title = `SportsForAll · ${theme.nameVi}`;
  }, [theme.nameVi]);

  return (
    <div className="min-h-screen bg-paper text-ink">
      {/* Top bar */}
      <header className="border-b border-ink/10 bg-paper/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-6 py-4">
          <Link to="/dashboard" className="flex items-baseline gap-2">
            <span className="font-display text-2xl font-black uppercase leading-none tracking-tight">
              SportsForAll
            </span>
            <span className="poster-num text-2xl text-primary">·</span>
          </Link>

          <div className="flex items-center gap-2">
            <NotificationBell />
            <Link
              to="/profile"
              aria-label="Hồ sơ"
              className="flex size-10 items-center justify-center border border-ink/15 bg-white font-display text-base font-black uppercase text-ink transition hover:border-ink"
            >
              {initial}
            </Link>
            <button
              type="button"
              onClick={() => void logout()}
              className="hidden border border-ink/15 px-3 py-2 text-xs font-semibold text-ink-soft transition hover:border-ink hover:text-ink sm:inline-flex"
            >
              Đăng xuất
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10 md:py-14">
        {/* Hero strip — poster-style */}
        <section className="fade-up">
          <p className="font-mono text-[11px] font-medium text-ink-soft">{todayLabel}</p>
          <h1 className="mt-4 font-display text-[clamp(48px,9vw,108px)] leading-[0.98] tracking-tight">
            Chào,
            <br />
            <span className="text-primary">{givenName}.</span>
          </h1>
          <div
            className="mt-6 h-[3px] origin-left bg-ink animate-draw-line"
            aria-hidden
          />

          <div className="mt-6 grid items-end gap-6 md:grid-cols-12">
            <div className="md:col-span-8">
              <p className="max-w-xl text-base leading-relaxed text-ink-soft md:text-lg">
                {opportunityCount > 0
                  ? `Cộng đồng ${theme.nameVi} ở Hà Nội đang mở ${opportunityCount} cơ hội. Sẵn sàng cho trận tiếp theo?`
                  : `Chưa có cơ hội cho ${theme.nameVi} hôm nay. Tạo đội và đăng tin để khởi động.`}
              </p>
            </div>
            <div className="md:col-span-4 md:text-right">
              <div className="poster-num text-7xl text-ink md:text-8xl">
                {String(opportunityCount).padStart(2, '0')}
              </div>
              <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-ink-soft">
                Cơ hội mở
              </p>
            </div>
          </div>
        </section>

        {/* Sport selector — horizontal ribbon */}
        <section className="mt-12 fade-up stagger-2">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="text-sm font-bold tracking-wide text-ink-soft">
              Môn đang xem
            </h2>
            <span className="hidden text-xs text-ink-soft/70 md:inline">
              Chuyển môn để xem dữ liệu khác
            </span>
          </div>
          <div className="-mx-1 flex flex-wrap gap-2">
            {SPORTS.map((slug) => {
              const t = SPORT_THEMES[slug];
              const isActive = slug === current;
              return (
                <button
                  key={slug}
                  type="button"
                  onClick={() => selectSport(slug)}
                  className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold transition ${
                    isActive
                      ? 'border border-ink bg-ink text-paper'
                      : 'border border-ink/15 bg-white text-ink hover:border-ink'
                  }`}
                >
                  <span aria-hidden className="text-base leading-none">
                    {t.emoji}
                  </span>
                  <span>{t.nameVi}</span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Main grid */}
        <section className="mt-12 grid gap-8 lg:grid-cols-12">
          {/* Feed */}
          <div className="lg:col-span-8">
            <header className="flex items-baseline justify-between border-b-2 border-ink pb-3">
              <h2 className="font-display text-3xl font-black uppercase leading-none tracking-tight md:text-4xl">
                Cơ hội đang mở
              </h2>
              <span className="poster-num text-3xl text-primary md:text-4xl">
                {String(opportunityCount).padStart(2, '0')}
              </span>
            </header>

            {(postsQuery.isLoading || matchRequestsQuery.isLoading) && feed.length === 0 ? (
              <p className="mt-6 text-sm text-ink-soft">Đang tải...</p>
            ) : feed.length === 0 ? (
              <div className="mt-6 border border-dashed border-ink/25 bg-white p-10 text-center">
                <p className="font-display text-2xl font-black uppercase leading-tight tracking-tight">
                  Chưa có cơ hội cho {theme.nameVi}.
                </p>
                <p className="mt-2 text-sm text-ink-soft">
                  Tạo đội và đăng bài tuyển hoặc tìm đối thủ để khởi động.
                </p>
                <Link to="/teams" className="btn-primary mt-5">
                  Đến đội của tôi <span aria-hidden>→</span>
                </Link>
              </div>
            ) : (
              <ul className="mt-2 divide-y divide-ink/10">
                {feed.map((entry) =>
                  entry.kind === 'post' ? (
                    <RecruitmentRow key={`p-${entry.id}`} post={entry.data} />
                  ) : (
                    <MatchRow key={`m-${entry.id}`} req={entry.data} />
                  ),
                )}
              </ul>
            )}

            <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-ink/10 pt-4">
              <Link
                to="/find-teammates"
                className="text-sm font-semibold text-ink hover:underline"
              >
                Tất cả bài tuyển →
              </Link>
              <Link
                to="/find-opponents"
                className="text-sm font-semibold text-ink hover:underline"
              >
                Tất cả thách đấu →
              </Link>
            </div>
          </div>

          {/* Right rail */}
          <aside className="space-y-8 lg:col-span-4">
            {/* Player stats */}
            <article className="border border-ink/12 bg-white p-6">
              <header className="flex items-start gap-3">
                <div
                  className="sport-block h-12 w-12 shrink-0 text-2xl"
                  aria-hidden
                >
                  {theme.emoji}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold uppercase tracking-wide text-ink-soft">
                    {user?.email ?? ''}
                  </p>
                  <p className="mt-1 truncate font-display text-2xl font-black uppercase leading-none tracking-tight">
                    {user?.displayName ?? '—'}
                  </p>
                </div>
              </header>
              <dl className="mt-6 grid grid-cols-3 gap-4 border-t border-ink/10 pt-5">
                <StatCell n={String(matchesCount)} label="Trận" />
                <StatCell n={String(teamsCount)} label="Đội" />
                <StatCell n="—" label="Rating" />
              </dl>
              <Link to="/profile" className="btn-ghost mt-5 w-full">
                Quản lý hồ sơ <span aria-hidden>→</span>
              </Link>
            </article>

          </aside>
        </section>

        {/* Quick actions — full-width tile grid */}
        <section className="mt-14">
          <header className="mb-5 flex items-end justify-between gap-4 border-b-2 border-ink pb-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-ink-soft">
                Lối tắt
              </p>
              <h2 className="mt-1 font-display text-3xl leading-none tracking-tight md:text-4xl">
                Đi đến đâu?
              </h2>
            </div>
            <span className="poster-num text-3xl text-primary md:text-4xl">04</span>
          </header>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <ShortcutTile
              num="01"
              title="Tìm đồng đội"
              desc="Duyệt bài tuyển từ các đội đang cần thành viên."
              to="/find-teammates"
              Icon={UsersIcon}
            />
            <ShortcutTile
              num="02"
              title="Tìm đối thủ"
              desc="Xem lời mời thách đấu, gửi đội bạn đi tham gia."
              to="/find-opponents"
              Icon={SwordsIcon}
            />
            <ShortcutTile
              num="03"
              title="Quản lý đội"
              desc="Đội của tôi, thành viên, lịch sử trận đấu."
              to="/teams"
              Icon={ShieldIcon}
            />
            <ShortcutTile
              num="04"
              title="Hồ sơ cá nhân"
              desc="Cập nhật trình độ, vị trí, khu vực."
              to="/profile"
              Icon={UserIcon}
            />
          </div>
        </section>
      </main>

      <footer className="border-t border-ink/10 bg-paper">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-6 py-6 md:flex-row md:items-center md:justify-between">
          <p className="font-mono text-xs text-ink-soft">SportsForAll · 2026</p>
          <p className="font-mono text-xs text-ink-soft">{user?.email}</p>
        </div>
      </footer>
    </div>
  );
}

function StatCell({ n, label }: { n: string; label: string }) {
  return (
    <div>
      <p className="poster-num text-4xl text-ink">{n}</p>
      <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-ink-soft">
        {label}
      </p>
    </div>
  );
}

function ShortcutTile({
  num,
  title,
  desc,
  to,
  Icon,
}: {
  num: string;
  title: string;
  desc: string;
  to: string;
  Icon: () => JSX.Element;
}) {
  return (
    <Link
      to={to}
      className="group relative block overflow-hidden border border-ink/15 bg-white p-5 transition-all duration-200 hover:-translate-y-1 hover:border-ink hover:shadow-[6px_6px_0_rgba(15,17,21,0.12)] focus-visible:-translate-y-1 focus-visible:border-ink focus-visible:shadow-[6px_6px_0_rgba(15,17,21,0.12)] focus-visible:outline-none"
    >
      {/* Top accent bar — animates in on hover */}
      <span
        className="absolute inset-x-0 top-0 h-1 origin-left scale-x-0 bg-primary transition-transform duration-300 group-hover:scale-x-100 group-focus-visible:scale-x-100"
        aria-hidden
      />

      <div className="flex items-start justify-between">
        <span className="poster-num text-5xl text-ink-soft transition-colors duration-200 group-hover:text-primary group-focus-visible:text-primary">
          {num}
        </span>
        <span
          className="flex size-9 items-center justify-center border border-ink/15 bg-paper-2/40 text-ink-soft transition-colors duration-200 group-hover:border-ink group-hover:bg-ink group-hover:text-paper group-focus-visible:border-ink group-focus-visible:bg-ink group-focus-visible:text-paper"
          aria-hidden
        >
          <Icon />
        </span>
      </div>

      <p className="mt-5 font-display text-2xl leading-tight tracking-tight">
        {title}
      </p>
      <p className="mt-1 text-sm leading-snug text-ink-soft">{desc}</p>

      <div className="mt-4 flex items-center gap-1.5 text-sm font-semibold text-ink">
        <span>Mở</span>
        <span
          aria-hidden
          className="inline-block transition-transform duration-200 group-hover:translate-x-1 group-focus-visible:translate-x-1"
        >
          →
        </span>
      </div>
    </Link>
  );
}

/* -------------------------------------------------------------------------- */
/* Inline SVG icons for shortcut tiles                                        */
/* -------------------------------------------------------------------------- */

function UsersIcon() {
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
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function SwordsIcon() {
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
      <polyline points="14.5 17.5 3 6 3 3 6 3 17.5 14.5" />
      <line x1="13" y1="19" x2="19" y2="13" />
      <line x1="16" y1="16" x2="20" y2="20" />
      <line x1="19" y1="21" x2="21" y2="19" />
      <polyline points="14.5 6.5 18 3 21 3 21 6 17.5 9.5" />
      <line x1="5" y1="14" x2="9" y2="18" />
      <line x1="7" y1="17" x2="4" y2="20" />
      <line x1="3" y1="19" x2="5" y2="21" />
    </svg>
  );
}

function ShieldIcon() {
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
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

function UserIcon() {
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
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function FeedRow({
  to,
  sport,
  tag,
  title,
  meta,
}: {
  to: string;
  sport: SportSlug;
  tag: string;
  title: string;
  meta: string;
}) {
  const t = SPORT_THEMES[sport];
  return (
    <li>
      <Link
        to={to}
        className="group flex items-stretch gap-5 py-5 transition hover:bg-paper-2/60"
      >
        <div
          className="flex size-20 shrink-0 items-center justify-center text-3xl"
          style={{ backgroundColor: t.primary, color: '#fff' }}
          aria-hidden
        >
          <span style={{ filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.25))' }}>
            {t.emoji}
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold uppercase tracking-wide text-ink-soft">
            {tag} · {t.nameVi}
          </p>
          <p className="mt-1 truncate font-display text-2xl font-black uppercase leading-tight tracking-tight md:text-3xl">
            {title}
          </p>
          <p className="mt-1 truncate text-sm text-ink-soft">{meta}</p>
        </div>
        <span
          aria-hidden
          className="self-center text-2xl text-ink-soft/60 transition group-hover:translate-x-1 group-hover:text-ink"
        >
          →
        </span>
      </Link>
    </li>
  );
}

function RecruitmentRow({ post }: { post: RecruitmentPostSummary }) {
  const parts: string[] = [];
  if (post.positionNeeded) parts.push(`Vị trí ${post.positionNeeded}`);
  if (post.skillLevelMin) parts.push(`≥ ${SKILL_LEVEL_LABELS[post.skillLevelMin]}`);
  if (post.region) parts.push(post.region);
  return (
    <FeedRow
      to={`/posts/${post.id}`}
      sport={post.sport}
      tag="Tuyển thành viên"
      title={post.team.name}
      meta={parts.length > 0 ? parts.join(' · ') : 'Đang mở tuyển'}
    />
  );
}

function MatchRow({ req }: { req: MatchRequestSummary }) {
  const parts: string[] = [];
  if (req.preferredTime) {
    parts.push(
      new Date(req.preferredTime).toLocaleString('vi-VN', {
        weekday: 'short',
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      }),
    );
  }
  if (req.venueName) parts.push(`Sân ${req.venueName}`);
  if (req.region) parts.push(req.region);
  return (
    <FeedRow
      to={`/match-requests/${req.id}`}
      sport={req.sport}
      tag="Thách đấu"
      title={req.team.name}
      meta={parts.length > 0 ? parts.join(' · ') : 'Đang tìm đối thủ'}
    />
  );
}
