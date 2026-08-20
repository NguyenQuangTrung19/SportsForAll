import { createSportSchema, type SportCatalogItem } from '@sfa/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { useState } from 'react';
import { SportFields } from '@/components/SportFields';
import { parsePositions, type SportFieldValues } from '@/lib/sport-form';
import { api } from '@/lib/api';
import { SPORTS_KEY } from '@/lib/use-sports';

/** Sinh slug từ tên tiếng Việt: bỏ dấu, thay khoảng trắng bằng gạch ngang. */
function slugify(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function AddSportForm({ onDone }: { onDone: () => void }) {
  const queryClient = useQueryClient();
  const [slug, setSlug] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const [values, setValues] = useState<SportFieldValues>({
    nameVi: '',
    primary: '#0E7490',
    primaryDark: '#0A5566',
    positions: '',
  });
  const [error, setError] = useState<string | null>(null);

  const effectiveSlug = slugTouched ? slug : slugify(values.nameVi);

  const create = useMutation({
    mutationFn: async () => {
      const { data } = await api.post<SportCatalogItem>('/sports', {
        slug: effectiveSlug,
        nameVi: values.nameVi.trim(),
        primary: values.primary,
        primaryDark: values.primaryDark,
        positions: parsePositions(values.positions),
      });
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: SPORTS_KEY });
      onDone();
    },
    onError: (err: unknown) => {
      setError(
        err instanceof AxiosError
          ? ((err.response?.data as { error?: { message?: string } })?.error?.message ??
              'Không thêm được môn')
          : 'Không thêm được môn',
      );
    },
  });

  const submit = () => {
    setError(null);
    const parsed = createSportSchema.safeParse({
      slug: effectiveSlug,
      nameVi: values.nameVi.trim(),
      primary: values.primary,
      primaryDark: values.primaryDark,
      positions: [],
    });
    if (!parsed.success) {
      const first = Object.values(parsed.error.flatten().fieldErrors)[0]?.[0];
      setError(first ?? 'Dữ liệu không hợp lệ');
      return;
    }
    create.mutate();
  };

  return (
    <section className="mb-8 border border-ink bg-white p-6">
      <h2 className="font-display text-xl font-black tracking-tight">Thêm môn thể thao</h2>
      <p className="mt-1 text-sm text-ink-soft">
        Môn mới hiện ngay trên trang giới thiệu và trong bộ lọc. Nhớ tải ảnh nền cho nó ở danh sách
        bên dưới.
      </p>

      <div className="mt-5 space-y-4">
        <label className="block">
          <span className="mb-2 block text-xs font-bold tracking-wide text-ink-soft">
            Slug (dùng trong địa chỉ)
          </span>
          <input
            type="text"
            value={effectiveSlug}
            onChange={(e) => {
              setSlugTouched(true);
              setSlug(e.target.value);
            }}
            placeholder="boi-loi"
            className="input"
            maxLength={40}
          />
        </label>

        <SportFields value={values} onChange={setValues} />
      </div>

      {error && (
        <p className="mt-4 border border-rust bg-rust/5 px-3 py-2 text-sm font-medium text-rust">
          {error}
        </p>
      )}

      <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={onDone}
          disabled={create.isPending}
          className="text-sm font-semibold text-ink-soft transition hover:text-ink disabled:opacity-50"
        >
          Huỷ
        </button>
        <button
          type="button"
          onClick={submit}
          disabled={create.isPending || values.nameVi.trim().length < 2}
          className="btn-primary"
        >
          {create.isPending ? 'Đang thêm...' : 'Thêm môn'}
        </button>
      </div>
    </section>
  );
}
