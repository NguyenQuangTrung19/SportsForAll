import type { SportFieldValues } from '@/lib/sport-form';

/** Các ô nhập dùng chung cho cả thêm mới lẫn chỉnh sửa môn. */
export function SportFields({
  value,
  onChange,
}: {
  value: SportFieldValues;
  onChange: (v: SportFieldValues) => void;
}) {
  const set = (patch: Partial<SportFieldValues>) => onChange({ ...value, ...patch });

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <label className="block">
        <span className="mb-2 block text-xs font-bold tracking-wide text-ink-soft">
          Tên hiển thị
        </span>
        <input
          type="text"
          value={value.nameVi}
          onChange={(e) => set({ nameVi: e.target.value })}
          placeholder="Bơi lội"
          className="input"
          maxLength={50}
        />
      </label>

      <label className="block md:col-span-2">
        <span className="mb-2 block text-xs font-bold tracking-wide text-ink-soft">
          Vị trí chơi (phân cách bằng dấu phẩy)
        </span>
        <input
          type="text"
          value={value.positions}
          onChange={(e) => set({ positions: e.target.value })}
          placeholder="Tự do, Ếch, Ngửa, Bướm"
          className="input"
        />
      </label>

      <div className="flex gap-5 md:col-span-2">
        <label className="block">
          <span className="mb-2 block text-xs font-bold tracking-wide text-ink-soft">
            Màu chính
          </span>
          <input
            type="color"
            value={value.primary}
            onChange={(e) => set({ primary: e.target.value })}
            className="h-11 w-20 border border-ink/20 bg-white"
          />
        </label>
        <label className="block">
          <span className="mb-2 block text-xs font-bold tracking-wide text-ink-soft">
            Màu đậm (dùng cho chữ)
          </span>
          <input
            type="color"
            value={value.primaryDark}
            onChange={(e) => set({ primaryDark: e.target.value })}
            className="h-11 w-20 border border-ink/20 bg-white"
          />
        </label>
      </div>
    </div>
  );
}
