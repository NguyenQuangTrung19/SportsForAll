import {
  SKILL_LEVEL_LABELS,
  TEAM_ROLES,
  TEAM_ROLE_LABELS,
  addMemberSchema,
  type AddMemberInput,
  type MatchView,
  type TeamDetail,
  type TeamMatchListResponse,
  type TeamInviteView,
  type TeamRole,
} from '@sfa/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { LoadMore } from '@/components/LoadMore';
import { SportIcon } from '@/components/SportIcon';
import { api } from '@/lib/api';
import { useSports } from '@/lib/use-sports';
import { useAuthStore } from '@/stores/auth-store';

function extractMessage(err: unknown, fallback: string): string {
  if (err instanceof AxiosError) {
    const m = (err.response?.data as { error?: { message?: string } })?.error?.message;
    if (m) return m;
  }
  return fallback;
}

export function TeamDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const currentUserId = useAuthStore((s) => s.user?.id);

  const teamQuery = useQuery({
    enabled: Boolean(id),
    queryKey: ['teams', id],
    queryFn: async () => {
      const { data } = await api.get<TeamDetail>(`/teams/${id}`);
      return data;
    },
  });

  const [actionError, setActionError] = useState<string | null>(null);

  const setTeam = (team: TeamDetail) => {
    queryClient.setQueryData(['teams', id], team);
    void queryClient.invalidateQueries({ queryKey: ['teams', 'me'] });
  };

  const addMemberMutation = useMutation({
    mutationFn: async (input: AddMemberInput) => {
      const { data } = await api.post<TeamDetail>(`/teams/${id}/members`, input);
      return data;
    },
    onSuccess: setTeam,
    onError: (err) => setActionError(extractMessage(err, 'Không thêm được thành viên')),
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: TeamRole }) => {
      const { data } = await api.patch<TeamDetail>(`/teams/${id}/members/${userId}`, { role });
      return data;
    },
    onSuccess: setTeam,
    onError: (err) => setActionError(extractMessage(err, 'Không đổi được vai trò')),
  });

  const removeMutation = useMutation({
    mutationFn: async ({ userId, isSelf }: { userId: string; isSelf: boolean }) => {
      await api.delete(`/teams/${id}/members/${userId}`);
      return { isSelf };
    },
    onSuccess: ({ isSelf }) => {
      void queryClient.invalidateQueries({ queryKey: ['teams', 'me'] });
      if (isSelf) navigate('/teams', { replace: true });
      else void queryClient.invalidateQueries({ queryKey: ['teams', id] });
    },
    onError: (err) => setActionError(extractMessage(err, 'Không xoá được thành viên')),
  });

  const cancelInviteMutation = useMutation({
    mutationFn: async (inviteId: string) => {
      const { data } = await api.post<TeamDetail>(`/teams/invites/${inviteId}/cancel`);
      return data;
    },
    onSuccess: setTeam,
    onError: (err) => setActionError(extractMessage(err, 'Không rút được lời mời')),
  });

  const disbandMutation = useMutation({
    mutationFn: async () => {
      await api.delete(`/teams/${id}`);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['teams', 'me'] });
      navigate('/teams', { replace: true });
    },
    onError: (err) => setActionError(extractMessage(err, 'Không giải tán được đội')),
  });

  const team = teamQuery.data;
  const viewerRole = team?.viewerRole ?? null;
  const canManage = viewerRole === 'captain' || viewerRole === 'co_captain';

  return (
    <div className="min-h-screen bg-paper text-ink">
      <header className="border-b border-ink/10">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-4">
          <Link
            to="/teams"
            className="font-display text-2xl font-black leading-none tracking-tight"
          >
            SportsForAll<span className="text-primary-dark">.</span>
          </Link>
          <Link to="/teams" className="text-sm font-semibold text-ink-soft hover:text-ink">
            ← Đội của tôi
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-10 md:py-14">
        {teamQuery.isLoading && <p className="text-sm text-ink-soft">Đang tải đội...</p>}

        {teamQuery.isError && (
          <p className="border border-rust bg-rust/5 px-3 py-2 text-sm font-medium text-rust">
            Không tải được đội. Có thể đội đã bị giải tán hoặc bạn không có quyền xem.
          </p>
        )}

        {team && (
          <>
            <TeamHeader team={team} />

            {actionError && (
              <p className="mt-6 border border-rust bg-rust/5 px-3 py-2 text-sm font-medium text-rust">
                {actionError}
              </p>
            )}

            <section className="mt-8 grid gap-6 lg:grid-cols-12">
              <div className="lg:col-span-7">
                <header className="flex items-baseline justify-between border-b-2 border-ink pb-3">
                  <h2 className="font-display text-2xl font-black tracking-tight">Thành viên</h2>
                  <span className="poster-num text-2xl text-primary-dark">
                    {String(team.members.length).padStart(2, '0')}
                  </span>
                </header>
                <ul className="mt-2 divide-y divide-ink/10">
                  {team.members.map((m) => {
                    const isSelf = m.userId === currentUserId;
                    return (
                      <li key={m.userId} className="flex items-center gap-4 py-4">
                        <div
                          className="flex size-11 shrink-0 items-center justify-center bg-ink font-display text-base font-black uppercase text-paper"
                          aria-hidden
                        >
                          {m.displayName.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-display text-base font-black tracking-tight">
                            {m.displayName}
                            {isSelf && (
                              <span className="ml-2 text-[11px] font-semibold tracking-wide text-primary-dark">
                                · bạn
                              </span>
                            )}
                          </p>
                          <p className="mt-0.5 text-xs text-ink-soft">
                            {TEAM_ROLE_LABELS[m.role]} · gia nhập{' '}
                            {new Date(m.joinedAt).toLocaleDateString('vi-VN')}
                          </p>
                        </div>

                        {viewerRole === 'captain' && !isSelf && (
                          <select
                            value={m.role}
                            onChange={(e) => {
                              setActionError(null);
                              updateRoleMutation.mutate({
                                userId: m.userId,
                                role: e.target.value as TeamRole,
                              });
                            }}
                            disabled={updateRoleMutation.isPending}
                            className="border border-ink/15 bg-white px-2 py-1 text-xs font-semibold text-ink"
                          >
                            {TEAM_ROLES.map((r) => (
                              <option key={r} value={r}>
                                {TEAM_ROLE_LABELS[r]}
                              </option>
                            ))}
                          </select>
                        )}

                        {(isSelf || (canManage && m.role !== 'captain')) && (
                          <button
                            type="button"
                            onClick={() => {
                              if (m.role === 'captain') return;
                              const confirmText = isSelf
                                ? 'Rời khỏi đội này?'
                                : `Xoá ${m.displayName} khỏi đội?`;
                              if (!window.confirm(confirmText)) return;
                              setActionError(null);
                              removeMutation.mutate({ userId: m.userId, isSelf });
                            }}
                            disabled={removeMutation.isPending || m.role === 'captain'}
                            className="border border-rust px-3 py-1.5 text-xs font-semibold text-rust transition hover:bg-rust/5 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            {isSelf ? 'Rời' : 'Xoá'}
                          </button>
                        )}
                      </li>
                    );
                  })}
                </ul>

                <MatchHistory teamId={team.id} />
              </div>

              <aside className="space-y-6 lg:col-span-5">
                {canManage && (
                  <article className="border border-ink/15 bg-white p-6">
                    <p className="text-xs font-bold tracking-wide text-primary-dark">
                      Hoạt động đội
                    </p>
                    <h3 className="mt-1 font-display text-xl font-black tracking-tight">
                      Đăng tin mới
                    </h3>
                    <p className="mt-2 text-sm text-ink-soft">
                      Tuyển thành viên hoặc tìm đối thủ — bài đăng sẽ xuất hiện trong feed cộng
                      đồng.
                    </p>
                    <div className="mt-4 flex flex-col gap-2">
                      <Link to={`/teams/${team.id}/posts/new`} className="btn-primary">
                        Tuyển thành viên <span aria-hidden>→</span>
                      </Link>
                      <Link to={`/teams/${team.id}/match-requests/new`} className="btn-ghost">
                        Tìm đối thủ <span aria-hidden>→</span>
                      </Link>
                    </div>
                  </article>
                )}

                {canManage && team.pendingInvites.length > 0 && (
                  <PendingInvitesCard
                    invites={team.pendingInvites}
                    onCancel={(inviteId) => {
                      setActionError(null);
                      cancelInviteMutation.mutate(inviteId);
                    }}
                    pending={cancelInviteMutation.isPending}
                  />
                )}

                {canManage && (
                  <AddMemberCard
                    onSubmit={(input) => {
                      setActionError(null);
                      addMemberMutation.mutate(input);
                    }}
                    pending={addMemberMutation.isPending}
                  />
                )}

                {viewerRole === 'captain' && (
                  <article className="border border-rust bg-rust/[0.03] p-6">
                    <p className="text-xs font-bold tracking-wide text-rust">Vùng nguy hiểm</p>
                    <h3 className="mt-1 font-display text-lg font-black tracking-tight">
                      Giải tán đội
                    </h3>
                    <p className="mt-2 text-sm text-ink-soft">
                      Toàn bộ thành viên sẽ mất quyền truy cập. Hành động không thể hoàn tác.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        if (
                          !window.confirm(
                            `Giải tán đội "${team.name}"? Hành động này không thể hoàn tác.`,
                          )
                        )
                          return;
                        setActionError(null);
                        disbandMutation.mutate();
                      }}
                      disabled={disbandMutation.isPending}
                      className="mt-4 inline-flex border border-rust bg-rust/10 px-4 py-2 text-sm font-bold text-rust transition hover:bg-rust/20 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {disbandMutation.isPending ? 'Đang giải tán...' : 'Giải tán đội'}
                    </button>
                  </article>
                )}
              </aside>
            </section>
          </>
        )}
      </main>
    </div>
  );
}

/** Lịch sử trận của đội (FR-007.6), mới nhất trước, tỉ số nhìn từ phía đội này. */
function MatchHistory({ teamId }: { teamId: string }) {
  const { data, isLoading, isError, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteQuery({
      queryKey: ['matches', 'team', teamId],
      initialPageParam: undefined as string | undefined,
      queryFn: async ({ pageParam }) => {
        const qs = pageParam ? `?cursor=${pageParam}` : '';
        const { data } = await api.get<TeamMatchListResponse>(`/matches/team/${teamId}${qs}`);
        return data;
      },
      getNextPageParam: (last) => last.nextCursor ?? undefined,
    });
  const matches = data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <section className="mt-10">
      <header className="border-b-2 border-ink pb-3">
        <h2 className="font-display text-2xl font-black tracking-tight">Lịch sử trận</h2>
      </header>
      {isLoading && <p className="mt-4 text-sm text-ink-soft">Đang tải...</p>}
      {isError && <p className="mt-4 text-sm text-rust">Không tải được lịch sử trận.</p>}
      {data && matches.length === 0 && (
        <p className="mt-4 text-sm text-ink-soft">Đội chưa đá trận nào.</p>
      )}
      <ul className="mt-2 divide-y divide-ink/10">
        {matches.map((m) => (
          <MatchHistoryRow key={m.id} match={m} teamId={teamId} />
        ))}
      </ul>
      {matches.length > 0 && (
        <LoadMore
          hasMore={Boolean(hasNextPage)}
          loading={isFetchingNextPage}
          onClick={() => void fetchNextPage()}
        />
      )}
    </section>
  );
}

const RESULT_STYLES = {
  win: { label: 'Thắng', className: 'bg-primary-dark text-paper' },
  draw: { label: 'Hoà', className: 'bg-ink/10 text-ink' },
  loss: { label: 'Thua', className: 'bg-rust/10 text-rust' },
} as const;

function MatchHistoryRow({ match, teamId }: { match: MatchView; teamId: string }) {
  const isHome = match.homeTeam.id === teamId;
  const opponent = isHome ? match.awayTeam : match.homeTeam;
  const ours = isHome ? match.homeScore : match.awayScore;
  const theirs = isHome ? match.awayScore : match.homeScore;
  const result =
    match.status === 'completed' && ours !== null && theirs !== null
      ? RESULT_STYLES[ours > theirs ? 'win' : ours < theirs ? 'loss' : 'draw']
      : null;

  const body = (
    <>
      <div className="min-w-0 flex-1">
        <p className="truncate font-display text-base font-black tracking-tight">
          vs {opponent.name}
        </p>
        <p className="mt-0.5 text-xs text-ink-soft">
          {match.scheduledAt
            ? new Date(match.scheduledAt).toLocaleDateString('vi-VN')
            : 'Không hẹn giờ'}
          {match.venueName ? ` · ${match.venueName}` : ''}
        </p>
      </div>
      {result ? (
        <>
          <span className="poster-num text-xl">
            {ours} – {theirs}
          </span>
          <span className={`px-2 py-0.5 text-xs font-bold ${result.className}`}>
            {result.label}
          </span>
        </>
      ) : (
        <span className="text-xs text-ink-soft">Chưa chốt tỉ số</span>
      )}
    </>
  );

  return (
    <li>
      {match.matchRequestId ? (
        <Link
          to={`/match-requests/${match.matchRequestId}`}
          className="flex items-center gap-4 py-4 transition hover:bg-ink/[0.03]"
        >
          {body}
        </Link>
      ) : (
        <div className="flex items-center gap-4 py-4">{body}</div>
      )}
    </li>
  );
}

function TeamHeader({ team }: { team: TeamDetail }) {
  const { sportOf } = useSports();
  const t = sportOf(team.sport);
  return (
    <article className="border border-ink/12 bg-white p-6 md:p-8">
      <div className="flex flex-col gap-5 md:flex-row md:items-start">
        <span
          className="flex size-20 shrink-0 items-center justify-center text-4xl"
          style={{ backgroundColor: t.primary, color: '#fff' }}
          aria-hidden
        >
          <SportIcon sport={t.slug} className="size-[1em]" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold tracking-wide text-ink-soft">
            {t.nameVi}
            {team.region ? ` · ${team.region}` : ''}
          </p>
          <h1 className="mt-1 font-display text-4xl font-black leading-[0.9] tracking-tight md:text-5xl">
            {team.name}
          </h1>
          {team.description && (
            <p className="mt-3 max-w-2xl text-base leading-relaxed text-ink-soft">
              {team.description}
            </p>
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            <Tag>{team.members.length} thành viên</Tag>
            {team.skillLevel && <Tag>{SKILL_LEVEL_LABELS[team.skillLevel]}</Tag>}
            <Tag>Uy tín · {team.reputation.toFixed(1)}</Tag>
            {team.viewerRole && (
              <span className="inline-flex border border-ink bg-ink px-2.5 py-1 text-xs font-bold tracking-wide text-paper">
                {TEAM_ROLE_LABELS[team.viewerRole]}
              </span>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex border border-ink/15 bg-paper-2/40 px-2.5 py-1 text-xs font-semibold text-ink-soft">
      {children}
    </span>
  );
}

/** Lời mời đội đã gửi và còn đang chờ trả lời (FR-006.8). */
function PendingInvitesCard({
  invites,
  onCancel,
  pending,
}: {
  invites: TeamInviteView[];
  onCancel: (inviteId: string) => void;
  pending: boolean;
}) {
  return (
    <article className="border border-ink/15 bg-white p-6">
      <p className="text-xs font-bold tracking-wide text-ink-soft">Đang chờ trả lời</p>
      <h3 className="mt-1 font-display text-lg font-black tracking-tight">
        Lời mời đã gửi · {invites.length}
      </h3>
      <ul className="mt-4 divide-y divide-ink/10">
        {invites.map((i) => (
          <li key={i.id} className="flex items-center gap-3 py-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold">{i.displayName}</p>
              <p className="mt-0.5 text-xs text-ink-soft">
                Mời ngày {new Date(i.createdAt).toLocaleDateString('vi-VN')}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onCancel(i.id)}
              disabled={pending}
              className="shrink-0 border border-ink/25 px-3 py-1.5 text-xs font-semibold transition hover:border-ink disabled:opacity-50"
            >
              Rút lại
            </button>
          </li>
        ))}
      </ul>
    </article>
  );
}

function AddMemberCard({
  onSubmit,
  pending,
}: {
  onSubmit: (input: AddMemberInput) => void;
  pending: boolean;
}) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AddMemberInput>({
    resolver: zodResolver(addMemberSchema),
    defaultValues: { role: 'member' },
  });

  return (
    <article className="border border-ink/15 bg-white p-6">
      <p className="text-xs font-bold tracking-wide text-ink-soft">Thêm thẳng</p>
      <h3 className="mt-1 font-display text-lg font-black tracking-tight">Thêm bằng email</h3>
      <p className="mt-2 text-sm text-ink-soft">
        Người này vào đội ngay, không cần bấm đồng ý. Muốn hỏi ý trước thì mời họ từ trang{' '}
        <Link to="/looking-for-team" className="font-semibold text-ink hover:underline">
          Tìm đội
        </Link>
        .
      </p>
      <form
        onSubmit={handleSubmit((values) => {
          onSubmit({
            email: values.email?.trim() || undefined,
            role: values.role,
          });
          reset({ email: '', role: 'member' });
        })}
        className="mt-4 space-y-3"
      >
        <input
          type="email"
          placeholder="ban@example.com"
          {...register('email')}
          className="input"
        />
        {errors.email?.message && (
          <p className="text-sm font-medium text-rust">{errors.email.message}</p>
        )}

        <select {...register('role')} className="input">
          {TEAM_ROLES.filter((r) => r !== 'captain').map((r) => (
            <option key={r} value={r}>
              {TEAM_ROLE_LABELS[r]}
            </option>
          ))}
        </select>

        <button type="submit" disabled={pending} className="btn-primary w-full">
          {pending ? 'Đang thêm...' : 'Thêm thành viên'}
        </button>
      </form>
    </article>
  );
}
