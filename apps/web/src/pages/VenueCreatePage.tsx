import type { CreateVenueInput, SportSlug, VenueSummary } from '@sfa/shared';
import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageShell } from '@/components/PageShell';
import { api, apiMessage } from '@/lib/api';
import { useSports } from '@/lib/use-sports';
import { useSportStore } from '@/stores/sport-store';

/** FR-008.2 — chủ sân đăng thông tin sân. Ảnh tải lên ở trang quản lý sau khi tạo. */
export function VenueCreatePage() {
  const navigate = useNavigate();
  const { sports, sportOf } = useSports();
  const currentSport = useSportStore((s) => s.current);

  const [sport, setSport] = useState<SportSlug>(currentSport);
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [region, setRegion] = useState('');
  const [description, setDescription] = useState('');
  const [pricePerHour, setPricePerHour] = useState('300000');
  const [error, setError] = useState<string | null>(null);

  const create = useMutation({
    mutationFn: async (payload: CreateVenueInput) => {
      const { data } = await api.post<VenueSummary>('/venues', payload);
      return data;
    },
    // Đẩy thẳng sang trang quản lý: sân vừa tạo chưa có khung giờ nào nên chưa
    // ai đặt được — việc tiếp theo luôn là mở lịch.
    onSuccess: (venue) => navigate(`/venues/${venue.id}/manage`, { replace: true }),
    onError: (err) => setError(apiMessage(err, 'Không đăng được sân')),
  });

  const priceNumber = Number(pricePerHour);
  const valid =
    name.trim().length >= 2 &&
    address.trim().length >= 5 &&
    Number.isFinite(priceNumber) &&
    priceNumber >= 0;

  return (
    <PageShell
      eyebrow="Sân bãi"
      title="Đăng sân mới."
      subtitle="Sau khi đăng, bạn mở từng khung giờ cho thuê ở trang quản lý. Ảnh bìa cũng tải lên ở đó."
      backTo="/venues"
      backLabel="← Danh sách sân"
    >
      <section className="max-w-2xl space-y-5 border border-ink bg-white p-6">
        <div>
          <p className="mb-2 text-xs font-semibold tracking-wide text-ink-soft">Môn</p>
          <div className="flex flex-wrap gap-2">
            {sports.map(({ slug }) => (
              <button
                key={slug}
                type="button"
                onClick={() => setSport(slug)}
                className={`inline-flex items-center border px-3.5 py-1.5 text-sm font-semibold transition ${
                  sport === slug
                    ? 'border-ink bg-ink text-paper'
                    : 'border-ink/15 bg-white text-ink hover:border-ink'
                }`}
              >
                {sportOf(slug).nameVi}
              </button>
            ))}
          </div>
        </div>

        <label className="block">
          <span className="mb-2 block text-xs font-semibold tracking-wide text-ink-soft">
            Tên sân
          </span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Sân bóng Mỹ Đình A"
            className="input"
            maxLength={80}
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-xs font-semibold tracking-wide text-ink-soft">
            Địa chỉ
          </span>
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Số 1 Lê Đức Thọ, Nam Từ Liêm"
            className="input"
            maxLength={200}
          />
        </label>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="mb-2 block text-xs font-semibold tracking-wide text-ink-soft">
              Khu vực
            </span>
            <input
              type="text"
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              placeholder="Hà Nội"
              className="input"
              maxLength={100}
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-xs font-semibold tracking-wide text-ink-soft">
              Giá niêm yết mỗi giờ (VND)
            </span>
            <input
              type="number"
              min={0}
              step={10000}
              value={pricePerHour}
              onChange={(e) => setPricePerHour(e.target.value)}
              className="input"
            />
          </label>
        </div>

        <label className="block">
          <span className="mb-2 block text-xs font-semibold tracking-wide text-ink-soft">
            Mô tả
          </span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            maxLength={1000}
            placeholder="Mặt cỏ nhân tạo, có đèn, chỗ gửi xe miễn phí, cho thuê áo bib..."
            className="input resize-none"
          />
        </label>

        {error && (
          <p className="border border-rust bg-rust/5 px-3 py-2 text-sm font-medium text-rust">
            {error}
          </p>
        )}

        <div className="flex justify-end">
          <button
            type="button"
            disabled={!valid || create.isPending}
            onClick={() => {
              setError(null);
              create.mutate({
                name: name.trim(),
                sport,
                address: address.trim(),
                region: region.trim() || undefined,
                description: description.trim() || undefined,
                pricePerHour: priceNumber,
              });
            }}
            className="btn-primary"
          >
            {create.isPending ? 'Đang đăng...' : 'Đăng sân'}
          </button>
        </div>
      </section>
    </PageShell>
  );
}
