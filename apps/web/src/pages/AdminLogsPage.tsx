import { ADMIN_ACTION_LABELS, type AdminLogListResponse } from '@sfa/shared';
import { useInfiniteQuery } from '@tanstack/react-query';
import { AdminShell } from '@/components/AdminShell';
import { LoadMore } from '@/components/LoadMore';
import { api } from '@/lib/api';

/**
 * FR-010.8 — nhật ký hoạt động quản trị.
 *
 * Chỉ ghi thao tác làm đổi dữ liệu, không ghi lượt xem: log mọi lượt đọc thì
 * nhật ký tự nó thành một feed rác không ai mở.
 */
export function AdminLogsPage() {
  const { data, isLoading, isError, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteQuery({
      queryKey: ['admin', 'logs'],
      initialPageParam: undefined as string | undefined,
      queryFn: async ({ pageParam }) => {
        const qs = pageParam ? `limit=30&cursor=${pageParam}` : 'limit=30';
        const { data } = await api.get<AdminLogListResponse>(`/admin/logs?${qs}`);
        return data;
      },
      getNextPageParam: (last) => last.nextCursor ?? undefined,
    });

  const items = data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <AdminShell
      title="Nhật ký"
      subtitle="Tên quản trị viên được chụp lại vào từng dòng, nên xoá tài khoản admin cũng không xoá được dấu vết họ đã làm gì."
    >
      {isLoading && <p className="text-sm text-ink-soft">Đang tải...</p>}
      {isError && (
        <p className="border border-rust bg-rust/5 px-3 py-2 text-sm font-medium text-rust">
          Không tải được nhật ký.
        </p>
      )}

      {data && items.length === 0 && (
        <p className="border border-dashed border-ink/25 bg-white p-10 text-center text-sm text-ink-soft">
          Chưa có thao tác quản trị nào được ghi.
        </p>
      )}

      {items.length > 0 && (
        <>
          <div className="overflow-x-auto border border-ink/12 bg-white">
            <table className="w-full min-w-[42rem] text-left text-sm">
              <thead className="border-b border-ink/15 bg-paper-2/40">
                <tr className="text-xs font-bold tracking-wide text-ink-soft">
                  <th className="px-4 py-3">Thời điểm</th>
                  <th className="px-4 py-3">Quản trị viên</th>
                  <th className="px-4 py-3">Thao tác</th>
                  <th className="px-4 py-3">Đối tượng</th>
                  <th className="px-4 py-3">Chi tiết</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink/10">
                {items.map((a) => (
                  <tr key={a.id}>
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-ink-soft">
                      {new Date(a.createdAt).toLocaleString('vi-VN')}
                    </td>
                    <td className="px-4 py-3 font-semibold">{a.adminName}</td>
                    <td className="px-4 py-3">{ADMIN_ACTION_LABELS[a.action] ?? a.action}</td>
                    <td className="px-4 py-3 text-xs text-ink-soft">
                      {a.targetType}
                      <span className="block font-mono text-[11px] text-ink-soft/60">
                        {a.targetId}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-ink-soft">{a.detail ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
