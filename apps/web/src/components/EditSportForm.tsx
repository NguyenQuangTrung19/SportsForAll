import type { SportCatalogItem } from '@sfa/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { SportFields } from '@/components/SportFields';
import { parsePositions, type SportFieldValues } from '@/lib/sport-form';
import { api, apiMessage } from '@/lib/api';
import { SPORTS_KEY } from '@/lib/use-sports';

/** Sửa một môn có sẵn: tên, màu, vị trí chơi, thứ tự, bật/tắt, icon. */
export function EditSportForm({ item, onDone }: { item: SportCatalogItem; onDone: () => void }) {
  const queryClient = useQueryClient();
  const iconRef = useRef<HTMLInputElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState(item.sortOrder);
  const [values, setValues] = useState<SportFieldValues>({
    nameVi: item.nameVi,
    primary: item.primary,
    primaryDark: item.primaryDark,
    positions: item.positions.join(', '),
  });

  const refresh = () => {
    setError(null);
    void queryClient.invalidateQueries({ queryKey: SPORTS_KEY });
  };

  const save = useMutation({
    mutationFn: async () => {
      await api.patch(`/sports/${item.slug}`, {
        nameVi: values.nameVi.trim(),
        primary: values.primary,
        primaryDark: values.primaryDark,
        positions: parsePositions(values.positions),
        sortOrder,
      });
    },
    onSuccess: () => {
      refresh();
      onDone();
    },
    onError: (err) => setError(apiMessage(err, 'Không lưu được')),
  });

  /** Tách riêng khỏi nút Lưu: bật/tắt là thao tác một chạm, không nên bắt lưu cả form. */
  const toggleActive = useMutation({
    mutationFn: async () => {
      await api.patch(`/sports/${item.slug}`, { active: !item.active });
    },
    onSuccess: refresh,
    onError: (err) => setError(apiMessage(err, 'Không đổi được trạng thái')),
  });

  const uploadIcon = useMutation({
    mutationFn: async (file: File) => {
      const form = new FormData();
      form.append('icon', file);
      await api.post(`/sports/${item.slug}/icon`, form);
    },
    onSuccess: refresh,
    onError: (err) => setError(apiMessage(err, 'Không tải được icon')),
  });

  const busy = save.isPending || toggleActive.isPending || uploadIcon.isPending;

  return (
    <div className="border-t border-ink/10 bg-paper-2/40 p-5">
      <SportFields value={values} onChange={setValues} />

      <div className="mt-4 flex flex-wrap items-end gap-5">
        <label className="block">
          <span className="mb-2 block text-xs font-bold tracking-wide text-ink-soft">Thứ tự</span>
          <input
            type="number"
            min={0}
            max={999}
            value={sortOrder}
            onChange={(e) => setSortOrder(Number(e.target.value))}
            className="input w-24"
          />
        </label>

        <div>
          <span className="mb-2 block text-xs font-bold tracking-wide text-ink-soft">Icon</span>
          <div className="flex items-center gap-3">
            {item.iconUrl && (
              <img src={item.iconUrl} alt="" aria-hidden className="size-9 object-contain" />
            )}
            <button
              type="button"
              onClick={() => iconRef.current?.click()}
              disabled={busy}
              className="btn-ghost !px-3 !py-2 !text-xs"
            >
              {uploadIcon.isPending ? 'Đang tải...' : item.iconUrl ? 'Đổi icon' : 'Tải icon'}
            </button>
          </div>
          <p className="mt-1.5 max-w-[16rem] text-[11px] text-ink-soft/80">
            SVG hoặc PNG, nền trong suốt, khung vuông. Màu trong file không quan trọng — icon được
            tô lại theo màu chữ ở từng vị trí.
          </p>
        </div>

        <div>
          <span className="mb-2 block text-xs font-bold tracking-wide text-ink-soft">
            Trạng thái
          </span>
          <button
            type="button"
            onClick={() => toggleActive.mutate()}
            disabled={busy}
            className="btn-ghost !px-3 !py-2 !text-xs"
          >
            {item.active ? 'Đang bật · Tắt môn' : 'Đang tắt · Bật lại'}
          </button>
        </div>
      </div>

      <p className="mt-3 text-xs text-ink-soft">
        Tắt môn thì môn biến khỏi trang giới thiệu và bộ lọc, nhưng dữ liệu cũ vẫn còn nguyên. Dùng
        cách này khi môn không xoá được vì đã có đội hoặc bài đăng.
      </p>

      {error && (
        <p className="mt-4 border border-rust bg-rust/5 px-3 py-2 text-sm font-medium text-rust">
          {error}
        </p>
      )}

      <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={onDone}
          disabled={busy}
          className="text-sm font-semibold text-ink-soft transition hover:text-ink disabled:opacity-50"
        >
          Đóng
        </button>
        <button
          type="button"
          onClick={() => save.mutate()}
          disabled={busy || values.nameVi.trim().length < 2}
          className="btn-primary"
        >
          {save.isPending ? 'Đang lưu...' : 'Lưu thay đổi'}
        </button>
      </div>

      <input
        ref={iconRef}
        type="file"
        accept="image/svg+xml,image/png,image/webp,image/jpeg"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = '';
          if (file) uploadIcon.mutate(file);
        }}
      />
    </div>
  );
}
