import {
  SKILL_LEVELS,
  SKILL_LEVEL_LABELS,
  type CreateLookingForTeamInput,
  type ListSort,
  type LookingForTeamListResponse,
  type LookingForTeamPostSummary,
  type SkillLevel,
  type SportSlug,
  type TeamSummary,
} from '@sfa/shared';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Avatar } from '@/components/Avatar';
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
  skillLevel: SkillLevel | 'any';
  sort: ListSort;
}

/** Bài "Tìm đội" của cá nhân — chiều ngược lại với đội tuyển người (FR-006.7, FR-004.3). */
export function LookingForTeamPage() {
  const { sports, sportOf } = useSports();
  const currentSport = useSportStore((s) => s.current);
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<Filters>({
    sport: currentSport,
    region: '',
    skillLevel: 'any',
    sort: 'newest',
  });
  const [composing, setComposing] = useState(false);

  const queryString = (() => {
    const p = new URLSearchParams();
    if (filters.sport !== null) p.set('sport', filters.sport);
    if (filters.region.trim()) p.set('region', filters.region.trim());
    if (filters.skillLevel !== 'any') p.set('skillLevel', filters.skillLevel);
    p.set('sort', filters.sort);
    p.set('limit', '20');
    return p.toString();
  })();

  const { data, isLoading, isError, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteQuery({
      queryKey: ['looking-for-team', queryString],
      initialPageParam: undefined as string | undefined,
      queryFn: async ({ pageParam }) => {
        const qs = pageParam ? `${queryString}&cursor=${pageParam}` : queryString;
        const { data } = await api.get<LookingForTeamListResponse>(`/looking-for-team?${qs}`);
        return data;
      },
      getNextPageParam: (last) => last.nextCursor ?? undefined,
    });

  const items = data?.pages.flatMap((p) => p.items) ?? [];

  /** Đội mình làm captain/phó — chỉ những đội này mới mời người khác được (FR-006.8). */
  const { data: managedTeams = [] } = useQuery({
    queryKey: ['teams', 'me'],
    queryFn: async () => {
      const { data } = await api.get<{ teams: TeamSummary[] }>('/teams/me');
      return data.teams.filter((t) => t.viewerRole === 'captain' || t.viewerRole === 'co_captain');
    },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/looking-for-team/${id}`);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['looking-for-team'] });
    },
  });

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
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold tracking-wide text-ink-soft">Tìm đội</p>
            <h1 className="mt-2 font-display text-4xl font-black leading-[0.9] tracking-tight md:text-5xl">
              Người chơi đang
              <br />
              tìm đội.
            </h1>
            <div className="mt-3 h-[3px] w-32 origin-left bg-ink animate-draw-line" aria-hidden />
          </div>
          {!composing && (
            <button type="button" onClick={() => setComposing(true)} className="btn-primary">
              Đăng bài tìm đội
            </button>
          )}
        </div>

        {composing && (
          <ComposeForm
            defaultSport={filters.sport === null ? currentSport : filters.sport}
            onClose={() => setComposing(false)}
            onCreated={() => {
              setComposing(false);
              void queryClient.invalidateQueries({ queryKey: ['looking-for-team'] });
            }}
          />
        )}

        <section className="mb-8 border border-ink/12 bg-white p-5">
          <div className="mb-3 flex items-baseline justify-between">
            <p className="text-xs font-bold tracking-wide text-ink-soft">Bộ lọc</p>
            <button
              type="button"
              onClick={() =>
                setFilters({ sport: null, region: '', skillLevel: 'any', sort: 'newest' })
              }
              className="text-xs font-semibold text-ink-soft transition hover:text-ink"
            >
              Đặt lại
            </button>
          </div>

          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Pill
                active={filters.sport === null}
                onClick={() => setFilters({ ...filters, sport: null })}
                label="Tất cả"
              />
              {sports.map(({ slug }) => (
                <Pill
                  key={slug}
                  active={filters.sport === slug}
                  onClick={() => setFilters({ ...filters, sport: slug })}
                  label={sportOf(slug).nameVi}
                />
              ))}
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

              <div>
                <p className="mb-2 text-xs font-semibold tracking-wide text-ink-soft">Trình độ</p>
                <div className="flex flex-wrap gap-1.5">
                  <Pill
                    active={filters.skillLevel === 'any'}
                    onClick={() => setFilters({ ...filters, skillLevel: 'any' })}
                    label="Bất kỳ"
                    compact
                  />
                  {SKILL_LEVELS.map((lvl) => (
                    <Pill
                      key={lvl}
                      active={filters.skillLevel === lvl}
                      onClick={() => setFilters({ ...filters, skillLevel: lvl })}
                      label={SKILL_LEVEL_LABELS[lvl]}
                      compact
                    />
                  ))}
                </div>
              </div>
            </div>

            <SortSelect
              value={filters.sort}
              onChange={(sort) => setFilters({ ...filters, sort })}
            />
          </div>
        </section>

        {isLoading && <p className="text-sm text-ink-soft">Đang tải...</p>}

        {isError && (
          <p className="border border-rust bg-rust/5 px-3 py-2 text-sm font-medium text-rust">
            Không tải được danh sách.
          </p>
        )}

        {data && items.length === 0 && (
          <article className="border border-dashed border-ink/25 bg-white p-10 text-center">
            <p className="font-display text-2xl font-black tracking-tight">
              Chưa có ai đăng tìm đội.
            </p>
            <p className="mt-2 text-sm text-ink-soft">
              Bạn có thể là người đầu tiên — bấm nút đăng bài phía trên.
            </p>
          </article>
        )}

        {items.length > 0 && (
          <>
            <ul className="grid gap-4 md:grid-cols-2">
              {items.map((post) => (
                <PlayerCard
                  key={post.id}
                  post={post}
                  managedTeams={managedTeams}
                  onDelete={() => remove.mutate(post.id)}
                  deleting={remove.isPending}
                />
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

function ComposeForm({
  defaultSport,
  onClose,
  onCreated,
}: {
  defaultSport: SportSlug;
  onClose: () => void;
  onCreated: () => void;
}) {
  const { sports, sportOf } = useSports();
  const [sport, setSport] = useState<SportSlug>(defaultSport);
  const [region, setRegion] = useState('');
  const [position, setPosition] = useState('');
  const [skillLevel, setSkillLevel] = useState<SkillLevel | 'any'>('any');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);

  const create = useMutation({
    mutationFn: async (payload: CreateLookingForTeamInput) => {
      const { data } = await api.post<LookingForTeamPostSummary>('/looking-for-team', payload);
      return data;
    },
    onSuccess: onCreated,
    onError: (err: unknown) => {
      setError(
        err instanceof AxiosError
          ? ((err.response?.data as { error?: { message?: string } })?.error?.message ??
              'Không đăng được bài')
          : 'Không đăng được bài',
      );
    },
  });

  return (
    <section className="mb-8 border border-ink bg-white p-6">
      <h2 className="font-display text-xl font-black tracking-tight">Đăng bài tìm đội</h2>
      <p className="mt-1 text-sm text-ink-soft">Mỗi môn chỉ giữ một bài đang mở.</p>

      <div className="mt-5 space-y-4">
        <div>
          <p className="mb-2 text-xs font-semibold tracking-wide text-ink-soft">Môn</p>
          <div className="flex flex-wrap gap-2">
            {sports.map(({ slug }) => (
              <Pill
                key={slug}
                active={sport === slug}
                onClick={() => setSport(slug)}
                label={sportOf(slug).nameVi}
              />
            ))}
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <label className="block">
            <span className="mb-2 block text-xs font-semibold tracking-wide text-ink-soft">
              Khu vực
            </span>
            <input
              type="text"
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              className="input"
              maxLength={100}
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-xs font-semibold tracking-wide text-ink-soft">
              Vị trí muốn chơi
            </span>
            <input
              type="text"
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              className="input"
              maxLength={50}
            />
          </label>
        </div>

        <div>
          <p className="mb-2 text-xs font-semibold tracking-wide text-ink-soft">Trình độ</p>
          <div className="flex flex-wrap gap-1.5">
            <Pill
              active={skillLevel === 'any'}
              onClick={() => setSkillLevel('any')}
              label="Không nêu"
              compact
            />
            {SKILL_LEVELS.map((lvl) => (
              <Pill
                key={lvl}
                active={skillLevel === lvl}
                onClick={() => setSkillLevel(lvl)}
                label={SKILL_LEVEL_LABELS[lvl]}
                compact
              />
            ))}
          </div>
        </div>

        <label className="block">
          <span className="mb-2 block text-xs font-semibold tracking-wide text-ink-soft">
            Giới thiệu
          </span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            maxLength={1000}
            placeholder="Bạn chơi thế nào, rảnh khi nào, ở khu vực nào..."
            className="input resize-none"
          />
          <span className="mt-1 block text-right text-xs text-ink-soft">
            {description.length}/1000 · tối thiểu 10
          </span>
        </label>

        {error && (
          <p className="border border-rust bg-rust/5 px-3 py-2 text-sm font-medium text-rust">
            {error}
          </p>
        )}

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={create.isPending}
            className="text-sm font-semibold text-ink-soft transition hover:text-ink disabled:opacity-50"
          >
            Huỷ
          </button>
          <button
            type="button"
            disabled={create.isPending || description.trim().length < 10}
            onClick={() => {
              setError(null);
              create.mutate({
                sport,
                region: region.trim() || undefined,
                position: position.trim() || undefined,
                skillLevel: skillLevel === 'any' ? undefined : skillLevel,
                description: description.trim(),
              });
            }}
            className="btn-primary"
          >
            {create.isPending ? 'Đang đăng...' : 'Đăng bài'}
          </button>
        </div>
      </div>
    </section>
  );
}

function PlayerCard({
  post,
  managedTeams,
  onDelete,
  deleting,
}: {
  post: LookingForTeamPostSummary;
  managedTeams: TeamSummary[];
  onDelete: () => void;
  deleting: boolean;
}) {
  const { sportOf } = useSports();
  const theme = sportOf(post.sport);
  return (
    <li className="border border-ink/12 bg-white p-5">
      <div className="flex items-start gap-4">
        <Avatar name={post.author.displayName} src={post.author.avatarUrl} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-lg font-black tracking-tight">
            {post.author.displayName}
          </p>
          <p className="mt-0.5 text-xs text-ink-soft">
            <SportIcon sport={theme.slug} className="size-[1em]" /> {theme.nameVi}
            {post.position && ` · ${post.position}`}
            {post.skillLevel && ` · ${SKILL_LEVEL_LABELS[post.skillLevel]}`}
          </p>
          {post.region && <p className="mt-0.5 text-xs text-ink-soft/70">{post.region}</p>}
        </div>
      </div>

      <p className="mt-4 line-clamp-3 text-sm leading-relaxed text-ink-soft">{post.description}</p>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-ink/10 pt-3">
        <span className="text-[11px] text-ink-soft/70">
          {new Date(post.createdAt).toLocaleDateString('vi-VN')}
        </span>
        {post.viewerIsAuthor ? (
          <button
            type="button"
            onClick={onDelete}
            disabled={deleting}
            className="text-xs font-semibold text-ink-soft transition hover:text-rust disabled:opacity-50"
          >
            Gỡ bài
          </button>
        ) : (
          <InviteControl post={post} teams={managedTeams.filter((t) => t.sport === post.sport)} />
        )}
      </div>
    </li>
  );
}

/**
 * Mời tác giả bài "Tìm đội" vào một đội mình quản lý (FR-006.8).
 *
 * Chỉ liệt kê đội cùng môn với bài — mời người chơi cầu lông vào đội bóng đá là
 * nhiễu chứ không phải tính năng. Không có đội nào hợp thì không hiện gì cả.
 */
function InviteControl({ post, teams }: { post: LookingForTeamPostSummary; teams: TeamSummary[] }) {
  const [open, setOpen] = useState(false);
  const [teamId, setTeamId] = useState(teams[0]?.id ?? '');
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);

  const invite = useMutation({
    mutationFn: async () => {
      await api.post(`/teams/${teamId}/invites`, {
        userId: post.author.id,
        message: message.trim() || undefined,
      });
    },
    onSuccess: () => setOpen(false),
    onError: (err: unknown) => {
      setError(
        err instanceof AxiosError
          ? ((err.response?.data as { error?: { message?: string } })?.error?.message ??
              'Không gửi được lời mời')
          : 'Không gửi được lời mời',
      );
    },
  });

  if (teams.length === 0) return null;

  if (invite.isSuccess) {
    return <span className="text-xs font-semibold text-primary-dark">Đã gửi lời mời</span>;
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs font-bold text-ink transition hover:underline"
      >
        Mời vào đội →
      </button>
    );
  }

  return (
    <div className="w-full space-y-2 pt-1">
      {teams.length > 1 && (
        <select
          value={teamId}
          onChange={(e) => setTeamId(e.target.value)}
          className="input !py-2 text-sm"
        >
          {teams.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      )}
      <input
        type="text"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder={`Lời nhắn cho ${post.author.displayName} (không bắt buộc)`}
        maxLength={500}
        className="input !py-2 text-sm"
      />
      {error && <p className="text-xs font-medium text-rust">{error}</p>}
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={() => setOpen(false)}
          disabled={invite.isPending}
          className="text-xs font-semibold text-ink-soft transition hover:text-ink disabled:opacity-50"
        >
          Huỷ
        </button>
        <button
          type="button"
          onClick={() => {
            setError(null);
            invite.mutate();
          }}
          disabled={invite.isPending || !teamId}
          className="bg-ink px-4 py-2 text-xs font-bold text-paper transition hover:bg-ink/92 disabled:opacity-50"
        >
          {invite.isPending ? 'Đang gửi...' : 'Gửi lời mời'}
        </button>
      </div>
    </div>
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
