import {
  ADMIN_POST_KINDS,
  ADMIN_POST_KIND_LABELS,
  type AdminPostItem,
  type AdminPostKind,
  type AdminPostListResponse,
} from '@sfa/shared';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AdminShell, FilterPills } from '@/components/AdminShell';
import { LoadMore } from '@/components/LoadMore';
import { SportIcon } from '@/components/SportIcon';
import { api, apiMessage } from '@/lib/api';
import { useSports } from '@/lib/use-sports';

type StatusFilter = 'open' | 'closed' | 'all';

/**
 * FR-010.3 — duyệt bài đăng.
 *
 * Bài lên thẳng rồi admin gỡ sau, không duyệt trước: mọi danh sách công khai đã
 * lọc `status: 'open'` sẵn nên gỡ bài là bài biến mất ngay, và gỡ nhầm thì bấm
 * khôi phục — không mất dữ liệu như xoá.
 */
export function AdminPostsPage() {
  const queryClient = useQueryClient();
  const { sportOf } = useSports();
  const [kind, setKind] = useState<AdminPostKind>('recruitment');
  const [status, setStatus] = useState<StatusFilter>('open');
  const [error, setError] = useState<string | null>(null);

  const queryString = `kind=${kind}&status=${status}&limit=20`;

  const { data, isLoading, isError, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteQuery({
      queryKey: ['admin', 'posts', queryString],
      initialPageParam: undefined as string | undefined,
      queryFn: async ({ pageParam }) => {
        const qs = pageParam ? `${queryString}&cursor=${pageParam}` : queryString;
        const { data } = await api.get<AdminPostListResponse>(`/admin/posts?${qs}`);
        return data;
      },
      getNextPageParam: (last) => last.nextCursor ?? undefined,
    });

  const items = data?.pages.flatMap((p) => p.items) ?? [];

  const toggle = useMutation({
    mutationFn: async (post: AdminPostItem) => {
      await api.post(`/admin/posts/${post.kind}/${post.id}/${post.open ? 'close' : 'reopen'}`);
    },
    onSuccess: () => {
      setError(null);
      void queryClient.invalidateQueries({ queryKey: ['admin'] });
    },
    onError: (err) => setError(apiMessage(err, 'Không đổi được trạng thái bài đăng')),
  });

  return (
    <AdminShell
      title="Bài đăng"
      subtitle="Gỡ bài chỉ đổi trạng thái, không xoá dữ liệu — gỡ nhầm thì khôi phục lại được."
    >
      <section className="mb-8 flex flex-wrap gap-x-8 gap-y-3 border border-ink/12 bg-white p-5">
        <div>
          <p className="mb-2 text-xs font-semibold tracking-wide text-ink-soft">Loại bài</p>
          <FilterPills
            value={kind}
            onChange={setKind}
            options={ADMIN_POST_KINDS.map((k) => ({ value: k, label: ADMIN_POST_KIND_LABELS[k] }))}
          />
        </div>
        <div>
          <p className="mb-2 text-xs font-semibold tracking-wide text-ink-soft">Trạng thái</p>
          <FilterPills
            value={status}
            onChange={setStatus}
            options={[
              { value: 'open', label: 'Đang hiển thị' },
              { value: 'closed', label: 'Đã gỡ / đã đóng' },
              { value: 'all', label: 'Tất cả' },
            ]}
          />
        </div>
      </section>

      {error && (
        <p className="mb-6 border border-rust bg-rust/5 px-3 py-2 text-sm font-medium text-rust">
          {error}
        </p>
      )}

      {isLoading && <p className="text-sm text-ink-soft">Đang tải...</p>}
      {isError && (
        <p className="border border-rust bg-rust/5 px-3 py-2 text-sm font-medium text-rust">
          Không tải được danh sách bài đăng.
        </p>
      )}

      {data && items.length === 0 && (
        <p className="border border-dashed border-ink/25 bg-white p-10 text-center text-sm text-ink-soft">
          Không có bài nào khớp bộ lọc.
        </p>
      )}

      {items.length > 0 && (
        <>
          <ul className="space-y-4">
            {items.map((post) => {
              const theme = sportOf(post.sport);
              return (
                <li key={`${post.kind}-${post.id}`} className="border border-ink/12 bg-white p-5">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-display text-lg font-black tracking-tight">
                        {post.authorName}
                      </p>
                      <p className="mt-0.5 text-xs text-ink-soft">
                        <SportIcon sport={theme.slug} className="size-[1em]" /> {theme.nameVi}
                        {post.region && ` · ${post.region}`} ·{' '}
                        {new Date(post.createdAt).toLocaleDateString('vi-VN')}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 border px-2 py-1 text-[11px] font-bold tracking-wide ${
                        post.open
                          ? 'border-ink/20 bg-paper-2/40 text-ink-soft'
                          : 'border-rust text-rust'
                      }`}
                    >
                      {post.open ? 'ĐANG HIỆN' : post.status.toUpperCase()}
                    </span>
                  </div>

                  <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-ink-soft">
                    {post.description}
                  </p>

                  <div className="mt-4 flex items-center justify-between border-t border-ink/10 pt-3">
                    <Link
                      to={post.link}
                      className="text-xs font-bold text-ink transition hover:underline"
                    >
                      Xem như người dùng →
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        setError(null);
                        toggle.mutate(post);
                      }}
                      disabled={toggle.isPending}
                      className={`border px-3 py-1.5 text-xs font-semibold transition disabled:opacity-50 ${
                        post.open
                          ? 'border-rust text-rust hover:bg-rust/5'
                          : 'border-ink/25 hover:border-ink'
                      }`}
                    >
                      {post.open ? 'Gỡ bài' : 'Khôi phục'}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
          <LoadMore
            hasMore={Boolean(hasNextPage)}
            loading={isFetchingNextPage}
            onClick={() => void fetchNextPage()}
          />
        </>
      )}
    </AdminShell>
  );
}
