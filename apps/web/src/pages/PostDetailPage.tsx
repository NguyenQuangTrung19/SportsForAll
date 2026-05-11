import {
  JOIN_REQUEST_STATUS_LABELS,
  SKILL_LEVEL_LABELS,
  SPORT_THEMES,
  type JoinRequestView,
  type RecruitmentPostDetail,
} from '@sfa/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';

function extractMessage(err: unknown, fallback: string): string {
  if (err instanceof AxiosError) {
    const m = (err.response?.data as { error?: { message?: string } })?.error?.message;
    if (m) return m;
  }
  return fallback;
}

export function PostDetailPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const currentUserId = useAuthStore((s) => s.user?.id);
  const [actionError, setActionError] = useState<string | null>(null);
  const [applyMessage, setApplyMessage] = useState('');

  const postQuery = useQuery({
    enabled: Boolean(id),
    queryKey: ['recruitment', 'post', id],
    queryFn: async () => {
      const { data } = await api.get<RecruitmentPostDetail>(`/recruitment/posts/${id}`);
      return data;
    },
  });

  const setPost = (post: RecruitmentPostDetail) => {
    queryClient.setQueryData(['recruitment', 'post', id], post);
    queryClient.invalidateQueries({ queryKey: ['recruitment', 'list'] });
  };

  const applyMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post<RecruitmentPostDetail>(
        `/recruitment/posts/${id}/requests`,
        { message: applyMessage.trim() || undefined },
      );
      return data;
    },
    onSuccess: (data) => {
      setPost(data);
      setApplyMessage('');
    },
    onError: (err) => setActionError(extractMessage(err, 'Không gửi được đơn')),
  });

  const acceptMutation = useMutation({
    mutationFn: async (requestId: string) => {
      const { data } = await api.post<RecruitmentPostDetail>(
        `/recruitment/requests/${requestId}/accept`,
      );
      return data;
    },
    onSuccess: setPost,
    onError: (err) => setActionError(extractMessage(err, 'Không chấp nhận được')),
  });

  const rejectMutation = useMutation({
    mutationFn: async (requestId: string) => {
      const { data } = await api.post<RecruitmentPostDetail>(
        `/recruitment/requests/${requestId}/reject`,
      );
      return data;
    },
    onSuccess: setPost,
    onError: (err) => setActionError(extractMessage(err, 'Không từ chối được')),
  });

  const cancelMutation = useMutation({
    mutationFn: async (requestId: string) => {
      const { data } = await api.post<RecruitmentPostDetail>(
        `/recruitment/requests/${requestId}/cancel`,
      );
      return data;
    },
    onSuccess: setPost,
    onError: (err) => setActionError(extractMessage(err, 'Không huỷ được')),
  });

  const closeMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.patch<RecruitmentPostDetail>(
        `/recruitment/posts/${id}`,
        { status: 'closed' },
      );
      return data;
    },
    onSuccess: setPost,
    onError: (err) => setActionError(extractMessage(err, 'Không đóng được bài')),
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

  const post = postQuery.data;
  const isTeamMember = post?.viewerIsTeamMember ?? false;
  const myPendingRequest = post?.requests.find(
    (r) => r.userId === currentUserId && r.status === 'pending',
  );

  return (
    <div className="relative min-h-screen overflow-hidden bg-night text-cream">
      <div className="mouse-spotlight pointer-events-none fixed inset-0 z-0" aria-hidden />
      <div className="grid-bg pointer-events-none fixed inset-0 z-0" aria-hidden />

      <header className="relative z-10 border-b border-cream/10 bg-night/40 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-4">
          <Link
            to="/find-teammates"
            className="font-display text-2xl font-black uppercase leading-none tracking-tight text-cream md:text-3xl"
          >
            SportsForAll<span className="text-primary">.</span>
          </Link>
          <Link
            to="/find-teammates"
            className="group inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.22em] text-cream/55 transition hover:text-cream"
          >
            <span aria-hidden className="transition-transform group-hover:-translate-x-1">
              ←
            </span>
            Tìm đồng đội
          </Link>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-5xl px-6 py-10 md:py-14">
        {postQuery.isLoading && (
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-cream/55">
            Đang tải bài đăng...
          </p>
        )}

        {postQuery.isError && (
          <p className="rounded-xl border border-ember/35 bg-ember/10 p-3 font-mono text-[11px] uppercase tracking-wider text-ember">
            Không tải được bài đăng.
          </p>
        )}

        {post && (
          <>
            <PostHeader post={post} />

            {actionError && (
              <p className="mt-6 rounded-xl border border-ember/35 bg-ember/10 p-3 font-mono text-[11px] uppercase tracking-wider text-ember">
                {actionError}
              </p>
            )}

            <section className="mt-8 grid gap-6 lg:grid-cols-12">
              <div className="lg:col-span-7 space-y-6">
                <article className="rounded-3xl border border-cream/15 bg-gradient-to-br from-cream/[0.06] to-cream/[0.02] p-6 backdrop-blur-2xl">
                  <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-cream/55">
                    Nội dung bài đăng
                  </p>
                  <p className="mt-3 whitespace-pre-line text-base leading-relaxed text-cream/85">
                    {post.description}
                  </p>
                </article>

                {isTeamMember && (
                  <article className="rounded-3xl border border-cream/15 bg-gradient-to-br from-cream/[0.06] to-cream/[0.02] p-6 backdrop-blur-2xl">
                    <header className="flex items-baseline justify-between">
                      <h2 className="font-display text-xl font-black uppercase tracking-tight text-cream">
                        Đơn ứng tuyển ({post.requests.length})
                      </h2>
                      {post.status === 'open' && (
                        <button
                          type="button"
                          onClick={() => {
                            if (!window.confirm('Đóng bài này? Sẽ không nhận thêm đơn mới.')) return;
                            setActionError(null);
                            closeMutation.mutate();
                          }}
                          disabled={closeMutation.isPending}
                          className="rounded-full border border-cream/20 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.22em] text-cream/65 transition hover:border-cream/55 hover:text-cream disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Đóng bài
                        </button>
                      )}
                    </header>

                    {post.requests.length === 0 ? (
                      <p className="mt-4 text-sm text-cream/65">Chưa có đơn nào.</p>
                    ) : (
                      <ul className="mt-5 space-y-3">
                        {post.requests.map((req) => (
                          <JoinRequestRow
                            key={req.id}
                            request={req}
                            onAccept={() => {
                              setActionError(null);
                              acceptMutation.mutate(req.id);
                            }}
                            onReject={() => {
                              setActionError(null);
                              rejectMutation.mutate(req.id);
                            }}
                            pending={acceptMutation.isPending || rejectMutation.isPending}
                          />
                        ))}
                      </ul>
                    )}
                  </article>
                )}
              </div>

              {/* Sidebar */}
              <aside className="space-y-6 lg:col-span-5">
                {!isTeamMember && (
                  <article className="rounded-3xl border border-primary/30 bg-primary/[0.06] p-6 backdrop-blur-2xl">
                    <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary">
                      Bạn quan tâm bài này?
                    </p>
                    <h3 className="mt-2 font-display text-xl font-black uppercase tracking-tight text-cream">
                      Gửi đơn ứng tuyển
                    </h3>

                    {post.viewerRequestStatus && post.viewerRequestStatus !== 'pending' && (
                      <p className="mt-3 rounded-xl border border-cream/15 bg-cream/[0.04] p-3 font-mono text-[10px] uppercase tracking-[0.22em] text-cream/65">
                        Đơn trước đây: {labelForStatus(post.viewerRequestStatus)} — bạn có thể gửi lại.
                      </p>
                    )}

                    {post.status !== 'open' ? (
                      <p className="mt-4 font-mono text-[11px] uppercase tracking-wider text-ember">
                        Bài đã đóng.
                      </p>
                    ) : myPendingRequest ? (
                      <div className="mt-4 space-y-3">
                        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cream/55">
                          Bạn đã gửi đơn — chờ đội duyệt.
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            if (!window.confirm('Huỷ đơn ứng tuyển này?')) return;
                            setActionError(null);
                            cancelMutation.mutate(myPendingRequest.id);
                          }}
                          disabled={cancelMutation.isPending}
                          className="w-full rounded-full border border-ember/35 bg-ember/10 px-4 py-2 font-mono text-[11px] font-semibold uppercase tracking-[0.22em] text-ember transition hover:bg-ember/20 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {cancelMutation.isPending ? 'Đang huỷ...' : 'Huỷ đơn'}
                        </button>
                      </div>
                    ) : (
                      <div className="mt-4 space-y-3">
                        <textarea
                          value={applyMessage}
                          onChange={(e) => setApplyMessage(e.target.value)}
                          rows={3}
                          maxLength={500}
                          placeholder="Vài dòng về bạn — trình độ, vị trí ưa thích, lịch rảnh..."
                          className="dark-input resize-none"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setActionError(null);
                            applyMutation.mutate();
                          }}
                          disabled={applyMutation.isPending}
                          className="w-full rounded-full bg-primary px-4 py-2.5 font-mono text-[11px] font-semibold uppercase tracking-[0.22em] text-night shadow-[0_18px_50px_-12px_rgb(var(--color-primary))] transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {applyMutation.isPending ? 'Đang gửi...' : 'Gửi đơn'}
                        </button>
                      </div>
                    )}
                  </article>
                )}

                <article className="rounded-3xl border border-cream/15 bg-gradient-to-br from-cream/[0.06] to-cream/[0.02] p-6 backdrop-blur-2xl">
                  <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-cream/55">
                    Về đội
                  </p>
                  <h3 className="mt-2 font-display text-xl font-black uppercase tracking-tight text-cream">
                    {post.team.name}
                  </h3>
                  <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.22em] text-cream/55">
                    {SPORT_THEMES[post.team.sport].nameVi}
                    {post.team.region ? ` · ${post.team.region}` : ''}
                  </p>
                  <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.22em] text-cream/65">
                    Uy tín · {post.team.reputation.toFixed(1)}
                  </p>
                  <Link
                    to={`/teams/${post.teamId}`}
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

function PostHeader({ post }: { post: RecruitmentPostDetail }) {
  const t = SPORT_THEMES[post.sport];
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
            Tuyển thành viên · {t.nameVi}
          </p>
          <h1 className="mt-1 font-display text-3xl font-black uppercase tracking-tight text-cream md:text-4xl">
            {post.team.name}
          </h1>
          <div className="mt-4 flex flex-wrap gap-2 font-mono text-[10px] uppercase tracking-[0.22em] text-cream/65">
            {post.region && <Tag>Khu vực · {post.region}</Tag>}
            {post.positionNeeded && <Tag>Vị trí · {post.positionNeeded}</Tag>}
            {post.skillLevelMin && (
              <Tag>Trình độ ≥ {SKILL_LEVEL_LABELS[post.skillLevelMin]}</Tag>
            )}
            <Tag>{post.requestCount} đơn</Tag>
            {post.status === 'closed' && (
              <span className="rounded-full border border-ember/35 bg-ember/10 px-2 py-0.5 text-ember">
                Đã đóng
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

function JoinRequestRow({
  request,
  onAccept,
  onReject,
  pending,
}: {
  request: JoinRequestView;
  onAccept: () => void;
  onReject: () => void;
  pending: boolean;
}) {
  return (
    <li className="rounded-xl border border-cream/10 bg-cream/[0.03] p-4">
      <div className="flex items-start gap-3">
        <div
          className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-cream/15 bg-cream/[0.04] font-display text-sm font-black uppercase text-primary"
          aria-hidden
        >
          {request.displayName.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-base font-black uppercase tracking-tight text-cream">
            {request.displayName}
          </p>
          <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.22em] text-cream/55">
            {JOIN_REQUEST_STATUS_LABELS[request.status]} ·{' '}
            {new Date(request.createdAt).toLocaleString('vi-VN')}
          </p>
          {request.message && (
            <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-cream/75">
              {request.message}
            </p>
          )}
        </div>
        {request.status === 'pending' && (
          <div className="flex flex-col gap-2">
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
          </div>
        )}
      </div>
    </li>
  );
}

function labelForStatus(s: string): string {
  if (s === 'pending') return 'Đang chờ';
  if (s === 'accepted') return 'Đã chấp nhận';
  if (s === 'rejected') return 'Bị từ chối';
  return 'Đã huỷ';
}
