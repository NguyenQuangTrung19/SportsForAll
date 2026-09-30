/**
 * Luồng đặt sân chạy thật qua HTTP + CSDL (FR-008.5, 8.6): gửi đơn → chủ sân
 * xác nhận (tự từ chối đơn còn lại, khoá khung) → người đặt huỷ (mở khung ra lại).
 * Cách chạy: RUNBOOK mục 6.
 */
import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { oneWinner, startDbApp, TEST_DB, type DbApp } from '../test/db-app.js';

describe('Luồng đặt sân (CSDL thật)', { skip: !TEST_DB && 'chưa đặt TEST_DATABASE_URL' }, () => {
  let app: DbApp;
  const tok = { owner: '', a: '', b: '', c: '' };
  const ids = { owner: '', a: '', b: '', c: '' };
  let venueId = '';

  /** Khung mới cách nhau một ngày để không chồng lấn nhau. */
  let slotDay = 0;
  const newSlot = async () => {
    slotDay++;
    const startsAt = new Date(Date.now() + slotDay * 86_400_000);
    const endsAt = new Date(startsAt.getTime() + 3_600_000);
    const r = await app.call(tok.owner, 'POST', `/venues/${venueId}/slots`, {
      startsAt: startsAt.toISOString(),
      endsAt: endsAt.toISOString(),
    });
    assert.equal(r.status, 201, JSON.stringify(r.body));
    return r.body.id;
  };

  const book = (who: 'a' | 'b' | 'c', slotId: string) =>
    app.call(tok[who], 'POST', `/venues/slots/${slotId}/bookings`, {});

  before(async () => {
    app = await startDbApp();
    for (const who of ['owner', 'a', 'b', 'c'] as const) {
      const u = await app.user(who, who === 'owner' ? 'business' : 'user');
      ids[who] = u.id;
      tok[who] = u.token;
    }
    const v = await app.call(tok.owner, 'POST', '/venues', {
      name: 'Sân test',
      sport: app.sport,
      address: '1 Đường Test, Quận 1',
      pricePerHour: 300_000,
    });
    assert.equal(v.status, 201, JSON.stringify(v.body));
    venueId = v.body.id;
  });

  after(() => app?.close());

  it('xác nhận một đơn: tự từ chối đơn còn lại, khoá khung, báo người trượt', async () => {
    const slotId = await newSlot();
    const a = await book('a', slotId);
    const b = await book('b', slotId);
    assert.equal(a.status, 201);
    assert.equal(b.status, 201);
    assert.equal(a.body.status, 'pending');

    const ok = await app.call(tok.owner, 'POST', `/venues/bookings/${a.body.id}/confirm`);
    assert.equal(ok.status, 200, JSON.stringify(ok.body));
    assert.equal(ok.body.status, 'confirmed');

    const slot = await app.prisma.venueSlot.findUniqueOrThrow({
      where: { id: slotId },
      include: { bookings: true },
    });
    assert.equal(slot.status, 'booked');
    assert.equal(slot.bookings.find((x) => x.userId === ids.b)?.status, 'rejected');

    const told = await app.prisma.notification.count({
      where: { userId: ids.b, type: 'booking_rejected' },
    });
    assert.equal(told, 1);

    // Khung đã chốt thì người thứ ba không gửi đơn được nữa.
    assert.equal((await book('c', slotId)).status, 400);
  });

  it('chủ sân xác nhận hai đơn cùng lúc: chỉ một đơn được chốt', async () => {
    const slotId = await newSlot();
    const a = await book('a', slotId);
    const b = await book('b', slotId);

    const results = await Promise.all([
      app.call(tok.owner, 'POST', `/venues/bookings/${a.body.id}/confirm`),
      app.call(tok.owner, 'POST', `/venues/bookings/${b.body.id}/confirm`),
    ]);
    assert.ok(oneWinner(results.map((r) => r.status)), JSON.stringify(results));

    const rows = await app.prisma.booking.findMany({ where: { slotId } });
    assert.deepEqual(rows.map((x) => x.status).sort(), ['confirmed', 'rejected']);
  });

  /** Khung luôn khớp với đơn: có đơn `confirmed` thì khung `booked`, không thì `open`. */
  const assertSlotMatchesBookings = async (slotId: string) => {
    const slot = await app.prisma.venueSlot.findUniqueOrThrow({
      where: { id: slotId },
      include: { bookings: true },
    });
    const confirmed = slot.bookings.some((x) => x.status === 'confirmed');
    assert.equal(slot.status, confirmed ? 'booked' : 'open', JSON.stringify(slot));
  };

  it('chủ sân xác nhận và từ chối cùng một đơn cùng lúc: khung không kẹt', async () => {
    const slotId = await newSlot();
    const a = await book('a', slotId);
    const results = await Promise.all([
      app.call(tok.owner, 'POST', `/venues/bookings/${a.body.id}/confirm`),
      app.call(tok.owner, 'POST', `/venues/bookings/${a.body.id}/reject`),
    ]);
    assert.ok(oneWinner(results.map((r) => r.status)), JSON.stringify(results));
    await assertSlotMatchesBookings(slotId);
  });

  it('người đặt huỷ đúng lúc chủ sân xác nhận: khung không kẹt', async () => {
    const slotId = await newSlot();
    const a = await book('a', slotId);
    const results = await Promise.all([
      app.call(tok.owner, 'POST', `/venues/bookings/${a.body.id}/confirm`),
      app.call(tok.a, 'POST', `/venues/bookings/${a.body.id}/cancel`),
    ]);
    assert.ok(oneWinner(results.map((r) => r.status)), JSON.stringify(results));
    await assertSlotMatchesBookings(slotId);
  });

  it('huỷ đơn đã xác nhận: mở khung ra lại, báo chủ sân, người khác đặt được', async () => {
    const slotId = await newSlot();
    const a = await book('a', slotId);
    await app.call(tok.owner, 'POST', `/venues/bookings/${a.body.id}/confirm`);

    const cancelled = await app.call(tok.a, 'POST', `/venues/bookings/${a.body.id}/cancel`);
    assert.equal(cancelled.status, 200);
    assert.equal(cancelled.body.status, 'cancelled');

    const slot = await app.prisma.venueSlot.findUniqueOrThrow({ where: { id: slotId } });
    assert.equal(slot.status, 'open');
    const told = await app.prisma.notification.count({
      where: { userId: ids.owner, type: 'booking_cancelled' },
    });
    assert.ok(told >= 1);

    assert.equal((await book('c', slotId)).status, 201);
  });

  it('chặn: tự đặt sân mình, gửi trùng, huỷ đơn người khác; bị từ chối thì xin lại được', async () => {
    const slotId = await newSlot();
    const self = await app.call(tok.owner, 'POST', `/venues/slots/${slotId}/bookings`, {});
    assert.equal(self.status, 400);

    const a = await book('a', slotId);
    assert.equal((await book('a', slotId)).status, 409);
    assert.equal(
      (await app.call(tok.b, 'POST', `/venues/bookings/${a.body.id}/cancel`)).status,
      403,
    );

    await app.call(tok.owner, 'POST', `/venues/bookings/${a.body.id}/reject`);
    const again = await book('a', slotId);
    assert.equal(again.status, 201);
    // Cùng một dòng được làm mới, không sinh dòng thứ hai (@@unique([slotId, userId])).
    assert.equal(again.body.id, a.body.id);
    assert.equal(again.body.status, 'pending');
  });
});
