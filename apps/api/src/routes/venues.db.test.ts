/**
 * Luồng đặt sân chạy thật qua HTTP + CSDL (FR-008.5, 8.6): gửi đơn → chủ sân
 * xác nhận (tự từ chối đơn còn lại, khoá khung) → người đặt huỷ (mở khung ra lại).
 *
 * Cần một CSDL riêng đã chạy migration, ví dụ:
 *   TEST_DATABASE_URL=postgresql://postgres@localhost:55432/sfa_test pnpm --filter @sfa/api test
 * Không có biến này thì cả file bỏ qua. Chỉ xoá đúng dữ liệu nó tạo ra, nhưng
 * đừng trỏ vào CSDL thật.
 */
import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import type { PrismaClient } from '@prisma/client';
import { after, before, describe, it } from 'node:test';

const TEST_DB = process.env.TEST_DATABASE_URL;

describe('Luồng đặt sân (CSDL thật)', { skip: !TEST_DB && 'chưa đặt TEST_DATABASE_URL' }, () => {
  const run = `t${Date.now()}`;
  const sport = `${run}-sport`;
  let base = '';
  let close = () => {};
  let prisma: PrismaClient;
  const token: Record<'owner' | 'a' | 'b' | 'c', string> = { owner: '', a: '', b: '', c: '' };
  const userId: Record<keyof typeof token, string> = { owner: '', a: '', b: '', c: '' };
  let venueId = '';

  const call = async (who: keyof typeof token, method: string, path: string, body?: unknown) => {
    const res = await fetch(`${base}/api${path}`, {
      method,
      headers: { 'content-type': 'application/json', authorization: `Bearer ${token[who]}` },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    // Mọi phản hồi dùng ở đây (sân, khung, đơn) đều có `id` và `status`.
    const json = (await res.json().catch(() => null)) as { id: string; status: string };
    return { status: res.status, body: json };
  };

  /** Khung mới cách nhau một ngày để không chồng lấn nhau. */
  let slotDay = 0;
  const newSlot = async () => {
    slotDay++;
    const startsAt = new Date(Date.now() + slotDay * 86_400_000);
    const endsAt = new Date(startsAt.getTime() + 3_600_000);
    const r = await call('owner', 'POST', `/venues/${venueId}/slots`, {
      startsAt: startsAt.toISOString(),
      endsAt: endsAt.toISOString(),
    });
    assert.equal(r.status, 201, JSON.stringify(r.body));
    return r.body.id;
  };

  const book = (who: 'a' | 'b' | 'c', slotId: string) =>
    call(who, 'POST', `/venues/slots/${slotId}/bookings`, {});

  before(async () => {
    // Phải đặt trước khi nạp bất cứ thứ gì đọc `config/env.ts`.
    process.env.DATABASE_URL = TEST_DB;
    process.env.NODE_ENV = 'test';
    process.env.LOG_LEVEL = 'fatal';
    ({ prisma } = await import('../lib/db.js'));
    const { createApp } = await import('../app.js');
    const { signAccessToken } = await import('../lib/jwt.js');

    await prisma.sport.create({
      data: { slug: sport, nameVi: 'Test', primary: '0 0 0', primaryDark: '0 0 0' },
    });
    for (const who of Object.keys(token) as (keyof typeof token)[]) {
      const role = who === 'owner' ? 'business' : 'user';
      const u = await prisma.user.create({
        data: { email: `${who}-${run}@test.local`, displayName: `${who} ${run}`, role },
      });
      userId[who] = u.id;
      token[who] = signAccessToken({ sub: u.id, role });
    }

    const server = createApp().listen(0);
    base = `http://localhost:${(server.address() as AddressInfo).port}`;
    close = () => server.close();

    const v = await call('owner', 'POST', '/venues', {
      name: `Sân ${run}`,
      sport,
      address: '1 Đường Test, Quận 1',
      pricePerHour: 300_000,
    });
    assert.equal(v.status, 201, JSON.stringify(v.body));
    venueId = v.body.id;
  });

  after(async () => {
    close();
    if (!prisma) return;
    // Xoá người dùng kéo theo sân → khung → đơn → thông báo (onDelete: Cascade).
    await prisma.user.deleteMany({ where: { id: { in: Object.values(userId) } } });
    await prisma.sport.deleteMany({ where: { slug: sport } });
    await prisma.$disconnect();
  });

  it('xác nhận một đơn: tự từ chối đơn còn lại, khoá khung, báo người trượt', async () => {
    const slotId = await newSlot();
    const a = await book('a', slotId);
    const b = await book('b', slotId);
    assert.equal(a.status, 201);
    assert.equal(b.status, 201);
    assert.equal(a.body.status, 'pending');

    const ok = await call('owner', 'POST', `/venues/bookings/${a.body.id}/confirm`);
    assert.equal(ok.status, 200, JSON.stringify(ok.body));
    assert.equal(ok.body.status, 'confirmed');

    const slot = await prisma.venueSlot.findUniqueOrThrow({
      where: { id: slotId },
      include: { bookings: true },
    });
    assert.equal(slot.status, 'booked');
    assert.equal(slot.bookings.find((x) => x.userId === userId.b)?.status, 'rejected');

    const told = await prisma.notification.count({
      where: { userId: userId.b, type: 'booking_rejected' },
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
      call('owner', 'POST', `/venues/bookings/${a.body.id}/confirm`),
      call('owner', 'POST', `/venues/bookings/${b.body.id}/confirm`),
    ]);
    assert.deepEqual(results.map((r) => r.status).sort(), [200, 409]);

    const statuses = (await prisma.booking.findMany({ where: { slotId } })).map((x) => x.status);
    assert.deepEqual(statuses.sort(), ['confirmed', 'rejected']);
  });

  it('huỷ đơn đã xác nhận: mở khung ra lại, báo chủ sân, người khác đặt được', async () => {
    const slotId = await newSlot();
    const a = await book('a', slotId);
    await call('owner', 'POST', `/venues/bookings/${a.body.id}/confirm`);

    const cancelled = await call('a', 'POST', `/venues/bookings/${a.body.id}/cancel`);
    assert.equal(cancelled.status, 200);
    assert.equal(cancelled.body.status, 'cancelled');

    const slot = await prisma.venueSlot.findUniqueOrThrow({ where: { id: slotId } });
    assert.equal(slot.status, 'open');
    const told = await prisma.notification.count({
      where: { userId: userId.owner, type: 'booking_cancelled' },
    });
    assert.ok(told >= 1);

    assert.equal((await book('c', slotId)).status, 201);
  });

  it('chặn: tự đặt sân mình, gửi trùng, huỷ đơn người khác; bị từ chối thì xin lại được', async () => {
    const slotId = await newSlot();
    assert.equal((await call('owner', 'POST', `/venues/slots/${slotId}/bookings`, {})).status, 400);

    const a = await book('a', slotId);
    assert.equal((await book('a', slotId)).status, 409);
    assert.equal((await call('b', 'POST', `/venues/bookings/${a.body.id}/cancel`)).status, 403);

    await call('owner', 'POST', `/venues/bookings/${a.body.id}/reject`);
    const again = await book('a', slotId);
    assert.equal(again.status, 201);
    // Cùng một dòng được làm mới, không sinh dòng thứ hai (@@unique([slotId, userId])).
    assert.equal(again.body.id, a.body.id);
    assert.equal(again.body.status, 'pending');
  });
});
