import {
  JOIN_REQUEST_STATUS_LABELS,
  SKILL_LEVEL_LABELS,
  SPORT_THEMES,
  type JoinRequestView,
  type RecruitmentPostDetail,
} from '@sfa/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { useState } from 'react';
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

  const post = postQuery.data;
  const isTeamMember = post?.viewerIsTeamMember ?? false;
  const myPendingRequest = post?.requests.find(
    (r) => r.userId === currentUserId && r.status === 'pending',
  );

  return (
    <div className="min-h-screen bg-paper text-ink">
      <header className="border-b border-ink/10">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-4">
          <Link
            to="/find-teammates"
            className="font-display text-2xl font-black uppercase leading-none tracking-tight"
          >
            SportsForAll<span className="text-primary">.</span>
          </Link>
          <Link
            to="/find-teammates"
            className="text-sm font-semibold text-ink-soft hover:text-ink"
          >
            ← Tìm đồng đội
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-10 md:py-14">
        {postQuery.isLoading && <p className="text-sm text-ink-soft">Đang tải...</p>}

        {postQuery.isError && (
          <p className="border border-rust bg-rust/5 px-3 py-2 text-sm font-medium text-rust">
            Không tải được bài đăng.
          </p>
        )}

        {post && (
          <>
            <PostHeader post={post} />

            {actionError && (
              <p className="mt-6 border border-rust bg-rust/5 px-3 py-2 text-sm font-medium text-rust">
                {actionError}
              </p>
            )}

            <section className="mt-8 grid gap-6 lg:grid-cols-12">
              <div className="space-y-6 lg:col-span-7">
                <article className="border border-ink/12 bg-white p-6 md:p-8">
                  <p className="text-xs font-bold uppercase tracking-wide text-ink-soft">
                    Nội dung bài đăng
                  </p>
                  <p className="mt-3 whitespace-pre-line text-base leading-relaxed">
                    {post.description}
                  </p>
                </article>

                {isTeamMember && (
                  <article className="border border-ink/12 bg-white p-6 md:p-8">
                    <header className="flex items-baseline justify-between border-b-2 border-ink pb-3">
                      <h2 className="font-display text-xl font-black uppercase tracking-tight">
                        Đơn ứng tuyển
                      </h2>
                      <div className="flex items-baseline gap-3">
                        <span className="poster-num text-2xl text-primary">
                          {String(post.requests.length).padStart(2, '0')}
                        </span>
                        {post.status === 'open' && (
                          <button
                            type="button"
                            onClick={() => {
                              if (
                                !window.confirm('Đóng bài này? Sẽ không nhận thêm đơn mới.')
                              )
                                return;
                              setActionError(null);
                              closeMutation.mutate();
                            }}
                            disabled={closeMutation.isPending}
                            className="border border-ink/15 px-3 py-1.5 text-xs font-semibold transition hover:border-ink disabled:opacity-50"
                          >
                            Đóng bài
                          </button>
                        )}
                      </div>
                    </header>

                    {post.requests.length === 0 ? (
                      <p className="mt-4 text-sm text-ink-soft">Chưa có đơn nào.</p>
                    ) : (
                      <ul className="mt-2 divide-y divide-ink/10">
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

              <aside className="space-y-6 lg:col-span-5">
                {!isTeamMember && (
                  <article className="border border-ink bg-white p-6 shadow-[6px_6px_0_rgba(15,17,21,0.08)]">
                    <p className="text-xs font-bold uppercase tracking-wide text-primary">
                      Quan tâm bài này?
                    </p>
                    <h3 className="mt-1 font-display text-xl font-black uppercase tracking-tight">
                      Gửi đơn ứng tuyển
                    </h3>

                    {post.viewerRequestStatus && post.viewerRequestStatus !== 'pending' && (
                      <p className="mt-3 border border-ink/15 bg-paper-2/40 p-3 text-xs font-semibold text-ink-soft">
                        Đơn trước đây: {labelForStatus(post.viewerRequestStatus)} — bạn có thể gửi lại.
                      </p>
                    )}

                    {post.status !== 'open' ? (
                      <p className="mt-4 text-sm font-semibold text-rust">Bài đã đóng.</p>
                    ) : myPendingRequest ? (
                      <div className="mt-4 space-y-3">
                        <p className="text-sm text-ink-soft">
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
                          className="w-full border border-rust bg-rust/5 px-4 py-2 text-sm font-bold text-rust transition hover:bg-rust/10 disabled:cursor-not-allowed disabled:opacity-50"
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
                          className="input resize-none"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setActionError(null);
                            applyMutation.mutate();
                          }}
                          disabled={applyMutation.isPending}
                          className="btn-primary w-full"
                        >
                          {applyMutation.isPending ? 'Đang gửi...' : 'Gửi đơn'}
                        </button>
                      </div>
                    )}
                  </article>
                )}

                <article className="border border-ink/12 bg-white p-6">
                  <p className="text-xs font-bold uppercase tracking-wide text-ink-soft">
                    Về đội
                  </p>
                  <h3 className="mt-1 font-display text-xl font-black uppercase tracking-tight">
                    {post.team.name}
                  </h3>
                  <p className="mt-1 text-xs text-ink-soft">
                    {SPORT_THEMES[post.team.sport].nameVi}
                    {post.team.region ? ` · ${post.team.region}` : ''}
                  </p>
                  <p className="mt-3 text-xs font-semibold text-ink-soft">
                    Uy tín · {post.team.reputation.toFixed(1)}
                  </p>
                  <Link
                    to={`/teams/${post.teamId}`}
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

function PostHeader({ post }: { post: RecruitmentPostDetail }) {
  const t = SPORT_THEMES[post.sport];
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
            Tuyển thành viên · {t.nameVi}
          </p>
          <h1 className="mt-1 font-display text-3xl font-black uppercase leading-[0.9] tracking-tight md:text-4xl">
            {post.team.name}
          </h1>
          <div className="mt-4 flex flex-wrap gap-2">
            {post.region && <Tag>Khu vực · {post.region}</Tag>}
            {post.positionNeeded && <Tag>Vị trí · {post.positionNeeded}</Tag>}
            {post.skillLevelMin && (
              <Tag>Trình độ ≥ {SKILL_LEVEL_LABELS[post.skillLevelMin]}</Tag>
            )}
            <Tag>{post.requestCount} đơn</Tag>
            {post.status === 'closed' && (
              <span className="inline-flex border border-rust bg-rust/5 px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-rust">
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
    <span className="inline-flex border border-ink/15 bg-paper-2/40 px-2.5 py-1 text-xs font-semibold text-ink-soft">
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
    <li className="flex items-start gap-3 py-4">
      <div
        className="flex size-10 shrink-0 items-center justify-center bg-ink font-display text-sm font-black uppercase text-paper"
        aria-hidden
      >
        {request.displayName.charAt(0).toUpperCase()}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-display text-base font-black uppercase tracking-tight">
          {request.displayName}
        </p>
        <p className="mt-0.5 text-xs text-ink-soft">
          {JOIN_REQUEST_STATUS_LABELS[request.status]} ·{' '}
          {new Date(request.createdAt).toLocaleString('vi-VN')}
        </p>
        {request.message && (
          <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-ink-soft">
            {request.message}
          </p>
        )}
      </div>
      {request.status === 'pending' && (
        <div className="flex shrink-0 flex-col gap-2">
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
        </div>
      )}
    </li>
  );
}

function labelForStatus(s: string): string {
  if (s === 'pending') return 'Đang chờ';
  if (s === 'accepted') return 'Đã chấp nhận';
  if (s === 'rejected') return 'Bị từ chối';
  return 'Đã huỷ';
}
