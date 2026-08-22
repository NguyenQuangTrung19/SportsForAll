import type { SportSlug, VenueListResponse, VenueSummary } from '@sfa/shared';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { LoadMore } from '@/components/LoadMore';
import { PageShell } from '@/components/PageShell';
import { SportIcon } from '@/components/SportIcon';
import { api } from '@/lib/api';
import { formatRating, formatVnd } from '@/lib/format';
import { useSports } from '@/lib/use-sports';
import { useAuthStore } from '@/stores/auth-store';
import { useSportStore } from '@/stores/sport-store';

type Sort = 'rating' | 'price' | 'newest';

const SORT_LABELS: Record<Sort, string> = {
  rating: 'Điểm cao nhất',
  price: 'Giá thấp nhất',
  newest: 'Mới nhất',
};

/** FR-008 — danh sách sân cho người thuê. */
export function VenuesPage() {
  const { sports, sportOf } = useSports();
  const currentSport = useSportStore((s) => s.current);
  const role = useAuthStore((s) => s.user?.role);
  const [sport, setSport] = useState<SportSlug | null>(currentSport);
  const [search, setSearch] = useState('');
  const [region, setRegion] = useState('');
  const [priceMax, setPriceMax] = useState('');
  const [sort, setSort] = useState<Sort>('rating');

  const queryString = (() => {
    const p = new URLSearchParams();
    if (sport) p.set('sport', sport);
    if (search.trim()) p.set('q', search.trim());
    if (region.trim()) p.set('region', region.trim());
    if (priceMax.trim()) p.set('priceMax', priceMax.trim());
    p.set('sort', sort);
    p.set('limit', '12');
    return p.toString();
  })();

  const { data, isLoading, isError, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteQuery({
      queryKey: ['venues', queryString],
      initialPageParam: undefined as string | undefined,
      queryFn: async ({ pageParam }) => {
        const qs = pageParam ? `${queryString}&cursor=${pageParam}` : queryString;
        const { data } = await api.get<VenueListResponse>(`/venues?${qs}`);
        return data;
      },
      getNextPageParam: (last) => last.nextCursor ?? undefined,
    });

  const items = data?.pages.flatMap((p) => p.items) ?? [];
  const canPost = role === 'business' || role === 'admin';

  return (
    <PageShell
      eyebrow="Sân bãi"
      title={
        <>
          Thuê sân,
          <br />
          đá cho đã.
        </>
      }
      actions={
        <div className="flex flex-wrap gap-2">
          <Link to="/bookings" className="btn-ghost">
            Sân tôi đã đặt
          </Link>
          {canPost && (
            <Link to="/venues/new" className="btn-primary">
              Đăng sân
            </Link>
          )}
        </div>
      }
    >
      <section className="mb-8 space-y-4 border border-ink/12 bg-white p-5">
        <div className="flex flex-wrap gap-2">
          <Pill active={sport === null} onClick={() => setSport(null)} label="Tất cả" />
          {sports.map(({ slug }) => (
            <Pill
              key={slug}
              active={sport === slug}
              onClick={() => setSport(slug)}
              label={sportOf(slug).nameVi}
            />
          ))}
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <label className="block">
            <span className="mb-2 block text-xs font-semibold tracking-wide text-ink-soft">
              Tên sân hoặc địa chỉ
            </span>
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Sân Mỹ Đình, Cầu Giấy..."
              className="input"
              maxLength={100}
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-xs font-semibold tracking-wide text-ink-soft">
              Khu vực
            </span>
            <input
              type="text"
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              placeholder="Hà Nội"
              className="input"
              maxLength={100}
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-xs font-semibold tracking-wide text-ink-soft">
              Giá tối đa mỗi giờ (VND)
            </span>
            <input
              type="number"
              min={0}
              step={50000}
              value={priceMax}
              onChange={(e) => setPriceMax(e.target.value)}
              placeholder="500000"
              className="input"
            />
          </label>
        </div>

        <div>
          <p className="mb-2 text-xs font-semibold tracking-wide text-ink-soft">Sắp xếp</p>
          <div className="flex flex-wrap gap-1.5">
            {(Object.keys(SORT_LABELS) as Sort[]).map((s) => (
              <Pill
                key={s}
                active={sort === s}
                onClick={() => setSort(s)}
                label={SORT_LABELS[s]}
                compact
              />
            ))}
          </div>
        </div>
      </section>

      {isLoading && <p className="text-sm text-ink-soft">Đang tải...</p>}
      {isError && (
        <p className="border border-rust bg-rust/5 px-3 py-2 text-sm font-medium text-rust">
          Không tải được danh sách sân.
        </p>
      )}

      {data && items.length === 0 && (
        <article className="border border-dashed border-ink/25 bg-white p-10 text-center">
          <p className="font-display text-2xl font-black tracking-tight">
            Chưa có sân nào khớp bộ lọc.
          </p>
          <p className="mt-2 text-sm text-ink-soft">
            {canPost
              ? 'Bạn là chủ sân? Bấm "Đăng sân" ở trên để là người đầu tiên.'
              : 'Thử bỏ bớt bộ lọc, hoặc quay lại sau.'}
          </p>
        </article>
      )}

      {items.length > 0 && (
        <>
          <ul className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {items.map((v) => (
              <VenueCard key={v.id} venue={v} sportName={sportOf(v.sport).nameVi} />
            ))}
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

function VenueCard({ venue, sportName }: { venue: VenueSummary; sportName: string }) {
  return (
    <li>
      <Link
        to={`/venues/${venue.id}`}
        className="group flex h-full flex-col border border-ink/12 bg-white transition hover:-translate-y-1 hover:shadow-[6px_6px_0_rgba(11,46,34,0.12)]"
      >
        <div className="aspect-[16/10] overflow-hidden bg-paper-2/60">
          {venue.photoUrl ? (
            <img
              src={venue.photoUrl}
              alt=""
              aria-hidden
              className="size-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="flex size-full items-center justify-center text-4xl text-ink/15">
              <SportIcon sport={venue.sport} className="size-[1em]" />
            </div>
          )}
        </div>

        <div className="flex flex-1 flex-col p-5">
          <p className="text-xs text-ink-soft">
            <SportIcon sport={venue.sport} className="size-[1em]" /> {sportName}
            {venue.region && ` · ${venue.region}`}
          </p>
          <p className="mt-1 font-display text-lg font-black leading-tight tracking-tight">
            {venue.name}
          </p>
          <p className="mt-1 line-clamp-2 text-xs text-ink-soft/80">{venue.address}</p>

          <div className="mt-auto flex items-end justify-between gap-3 border-t border-ink/10 pt-3">
            <div>
              <p className="poster-num text-xl text-primary-dark">
                {formatVnd(venue.pricePerHour)}
              </p>
              <p className="text-[11px] text-ink-soft/70">mỗi giờ</p>
            </div>
            <div className="text-right">
              <p className="text-[11px] font-semibold text-ink-soft">
                {formatRating(venue.rating, venue.reviewCount)}
              </p>
              <p className="mt-0.5 text-[11px] text-ink-soft/70">
                {venue.openSlotCount > 0 ? `${venue.openSlotCount} khung trống` : 'Hết khung trống'}
              </p>
            </div>
          </div>
        </div>
      </Link>
    </li>
  );
}

function Pill({
  active,
  onClick,
  label,
  compact = false,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center border font-semibold transition ${
        compact ? 'px-2.5 py-1 text-xs' : 'px-3.5 py-1.5 text-sm'
      } ${active ? 'border-ink bg-ink text-paper' : 'border-ink/15 bg-white text-ink hover:border-ink'}`}
    >
      {label}
    </button>
  );
}
