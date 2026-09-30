import {
  REPORT_REASON_LABELS,
  REPORT_STATUS_LABELS,
  type AdminReportItem,
  type AdminReportListResponse,
} from '@sfa/shared';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AdminShell, FilterPills } from '@/components/AdminShell';
import { LoadMore } from '@/components/LoadMore';
import { SportIcon } from '@/components/SportIcon';
import { api, apiMessage } from '@/lib/api';
import { useSports } from '@/lib/use-sports';

type StatusFilter = 'pending' | 'reviewed' | 'dismissed' | 'all';

/** FR-010.6 — xử lý báo cáo / khiếu nại người dùng gửi lên từ FR-005.11. */
export function AdminReportsPage() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<StatusFilter>('pending');
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<Record<string, string>>({});

  const queryString = `status=${status}&limit=20`;

  const { data, isLoading, isError, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteQuery({
      queryKey: ['admin', 'reports', queryString],
      initialPageParam: undefined as string | undefined,
      queryFn: async ({ pageParam }) => {
        const qs = pageParam ? `${queryString}&cursor=${pageParam}` : queryString;
        const { data } = await api.get<AdminReportListResponse>(`/admin/reports?${qs}`);
        return data;
      },
      getNextPageParam: (last) => last.nextCursor ?? undefined,
    });

  const items = data?.pages.flatMap((p) => p.items) ?? [];

  const resolve = useMutation({
    mutationFn: async ({ id, decision }: { id: string; decision: 'reviewed' | 'dismissed' }) => {
      await api.post(`/admin/reports/${id}/resolve`, {
        status: decision,
        note: note[id]?.trim() || undefined,
      });
    },
    onSuccess: () => {
      setError(null);
      void queryClient.invalidateQueries({ queryKey: ['admin'] });
    },
    onError: (err) => setError(apiMessage(err, 'Không xử lý được báo cáo')),
  });

  return (
    <AdminShell
      title="Báo cáo"
      subtitle="Kết luận được ghi vào nhật ký quản trị kèm ghi chú của bạn, và không sửa lại được — mỗi báo cáo chỉ kết luận một lần."
    >
      <section className="mb-8 border border-ink/12 bg-white p-5">
        <p className="mb-2 text-xs font-semibold tracking-wide text-ink-soft">Trạng thái</p>
        <FilterPills
          value={status}
          onChange={setStatus}
          options={[
            { value: 'pending', label: REPORT_STATUS_LABELS.pending },
            { value: 'reviewed', label: REPORT_STATUS_LABELS.reviewed },
            { value: 'dismissed', label: REPORT_STATUS_LABELS.dismissed },
            { value: 'all', label: 'Tất cả' },
          ]}
        />
      </section>

      {error && (
        <p className="mb-6 border border-rust bg-rust/5 px-3 py-2 text-sm font-medium text-rust">
          {error}
        </p>
      )}

      {isLoading && <p className="text-sm text-ink-soft">Đang tải...</p>}
      {isError && (
        <p className="border border-rust bg-rust/5 px-3 py-2 text-sm font-medium text-rust">
          Không tải được danh sách báo cáo.
        </p>
      )}

      {data && items.length === 0 && (
        <p className="border border-dashed border-ink/25 bg-white p-10 text-center text-sm text-ink-soft">
          {status === 'pending' ? 'Không còn báo cáo nào chờ xử lý.' : 'Không có báo cáo nào.'}
        </p>
      )}

      {items.length > 0 && (
        <>
          <ul className="space-y-4">
            {items.map((r) => (
              <ReportCard
                key={r.id}
                report={r}
                note={note[r.id] ?? ''}
                onNote={(v) => setNote((prev) => ({ ...prev, [r.id]: v }))}
                onResolve={(decision) => {
                  setError(null);
                  resolve.mutate({ id: r.id, decision });
                }}
                pending={resolve.isPending}
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

function ReportCard({
  report,
  note,
  onNote,
  onResolve,
  pending,
}: {
  report: AdminReportItem;
  note: string;
  onNote: (v: string) => void;
  onResolve: (decision: 'reviewed' | 'dismissed') => void;
  pending: boolean;
}) {
  const { sportOf } = useSports();
  const theme = sportOf(report.reportedTeam.sport);
  const open = report.status === 'pending';

  return (
    <li className="relative border border-ink/12 bg-white p-5">
      {open && <span aria-hidden className="absolute inset-y-0 left-0 w-[3px] bg-rust" />}

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="font-display text-lg font-black tracking-tight">
            {REPORT_REASON_LABELS[report.reason]}
          </p>
          <p className="mt-0.5 text-xs text-ink-soft">
            <SportIcon sport={theme.slug} className="size-[1em]" /> Đội bị báo cáo:{' '}
            <Link
              to={`/teams/${report.reportedTeam.id}`}
              className="font-semibold text-ink hover:underline"
            >
              {report.reportedTeam.name}
            </Link>{' '}
            · Uy tín {report.reportedTeam.reputation.toFixed(1)}
          </p>
          <p className="mt-0.5 text-xs text-ink-soft/70">
            Người báo cáo: {report.reporter.displayName} ·{' '}
            {new Date(report.createdAt).toLocaleDateString('vi-VN')}
            {report.matchId && ' · có gắn trận'}
          </p>
        </div>
        <span
          className={`shrink-0 border px-2 py-1 text-[11px] font-bold tracking-wide ${
            open ? 'border-rust text-rust' : 'border-ink/20 bg-paper-2/40 text-ink-soft'
          }`}
        >
          {REPORT_STATUS_LABELS[report.status].toUpperCase()}
        </span>
      </div>

      {report.detail && (
        <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-ink-soft">
          {report.detail}
        </p>
      )}

      {open && (
        <div className="mt-4 space-y-3 border-t border-ink/10 pt-4">
          <input
            type="text"
            value={note}
            onChange={(e) => onNote(e.target.value)}
            placeholder="Ghi chú kết luận (không bắt buộc, sẽ vào nhật ký)"
            maxLength={500}
            className="input !py-2 text-sm"
          />
          <div className="flex flex-wrap justify-end gap-2">
            <button
              type="button"
              onClick={() => onResolve('dismissed')}
              disabled={pending}
              className="border border-ink/25 px-4 py-2 text-xs font-semibold transition hover:border-ink disabled:opacity-50"
            >
              Bỏ qua
            </button>
            <button
              type="button"
              onClick={() => onResolve('reviewed')}
              disabled={pending}
              className="bg-ink px-4 py-2 text-xs font-bold text-paper transition hover:bg-ink/92 disabled:opacity-50"
            >
              Đánh dấu đã xử lý
            </button>
          </div>
        </div>
      )}

      {!open && report.resolvedAt && (
        <p className="mt-3 border-t border-ink/10 pt-3 text-xs text-ink-soft/70">
          Kết luận ngày {new Date(report.resolvedAt).toLocaleDateString('vi-VN')} — xem chi tiết ở{' '}
          <Link to="/admin/logs" className="font-semibold text-ink hover:underline">
            nhật ký
          </Link>
          .
        </p>
      )}
    </li>
  );
}
