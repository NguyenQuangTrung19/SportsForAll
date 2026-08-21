import {
  SKILL_LEVELS,
  SKILL_LEVEL_LABELS,
  TIME_SLOTS,
  TIME_SLOT_HINTS,
  TIME_SLOT_LABELS,
  type MatchRequestListResponse,
  type MatchRequestSummary,
  type ListSort,
  type SkillLevel,
  type SportSlug,
  type TimeSlot,
} from '@sfa/shared';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { LoadMore } from '@/components/LoadMore';
import { SortSelect } from '@/components/SortSelect';
import { SportIcon } from '@/components/SportIcon';
import { api } from '@/lib/api';
import { useSports } from '@/lib/use-sports';
import { useSportStore } from '@/stores/sport-store';

interface Filters {
  /** null = tất cả các môn. Không dùng chuỗi 'all' được nữa vì slug giờ là chuỗi tự do. */
  sport: SportSlug | null;
  region: string;
  venue: string;
  skillLevelMin: SkillLevel | 'any';
  timeSlot: TimeSlot | 'any';
  /** 0 = không lọc theo uy tín. */
  reputationMin: number;
  sort: ListSort;
}

/** Mốc uy tín gợi ý sẵn — thang đánh giá sau trận là 1–5 sao. */
const REPUTATION_STEPS = [3, 4, 4.5] as const;

const EMPTY_FILTERS: Omit<Filters, 'sport'> = {
  region: '',
  venue: '',
  skillLevelMin: 'any',
  timeSlot: 'any',
  reputationMin: 0,
  sort: 'newest',
};

export function FindOpponentsPage() {
  const { sports, sportOf } = useSports();
  const currentSport = useSportStore((s) => s.current);
  const [filters, setFilters] = useState<Filters>({ sport: currentSport, ...EMPTY_FILTERS });

  const queryString = (() => {
    const p = new URLSearchParams();
    if (filters.sport !== null) p.set('sport', filters.sport);
    if (filters.region.trim()) p.set('region', filters.region.trim());
    if (filters.venue.trim()) p.set('venue', filters.venue.trim());
    if (filters.skillLevelMin !== 'any') p.set('skillLevelMin', filters.skillLevelMin);
    if (filters.timeSlot !== 'any') p.set('timeSlot', filters.timeSlot);
    if (filters.reputationMin > 0) p.set('reputationMin', String(filters.reputationMin));
    p.set('sort', filters.sort);
    p.set('limit', '20');
    return p.toString();
  })();

  const { data, isLoading, isError, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteQuery({
      queryKey: ['matches', 'requests', queryString],
      initialPageParam: undefined as string | undefined,
      queryFn: async ({ pageParam }) => {
        const qs = pageParam ? `${queryString}&cursor=${pageParam}` : queryString;
        const { data } = await api.get<MatchRequestListResponse>(`/matches/requests?${qs}`);
        return data;
      },
      getNextPageParam: (last) => last.nextCursor ?? undefined,
    });

  const items = data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <div className="min-h-screen bg-paper text-ink">
      <header className="border-b border-ink/10">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
          <Link
            to="/dashboard"
            className="font-display text-2xl font-black leading-none tracking-tight"
          >
            SportsForAll<span className="text-primary-dark">.</span>
          </Link>
          <Link to="/dashboard" className="text-sm font-semibold text-ink-soft hover:text-ink">
            ← Bảng điều khiển
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10 md:py-14">
        <div className="mb-8">
          <p className="text-xs font-bold tracking-wide text-ink-soft">Tìm đối thủ</p>
          <h1 className="mt-2 font-display text-4xl font-black leading-[0.9] tracking-tight md:text-5xl">
            Các đội đang
            <br />
            tìm trận.
          </h1>
          <div className="mt-3 h-[3px] w-32 origin-left bg-ink animate-draw-line" aria-hidden />
        </div>

        <section className="mb-8 border border-ink/12 bg-white p-5">
          <div className="mb-3 flex items-baseline justify-between">
            <p className="text-xs font-bold tracking-wide text-ink-soft">Bộ lọc</p>
            <button
              type="button"
              onClick={() => setFilters({ sport: null, ...EMPTY_FILTERS })}
              className="text-xs font-semibold text-ink-soft transition hover:text-ink"
            >
              Đặt lại
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <p className="mb-2 text-xs font-semibold tracking-wide text-ink-soft">Môn</p>
              <div className="flex flex-wrap gap-2">
                <FilterPill
                  active={filters.sport === null}
                  onClick={() => setFilters({ ...filters, sport: null })}
                  label="Tất cả"
                />
                {sports.map(({ slug }) => {
                  const t = sportOf(slug);
                  return (
                    <FilterPill
                      key={slug}
                      active={filters.sport === slug}
                      onClick={() => setFilters({ ...filters, sport: slug })}
                      label={t.nameVi}
                    />
                  );
                })}
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-xs font-semibold tracking-wide text-ink-soft">
                  Khu vực
                </span>
                <input
                  type="text"
                  value={filters.region}
                  onChange={(e) => setFilters({ ...filters, region: e.target.value })}
                  placeholder="Hà Nội, TP. HCM..."
                  className="input"
                  maxLength={100}
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-xs font-semibold tracking-wide text-ink-soft">
                  Sân
                </span>
                <input
                  type="text"
                  value={filters.venue}
                  onChange={(e) => setFilters({ ...filters, venue: e.target.value })}
                  placeholder="Sân Bách Khoa, Nhà thi đấu..."
                  className="input"
                  maxLength={120}
                />
              </label>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <p className="mb-2 text-xs font-semibold tracking-wide text-ink-soft">
                  Trình độ tối thiểu
                </p>
                <div className="flex flex-wrap gap-1.5">
                  <FilterPill
                    active={filters.skillLevelMin === 'any'}
                    onClick={() => setFilters({ ...filters, skillLevelMin: 'any' })}
                    label="Bất kỳ"
                    compact
                  />
                  {SKILL_LEVELS.map((lvl) => (
                    <FilterPill
                      key={lvl}
                      active={filters.skillLevelMin === lvl}
                      onClick={() => setFilters({ ...filters, skillLevelMin: lvl })}
                      label={SKILL_LEVEL_LABELS[lvl]}
                      compact
                    />
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-2 text-xs font-semibold tracking-wide text-ink-soft">Buổi</p>
                <div className="flex flex-wrap gap-1.5">
                  <FilterPill
                    active={filters.timeSlot === 'any'}
                    onClick={() => setFilters({ ...filters, timeSlot: 'any' })}
                    label="Bất kỳ"
                    compact
                  />
                  {TIME_SLOTS.map((slot) => (
                    <FilterPill
                      key={slot}
                      active={filters.timeSlot === slot}
                      onClick={() => setFilters({ ...filters, timeSlot: slot })}
                      label={TIME_SLOT_LABELS[slot]}
                      title={`${TIME_SLOT_LABELS[slot]} · ${TIME_SLOT_HINTS[slot]}`}
                      compact
                    />
                  ))}
                </div>
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs font-semibold tracking-wide text-ink-soft">
                Uy tín tối thiểu
              </p>
              <div className="flex flex-wrap gap-1.5">
                <FilterPill
                  active={filters.reputationMin === 0}
                  onClick={() => setFilters({ ...filters, reputationMin: 0 })}
                  label="Bất kỳ"
                  compact
                />
                {REPUTATION_STEPS.map((step) => (
                  <FilterPill
                    key={step}
                    active={filters.reputationMin === step}
                    onClick={() => setFilters({ ...filters, reputationMin: step })}
                    label={`${step.toFixed(1)} sao trở lên`}
                    compact
                  />
                ))}
              </div>
              <p className="mt-1.5 text-[11px] text-ink-soft">
                Đội chưa ai đánh giá tính là 0 sao nên sẽ bị lọc ra.
              </p>
            </div>

            <SortSelect
              value={filters.sort}
              onChange={(sort) => setFilters({ ...filters, sort })}
            />
          </div>
        </section>

        {isLoading && <p className="text-sm text-ink-soft">Đang tìm trận đấu...</p>}

        {isError && (
          <p className="border border-rust bg-rust/5 px-3 py-2 text-sm font-medium text-rust">
            Không tải được danh sách.
          </p>
        )}

        {data && items.length === 0 && (
          <article className="border border-dashed border-ink/25 bg-white p-10 text-center">
            <p className="font-display text-2xl font-black tracking-tight">
              Chưa có đội nào tìm trận phù hợp.
            </p>
            <p className="mt-2 text-sm text-ink-soft">
              Đến đội của bạn để đăng lời mời tìm đối thủ.
            </p>
          </article>
        )}

        {items.length > 0 && (
          <>
            <ul className="grid gap-4 md:grid-cols-2">
              {items.map((m) => (
                <MatchCard key={m.id} req={m} />
              ))}
            </ul>
            <LoadMore
              hasMore={Boolean(hasNextPage)}
              loading={isFetchingNextPage}
              onClick={() => void fetchNextPage()}
            />
          </>
        )}
      </main>
    </div>
  );
}

function FilterPill({
  active,
  onClick,
  label,
  title,
  compact = false,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  title?: string;
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`inline-flex items-center border font-semibold transition ${
        compact ? 'px-2.5 py-1 text-xs' : 'px-3.5 py-1.5 text-sm'
      } ${
        active ? 'border-ink bg-ink text-paper' : 'border-ink/15 bg-white text-ink hover:border-ink'
      }`}
    >
      {label}
    </button>
  );
}

function MatchCard({ req }: { req: MatchRequestSummary }) {
  const { sportOf } = useSports();
  const t = sportOf(req.sport);
  return (
    <li>
      <Link
        to={`/match-requests/${req.id}`}
        className="group block h-full border border-ink/12 bg-white p-6 transition hover:border-ink hover:shadow-[6px_6px_0_rgba(15,17,21,0.08)]"
      >
        <header className="flex items-start gap-3">
          <span
            className="flex size-12 shrink-0 items-center justify-center text-2xl"
            style={{ backgroundColor: t.primary, color: '#fff' }}
            aria-hidden
          >
            <SportIcon sport={t.slug} className="size-[1em]" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-lg font-black tracking-tight">
              {req.team.name}
            </p>
            <p className="mt-0.5 text-xs text-ink-soft">
              {t.nameVi}
              {req.region ? ` · ${req.region}` : ''}
              {req.preferredTime
                ? ` · ${new Date(req.preferredTime).toLocaleString('vi-VN', {
                    weekday: 'short',
                    day: '2-digit',
                    month: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}`
                : ''}
            </p>
          </div>
          {req.viewerChallenge && (
            <span className="border border-primary bg-primary/10 px-2 py-0.5 text-[11px] font-bold tracking-wide text-primary-dark">
              Đã thách
            </span>
          )}
        </header>

        <p className="mt-4 line-clamp-3 text-sm leading-relaxed text-ink-soft">{req.description}</p>

        <div className="mt-4 flex flex-wrap gap-2 border-t border-ink/10 pt-3">
          {req.skillLevelMin && <Tag>≥ {SKILL_LEVEL_LABELS[req.skillLevelMin]}</Tag>}
          {req.timeSlot && <Tag>Buổi {TIME_SLOT_LABELS[req.timeSlot].toLowerCase()}</Tag>}
          {req.venueName && <Tag>Sân · {req.venueName}</Tag>}
          <Tag>{req.challengeCount} thách đấu</Tag>
          {req.status !== 'open' && (
            <span className="border border-rust bg-rust/5 px-2 py-0.5 text-[11px] font-bold tracking-wide text-rust">
              {req.status === 'matched' ? 'Đã ghép' : 'Đã đóng'}
            </span>
          )}
        </div>
      </Link>
    </li>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex border border-ink/15 bg-paper-2/40 px-2 py-0.5 text-[11px] font-semibold text-ink-soft">
      {children}
    </span>
  );
}
