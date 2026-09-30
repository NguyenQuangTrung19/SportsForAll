import {
  BOOKING_STATUSES,
  BOOKING_STATUS_LABELS,
  type BookingListResponse,
  type BookingStatus,
} from '@sfa/shared';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { LoadMore } from '@/components/LoadMore';
import { PageShell } from '@/components/PageShell';
import { SportIcon } from '@/components/SportIcon';
import { api, apiMessage } from '@/lib/api';
import { formatSlotRange, formatVnd } from '@/lib/format';

type Filter = 'all' | BookingStatus;

/** Đơn đặt sân của chính mình — mặt còn lại của hộp thư đơn bên chủ sân. */
export function MyBookingsPage() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<Filter>('all');
  const [error, setError] = useState<string | null>(null);

  const queryString = `status=${filter}&limit=20`;

  const { data, isLoading, isError, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteQuery({
      queryKey: ['bookings', 'me', queryString],
      initialPageParam: undefined as string | undefined,
      queryFn: async ({ pageParam }) => {
        const qs = pageParam ? `${queryString}&cursor=${pageParam}` : queryString;
        const { data } = await api.get<BookingListResponse>(`/venues/bookings/me?${qs}`);
        return data;
      },
      getNextPageParam: (last) => last.nextCursor ?? undefined,
    });

  const items = data?.pages.flatMap((p) => p.items) ?? [];

  const cancel = useMutation({
    mutationFn: async (bookingId: string) => {
      await api.post(`/venues/bookings/${bookingId}/cancel`);
    },
    onSuccess: () => {
      setError(null);
      void queryClient.invalidateQueries({ queryKey: ['bookings'] });
      void queryClient.invalidateQueries({ queryKey: ['venues'] });
    },
    onError: (err) => setError(apiMessage(err, 'Không huỷ được đơn')),
  });

  return (
    <PageShell
      eyebrow="Sân bãi"
      title="Sân tôi đã đặt."
      backTo="/venues"
      backLabel="← Danh sách sân"
    >
      <section className="mb-8 border border-ink/12 bg-white p-5">
        <p className="mb-2 text-xs font-semibold tracking-wide text-ink-soft">Trạng thái</p>
        <div className="flex flex-wrap gap-1.5">
          {(['all', ...BOOKING_STATUSES] as Filter[]).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`inline-flex items-center border px-3 py-1.5 text-xs font-semibold transition ${
                filter === f
                  ? 'border-ink bg-ink text-paper'
                  : 'border-ink/15 bg-white text-ink hover:border-ink'
              }`}
            >
              {f === 'all' ? 'Tất cả' : BOOKING_STATUS_LABELS[f]}
            </button>
          ))}
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
          Không tải được danh sách đơn.
        </p>
      )}

      {data && items.length === 0 && (
        <article className="border border-dashed border-ink/25 bg-white p-10 text-center">
          <p className="font-display text-2xl font-black tracking-tight">Chưa có đơn nào.</p>
          <p className="mt-2 text-sm text-ink-soft">
            Vào{' '}
            <Link to="/venues" className="font-semibold text-ink hover:underline">
              danh sách sân
            </Link>{' '}
            và chọn một khung giờ còn trống.
          </p>
        </article>
      )}

      {items.length > 0 && (
        <>
          <ul className="space-y-3">
            {items.map((b) => {
              const cancellable =
                (b.status === 'pending' || b.status === 'confirmed') &&
                new Date(b.slot.startsAt) > new Date();
              return (
                <li
                  key={b.id}
                  className="flex flex-wrap items-center gap-4 border border-ink/12 bg-white p-4"
                >
                  <span
                    aria-hidden
                    className="sport-block flex size-10 shrink-0 items-center justify-center text-xl"
                  >
                    <SportIcon sport={b.venue.sport} className="size-[1em]" />
                  </span>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[15px] font-bold">
                      <Link to={`/venues/${b.venue.id}`} className="hover:underline">
                        {b.venue.name}
                      </Link>
                    </p>
                    <p className="mt-0.5 text-xs text-ink-soft">
                      {formatSlotRange(b.slot.startsAt, b.slot.endsAt)} · {formatVnd(b.slot.price)}
                      {b.teamName && ` · ${b.teamName}`}
                    </p>
                    <p className="mt-0.5 truncate text-[11px] text-ink-soft/70">
                      {b.venue.address}
                    </p>
                  </div>

                  <span
                    className={`shrink-0 border px-2 py-1 text-[11px] font-bold tracking-wide ${
                      b.status === 'confirmed'
                        ? 'border-ink bg-ink text-paper'
                        : b.status === 'pending'
                          ? 'border-rust text-rust'
                          : 'border-ink/20 bg-paper-2/40 text-ink-soft'
                    }`}
                  >
                    {BOOKING_STATUS_LABELS[b.status].toUpperCase()}
                  </span>

                  {cancellable && (
                    <button
                      type="button"
                      onClick={() => {
                        if (!window.confirm('Huỷ đơn đặt sân này?')) return;
                        setError(null);
                        cancel.mutate(b.id);
                      }}
                      disabled={cancel.isPending}
                      className="border border-rust px-3 py-1.5 text-xs font-semibold text-rust transition hover:bg-rust/5 disabled:opacity-50"
                    >
                      Huỷ
                    </button>
                  )}
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
    </PageShell>
  );
}
