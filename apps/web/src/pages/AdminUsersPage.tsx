import {
  TEAM_ROLE_LABELS,
  USER_ROLES,
  type AdminUserItem,
  type AdminUserListResponse,
  type UserRole,
} from '@sfa/shared';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { AdminShell, FilterPills } from '@/components/AdminShell';
import { Avatar } from '@/components/Avatar';
import { LoadMore } from '@/components/LoadMore';
import { api, apiMessage } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';

const ROLE_LABELS: Record<UserRole, string> = {
  user: 'Người chơi',
  business: 'Doanh nghiệp',
  admin: 'Quản trị',
};

type StatusFilter = 'all' | 'active' | 'disabled';

/** FR-010.2 (danh sách + sửa + xoá) và FR-010.7 (khoá / mở khoá). */
export function AdminUsersPage() {
  const queryClient = useQueryClient();
  const myId = useAuthStore((s) => s.user?.id);
  const [search, setSearch] = useState('');
  const [role, setRole] = useState<UserRole | 'all'>('all');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [error, setError] = useState<string | null>(null);

  const queryString = (() => {
    const p = new URLSearchParams();
    if (search.trim()) p.set('q', search.trim());
    if (role !== 'all') p.set('role', role);
    p.set('status', status);
    p.set('limit', '20');
    return p.toString();
  })();

  const { data, isLoading, isError, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteQuery({
      queryKey: ['admin', 'users', queryString],
      initialPageParam: undefined as string | undefined,
      queryFn: async ({ pageParam }) => {
        const qs = pageParam ? `${queryString}&cursor=${pageParam}` : queryString;
        const { data } = await api.get<AdminUserListResponse>(`/admin/users?${qs}`);
        return data;
      },
      getNextPageParam: (last) => last.nextCursor ?? undefined,
    });

  const items = data?.pages.flatMap((p) => p.items) ?? [];

  /** Mọi thao tác đều đổi cùng một danh sách, nên dùng chung một lần làm mới. */
  const refresh = () => {
    setError(null);
    void queryClient.invalidateQueries({ queryKey: ['admin'] });
  };

  const changeRole = useMutation({
    mutationFn: async ({ id, role }: { id: string; role: UserRole }) => {
      await api.patch(`/admin/users/${id}`, { role });
    },
    onSuccess: refresh,
    onError: (err) => setError(apiMessage(err, 'Không đổi được vai trò')),
  });

  const toggleDisabled = useMutation({
    mutationFn: async ({ id, disabled }: { id: string; disabled: boolean }) => {
      await api.post(`/admin/users/${id}/${disabled ? 'enable' : 'disable'}`);
    },
    onSuccess: refresh,
    onError: (err) => setError(apiMessage(err, 'Không đổi được trạng thái tài khoản')),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/admin/users/${id}`);
    },
    onSuccess: refresh,
    onError: (err) => setError(apiMessage(err, 'Không xoá được tài khoản')),
  });

  const busy = changeRole.isPending || toggleDisabled.isPending || remove.isPending;

  return (
    <AdminShell
      title="Người dùng"
      subtitle="Khoá tài khoản gần như luôn đúng hơn xoá: xoá là mất sạch bài đăng, đánh giá và lịch sử trận của người đó."
    >
      <section className="mb-8 space-y-4 border border-ink/12 bg-white p-5">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Tìm theo email hoặc tên hiển thị..."
          className="input"
          maxLength={100}
        />
        <div className="flex flex-wrap gap-x-8 gap-y-3">
          <div>
            <p className="mb-2 text-xs font-semibold tracking-wide text-ink-soft">Vai trò</p>
            <FilterPills
              value={role}
              onChange={setRole}
              options={[
                { value: 'all' as const, label: 'Tất cả' },
                ...USER_ROLES.map((r) => ({ value: r, label: ROLE_LABELS[r] })),
              ]}
            />
          </div>
          <div>
            <p className="mb-2 text-xs font-semibold tracking-wide text-ink-soft">Trạng thái</p>
            <FilterPills
              value={status}
              onChange={setStatus}
              options={[
                { value: 'all', label: 'Tất cả' },
                { value: 'active', label: 'Đang hoạt động' },
                { value: 'disabled', label: 'Đang bị khoá' },
              ]}
            />
          </div>
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
          Không tải được danh sách người dùng.
        </p>
      )}

      {data && items.length === 0 && (
        <p className="border border-dashed border-ink/25 bg-white p-10 text-center text-sm text-ink-soft">
          Không có tài khoản nào khớp bộ lọc.
        </p>
      )}

      {items.length > 0 && (
        <>
          <ul className="divide-y divide-ink/10 border-y border-ink/10">
            {items.map((u) => (
              <UserRow
                key={u.id}
                user={u}
                isSelf={u.id === myId}
                busy={busy}
                onRole={(role) => {
                  setError(null);
                  changeRole.mutate({ id: u.id, role });
                }}
                onToggle={() => {
                  setError(null);
                  toggleDisabled.mutate({ id: u.id, disabled: Boolean(u.disabledAt) });
                }}
                onDelete={() => {
                  if (!window.confirm(`Xoá vĩnh viễn tài khoản ${u.email}?`)) return;
                  setError(null);
                  remove.mutate(u.id);
                }}
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
    </AdminShell>
  );
}

function UserRow({
  user,
  isSelf,
  busy,
  onRole,
  onToggle,
  onDelete,
}: {
  user: AdminUserItem;
  isSelf: boolean;
  busy: boolean;
  onRole: (role: UserRole) => void;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const disabled = Boolean(user.disabledAt);
  const meta = [
    user.region,
    `Uy tín ${user.reputation.toFixed(1)}`,
    user.teamCount > 0 ? `${user.teamCount} đội` : null,
    user.onboardedAt ? null : 'Chưa onboard',
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <li className={`flex flex-wrap items-center gap-4 py-4 ${disabled ? 'opacity-60' : ''}`}>
      <Avatar name={user.displayName} src={user.avatarUrl} size="sm" />

      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-2 truncate font-display text-base font-black tracking-tight">
          {user.displayName}
          {isSelf && (
            <span className="text-[11px] font-semibold tracking-wide text-primary-dark">· bạn</span>
          )}
          {disabled && (
            <span className="border border-rust px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-rust">
              ĐÃ KHOÁ
            </span>
          )}
        </p>
        <p className="mt-0.5 truncate text-xs text-ink-soft">{user.email}</p>
        {meta && <p className="mt-0.5 truncate text-xs text-ink-soft/70">{meta}</p>}
        {user.captainOf.length > 0 && (
          <p className="mt-0.5 truncate text-xs text-ink-soft/70">
            {TEAM_ROLE_LABELS.captain} · {user.captainOf.join(', ')}
          </p>
        )}
      </div>

      {isSelf ? (
        <p className="text-xs text-ink-soft/70">Không tự thao tác lên chính mình</p>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={user.role}
            onChange={(e) => onRole(e.target.value as UserRole)}
            disabled={busy}
            className="border border-ink/15 bg-white px-2 py-1.5 text-xs font-semibold text-ink disabled:opacity-50"
          >
            {USER_ROLES.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r]}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={onToggle}
            disabled={busy}
            className="border border-ink/25 px-3 py-1.5 text-xs font-semibold transition hover:border-ink disabled:opacity-50"
          >
            {disabled ? 'Mở khoá' : 'Khoá'}
          </button>

          <button
            type="button"
            onClick={onDelete}
            disabled={busy}
            className="border border-rust px-3 py-1.5 text-xs font-semibold text-rust transition hover:bg-rust/5 disabled:opacity-50"
          >
            Xoá
          </button>
        </div>
      )}
    </li>
  );
}
