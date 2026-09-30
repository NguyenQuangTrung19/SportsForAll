import {
  CHALLENGE_STATUS_LABELS,
  RATING_MAX,
  REPORT_REASONS,
  REPORT_REASON_LABELS,
  SKILL_LEVEL_LABELS,
  type ChallengeView,
  type MatchRequestDetail,
  type MatchView,
  type RatingResult,
  type RecruitmentTeamRef,
  type ReportReason,
  type ReportView,
  type TeamSummary,
} from '@sfa/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { SportIcon } from '@/components/SportIcon';
import { api, apiMessage } from '@/lib/api';
import { useSports } from '@/lib/use-sports';

export function MatchRequestDetailPage() {
  const { sportOf } = useSports();
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
    void queryClient.invalidateQueries({ queryKey: ['matches', 'requests'] });
  };

  const challengeMutation = useMutation({
    mutationFn: async () => {
      if (!selectedChallengerTeamId) throw new Error('Chọn đội của bạn');
      const { data } = await api.post<MatchRequestDetail>(`/matches/requests/${id}/challenges`, {
        challengerTeamId: selectedChallengerTeamId,
        message: challengeMessage.trim() || undefined,
      });
      return data;
    },
    onSuccess: (data) => {
      setRequest(data);
      setChallengeMessage('');
    },
    onError: (err) => setActionError(apiMessage(err, 'Không gửi được thách đấu')),
  });

  const acceptMutation = useMutation({
    mutationFn: async (challengeId: string) => {
      const { data } = await api.post<MatchRequestDetail>(
        `/matches/challenges/${challengeId}/accept`,
      );
      return data;
    },
    onSuccess: setRequest,
    onError: (err) => setActionError(apiMessage(err, 'Không chấp nhận được')),
  });

  const rejectMutation = useMutation({
    mutationFn: async (challengeId: string) => {
      const { data } = await api.post<MatchRequestDetail>(
        `/matches/challenges/${challengeId}/reject`,
      );
      return data;
    },
    onSuccess: setRequest,
    onError: (err) => setActionError(apiMessage(err, 'Không từ chối được')),
  });

  const withdrawMutation = useMutation({
    mutationFn: async (challengeId: string) => {
      const { data } = await api.post<MatchRequestDetail>(
        `/matches/challenges/${challengeId}/withdraw`,
      );
      return data;
    },
    onSuccess: setRequest,
    onError: (err) => setActionError(apiMessage(err, 'Không rút được thách đấu')),
  });

  const completeMutation = useMutation({
    mutationFn: async (input: { homeScore: number; awayScore: number }) => {
      const matchId = reqQuery.data?.match?.id;
      if (!matchId) throw new Error('Chưa có trận để chốt');
      await api.post(`/matches/${matchId}/complete`, input);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['matches', 'request', id] });
      void queryClient.invalidateQueries({ queryKey: ['matches', 'team'] });
    },
    onError: (err) => setActionError(apiMessage(err, 'Không chốt được tỉ số')),
  });

  const rateMutation = useMutation({
    mutationFn: async (input: { score: number; comment: string }) => {
      const matchId = reqQuery.data?.match?.id;
      if (!matchId) throw new Error('Chưa có trận để đánh giá');
      const { data } = await api.post<RatingResult>(`/matches/${matchId}/rating`, {
        score: input.score,
        comment: input.comment.trim() || undefined,
      });
      return data;
    },
    onSuccess: () => {
      // Điểm uy tín của đối thủ vừa đổi, nên tải lại cả lời mời lẫn danh sách.
      void queryClient.invalidateQueries({ queryKey: ['matches', 'request', id] });
      void queryClient.invalidateQueries({ queryKey: ['matches', 'requests'] });
    },
    onError: (err) => setActionError(apiMessage(err, 'Không gửi được đánh giá')),
  });

  const reportMutation = useMutation({
    mutationFn: async (input: { teamId: string; reason: ReportReason; detail: string }) => {
      const { data } = await api.post<ReportView>('/reports', {
        reportedTeamId: input.teamId,
        matchId: reqQuery.data?.match?.id,
        reason: input.reason,
        detail: input.detail.trim() || undefined,
      });
      return data;
    },
    onError: (err) => setActionError(apiMessage(err, 'Không gửi được báo cáo')),
  });

  const cancelMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.patch<MatchRequestDetail>(`/matches/requests/${id}`, {
        status: 'cancelled',
      });
      return data;
    },
    onSuccess: setRequest,
    onError: (err) => setActionError(apiMessage(err, 'Không huỷ được')),
  });

  const req = reqQuery.data;
  const myTeams = myTeamsQuery.data ?? [];
  // Báo cáo luôn nhắm vào đội đối diện: đã ghép trận thì là đội bên kia, chưa ghép
  // thì là đội đăng lời mời. Người ngoài cuộc không có gì để báo cáo.
  const reportTarget: RecruitmentTeamRef | null = !req
    ? null
    : req.match
      ? req.match.viewerTeamId
        ? req.match.viewerTeamId === req.match.homeTeam.id
          ? req.match.awayTeam
          : req.match.homeTeam
        : null
      : req.viewerOwns
        ? null
        : req.team;
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
            className="font-display text-2xl font-black leading-none tracking-tight"
          >
            SportsForAll<span className="text-primary-dark">.</span>
          </Link>
          <Link to="/find-opponents" className="text-sm font-semibold text-ink-soft hover:text-ink">
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
                <p className="text-xs font-bold tracking-wide text-primary-dark">Trận đã ghép</p>
                <p className="mt-2 font-display text-3xl font-black leading-tight tracking-tight md:text-4xl">
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
                {req.match.status === 'completed' && req.match.homeScore !== null && (
                  <p className="poster-num mt-3 text-4xl text-primary-dark">
                    {req.match.homeScore} – {req.match.awayScore}
                  </p>
                )}

                {req.match.canComplete && (
                  <CompleteMatchPanel
                    match={req.match}
                    pending={completeMutation.isPending}
                    onSubmit={(homeScore, awayScore) => {
                      if (
                        !window.confirm(
                          `Chốt tỉ số ${req.match!.homeTeam.name} ${homeScore} – ${awayScore} ${req.match!.awayTeam.name}? Chốt xong không sửa được.`,
                        )
                      )
                        return;
                      setActionError(null);
                      completeMutation.mutate({ homeScore, awayScore });
                    }}
                  />
                )}

                <RatingPanel
                  // Đổi khoá khi phiếu chấm đổi để ô nhập tự về trạng thái "đã đánh giá".
                  key={req.match.viewerRating?.createdAt ?? 'chua-cham'}
                  match={req.match}
                  pending={rateMutation.isPending}
                  onSubmit={(score, comment) => {
                    setActionError(null);
                    rateMutation.mutate({ score, comment });
                  }}
                />
              </article>
            )}

            <section className="mt-8 grid gap-6 lg:grid-cols-12">
              <div className="space-y-6 lg:col-span-7">
                <article className="border border-ink/12 bg-white p-6 md:p-8">
                  <p className="text-xs font-bold tracking-wide text-ink-soft">Nội dung</p>
                  <p className="mt-3 whitespace-pre-line text-base leading-relaxed">
                    {req.description}
                  </p>
                </article>

                <article className="border border-ink/12 bg-white p-6 md:p-8">
                  <header className="flex items-baseline justify-between border-b-2 border-ink pb-3">
                    <h2 className="font-display text-xl font-black tracking-tight">
                      {req.viewerOwns ? 'Thách đấu nhận được' : 'Thách đấu của đội bạn'}
                    </h2>
                    <div className="flex items-baseline gap-3">
                      <span className="poster-num text-2xl text-primary-dark">
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
                    <p className="text-xs font-bold tracking-wide text-primary-dark">
                      Đội bạn muốn đấu?
                    </p>
                    <h3 className="mt-1 font-display text-xl font-black tracking-tight">
                      Gửi thách đấu
                    </h3>

                    {eligibleTeams.length === 0 ? (
                      <p className="mt-4 text-sm text-ink-soft">
                        Bạn cần là captain/phó đội của một đội cùng môn ({sportOf(req.sport).nameVi}
                        ) để gửi thách đấu.
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
                  <p className="text-xs font-bold tracking-wide text-ink-soft">Đội đăng</p>
                  <h3 className="mt-1 font-display text-xl font-black tracking-tight">
                    {req.team.name}
                  </h3>
                  <p className="mt-1 text-xs text-ink-soft">
                    {sportOf(req.team.sport).nameVi}
                    {req.team.region ? ` · ${req.team.region}` : ''}
                  </p>
                  <p className="mt-3 text-xs font-semibold text-ink-soft">
                    Uy tín · {req.team.reputation.toFixed(1)}
                  </p>
                  <Link
                    to={`/teams/${req.teamId}`}
                    className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-ink transition hover:text-primary-dark"
                  >
                    Xem trang đội <span aria-hidden>→</span>
                  </Link>
                </article>

                {reportTarget && (
                  <ReportPanel
                    team={reportTarget}
                    pending={reportMutation.isPending}
                    sent={reportMutation.isSuccess}
                    onSubmit={(reason, detail) => {
                      setActionError(null);
                      reportMutation.mutate({ teamId: reportTarget.id, reason, detail });
                    }}
                  />
                )}
              </aside>
            </section>
          </>
        )}
      </main>
    </div>
  );
}

function Header({ req }: { req: MatchRequestDetail }) {
  const { sportOf } = useSports();
  const t = sportOf(req.sport);
  return (
    <article className="border border-ink/12 bg-white p-6 md:p-8">
      <div className="flex flex-col gap-5 md:flex-row md:items-start">
        <span
          className="flex size-16 shrink-0 items-center justify-center text-3xl"
          style={{ backgroundColor: t.primary, color: '#fff' }}
          aria-hidden
        >
          <SportIcon sport={t.slug} className="size-[1em]" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold tracking-wide text-ink-soft">
            Lời mời thách đấu · {t.nameVi}
          </p>
          <h1 className="mt-1 font-display text-3xl font-black leading-[0.9] tracking-tight md:text-4xl">
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
            {req.skillLevelMin && <Tag>Trình độ ≥ {SKILL_LEVEL_LABELS[req.skillLevelMin]}</Tag>}
            <Tag>{req.challengeCount} thách đấu</Tag>
            {req.status !== 'open' && (
              <span className="inline-flex border border-rust bg-rust/5 px-2.5 py-1 text-xs font-bold tracking-wide text-rust">
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
        <p className="truncate font-display text-base font-black tracking-tight">
          {challenge.challengerTeam.name}
          {challenge.isMine && (
            <span className="ml-2 text-[11px] font-semibold tracking-wide text-primary-dark">
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

/**
 * Kết thúc trận (FR-007.6). Chỉ hiện khi máy chủ nói được chốt — ai được chốt
 * và từ lúc nào nằm ở `canEndMatch`, giao diện không đoán lại.
 */
function CompleteMatchPanel({
  match,
  pending,
  onSubmit,
}: {
  match: MatchView;
  pending: boolean;
  onSubmit: (homeScore: number, awayScore: number) => void;
}) {
  const [home, setHome] = useState('');
  const [away, setAway] = useState('');
  const valid = /^\d{1,3}$/.test(home) && /^\d{1,3}$/.test(away);

  return (
    <form
      className="mt-5 border-t border-ink/10 pt-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (valid) onSubmit(Number(home), Number(away));
      }}
    >
      <p className="text-xs font-bold tracking-wide text-primary-dark">Kết thúc trận</p>
      <p className="mt-1 text-xs text-ink-soft">
        Đội trưởng hoặc đội phó của một trong hai đội chốt tỉ số. Chốt một lần, không sửa lại.
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm font-semibold">
          {match.homeTeam.name}
          <input
            type="number"
            inputMode="numeric"
            min={0}
            max={999}
            required
            value={home}
            onChange={(e) => setHome(e.target.value)}
            className="input w-20 text-center"
          />
        </label>
        <span className="text-ink-soft">–</span>
        <label className="flex items-center gap-2 text-sm font-semibold">
          <input
            type="number"
            inputMode="numeric"
            min={0}
            max={999}
            required
            value={away}
            onChange={(e) => setAway(e.target.value)}
            className="input w-20 text-center"
          />
          {match.awayTeam.name}
        </label>
      </div>
      <button type="submit" disabled={!valid || pending} className="btn-primary mt-3 w-full">
        {pending ? 'Đang chốt...' : 'Chốt tỉ số'}
      </button>
    </form>
  );
}

/**
 * Chấm uy tín đối thủ sau trận (FR-005.10). Chỉ hiện khi máy chủ nói được chấm —
 * điều kiện "đã đá xong" nằm ở một chỗ duy nhất nên giao diện không đoán lại.
 */
function RatingPanel({
  match,
  pending,
  onSubmit,
}: {
  match: MatchView;
  pending: boolean;
  onSubmit: (score: number, comment: string) => void;
}) {
  const existing = match.viewerRating;
  const [score, setScore] = useState(existing?.score ?? 0);
  const [comment, setComment] = useState(existing?.comment ?? '');
  const [editing, setEditing] = useState(existing === null);

  if (!match.canRate) return null;

  if (existing && !editing) {
    return (
      <div className="mt-5 border-t border-ink/10 pt-4">
        <p className="text-xs font-bold tracking-wide text-ink-soft">Bạn đã đánh giá</p>
        <p className="mt-1 font-display text-2xl font-black tracking-tight">
          {'★'.repeat(existing.score)}
          <span className="text-ink/20">{'★'.repeat(RATING_MAX - existing.score)}</span>
        </p>
        {existing.comment && (
          <p className="mt-1 text-sm leading-relaxed text-ink-soft">{existing.comment}</p>
        )}
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="mt-3 text-xs font-semibold text-ink-soft underline transition hover:text-ink"
        >
          Sửa đánh giá
        </button>
      </div>
    );
  }

  return (
    <div className="mt-5 border-t border-ink/10 pt-4">
      <p className="text-xs font-bold tracking-wide text-primary-dark">Trận đã đá xong</p>
      <p className="mt-1 font-display text-xl font-black tracking-tight">Đánh giá đối thủ</p>
      <p className="mt-1 text-xs text-ink-soft">
        Điểm của bạn cộng vào uy tín của đội bạn vừa gặp.
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        {Array.from({ length: RATING_MAX }, (_, i) => i + 1).map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setScore(n)}
            aria-label={`${n} trên ${RATING_MAX} sao`}
            aria-pressed={score === n}
            className={`size-9 border font-display text-lg font-black transition ${
              n <= score
                ? 'border-ink bg-ink text-paper'
                : 'border-ink/15 bg-white text-ink/30 hover:border-ink'
            }`}
          >
            ★
          </button>
        ))}
        <span className="ml-2 text-sm font-semibold text-ink-soft">
          {score > 0 ? `${score}/${RATING_MAX}` : 'Chọn số sao'}
        </span>
      </div>

      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        rows={2}
        maxLength={500}
        placeholder="Đội bạn chơi thế nào? (không bắt buộc)"
        className="input mt-3 resize-none"
      />

      <button
        type="button"
        onClick={() => onSubmit(score, comment)}
        disabled={score === 0 || pending}
        className="btn-primary mt-3 w-full"
      >
        {pending ? 'Đang gửi...' : existing ? 'Cập nhật đánh giá' : 'Gửi đánh giá'}
      </button>
    </div>
  );
}

/** Báo cáo đội vi phạm (FR-005.11). Gửi xong là xong — admin xử lý ở phần quản trị. */
function ReportPanel({
  team,
  pending,
  sent,
  onSubmit,
}: {
  team: RecruitmentTeamRef;
  pending: boolean;
  sent: boolean;
  onSubmit: (reason: ReportReason, detail: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<ReportReason>('no_show');
  const [detail, setDetail] = useState('');

  if (sent) {
    return (
      <article className="border border-ink/12 bg-white p-6">
        <p className="text-xs font-bold tracking-wide text-ink-soft">Đã gửi báo cáo</p>
        <p className="mt-1 text-sm leading-relaxed text-ink-soft">
          Quản trị viên sẽ xem xét báo cáo về {team.name}. Bạn không cần gửi lại.
        </p>
      </article>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full border border-ink/15 px-4 py-3 text-sm font-semibold text-ink-soft transition hover:border-rust hover:text-rust"
      >
        Báo cáo {team.name}
      </button>
    );
  }

  return (
    <article className="border border-rust/40 bg-white p-6">
      <div className="flex items-baseline justify-between">
        <p className="text-xs font-bold tracking-wide text-rust">Báo cáo vi phạm</p>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-xs font-semibold text-ink-soft transition hover:text-ink"
        >
          Đóng
        </button>
      </div>
      <h3 className="mt-1 font-display text-xl font-black tracking-tight">{team.name}</h3>

      <div className="mt-4 space-y-3">
        <label className="block">
          <span className="mb-2 block text-xs font-semibold tracking-wide text-ink-soft">
            Lý do
          </span>
          <select
            value={reason}
            onChange={(e) => setReason(e.target.value as ReportReason)}
            className="input"
          >
            {REPORT_REASONS.map((r) => (
              <option key={r} value={r}>
                {REPORT_REASON_LABELS[r]}
              </option>
            ))}
          </select>
        </label>

        <textarea
          value={detail}
          onChange={(e) => setDetail(e.target.value)}
          rows={3}
          maxLength={1000}
          placeholder="Kể lại chuyện đã xảy ra để quản trị viên có căn cứ..."
          className="input resize-none"
        />

        <button
          type="button"
          onClick={() => onSubmit(reason, detail)}
          disabled={pending}
          className="w-full border border-rust bg-rust/5 px-4 py-2.5 text-sm font-bold text-rust transition hover:bg-rust/10 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? 'Đang gửi...' : 'Gửi báo cáo'}
        </button>
      </div>
    </article>
  );
}
