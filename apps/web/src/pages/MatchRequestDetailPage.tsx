import {
  CHALLENGE_STATUS_LABELS,
  SKILL_LEVEL_LABELS,
  SPORT_THEMES,
  type ChallengeView,
  type MatchRequestDetail,
  type TeamSummary,
} from '@sfa/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '@/lib/api';

function extractMessage(err: unknown, fallback: string): string {
  if (err instanceof AxiosError) {
    const m = (err.response?.data as { error?: { message?: string } })?.error?.message;
    if (m) return m;
  }
  return fallback;
}

export function MatchRequestDetailPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [actionError, setActionError] = useState<string | null>(null);
  const [challengeMessage, setChallengeMessage] = useState('');
  const [selectedChallengerTeamId, setSelectedChallengerTeamId] = useState<string>('');

  const reqQuery = useQuery({
    enabled: Boolean(id),
    queryKey: ['matches', 'request', id],
    queryFn: async () => {
      const { data } = await api.get<MatchRequestDetail>(`/matches/requests/${id}`);
      return data;
    },
  });

  const myTeamsQuery = useQuery({
    queryKey: ['teams', 'me'],
    queryFn: async () => {
      const { data } = await api.get<{ teams: TeamSummary[] }>('/teams/me');
      return data.teams;
    },
  });

  const setRequest = (req: MatchRequestDetail) => {
    queryClient.setQueryData(['matches', 'request', id], req);
    queryClient.invalidateQueries({ queryKey: ['matches', 'requests'] });
  };

  const challengeMutation = useMutation({
    mutationFn: async () => {
      if (!selectedChallengerTeamId) throw new Error('Chọn đội của bạn');
      const { data } = await api.post<MatchRequestDetail>(
        `/matches/requests/${id}/challenges`,
        {
          challengerTeamId: selectedChallengerTeamId,
          message: challengeMessage.trim() || undefined,
        },
      );
      return data;
    },
    onSuccess: (data) => {
      setRequest(data);
      setChallengeMessage('');
    },
    onError: (err) => setActionError(extractMessage(err, 'Không gửi được thách đấu')),
  });

  const acceptMutation = useMutation({
    mutationFn: async (challengeId: string) => {
      const { data } = await api.post<MatchRequestDetail>(
        `/matches/challenges/${challengeId}/accept`,
      );
      return data;
    },
    onSuccess: setRequest,
    onError: (err) => setActionError(extractMessage(err, 'Không chấp nhận được')),
  });

  const rejectMutation = useMutation({
    mutationFn: async (challengeId: string) => {
      const { data } = await api.post<MatchRequestDetail>(
        `/matches/challenges/${challengeId}/reject`,
      );
      return data;
    },
    onSuccess: setRequest,
    onError: (err) => setActionError(extractMessage(err, 'Không từ chối được')),
  });

  const withdrawMutation = useMutation({
    mutationFn: async (challengeId: string) => {
      const { data } = await api.post<MatchRequestDetail>(
        `/matches/challenges/${challengeId}/withdraw`,
      );
      return data;
    },
    onSuccess: setRequest,
    onError: (err) => setActionError(extractMessage(err, 'Không rút được thách đấu')),
  });

  const cancelMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.patch<MatchRequestDetail>(
        `/matches/requests/${id}`,
        { status: 'cancelled' },
      );
      return data;
    },
    onSuccess: setRequest,
    onError: (err) => setActionError(extractMessage(err, 'Không huỷ được')),
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

  const req = reqQuery.data;
  const myTeams = myTeamsQuery.data ?? [];
  // Teams I can challenge with: same sport, I'm captain/co_captain, not the request's own team, no pending challenge
  const eligibleTeams = req
    ? myTeams.filter(
        (t) =>
          t.sport === req.sport &&
          t.id !== req.teamId &&
          (t.viewerRole === 'captain' || t.viewerRole === 'co_captain'),
      )
    : [];

  return (
    <div className="relative min-h-screen overflow-hidden bg-night text-cream">
      <div className="mouse-spotlight pointer-events-none fixed inset-0 z-0" aria-hidden />
      <div className="grid-bg pointer-events-none fixed inset-0 z-0" aria-hidden />

      <header className="relative z-10 border-b border-cream/10 bg-night/40 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-4">
          <Link
            to="/find-opponents"
            className="font-display text-2xl font-black uppercase leading-none tracking-tight text-cream md:text-3xl"
          >
            SportsForAll<span className="text-primary">.</span>
          </Link>
          <Link
            to="/find-opponents"
            className="group inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.22em] text-cream/55 transition hover:text-cream"
          >
            <span aria-hidden className="transition-transform group-hover:-translate-x-1">
              ←
            </span>
            Tìm đối thủ
          </Link>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-5xl px-6 py-10 md:py-14">
        {reqQuery.isLoading && (
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-cream/55">
            Đang tải...
          </p>
        )}
        {reqQuery.isError && (
          <p className="rounded-xl border border-ember/35 bg-ember/10 p-3 font-mono text-[11px] uppercase tracking-wider text-ember">
            Không tải được lời mời.
          </p>
        )}

        {req && (
          <>
            <Header req={req} />

            {actionError && (
              <p className="mt-6 rounded-xl border border-ember/35 bg-ember/10 p-3 font-mono text-[11px] uppercase tracking-wider text-ember">
                {actionError}
              </p>
            )}

            {req.match && (
              <article className="mt-6 rounded-3xl border border-primary/35 bg-primary/[0.08] p-6 backdrop-blur-2xl">
                <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary">
                  Trận đã ghép
                </p>
                <p className="mt-2 font-display text-2xl font-black uppercase tracking-tight text-cream">
                  {req.match.homeTeam.name}
                  <span className="mx-3 text-cream/45">vs</span>
                  {req.match.awayTeam.name}
                </p>
                {req.match.scheduledAt && (
                  <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.22em] text-cream/65">
                    {new Date(req.match.scheduledAt).toLocaleString('vi-VN')}
                    {req.match.venueName ? ` · ${req.match.venueName}` : ''}
                  </p>
                )}
              </article>
            )}

            <section className="mt-8 grid gap-6 lg:grid-cols-12">
              <div className="lg:col-span-7 space-y-6">
                <article className="rounded-3xl border border-cream/15 bg-gradient-to-br from-cream/[0.06] to-cream/[0.02] p-6 backdrop-blur-2xl">
                  <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-cream/55">
                    Nội dung
                  </p>
                  <p className="mt-3 whitespace-pre-line text-base leading-relaxed text-cream/85">
                    {req.description}
                  </p>
                </article>

                <article className="rounded-3xl border border-cream/15 bg-gradient-to-br from-cream/[0.06] to-cream/[0.02] p-6 backdrop-blur-2xl">
                  <header className="flex items-baseline justify-between">
                    <h2 className="font-display text-xl font-black uppercase tracking-tight text-cream">
                      {req.viewerOwns ? `Thách đấu nhận được (${req.challenges.length})` : 'Thách đấu của đội bạn'}
                    </h2>
                    {req.viewerOwns && req.status === 'open' && (
                      <button
                        type="button"
                        onClick={() => {
                          if (!window.confirm('Huỷ lời mời này?')) return;
                          setActionError(null);
                          cancelMutation.mutate();
                        }}
                        disabled={cancelMutation.isPending}
                        className="rounded-full border border-cream/20 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.22em] text-cream/65 transition hover:border-cream/55 hover:text-cream disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Huỷ lời mời
                      </button>
                    )}
                  </header>

                  {req.challenges.length === 0 ? (
                    <p className="mt-4 text-sm text-cream/65">
                      {req.viewerOwns ? 'Chưa có thách đấu nào.' : 'Đội bạn chưa thách đấu lời mời này.'}
                    </p>
                  ) : (
                    <ul className="mt-5 space-y-3">
                      {req.challenges.map((c) => (
                        <ChallengeRow
                          key={c.id}
                          challenge={c}
                          viewerOwns={req.viewerOwns}
                          onAccept={() => {
                            setActionError(null);
                            acceptMutation.mutate(c.id);
                          }}
                          onReject={() => {
                            setActionError(null);
                            rejectMutation.mutate(c.id);
                          }}
                          onWithdraw={() => {
                            setActionError(null);
                            withdrawMutation.mutate(c.id);
                          }}
                          pending={
                            acceptMutation.isPending ||
                            rejectMutation.isPending ||
                            withdrawMutation.isPending
                          }
                        />
                      ))}
                    </ul>
                  )}
                </article>
              </div>

              <aside className="space-y-6 lg:col-span-5">
                {!req.viewerOwns && req.status === 'open' && (
                  <article className="rounded-3xl border border-primary/30 bg-primary/[0.06] p-6 backdrop-blur-2xl">
                    <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary">
                      Đội bạn muốn đấu?
                    </p>
                    <h3 className="mt-2 font-display text-xl font-black uppercase tracking-tight text-cream">
                      Gửi thách đấu
                    </h3>

                    {eligibleTeams.length === 0 ? (
                      <p className="mt-4 text-sm text-cream/65">
                        Bạn cần là captain/phó đội của một đội cùng môn ({SPORT_THEMES[req.sport].nameVi}) để gửi thách đấu.
                      </p>
                    ) : (
                      <div className="mt-4 space-y-3">
                        <select
                          value={selectedChallengerTeamId}
                          onChange={(e) => setSelectedChallengerTeamId(e.target.value)}
                          className="dark-input"
                        >
                          <option value="">— Chọn đội của bạn —</option>
                          {eligibleTeams.map((t) => (
                            <option key={t.id} value={t.id} className="bg-night">
                              {t.name}
                            </option>
                          ))}
                        </select>
                        <textarea
                          value={challengeMessage}
                          onChange={(e) => setChallengeMessage(e.target.value)}
                          rows={3}
                          maxLength={500}
                          placeholder="Vài dòng để giới thiệu đội bạn..."
                          className="dark-input resize-none"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setActionError(null);
                            challengeMutation.mutate();
                          }}
                          disabled={!selectedChallengerTeamId || challengeMutation.isPending}
                          className="w-full rounded-full bg-primary px-4 py-2.5 font-mono text-[11px] font-semibold uppercase tracking-[0.22em] text-night shadow-[0_18px_50px_-12px_rgb(var(--color-primary))] transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {challengeMutation.isPending ? 'Đang gửi...' : 'Gửi thách đấu'}
                        </button>
                      </div>
                    )}
                  </article>
                )}

                <article className="rounded-3xl border border-cream/15 bg-gradient-to-br from-cream/[0.06] to-cream/[0.02] p-6 backdrop-blur-2xl">
                  <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-cream/55">
                    Đội đăng
                  </p>
                  <h3 className="mt-2 font-display text-xl font-black uppercase tracking-tight text-cream">
                    {req.team.name}
                  </h3>
                  <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.22em] text-cream/55">
                    {SPORT_THEMES[req.team.sport].nameVi}
                    {req.team.region ? ` · ${req.team.region}` : ''}
                  </p>
                  <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.22em] text-cream/65">
                    Uy tín · {req.team.reputation.toFixed(1)}
                  </p>
                  <Link
                    to={`/teams/${req.teamId}`}
                    className="mt-4 inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.22em] text-primary transition hover:translate-x-1"
                  >
                    Xem trang đội <span aria-hidden>→</span>
                  </Link>
                </article>
              </aside>
            </section>
          </>
        )}
      </main>
    </div>
  );
}

function Header({ req }: { req: MatchRequestDetail }) {
  const t = SPORT_THEMES[req.sport];
  return (
    <article className="overflow-hidden rounded-3xl border border-cream/15 bg-gradient-to-br from-cream/[0.06] to-cream/[0.02] p-6 backdrop-blur-2xl md:p-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-start">
        <div
          className="flex size-16 shrink-0 items-center justify-center rounded-2xl text-3xl"
          style={{ background: `${t.primary}25`, border: `1px solid ${t.primary}55` }}
          aria-hidden
        >
          {t.emoji}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-cream/55">
            Lời mời thách đấu · {t.nameVi}
          </p>
          <h1 className="mt-1 font-display text-3xl font-black uppercase tracking-tight text-cream md:text-4xl">
            {req.team.name}
          </h1>
          <div className="mt-4 flex flex-wrap gap-2 font-mono text-[10px] uppercase tracking-[0.22em] text-cream/65">
            {req.preferredTime && (
              <Tag>
                {new Date(req.preferredTime).toLocaleString('vi-VN', {
                  weekday: 'short',
                  day: '2-digit',
                  month: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Tag>
            )}
            {req.region && <Tag>Khu vực · {req.region}</Tag>}
            {req.venueName && <Tag>Sân · {req.venueName}</Tag>}
            {req.skillLevelMin && (
              <Tag>Trình độ ≥ {SKILL_LEVEL_LABELS[req.skillLevelMin]}</Tag>
            )}
            <Tag>{req.challengeCount} thách đấu</Tag>
            {req.status !== 'open' && (
              <span className="rounded-full border border-ember/35 bg-ember/10 px-2 py-0.5 text-ember">
                {req.status === 'matched'
                  ? 'Đã ghép trận'
                  : req.status === 'cancelled'
                    ? 'Đã huỷ'
                    : 'Hết hạn'}
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
    <span className="rounded-full border border-cream/15 bg-cream/[0.04] px-3 py-1">
      {children}
    </span>
  );
}

function ChallengeRow({
  challenge,
  viewerOwns,
  onAccept,
  onReject,
  onWithdraw,
  pending,
}: {
  challenge: ChallengeView;
  viewerOwns: boolean;
  onAccept: () => void;
  onReject: () => void;
  onWithdraw: () => void;
  pending: boolean;
}) {
  return (
    <li className="rounded-xl border border-cream/10 bg-cream/[0.03] p-4">
      <div className="flex items-start gap-3">
        <div
          className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-cream/15 bg-cream/[0.04] font-display text-sm font-black uppercase text-primary"
          aria-hidden
        >
          {challenge.challengerTeam.name.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-base font-black uppercase tracking-tight text-cream">
            {challenge.challengerTeam.name}
            {challenge.isMine && (
              <span className="ml-2 font-mono text-[9px] uppercase tracking-[0.22em] text-primary">
                · đội bạn
              </span>
            )}
          </p>
          <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.22em] text-cream/55">
            {CHALLENGE_STATUS_LABELS[challenge.status]} ·{' '}
            {new Date(challenge.createdAt).toLocaleString('vi-VN')}
          </p>
          {challenge.message && (
            <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-cream/75">
              {challenge.message}
            </p>
          )}
        </div>
        {challenge.status === 'pending' && (
          <div className="flex flex-col gap-2">
            {viewerOwns && (
              <>
                <button
                  type="button"
                  onClick={onAccept}
                  disabled={pending}
                  className="rounded-full bg-primary px-3 py-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-night transition hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Chấp nhận
                </button>
                <button
                  type="button"
                  onClick={onReject}
                  disabled={pending}
                  className="rounded-full border border-ember/35 px-3 py-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-ember transition hover:bg-ember/10 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Từ chối
                </button>
              </>
            )}
            {!viewerOwns && challenge.isMine && (
              <button
                type="button"
                onClick={onWithdraw}
                disabled={pending}
                className="rounded-full border border-cream/20 px-3 py-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-cream/65 transition hover:border-cream/55 hover:text-cream disabled:cursor-not-allowed disabled:opacity-60"
              >
                Rút thách đấu
              </button>
            )}
          </div>
        )}
      </div>
    </li>
  );
}
