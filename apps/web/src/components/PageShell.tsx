import { Link } from 'react-router-dom';

/**
 * Khung trang cho các trang phụ: header + tiêu đề lớn + gạch chân động.
 *
 * Rút ra khi trang thứ tư chép lại đúng khối header này. Trang chủ và trang giới
 * thiệu không dùng — hai trang đó có bố cục riêng, ép chung vào đây chỉ tạo thêm
 * tham số điều kiện.
 */
export function PageShell({
  eyebrow,
  title,
  subtitle,
  actions,
  backTo = '/dashboard',
  backLabel = '← Bảng điều khiển',
  children,
}: {
  eyebrow: string;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  backTo?: string;
  backLabel?: string;
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
          <Link to={backTo} className="text-sm font-semibold text-ink-soft hover:text-ink">
            {backLabel}
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10 md:py-14">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold tracking-wide text-ink-soft">{eyebrow}</p>
            <h1 className="mt-2 font-display text-4xl font-black leading-[0.9] tracking-tight md:text-5xl">
              {title}
            </h1>
            <div className="mt-3 h-[3px] w-28 origin-left bg-ink animate-draw-line" aria-hidden />
            {subtitle && <p className="mt-3 max-w-2xl text-sm text-ink-soft">{subtitle}</p>}
          </div>
          {actions}
        </div>
        {children}
      </main>
    </div>
  );
}
