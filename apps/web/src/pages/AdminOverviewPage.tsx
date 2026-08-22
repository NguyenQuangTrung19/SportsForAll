import type { AdminStats } from '@sfa/shared';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { AdminShell } from '@/components/AdminShell';
import { api } from '@/lib/api';

/** FR-010.1 — số liệu tổng quan toàn hệ thống. */
export function AdminOverviewPage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: async () => {
      const { data } = await api.get<AdminStats>('/admin/stats');
      return data;
    },
  });

  return (
    <AdminShell
      title="Tổng quan"
      subtitle="Số liệu đếm trực tiếp từ CSDL mỗi lần mở trang — không có bộ nhớ đệm nào ở giữa."
    >
      {isLoading && <p className="text-sm text-ink-soft">Đang tải số liệu...</p>}

      {isError && (
        <p className="border border-rust bg-rust/5 px-3 py-2 text-sm font-medium text-rust">
          Không tải được số liệu.
        </p>
      )}

      {data && (
        <>
          {data.reportsPending > 0 && (
            <Link
              to="/admin/reports"
              className="mb-8 flex items-center gap-3 border border-rust bg-rust/[0.04] p-5 transition hover:bg-rust/[0.08]"
            >
              <span aria-hidden className="size-2 shrink-0 bg-rust" />
              <p className="flex-1 text-[15px] font-bold text-rust">
                {data.reportsPending} báo cáo đang chờ xử lý
              </p>
              <span className="text-[13px] font-bold text-rust">Xem ngay →</span>
            </Link>
          )}

          <section>
            <h2 className="border-b-2 border-ink pb-2.5 font-display text-2xl font-black tracking-tight">
              Người dùng
            </h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <Stat n={data.users} label="Tài khoản" />
              <Stat n={data.usersNewLast7Days} label="Mới trong 7 ngày" />
              <Stat n={data.usersDisabled} label="Đang bị khoá" accent={data.usersDisabled > 0} />
            </div>
          </section>

          <section className="mt-10">
            <h2 className="border-b-2 border-ink pb-2.5 font-display text-2xl font-black tracking-tight">
              Đội & trận
            </h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <Stat n={data.teams} label="Đội" />
              <Stat n={data.matchesScheduled} label="Trận đã chốt lịch" />
              <Stat n={data.matchesCompleted} label="Trận đã đá xong" />
            </div>
          </section>

          <section className="mt-10">
            <h2 className="border-b-2 border-ink pb-2.5 font-display text-2xl font-black tracking-tight">
              Bài đăng đang mở
            </h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <Stat n={data.recruitmentPostsOpen} label="Tin tuyển thành viên" />
              <Stat n={data.matchRequestsOpen} label="Tin tìm đối thủ" />
              <Stat n={data.lookingForPostsOpen} label="Bài tìm đội" />
            </div>
          </section>

          <section className="mt-10">
            <h2 className="border-b-2 border-ink pb-2.5 font-display text-2xl font-black tracking-tight">
              Sân bãi
            </h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <Stat n={data.venuesActive} label="Sân đang hoạt động" />
              <Stat
                n={data.venuesSuspended}
                label="Sân bị đình chỉ"
                accent={data.venuesSuspended > 0}
              />
              <Stat n={data.bookingsPending} label="Đơn đặt chờ duyệt" />
            </div>
          </section>

          <section className="mt-10">
            <h2 className="border-b-2 border-ink pb-2.5 font-display text-2xl font-black tracking-tight">
              Nội dung
            </h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <Stat n={data.sportsActive} label="Môn đang bật" />
              <Stat n={data.reportsPending} label="Báo cáo chờ" accent={data.reportsPending > 0} />
            </div>
          </section>
        </>
      )}
    </AdminShell>
  );
}

function Stat({ n, label, accent = false }: { n: number; label: string; accent?: boolean }) {
  return (
    <article className="border border-ink/12 bg-white p-5">
      <p className={`poster-num text-4xl ${accent ? 'text-rust' : 'text-primary-dark'}`}>
        {String(n).padStart(2, '0')}
      </p>
      <p className="mt-1.5 text-xs font-bold tracking-wide text-ink-soft">{label}</p>
    </article>
  );
}
