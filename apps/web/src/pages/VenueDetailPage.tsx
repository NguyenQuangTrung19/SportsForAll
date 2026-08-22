import {
  SLOT_STATUS_LABELS,
  type TeamSummary,
  type VenueDetail,
  type VenueSlotView,
} from '@sfa/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Avatar } from '@/components/Avatar';
import { PageShell } from '@/components/PageShell';
import { SportIcon } from '@/components/SportIcon';
import { api, apiMessage } from '@/lib/api';
import { formatRating, formatSlotRange, formatVnd, slotHours } from '@/lib/format';
import { useSports } from '@/lib/use-sports';

/** FR-008.5 (đặt sân) + FR-008.8 (đánh giá), nhìn từ phía người thuê. */
export function VenueDetailPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const { sportOf } = useSports();
  const [error, setError] = useState<string | null>(null);

  const venueQuery = useQuery({
    enabled: Boolean(id),
    queryKey: ['venues', id],
    queryFn: async () => {
      const { data } = await api.get<VenueDetail>(`/venues/${id}`);
      return data;
    },
  });

  const teamsQuery = useQuery({
    queryKey: ['teams', 'me'],
    queryFn: async () => {
      const { data } = await api.get<{ teams: TeamSummary[] }>('/teams/me');
      return data.teams;
    },
  });

  const refresh = () => {
    setError(null);
    void queryClient.invalidateQueries({ queryKey: ['venues'] });
    void queryClient.invalidateQueries({ queryKey: ['bookings'] });
  };

  const book = useMutation({
    mutationFn: async ({ slotId, teamId, note }: { slotId: string; teamId?: string; note?: string }) => {
      await api.post(`/venues/slots/${slotId}/bookings`, { teamId, note });
    },
    onSuccess: refresh,
    onError: (err) => setError(apiMessage(err, 'Không gửi được yêu cầu đặt sân')),
  });

  const cancel = useMutation({
    mutationFn: async (bookingId: string) => {
      await api.post(`/venues/bookings/${bookingId}/cancel`);
    },
    onSuccess: refresh,
    onError: (err) => setError(apiMessage(err, 'Không huỷ được đơn')),
  });

  const venue = venueQuery.data;
  const theme = venue ? sportOf(venue.sport) : null;

  return (
    <PageShell
      eyebrow="Sân bãi"
      title={venue?.name ?? 'Đang tải...'}
      subtitle={venue?.address}
      backTo="/venues"
      backLabel="← Danh sách sân"
      actions={
        venue?.viewerIsOwner && (
          <Link to={`/venues/${venue.id}/manage`} className="btn-primary">
            Quản lý sân này
          </Link>
        )
      }
    >
      {venueQuery.isLoading && <p className="text-sm text-ink-soft">Đang tải sân...</p>}
      {venueQuery.isError && (
        <p className="border border-rust bg-rust/5 px-3 py-2 text-sm font-medium text-rust">
          Không tải được sân. Có thể sân đã bị gỡ hoặc tạm đình chỉ.
        </p>
      )}

      {error && (
        <p className="mb-6 border border-rust bg-rust/5 px-3 py-2 text-sm font-medium text-rust">
          {error}
        </p>
      )}

      {venue && theme && (
        <>
          <section className="grid gap-6 lg:grid-cols-12">
            <div className="lg:col-span-7">
              <div className="aspect-[16/9] overflow-hidden border border-ink/12 bg-paper-2/60">
                {venue.photoUrl ? (
                  <img src={venue.photoUrl} alt="" aria-hidden className="size-full object-cover" />
                ) : (
                  <div className="flex size-full items-center justify-center text-6xl text-ink/15">
                    <SportIcon sport={venue.sport} className="size-[1em]" />
                  </div>
                )}
              </div>
              {venue.description && (
                <p className="mt-5 whitespace-pre-line text-[15px] leading-relaxed text-ink-soft">
                  {venue.description}
                </p>
              )}
            </div>

            <aside className="space-y-4 lg:col-span-5">
              <article className="border border-ink/15 bg-white p-6">
                <p className="text-xs font-bold tracking-wide text-ink-soft">Giá niêm yết</p>
                <p className="poster-num mt-1 text-4xl text-primary-dark">
                  {formatVnd(venue.pricePerHour)}
                </p>
                <p className="text-xs text-ink-soft">mỗi giờ · giá từng khung có thể khác</p>

                <dl className="mt-5 space-y-2 border-t border-ink/10 pt-4 text-sm">
                  <Row label="Môn">
                    <SportIcon sport={theme.slug} className="size-[1em]" /> {theme.nameVi}
                  </Row>
                  <Row label="Khu vực">{venue.region ?? '—'}</Row>
                  <Row label="Đánh giá">{formatRating(venue.rating, venue.reviewCount)}</Row>
                  <Row label="Khung trống">{venue.openSlotCount}</Row>
                  <Row label="Chủ sân">{venue.owner.displayName}</Row>
                </dl>
              </article>
            </aside>
          </section>

          <section className="mt-12">
            <header className="flex items-baseline justify-between border-b-2 border-ink pb-2.5">
              <h2 className="font-display text-2xl font-black tracking-tight">Lịch sân</h2>
              <span className="poster-num text-2xl text-primary-dark">
                {String(venue.slots.length).padStart(2, '0')}
              </span>
            </header>

            {venue.slots.length === 0 ? (
              <p className="mt-4 border border-dashed border-ink/25 bg-white p-8 text-center text-sm text-ink-soft">
                Chủ sân chưa mở khung giờ nào sắp tới.
              </p>
            ) : (
              <ul className="mt-4 space-y-3">
                {venue.slots.map((slot) => (
                  <SlotRow
                    key={slot.id}
                    slot={slot}
                    teams={teamsQuery.data ?? []}
                    disabled={venue.viewerIsOwner}
                    pending={book.isPending || cancel.isPending}
                    onBook={(teamId, note) => {
                      setError(null);
                      book.mutate({ slotId: slot.id, teamId, note });
                    }}
                    onCancel={() => {
                      if (!slot.viewerBookingId) return;
                      setError(null);
                      cancel.mutate(slot.viewerBookingId);
                    }}
                  />
                ))}
              </ul>
            )}
          </section>

          <ReviewSection venue={venue} onDone={refresh} onError={setError} />
        </>
      )}
    </PageShell>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-xs font-semibold tracking-wide text-ink-soft">{label}</dt>
      <dd className="text-right font-semibold">{children}</dd>
    </div>
  );
}

function SlotRow({
  slot,
  teams,
  disabled,
  pending,
  onBook,
  onCancel,
}: {
  slot: VenueSlotView;
  teams: TeamSummary[];
  disabled: boolean;
  pending: boolean;
  onBook: (teamId: string | undefined, note: string | undefined) => void;
  onCancel: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [teamId, setTeamId] = useState('');
  const [note, setNote] = useState('');

  const hours = slotHours(slot.startsAt, slot.endsAt);
  const mine = slot.viewerBookingStatus;
  const canBook = slot.status === 'open' && !disabled && mine !== 'pending' && mine !== 'confirmed';

  return (
    <li className="border border-ink/12 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-display text-base font-black tracking-tight">
            {formatSlotRange(slot.startsAt, slot.endsAt)}
          </p>
          <p className="mt-0.5 text-xs text-ink-soft">
            {formatVnd(slot.price)} · {hours} giờ
            {slot.openForTeams && ' · đang cần ghép đội'}
            {slot.note && ` · ${slot.note}`}
          </p>
        </div>

        {mine === 'pending' || mine === 'confirmed' ? (
          <div className="flex items-center gap-3">
            <span
              className={`border px-2 py-1 text-[11px] font-bold tracking-wide ${
                mine === 'confirmed' ? 'border-ink bg-ink text-paper' : 'border-ink/25 text-ink-soft'
              }`}
            >
              {mine === 'confirmed' ? 'ĐÃ XÁC NHẬN' : 'CHỜ DUYỆT'}
            </span>
            <button
              type="button"
              onClick={onCancel}
              disabled={pending}
              className="border border-rust px-3 py-1.5 text-xs font-semibold text-rust transition hover:bg-rust/5 disabled:opacity-50"
            >
              Huỷ
            </button>
          </div>
        ) : canBook ? (
          !open && (
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="bg-ink px-4 py-2 text-xs font-bold text-paper transition hover:bg-ink/92"
            >
              Đặt khung này
            </button>
          )
        ) : (
          <span className="border border-ink/20 bg-paper-2/40 px-2 py-1 text-[11px] font-bold tracking-wide text-ink-soft">
            {SLOT_STATUS_LABELS[slot.status].toUpperCase()}
          </span>
        )}
      </div>

      {open && canBook && (
        <div className="mt-4 space-y-2 border-t border-ink/10 pt-4">
          {teams.length > 0 && (
            <select
              value={teamId}
              onChange={(e) => setTeamId(e.target.value)}
              className="input !py-2 text-sm"
            >
              <option value="">Đặt với tư cách cá nhân</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  Nhân danh {t.name}
                </option>
              ))}
            </select>
          )}
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Lời nhắn cho chủ sân (không bắt buộc)"
            maxLength={500}
            className="input !py-2 text-sm"
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              disabled={pending}
              className="text-xs font-semibold text-ink-soft transition hover:text-ink disabled:opacity-50"
            >
              Huỷ
            </button>
            <button
              type="button"
              onClick={() => onBook(teamId || undefined, note.trim() || undefined)}
              disabled={pending}
              className="bg-ink px-4 py-2 text-xs font-bold text-paper transition hover:bg-ink/92 disabled:opacity-50"
            >
              {pending ? 'Đang gửi...' : 'Gửi yêu cầu'}
            </button>
          </div>
        </div>
      )}
    </li>
  );
}

function ReviewSection({
  venue,
  onDone,
  onError,
}: {
  venue: VenueDetail;
  onDone: () => void;
  onError: (message: string) => void;
}) {
  const [score, setScore] = useState(venue.viewerReview?.score ?? 5);
  const [comment, setComment] = useState(venue.viewerReview?.comment ?? '');

  const submit = useMutation({
    mutationFn: async () => {
      await api.post(`/venues/${venue.id}/reviews`, { score, comment: comment.trim() || undefined });
    },
    onSuccess: onDone,
    onError: (err) => onError(apiMessage(err, 'Không gửi được đánh giá')),
  });

  return (
    <section className="mt-12">
      <header className="flex items-baseline justify-between border-b-2 border-ink pb-2.5">
        <h2 className="font-display text-2xl font-black tracking-tight">Đánh giá</h2>
        <span className="poster-num text-2xl text-primary-dark">
          {String(venue.reviewCount).padStart(2, '0')}
        </span>
      </header>

      {venue.viewerCanReview && (
        <article className="mt-4 border border-ink bg-white p-5">
          <p className="text-xs font-bold tracking-wide text-ink-soft">
            {venue.viewerReview ? 'Sửa đánh giá của bạn' : 'Bạn đã thuê sân này'}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setScore(n)}
                aria-label={`${n} sao`}
                className={`border px-3.5 py-1.5 text-sm font-bold transition ${
                  score === n
                    ? 'border-ink bg-ink text-paper'
                    : 'border-ink/15 text-ink hover:border-ink'
                }`}
              >
                {n}★
              </button>
            ))}
          </div>
          <input
            type="text"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Mặt sân, đèn, chỗ gửi xe... (không bắt buộc)"
            maxLength={1000}
            className="input mt-3 !py-2 text-sm"
          />
          <div className="mt-3 flex justify-end">
            <button
              type="button"
              onClick={() => submit.mutate()}
              disabled={submit.isPending}
              className="btn-primary"
            >
              {submit.isPending ? 'Đang gửi...' : venue.viewerReview ? 'Cập nhật' : 'Gửi đánh giá'}
            </button>
          </div>
        </article>
      )}

      {venue.reviews.length === 0 ? (
        <p className="mt-4 border border-dashed border-ink/25 bg-white p-8 text-center text-sm text-ink-soft">
          Chưa có ai đánh giá sân này.
        </p>
      ) : (
        <ul className="mt-4 divide-y divide-ink/10 border-y border-ink/10">
          {venue.reviews.map((r) => (
            <li key={r.id} className="flex items-start gap-4 py-4">
              <Avatar name={r.displayName} src={r.avatarUrl} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold">
                  {r.displayName}
                  <span className="ml-2 font-normal text-ink-soft">{r.score}★</span>
                </p>
                {r.comment && (
                  <p className="mt-1 text-sm leading-relaxed text-ink-soft">{r.comment}</p>
                )}
                <p className="mt-1 text-[11px] text-ink-soft/70">
                  {new Date(r.createdAt).toLocaleDateString('vi-VN')}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
