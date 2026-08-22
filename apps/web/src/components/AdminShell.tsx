import { Link, NavLink } from 'react-router-dom';

const TABS = [
  { to: '/admin', label: 'Tổng quan', end: true },
  { to: '/admin/users', label: 'Người dùng' },
  { to: '/admin/posts', label: 'Bài đăng' },
  { to: '/admin/reports', label: 'Báo cáo' },
  { to: '/admin/venues', label: 'Sân bãi' },
  { to: '/admin/landing', label: 'Môn & ảnh nền' },
  { to: '/admin/logs', label: 'Nhật ký' },
];

/**
 * Khung chung cho mọi trang quản trị: header, thanh tab, tiêu đề.
 *
 * Tách ra vì sáu trang admin chỉ khác nhau phần thân — lặp lại header và tab ở
 * từng trang là sáu chỗ phải sửa mỗi lần thêm một mục quản trị mới.
 */
export function AdminShell({
  title,
  subtitle,
  actions,
  children,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
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

      <nav className="border-b border-ink/10 bg-paper-2/40">
        <div className="mx-auto flex max-w-6xl flex-wrap gap-1 px-6 py-2">
          {TABS.map((t) => (
            <NavLink
              key={t.to}
              to={t.to}
              end={t.end}
              className={({ isActive }) =>
                `border px-3 py-1.5 text-xs font-bold tracking-wide transition ${
                  isActive
                    ? 'border-ink bg-ink text-paper'
                    : 'border-transparent text-ink-soft hover:border-ink/20 hover:text-ink'
                }`
              }
            >
              {t.label}
            </NavLink>
          ))}
        </div>
      </nav>

      <main className="mx-auto max-w-6xl px-6 py-10 md:py-14">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold tracking-wide text-ink-soft">Quản trị</p>
            <h1 className="mt-2 font-display text-4xl font-black leading-[0.9] tracking-tight md:text-5xl">
              {title}
            </h1>
            <div className="mt-3 h-[3px] w-24 origin-left bg-ink animate-draw-line" aria-hidden />
            {subtitle && <p className="mt-3 max-w-2xl text-sm text-ink-soft">{subtitle}</p>}
          </div>
          {actions}
        </div>
        {children}
      </main>
    </div>
  );
}

/** Dải nút lọc dùng lại ở cả bốn danh sách quản trị. */
export function FilterPills<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`inline-flex items-center border px-3 py-1.5 text-xs font-semibold transition ${
            value === o.value
              ? 'border-ink bg-ink text-paper'
              : 'border-ink/15 bg-white text-ink hover:border-ink'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
