import { SPORT_THEMES } from '@sfa/shared';
import { SportSwitcher } from '@/components/SportSwitcher';
import { useSportStore } from '@/stores/sport-store';

export function HomePage() {
  const { current } = useSportStore();
  const theme = SPORT_THEMES[current];

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <header className="mb-8">
        <h1 className="text-3xl font-bold">SportsForAll</h1>
        <p className="mt-2 text-slate-600">
          Nền tảng kết nối cộng đồng thể thao - tìm đồng đội, đối thủ, sân bãi.
        </p>
      </header>

      <section className="mb-8">
        <h2 className="mb-3 text-lg font-semibold">Chọn môn thể thao</h2>
        <SportSwitcher />
      </section>

      <section className="rounded-lg border border-slate-200 bg-slate-50 p-6">
        <p className="text-sm text-slate-500">Đang xem</p>
        <p className="mt-1 text-2xl font-semibold text-primary">
          {theme.emoji} {theme.nameVi}
        </p>
        <p className="mt-3 text-sm text-slate-600">
          Theme primary đã đổi sang <code className="rounded bg-white px-1">{theme.primary}</code>.
        </p>
      </section>
    </div>
  );
}
