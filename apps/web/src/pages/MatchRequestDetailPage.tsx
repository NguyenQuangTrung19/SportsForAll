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
import { useState } from 'react';
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
      const { data } = await api.patch<MatchRequestDetail>(`/matches/requests/${id}`, {
        status: 'cancelled',
      });
      return data;
    },
    onSuccess: setRequest,
    onError: (err) => setActionError(extractMessage(err, 'Không huỷ được')),
  });

  const req = reqQuery.data;
  const myTeams = myTeamsQuery.data ?? [];
  const eligibleTeams = req
    ? myTeams.filter(
        (t) =>
          t.sport === req.sport &&
          t.id !== req.teamId &&
          (t.viewerRole === 'captain' || t.viewerRole === 'co_captain'),
      )
    : [];

  return (
    <div className="min-h-screen bg-paper text-ink">
      <header className="border-b border-ink/10">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-4">
          <Link
            to="/find-opponents"
            className="font-display text-2xl font-black uppercase leading-none tracking-tight"
          >
            SportsForAll<span className="text-primary">.</span>
          </Link>
          <Link
            to="/find-opponents"
            className="text-sm font-semibold text-ink-soft hover:text-ink"
          >
            ← Tìm đối thủ
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-10 md:py-14">
        {reqQuery.isLoading && <p className="text-sm text-ink-soft">Đang tải...</p>}
        {reqQuery.isError && (
          <p className="border border-rust bg-rust/5 px-3 py-2 text-sm font-medium text-rust">
            Không tải được lời mời.
          </p>
        )}

        {req && (
          <>
            <Header req={req} />

            {actionError && (
              <p className="mt-6 border border-rust bg-rust/5 px-3 py-2 text-sm font-medium text-rust">
                {actionError}
              </p>
            )}

            {req.match && (
              <article className="mt-6 border-2 border-ink bg-white p-6 shadow-[6px_6px_0_rgba(15,17,21,0.12)]">
                <p className="text-xs font-bold uppercase tracking-wide text-primary">
                  Trận đã ghép
                </p>
                <p className="mt-2 font-display text-3xl font-black uppercase leading-tight tracking-tight md:text-4xl">
                  {req.match.homeTeam.name}
                  <span className="mx-3 text-ink-soft">vs</span>
                  {req.match.awayTeam.name}
                </p>
                {req.match.scheduledAt && (
                  <p className="mt-2 text-sm font-semibold text-ink-soft">
                    {new Date(req.match.scheduledAt).toLocaleString('vi-VN')}
                    {req.match.venueName ? ` · ${req.match.venueName}` : ''}
                  </p>
                )}
              </article>
            )}

            <section className="mt-8 grid gap-6 lg:grid-cols-12">
              <div className="space-y-6 lg:col-span-7">
                <article className="border border-ink/12 bg-white p-6 md:p-8">
                  <p className="text-xs font-bold uppercase tracking-wide text-ink-soft">
                    Nội dung
                  </p>
                  <p className="mt-3 whitespace-pre-line text-base leading-relaxed">
                    {req.description}
                  </p>
                </article>

                <article className="border border-ink/12 bg-white p-6 md:p-8">
                  <header className="flex items-baseline justify-between border-b-2 border-ink pb-3">
                    <h2 className="font-display text-xl font-black uppercase tracking-tight">
                      {req.viewerOwns ? 'Thách đấu nhận được' : 'Thách đấu của đội bạn'}
                    </h2>
                    <div className="flex items-baseline gap-3">
                      <span className="poster-num text-2xl text-primary">
                        {String(req.challenges.length).padStart(2, '0')}
                      </span>
                      {req.viewerOwns && req.status === 'open' && (
                        <button
                          type="button"
                          onClick={() => {
                            if (!window.confirm('Huỷ lời mời này?')) return;
                            setActionError(null);
                            cancelMutation.mutate();
                          }}
                          disabled={cancelMutation.isPending}
                          className="border border-ink/15 px-3 py-1.5 text-xs font-semibold transition hover:border-ink disabled:opacity-50"
                        >
                          Huỷ lời mời
                        </button>
                      )}
                    </div>
                  </header>

                  {req.challenges.length === 0 ? (
                    <p className="mt-4 text-sm text-ink-soft">
                      {req.viewerOwns
                        ? 'Chưa có thách đấu nào.'
                        : 'Đội bạn chưa thách đấu lời mời này.'}
                    </p>
                  ) : (
                    <ul className="mt-2 divide-y divide-ink/10">
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
                  <article className="border border-ink bg-white p-6 shadow-[6px_6px_0_rgba(15,17,21,0.08)]">
                    <p className="text-xs font-bold uppercase tracking-wide text-primary">
                      Đội bạn muốn đấu?
                    </p>
                    <h3 className="mt-1 font-display text-xl font-black uppercase tracking-tight">
                      Gửi thách đấu
                    </h3>

                    {eligibleTeams.length === 0 ? (
                      <p className="mt-4 text-sm text-ink-soft">
                        Bạn cần là captain/phó đội của một đội cùng môn (
                        {SPORT_THEMES[req.sport].nameVi}) để gửi thách đấu.
                      </p>
                    ) : (
                      <div className="mt-4 space-y-3">
                        <select
                          value={selectedChallengerTeamId}
                          onChange={(e) => setSelectedChallengerTeamId(e.target.value)}
                          className="input"
                        >
                          <option value="">— Chọn đội của bạn —</option>
                          {eligibleTeams.map((t) => (
                            <option key={t.id} value={t.id}>
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
                          className="input resize-none"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setActionError(null);
                            challengeMutation.mutate();
                          }}
                          disabled={!selectedChallengerTeamId || challengeMutation.isPending}
                          className="btn-primary w-full"
                        >
                          {challengeMutation.isPending ? 'Đang gửi...' : 'Gửi thách đấu'}
                        </button>
                      </div>
                    )}
                  </article>
                )}

                <article className="border border-ink/12 bg-white p-6">
                  <p className="text-xs font-bold uppercase tracking-wide text-ink-soft">
                    Đội đăng
                  </p>
                  <h3 className="mt-1 font-display text-xl font-black uppercase tracking-tight">
                    {req.team.name}
                  </h3>
                  <p className="mt-1 text-xs text-ink-soft">
                    {SPORT_THEMES[req.team.sport].nameVi}
                    {req.team.region ? ` · ${req.team.region}` : ''}
                  </p>
                  <p className="mt-3 text-xs font-semibold text-ink-soft">
                    Uy tín · {req.team.reputation.toFixed(1)}
                  </p>
                  <Link
                    to={`/teams/${req.teamId}`}
                    className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-ink transition hover:text-primary"
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
    <article className="border border-ink/12 bg-white p-6 md:p-8">
      <div className="flex flex-col gap-5 md:flex-row md:items-start">
        <span
          className="flex size-16 shrink-0 items-center justify-center text-3xl"
          style={{ backgroundColor: t.primary, color: '#fff' }}
          aria-hidden
        >
          {t.emoji}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold uppercase tracking-wide text-ink-soft">
            Lời mời thách đấu · {t.nameVi}
          </p>
          <h1 className="mt-1 font-display text-3xl font-black uppercase leading-[0.9] tracking-tight md:text-4xl">
            {req.team.name}
          </h1>
          <div className="mt-4 flex flex-wrap gap-2">
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
              <span className="inline-flex border border-rust bg-rust/5 px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-rust">
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
    <span className="inline-flex border border-ink/15 bg-paper-2/40 px-2.5 py-1 text-xs font-semibold text-ink-soft">
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
    <li className="flex items-start gap-3 py-4">
      <div
        className="flex size-10 shrink-0 items-center justify-center bg-ink font-display text-sm font-black uppercase text-paper"
        aria-hidden
      >
        {challenge.challengerTeam.name.charAt(0).toUpperCase()}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-display text-base font-black uppercase tracking-tight">
          {challenge.challengerTeam.name}
          {challenge.isMine && (
            <span className="ml-2 text-[11px] font-semibold uppercase tracking-wide text-primary">
              · đội bạn
            </span>
          )}
        </p>
        <p className="mt-0.5 text-xs text-ink-soft">
          {CHALLENGE_STATUS_LABELS[challenge.status]} ·{' '}
          {new Date(challenge.createdAt).toLocaleString('vi-VN')}
        </p>
        {challenge.message && (
          <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-ink-soft">
            {challenge.message}
          </p>
        )}
      </div>
      {challenge.status === 'pending' && (
        <div className="flex shrink-0 flex-col gap-2">
          {viewerOwns && (
            <>
              <button
                type="button"
                onClick={onAccept}
                disabled={pending}
                className="bg-ink px-3 py-1.5 text-xs font-bold text-paper transition hover:bg-ink/85 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Chấp nhận
              </button>
              <button
                type="button"
                onClick={onReject}
                disabled={pending}
                className="border border-rust px-3 py-1.5 text-xs font-bold text-rust transition hover:bg-rust/5 disabled:cursor-not-allowed disabled:opacity-60"
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
              className="border border-ink/15 px-3 py-1.5 text-xs font-bold transition hover:border-ink disabled:cursor-not-allowed disabled:opacity-60"
            >
              Rút thách đấu
            </button>
          )}
        </div>
      )}
    </li>
  );
}
