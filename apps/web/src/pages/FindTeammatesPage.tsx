import {
  SKILL_LEVELS,
  SKILL_LEVEL_LABELS,
  SPORTS,
  SPORT_THEMES,
  type RecruitmentListResponse,
  type RecruitmentPostSummary,
  type SkillLevel,
  type SportSlug,
} from '@sfa/shared';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '@/lib/api';
import { useSportStore } from '@/stores/sport-store';

interface Filters {
  sport: SportSlug | 'all';
  region: string;
  skillLevelMin: SkillLevel | 'any';
}

export function FindTeammatesPage() {
  const currentSport = useSportStore((s) => s.current);
  const [filters, setFilters] = useState<Filters>({
    sport: currentSport,
    region: '',
    skillLevelMin: 'any',
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

  const queryString = (() => {
    const p = new URLSearchParams();
    if (filters.sport !== 'all') p.set('sport', filters.sport);
    if (filters.region.trim()) p.set('region', filters.region.trim());
    if (filters.skillLevelMin !== 'any') p.set('skillLevelMin', filters.skillLevelMin);
    p.set('limit', '20');
    return p.toString();
  })();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['recruitment', 'list', queryString],
    queryFn: async () => {
      const { data } = await api.get<RecruitmentListResponse>(
        `/recruitment/posts?${queryString}`,
      );
      return data;
    },
  });

  return (
    <div className="relative min-h-screen overflow-hidden bg-night text-cream">
      <div className="mouse-spotlight pointer-events-none fixed inset-0 z-0" aria-hidden />
      <div className="grid-bg pointer-events-none fixed inset-0 z-0" aria-hidden />

      <header className="relative z-10 border-b border-cream/10 bg-night/40 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
          <Link
            to="/dashboard"
            className="font-display text-2xl font-black uppercase leading-none tracking-tight text-cream md:text-3xl"
          >
            SportsForAll<span className="text-primary">.</span>
          </Link>
          <Link
            to="/dashboard"
            className="group inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.22em] text-cream/55 transition hover:text-cream"
          >
            <span aria-hidden className="transition-transform group-hover:-translate-x-1">
              ←
            </span>
            Bảng điều khiển
          </Link>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-6xl px-6 py-10 md:py-14">
        <div className="mb-8">
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-cream/55">
            Tìm đồng đội
          </p>
          <h1 className="mt-1 font-display text-3xl font-black uppercase tracking-tight text-cream md:text-4xl">
            Các đội đang tuyển thành viên.
          </h1>
        </div>

        {/* Filters */}
        <section className="mb-8 rounded-2xl border border-cream/15 bg-cream/[0.04] p-5 backdrop-blur-md">
          <div className="mb-3 flex items-baseline justify-between">
            <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-cream/55">
              Bộ lọc
            </p>
            <button
              type="button"
              onClick={() =>
                setFilters({ sport: 'all', region: '', skillLevelMin: 'any' })
              }
              className="font-mono text-[10px] uppercase tracking-[0.22em] text-cream/55 transition hover:text-cream"
            >
              Đặt lại
            </button>
          </div>

          <div className="space-y-3">
            <div>
              <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.22em] text-cream/55">
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
                <span className="mb-2 block font-mono text-[10px] uppercase tracking-[0.22em] text-cream/55">
                  Khu vực
                </span>
                <input
                  type="text"
                  value={filters.region}
                  onChange={(e) => setFilters({ ...filters, region: e.target.value })}
                  placeholder="Hà Nội, TP. HCM..."
                  className="dark-input"
                  maxLength={100}
                />
              </label>

              <div>
                <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.22em] text-cream/55">
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

        {/* Results */}
        {isLoading && (
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-cream/55">
            Đang tìm bài đăng...
          </p>
        )}

        {isError && (
          <p className="rounded-xl border border-ember/35 bg-ember/10 p-3 font-mono text-[11px] uppercase tracking-wider text-ember">
            Không tải được bài đăng.
          </p>
        )}

        {data && data.items.length === 0 && (
          <article className="rounded-3xl border border-dashed border-cream/20 bg-cream/[0.02] p-10 text-center">
            <p className="font-display text-2xl font-black uppercase tracking-tight text-cream">
              Chưa có bài tuyển phù hợp.
            </p>
            <p className="mt-2 text-sm text-cream/65">
              Thử bớt bộ lọc, hoặc đến đội của bạn để đăng bài tuyển đầu tiên.
            </p>
          </article>
        )}

        {data && data.items.length > 0 && (
          <ul className="grid gap-4 md:grid-cols-2">
            {data.items.map((post) => (
              <PostCard key={post.id} post={post} />
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
      className={`inline-flex items-center rounded-full border font-mono uppercase transition ${
        compact ? 'px-2.5 py-1 text-[10px] tracking-[0.16em]' : 'px-3.5 py-1.5 text-[11px] tracking-[0.18em]'
      } ${
        active
          ? 'border-transparent bg-primary text-night shadow-[0_10px_24px_-10px_rgb(var(--color-primary))]'
          : 'border-cream/15 bg-cream/[0.03] text-cream/75 hover:border-cream/40 hover:text-cream'
      }`}
    >
      {label}
    </button>
  );
}

function PostCard({ post }: { post: RecruitmentPostSummary }) {
  const t = SPORT_THEMES[post.sport];
  return (
    <li>
      <Link
        to={`/posts/${post.id}`}
        className="group block h-full overflow-hidden rounded-3xl border border-cream/15 bg-gradient-to-br from-cream/[0.06] to-cream/[0.02] p-6 backdrop-blur-2xl transition hover:-translate-y-1 hover:border-cream/40"
      >
        <header className="flex items-start gap-3">
          <div
            className="flex size-12 shrink-0 items-center justify-center rounded-xl text-2xl"
            style={{ background: `${t.primary}25`, border: `1px solid ${t.primary}55` }}
            aria-hidden
          >
            {t.emoji}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-lg font-black uppercase tracking-tight text-cream">
              {post.team.name}
            </p>
            <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.22em] text-cream/55">
              {t.nameVi}
              {post.region ? ` · ${post.region}` : ''}
            </p>
          </div>
          {post.viewerRequestStatus && (
            <span className="rounded-full border border-primary/40 bg-primary/15 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.22em] text-primary">
              {labelForStatus(post.viewerRequestStatus)}
            </span>
          )}
        </header>

        <p className="mt-4 line-clamp-3 text-sm leading-relaxed text-cream/75">
          {post.description}
        </p>

        <div className="mt-4 flex flex-wrap gap-2 border-t border-cream/10 pt-4 font-mono text-[10px] uppercase tracking-[0.22em] text-cream/65">
          {post.positionNeeded && (
            <Tag>Vị trí · {post.positionNeeded}</Tag>
          )}
          {post.skillLevelMin && (
            <Tag>≥ {SKILL_LEVEL_LABELS[post.skillLevelMin]}</Tag>
          )}
          <Tag>{post.requestCount} đơn</Tag>
          {post.status === 'closed' && (
            <span className="rounded-full border border-ember/35 bg-ember/10 px-2 py-0.5 text-ember">
              Đã đóng
            </span>
          )}
        </div>
      </Link>
    </li>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-cream/15 bg-cream/[0.04] px-2 py-0.5">
      {children}
    </span>
  );
}

function labelForStatus(s: string): string {
  if (s === 'pending') return 'Đã gửi';
  if (s === 'accepted') return 'Đã vào đội';
  if (s === 'rejected') return 'Bị từ chối';
  return 'Đã huỷ';
}
