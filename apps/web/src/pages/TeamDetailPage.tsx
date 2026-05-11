import {
  SKILL_LEVEL_LABELS,
  SPORT_THEMES,
  TEAM_ROLES,
  TEAM_ROLE_LABELS,
  addMemberSchema,
  type AddMemberInput,
  type TeamDetail,
  type TeamRole,
} from '@sfa/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '@/lib/api';
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
    queryClient.invalidateQueries({ queryKey: ['teams', 'me'] });
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
      queryClient.invalidateQueries({ queryKey: ['teams', 'me'] });
      if (isSelf) navigate('/teams', { replace: true });
      else queryClient.invalidateQueries({ queryKey: ['teams', id] });
    },
    onError: (err) => setActionError(extractMessage(err, 'Không xoá được thành viên')),
  });

  const disbandMutation = useMutation({
    mutationFn: async () => {
      await api.delete(`/teams/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams', 'me'] });
      navigate('/teams', { replace: true });
    },
    onError: (err) => setActionError(extractMessage(err, 'Không giải tán được đội')),
  });

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const r = document.documentElement;
      r.style.setProperty('--mx', `${e.clientX}px`);
      r.style.setProperty('--my', `${e.clientY}px`);
    };
    window.addEventListener('pointermove', onMove);
    return () => window.removeEventListener('pointermove', onMove);
  }, []);

  const team = teamQuery.data;
  const viewerRole = team?.viewerRole ?? null;
  const canManage = viewerRole === 'captain' || viewerRole === 'co_captain';

  return (
    <div className="relative min-h-screen overflow-hidden bg-night text-cream">
      <div className="mouse-spotlight pointer-events-none fixed inset-0 z-0" aria-hidden />
      <div className="grid-bg pointer-events-none fixed inset-0 z-0" aria-hidden />

      <header className="relative z-10 border-b border-cream/10 bg-night/40 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-4">
          <Link
            to="/teams"
            className="font-display text-2xl font-black uppercase leading-none tracking-tight text-cream md:text-3xl"
          >
            SportsForAll<span className="text-primary">.</span>
          </Link>
          <Link
            to="/teams"
            className="group inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.22em] text-cream/55 transition hover:text-cream"
          >
            <span aria-hidden className="transition-transform group-hover:-translate-x-1">
              ←
            </span>
            Đội của tôi
          </Link>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-5xl px-6 py-10 md:py-14">
        {teamQuery.isLoading && (
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-cream/55">
            Đang tải đội...
          </p>
        )}

        {teamQuery.isError && (
          <p className="rounded-xl border border-ember/35 bg-ember/10 p-3 font-mono text-[11px] uppercase tracking-wider text-ember">
            Không tải được đội. Có thể đội đã bị giải tán hoặc bạn không có quyền xem.
          </p>
        )}

        {team && (
          <>
            <TeamHeader team={team} />

            {actionError && (
              <p className="mt-6 rounded-xl border border-ember/35 bg-ember/10 p-3 font-mono text-[11px] uppercase tracking-wider text-ember">
                {actionError}
              </p>
            )}

            <section className="mt-8 grid gap-6 lg:grid-cols-12">
              <div className="lg:col-span-7">
                <h2 className="font-display text-xl font-black uppercase tracking-tight text-cream md:text-2xl">
                  Thành viên ({team.members.length})
                </h2>
                <ul className="mt-4 space-y-3">
                  {team.members.map((m) => {
                    const isSelf = m.userId === currentUserId;
                    return (
                      <li
                        key={m.userId}
                        className="flex items-center gap-4 rounded-xl border border-cream/10 bg-cream/[0.03] p-4"
                      >
                        <div
                          className="flex size-11 items-center justify-center rounded-xl border border-cream/15 bg-cream/[0.04] font-display text-base font-black uppercase text-primary"
                          aria-hidden
                        >
                          {m.displayName.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-display text-base font-black uppercase tracking-tight text-cream">
                            {m.displayName}
                            {isSelf && (
                              <span className="ml-2 font-mono text-[9px] uppercase tracking-[0.22em] text-primary">
                                · bạn
                              </span>
                            )}
                          </p>
                          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cream/55">
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
                            className="rounded-lg border border-cream/15 bg-night/50 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-cream"
                          >
                            {TEAM_ROLES.map((r) => (
                              <option key={r} value={r} className="bg-night">
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
                            disabled={
                              removeMutation.isPending || m.role === 'captain'
                            }
                            className="rounded-full border border-ember/35 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-ember transition hover:bg-ember/10 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            {isSelf ? 'Rời' : 'Xoá'}
                          </button>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>

              <aside className="space-y-6 lg:col-span-5">
                {canManage && (
                  <article className="rounded-3xl border border-primary/30 bg-primary/[0.05] p-6 backdrop-blur-2xl">
                    <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary">
                      Tuyển thành viên
                    </p>
                    <h3 className="mt-2 font-display text-lg font-black uppercase tracking-tight text-cream">
                      Đăng bài tìm người mới
                    </h3>
                    <p className="mt-2 text-sm text-cream/70">
                      Bài đăng sẽ xuất hiện cho cộng đồng tại trang Tìm đồng đội.
                    </p>
                    <Link
                      to={`/teams/${team.id}/posts/new`}
                      className="mt-4 inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 font-mono text-[11px] font-semibold uppercase tracking-[0.22em] text-night shadow-[0_18px_50px_-12px_rgb(var(--color-primary))] transition hover:scale-[1.02]"
                    >
                      Tạo bài tuyển <span aria-hidden>→</span>
                    </Link>
                  </article>
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
                  <article className="rounded-3xl border border-ember/30 bg-ember/[0.05] p-6">
                    <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-ember">
                      Vùng nguy hiểm
                    </p>
                    <h3 className="mt-2 font-display text-lg font-black uppercase tracking-tight text-cream">
                      Giải tán đội
                    </h3>
                    <p className="mt-2 text-sm text-cream/65">
                      Toàn bộ thành viên sẽ mất quyền truy cập. Hành động không thể hoàn tác.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        if (!window.confirm(`Giải tán đội "${team.name}"? Hành động này không thể hoàn tác.`)) return;
                        setActionError(null);
                        disbandMutation.mutate();
                      }}
                      disabled={disbandMutation.isPending}
                      className="mt-4 inline-flex items-center gap-2 rounded-full border border-ember/40 bg-ember/10 px-4 py-2 font-mono text-[11px] font-semibold uppercase tracking-[0.22em] text-ember transition hover:bg-ember/20 disabled:cursor-not-allowed disabled:opacity-50"
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

function TeamHeader({ team }: { team: TeamDetail }) {
  const t = SPORT_THEMES[team.sport];
  return (
    <article className="overflow-hidden rounded-3xl border border-cream/15 bg-gradient-to-br from-cream/[0.06] to-cream/[0.02] p-6 backdrop-blur-2xl md:p-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-start">
        <div
          className="flex size-20 shrink-0 items-center justify-center rounded-2xl text-4xl"
          style={{ background: `${t.primary}25`, border: `1px solid ${t.primary}55` }}
          aria-hidden
        >
          {t.emoji}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-cream/55">
            {t.nameVi}
            {team.region ? ` · ${team.region}` : ''}
          </p>
          <h1 className="mt-1 font-display text-3xl font-black uppercase tracking-tight text-cream md:text-4xl">
            {team.name}
          </h1>
          {team.description && (
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-cream/75">
              {team.description}
            </p>
          )}
          <div className="mt-4 flex flex-wrap gap-3 font-mono text-[10px] uppercase tracking-[0.22em] text-cream/65">
            <span className="rounded-full border border-cream/15 bg-cream/[0.04] px-3 py-1">
              {team.members.length} thành viên
            </span>
            {team.skillLevel && (
              <span className="rounded-full border border-cream/15 bg-cream/[0.04] px-3 py-1">
                {SKILL_LEVEL_LABELS[team.skillLevel]}
              </span>
            )}
            <span className="rounded-full border border-cream/15 bg-cream/[0.04] px-3 py-1">
              Uy tín · {team.reputation.toFixed(1)}
            </span>
            {team.viewerRole && (
              <span className="rounded-full border border-primary/40 bg-primary/15 px-3 py-1 text-primary">
                {TEAM_ROLE_LABELS[team.viewerRole]}
              </span>
            )}
          </div>
        </div>
      </div>
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
    <article className="rounded-3xl border border-cream/15 bg-gradient-to-br from-cream/[0.06] to-cream/[0.02] p-6 backdrop-blur-2xl">
      <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-cream/55">
        Mời thành viên
      </p>
      <h3 className="mt-1 font-display text-lg font-black uppercase tracking-tight text-cream">
        Thêm bằng email
      </h3>
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
          className="dark-input"
        />
        {errors.email?.message && (
          <p className="font-mono text-[10px] uppercase tracking-wider text-ember">
            {errors.email.message}
          </p>
        )}

        <select {...register('role')} className="dark-input">
          {TEAM_ROLES.filter((r) => r !== 'captain').map((r) => (
            <option key={r} value={r} className="bg-night">
              {TEAM_ROLE_LABELS[r]}
            </option>
          ))}
        </select>

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-full bg-primary px-4 py-2.5 font-mono text-[11px] font-semibold uppercase tracking-[0.22em] text-night shadow-[0_18px_50px_-12px_rgb(var(--color-primary))] transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? 'Đang thêm...' : 'Thêm thành viên'}
        </button>
      </form>
    </article>
  );
}
