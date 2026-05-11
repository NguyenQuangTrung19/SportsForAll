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

            {/* Quick actions list — numbered */}
            <article className="border border-ink/12 bg-white">
              <header className="border-b border-ink/10 px-5 py-3">
                <h3 className="font-display text-lg font-black uppercase tracking-tight">
                  Lối tắt
                </h3>
              </header>
              <ul>
                <ShortcutRow num="01" title="Tìm đồng đội" to="/find-teammates" />
                <ShortcutRow num="02" title="Tìm đối thủ" to="/find-opponents" />
                <ShortcutRow num="03" title="Quản lý đội" to="/teams" />
                <ShortcutRow num="04" title="Hồ sơ cá nhân" to="/profile" last />
              </ul>
            </article>
          </aside>
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

function ShortcutRow({
  num,
  title,
  to,
  last = false,
}: {
  num: string;
  title: string;
  to: string;
  last?: boolean;
}) {
  return (
    <li>
      <Link
        to={to}
        className={`group flex items-center gap-4 px-5 py-3.5 transition hover:bg-paper-2 ${
          last ? '' : 'border-b border-ink/10'
        }`}
      >
        <span className="poster-num w-8 shrink-0 text-2xl text-ink-soft transition group-hover:text-primary">
          {num}
        </span>
        <span className="flex-1 text-base font-semibold text-ink">{title}</span>
        <span
          aria-hidden
          className="text-ink-soft transition group-hover:translate-x-1 group-hover:text-ink"
        >
          →
        </span>
      </Link>
    </li>
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
