import {
  BOOKING_STATUS_LABELS,
  SLOT_STATUS_LABELS,
  type BookingListResponse,
  type BookingView,
  type VenueDetail,
  type VenueStats,
} from '@sfa/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Avatar } from '@/components/Avatar';
import { PageShell } from '@/components/PageShell';
import { api, apiMessage } from '@/lib/api';
import { formatSlotRange, formatVnd, slotHours } from '@/lib/format';

/** FR-008.3 / .4 / .6 / .9 — trang chủ sân dùng để vận hành. */
export function VenueManagePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const photoRef = useRef<HTMLInputElement | null>(null);
  const [error, setError] = useState<string | null>(null);

  const venueQuery = useQuery({
    enabled: Boolean(id),
    queryKey: ['venues', id],
    queryFn: async () => {
      const { data } = await api.get<VenueDetail>(`/venues/${id}`);
      return data;
    },
  });

  const statsQuery = useQuery({
    enabled: Boolean(id),
    queryKey: ['venues', id, 'stats'],
    queryFn: async () => {
      const { data } = await api.get<VenueStats>(`/venues/${id}/stats`);
      return data;
    },
  });

  const bookingsQuery = useQuery({
    enabled: Boolean(id),
    queryKey: ['venues', id, 'bookings'],
    queryFn: async () => {
      const { data } = await api.get<BookingListResponse>(`/venues/${id}/bookings?limit=50`);
      return data.items;
    },
  });

  const refresh = () => {
    setError(null);
    void queryClient.invalidateQueries({ queryKey: ['venues'] });
  };

  const uploadPhoto = useMutation({
    mutationFn: async (file: File) => {
      const form = new FormData();
      form.append('photo', file);
      await api.post(`/venues/${id}/photo`, form);
    },
    onSuccess: refresh,
    onError: (err) => setError(apiMessage(err, 'Không tải được ảnh')),
  });

  const savePrice = useMutation({
    mutationFn: async (pricePerHour: number) => {
      await api.patch(`/venues/${id}`, { pricePerHour });
    },
    onSuccess: refresh,
    onError: (err) => setError(apiMessage(err, 'Không đổi được giá')),
  });

  const createSlot = useMutation({
    mutationFn: async (payload: {
      startsAt: string;
      endsAt: string;
      price?: number;
      openForTeams: boolean;
      note?: string;
    }) => {
      await api.post(`/venues/${id}/slots`, payload);
    },
    onSuccess: refresh,
    onError: (err) => setError(apiMessage(err, 'Không mở được khung giờ')),
  });

  const updateSlot = useMutation({
    mutationFn: async ({ slotId, ...patch }: { slotId: string; openForTeams?: boolean; status?: 'open' | 'blocked' }) => {
      await api.patch(`/venues/slots/${slotId}`, patch);
    },
    onSuccess: refresh,
    onError: (err) => setError(apiMessage(err, 'Không sửa được khung giờ')),
  });

  const removeSlot = useMutation({
    mutationFn: async (slotId: string) => {
      await api.delete(`/venues/slots/${slotId}`);
    },
    onSuccess: refresh,
    onError: (err) => setError(apiMessage(err, 'Không xoá được khung giờ')),
  });

  const decideBooking = useMutation({
    mutationFn: async ({ bookingId, decision }: { bookingId: string; decision: 'confirm' | 'reject' }) => {
      await api.post(`/venues/bookings/${bookingId}/${decision}`);
    },
    onSuccess: refresh,
    onError: (err) => setError(apiMessage(err, 'Không xử lý được đơn')),
  });

  const removeVenue = useMutation({
    mutationFn: async () => {
      await api.delete(`/venues/${id}`);
    },
    onSuccess: () => navigate('/venues', { replace: true }),
    onError: (err) => setError(apiMessage(err, 'Không xoá được sân')),
  });

  const venue = venueQuery.data;
  const stats = statsQuery.data;
  const bookings = bookingsQuery.data ?? [];
  const pendingBookings = bookings.filter((b) => b.status === 'pending');
  const busy = createSlot.isPending || updateSlot.isPending || removeSlot.isPending;

  if (venueQuery.isError) {
    return (
      <PageShell eyebrow="Sân bãi" title="Không mở được sân" backTo="/venues" backLabel="← Danh sách sân">
        <p className="border border-rust bg-rust/5 px-3 py-2 text-sm font-medium text-rust">
          Không tải được sân, hoặc bạn không phải chủ sân này.
        </p>
      </PageShell>
    );
  }

  return (
    <PageShell
      eyebrow="Quản lý sân"
      title={venue?.name ?? 'Đang tải...'}
      subtitle={venue?.address}
      backTo="/venues"
      backLabel="← Danh sách sân"
      actions={
        venue && (
          <Link to={`/venues/${venue.id}`} className="btn-ghost">
            Xem như người thuê
          </Link>
        )
      }
    >
      {error && (
        <p className="mb-6 border border-rust bg-rust/5 px-3 py-2 text-sm font-medium text-rust">
          {error}
        </p>
      )}

      {venue && (
        <>
          {stats && (
            <section className="mb-10">
              <h2 className="border-b-2 border-ink pb-2.5 font-display text-2xl font-black tracking-tight">
                Thống kê
              </h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Stat n={stats.slotsOpen} label="Khung còn trống" />
                <Stat n={stats.bookingsPending} label="Đơn chờ duyệt" accent={stats.bookingsPending > 0} />
                <Stat n={stats.bookingsConfirmed} label="Đơn đã xác nhận" />
                <article className="border border-ink/12 bg-white p-5">
                  <p className="poster-num text-2xl text-primary-dark">
                    {formatVnd(stats.revenueConfirmed)}
                  </p>
                  <p className="mt-1.5 text-xs font-bold tracking-wide text-ink-soft">
                    Doanh thu dự kiến
                  </p>
                  <p className="mt-0.5 text-[11px] text-ink-soft/70">
                    tổng giá các khung đã xác nhận
                  </p>
                </article>
              </div>
            </section>
          )}

          <section className="mb-10 grid gap-6 lg:grid-cols-12">
            <article className="border border-ink/15 bg-white p-6 lg:col-span-5">
              <p className="text-xs font-bold tracking-wide text-ink-soft">Ảnh bìa</p>
              <div className="mt-3 aspect-[16/9] overflow-hidden border border-ink/10 bg-paper-2/60">
                {venue.photoUrl ? (
                  <img src={venue.photoUrl} alt="" aria-hidden className="size-full object-cover" />
                ) : (
                  <div className="flex size-full items-center justify-center text-sm text-ink-soft/60">
                    Chưa có ảnh
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => photoRef.current?.click()}
                disabled={uploadPhoto.isPending}
                className="btn-ghost mt-3 w-full"
              >
                {uploadPhoto.isPending ? 'Đang tải...' : venue.photoUrl ? 'Đổi ảnh' : 'Tải ảnh lên'}
              </button>
              <p className="mt-2 text-[11px] text-ink-soft/80">
                Ảnh ngang, JPG/PNG/WebP, tối đa 8MB. Ảnh được nén lại còn tối đa 1600px.
              </p>
              <input
                ref={photoRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = '';
                  if (file) uploadPhoto.mutate(file);
                }}
              />
            </article>

            <PriceCard
              current={venue.pricePerHour}
              pending={savePrice.isPending}
              onSave={(p) => {
                setError(null);
                savePrice.mutate(p);
              }}
            />
          </section>

          <section className="mb-10">
            <header className="flex items-baseline justify-between border-b-2 border-ink pb-2.5">
              <h2 className="font-display text-2xl font-black tracking-tight">Đơn đặt sân</h2>
              <span className="poster-num text-2xl text-rust">
                {String(pendingBookings.length).padStart(2, '0')}
              </span>
            </header>

            {bookings.length === 0 ? (
              <p className="mt-4 border border-dashed border-ink/25 bg-white p-8 text-center text-sm text-ink-soft">
                Chưa có đơn nào.
              </p>
            ) : (
              <ul className="mt-4 space-y-3">
                {bookings.map((b) => (
                  <BookingRow
                    key={b.id}
                    booking={b}
                    pending={decideBooking.isPending}
                    onDecide={(decision) => {
                      setError(null);
                      decideBooking.mutate({ bookingId: b.id, decision });
                    }}
                  />
                ))}
              </ul>
            )}
          </section>

          <section>
            <header className="flex items-baseline justify-between border-b-2 border-ink pb-2.5">
              <h2 className="font-display text-2xl font-black tracking-tight">Lịch sân</h2>
              <span className="poster-num text-2xl text-primary-dark">
                {String(venue.slots.length).padStart(2, '0')}
              </span>
            </header>

            <NewSlotForm
              defaultPrice={venue.pricePerHour}
              pending={createSlot.isPending}
              onCreate={(payload) => {
                setError(null);
                createSlot.mutate(payload);
              }}
            />

            {venue.slots.length === 0 ? (
              <p className="mt-4 border border-dashed border-ink/25 bg-white p-8 text-center text-sm text-ink-soft">
                Chưa mở khung giờ nào sắp tới. Không có khung thì không ai đặt được.
              </p>
            ) : (
              <ul className="mt-4 space-y-3">
                {venue.slots.map((slot) => (
                  <li
                    key={slot.id}
                    className="flex flex-wrap items-center gap-3 border border-ink/12 bg-white p-4"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-display text-base font-black tracking-tight">
                        {formatSlotRange(slot.startsAt, slot.endsAt)}
                      </p>
                      <p className="mt-0.5 text-xs text-ink-soft">
                        {formatVnd(slot.price)} · {slotHours(slot.startsAt, slot.endsAt)} giờ ·{' '}
                        {SLOT_STATUS_LABELS[slot.status]}
                        {slot.pendingCount > 0 && ` · ${slot.pendingCount} đơn chờ`}
                        {slot.note && ` · ${slot.note}`}
                      </p>
                    </div>

                    <label className="flex items-center gap-2 text-xs font-semibold text-ink-soft">
                      <input
                        type="checkbox"
                        checked={slot.openForTeams}
                        disabled={busy}
                        onChange={(e) => {
                          setError(null);
                          updateSlot.mutate({ slotId: slot.id, openForTeams: e.target.checked });
                        }}
                        className="size-4 accent-current"
                      />
                      Cần ghép đội
                    </label>

                    {slot.status !== 'booked' && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => {
                          setError(null);
                          updateSlot.mutate({
                            slotId: slot.id,
                            status: slot.status === 'open' ? 'blocked' : 'open',
                          });
                        }}
                        className="border border-ink/25 px-3 py-1.5 text-xs font-semibold transition hover:border-ink disabled:opacity-50"
                      >
                        {slot.status === 'open' ? 'Đóng khung' : 'Mở lại'}
                      </button>
                    )}

                    {slot.status !== 'booked' && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => {
                          if (!window.confirm('Xoá khung giờ này?')) return;
                          setError(null);
                          removeSlot.mutate(slot.id);
                        }}
                        className="border border-rust px-3 py-1.5 text-xs font-semibold text-rust transition hover:bg-rust/5 disabled:opacity-50"
                      >
                        Xoá
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <article className="mt-12 border border-rust bg-rust/[0.03] p-6">
            <p className="text-xs font-bold tracking-wide text-rust">Vùng nguy hiểm</p>
            <h3 className="mt-1 font-display text-lg font-black tracking-tight">Xoá sân</h3>
            <p className="mt-2 max-w-2xl text-sm text-ink-soft">
              Xoá sân là mất toàn bộ lịch, đơn đặt và đánh giá. Còn đơn đã xác nhận chưa tới ngày
              thì hệ thống sẽ chặn — huỷ hoặc chờ đá xong đã.
            </p>
            <button
              type="button"
              onClick={() => {
                if (!window.confirm(`Xoá sân "${venue.name}"? Không hoàn tác được.`)) return;
                setError(null);
                removeVenue.mutate();
              }}
              disabled={removeVenue.isPending}
              className="mt-4 inline-flex border border-rust bg-rust/10 px-4 py-2 text-sm font-bold text-rust transition hover:bg-rust/20 disabled:opacity-50"
            >
              {removeVenue.isPending ? 'Đang xoá...' : 'Xoá sân'}
            </button>
          </article>
        </>
      )}
    </PageShell>
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

function PriceCard({
  current,
  pending,
  onSave,
}: {
  current: number;
  pending: boolean;
  onSave: (price: number) => void;
}) {
  const [value, setValue] = useState(String(current));
  const parsed = Number(value);

  return (
    <article className="border border-ink/15 bg-white p-6 lg:col-span-7">
      <p className="text-xs font-bold tracking-wide text-ink-soft">Giá niêm yết</p>
      <h3 className="mt-1 font-display text-xl font-black tracking-tight">
        {formatVnd(current)} mỗi giờ
      </h3>
      <p className="mt-2 text-sm text-ink-soft">
        Đổi giá niêm yết <strong className="font-bold text-ink">không</strong> đổi giá các khung đã
        mở. Khung đã đăng là một lời chào giá — sửa ngược lại sau lưng người đang xem là chuyện
        khác hẳn. Muốn đổi giá một khung cụ thể thì xoá khung đó rồi mở lại.
      </p>
      <div className="mt-4 flex flex-wrap items-end gap-3">
        <label className="block">
          <span className="mb-2 block text-xs font-semibold tracking-wide text-ink-soft">
            Giá mới (VND/giờ)
          </span>
          <input
            type="number"
            min={0}
            step={10000}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="input w-44"
          />
        </label>
        <button
          type="button"
          onClick={() => onSave(parsed)}
          disabled={pending || !Number.isFinite(parsed) || parsed < 0 || parsed === current}
          className="btn-primary"
        >
          {pending ? 'Đang lưu...' : 'Lưu giá'}
        </button>
      </div>
    </article>
  );
}

function NewSlotForm({
  defaultPrice,
  pending,
  onCreate,
}: {
  defaultPrice: number;
  pending: boolean;
  onCreate: (payload: {
    startsAt: string;
    endsAt: string;
    price?: number;
    openForTeams: boolean;
    note?: string;
  }) => void;
}) {
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [price, setPrice] = useState(String(defaultPrice));
  const [openForTeams, setOpenForTeams] = useState(false);
  const [note, setNote] = useState('');

  const valid = startsAt !== '' && endsAt !== '' && new Date(endsAt) > new Date(startsAt);

  return (
    <section className="mt-4 border border-ink bg-white p-5">
      <p className="text-xs font-bold tracking-wide text-ink-soft">Mở khung giờ mới</p>
      <div className="mt-3 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        <label className="block">
          <span className="mb-2 block text-xs font-semibold tracking-wide text-ink-soft">
            Bắt đầu
          </span>
          <input
            type="datetime-local"
            value={startsAt}
            onChange={(e) => setStartsAt(e.target.value)}
            className="input"
          />
        </label>
        <label className="block">
          <span className="mb-2 block text-xs font-semibold tracking-wide text-ink-soft">
            Kết thúc
          </span>
          <input
            type="datetime-local"
            value={endsAt}
            onChange={(e) => setEndsAt(e.target.value)}
            className="input"
          />
        </label>
        <label className="block">
          <span className="mb-2 block text-xs font-semibold tracking-wide text-ink-soft">
            Giá khung này (VND)
          </span>
          <input
            type="number"
            min={0}
            step={10000}
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="input"
          />
        </label>
        <label className="block">
          <span className="mb-2 block text-xs font-semibold tracking-wide text-ink-soft">
            Ghi chú
          </span>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Sân số 3, có đèn"
            maxLength={300}
            className="input"
          />
        </label>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <label className="flex items-center gap-2 text-sm font-semibold text-ink-soft">
          <input
            type="checkbox"
            checked={openForTeams}
            onChange={(e) => setOpenForTeams(e.target.checked)}
            className="size-4 accent-current"
          />
          Mở cho đội lẻ vào ghép — khung sẽ hiện ở mục "Sân cần tìm đội"
        </label>
        <button
          type="button"
          disabled={!valid || pending}
          onClick={() => {
            const parsed = Number(price);
            onCreate({
              startsAt: new Date(startsAt).toISOString(),
              endsAt: new Date(endsAt).toISOString(),
              price: Number.isFinite(parsed) ? parsed : undefined,
              openForTeams,
              note: note.trim() || undefined,
            });
            setStartsAt('');
            setEndsAt('');
            setNote('');
          }}
          className="btn-primary"
        >
          {pending ? 'Đang mở...' : 'Mở khung'}
        </button>
      </div>
    </section>
  );
}

function BookingRow({
  booking,
  pending,
  onDecide,
}: {
  booking: BookingView;
  pending: boolean;
  onDecide: (decision: 'confirm' | 'reject') => void;
}) {
  const open = booking.status === 'pending';
  return (
    <li className="relative border border-ink/12 bg-white p-4">
      {open && <span aria-hidden className="absolute inset-y-0 left-0 w-[3px] bg-rust" />}
      <div className="flex flex-wrap items-center gap-4">
        <Avatar name={booking.user.displayName} src={booking.user.avatarUrl} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-bold">
            {booking.user.displayName}
            {booking.teamName && (
              <span className="ml-2 font-normal text-ink-soft">· {booking.teamName}</span>
            )}
          </p>
          <p className="mt-0.5 text-xs text-ink-soft">
            {formatSlotRange(booking.slot.startsAt, booking.slot.endsAt)} ·{' '}
            {formatVnd(booking.slot.price)}
          </p>
          {booking.note && (
            <p className="mt-1 line-clamp-2 text-xs text-ink-soft/80">{booking.note}</p>
          )}
        </div>

        {open ? (
          <div className="flex gap-2">
            <button
              type="button"
              disabled={pending}
              onClick={() => onDecide('confirm')}
              className="bg-ink px-4 py-2 text-xs font-bold text-paper transition hover:bg-ink/92 disabled:opacity-50"
            >
              Xác nhận
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => onDecide('reject')}
              className="border border-ink/25 px-4 py-2 text-xs font-semibold transition hover:border-ink disabled:opacity-50"
            >
              Từ chối
            </button>
          </div>
        ) : (
          <span className="border border-ink/20 bg-paper-2/40 px-2 py-1 text-[11px] font-bold tracking-wide text-ink-soft">
            {BOOKING_STATUS_LABELS[booking.status].toUpperCase()}
          </span>
        )}
      </div>
    </li>
  );
}
