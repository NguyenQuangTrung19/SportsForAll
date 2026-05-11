import {
  SKILL_LEVELS,
  SKILL_LEVEL_LABELS,
  SPORTS,
  SPORT_THEMES,
  type MatchRequestListResponse,
  type MatchRequestSummary,
  type SkillLevel,
  type SportSlug,
} from '@sfa/shared';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '@/lib/api';
import { useSportStore } from '@/stores/sport-store';

interface Filters {
  sport: SportSlug | 'all';
  region: string;
  skillLevelMin: SkillLevel | 'any';
}

export function FindOpponentsPage() {
  const currentSport = useSportStore((s) => s.current);
  const [filters, setFilters] = useState<Filters>({
    sport: currentSport,
    region: '',
    skillLevelMin: 'any',
  });

  const queryString = (() => {
    const p = new URLSearchParams();
    if (filters.sport !== 'all') p.set('sport', filters.sport);
    if (filters.region.trim()) p.set('region', filters.region.trim());
    if (filters.skillLevelMin !== 'any') p.set('skillLevelMin', filters.skillLevelMin);
    p.set('limit', '20');
    return p.toString();
  })();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['matches', 'requests', queryString],
    queryFn: async () => {
      const { data } = await api.get<MatchRequestListResponse>(
        `/matches/requests?${queryString}`,
      );
      return data;
    },
  });

  return (
    <div className="min-h-screen bg-paper text-ink">
      <header className="border-b border-ink/10">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
          <Link
            to="/dashboard"
            className="font-display text-2xl font-black uppercase leading-none tracking-tight"
          >
            SportsForAll<span className="text-primary">.</span>
          </Link>
          <Link to="/dashboard" className="text-sm font-semibold text-ink-soft hover:text-ink">
            ← Bảng điều khiển
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10 md:py-14">
        <div className="mb-8">
          <p className="text-xs font-bold uppercase tracking-wide text-ink-soft">
            Tìm đối thủ
          </p>
          <h1 className="mt-2 font-display text-4xl font-black uppercase leading-[0.9] tracking-tight md:text-5xl">
            Các đội đang
            <br />
            tìm trận.
          </h1>
          <div className="mt-3 h-[3px] w-32 origin-left bg-ink animate-draw-line" aria-hidden />
        </div>

        <section className="mb-8 border border-ink/12 bg-white p-5">
          <div className="mb-3 flex items-baseline justify-between">
            <p className="text-xs font-bold uppercase tracking-wide text-ink-soft">Bộ lọc</p>
            <button
              type="button"
              onClick={() =>
                setFilters({ sport: 'all', region: '', skillLevelMin: 'any' })
              }
              className="text-xs font-semibold text-ink-soft transition hover:text-ink"
            >
              Đặt lại
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-soft">
                Môn
              </p>
              <div className="flex flex-wrap gap-2">
                <FilterPill
                  active={filters.sport === 'all'}
                  onClick={() => setFilters({ ...filters, sport: 'all' })}
                  label="Tất cả"
                />
                {SPORTS.map((slug) => {
                  const t = SPORT_THEMES[slug];
                  return (
                    <FilterPill
                      key={slug}
                      active={filters.sport === slug}
                      onClick={() => setFilters({ ...filters, sport: slug })}
                      label={`${t.emoji} ${t.nameVi}`}
                    />
                  );
                })}
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-ink-soft">
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

              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-soft">
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
            </div>
          </div>
        </section>

        {isLoading && <p className="text-sm text-ink-soft">Đang tìm trận đấu...</p>}

        {isError && (
          <p className="border border-rust bg-rust/5 px-3 py-2 text-sm font-medium text-rust">
            Không tải được danh sách.
          </p>
        )}

        {data && data.items.length === 0 && (
          <article className="border border-dashed border-ink/25 bg-white p-10 text-center">
            <p className="font-display text-2xl font-black uppercase tracking-tight">
              Chưa có đội nào tìm trận phù hợp.
            </p>
            <p className="mt-2 text-sm text-ink-soft">
              Đến đội của bạn để đăng lời mời tìm đối thủ.
            </p>
          </article>
        )}

        {data && data.items.length > 0 && (
          <ul className="grid gap-4 md:grid-cols-2">
            {data.items.map((m) => (
              <MatchCard key={m.id} req={m} />
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}

function FilterPill({
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
      } ${
        active
          ? 'border-ink bg-ink text-paper'
          : 'border-ink/15 bg-white text-ink hover:border-ink'
      }`}
    >
      {label}
    </button>
  );
}

function MatchCard({ req }: { req: MatchRequestSummary }) {
  const t = SPORT_THEMES[req.sport];
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
            {t.emoji}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-lg font-black uppercase tracking-tight">
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
            <span className="border border-primary bg-primary/10 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-primary">
              Đã thách
            </span>
          )}
        </header>

        <p className="mt-4 line-clamp-3 text-sm leading-relaxed text-ink-soft">
          {req.description}
        </p>

        <div className="mt-4 flex flex-wrap gap-2 border-t border-ink/10 pt-3">
          {req.skillLevelMin && <Tag>≥ {SKILL_LEVEL_LABELS[req.skillLevelMin]}</Tag>}
          {req.venueName && <Tag>Sân · {req.venueName}</Tag>}
          <Tag>{req.challengeCount} thách đấu</Tag>
          {req.status !== 'open' && (
            <span className="border border-rust bg-rust/5 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-rust">
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
