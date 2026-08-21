import {
  SKILL_LEVEL_LABELS,
  type DashboardResponse,
  type IncomingChallengeItem,
  type MatchRequestListResponse,
  type MatchRequestSummary,
  type NextMatchView,
  type PendingJoinRequestItem,
  type ProfileResponse,
  type RecruitmentListResponse,
  type RecruitmentPostSummary,
  type SportSlug,
  type TeamSummary,
} from '@sfa/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Avatar } from '@/components/Avatar';
import { NotificationBell } from '@/components/NotificationBell';
import { SportIcon } from '@/components/SportIcon';
import { api } from '@/lib/api';
import { useSports } from '@/lib/use-sports';
import { useAuthStore } from '@/stores/auth-store';
import { applySportTheme, useSportStore } from '@/stores/sport-store';

const WEEKDAY_LABELS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

export function HomePage() {
  const queryClient = useQueryClient();
  const { sports, sportOf } = useSports();
  const current = useSportStore((s) => s.current);
  const setCurrent = useSportStore((s) => s.setCurrent);
  const theme = sportOf(current);
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

  const dashboardQuery = useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const { data } = await api.get<DashboardResponse>('/dashboard');
      return data;
    },
  });

  const teamsQuery = useQuery({
    queryKey: ['teams', 'me'],
    queryFn: async () => {
      const { data } = await api.get<{ teams: TeamSummary[] }>('/teams/me');
      return data.teams;
    },
  });

  const profileQuery = useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      const { data } = await api.get<ProfileResponse>('/profile');
      return data;
    },
  });

  const openMatchesQuery = useQuery({
    queryKey: ['matches', 'open', current],
    queryFn: async () => {
      const { data } = await api.get<MatchRequestListResponse>(
        `/matches/requests?sport=${current}&limit=6`,
      );
      return data.items;
    },
  });

  const postsQuery = useQuery({
    queryKey: ['recruitment', 'home', current],
    queryFn: async () => {
      const { data } = await api.get<RecruitmentListResponse>(
        `/recruitment/posts?sport=${current}&limit=3`,
      );
      return data.items;
    },
  });

  /** Thách đấu chính đội mình thì không mời được — bỏ khỏi danh sách "đang tìm đối". */
  const openMatches = useMemo(
    () => (openMatchesQuery.data ?? []).filter((r) => !r.viewerOwns).slice(0, 3),
    [openMatchesQuery.data],
  );

  const dashboard = dashboardQuery.data;
  const teams = teamsQuery.data ?? [];

  /**
   * Hồ sơ chưa khai vị trí ở môn đang xem thì đội khó tìm thấy — nhắc ngay trong
   * khối việc cần xử lý. Đây là việc phía client tự suy ra, không nằm trong
   * `actionCount` của API.
   */
  const missingPosition =
    profileQuery.data != null &&
    !profileQuery.data.sportPreferences.some((p) => p.sport === current && p.position);

  const actionCount = (dashboard?.actionCount ?? 0) + (missingPosition ? 1 : 0);

  /** Đội đầu tiên mình làm captain/phó — nơi dẫn tới khi bấm "Đăng tin tìm đối". */
  const managedTeam = teams.find(
    (t) => t.viewerRole === 'captain' || t.viewerRole === 'co_captain',
  );
  const postMatchTo = managedTeam ? `/teams/${managedTeam.id}/match-requests/new` : '/teams';

  const invalidateActions = () => {
    void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    void queryClient.invalidateQueries({ queryKey: ['notifications'] });
  };

  const joinRequestMutation = useMutation({
    mutationFn: async ({ id, decision }: { id: string; decision: 'accept' | 'reject' }) => {
      await api.post(`/recruitment/requests/${id}/${decision}`);
    },
    onSuccess: () => {
      invalidateActions();
      void queryClient.invalidateQueries({ queryKey: ['teams'] });
    },
  });

  const challengeMutation = useMutation({
    mutationFn: async ({ id, decision }: { id: string; decision: 'accept' | 'reject' }) => {
      await api.post(`/matches/challenges/${id}/${decision}`);
    },
    onSuccess: () => {
      invalidateActions();
      void queryClient.invalidateQueries({ queryKey: ['matches'] });
    },
  });

  const attendanceMutation = useMutation({
    mutationFn: async ({ matchId, going }: { matchId: string; going: boolean }) => {
      await api.post(`/matches/${matchId}/attendance`, { status: going ? 'going' : 'not_going' });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });

  const selectSport = (slug: SportSlug) => {
    setCurrent(slug);
    applySportTheme(slug);
  };

  useEffect(() => {
    document.title = `SportsForAll · ${theme.nameVi}`;
  }, [theme.nameVi]);

  return (
    <div className="min-h-screen bg-paper text-ink">
      <header className="border-b border-ink/10 bg-paper/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-6 py-4">
          <Link to="/dashboard" className="flex items-baseline gap-2">
            <span className="font-display text-2xl font-black leading-none tracking-tight">
              SportsForAll
            </span>
            <span className="poster-num text-2xl text-primary-dark">·</span>
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

      <main className="mx-auto max-w-6xl px-6 py-10">
        {/* Tiêu đề ngày */}
        <section className="fade-up flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="text-[13px] font-semibold text-ink-soft">{todayLabel} · Hà Nội</p>
            <h1 className="mt-2 font-display text-[clamp(32px,5vw,44px)] font-black leading-none tracking-tight">
              Hôm nay của {givenName}
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {actionCount > 0 && (
              <span className="inline-flex items-center gap-2 border border-ink/15 bg-white px-4 py-2.5 text-[13px] font-semibold">
                <span aria-hidden className="size-2 bg-rust" />
                {actionCount} việc cần xử lý
              </span>
            )}
            <Link to={postMatchTo} className="btn-primary">
              Đăng tin tìm đối <span aria-hidden>→</span>
            </Link>
          </div>
        </section>

        <div className="mt-6 h-[3px] origin-left bg-ink animate-draw-line" aria-hidden />

        {/* Tầng 1 — trận kế tiếp + việc cần xử lý */}
        <section className="mt-8 grid items-start gap-10 lg:grid-cols-12">
          <div className="lg:col-span-7">
            {dashboard?.nextMatch ? (
              <NextMatchCard
                match={dashboard.nextMatch}
                onAttend={(going) =>
                  attendanceMutation.mutate({ matchId: dashboard.nextMatch!.id, going })
                }
                pending={attendanceMutation.isPending}
              />
            ) : (
              <div className="surface-ink l-pitchgrid p-8">
                <p className="text-[13px] font-bold text-paper/70">Trận kế tiếp của bạn</p>
                <p className="mt-4 font-display text-3xl font-black leading-tight tracking-tight">
                  Chưa có trận nào được chốt lịch.
                </p>
                <p className="mt-2 text-[15px] text-paper/75">
                  Nhận lời thách đấu hoặc đăng tin tìm đối để xếp trận đầu tiên.
                </p>
                <Link
                  to="/find-opponents"
                  className="mt-6 inline-flex items-center gap-2 bg-lime px-6 py-3.5 text-sm font-extrabold text-ink"
                >
                  Xem đội đang tìm đối <span aria-hidden>→</span>
                </Link>
              </div>
            )}
          </div>

          <div className="lg:col-span-5">
            <header className="flex items-baseline justify-between border-b-2 border-ink pb-2.5">
              <h2 className="font-display text-2xl font-black leading-none tracking-tight">
                Cần bạn xử lý
              </h2>
              <span className="poster-num text-2xl text-rust">
                {String(actionCount).padStart(2, '0')}
              </span>
            </header>

            <div className="mt-4 space-y-4">
              {dashboard?.pendingJoinRequests.map((r) => (
                <JoinRequestCard
                  key={r.id}
                  item={r}
                  onDecide={(decision) => joinRequestMutation.mutate({ id: r.id, decision })}
                  pending={joinRequestMutation.isPending}
                />
              ))}

              {dashboard?.incomingChallenges.map((c) => (
                <ChallengeCard
                  key={c.id}
                  item={c}
                  onDecide={(decision) => challengeMutation.mutate({ id: c.id, decision })}
                  pending={challengeMutation.isPending}
                />
              ))}

              {missingPosition && (
                <div className="flex items-center gap-3 border border-ink/12 bg-white p-4">
                  <span aria-hidden className="size-2 shrink-0 bg-rust" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[15px] font-bold">Hồ sơ thiếu vị trí sở trường</p>
                    <p className="mt-0.5 text-xs text-ink-soft">
                      Điền để đội dễ tìm thấy bạn ở môn {theme.nameVi}
                    </p>
                  </div>
                  <Link to="/profile" className="shrink-0 text-[13px] font-bold hover:underline">
                    Điền ngay →
                  </Link>
                </div>
              )}

              {actionCount === 0 && !dashboardQuery.isLoading && (
                <p className="border border-dashed border-ink/25 bg-white p-8 text-center text-sm text-ink-soft">
                  Không có việc nào chờ bạn. Cứ yên tâm đi đá.
                </p>
              )}
            </div>
          </div>
        </section>

        {/* Tầng 2 — trận còn khuyết một bên */}
        <section className="mt-14">
          <header className="flex flex-wrap items-end justify-between gap-4 border-b-2 border-ink pb-3">
            <div>
              <p className="text-[13px] font-bold text-ink-soft">
                Các trận còn khuyết một bên · {theme.nameVi}
              </p>
              <h2 className="mt-1.5 font-display text-3xl font-black leading-none tracking-tight md:text-[34px]">
                Trận đang tìm đối
              </h2>
            </div>
            <div className="flex items-center gap-5">
              <Link to="/find-opponents" className="text-sm font-bold hover:underline">
                Xem tất cả →
              </Link>
              <span className="poster-num text-3xl text-primary-dark md:text-[34px]">
                {String(openMatches.length).padStart(2, '0')}
              </span>
            </div>
          </header>

          {openMatchesQuery.isLoading ? (
            <p className="mt-6 text-sm text-ink-soft">Đang tải...</p>
          ) : openMatches.length === 0 ? (
            <p className="mt-5 border border-dashed border-ink/25 bg-white p-10 text-center text-sm text-ink-soft">
              Chưa đội nào đăng tìm đối ở môn {theme.nameVi}. Đăng trận của bạn để mở màn.
            </p>
          ) : (
            <div className="mt-5 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {openMatches.map((req) => (
                <OpenMatchCard key={req.id} req={req} />
              ))}
            </div>
          )}

          <div className="mt-5 flex flex-wrap items-center gap-4 border border-dashed border-ink/25 bg-paper-2/40 p-5">
            <span
              aria-hidden
              className="flex size-10 shrink-0 items-center justify-center border-2 border-dashed border-ink/30 text-ink-soft"
            >
              <PlusIcon />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-extrabold tracking-tight">
                Đội bạn cũng đang rảnh cuối tuần?
              </p>
              <p className="mt-0.5 text-[13px] text-ink-soft">
                Đăng một trận và để đội khác tìm đến bạn.
              </p>
            </div>
            <Link to={postMatchTo} className="btn-ghost shrink-0 bg-white">
              Đăng tin tìm đối <span aria-hidden>→</span>
            </Link>
          </div>
        </section>

        {/* Tầng 3 — tuyển quân + đội của tôi */}
        <section className="mt-14 grid items-start gap-10 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <header className="flex flex-wrap items-end justify-between gap-3 border-b-2 border-ink pb-2.5">
              <h2 className="font-display text-2xl font-black leading-none tracking-tight">
                Đội đang cần người
              </h2>
              <div className="flex flex-wrap gap-1.5">
                {sports.map(({ slug, nameVi }) => (
                  <button
                    key={slug}
                    type="button"
                    onClick={() => selectSport(slug)}
                    className={`px-3 py-1.5 text-xs font-semibold transition ${
                      slug === current
                        ? 'bg-ink font-bold text-paper'
                        : 'border border-ink/15 bg-white text-ink-soft hover:border-ink hover:text-ink'
                    }`}
                  >
                    {nameVi}
                  </button>
                ))}
              </div>
            </header>

            {postsQuery.isLoading ? (
              <p className="mt-6 text-sm text-ink-soft">Đang tải...</p>
            ) : (postsQuery.data?.length ?? 0) === 0 ? (
              <p className="mt-5 border border-dashed border-ink/25 bg-white p-10 text-center text-sm text-ink-soft">
                Chưa có đội nào tuyển quân ở môn {theme.nameVi}.
              </p>
            ) : (
              <ul className="mt-2 divide-y divide-ink/10">
                {postsQuery.data?.map((post) => (
                  <RecruitmentRow key={post.id} post={post} />
                ))}
              </ul>
            )}

            <div className="mt-5 flex flex-wrap items-center gap-6">
              <Link to="/find-teammates" className="text-sm font-bold hover:underline">
                Tất cả bài tuyển →
              </Link>
              <Link to="/looking-for-team" className="text-sm font-bold hover:underline">
                Người đang tìm đội →
              </Link>
            </div>
          </div>

          <aside className="lg:col-span-5">
            <header className="flex items-baseline justify-between border-b-2 border-ink pb-2.5">
              <h2 className="font-display text-2xl font-black leading-none tracking-tight">
                Đội của tôi
              </h2>
              <span className="poster-num text-2xl text-primary-dark">
                {String(teams.length).padStart(2, '0')}
              </span>
            </header>

            <div className="mt-4 space-y-4">
              {teams.length === 0 ? (
                <div className="border border-dashed border-ink/25 bg-white p-8 text-center">
                  <p className="text-sm text-ink-soft">Bạn chưa thuộc đội nào.</p>
                  <Link to="/teams/new" className="btn-primary mt-4">
                    Tạo đội <span aria-hidden>→</span>
                  </Link>
                </div>
              ) : (
                teams.map((team) => <TeamRow key={team.id} team={team} />)
              )}

              <WeekStrip nextMatchAt={dashboard?.nextMatch?.scheduledAt ?? null} />
            </div>
          </aside>
        </section>
      </main>

      <footer className="border-t border-ink/10 bg-paper">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-6 py-6 md:flex-row md:items-center md:justify-between">
          <p className="text-xs text-ink-soft">SportsForAll · 2026</p>
          <p className="text-xs text-ink-soft">{user?.email}</p>
        </div>
      </footer>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Tầng 1                                                                     */
/* -------------------------------------------------------------------------- */

function NextMatchCard({
  match,
  onAttend,
  pending,
}: {
  match: NextMatchView;
  onAttend: (going: boolean) => void;
  pending: boolean;
}) {
  const squad = match.attendance.going + match.attendance.notGoing + match.attendance.pending;
  const countdown = daysUntil(match.scheduledAt);

  return (
    <article className="surface-ink l-pitchgrid flex flex-col gap-6 p-8">
      <div className="flex items-center justify-between gap-4">
        <p className="text-[13px] font-bold text-paper/70">Trận kế tiếp của bạn</p>
        {countdown !== null && (
          <span className="bg-lime px-3 py-1.5 text-xs font-extrabold text-ink">
            {countdown === 0 ? 'Hôm nay' : countdown === 1 ? 'Ngày mai' : `Còn ${countdown} ngày`}
          </span>
        )}
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-5">
        <TeamPole team={match.myTeam} caption="Đội của bạn" highlight />
        <span className="poster-num text-3xl text-lime">VS</span>
        <TeamPole team={match.opponent} caption="Đối thủ" />
      </div>

      <p className="flex items-center justify-center gap-2.5 border-t border-paper/20 pt-5 text-center text-[15px] text-paper/80">
        <CalendarIcon />
        {formatFullTime(match.scheduledAt)}
        {match.venueName ? ` · Sân ${match.venueName}` : ''}
      </p>

      <dl className="grid grid-cols-3 gap-5">
        <DarkStat n={match.attendance.going} label="Đã báo có mặt" accent />
        <DarkStat n={match.attendance.pending} label="Chưa trả lời" accent />
        <DarkStat n={squad} label="Sĩ số đội" />
      </dl>

      <div className="flex flex-wrap gap-2.5">
        <button
          type="button"
          disabled={pending}
          onClick={() => onAttend(match.attendance.mine !== 'going')}
          className="bg-lime px-6 py-3.5 text-sm font-extrabold text-ink transition hover:-translate-y-0.5 disabled:opacity-50"
        >
          {match.attendance.mine === 'going' ? 'Đã báo có mặt ✓' : 'Báo có mặt'}
        </button>
        <Link
          to={match.matchRequestId ? `/match-requests/${match.matchRequestId}` : '/teams'}
          className="border border-paper/35 px-6 py-3.5 text-sm font-semibold text-paper transition hover:bg-paper/10"
        >
          Chi tiết trận
        </Link>
      </div>
    </article>
  );
}

function TeamPole({
  team,
  caption,
  highlight = false,
}: {
  team: NextMatchView['myTeam'];
  caption: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-2.5">
      <span
        aria-hidden
        className={`flex size-16 items-center justify-center text-3xl ${
          highlight ? 'text-white' : 'bg-paper/12 text-paper'
        }`}
        style={highlight ? { backgroundColor: 'rgb(var(--color-primary))' } : undefined}
      >
        <SportIcon sport={team.sport} className="size-[1em]" />
      </span>
      <p className="text-center font-display text-[22px] font-black leading-tight tracking-tight">
        {team.name}
      </p>
      <p className="text-xs font-semibold text-paper/60">{caption}</p>
    </div>
  );
}

function DarkStat({ n, label, accent = false }: { n: number; label: string; accent?: boolean }) {
  return (
    <div>
      <p className={`poster-num text-[34px] ${accent ? 'text-lime' : 'text-paper'}`}>
        {String(n).padStart(2, '0')}
      </p>
      <p className="mt-1.5 text-xs font-semibold text-paper/70">{label}</p>
    </div>
  );
}

function JoinRequestCard({
  item,
  onDecide,
  pending,
}: {
  item: PendingJoinRequestItem;
  onDecide: (decision: 'accept' | 'reject') => void;
  pending: boolean;
}) {
  const meta = [item.positionNeeded, item.skillLevel ? SKILL_LEVEL_LABELS[item.skillLevel] : null]
    .filter(Boolean)
    .join(' · ');

  return (
    <article className="relative border border-ink/12 bg-white p-[18px] shadow-[4px_4px_0_rgba(11,46,34,0.08)]">
      <span aria-hidden className="absolute inset-y-0 left-0 w-[3px] bg-rust" />
      <div className="flex items-center gap-3">
        <Avatar name={item.applicant.displayName} src={item.applicant.avatarUrl} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-bold">
            {item.applicant.displayName} xin vào {item.team.name}
          </p>
          <p className="mt-0.5 truncate text-xs text-ink-soft">
            {[meta, timeAgo(item.createdAt)].filter(Boolean).join(' · ')}
          </p>
        </div>
      </div>
      <div className="mt-3.5 flex gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={() => onDecide('accept')}
          className="bg-ink px-5 py-2.5 text-[13px] font-bold text-paper transition hover:bg-ink/92 disabled:opacity-50"
        >
          Duyệt
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => onDecide('reject')}
          className="border border-ink/25 px-5 py-2.5 text-[13px] font-semibold transition hover:border-ink disabled:opacity-50"
        >
          Từ chối
        </button>
      </div>
    </article>
  );
}

function ChallengeCard({
  item,
  onDecide,
  pending,
}: {
  item: IncomingChallengeItem;
  onDecide: (decision: 'accept' | 'reject') => void;
  pending: boolean;
}) {
  const meta = [
    item.preferredTime ? formatShortTime(item.preferredTime) : null,
    item.venueName ? `Sân ${item.venueName}` : null,
    item.region,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <article className="relative border border-ink/12 bg-white p-[18px] shadow-[4px_4px_0_rgba(11,46,34,0.08)]">
      <span aria-hidden className="absolute inset-y-0 left-0 w-[3px] bg-rust" />
      <div className="flex items-center gap-3">
        <span
          aria-hidden
          className="sport-block flex size-10 shrink-0 items-center justify-center text-xl"
        >
          <SportIcon sport={item.challengerTeam.sport} className="size-[1em]" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-bold">
            {item.challengerTeam.name} thách đấu {item.myTeam.name}
          </p>
          <p className="mt-0.5 truncate text-xs text-ink-soft">{meta || 'Chưa chốt thời gian'}</p>
        </div>
      </div>
      <div className="mt-3.5 flex gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={() => onDecide('accept')}
          className="bg-ink px-5 py-2.5 text-[13px] font-bold text-paper transition hover:bg-ink/92 disabled:opacity-50"
        >
          Nhận lời
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => onDecide('reject')}
          className="border border-ink/25 px-5 py-2.5 text-[13px] font-semibold transition hover:border-ink disabled:opacity-50"
        >
          Bỏ qua
        </button>
      </div>
    </article>
  );
}

/* -------------------------------------------------------------------------- */
/* Tầng 2 — thẻ trận còn khuyết một bên                                       */
/* -------------------------------------------------------------------------- */

function OpenMatchCard({ req }: { req: MatchRequestSummary }) {
  const when = req.preferredTime ? new Date(req.preferredTime) : null;

  return (
    <Link
      to={`/match-requests/${req.id}`}
      className="group relative flex flex-col gap-[18px] border border-ink/12 bg-white p-[22px] transition hover:-translate-y-1 hover:shadow-[6px_6px_0_rgba(11,46,34,0.12)]"
    >
      <span aria-hidden className="absolute inset-x-0 top-0 h-[3px] bg-primary" />

      <div className="flex items-baseline justify-between gap-3">
        <span className="poster-num text-3xl">
          {when
            ? when.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })
            : 'Chưa chốt'}
        </span>
        <span className="text-[13px] font-bold text-ink-soft">
          {when
            ? when.toLocaleDateString('vi-VN', {
                weekday: 'short',
              }) +
              ' · ' +
              when.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
            : 'Thoả thuận sau'}
        </span>
      </div>

      {/* Cặp đấu khuyết một bên: ô gạch đứt chính là chỗ của đội người xem. */}
      <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3">
        <div className="flex flex-col items-center gap-2">
          <span
            aria-hidden
            className="sport-block flex size-12 items-center justify-center text-2xl text-white"
          >
            <SportIcon sport={req.sport} className="size-[1em]" />
          </span>
          <span className="text-center text-[15px] font-extrabold leading-tight tracking-tight">
            {req.team.name}
          </span>
        </div>
        <span className="poster-num text-lg text-ink-soft">VS</span>
        <div className="flex flex-col items-center gap-2">
          <span
            aria-hidden
            className="flex size-12 items-center justify-center border-2 border-dashed border-ink/30 text-ink-soft transition group-hover:border-ink"
          >
            <PlusIcon />
          </span>
          <span className="text-center text-[15px] font-extrabold leading-tight tracking-tight text-ink-soft">
            Còn trống
          </span>
        </div>
      </div>

      <p className="border-t border-ink/10 pt-3.5 text-[13px] text-ink-soft">
        {[req.venueName ? `Sân ${req.venueName}` : null, req.region].filter(Boolean).join(' · ') ||
          'Chưa chốt địa điểm'}
        <br />
        {req.skillLevelMin ? `Từ ${SKILL_LEVEL_LABELS[req.skillLevelMin]}` : 'Nhận mọi trình độ'}
        {req.challengeCount > 0 ? ` · ${req.challengeCount} đội đã xin đấu` : ''}
      </p>

      <span className="bg-ink px-4 py-3.5 text-center text-sm font-bold text-paper">
        Gửi lời thách đấu
      </span>
    </Link>
  );
}

/* -------------------------------------------------------------------------- */
/* Tầng 3                                                                     */
/* -------------------------------------------------------------------------- */

function RecruitmentRow({ post }: { post: RecruitmentPostSummary }) {
  const meta = [
    post.skillLevelMin ? `từ ${SKILL_LEVEL_LABELS[post.skillLevelMin]}` : null,
    post.region,
    timeAgo(post.createdAt),
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <li>
      <Link to={`/posts/${post.id}`} className="group flex items-center gap-4 py-4">
        <span
          aria-hidden
          className="sport-block flex size-14 shrink-0 items-center justify-center text-2xl text-white"
        >
          <SportIcon sport={post.sport} className="size-[1em]" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-xl font-black leading-tight tracking-tight">
            {post.team.name}
            {post.positionNeeded ? ` · ${post.positionNeeded}` : ''}
          </p>
          <p className="mt-1 truncate text-[13px] text-ink-soft">{meta}</p>
        </div>
        <span className="shrink-0 border border-ink/25 px-4 py-2.5 text-[13px] font-bold transition group-hover:border-ink">
          Xin vào đội →
        </span>
      </Link>
    </li>
  );
}

function TeamRow({ team }: { team: TeamSummary }) {
  const roleLabel =
    team.viewerRole === 'captain'
      ? 'Đội trưởng'
      : team.viewerRole === 'co_captain'
        ? 'Phó đội'
        : 'Thành viên';

  return (
    <Link
      to={`/teams/${team.id}`}
      className="flex items-center gap-3.5 border border-ink/12 bg-white p-[18px] transition hover:border-ink"
    >
      <span
        aria-hidden
        className="sport-block flex size-12 shrink-0 items-center justify-center text-2xl text-white"
      >
        <SportIcon sport={team.sport} className="size-[1em]" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-display text-xl font-black leading-tight tracking-tight">
          {team.name}
        </p>
        <p className="mt-1 truncate text-[13px] text-ink-soft">
          {[roleLabel, `${team.memberCount} thành viên`, team.region].filter(Boolean).join(' · ')}
        </p>
      </div>
    </Link>
  );
}

/** Dải bảy ngày của tuần hiện tại; tô đậm hôm nay và ngày có trận. */
function WeekStrip({ nextMatchAt }: { nextMatchAt: string | null }) {
  const days = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const monday = new Date(today);
    // getDay(): CN = 0. Đẩy về thứ Hai đầu tuần.
    monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return d;
    });
  }, []);

  const matchDay = nextMatchAt ? new Date(nextMatchAt) : null;
  const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  const today = new Date();
  const hasMatchThisWeek = matchDay != null && days.some((d) => sameDay(d, matchDay));

  return (
    <div className="border-t border-ink/10 pt-[18px]">
      <div className="flex items-baseline justify-between">
        <p className="text-[13px] font-bold text-ink-soft">Tuần này</p>
        <p className="text-xs text-ink-soft/75">
          {hasMatchThisWeek ? '1 trận đã chốt' : 'Chưa có trận nào'}
        </p>
      </div>
      <div className="mt-3 grid grid-cols-7 gap-1.5">
        {days.map((d, i) => {
          const isToday = sameDay(d, today);
          const isMatch = matchDay != null && sameDay(d, matchDay);
          return (
            <div
              key={d.toISOString()}
              className={`flex flex-col items-center gap-1.5 py-2.5 ${
                isMatch
                  ? 'sport-block text-white'
                  : isToday
                    ? 'border border-ink bg-ink text-paper'
                    : 'border border-ink/12 bg-white'
              }`}
            >
              <span
                className={`text-[11px] ${isMatch || isToday ? 'opacity-75' : 'text-ink-soft'}`}
              >
                {WEEKDAY_LABELS[i]}
              </span>
              <span className="poster-num text-base">{d.getDate()}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Tiện ích                                                                   */
/* -------------------------------------------------------------------------- */

function daysUntil(iso: string | null): number | null {
  if (!iso) return null;
  const target = new Date(iso);
  target.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

function formatFullTime(iso: string | null): string {
  if (!iso) return 'Chưa chốt thời gian';
  return new Date(iso).toLocaleString('vi-VN', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatShortTime(iso: string): string {
  return new Date(iso).toLocaleString('vi-VN', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function timeAgo(iso: string): string {
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (minutes < 60) return `${Math.max(1, minutes)} phút trước`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} giờ trước`;
  const days = Math.round(hours / 24);
  if (days === 1) return 'hôm qua';
  return `${days} ngày trước`;
}

function PlusIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden
    >
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      aria-hidden
    >
      <rect x="3" y="5" width="18" height="16" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </svg>
  );
}
