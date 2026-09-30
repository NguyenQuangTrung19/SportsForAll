import { createSportSchema, type SportCatalogItem } from '@sfa/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRef, useState, type MutableRefObject } from 'react';
import { SportFields } from '@/components/SportFields';
import { parsePositions, type SportFieldValues } from '@/lib/sport-form';
import { api, apiMessage } from '@/lib/api';
import { LANDING_IMAGES_KEY } from '@/lib/use-landing-images';
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
  const [iconFile, setIconFile] = useState<File | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [step, setStep] = useState<'idle' | 'icon' | 'image'>('idle');
  const iconRef = useRef<HTMLInputElement | null>(null);
  const imageRef = useRef<HTMLInputElement | null>(null);

  const effectiveSlug = slugTouched ? slug : slugify(values.nameVi);

  /**
   * Tạo môn rồi đính kèm icon và ảnh nền trong cùng một lần bấm.
   *
   * Phải chạy tuần tự vì hai endpoint tải lên đều khoá theo slug, tức môn phải
   * tồn tại trước. Nếu một bước tải lên hỏng thì môn vẫn được giữ — báo rõ phần
   * nào chưa xong thay vì xoá ngược lại, vì xoá đi sẽ mất luôn phần đã nhập.
   */
  const create = useMutation({
    mutationFn: async () => {
      const { data } = await api.post<SportCatalogItem>('/sports', {
        slug: effectiveSlug,
        nameVi: values.nameVi.trim(),
        primary: values.primary,
        primaryDark: values.primaryDark,
        positions: parsePositions(values.positions),
      });

      const failed: string[] = [];

      if (iconFile) {
        setStep('icon');
        try {
          const form = new FormData();
          form.append('icon', iconFile);
          await api.post(`/sports/${data.slug}/icon`, form);
        } catch {
          failed.push('icon');
        }
      }

      if (imageFile) {
        setStep('image');
        try {
          const form = new FormData();
          form.append('image', imageFile);
          await api.put(`/landing/images/${data.slug}`, form);
        } catch {
          failed.push('ảnh nền');
        }
      }

      return failed;
    },
    onSuccess: (failed) => {
      void queryClient.invalidateQueries({ queryKey: SPORTS_KEY });
      void queryClient.invalidateQueries({ queryKey: LANDING_IMAGES_KEY });
      if (failed.length > 0) {
        setStep('idle');
        setError(
          `Đã thêm môn nhưng chưa tải được ${failed.join(' và ')}. Dùng nút "Sửa môn" ở hàng bên dưới để thử lại.`,
        );
        return;
      }
      onDone();
    },
    onError: (err: unknown) => {
      setStep('idle');
      setError(apiMessage(err, 'Không thêm được môn'));
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

        <div className="grid gap-4 border-t border-ink/10 pt-4 md:grid-cols-2">
          <FilePicker
            label="Icon (tuỳ chọn)"
            hint="SVG hoặc PNG nền trong suốt, khung vuông"
            accept="image/svg+xml,image/png,image/webp,image/jpeg"
            file={iconFile}
            inputRef={iconRef}
            onPick={setIconFile}
          />
          <FilePicker
            label="Ảnh nền (tuỳ chọn)"
            hint="Ngang 16:9, rộng tối thiểu 1200px"
            accept="image/jpeg,image/png,image/webp"
            file={imageFile}
            inputRef={imageRef}
            onPick={setImageFile}
          />
        </div>

        <p className="text-xs text-ink-soft">
          Bỏ trống cũng được — thêm sau bằng nút &quot;Sửa môn&quot;. Môn chưa có ảnh nền sẽ tạm
          mượn ảnh của môn đầu tiên.
        </p>
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
          {step === 'icon'
            ? 'Đang tải icon...'
            : step === 'image'
              ? 'Đang tải ảnh nền...'
              : create.isPending
                ? 'Đang thêm...'
                : 'Thêm môn'}
        </button>
      </div>
    </section>
  );
}

function FilePicker({
  label,
  hint,
  accept,
  file,
  inputRef,
  onPick,
}: {
  label: string;
  hint: string;
  accept: string;
  file: File | null;
  inputRef: MutableRefObject<HTMLInputElement | null>;
  onPick: (f: File | null) => void;
}) {
  return (
    <div>
      <span className="mb-2 block text-xs font-bold tracking-wide text-ink-soft">{label}</span>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="btn-ghost !px-3 !py-2 !text-xs"
        >
          {file ? 'Đổi file' : 'Chọn file'}
        </button>
        {file && (
          <>
            <span className="min-w-0 flex-1 truncate text-xs text-ink">{file.name}</span>
            <button
              type="button"
              onClick={() => onPick(null)}
              className="text-xs font-semibold text-ink-soft transition hover:text-rust"
            >
              Bỏ
            </button>
          </>
        )}
      </div>
      <p className="mt-1.5 text-[11px] text-ink-soft/80">{hint}</p>

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          const picked = e.target.files?.[0] ?? null;
          e.target.value = ''; // cho phép chọn lại đúng file vừa bỏ
          onPick(picked);
        }}
      />
    </div>
  );
}
