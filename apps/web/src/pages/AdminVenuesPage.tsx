import { VENUE_STATUS_LABELS, type AdminVenueItem, type AdminVenueListResponse } from '@sfa/shared';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AdminShell, FilterPills } from '@/components/AdminShell';
import { LoadMore } from '@/components/LoadMore';
import { SportIcon } from '@/components/SportIcon';
import { api, apiMessage } from '@/lib/api';
import { formatVnd } from '@/lib/format';
import { useSports } from '@/lib/use-sports';

type StatusFilter = 'all' | 'active' | 'suspended';

/** FR-010.5 — admin quản lý sân đã đăng ký. */
export function AdminVenuesPage() {
  const queryClient = useQueryClient();
  const { sportOf } = useSports();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [error, setError] = useState<string | null>(null);

  const queryString = (() => {
    const p = new URLSearchParams();
    if (search.trim()) p.set('q', search.trim());
    p.set('status', status);
    p.set('limit', '20');
    return p.toString();
  })();

  const { data, isLoading, isError, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteQuery({
      queryKey: ['admin', 'venues', queryString],
      initialPageParam: undefined as string | undefined,
      queryFn: async ({ pageParam }) => {
        const qs = pageParam ? `${queryString}&cursor=${pageParam}` : queryString;
        const { data } = await api.get<AdminVenueListResponse>(`/admin/venues?${qs}`);
        return data;
      },
      getNextPageParam: (last) => last.nextCursor ?? undefined,
    });

  const items = data?.pages.flatMap((p) => p.items) ?? [];

  const toggle = useMutation({
    mutationFn: async (venue: AdminVenueItem) => {
      const action = venue.status === 'active' ? 'suspend' : 'activate';
      await api.post(`/admin/venues/${venue.id}/${action}`);
    },
    onSuccess: () => {
      setError(null);
      void queryClient.invalidateQueries({ queryKey: ['admin'] });
    },
    onError: (err) => setError(apiMessage(err, 'Không đổi được trạng thái sân')),
  });

  return (
    <AdminShell
      title="Sân bãi"
      subtitle="Đình chỉ sân là gỡ khỏi danh sách công khai và chặn đơn mới. Đơn đã xác nhận vẫn còn — huỷ một buổi đá đã hẹn là việc của chủ sân, không phải của admin."
    >
      <section className="mb-8 space-y-4 border border-ink/12 bg-white p-5">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Tìm theo tên sân hoặc địa chỉ..."
          className="input"
          maxLength={100}
        />
        <div>
          <p className="mb-2 text-xs font-semibold tracking-wide text-ink-soft">Trạng thái</p>
          <FilterPills
            value={status}
            onChange={setStatus}
            options={[
              { value: 'all', label: 'Tất cả' },
              { value: 'active', label: VENUE_STATUS_LABELS.active },
              { value: 'suspended', label: VENUE_STATUS_LABELS.suspended },
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
          Không tải được danh sách sân.
        </p>
      )}

      {data && items.length === 0 && (
        <p className="border border-dashed border-ink/25 bg-white p-10 text-center text-sm text-ink-soft">
          Chưa có sân nào khớp bộ lọc.
        </p>
      )}

      {items.length > 0 && (
        <>
          <ul className="divide-y divide-ink/10 border-y border-ink/10">
            {items.map((v) => {
              const suspended = v.status === 'suspended';
              return (
                <li
                  key={v.id}
                  className={`flex flex-wrap items-center gap-4 py-4 ${suspended ? 'opacity-60' : ''}`}
                >
                  <span
                    aria-hidden
                    className="sport-block flex size-10 shrink-0 items-center justify-center text-xl"
                  >
                    <SportIcon sport={v.sport} className="size-[1em]" />
                  </span>

                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-2 truncate font-display text-base font-black tracking-tight">
                      <Link to={`/venues/${v.id}`} className="hover:underline">
                        {v.name}
                      </Link>
                      {suspended && (
                        <span className="border border-rust px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-rust">
                          ĐÌNH CHỈ
                        </span>
                      )}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-ink-soft">
                      {sportOf(v.sport).nameVi} · {v.address}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-ink-soft/70">
                      {v.ownerName}
                      {v.ownerEmail && ` (${v.ownerEmail})`} · {formatVnd(v.pricePerHour)}/giờ ·{' '}
                      {v.slotCount} khung · {v.bookingsConfirmed} đơn đã xác nhận
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setError(null);
                      toggle.mutate(v);
                    }}
                    disabled={toggle.isPending}
                    className={`border px-3 py-1.5 text-xs font-semibold transition disabled:opacity-50 ${
                      suspended
                        ? 'border-ink/25 hover:border-ink'
                        : 'border-rust text-rust hover:bg-rust/5'
                    }`}
                  >
                    {suspended ? 'Mở lại' : 'Đình chỉ'}
                  </button>
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
