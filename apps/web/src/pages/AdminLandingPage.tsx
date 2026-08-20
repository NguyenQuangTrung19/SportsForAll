import type {
  LandingImageView,
  LandingImagesResponse,
  SportCatalogItem,
  SportSlug,
} from '@sfa/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AddSportForm } from '@/components/AddSportForm';
import { EditSportForm } from '@/components/EditSportForm';
import { SportIcon } from '@/components/SportIcon';
import { api } from '@/lib/api';
import { LANDING_IMAGES_KEY } from '@/lib/use-landing-images';
import { SPORTS_KEY, useSports } from '@/lib/use-sports';
import { SPORT_IMAGES } from '@/lib/sport-images';

function messageOf(err: unknown, fallback: string): string {
  return err instanceof AxiosError
    ? ((err.response?.data as { error?: { message?: string } })?.error?.message ?? fallback)
    : fallback;
}

/** Quản lý ảnh nền trang giới thiệu (FR-010, phần quản trị nội dung). */
export function AdminLandingPage() {
  const { allSports } = useSports();
  const [adding, setAdding] = useState(false);
  const { data, isLoading, isError } = useQuery({
    queryKey: LANDING_IMAGES_KEY,
    queryFn: async () => {
      const { data } = await api.get<LandingImagesResponse>('/landing/images');
      return data;
    },
  });

  const bySport = new Map<SportSlug, LandingImageView>(
    (data?.items ?? []).map((i) => [i.sport, i]),
  );

  return (
    <div className="min-h-screen bg-paper text-ink">
      <header className="border-b border-ink/10">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-4">
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

      <main className="mx-auto max-w-5xl px-6 py-10 md:py-14">
        <div className="mb-8">
          <p className="text-xs font-bold tracking-wide text-ink-soft">Quản trị</p>
          <h1 className="mt-2 font-display text-4xl font-black leading-[0.9] tracking-tight md:text-5xl">
            Môn thể thao &amp; ảnh.
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-ink-soft">
            Thêm môn mới, và đặt ảnh nền cho từng môn. Ảnh tải lên được tự cắt thành ba bản: hai cỡ
            ngang cho phần đầu trang và một bản dọc cho thẻ môn.
          </p>

          {!adding && (
            <button type="button" onClick={() => setAdding(true)} className="btn-primary mt-6">
              Thêm môn thể thao
            </button>
          )}
        </div>

        {adding && <AddSportForm onDone={() => setAdding(false)} />}

        <div className="mb-8 border border-ink/15 bg-white p-5">
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <p className="text-xs font-bold tracking-wide text-ink-soft">Ảnh nền của môn</p>
              <ul className="mt-3 space-y-1.5 text-sm text-ink-soft">
                <li>· Tỉ lệ ngang, rộng tối thiểu 1200px — nên dùng 16:9</li>
                <li>· Chủ thể lệch phải: nửa trái sẽ bị chữ tiêu đề đè lên</li>
                <li>· JPG, PNG hoặc WebP, tối đa 12MB</li>
                <li>· Ảnh được cắt tự động thành 3 bản: 2 cỡ ngang và 1 bản dọc</li>
              </ul>
            </div>

            <div>
              <p className="text-xs font-bold tracking-wide text-ink-soft">Icon của môn</p>
              <ul className="mt-3 space-y-1.5 text-sm text-ink-soft">
                <li>
                  · <strong className="font-bold text-ink">Màu không quan trọng.</strong> Icon được
                  tô lại theo màu chữ của từng vị trí — trắng trên ô màu môn, đậm trên nền sáng,
                  xanh lime trên trang giới thiệu. Chỉ hình dạng được giữ lại.
                </li>
                <li>
                  · <strong className="font-bold text-ink">Nền phải trong suốt.</strong> Nền trắng
                  sẽ biến thành một khối đặc.
                </li>
                <li>· Khung vuông — hình chữ nhật sẽ bị chừa lề. Chuẩn 24×24 là hợp lý</li>
                <li>· Nét dày tối thiểu 2 (theo khung 24×24), nét mảnh hơn sẽ mờ khi thu nhỏ</li>
                <li>· SVG hoặc PNG. Tải thẳng từ Lucide, Tabler, Phosphor, Google Fonts Icons</li>
                <li>· Tránh icon nhiều màu hoặc ảnh chụp — chúng sẽ thành khối bóng đặc</li>
              </ul>
            </div>
          </div>
        </div>

        {isLoading && <p className="text-sm text-ink-soft">Đang tải...</p>}
        {isError && (
          <p className="border border-rust bg-rust/5 px-3 py-2 text-sm font-medium text-rust">
            Không tải được danh sách ảnh.
          </p>
        )}

        <ul className="space-y-4">
          {allSports.map((item) => (
            <SportRow key={item.slug} item={item} current={bySport.get(item.slug) ?? null} />
          ))}
        </ul>
      </main>
    </div>
  );
}

function SportRow({ item, current }: { item: SportCatalogItem; current: LandingImageView | null }) {
  const sport = item.slug;
  const theme = item;
  const [editing, setEditing] = useState(false);
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [error, setError] = useState<string | null>(null);

  const invalidate = () => {
    setError(null);
    void queryClient.invalidateQueries({ queryKey: LANDING_IMAGES_KEY });
  };

  const upload = useMutation({
    mutationFn: async (file: File) => {
      const form = new FormData();
      form.append('image', file);
      await api.put(`/landing/images/${sport}`, form);
    },
    onSuccess: invalidate,
    onError: (err) => setError(messageOf(err, 'Không tải được ảnh lên')),
  });

  const reset = useMutation({
    mutationFn: async () => {
      await api.delete(`/landing/images/${sport}`);
    },
    onSuccess: invalidate,
    onError: (err) => setError(messageOf(err, 'Không gỡ được ảnh')),
  });

  const removeSport = useMutation({
    mutationFn: async () => {
      await api.delete(`/sports/${sport}`);
    },
    onSuccess: () => {
      setError(null);
      void queryClient.invalidateQueries({ queryKey: SPORTS_KEY });
      void queryClient.invalidateQueries({ queryKey: LANDING_IMAGES_KEY });
    },
    onError: (err) => setError(messageOf(err, 'Không xoá được môn')),
  });

  const busy = upload.isPending || reset.isPending || removeSport.isPending;
  // Môn admin mới thêm chưa có ảnh mặc định đóng kèm — khi đó không có gì để xem trước.
  const preview = current?.tileUrl ?? SPORT_IMAGES[sport]?.tile ?? null;

  return (
    <li className="border border-ink/15 bg-white">
      <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center">
        {preview ? (
          <img src={preview} alt="" aria-hidden className="h-32 w-[6.4rem] shrink-0 object-cover" />
        ) : (
          <div
            className="flex h-32 w-[6.4rem] shrink-0 items-center justify-center bg-paper-2 text-[11px] text-ink-soft"
            aria-hidden
          >
            Chưa có ảnh
          </div>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2.5">
            <SportIcon sport={sport} className="size-5" style={{ color: theme.primaryDark }} />
            <p className="font-display text-xl font-black tracking-tight">{theme.nameVi}</p>
            {!item.active && (
              <span className="border border-ink/20 px-2 py-0.5 text-[10px] font-bold text-ink-soft">
                Đã tắt
              </span>
            )}
          </div>

          <p className="mt-1.5 text-xs text-ink-soft">
            {current ? (
              <>
                Đã thay · {new Date(current.updatedAt).toLocaleString('vi-VN')}
                {current.updatedByName && ` · bởi ${current.updatedByName}`}
              </>
            ) : (
              'Đang dùng ảnh mặc định'
            )}
          </p>

          {error && (
            <p className="mt-3 border border-rust bg-rust/5 px-3 py-2 text-xs font-medium text-rust">
              {error}
            </p>
          )}
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className="btn-ghost !px-4 !py-2 !text-xs"
          >
            {upload.isPending ? 'Đang tải...' : current ? 'Đổi ảnh' : 'Tải ảnh lên'}
          </button>
          <button
            type="button"
            onClick={() => setEditing((v) => !v)}
            className="text-xs font-semibold text-ink-soft transition hover:text-ink"
          >
            {editing ? 'Đóng sửa' : 'Sửa môn'}
          </button>
          {current && (
            <button
              type="button"
              onClick={() => reset.mutate()}
              disabled={busy}
              className="text-xs font-semibold text-ink-soft transition hover:text-rust disabled:opacity-50"
            >
              Về mặc định
            </button>
          )}
          {/*
            Môn đang có đội hoặc bài đăng thì không xoá được. Nói thẳng ra thay vì
            ẩn nút đi — nút lúc có lúc không trông như lỗi.
          */}
          {item.inUse === false ? (
            <button
              type="button"
              onClick={() => removeSport.mutate()}
              disabled={busy}
              className="text-xs font-semibold text-rust transition hover:underline disabled:opacity-50"
            >
              Xoá môn
            </button>
          ) : (
            <span
              className="text-xs text-ink-soft/70"
              title="Còn đội hoặc bài đăng thuộc môn này. Dùng nút Sửa môn để tắt thay vì xoá."
            >
              Đang được dùng
            </span>
          )}
        </div>
      </div>

      {editing && <EditSportForm item={item} onDone={() => setEditing(false)} />}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = ''; // cho phép chọn lại đúng file vừa chọn
          if (file) upload.mutate(file);
        }}
      />
    </li>
  );
}
